"""Point a phone number's incoming-call webhook at our inbound answer endpoint.

Platform-owned (shared) provider account model: the number already exists in our
Plivo/Twilio account; assigning it to a vendor auto-registers the answer webhook
so incoming calls hit `/api/v1/calls/{provider}/answer` (no call_id) and get routed
by `_resolve_inbound_call`. Best-effort: functions return a status dict and never
raise, so the assignment still saves even if the provider API call fails.
"""

import os
import ssl
import json
import base64
import urllib.parse
import urllib.request
import urllib.error


def _basic_auth(user: str, pwd: str) -> str:
    return base64.b64encode(f"{user}:{pwd}".encode()).decode()


def _ctx() -> ssl.SSLContext:
    return ssl._create_unverified_context()


def _get(url: str, auth: str) -> dict:
    req = urllib.request.Request(url, headers={"Authorization": f"Basic {auth}"})
    with urllib.request.urlopen(req, context=_ctx()) as resp:
        return json.loads(resp.read().decode("utf-8") or "{}")


def _post_form(url: str, data: dict, auth: str) -> dict:
    payload = urllib.parse.urlencode(data).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": f"Basic {auth}",
    })
    with urllib.request.urlopen(req, context=_ctx()) as resp:
        return json.loads(resp.read().decode("utf-8") or "{}")


def _base_url() -> str:
    return os.getenv("BASE_URL", "http://localhost:5011").rstrip("/")


def _clean_number(num: str) -> str:
    return "".join(c for c in (num or "") if c.isdigit() or c == "+")


def register_plivo_inbound(number: str) -> dict:
    """Route a Plivo number at our inbound webhook via a shared Plivo Application."""
    auth_id = os.getenv("PLIVO_AUTH_ID")
    auth_token = os.getenv("PLIVO_AUTH_TOKEN")
    if not (auth_id and auth_token):
        return {"ok": False, "message": "Plivo credentials are not configured on the server."}
    auth = _basic_auth(auth_id, auth_token)
    answer_url = f"{_base_url()}/api/v1/calls/plivo/answer"
    app_name = "Voqly Inbound"
    try:
        # Find or create the shared inbound application, keeping its answer_url current.
        apps = _get(
            f"https://api.plivo.com/v1/Account/{auth_id}/Application/?app_name={urllib.parse.quote(app_name)}",
            auth,
        )
        app_id = next((a.get("app_id") for a in (apps.get("objects") or []) if a.get("app_name") == app_name), None)
        if not app_id:
            created = _post_form(
                f"https://api.plivo.com/v1/Account/{auth_id}/Application/",
                {"app_name": app_name, "answer_url": answer_url, "answer_method": "POST"},
                auth,
            )
            app_id = created.get("app_id")
        else:
            _post_form(
                f"https://api.plivo.com/v1/Account/{auth_id}/Application/{app_id}/",
                {"answer_url": answer_url, "answer_method": "POST"},
                auth,
            )
        num = _clean_number(number).lstrip("+")
        _post_form(f"https://api.plivo.com/v1/Account/{auth_id}/Number/{num}/", {"app_id": app_id}, auth)
        return {"ok": True, "message": f"Plivo number {number} routed to the inbound webhook."}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8") if hasattr(e, "read") else ""
        return {"ok": False, "message": f"Plivo API {e.code}: {body[:200]}"}
    except Exception as e:  # noqa: BLE001
        return {"ok": False, "message": f"Plivo registration error: {e}"}


def register_twilio_inbound(number: str) -> dict:
    """Set a Twilio number's VoiceUrl to our inbound webhook."""
    sid = os.getenv("TWILIO_ACCOUNT_SID")
    token = os.getenv("TWILIO_AUTH_TOKEN")
    if not (sid and token):
        return {"ok": False, "message": "Twilio credentials are not configured on the server."}
    auth = _basic_auth(sid, token)
    voice_url = f"{_base_url()}/api/v1/calls/twilio/answer"
    num = _clean_number(number)
    try:
        listing = _get(
            f"https://api.twilio.com/2010-04-01/Accounts/{sid}/IncomingPhoneNumbers.json?PhoneNumber={urllib.parse.quote(num)}",
            auth,
        )
        incoming = listing.get("incoming_phone_numbers") or []
        if not incoming:
            return {"ok": False, "message": f"Number {number} was not found in the Twilio account."}
        pn_sid = incoming[0].get("sid")
        _post_form(
            f"https://api.twilio.com/2010-04-01/Accounts/{sid}/IncomingPhoneNumbers/{pn_sid}.json",
            {"VoiceUrl": voice_url, "VoiceMethod": "POST"},
            auth,
        )
        return {"ok": True, "message": f"Twilio number {number} VoiceUrl set to the inbound webhook."}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8") if hasattr(e, "read") else ""
        return {"ok": False, "message": f"Twilio API {e.code}: {body[:200]}"}
    except Exception as e:  # noqa: BLE001
        return {"ok": False, "message": f"Twilio registration error: {e}"}


def register_inbound_webhook(provider: str, number: str) -> dict:
    """Best-effort: point `number`'s answer webhook at our inbound endpoint."""
    provider = (provider or "plivo").strip().lower()
    if provider == "twilio":
        return register_twilio_inbound(number)
    return register_plivo_inbound(number)
