import os
import json
import base64
import asyncio
import audioop
import websockets
import time
import datetime
import xml.sax.saxutils as saxutils

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.db.session import SessionLocal, get_db
from app.models.all_models import Call, Lead, Agent, Transcript, PhoneNumber, Team, Campaign
from app.controllers.dialer import CampaignDialer
from app.services.agent_call_context import build_call_instructions, get_campaign_for_lead
from app.services.call_logger import save_call_to_json
from app.services.gemini_live import (
    build_gemini_live_ws_url,
    gemini_ssl_context,
    resolve_gemini_live_model,
)

router = APIRouter()


def _log_turn(call_id: int, speaker: str, text: str, dialogue_turns: list) -> None:
    clean = (text or "").strip()
    if not clean:
        return
    label = "Customer" if speaker == "customer" else "Agent"
    print(f"[Conversation] call={call_id} {label}: {clean}")
    if not dialogue_turns or dialogue_turns[-1].get("speaker") != speaker or dialogue_turns[-1].get("text") != clean:
        dialogue_turns.append({"speaker": speaker, "text": clean})


def _normalize_speech_text(text: str) -> str:
    normalized = text.lower().strip().replace(".", "").replace(",", "").replace("!", "").replace("?", "").replace("।", "")
    return normalized.replace("-", " ")


def _should_allow_goodbye_hangup(call_created_at, dialogue_turns: list, min_seconds: int = 8) -> bool:
    """Avoid hanging up during the opening greeting when STT may echo the agent."""
    if not call_created_at:
        return True
    elapsed = (datetime.datetime.utcnow() - call_created_at).total_seconds()
    if elapsed < min_seconds:
        return False
    customer_turns = sum(1 for turn in dialogue_turns if turn.get("speaker") == "customer")
    return customer_turns >= 1


def _contains_goodbye_token(normalized: str) -> bool:
    goodbye_tokens = [
        "bye", "goodbye", "byee", "byebye", "avjo", "આવજો", "બાય", "अलविदा", "बाय",
        "hang up", "hangup", "cut the call", "disconnect",
    ]
    padded = f" {normalized} "
    return any(token in padded or token in normalized for token in goodbye_tokens)


def _is_negated_goodbye(normalized: str) -> bool:
    """Detect when the caller mentions bye/hangup only to deny ending the call."""
    if not _contains_goodbye_token(normalized):
        return False

    negated_patterns = [
        "not saying bye", "not bye", "no bye", "not hanging up", "don't hang up",
        "dont hang up", "do not hang up", "don't cut", "dont cut", "don't disconnect",
        "not disconnect", "call mat", "phone mat", "cut mat", "bye nahi", "nahi bye",
        "bye mat", "mat bye", "nahi kar raha", "nahi kar rahi", "nahi bol raha",
        "nahi bol rahi", "nahi bolna", "nahi karna", "nahi keh", "बाय नहीं",
        "नहीं बाय", "बाय mat", "नहीं कर रहा", "नहीं कर रही", "नहीं बोल रहा",
        "नहीं बोल रही", "फोन मत", "कॉल मत", "call mat kaat", "phone mat kaat",
    ]
    if any(p in normalized for p in negated_patterns):
        return True

    has_negation = any(
        marker in normalized
        for marker in ("nahi", "नहीं", " mat ", "not ", "don't", "dont", "won't", "wont")
    )
    return has_negation


def _ends_with_goodbye(normalized: str) -> bool:
    words = normalized.split()
    if not words:
        return False

    trailing_goodbyes = {
        "bye", "goodbye", "byee", "byebye", "avjo", "આવજો", "બાય", "अलविदा", "बाय",
    }
    if words[-1] in trailing_goodbyes:
        return True

    if len(words) >= 2:
        last_two = " ".join(words[-2:])
        if last_two in {"bye bye", "ok bye", "okay bye", "thank you bye", "thanks bye", "बाय बाय"}:
            return True
    return False


def _is_goodbye_phrase(text: str) -> bool:
    if not text:
        return False
    normalized = _normalize_speech_text(text)

    if "[conversation_ended]" in normalized or "[hangup]" in normalized:
        return True

    if _is_negated_goodbye(normalized):
        return False

    exact_goodbyes = {
        "bye", "goodbye", "bye bye", "byee", "byebye", "ok bye", "okay bye",
        "thank you bye", "thanks bye", "see you bye", "chalo bye", "chal bye",
        "chal avjo", "avjo", "આવજો", "બાય", "अलविदा", "बाय", "बाय बाय",
        "येतो", "येते", "येतो मी", "येते मी",
    }
    
    if normalized in exact_goodbyes:
        return True

    if _ends_with_goodbye(normalized):
        return True

    phrases = [
        "talk to you later", "see you later", "cut the call", "hang up", "hangup",
        "end the call", "disconnect the call", "disconnect call", "thank you bye", "thanks bye",
        "tenga un buen día", "buen día", "adiós", 
        "hasta luego", "gracias adiós", "शुभ दिन", "अलविदा", "आपनो दिवस सारो रहे", 
        "ध्न्यवाद", "আপনার দিনটি শুভ হোক", "ধন্যবাদ বিদায়", "இனிய நாள் அமையட்டும்", 
        "நன்றி போய் வருகிறேன்", "మంచి రోజు", "ధన్యవాదాలు సెలవు", "ಶుಭ ದಿನ", 
        "ಧನ್ಯವಾದಗಳು ಹೋಗಿ ಬರುತ್ತೇನೆ", "നല്ലൊരു ദിവസം ആശംസിക്കുന്നു", 
        "നന്ദി പോയി വരാം", "ਤੁਹਾਡਾ ਦਿਨ ਚੰਗਾ ਰਹੇ", "ਧੰਨਵਾਦ ਅਲਵਿదా", "तुमचा दिवस शुभ असो",
        "आपला दिवस चांगला जावो", "दिवस चांगला जावो", "काळजी घ्या बाय",
        "बाय बाय",
    ]
    return any(p in normalized for p in phrases)


def _is_agent_goodbye_phrase(text: str) -> bool:
    if not text:
        return False
    normalized = _normalize_speech_text(text)

    if "[conversation_ended]" in normalized or "[hangup]" in normalized:
        return True

    if _is_negated_goodbye(normalized):
        return False

    # English — do not match bare "thank you for calling"; that appears in opening greetings.
    english_goodbyes = [
        "have a good day", "have a great day", "have a nice day", "have a wonderful day",
        "goodbye", "bye bye", "thank you goodbye", "thank you for calling goodbye",
        "thank you bye", "thanks bye", "thank you for your time", "have a good one",
    ]
    for phrase in english_goodbyes:
        if phrase in normalized:
            return True

    if normalized.rstrip().endswith("bye") or normalized.rstrip().endswith("goodbye"):
        return True
            
    # Hindi / Marathi
    hindi_goodbyes = [
        "आपका दिन शुभ हो", "शुभ दिन", "अलविदा", "बाय बाय", "धन्यवाद अलविदा",
        "तुमचा दिवस शुभ असो", "आपला दिवस चांगला जावो", "दिवस चांगला जावो",
    ]
    for phrase in hindi_goodbyes:
        if phrase in normalized:
            return True

    # Gujarati
    gujarati_goodbyes = [
        "આપનો દિવસ સારો રહે", "આવજો", "બાય", "ધન્યવાદ"
    ]
    for phrase in gujarati_goodbyes:
        if phrase in normalized:
            return True

    # Spanish
    spanish_goodbyes = [
        "tenga un buen día", "que tenga un buen día", "buen día", "adiós", "hasta luego", "gracias adiós"
    ]
    for phrase in spanish_goodbyes:
        if phrase in normalized:
            return True

    # Bengali
    bengali_goodbyes = [
        "আপনার দিনটি শুভ হোক", "ধন্যবাদ বিদায়", "বিদায়", "বাই"
    ]
    for phrase in bengali_goodbyes:
        if phrase in normalized:
            return True

    # Tamil
    tamil_goodbyes = [
        "இனிய நாள் அமையட்டும்", "நன்றி போய் வருகிறேன்", "போይ வருகிறேன்", "பை"
    ]
    for phrase in tamil_goodbyes:
        if phrase in normalized:
            return True

    # Telugu
    telugu_goodbyes = [
        "మంచి రోజు", "ధన్యవాదాలు సెలవు", "సెలవు", "బై"
    ]
    for phrase in telugu_goodbyes:
        if phrase in normalized:
            return True

    # Kannada
    kannada_goodbyes = [
        "ಶುಭ ದಿನ", "ಧನ್ಯವಾದಗಳು ಹೋಗಿ ಬರುತ್ತೇನೆ", "ಹೋಗಿ ಬರುತ್ತೇನೆ", "ಬೈ"
    ]
    for phrase in kannada_goodbyes:
        if phrase in normalized:
            return True

    # Malayalam
    malayalam_goodbyes = [
        "നല്ലൊരു ദിവസം ആശംസിക്കുന്നു", "നന്ദി പോയി വരാം", "പോയി വരാം", "ബൈ"
    ]
    for phrase in malayalam_goodbyes:
        if phrase in normalized:
            return True

    # Punjabi
    punjabi_goodbyes = [
        "ਤੁਹਾਡਾ ਦਿਨ ਚੰਗਾ ਰਹੇ", "ਧੰਨਵਾਦ ਅਲਵਿదా", "ਅਲਵਿਦਾ", "ਬਾਏ"
    ]
    for phrase in punjabi_goodbyes:
        if phrase in normalized:
            return True

    return False


