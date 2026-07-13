"""
Auto follow-up delivery: when a call shows interest (>= org threshold) or the caller
asks for details, the vendor's configured Company Details are sent to the caller on
WhatsApp (Twilio/Plivo WhatsApp) and via email (SMTP / Gmail).

Every sender is best-effort and NEVER raises — a missing credential just returns
(ok=False, "…not configured") so a call finishing never breaks because email/WhatsApp
is not set up. Configure the channels via environment variables:

  Email (SMTP / Gmail):
    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=587
    SMTP_USER=you@gmail.com
    SMTP_PASSWORD=<gmail app password>     # NOT your normal password — use an App Password
    SMTP_FROM="Your Company <you@gmail.com>"  # optional, defaults to SMTP_USER
    SMTP_USE_TLS=true                      # optional (STARTTLS on 587). Set false for port 465 SSL.

  WhatsApp (Twilio — recommended, reuses TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN):
    TWILIO_WHATSAPP_FROM=whatsapp:+14155238886   # your WhatsApp-enabled Twilio sender (or sandbox)
  WhatsApp (Plivo — optional fallback):
    PLIVO_WHATSAPP_FROM=+14155238886
"""

import os
import ssl
import json
import smtplib
import base64
import urllib.request
import urllib.parse
import urllib.error
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr

from sqlalchemy.orm import Session


def _truthy(val: str, default: bool = False) -> bool:
    if val is None:
        return default
    return str(val).strip().lower() in ("1", "true", "yes", "on")


def _normalize_e164(number: str) -> str:
    """Best-effort E.164 cleanup: keep digits and a single leading +."""
    if not number:
        return ""
    cleaned = "".join(c for c in str(number) if c.isdigit() or c == "+")
    if not cleaned:
        return ""
    if not cleaned.startswith("+"):
        cleaned = "+" + cleaned.lstrip("+")
    return cleaned


# ---------------------------------------------------------------------------
# Email (SMTP)
# ---------------------------------------------------------------------------
def send_email(to_email: str, subject: str, text_body: str, html_body: str = None) -> tuple:
    """Send an email over SMTP. Returns (ok, message). Never raises."""
    to_email = (to_email or "").strip()
    if not to_email or "@" not in to_email:
        return False, "No valid recipient email address."

    host = os.getenv("SMTP_HOST")
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASSWORD")
    if not host or not user or not password:
        return False, "Email (SMTP) is not configured on the server."

    port = int(os.getenv("SMTP_PORT", "587") or "587")
    from_addr = os.getenv("SMTP_FROM") or user
    use_tls = _truthy(os.getenv("SMTP_USE_TLS"), default=(port == 587))

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        # Support "Name <addr>" or bare address in SMTP_FROM
        if "<" in from_addr and ">" in from_addr:
            msg["From"] = from_addr
        else:
            msg["From"] = formataddr((os.getenv("SMTP_FROM_NAME", "Voqly"), from_addr))
        msg["To"] = to_email
        msg.attach(MIMEText(text_body or "", "plain", "utf-8"))
        if html_body:
            msg.attach(MIMEText(html_body, "html", "utf-8"))

        # extract bare address for envelope sender
        envelope_from = from_addr
        if "<" in from_addr and ">" in from_addr:
            envelope_from = from_addr.split("<", 1)[1].split(">", 1)[0].strip()

        if port == 465:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(host, port, context=context, timeout=15) as server:
                server.login(user, password)
                server.sendmail(envelope_from, [to_email], msg.as_string())
        else:
            with smtplib.SMTP(host, port, timeout=15) as server:
                server.ehlo()
                if use_tls:
                    server.starttls(context=ssl.create_default_context())
                    server.ehlo()
                server.login(user, password)
                server.sendmail(envelope_from, [to_email], msg.as_string())
        return True, f"Email sent to {to_email}."
    except Exception as e:
        print(f"[Notifications] Email send failed: {e}")
        return False, f"Email send failed: {e}"


