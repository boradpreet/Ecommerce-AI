import json
import urllib.request as _ur
import ssl
import os
from sqlalchemy.orm import Session
from app.models.all_models import Transcript, Agent

def analyze_call_transcript_and_update(call_id: int, dialogue_turns: list, db: Session, agent_id: int, send_followup: bool = True):
    """
    Analyzes the call transcript using Gemini 2.5 Flash.
    Calculates summary, sentiment (positive/neutral/negative), customer interest percentage
    (0-100%), and whether the customer asked for details/info (wants_details).
    Updates or inserts the Transcript record.

    When send_followup is True and the call qualifies (interest >= org threshold OR the caller
    asked for details), the org's Company Details are auto-sent to the caller on WhatsApp + email.
    (Pass send_followup=False for retroactive/backfill runs so old calls are never messaged.)
    """
    # 1. Format dialogue text
    dialogue_text = ""
    for turn in dialogue_turns:
        speaker = str(turn.get("speaker", "unknown")).upper()
        text = turn.get("text", "")
        dialogue_text += f"{speaker}: {text}\n"

    # 2. Fetch agent for prompt guidelines
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    summary_prompt_override = agent.analysis_summary_prompt if agent else ""

    system_instruction = (
        "You are an expert conversational analyst. "
        "Analyze the provided transcript of a phone conversation between an AI Voice Agent and a Customer.\n\n"
        "Tasks:\n"
        "1. Summarize the call in a short paragraph (2 sentences max). Use the agent's summary guidelines if provided.\n"
        "2. Determine the customer's sentiment (strictly one of: POSITIVE, NEUTRAL, NEGATIVE).\n"
        "3. Evaluate the customer's interest level in the agent's campaign/product/offer as a percentage score out of 100 (from 0 to 100).\n"
        "   - High interest (e.g. asking for details, showing clear interest, positive responses, agreeing to follow-up) -> 70 to 100\n"
        "   - Neutral (e.g. brief response, polite but not committed, hanging up without rude remarks) -> 30 to 60\n"
        "   - Low/No interest (e.g. saying no, not interested, telling not to call, hanging up immediately/abruptly) -> 0 to 20\n"
        "4. Determine wants_details (true/false): true if the customer asked for more details/information, "
        "pricing, a brochure/catalog, the company details, or asked to be sent information (by WhatsApp/email/SMS). "
        "Otherwise false.\n\n"
        "You MUST return a JSON object with the following keys:\n"
        "{\n"
        "  \"summary\": \"Short 2-sentence summary here.\",\n"
        "  \"sentiment\": \"POSITIVE\" | \"NEUTRAL\" | \"NEGATIVE\",\n"
        "  \"interest_percentage\": 85,\n"
        "  \"wants_details\": true\n"
        "}"
    )

    if summary_prompt_override:
        system_instruction += f"\n\nAgent's Summary Guidelines:\n{summary_prompt_override}"

    # 3. Apply simple rule-based heuristics as a fallback
    dialogue_lower = dialogue_text.lower()
    inbound_count = sum(1 for t in dialogue_turns if t.get("speaker") == "customer")
    
    # Baseline defaults
    summary = f"Call completed. Dialogue contains {len(dialogue_turns)} turns."
    sentiment = "neutral"
    interest_score = 50

    # Keyword fallback: did the caller ask for details / info / to be sent something?
    detail_keywords = [
        "details", "detail", "brochure", "catalog", "catalogue", "price list", "pricing",
        "more information", "more info", "send me", "email me", "whatsapp", "send the",
        "share the", "send it", "send information", "send details",
        "जानकारी", "विवरण", "भेज", "भेजो", "भेजिए", "વિગત", "વિગતો", "મોકલ",
    ]
    wants_details = any(k in dialogue_lower for k in detail_keywords)

    if inbound_count == 0:
        summary = "Call answered, but the customer was silent."
        sentiment = "neutral"
        interest_score = 10
    else:
        # Check basic words
        has_positive = any(w in dialogue_lower for w in ["yes", "interested", "sure", "ok", "okay", "details", "price", "location", "buy", "नमस्ते", "હા", "હાજી", "थैंक यू", "धन्यवाद", "thanks", "thank you"])
        # Only strong, unambiguous phrases — avoids matching short substrings (e.g. bare "ना")
        # that made almost every call look negative when the AI analyzer was unavailable.
        has_negative = any(w in dialogue_lower for w in ["not interested", "dont call", "don't call", "do not call", "stop calling", "remove my number", "rude", "नहीं चाहिए", "नहीं चाहिये"])
        # If they said "no" but also "thanks/thank you", it is a polite decline or completion, not purely negative
        is_polite_no = "नहीं" in dialogue_lower and any(w in dialogue_lower for w in ["थैंक यू", "धन्यवाद", "thanks", "thank you"])
        
        if has_positive and not has_negative:
            sentiment = "positive"
            interest_score = 75
        elif has_negative:
            sentiment = "negative"
            interest_score = 15
        elif is_polite_no:
            sentiment = "neutral"
            interest_score = 55
        else:
            sentiment = "neutral"
            interest_score = 50

    # 4. Attempt to query Gemini API
    gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if gemini_key and dialogue_text.strip():
        # gemini-2.5-flash is quota-exhausted (429) on this key, which forced every call
        # onto the keyword fallback (constant NEGATIVE/15%). Use the rolling flash alias.
        analysis_model = os.getenv("GEMINI_ANALYSIS_MODEL", "gemini-flash-latest")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{analysis_model}:generateContent?key={gemini_key}"
        body = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": f"Transcript:\n{dialogue_text}"}]
                }
            ],
            "systemInstruction": {
                "parts": [{"text": system_instruction}]
            },
            "generationConfig": {
                "temperature": 0.2,
                "responseMimeType": "application/json",
                "maxOutputTokens": 1024,
                "thinkingConfig": {
                    "thinkingBudget": 0
                }
            }
        }
        try:
            req_data = json.dumps(body).encode("utf-8")
            req = _ur.Request(
                url,
                data=req_data,
                headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
            )
            context = ssl._create_unverified_context()
            with _ur.urlopen(req, context=context, timeout=8) as resp:
                resp_data = json.loads(resp.read().decode("utf-8"))
                text_reply = resp_data["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(text_reply.strip())
                summary = parsed.get("summary", summary)
                sentiment = parsed.get("sentiment", sentiment).lower()
                interest_score = int(parsed.get("interest_percentage", interest_score))
                if "wants_details" in parsed:
                    wants_details = bool(parsed.get("wants_details"))
        except Exception as e:
            print(f"[Transcript Analysis Warning] Failed to query Gemini API: {e}. Using fallback values.")

    # 5. Clamp interest score
    interest_score = max(0, min(100, interest_score))

    # 6. Save/update to Database
    try:
        transcript = db.query(Transcript).filter(Transcript.call_id == call_id).first()
        if transcript:
            transcript.summary = summary
            transcript.sentiment = sentiment
            transcript.interest_score = interest_score
            transcript.dialogue_json = dialogue_turns
            transcript.wants_details = wants_details
        else:
            transcript = Transcript(
                call_id=call_id,
                dialogue_json=dialogue_turns,
                summary=summary,
                sentiment=sentiment,
                interest_score=interest_score,
                wants_details=wants_details,
            )
            db.add(transcript)
        db.commit()
        print(f"[Transcript Analysis SUCCESS] Call {call_id}: summary='{summary}', sentiment='{sentiment}', interest={interest_score}%, wants_details={wants_details}")
    except Exception as db_err:
        db.rollback()
        print(f"[Transcript Analysis Database Error] {db_err}")

    # 7. Auto follow-up: send company details on WhatsApp + email when the call shows
    #    interest (>= org threshold) or the caller asked for details.
    if send_followup:
        try:
            _maybe_send_company_details(db, call_id, interest_score, wants_details)
        except Exception as followup_err:
            print(f"[Transcript Analysis Follow-up Error] {followup_err}")


def _maybe_send_company_details(db: Session, call_id: int, interest_score: int, wants_details: bool):
    """Decide whether the call qualifies for an auto follow-up, then deliver it."""
    from app.models.all_models import Call, Organization

    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        return

    # Resolve the org via the call's agent -> team, to read its follow-up config.
    org = None
    agent = call.agent
    if agent and agent.team and agent.team.organization_id:
        org = db.query(Organization).filter(Organization.id == agent.team.organization_id).first()
    if not org:
        return

    if not getattr(org, "auto_send_details", True):
        return  # vendor turned auto follow-up off
    if not (getattr(org, "company_details", None) or "").strip():
        return  # nothing configured to send

    threshold = getattr(org, "auto_send_threshold", 50)
    if threshold is None:
        threshold = 50

    qualifies = bool(wants_details) or (interest_score is not None and interest_score >= threshold)
    if not qualifies:
        return

    reason = "asked for details" if wants_details else f"interest {interest_score}% >= {threshold}%"
    from app.services.notifications import deliver_company_details
    deliver_company_details(db, call_id, reason=reason)