def _mark_failed_call_attempt(db: Session, call: Call | None, lead: Lead | None) -> None:
    if not call or not lead:
        return
    call.status = "failed"
    campaign = get_campaign_for_lead(db, lead)
    CampaignDialer().mark_lead_after_failed_attempt(db, lead, campaign)
    db.commit()
    CampaignDialer().trigger_check()


def hangup_plivo_call(provider_call_uuid: str) -> None:
    if not provider_call_uuid:
        return
    try:
        auth_id = os.getenv("PLIVO_AUTH_ID")
        auth_token = os.getenv("PLIVO_AUTH_TOKEN")
        if auth_id and auth_token:
            hangup_url = f"https://api.plivo.com/v1/Account/{auth_id}/Call/{provider_call_uuid}/"
            import urllib.request as _ur
            import base64 as _base64
            import ssl as _ssl
            req = _ur.Request(hangup_url, method="DELETE", headers={
                "Authorization": f"Basic {_base64.b64encode(f'{auth_id}:{auth_token}'.encode()).decode()}"
            })
            _context = _ssl._create_unverified_context()
            with _ur.urlopen(req, context=_context) as resp:
                print(f"[Plivo Hangup] Initiated hangup for UUID {provider_call_uuid}, response status: {resp.status}")
    except Exception as e:
        print(f"[Plivo Hangup Error] Failed to hang up UUID {provider_call_uuid}: {e}")


def hangup_twilio_call(provider_call_uuid: str) -> None:
    if not provider_call_uuid:
        return
    try:
        account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        if account_sid and auth_token:
            hangup_url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Calls/{provider_call_uuid}.json"
            import urllib.request as _ur
            import base64 as _base64
            import ssl as _ssl
            import urllib.parse as _up
            data = {"Status": "completed"}
            payload = _up.urlencode(data).encode("utf-8")
            req = _ur.Request(hangup_url, method="POST", data=payload, headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": f"Basic {_base64.b64encode(f'{account_sid}:{auth_token}'.encode()).decode()}"
            })
            _context = _ssl._create_unverified_context()
            with _ur.urlopen(req, context=_context) as resp:
                print(f"[Twilio Hangup] Initiated hangup for UUID {provider_call_uuid}, response status: {resp.status}")
    except Exception as e:
        print(f"[Twilio Hangup Error] Failed to hang up Twilio UUID {provider_call_uuid}: {e}")


from typing import Optional

# Plivo answer XML webhook
def _reject_inbound_xml(provider: str, message: str) -> Response:
    """Graceful hangup XML when an inbound number/agent isn't configured."""
    verb = "Speak" if provider == "plivo" else "Say"
    xml = f'<?xml version="1.0" encoding="UTF-8"?><Response><{verb}>{message}</{verb}><Hangup/></Response>'
    return Response(content=xml, media_type="application/xml")


def _resolve_inbound_call(db, provider: str, to_number: str, from_number, provider_call_uuid):
    """Resolve an incoming call to the right tenant + agent and create an INBOUND Call.

    Strictly matches the dialed number against PhoneNumber (E.164 variants) — an
    unknown number is REJECTED rather than misrouted to a random tenant. Returns a
    Call on success, or a Response (reject XML) when the number/agent isn't configured.
    """
    normalized_to = (to_number or "").strip().replace(" ", "").replace("-", "")
    variants = {normalized_to, normalized_to.replace("+", ""), f"+{normalized_to.lstrip('+')}"}
    db_phone = db.query(PhoneNumber).filter(PhoneNumber.phone_number.in_(list(variants))).first()
    if not db_phone:
        print(f"[Inbound] No PhoneNumber configured for {to_number}; rejecting.")
        return _reject_inbound_xml(provider, "This number is not configured to receive calls. Goodbye.")

    # Resolve the answering agent assigned to this number (then org fallback).
    agent = None
    if db_phone.assigned_agent:
        try:
            agent = db.query(Agent).filter(Agent.id == int(db_phone.assigned_agent)).first()
        except (ValueError, TypeError):
            agent = db.query(Agent).filter(Agent.name == db_phone.assigned_agent).first()
    if not agent and db_phone.organization_id:
        agent = db.query(Agent).join(Team).filter(
            Team.organization_id == db_phone.organization_id,
            Agent.is_active == True,  # noqa: E712
        ).first()
    if not agent:
        print(f"[Inbound] No active agent for number {to_number}; rejecting.")
        return _reject_inbound_xml(provider, "Sorry, no agent is available to take your call right now. Goodbye.")

    # Prefer an existing INBOUND campaign bound to this agent; else the generic one.
    campaign = db.query(Campaign).filter(
        Campaign.agent_id == agent.id,
        Campaign.direction == "INBOUND",
    ).order_by(Campaign.id.desc()).first()
    if not campaign:
        campaign = db.query(Campaign).filter(
            Campaign.name == "Direct Inbound Calls",
            Campaign.agent_id == agent.id,
        ).first()
    if not campaign:
        campaign = Campaign(
            name="Direct Inbound Calls",
            status="active",
            direction="INBOUND",
            agent_id=agent.id,
            timezone="America/Los_Angeles",
            time_start="09:00 AM",
            time_end="11:59 PM",
        )
        db.add(campaign)
        db.commit()
        db.refresh(campaign)
    elif (getattr(campaign, "direction", None) or "").upper() != "INBOUND":
        campaign.direction = "INBOUND"
        db.commit()

    # Get or create a lead keyed on the caller number.
    normalized_from = from_number or "Unknown Caller"
    lead = db.query(Lead).filter(
        Lead.phone_number == normalized_from,
        Lead.campaign_id == campaign.id,
    ).first()
    if not lead:
        lead = Lead(name="Inbound Caller", phone_number=normalized_from, status="calling", campaign_id=campaign.id)
        db.add(lead)
        db.commit()
        db.refresh(lead)
    else:
        lead.status = "calling"
        db.commit()

    # Create the INBOUND Call record.
    call = Call(
        lead_id=lead.id,
        agent_id=agent.id,
        status="initiated",
        direction="INBOUND",
        provider_call_uuid=provider_call_uuid,
    )
    db.add(call)
    db.commit()
    db.refresh(call)
    return call