# ---------------------------------------------------------------------------
# WhatsApp
# ---------------------------------------------------------------------------
def _send_whatsapp_twilio(to_number: str, body: str) -> tuple:
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    wa_from = os.getenv("TWILIO_WHATSAPP_FROM")
    if not account_sid or not auth_token or not wa_from:
        return False, "not_configured"

    to_e164 = _normalize_e164(to_number)
    if not to_e164:
        return False, "No valid recipient phone number."

    from_val = wa_from if wa_from.startswith("whatsapp:") else f"whatsapp:{_normalize_e164(wa_from)}"
    to_val = f"whatsapp:{to_e164}"
    url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
    data = urllib.parse.urlencode({"From": from_val, "To": to_val, "Body": body}).encode("utf-8")
    auth = base64.b64encode(f"{account_sid}:{auth_token}".encode("utf-8")).decode("utf-8")
    req = urllib.request.Request(url, data=data, headers={
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": f"Basic {auth}",
    })
    try:
        context = ssl._create_unverified_context()
        with urllib.request.urlopen(req, context=context, timeout=15) as resp:
            resp.read()
        return True, f"WhatsApp sent to {to_e164}."
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8") if hasattr(e, "read") else ""
        print(f"[Notifications] Twilio WhatsApp HTTP {e.code}: {err_body[:300]}")
        return False, f"WhatsApp send failed (Twilio {e.code}): {err_body[:200]}"
    except Exception as e:
        print(f"[Notifications] Twilio WhatsApp error: {e}")
        return False, f"WhatsApp send failed: {e}"


def _send_whatsapp_plivo(to_number: str, body: str) -> tuple:
    auth_id = os.getenv("PLIVO_AUTH_ID")
    auth_token = os.getenv("PLIVO_AUTH_TOKEN")
    wa_from = os.getenv("PLIVO_WHATSAPP_FROM")
    if not auth_id or not auth_token or not wa_from:
        return False, "not_configured"

    to_e164 = _normalize_e164(to_number)
    if not to_e164:
        return False, "No valid recipient phone number."

    url = f"https://api.plivo.com/v1/Account/{auth_id}/Message/"
    payload = json.dumps({
        "src": _normalize_e164(wa_from),
        "dst": to_e164,
        "type": "whatsapp",
        "text": body,
    }).encode("utf-8")
    auth = base64.b64encode(f"{auth_id}:{auth_token}".encode("utf-8")).decode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={
        "Content-Type": "application/json",
        "Authorization": f"Basic {auth}",
    })
    try:
        context = ssl._create_unverified_context()
        with urllib.request.urlopen(req, context=context, timeout=15) as resp:
            resp.read()
        return True, f"WhatsApp sent to {to_e164}."
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8") if hasattr(e, "read") else ""
        print(f"[Notifications] Plivo WhatsApp HTTP {e.code}: {err_body[:300]}")
        return False, f"WhatsApp send failed (Plivo {e.code}): {err_body[:200]}"
    except Exception as e:
        print(f"[Notifications] Plivo WhatsApp error: {e}")
        return False, f"WhatsApp send failed: {e}"


def send_whatsapp(to_number: str, body: str) -> tuple:
    """Send a WhatsApp message via Twilio (preferred) or Plivo. Returns (ok, message)."""
    ok, msg = _send_whatsapp_twilio(to_number, body)
    if ok:
        return ok, msg
    if msg == "not_configured":
        ok2, msg2 = _send_whatsapp_plivo(to_number, body)
        if ok2:
            return ok2, msg2
        if msg2 == "not_configured":
            return False, "WhatsApp is not configured on the server."
        return ok2, msg2
    return ok, msg


# ---------------------------------------------------------------------------
# Message building + orchestration
# ---------------------------------------------------------------------------
def _build_message(org, lead) -> tuple:
    """Return (subject, text_body, html_body) for the company-details follow-up."""
    company = (getattr(org, "name", None) or "our company").strip()
    details = (getattr(org, "company_details", None) or "").strip()
    website = (getattr(org, "website_url", None) or "").strip()
    lead_name = (getattr(lead, "name", None) or "there").strip() if lead else "there"

    subject = f"Details from {company}"

    text_lines = [f"Hi {lead_name},", ""]
    text_lines.append(f"Thanks for your interest! Here are the details from {company} as requested:")
    text_lines.append("")
    text_lines.append(details)
    if website:
        text_lines.append("")
        text_lines.append(f"Website: {website}")
    text_lines.append("")
    text_lines.append(f"— {company}")
    text_body = "\n".join(text_lines)

    details_html = details.replace("\n", "<br>")
    website_html = f'<p style="margin:16px 0 0"><a href="{website}" style="color:#0F2D67">{website}</a></p>' if website else ""
    html_body = f"""\
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
  <h2 style="color:#0F2D67;margin:0 0 4px">{company}</h2>
  <p style="margin:0 0 16px;color:#475569">Hi {lead_name}, thanks for your interest! Here are the details you asked about:</p>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;line-height:1.6">{details_html}</div>
  {website_html}
  <p style="margin:24px 0 0;color:#94a3b8;font-size:12px">Sent automatically by {company} after your call.</p>
</div>"""
    return subject, text_body, html_body