@router.post("/calls/plivo/answer")
async def plivo_answer(
    request: Request,
    call_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Plivo calls this URL when the customer answers the phone or when a customer dials our number (inbound).
    Returns Plivo XML to stream audio bidirectionally to our WebSocket server.
    """
    # Check if this is an inbound call directly to one of our numbers
    form_data = {}
    try:
        form = await request.form()
        form_data = dict(form) if form else {}
    except Exception:
        pass

    to_number = form_data.get("To")
    from_number = form_data.get("From")
    call_uuid = form_data.get("CallUUID")

    if not call_id and to_number:
        print(f"[Plivo Inbound] Incoming call to {to_number} from {from_number}")
        call = _resolve_inbound_call(db, "plivo", to_number, from_number, call_uuid)
        if isinstance(call, Response):
            return call  # number/agent not configured — graceful reject XML
        call_id = call.id

    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
         raise HTTPException(status_code=404, detail="Call record not found.")

    agent = db.query(Agent).filter(Agent.id == call.agent_id).first()
    lead = db.query(Lead).filter(Lead.id == call.lead_id).first() if call.lead_id else None
    
    from app.services.agent_call_context import get_personalized_greeting
    org_id = None
    if agent and agent.team:
        org_id = agent.team.organization_id
    greeting_text, plivo_lang, plivo_voice = get_personalized_greeting(agent, lead, org_id)
    safe_greeting = saxutils.escape(greeting_text)

    base_url = os.getenv("BASE_URL", "http://localhost:5011").rstrip("/")
    ws_host = base_url.replace("http://", "ws://").replace("https://", "wss://")
    stream_url = f"{ws_host}/api/v1/calls/plivo/stream/{call_id}"
    status_callback = f"{base_url}/api/v1/calls/plivo/stream-status?call_id={call_id}"

    recording_callback = f"{base_url}/api/v1/calls/plivo/recording?call_id={call_id}"
    # Plivo requires the WSS URL as element TEXT, not a url="" attribute (attribute is ignored).
    xml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Record action="{recording_callback}" callbackUrl="{recording_callback}" callbackMethod="POST" redirect="false" recordSession="true" maxLength="3600" />
    <Stream bidirectional="true" keepCallAlive="true" contentType="audio/x-mulaw;rate=8000" statusCallbackUrl="{status_callback}" statusCallbackMethod="POST">
        {stream_url}
    </Stream>
</Response>"""
    print(f"[Plivo Answer] Returning stream URL: {stream_url} for call_id={call_id}")
    return Response(content=xml_content, media_type="application/xml")


@router.post("/calls/plivo/recording")
async def plivo_recording_callback(
    request: Request,
    call_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Plivo calls this when the call recording completes.
    We retrieve the RecordUrl and store it in the database.
    """
    form_data = {}
    try:
        form = await request.form()
        form_data = dict(form) if form else {}
    except Exception:
        pass

    record_url = form_data.get("RecordUrl")
    call_uuid = form_data.get("CallUUID")

    print(f"[Plivo Recording] Received recording callback. call_id={call_id}, UUID={call_uuid}, Url={record_url}")

    call = None
    if call_id:
        call = db.query(Call).filter(Call.id == call_id).first()
    if not call and call_uuid:
        call = db.query(Call).filter(Call.provider_call_uuid == call_uuid).first()

    if call and record_url:
        call.recording_url = record_url
        db.commit()
        print(f"[Plivo Recording] Updated call {call.id} recording_url to: {record_url}")

    # Return empty response
    return Response(content="<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>", media_type="application/xml")



@router.post("/calls/plivo/stream-status")
async def plivo_stream_status(call_id: int, request: Request):
    """Plivo notifies when the audio stream connects, fails, or stops."""
    try:
        form = await request.form()
        payload = dict(form) if form else {}
    except Exception:
        payload = {}
    if not payload:
        try:
            raw = await request.body()
            payload = {"raw": raw.decode("utf-8", errors="replace")}
        except Exception:
            payload = {}
    event = payload.get("Event", payload.get("event", "unknown"))
    print(f"[Plivo Stream Status] call_id={call_id} event={event} payload={payload}")
    return {"status": "ok"}

def _apply_provider_call_status(db: Session, call: Call, provider_status: str) -> None:
    """Map telephony provider terminal statuses to call/lead records and dialer queue."""
    status = (provider_status or "").strip().lower().replace("_", "-")
    lead = db.query(Lead).filter(Lead.id == call.lead_id).first() if call.lead_id else None
    campaign = db.query(Campaign).filter(Campaign.id == lead.campaign_id).first() if lead else None
    dialer = CampaignDialer()

    in_progress = {"", "queued", "ringing", "in-progress", "initiated", "start", "answered", "early-media"}
    if status in in_progress:
        return

    if status in {"completed", "complete"}:
        if call.status not in {"completed", "failed"}:
            call.status = "completed"
        if lead and lead.status not in {"called", "failed", "FAILED"}:
            lead.status = "called"
        db.commit()
        dialer.trigger_check()
        return

    retryable = {"busy", "no-answer", "noanswer", "failed", "failure", "canceled", "cancelled", "timeout", "unanswered"}
    if status in retryable:
        call.status = "failed"
        dialer.mark_lead_after_failed_attempt(db, lead, campaign)
        db.commit()
        dialer.trigger_check()
        return

    print(f"[Call Status] Unhandled provider status '{provider_status}' for call {call.id}")


# Plivo call status callback webhook
@router.post("/calls/plivo/status")
async def plivo_status(call_id: int, request: Request, db: Session = Depends(get_db)):
    """
    Plivo status callback endpoint. Triggered when the call is completed, failed, or busy.
    Advances the campaign outbound dialer queue immediately.
    """
    form_data = {}
    try:
        form = await request.form()
        form_data = dict(form) if form else {}
    except Exception:
        try:
            body = await request.body()
            print(f"[Plivo Status] Raw body for call_id={call_id}: {body}")
        except Exception:
            pass

    provider_status = form_data.get("CallStatus") or form_data.get("Status") or "completed"
    print(f"[Plivo Status] call_id={call_id} provider_status={provider_status} payload={form_data}")

    call = db.query(Call).filter(Call.id == call_id).first()
    if call:
        _apply_provider_call_status(db, call, provider_status)
        print(f"[Plivo Status Webhook] Processed call {call_id} status={provider_status}")

    return {"status": "success"}


# Twilio answer XML webhook
@router.post("/calls/twilio/answer")
async def twilio_answer(
    request: Request,
    call_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Twilio calls this URL when the customer answers the phone or when a customer dials our number (inbound).
    Returns TwiML Connect/Stream XML to stream audio bidirectionally to our WebSocket server.
    """
    form_data = {}
    try:
        form = await request.form()
        form_data = dict(form) if form else {}
    except Exception:
        pass

    to_number = form_data.get("To")
    from_number = form_data.get("From")
    call_sid = form_data.get("CallSid")

    if not call_id and to_number:
        print(f"[Twilio Inbound] Incoming call to {to_number} from {from_number}")
        call = _resolve_inbound_call(db, "twilio", to_number, from_number, call_sid)
        if isinstance(call, Response):
            return call  # number/agent not configured — graceful reject XML
        call_id = call.id

    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
         raise HTTPException(status_code=404, detail="Call record not found.")

    base_url = os.getenv("BASE_URL", "http://localhost:5011").rstrip("/")
    ws_host = base_url.replace("http://", "ws://").replace("https://", "wss://")
    stream_url = f"{ws_host}/api/v1/calls/twilio/stream/{call_id}"

    # Return TwiML with Connect/Stream
    xml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="{stream_url}" />
    </Connect>
</Response>"""
    print(f"[Twilio Answer] Returning TwiML Stream URL: {stream_url} for call_id={call_id}")
    return Response(content=xml_content, media_type="application/xml")


# Twilio call status callback webhook
@router.post("/calls/twilio/status")
async def twilio_status(call_id: int, request: Request, db: Session = Depends(get_db)):
    """
    Twilio status callback endpoint. Triggered when the call is completed, failed, or busy.
    Advances the campaign outbound dialer queue immediately.
    """
    form_data = {}
    try:
        form = await request.form()
        form_data = dict(form) if form else {}
    except Exception:
        try:
            body = await request.body()
            print(f"[Twilio Status] Raw body for call_id={call_id}: {body}")
        except Exception:
            pass

    provider_status = form_data.get("CallStatus") or "completed"
    print(f"[Twilio Status] call_id={call_id} provider_status={provider_status} payload={form_data}")

    call = db.query(Call).filter(Call.id == call_id).first()
    if call:
        _apply_provider_call_status(db, call, provider_status)
        print(f"[Twilio Status Webhook] Processed call {call_id} status={provider_status}")

    return {"status": "success"}


# WebSocket audio stream bridge between Plivo and Google Gemini Multimodal Live API
@router.websocket("/calls/plivo/stream/{call_id}")
async def plivo_stream_websocket(websocket: WebSocket, call_id: int):
    try:
        await websocket.accept()
        print(f"[Stream WebSocket] Connected call {call_id} from {websocket.client}")
    except Exception as e:
        print(f"[Stream WebSocket] Failed to accept call {call_id}: {e}")
        return

    db: Session = SessionLocal()
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        await websocket.close()
        db.close()
        return

    call.status = "connected"
    db.commit()

    agent = db.query(Agent).filter(Agent.id == call.agent_id).first()
    lead = db.query(Lead).filter(Lead.id == call.lead_id).first()
    campaign = get_campaign_for_lead(db, lead)

    if not agent:
        print(f"[Stream WebSocket] Agent {call.agent_id} not found for call {call_id}")
        await websocket.close()
        db.close()
        return

    # Build full agent + KB + campaign context for this call (inbound vs outbound prompt)
    call_direction = (getattr(call, "direction", None) or "outbound").lower()
    ctx = build_call_instructions(db, agent, lead, campaign, direction=call_direction)
    combined_instructions = ctx["system_instructions"]
    first_message = ctx["first_message"]
    voice_name = ctx["voice_name"]
    kb_content = ctx["kb_content"]
    doc_names = ctx["doc_names"]

    if doc_names:
        print(f"[RAG] Loaded KB docs for agent {agent.id} ({agent.name}): {doc_names}")
    elif kb_content:
        print(f"[RAG] Loaded KB vector context for agent {agent.id} ({agent.name}): {len(kb_content)} chars")
    else:
        print(f"[RAG] No KB documents linked for agent {agent.id} ({agent.name})")

    if "CUSTOM DATABASE CONTEXT" in combined_instructions:
        db_section = combined_instructions.split("--- CUSTOM DATABASE CONTEXT ---")
        if len(db_section) > 1:
            db_chars = len(db_section[1].split("--- END CUSTOM DATABASE CONTEXT ---")[0])
            print(f"[RAG] SQLite database context injected: {db_chars} chars for category={agent.category} subcategory={agent.subcategory}")
    else:
        print(f"[RAG] WARNING: No SQLite database context for agent {agent.id} — verify database upload for {agent.category}/{agent.subcategory}")

    if campaign:
        print(f"[Call Context] Campaign '{campaign.name}' using agent '{agent.name}'")

    gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not gemini_api_key:
        print("[Stream WebSocket] GEMINI_API_KEY is missing! Closing stream connection.")
        await websocket.close()
        db.close()
        return

    gemini_model = resolve_gemini_live_model()
    gemini_url = build_gemini_live_ws_url(gemini_api_key)
    print(f"[Gemini] Connecting model={gemini_model} endpoint=v1beta/BidiGenerateContent")

    generation_config = {
        "responseModalities": ["AUDIO"],
        "speechConfig": {
            "voiceConfig": {
                "prebuiltVoiceConfig": {
                    "voiceName": voice_name
                }
            }
        }
    }

    if "2.5" in gemini_model:
        generation_config["thinkingConfig"] = {
            "thinkingBudget": 0
        }
    elif any(x in gemini_model for x in ("3.0", "3.1", "3.5")):
        generation_config["thinkingConfig"] = {
            "thinkingLevel": "MINIMAL"
        }

    setup_message = {
        "setup": {
            "model": gemini_model,
            "generationConfig": generation_config,
            "systemInstruction": {
                "parts": [
                    {"text": combined_instructions}
                ]
            },
            "inputAudioTranscription": {},
            "outputAudioTranscription": {},
            "realtimeInputConfig": {
                "automaticActivityDetection": {
                    "disabled": False,
                    "startOfSpeechSensitivity": "START_SENSITIVITY_LOW",
                    "endOfSpeechSensitivity": "END_SENSITIVITY_HIGH"
                }
            }
        }
    }

    try:
        async with websockets.connect(gemini_url, ssl=gemini_ssl_context()) as gemini_ws:
            await gemini_ws.send(json.dumps(setup_message))
            print(f"[Gemini WebSocket] Session initialized for agent '{agent.name}' with voice '{voice_name}'")

            stream_started_event = asyncio.Event()
            stream_started_flag = False
            stream_start_ts = []  # holds the answer time (media-stream start) for accurate talk-time
            plivo_media_count = 0
            stream_sid = None
            dialogue_turns = []
            _log_turn(call_id, "agent", first_message, dialogue_turns)

            plivo_resample_state = None
            gemini_resample_state = None
            current_agent_response = ""
            last_usage_metadata = None
            goodbye_triggered = False

            # Outbound audio queue & dedicated playback task for jitter-free 20ms audio pacing
            outbound_audio_queue = asyncio.Queue()
            playback_task = None

            async def plivo_playback_loop():
                nonlocal stream_sid, goodbye_triggered
                start_time = None
                packets_sent = 0
                
                try:
                    while True:
                        # Wait for next 160-byte (20ms) packet
                        chunk = await outbound_audio_queue.get()
                        
                        if start_time is None:
                            start_time = asyncio.get_event_loop().time()
                            packets_sent = 0
                            
                        if not stream_sid:
                            await stream_started_event.wait()
                            
                        if stream_sid:
                            plivo_packet = {
                                "event": "playAudio",
                                "media": {
                                    "contentType": "audio/x-mulaw",
                                    "sampleRate": 8000,
                                    "payload": base64.b64encode(chunk).decode("utf-8"),
                                },
                            }
                            await websocket.send_text(json.dumps(plivo_packet))
                        
                        outbound_audio_queue.task_done()
                        packets_sent += 1
                        
                        # Calculate timing and drift
                        expected_time = packets_sent * 0.020
                        elapsed_time = asyncio.get_event_loop().time() - start_time
                        sleep_time = expected_time - elapsed_time
                        
                        # Reset scheduling stats if queue is empty so the next segment starts fresh
                        if outbound_audio_queue.empty():
                            start_time = None
                            packets_sent = 0
                            
                        if sleep_time > 0:
                            await asyncio.sleep(sleep_time)
                except asyncio.CancelledError:
                    pass
                except Exception as play_err:
                    print(f"[Playback Loop Error] {play_err}")

            def start_playback_task():
                nonlocal playback_task
                if playback_task and not playback_task.done():
                    playback_task.cancel()
                playback_task = asyncio.create_task(plivo_playback_loop())

            # Start the initial playback loop task
            start_playback_task()

            # Noise Gate Configuration (reduces background noise/hum impact)
            GATE_HOLD_PACKETS = 25  # Keep gate open for ~500ms (25 packets of 20ms) after speech ends to avoid speech clipping
            gate_hold_counter = 0

            async def plivo_to_gemini():
                nonlocal stream_sid, plivo_resample_state, stream_started_flag, plivo_media_count, gate_hold_counter, goodbye_triggered
                input_accumulator = b""
                noise_floor = 200.0
                try:
                    async for message in websocket.iter_text():
                        if goodbye_triggered:
                            continue
                        packet = json.loads(message)
                        event = packet.get("event")

                        if event == "start":
                            stream_sid = packet.get("start", {}).get("streamId") or packet.get("streamSid")
                            plivo_call_uuid = packet.get("start", {}).get("callId")
                            if plivo_call_uuid and call:
                                call.provider_call_uuid = plivo_call_uuid
                                db.commit()
                                print(f"[Plivo Stream] Updated call {call_id} provider_call_uuid to actual callId: {plivo_call_uuid}")
                            if not stream_started_flag:
                                stream_started_flag = True
                                if not stream_start_ts:
                                    stream_start_ts.append(datetime.datetime.utcnow())
                                print(f"[Plivo Stream] Started with streamSid: {stream_sid}")
                                try:
                                    stream_started_event.set()
                                except Exception:
                                    pass
                                print("[Gemini] Stream ready — listening for customer audio.")
                            else:
                                print(f"[Plivo Stream] Duplicate start event for call {call_id}")
                        elif event == "media":
                            payload = packet["media"]["payload"]
                            plivo_media_count += 1
                            if plivo_media_count and plivo_media_count % 50 == 0:
                                print(f"[Plivo Stream] Received {plivo_media_count} media packets for call {call_id}")
                            ulaw_audio = base64.b64decode(payload)
                            pcm_8k = audioop.ulaw2lin(ulaw_audio, 2)
                            pcm_16k, plivo_resample_state = audioop.ratecv(
                                pcm_8k, 2, 1, 8000, 16000, plivo_resample_state
                            )

                            is_agent_speaking = not outbound_audio_queue.empty()
                            if is_agent_speaking:
                                pcm_16k = b'\x00' * len(pcm_16k)

                            # Calculate RMS energy of the resampled 16kHz PCM audio
                            rms = audioop.rms(pcm_16k, 2)
                            
                            # Update adaptive noise floor estimate
                            if rms < noise_floor:
                                noise_floor = noise_floor * 0.95 + rms * 0.05
                            else:
                                noise_floor = noise_floor * 0.999 + rms * 0.001
                                
                            # Clamp noise floor to a safe operating range
                            noise_floor = max(100.0, min(1500.0, noise_floor))
                            
                            # Dynamic threshold is 250 units above the current noise floor estimate, with a minimum floor of 350
                            dynamic_threshold = max(350.0, noise_floor + 250.0)

                            if rms >= dynamic_threshold:
                                if gate_hold_counter == 0:
                                    print(f"[Noise Gate] OPENED (rms={rms} >= threshold={dynamic_threshold:.1f}, floor={noise_floor:.1f}) for call {call_id}")
                                gate_hold_counter = GATE_HOLD_PACKETS
                            else:
                                if gate_hold_counter > 0:
                                    gate_hold_counter -= 1
                                    if gate_hold_counter == 0:
                                        print(f"[Noise Gate] CLOSED (rms={rms} < threshold={dynamic_threshold:.1f}, floor={noise_floor:.1f}) for call {call_id}")

                            # Bypass local noise gate zeroing-out to let Gemini's native VAD handle background noise naturally
                            # if gate_hold_counter <= 0:
                            #     # Overwrite audio packet with zeros to feed clean silence to Gemini
                            #     pcm_16k = b'\x00' * len(pcm_16k)

                            # Accumulate resampled audio for Gemini
                            input_accumulator += pcm_16k

                            # Send to Gemini in 100ms chunks (3200 bytes at 16kHz 16-bit PCM)
                            while len(input_accumulator) >= 3200:
                                chunk_to_send = input_accumulator[:3200]
                                input_accumulator = input_accumulator[3200:]

                                # Select the payload structure based on the model version (3.0, 3.1, 3.5 use audio key, others fallback to mediaChunks)
                                if any(x in gemini_model for x in ("3.0", "3.1", "3.5")):
                                    gemini_packet = {
                                        "realtimeInput": {
                                            "audio": {
                                                "mimeType": "audio/pcm;rate=16000",
                                                "data": base64.b64encode(chunk_to_send).decode("utf-8")
                                            }
                                        }
                                    }
                                else:
                                    gemini_packet = {
                                        "realtimeInput": {
                                            "mediaChunks": [
                                                {
                                                    "mimeType": "audio/pcm;rate=16000",
                                                    "data": base64.b64encode(chunk_to_send).decode("utf-8")
                                                }
                                            ]
                                        }
                                    }
                                await gemini_ws.send(json.dumps(gemini_packet))

                except WebSocketDisconnect:
                    pass
                except Exception as e:
                    print(f"[Stream Error] Plivo to Gemini bridge error: {e}")

            async def gemini_to_plivo():
                nonlocal stream_sid, gemini_resample_state, current_agent_response, last_usage_metadata, goodbye_triggered
                try:
                    async for message in gemini_ws:
                        packet = json.loads(message)

                        if "setupComplete" in packet:
                            print(f"[Gemini] Setup complete for call {call_id}. Triggering model to speak first immediately...")
                            # Trigger the model to speak first by sending an initial user turn instructing it to say the greeting
                            trigger_msg = {
                                "clientContent": {
                                    "turns": [
                                        {
                                            "role": "user",
                                            "parts": [{"text": f"Please start the conversation by saying exactly: {first_message}"}]
                                        }
                                    ],
                                    "turnComplete": True
                                }
                            }
                            await gemini_ws.send(json.dumps(trigger_msg))
                            print(f"[Gemini] Sent initial trigger to speak first with greeting for call {call_id}")

                        if packet.get("error"):
                            print(f"[Gemini Error] call={call_id}: {packet.get('error')}")

                        # Capture token usage metadata
                        usage = packet.get("usageMetadata")
                        if usage:
                            last_usage_metadata = usage

                        server_content = packet.get("serverContent")
                        if not server_content:
                            continue

                        # Capture output audio transcription from serverContent
                        out_tx = server_content.get("outputTranscription") or {}
                        if out_tx.get("text"):
                            current_agent_response += out_tx["text"]

                        # Handle interruption / barge-in
                        if server_content.get("interrupted"):
                            print(f"[Gemini] Customer interrupted agent. Clearing Plivo audio queue for call {call_id}")
                            # Send clearAudio event to Plivo to stop speaking
                            clear_packet = {
                                "event": "clearAudio"
                            }
                            await websocket.send_text(json.dumps(clear_packet))
                            
                            # Clear outbound queue
                            while not outbound_audio_queue.empty():
                                try:
                                    outbound_audio_queue.get_nowait()
                                except asyncio.QueueEmpty:
                                    break
                            
                            # Cancel/restart playback task to stop any currently playing chunk immediately
                            start_playback_task()

                            if current_agent_response.strip():
                                _log_turn(call_id, "agent", current_agent_response + "... [interrupted]", dialogue_turns)
                                current_agent_response = ""
                            continue

                        input_tx = server_content.get("inputTranscription") or {}
                        if input_tx.get("text"):
                            customer_text = input_tx["text"]
                            _log_turn(call_id, "customer", customer_text, dialogue_turns)
                            
                            # Check for goodbye/bye phrases to hang up immediately
                            if (
                                _is_goodbye_phrase(customer_text)
                                and _should_allow_goodbye_hangup(call.created_at, dialogue_turns)
                            ):
                                print(f"[Goodbye Trigger] Customer said goodbye: '{customer_text}'. Hanging up call {call_id} immediately.")
                                goodbye_triggered = True
                                provider_call_uuid = getattr(call, "provider_call_uuid", None)
                                if provider_call_uuid:
                                    hangup_plivo_call(provider_call_uuid)
                                raise WebSocketDisconnect("Customer said goodbye")

                        if server_content.get("turnComplete"):
                            print(f"[Conversation] call={call_id} — turn complete")
                            if current_agent_response.strip():
                                _log_turn(call_id, "agent", current_agent_response, dialogue_turns)
                                
                                # Check if agent said goodbye
                                if (
                                    _is_agent_goodbye_phrase(current_agent_response)
                                    and _should_allow_goodbye_hangup(call.created_at, dialogue_turns)
                                ):
                                    print(f"[Goodbye Trigger] Agent said goodbye: '{current_agent_response}'. Hanging up call {call_id} in 2.2 seconds.")
                                    goodbye_triggered = True
                                    current_agent_response = ""
                                    await asyncio.sleep(2.2)
                                    provider_call_uuid = getattr(call, "provider_call_uuid", None)
                                    if provider_call_uuid:
                                        hangup_plivo_call(provider_call_uuid)
                                    raise WebSocketDisconnect("Agent said goodbye")
                                    
                                current_agent_response = "" # Reset for next turn

                        model_turn = server_content.get("modelTurn")
                        if model_turn:
                            for part in model_turn.get("parts", []):
                                text_out = part.get("text") or part.get("content")
                                if text_out:
                                    current_agent_response += text_out
                                inline_data = part.get("inlineData")
                                if inline_data and "audio/pcm" in inline_data.get("mimeType", ""):
                                    pcm_raw_b64 = inline_data["data"]
                                    pcm_data_24k = base64.b64decode(pcm_raw_b64)
                                    pcm_8k, gemini_resample_state = audioop.ratecv(
                                        pcm_data_24k, 2, 1, 24000, 8000, gemini_resample_state
                                    )
                                    ulaw_audio = audioop.lin2ulaw(pcm_8k, 2)
                                    
                                    # Chunk the u-law audio into 160-byte (20ms) packets and queue them
                                    for i in range(0, len(ulaw_audio), 160):
                                        chunk = ulaw_audio[i:i+160]
                                        if len(chunk) < 160:
                                            chunk += b'\xff' * (160 - len(chunk))
                                        await outbound_audio_queue.put(chunk)

                except Exception as e:
                    print(f"[Stream Error] Gemini to Plivo bridge error: {e}")

            async def enforce_max_duration(max_seconds: int, call_obj_id: int, provider_call_uuid: str | None, start_event: asyncio.Event):
                try:
                    try:
                        await asyncio.wait_for(start_event.wait(), timeout=30)
                    except Exception:
                        print(f"[EnforceMax] Stream did not start within timeout for call {call_obj_id}")
                        return

                    await asyncio.sleep(max_seconds)
                    print(f"[EnforceMax] Max duration {max_seconds}s reached for call {call_obj_id}. Initiating hangup.")
                    db2: Session = SessionLocal()
                    call_rec = db2.query(Call).filter(Call.id == call_obj_id).first()
                    if call_rec:
                        call_rec.status = "completed"
                        db2.commit()
                    db2.close()

                    if provider_call_uuid:
                        hangup_plivo_call(provider_call_uuid)

                    CampaignDialer().trigger_check()
                except asyncio.CancelledError:
                    return

            max_seconds = 300
            if campaign and getattr(campaign, 'max_duration_seconds', None) is not None:
                max_seconds = campaign.max_duration_seconds
            elif agent and getattr(agent, 'max_duration_seconds', None) is not None:
                max_seconds = agent.max_duration_seconds
            provider_uuid = getattr(call, 'provider_call_uuid', None)
            enforce_task = asyncio.create_task(enforce_max_duration(max_seconds, call.id, provider_uuid, stream_started_event))
            
            t_plivo = asyncio.create_task(plivo_to_gemini())
            t_gemini = asyncio.create_task(gemini_to_plivo())
            try:
                done, pending = await asyncio.wait([t_plivo, t_gemini], return_when=asyncio.FIRST_COMPLETED)
                for t in pending:
                    t.cancel()
            except Exception as e_wait:
                print(f"[Wait Error] WebSocket bridge exception: {e_wait}")
            finally:
                if not enforce_task.done():
                    enforce_task.cancel()
                if playback_task and not playback_task.done():
                    playback_task.cancel()

            # Catch any trailing agent response before saving the record
            if current_agent_response.strip():
                _log_turn(call_id, "agent", current_agent_response, dialogue_turns)

            # Measure talk-time from when the media stream started (call answered),
            # not from row creation — otherwise ring/setup time inflates duration past the recording.
            duration_anchor = stream_start_ts[0] if stream_start_ts else call.created_at
            duration = int((datetime.datetime.utcnow() - duration_anchor).total_seconds())
            if duration < 0:
                duration = 0
            call.duration_seconds = duration
            call.status = "completed"

            if lead:
                lead.status = "called"

            kb_note = f" Knowledge base docs used: {', '.join(doc_names)}." if doc_names else ""
            from app.services.transcript_analysis import analyze_call_transcript_and_update
            analyze_call_transcript_and_update(call.id, dialogue_turns, db, agent.id)
            
            print(f"[Stream Completed] Session closed for call {call_id}.")

            prompt_tokens = 0
            candidates_tokens = 0
            total_tokens = 0
            est_cost = 0.0

            if last_usage_metadata:
                prompt_tokens = last_usage_metadata.get("promptTokenCount", 0)
                candidates_tokens = last_usage_metadata.get("candidatesTokenCount") or last_usage_metadata.get("candidateTokenCount") or 0
                total_tokens = last_usage_metadata.get("totalTokenCount", 0)
                
                # Failsafe: calculate candidate tokens if total_tokens is set but candidates_tokens is reported as 0
                if total_tokens > prompt_tokens and candidates_tokens == 0:
                    candidates_tokens = total_tokens - prompt_tokens
                
                # Gemini 3.1 Flash pricing breakdown (matching save_call_to_json)
                stt_tokens = int(prompt_tokens * 0.45)
                tts_tokens = candidates_tokens
                llm_tokens = prompt_tokens - stt_tokens

                stt_cost_usd = (stt_tokens * 3.00) / 1000000.0
                tts_cost_usd = (tts_tokens * 12.00) / 1000000.0
                llm_cost_usd = (llm_tokens * 0.15) / 1000000.0
                est_cost = stt_cost_usd + tts_cost_usd + llm_cost_usd

                print(f"[Gemini Usage Info] final usage statistics for call {call_id}:")
                print(f"  Prompt Tokens: {prompt_tokens}")
                print(f"  Candidates Tokens: {candidates_tokens}")
                print(f"  Total Tokens: {total_tokens}")
                print(f"  Estimated Session Cost: ${est_cost:.6f}")

            # Save token usage and pricing to local JSON file
            try:
                stats_file = "voqly_usage_stats.json"
                usd_to_inr = 94.0
                new_entry = {
                    "call_id": call_id,
                    "agent_name": agent.name if agent else "Unknown",
                    "customer_name": lead.name if lead else "Unknown",
                    "duration_seconds": duration,
                    "prompt_tokens": prompt_tokens,
                    "candidates_tokens": candidates_tokens,
                    "total_tokens": total_tokens,
                    "gemini_cost_rupees": float(f"{est_cost * usd_to_inr:.4f}"),
                    "total_cost_rupees": float(f"{est_cost * usd_to_inr:.4f}"),
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                }
                
                existing_entries = []
                if os.path.exists(stats_file):
                    try:
                        with open(stats_file, "r") as f:
                            existing_entries = json.load(f)
                            if not isinstance(existing_entries, list):
                                existing_entries = []
                    except Exception:
                        existing_entries = []
                        
                existing_entries.append(new_entry)
                
                with open(stats_file, "w") as f:
                    json.dump(existing_entries, f, indent=2)
                print(f"[Stats Logger] Successfully stored session usage details in local JSON file '{stats_file}'")
            except Exception as stats_err:
                print(f"[Stats Logger] Error writing to local JSON file: {stats_err}")

            print(f"[Conversation Summary] call={call_id} turns={len(dialogue_turns)}")
            for i, turn in enumerate(dialogue_turns, 1):
                who = "Customer" if turn.get("speaker") == "customer" else "Agent"
                print(f"  {i}. {who}: {turn.get('text', '')}")

            CampaignDialer().trigger_check()

    except Exception as e:
        print(f"[Stream Exception] WebSocket bridge encountered error for call {call_id}: {e}")
        import traceback
        traceback.print_exc()
        _mark_failed_call_attempt(db, call, lead)
    finally:
        if call:
            provider_uuid = getattr(call, 'provider_call_uuid', None)
            if provider_uuid:
                hangup_plivo_call(provider_uuid)
        db.close()


@router.websocket("/calls/twilio/stream/{call_id}")
async def twilio_stream_websocket(websocket: WebSocket, call_id: int):
    try:
        await websocket.accept()
        print(f"[Twilio Stream WebSocket] Connected call {call_id} from {websocket.client}")
    except Exception as e:
        print(f"[Twilio Stream WebSocket] Failed to accept call {call_id}: {e}")
        return

    db: Session = SessionLocal()
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        await websocket.close()
        db.close()
        return

    call.status = "connected"
    db.commit()

    agent = db.query(Agent).filter(Agent.id == call.agent_id).first()
    lead = db.query(Lead).filter(Lead.id == call.lead_id).first()
    campaign = get_campaign_for_lead(db, lead)

    if not agent:
        print(f"[Twilio Stream WebSocket] Agent {call.agent_id} not found for call {call_id}")
        await websocket.close()
        db.close()
        return

    # Build full agent + KB + campaign context for this call (inbound vs outbound prompt)
    call_direction = (getattr(call, "direction", None) or "outbound").lower()
    ctx = build_call_instructions(db, agent, lead, campaign, direction=call_direction)
    combined_instructions = ctx["system_instructions"]
    first_message = ctx["first_message"]
    voice_name = ctx["voice_name"]
    doc_names = ctx["doc_names"]

    gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not gemini_api_key:
        print("[Twilio Stream WebSocket] GEMINI_API_KEY is missing! Closing stream connection.")
        await websocket.close()
        db.close()
        return

    gemini_model = resolve_gemini_live_model()
    gemini_url = build_gemini_live_ws_url(gemini_api_key)
    print(f"[Twilio Gemini] Connecting model={gemini_model} endpoint=v1beta/BidiGenerateContent")

    generation_config = {
        "responseModalities": ["AUDIO"],
        "speechConfig": {
            "voiceConfig": {
                "prebuiltVoiceConfig": {
                    "voiceName": voice_name
                }
            }
        }
    }

    if "2.5" in gemini_model:
        generation_config["thinkingConfig"] = {
            "thinkingBudget": 0
        }
    elif any(x in gemini_model for x in ("3.0", "3.1", "3.5")):
        generation_config["thinkingConfig"] = {
            "thinkingLevel": "MINIMAL"
        }

    setup_message = {
        "setup": {
            "model": gemini_model,
            "generationConfig": generation_config,
            "systemInstruction": {
                "parts": [
                    {"text": combined_instructions}
                ]
            },
            "inputAudioTranscription": {},
            "outputAudioTranscription": {},
            "realtimeInputConfig": {
                "automaticActivityDetection": {
                    "disabled": False,
                    "startOfSpeechSensitivity": "START_SENSITIVITY_LOW",
                    "endOfSpeechSensitivity": "END_SENSITIVITY_HIGH"
                }
            }
        }
    }

    try:
        async with websockets.connect(gemini_url, ssl=gemini_ssl_context()) as gemini_ws:
            await gemini_ws.send(json.dumps(setup_message))
            print(f"[Twilio Gemini WebSocket] Session initialized for agent '{agent.name}' with voice '{voice_name}'")

            stream_started_event = asyncio.Event()
            stream_started_flag = False
            stream_start_ts = []  # holds the answer time (media-stream start) for accurate talk-time
            twilio_media_count = 0
            stream_sid = None
            dialogue_turns = []
            _log_turn(call_id, "agent", first_message, dialogue_turns)

            twilio_resample_state = None
            gemini_resample_state = None
            current_agent_response = ""
            last_usage_metadata = None
            goodbye_triggered = False
            is_agent_speaking = False

            # Outbound audio queue & dedicated playback task for jitter-free 20ms audio pacing
            outbound_audio_queue = asyncio.Queue()
            playback_task = None

            async def twilio_playback_loop():
                nonlocal stream_sid, goodbye_triggered, is_agent_speaking
                start_time = None
                packets_sent = 0
                
                try:
                    while True:
                        # Wait for next 160-byte (20ms) packet
                        chunk = await outbound_audio_queue.get()
                        is_agent_speaking = True
                        
                        if start_time is None:
                            start_time = asyncio.get_event_loop().time()
                            packets_sent = 0
                            
                        if not stream_sid:
                            await stream_started_event.wait()
                            
                        if stream_sid:
                            twilio_packet = {
                                "event": "media",
                                "streamSid": stream_sid,
                                "media": {
                                    "payload": base64.b64encode(chunk).decode("utf-8"),
                                },
                            }
                            await websocket.send_text(json.dumps(twilio_packet))
                            if packets_sent % 50 == 0:
                                print(f"[Twilio Playback] Sent {packets_sent} media packets to streamSid: {stream_sid}")
                        else:
                            if packets_sent % 50 == 0:
                                print(f"[Twilio Playback WARNING] Cannot send media packet: stream_sid is None!")
                        
                        outbound_audio_queue.task_done()
                        packets_sent += 1
                        
                        # Calculate timing and drift
                        expected_time = packets_sent * 0.020
                        elapsed_time = asyncio.get_event_loop().time() - start_time
                        sleep_time = expected_time - elapsed_time
                        
                        # Reset scheduling stats if queue is empty so the next segment starts fresh
                        if outbound_audio_queue.empty():
                            start_time = None
                            packets_sent = 0
                            is_agent_speaking = False
                            
                        if sleep_time > 0:
                            await asyncio.sleep(sleep_time)
                except asyncio.CancelledError:
                    pass
                except Exception as play_err:
                    print(f"[Twilio Playback Loop Error] {play_err}")
                finally:
                    is_agent_speaking = False

            def start_playback_task():
                nonlocal playback_task
                if playback_task and not playback_task.done():
                    playback_task.cancel()
                playback_task = asyncio.create_task(twilio_playback_loop())

            start_playback_task()

            # Noise Gate Configuration
            GATE_HOLD_PACKETS = 25
            gate_hold_counter = 0

            async def twilio_to_gemini():
                nonlocal stream_sid, twilio_resample_state, stream_started_flag, twilio_media_count, gate_hold_counter, goodbye_triggered, is_agent_speaking
                input_accumulator = b""
                noise_floor = 200.0
                try:
                    async for message in websocket.iter_text():
                        if goodbye_triggered:
                            continue
                        packet = json.loads(message)
                        event = packet.get("event")

                        if event == "start":
                            stream_sid = packet.get("start", {}).get("streamSid") or packet.get("streamSid")
                            twilio_call_sid = packet.get("start", {}).get("callSid")
                            if twilio_call_sid and call:
                                call.provider_call_uuid = twilio_call_sid
                                db.commit()
                                print(f"[Twilio Stream] Updated call {call_id} provider_call_uuid to actual callSid: {twilio_call_sid}")
                            if not stream_started_flag:
                                stream_started_flag = True
                                if not stream_start_ts:
                                    stream_start_ts.append(datetime.datetime.utcnow())
                                print(f"[Twilio Stream] Started with streamSid: {stream_sid}")
                                try:
                                    stream_started_event.set()
                                except Exception:
                                    pass
                                print("[Twilio Gemini] Stream ready — listening for customer audio.")
                            else:
                                print(f"[Twilio Stream] Duplicate start event for call {call_id}")
                        elif event == "media":
                            payload = packet["media"]["payload"]
                            twilio_media_count += 1
                            if twilio_media_count and twilio_media_count % 50 == 0:
                                print(f"[Twilio Stream] Received {twilio_media_count} media packets for call {call_id}")
                            ulaw_audio = base64.b64decode(payload)
                            pcm_8k = audioop.ulaw2lin(ulaw_audio, 2)
                            pcm_16k, twilio_resample_state = audioop.ratecv(
                                pcm_8k, 2, 1, 8000, 16000, twilio_resample_state
                            )

                            if is_agent_speaking:
                                pcm_16k = b'\x00' * len(pcm_16k)

                            rms = audioop.rms(pcm_16k, 2)
                            if rms < noise_floor:
                                noise_floor = noise_floor * 0.95 + rms * 0.05
                            else:
                                noise_floor = noise_floor * 0.999 + rms * 0.001
                                
                            noise_floor = max(100.0, min(1500.0, noise_floor))
                            dynamic_threshold = max(350.0, noise_floor + 250.0)

                            if rms >= dynamic_threshold:
                                if gate_hold_counter == 0:
                                    print(f"[Twilio Noise Gate] OPENED (rms={rms} >= threshold={dynamic_threshold:.1f}, floor={noise_floor:.1f}) for call {call_id}")
                                gate_hold_counter = GATE_HOLD_PACKETS
                            else:
                                if gate_hold_counter > 0:
                                    gate_hold_counter -= 1
                                    if gate_hold_counter == 0:
                                        print(f"[Twilio Noise Gate] CLOSED (rms={rms} < threshold={dynamic_threshold:.1f}, floor={noise_floor:.1f}) for call {call_id}")

                            # Bypass local noise gate zeroing-out to let Gemini's native VAD handle background noise naturally
                            # if gate_hold_counter <= 0:
                            #     pcm_16k = b'\x00' * len(pcm_16k)

                            input_accumulator += pcm_16k

                            while len(input_accumulator) >= 3200:
                                chunk_to_send = input_accumulator[:3200]
                                input_accumulator = input_accumulator[3200:]

                                # Select the payload structure based on the model version (3.0, 3.1, 3.5 use audio key, others fallback to mediaChunks)
                                if any(x in gemini_model for x in ("3.0", "3.1", "3.5")):
                                    gemini_packet = {
                                        "realtimeInput": {
                                            "audio": {
                                                "mimeType": "audio/pcm;rate=16000",
                                                "data": base64.b64encode(chunk_to_send).decode("utf-8")
                                            }
                                        }
                                    }
                                else:
                                    gemini_packet = {
                                        "realtimeInput": {
                                            "mediaChunks": [
                                                {
                                                    "mimeType": "audio/pcm;rate=16000",
                                                    "data": base64.b64encode(chunk_to_send).decode("utf-8")
                                                }
                                            ]
                                        }
                                    }
                                await gemini_ws.send(json.dumps(gemini_packet))

                except WebSocketDisconnect:
                    pass
                except Exception as e:
                    print(f"[Twilio Stream Error] Twilio to Gemini bridge error: {e}")

            async def gemini_to_twilio():
                nonlocal stream_sid, gemini_resample_state, current_agent_response, last_usage_metadata, goodbye_triggered
                try:
                    async for message in gemini_ws:
                        packet = json.loads(message)

                        if "setupComplete" in packet:
                            print(f"[Twilio Gemini] Setup complete for call {call_id}. Triggering model to speak first immediately...")
                            trigger_msg = {
                                "clientContent": {
                                    "turns": [
                                        {
                                            "role": "user",
                                            "parts": [{"text": f"Please start the conversation by saying exactly: {first_message}"}]
                                        }
                                    ],
                                    "turnComplete": True
                                }
                            }
                            await gemini_ws.send(json.dumps(trigger_msg))
                            print(f"[Twilio Gemini] Sent initial trigger to speak first for call {call_id}")

                        if packet.get("error"):
                            print(f"[Twilio Gemini Error] call={call_id}: {packet.get('error')}")

                        usage = packet.get("usageMetadata")
                        if usage:
                            last_usage_metadata = usage

                        server_content = packet.get("serverContent")
                        if not server_content:
                            continue

                        # Capture output audio transcription from serverContent
                        out_tx = server_content.get("outputTranscription") or {}
                        if out_tx.get("text"):
                            current_agent_response += out_tx["text"]

                        if server_content.get("interrupted"):
                            print(f"[Twilio Gemini] Customer interrupted agent. Clearing Twilio audio queue for call {call_id}")
                            clear_packet = {
                                "event": "clear",
                                "streamSid": stream_sid
                            }
                            await websocket.send_text(json.dumps(clear_packet))
                            
                            while not outbound_audio_queue.empty():
                                try:
                                    outbound_audio_queue.get_nowait()
                                except asyncio.QueueEmpty:
                                    break
                            
                            start_playback_task()

                            if current_agent_response.strip():
                                _log_turn(call_id, "agent", current_agent_response + "... [interrupted]", dialogue_turns)
                                current_agent_response = ""
                            continue

                        input_tx = server_content.get("inputTranscription") or {}
                        if input_tx.get("text"):
                            customer_text = input_tx["text"]
                            _log_turn(call_id, "customer", customer_text, dialogue_turns)
                            
                            if (
                                _is_goodbye_phrase(customer_text)
                                and _should_allow_goodbye_hangup(call.created_at, dialogue_turns)
                            ):
                                print(f"[Twilio Goodbye Trigger] Customer said goodbye: '{customer_text}'. Hanging up call {call_id} immediately.")
                                goodbye_triggered = True
                                provider_call_uuid = getattr(call, "provider_call_uuid", None)
                                if provider_call_uuid:
                                    hangup_twilio_call(provider_call_uuid)
                                raise WebSocketDisconnect("Customer said goodbye")

                        if server_content.get("turnComplete"):
                            print(f"[Twilio Conversation] call={call_id} — turn complete")
                            if current_agent_response.strip():
                                _log_turn(call_id, "agent", current_agent_response, dialogue_turns)
                                
                                if (
                                    _is_agent_goodbye_phrase(current_agent_response)
                                    and _should_allow_goodbye_hangup(call.created_at, dialogue_turns)
                                ):
                                    print(f"[Twilio Goodbye Trigger] Agent said goodbye: '{current_agent_response}'. Hanging up call {call_id} in 2.2 seconds.")
                                    goodbye_triggered = True
                                    current_agent_response = ""
                                    await asyncio.sleep(2.2)
                                    provider_call_uuid = getattr(call, "provider_call_uuid", None)
                                    if provider_call_uuid:
                                        hangup_twilio_call(provider_call_uuid)
                                    raise WebSocketDisconnect("Agent said goodbye")
                                    
                                current_agent_response = ""

                        model_turn = server_content.get("modelTurn")
                        if model_turn:
                            for part in model_turn.get("parts", []):
                                text_out = part.get("text") or part.get("content")
                                if text_out:
                                    current_agent_response += text_out
                                inline_data = part.get("inlineData")
                                if inline_data and "audio/pcm" in inline_data.get("mimeType", ""):
                                    pcm_raw_b64 = inline_data["data"]
                                    pcm_data_24k = base64.b64decode(pcm_raw_b64)
                                    pcm_8k, gemini_resample_state = audioop.ratecv(
                                        pcm_data_24k, 2, 1, 24000, 8000, gemini_resample_state
                                    )
                                    ulaw_audio = audioop.lin2ulaw(pcm_8k, 2)
                                    
                                    # Chunk the u-law audio into 160-byte (20ms) packets and queue them
                                    for i in range(0, len(ulaw_audio), 160):
                                        chunk = ulaw_audio[i:i+160]
                                        if len(chunk) < 160:
                                            chunk += b'\xff' * (160 - len(chunk))
                                        await outbound_audio_queue.put(chunk)

                except Exception as e:
                    print(f"[Twilio Stream Error] Gemini to Twilio bridge error: {e}")

            async def enforce_max_duration(max_seconds: int, call_obj_id: int, provider_call_uuid: str | None, start_event: asyncio.Event):
                try:
                    try:
                        await asyncio.wait_for(start_event.wait(), timeout=30)
                    except Exception:
                        print(f"[Twilio EnforceMax] Stream did not start within timeout for call {call_obj_id}")
                        return

                    await asyncio.sleep(max_seconds)
                    print(f"[Twilio EnforceMax] Max duration {max_seconds}s reached for call {call_obj_id}. Initiating hangup.")
                    db2: Session = SessionLocal()
                    call_rec = db2.query(Call).filter(Call.id == call_obj_id).first()
                    if call_rec:
                        call_rec.status = "completed"
                        db2.commit()
                    db2.close()

                    if provider_call_uuid:
                        hangup_twilio_call(provider_call_uuid)

                    CampaignDialer().trigger_check()
                except asyncio.CancelledError:
                    return

            max_seconds = 300
            if campaign and getattr(campaign, 'max_duration_seconds', None) is not None:
                max_seconds = campaign.max_duration_seconds
            elif agent and getattr(agent, 'max_duration_seconds', None) is not None:
                max_seconds = agent.max_duration_seconds
            provider_uuid = getattr(call, 'provider_call_uuid', None)
            enforce_task = asyncio.create_task(enforce_max_duration(max_seconds, call.id, provider_uuid, stream_started_event))
            
            t_twilio = asyncio.create_task(twilio_to_gemini())
            t_gemini = asyncio.create_task(gemini_to_twilio())
            try:
                done, pending = await asyncio.wait([t_twilio, t_gemini], return_when=asyncio.FIRST_COMPLETED)
                for t in pending:
                    t.cancel()
            except Exception as e_wait:
                print(f"[Twilio Wait Error] WebSocket bridge exception: {e_wait}")
            finally:
                if not enforce_task.done():
                    enforce_task.cancel()
                if playback_task and not playback_task.done():
                    playback_task.cancel()

            if current_agent_response.strip():
                _log_turn(call_id, "agent", current_agent_response, dialogue_turns)

            # Measure talk-time from when the media stream started (call answered),
            # not from row creation — otherwise ring/setup time inflates duration past the recording.
            duration_anchor = stream_start_ts[0] if stream_start_ts else call.created_at
            duration = int((datetime.datetime.utcnow() - duration_anchor).total_seconds())
            if duration < 0:
                duration = 0
            call.duration_seconds = duration
            call.status = "completed"

            if lead:
                lead.status = "called"

            kb_note = f" Knowledge base docs used: {', '.join(doc_names)}." if doc_names else ""
            from app.services.transcript_analysis import analyze_call_transcript_and_update
            analyze_call_transcript_and_update(call.id, dialogue_turns, db, agent.id)
            
            print(f"[Twilio Stream Completed] Session closed for call {call_id}.")

            prompt_tokens = 0
            candidates_tokens = 0
            total_tokens = 0
            est_cost = 0.0

            if last_usage_metadata:
                prompt_tokens = last_usage_metadata.get("promptTokenCount", 0)
                candidates_tokens = last_usage_metadata.get("candidatesTokenCount") or last_usage_metadata.get("candidateTokenCount") or 0
                total_tokens = last_usage_metadata.get("totalTokenCount", 0)
                
                if total_tokens > prompt_tokens and candidates_tokens == 0:
                    candidates_tokens = total_tokens - prompt_tokens
                
                stt_tokens = int(prompt_tokens * 0.45)
                tts_tokens = candidates_tokens
                llm_tokens = prompt_tokens - stt_tokens

                stt_cost_usd = (stt_tokens * 3.00) / 1000000.0
                tts_cost_usd = (tts_tokens * 12.00) / 1000000.0
                llm_cost_usd = (llm_tokens * 0.15) / 1000000.0
                est_cost = stt_cost_usd + tts_cost_usd + llm_cost_usd

                print(f"[Twilio Gemini Usage Info] final usage statistics for call {call_id}:")
                print(f"  Prompt Tokens: {prompt_tokens}")
                print(f"  Candidates Tokens: {candidates_tokens}")
                print(f"  Total Tokens: {total_tokens}")
                print(f"  Estimated Session Cost: ${est_cost:.6f}")

            try:
                stats_file = "voqly_usage_stats.json"
                usd_to_inr = 94.0
                new_entry = {
                    "call_id": call_id,
                    "agent_name": agent.name if agent else "Unknown",
                    "customer_name": lead.name if lead else "Unknown",
                    "duration_seconds": duration,
                    "prompt_tokens": prompt_tokens,
                    "candidates_tokens": candidates_tokens,
                    "total_tokens": total_tokens,
                    "gemini_cost_rupees": float(f"{est_cost * usd_to_inr:.4f}"),
                    "total_cost_rupees": float(f"{est_cost * usd_to_inr:.4f}"),
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                }
                
                existing_entries = []
                if os.path.exists(stats_file):
                    try:
                        with open(stats_file, "r") as f:
                            existing_entries = json.load(f)
                            if not isinstance(existing_entries, list):
                                  existing_entries = []
                    except Exception:
                        existing_entries = []
                        
                existing_entries.append(new_entry)
                with open(stats_file, "w") as f:
                    json.dump(existing_entries, f, indent=2)
                print(f"[Twilio Stats Logger] Successfully stored session usage details in local JSON file '{stats_file}'")
            except Exception as stats_err:
                print(f"[Twilio Stats Logger] Error writing to local JSON file: {stats_err}")

            CampaignDialer().trigger_check()

    except Exception as e:
        print(f"[Twilio Stream Exception] WebSocket bridge encountered error for call {call_id}: {e}")
        _mark_failed_call_attempt(db, call, lead)
    finally:
        if call:
            provider_uuid = getattr(call, 'provider_call_uuid', None)
            if provider_uuid:
                hangup_twilio_call(provider_uuid)
        db.close()

# LiveKit token generation endpoint (supporting agent builder view controls)
class LiveKitTokenRequestSchema(json.JSONEncoder):
    pass

@router.post("/livekit/token")
def generate_livekit_token(room_name: str, identity: str):
    """
    Generates a LiveKit JWT token for client-side frontend connections
    """
    lk_key = os.getenv("LIVEKIT_API_KEY", "devkey")
    lk_secret = os.getenv("LIVEKIT_API_SECRET", "secret")

    try:
        from livekit import AccessToken
        token = AccessToken(lk_key, lk_secret)
        token.with_identity(identity)
        token.with_name(identity)
        token.with_grants(room_join=True, room=room_name)
        return {"token": token.to_jwt(), "server_url": os.getenv("LIVEKIT_URL", "ws://localhost:7880")}
    except ImportError:
        return {
            "token": "mock_lk_token_identity_" + identity + "_room_" + room_name,
            "server_url": "ws://localhost:7880"
        }