def _build_whatsapp_text(org, lead) -> str:
    company = (getattr(org, "name", None) or "our company").strip()
    details = (getattr(org, "company_details", None) or "").strip()
    website = (getattr(org, "website_url", None) or "").strip()
    lead_name = (getattr(lead, "name", None) or "there").strip() if lead else "there"
    msg = f"Hi {lead_name}, thanks for your interest! Here are the details from {company}:\n\n{details}"
    if website:
        msg += f"\n\n{website}"
    return msg


def deliver_company_details(db: Session, call_id: int, reason: str = "") -> dict:
    """
    Send the org's Company Details to the caller on WhatsApp + email.
    Idempotent: if the call's transcript already has details_sent, does nothing.
    Never raises. Returns a result dict.
    """
    from app.models.all_models import Call, Transcript, Organization

    try:
        call = db.query(Call).filter(Call.id == call_id).first()
        if not call:
            return {"ok": False, "message": "Call not found."}

        transcript = db.query(Transcript).filter(Transcript.call_id == call_id).first()
        if transcript and getattr(transcript, "details_sent", False):
            return {"ok": True, "skipped": True, "message": "Details already sent for this call."}

        lead = call.lead
        # Resolve org via the call's agent -> team -> organization
        org = None
        agent = call.agent
        if agent and agent.team and agent.team.organization_id:
            org = db.query(Organization).filter(Organization.id == agent.team.organization_id).first()

        if not org:
            return {"ok": False, "message": "Organization not found for this call."}

        details = (getattr(org, "company_details", None) or "").strip()
        if not details:
            return {"ok": False, "message": "No company details configured — nothing to send."}

        results = []
        sent_to = []

        # WhatsApp (we always have the caller's phone number)
        phone = (getattr(lead, "phone_number", None) or "").strip() if lead else ""
        if phone:
            wa_ok, wa_msg = send_whatsapp(phone, _build_whatsapp_text(org, lead))
            results.append(("whatsapp", wa_ok, wa_msg))
            if wa_ok:
                sent_to.append(f"whatsapp:{_normalize_e164(phone)}")

        # Email (only if we captured the lead's email)
        email = (getattr(lead, "email", None) or "").strip() if lead else ""
        if email:
            subject, text_body, html_body = _build_message(org, lead)
            em_ok, em_msg = send_email(email, subject, text_body, html_body)
            results.append(("email", em_ok, em_msg))
            if em_ok:
                sent_to.append(f"email:{email}")
        else:
            results.append(("email", False, "No email on file for this lead."))

        any_ok = any(ok for _, ok, _ in results)

        # Record on the transcript so we never double-send and the UI can show a badge
        if transcript:
            if any_ok:
                transcript.details_sent = True
                transcript.details_sent_to = ", ".join(sent_to)[:500] if sent_to else None
            try:
                db.commit()
            except Exception:
                db.rollback()

        summary = "; ".join(f"{ch}: {'ok' if ok else msg}" for ch, ok, msg in results)
        print(f"[Notifications] Call {call_id} follow-up ({reason}) -> {summary}")
        return {
            "ok": any_ok,
            "reason": reason,
            "channels": [{"channel": ch, "ok": ok, "message": msg} for ch, ok, msg in results],
            "message": summary,
        }
    except Exception as e:
        try:
            db.rollback()
        except Exception:
            pass
        print(f"[Notifications] deliver_company_details error for call {call_id}: {e}")
        return {"ok": False, "message": f"Follow-up failed: {e}"}
