import os
import time
import datetime
import threading
import json
import random
import urllib.request
import urllib.parse
import urllib.error
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.all_models import Campaign, Lead, Call, Agent, Transcript, Document, Team, Organization
from sqlalchemy import func
from app.services.agent_call_context import build_call_instructions
from app.services.campaign_schedule import is_within_daily_window, parse_flexible_time
from app.services.call_logger import save_call_to_json

# Global flag to control the dialer background thread
RUN_DIALER = True

class CampaignDialer:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(CampaignDialer, cls).__new__(cls)
                cls._instance.thread = None
                cls._instance.cv = threading.Condition()
                cls._instance.dial_lock = threading.Lock()
            return cls._instance

    def start(self):
        # Startup cleanup: release any calls left over in 'initiated' or 'connected' status from a previous session
        db = SessionLocal()
        try:
            stuck_calls = db.query(Call).filter(Call.status.in_(["initiated", "connected"])).all()
            if stuck_calls:
                print(f"[Dialer Startup] Found {len(stuck_calls)} stuck calls from a previous session. Recovering...")
                for call in stuck_calls:
                    if call.status == "initiated":
                        call.status = "failed"
                        lead = db.query(Lead).filter(Lead.id == call.lead_id).first()
                        campaign = db.query(Campaign).filter(Campaign.id == lead.campaign_id).first() if lead else None
                        if lead:
                            self.mark_lead_after_failed_attempt(db, lead, campaign)
                    else:
                        call.status = "completed"
                        lead = db.query(Lead).filter(Lead.id == call.lead_id).first()
                        if lead:
                            lead.status = "called"
                db.commit()
                print("[Dialer Startup] Stuck calls recovery completed.")
        except Exception as e:
            print(f"[Dialer Startup Error] Failed to clean up stuck calls: {e}")
        finally:
            db.close()

        with self._lock:
            if self.thread is None or not self.thread.is_alive():
                global RUN_DIALER
                RUN_DIALER = True
                self.thread = threading.Thread(target=self._run_loop, name="CampaignDialerThread", daemon=True)
                self.thread.start()
                print("Campaign Outbound Dialer Daemon started successfully.")

    def stop(self):
        global RUN_DIALER
        RUN_DIALER = False
        with self.cv:
            self.cv.notify_all()
        print("Campaign Outbound Dialer Daemon stopped.")

    def trigger_check(self):
        """Wakens the dialer loop to immediately process calls."""
        with self.cv:
            self.cv.notify_all()

    def get_lead_attempt_count(self, db: Session, lead_id: int) -> int:
        return db.query(Call).filter(Call.lead_id == lead_id).count()

    def is_lead_eligible_for_dial(self, db: Session, campaign: Campaign, lead: Lead) -> bool:
        max_attempts = campaign.max_attempts or 3
        attempt_count = self.get_lead_attempt_count(db, lead.id)
        if attempt_count >= max_attempts:
            return False

        last_call = (
            db.query(Call)
            .filter(Call.lead_id == lead.id)
            .order_by(Call.created_at.desc())
            .first()
        )
        if last_call and last_call.status == "failed":
            retry_delay_hours = campaign.retry_delay_hours or 2
            retry_after = last_call.created_at + datetime.timedelta(hours=retry_delay_hours)
            if datetime.datetime.utcnow() < retry_after:
                return False
        return True

    def mark_lead_after_failed_attempt(self, db: Session, lead: Lead | None, campaign: Campaign | None) -> None:
        if not lead:
            return
        max_attempts = (campaign.max_attempts if campaign else None) or 3
        attempt_count = self.get_lead_attempt_count(db, lead.id)
        if attempt_count >= max_attempts:
            lead.status = "failed"
            print(f"[Dialer] Lead {lead.id} reached max attempts ({max_attempts}). Marking as failed.")
        else:
            lead.status = "pending"
            print(f"[Dialer] Lead {lead.id} attempt {attempt_count}/{max_attempts} failed. Scheduled for retry.")

    def _run_loop(self):
        while RUN_DIALER:
            try:
                self.check_and_dial()
            except Exception as e:
                print(f"[Dialer Error] Exception in dialer loop: {e}")
            
            # Wait for 15 seconds or until triggered explicitly
            with self.cv:
                self.cv.wait(timeout=15.0)

    def _cleanup_stuck_calls(self, db: Session):
        """
        Scans for and cleans up stuck calls to prevent blocking the campaign queue permanently.
        - 'initiated' calls older than 3 minutes: set call status to 'failed', lead status to 'pending' (to allow retry).
        - 'connected' calls older than (max_duration_seconds + 120 seconds): set call status to 'completed', lead status to 'called'.
        """
        now = datetime.datetime.utcnow()
        
        # 1. Clean up stuck 'initiated' calls
        initiated_timeout = now - datetime.timedelta(minutes=3)
        stuck_initiated = db.query(Call).filter(
            Call.status == "initiated",
            Call.created_at < initiated_timeout
        ).all()
        
        for call in stuck_initiated:
            print(f"[Dialer Auto-Recovery] Call {call.id} stuck in 'initiated' state for too long. Marking call as failed.")
            call.status = "failed"
            lead = db.query(Lead).filter(Lead.id == call.lead_id).first()
            campaign = db.query(Campaign).filter(Campaign.id == lead.campaign_id).first() if lead else None
            if lead:
                self.mark_lead_after_failed_attempt(db, lead, campaign)
                
        # 2. Clean up stuck 'connected' calls
        stuck_connected = db.query(Call).filter(
            Call.status == "connected"
        ).all()
        
        for call in stuck_connected:
            lead = db.query(Lead).filter(Lead.id == call.lead_id).first()
            campaign = db.query(Campaign).filter(Campaign.id == lead.campaign_id).first() if lead else None
            agent = db.query(Agent).filter(Agent.id == call.agent_id).first()
            
            max_seconds = 300
            if campaign and getattr(campaign, 'max_duration_seconds', None) is not None:
                max_seconds = campaign.max_duration_seconds
            elif agent and getattr(agent, 'max_duration_seconds', None) is not None:
                max_seconds = agent.max_duration_seconds
                
            timeout_limit = datetime.timedelta(seconds=max_seconds + 120)
            if call.created_at < now - timeout_limit:
                print(f"[Dialer Auto-Recovery] Call {call.id} stuck in 'connected' state past max duration limit. Marking as completed and lead as called.")
                call.status = "completed"
                call.duration_seconds = max_seconds
                if lead:
                    lead.status = "called"
                    
        if stuck_initiated or stuck_connected:
            db.commit()

    def _org_minutes_state(self, db: Session, campaign: Campaign):
        """Return (used_minutes, minute_limit, limit_reached) for the campaign's vendor org.

        Used minutes = total talk time across ALL of the org's agents. A None limit
        means unlimited (never reached).
        """
        try:
            agent = db.query(Agent).filter(Agent.id == campaign.agent_id).first()
            if not agent or not agent.team_id:
                return (0.0, None, False)
            team = db.query(Team).filter(Team.id == agent.team_id).first()
            if not team:
                return (0.0, None, False)
            org = db.query(Organization).filter(Organization.id == team.organization_id).first()
            if not org:
                return (0.0, None, False)
            limit = getattr(org, "call_minutes_limit", 100)
            if limit is None:
                return (0.0, None, False)  # unlimited
            agent_ids = [a.id for a in db.query(Agent.id).join(Team, Agent.team_id == Team.id).filter(Team.organization_id == org.id).all()]
            if not agent_ids:
                return (0.0, limit, False)
            total_seconds = db.query(func.sum(Call.duration_seconds)).filter(Call.agent_id.in_(agent_ids)).scalar() or 0
            used = round(total_seconds / 60.0, 1)
            return (used, limit, used >= limit)
        except Exception as e:
            print(f"[Dialer] _org_minutes_state error: {e}")
            return (0.0, None, False)

    def check_and_dial(self):
        with self.dial_lock:
            db: Session = SessionLocal()
            try:
                # Clean up any stuck calls before checking campaign queues
                self._cleanup_stuck_calls(db)

                # 1. Fetch all active campaigns
                active_campaigns = db.query(Campaign).filter(Campaign.status == "active").all()
                if not active_campaigns:
                    return

                for campaign in active_campaigns:
                    # 1b. Inbound campaigns answer incoming calls — the dialer never dials them.
                    if (getattr(campaign, "direction", None) or "").upper() == "INBOUND":
                        continue

                    # 2. Check scheduling time window
                    if not self.is_within_time_window(campaign):
                        continue

                    # 2b. Enforce per-vendor call-minute limit — stop campaign when exhausted
                    used_min, min_limit, limit_reached = self._org_minutes_state(db, campaign)
                    if limit_reached:
                        if campaign.status != "limit_reached":
                            campaign.status = "limit_reached"
                            db.commit()
                            print(f"[Dialer] Campaign '{campaign.name}' stopped — vendor call-minute limit reached ({used_min}/{min_limit} min).")
                        continue

                    # 3. Check if there is an active call currently in-progress for this campaign
                    active_call = db.query(Call).join(Lead).filter(
                        Lead.campaign_id == campaign.id,
                        Call.status.in_(["initiated", "connected"])
                    ).first()

                    if active_call:
                        # Sequential dialing: wait for the current call to finish before dialing next
                        continue

                    # 4. Find the next pending lead in the queue that is eligible to be called
                    pending_leads = db.query(Lead).filter(
                        Lead.campaign_id == campaign.id,
                        Lead.status.in_(["pending", "PENDING"])
                    ).order_by(Lead.id).all()

                    next_lead = None
                    for lead in pending_leads:
                        # A. Check attempt limit
                        max_attempts = campaign.max_attempts or 3
                        attempt_count = self.get_lead_attempt_count(db, lead.id)
                        if attempt_count >= max_attempts:
                            lead.status = "failed"
                            db.commit()
                            print(f"[Dialer] Lead {lead.id} exceeded max attempts ({max_attempts}) - marking failed.")
                            continue

                        # B. Check phone number based de-duplication
                        if lead.phone_number:
                            # Check if this phone number has already been called successfully or is active under a different lead ID in this campaign
                            already_called = db.query(Call).join(Lead).filter(
                                Lead.campaign_id == campaign.id,
                                Lead.phone_number == lead.phone_number,
                                Call.lead_id != lead.id
                            ).filter(Call.status.in_(["completed", "initiated", "connected"])).first()

                            if already_called:
                                lead.status = "failed"
                                db.commit()
                                print(f"[Dialer] Skipping duplicate lead {lead.id} ({lead.phone_number}) - already called in this campaign.")
                                continue

                        # C. Check retry delay eligibility
                        if self.is_lead_eligible_for_dial(db, campaign, lead):
                            next_lead = lead
                            break

                    if next_lead and not self.is_lead_eligible_for_dial(db, campaign, next_lead):
                        if self.get_lead_attempt_count(db, next_lead.id) >= (campaign.max_attempts or 3):
                            next_lead.status = "failed"
                            db.commit()
                            print(f"[Dialer] Lead {next_lead.id} exceeded max attempts for campaign '{campaign.name}'. Marking failed.")
                        continue

                    if next_lead:
                        # Skip campaigns whose agent is missing or inactive
                        agent = db.query(Agent).filter(Agent.id == campaign.agent_id).first()
                        if not agent:
                            print(f"[Dialer] Campaign '{campaign.name}' has no agent — skipping.")
                            continue
                        if agent.is_active is False:
                            print(f"[Dialer] Agent '{agent.name}' is inactive — skipping campaign '{campaign.name}'.")
                            continue
                        self.dial_lead(db, campaign, next_lead, agent)
                    else:
                        # No pending lead and no active call. Check if campaign has leads and mark as completed.
                        total_leads = db.query(Lead).filter(Lead.campaign_id == campaign.id).count()
                        if total_leads > 0:
                            print(f"[Dialer] Campaign '{campaign.name}' (ID: {campaign.id}) has completed all leads. Setting status to 'completed'.")
                            campaign.status = "completed"
                            db.commit()

            except Exception as e:
                print(f"[Dialer Error] check_and_dial error: {e}")
            finally:
                db.close()

    def is_within_time_window(self, campaign: Campaign) -> bool:
        """
        Validates if the campaign is active within its scheduled date, days, and daily window time.
        """
        try:
            # Default to America/Los_Angeles if timezone is empty or invalid
            tz_str = campaign.timezone or "America/Los_Angeles"
            tz = ZoneInfo(tz_str)
        except Exception:
            tz = ZoneInfo("America/Los_Angeles")

        now = datetime.datetime.now(tz)

        # A. Check Launch Date & Time (combined threshold)
        if campaign.launch_date:
            try:
                launch_date = datetime.datetime.strptime(campaign.launch_date, "%Y-%m-%d").date()
                start_time = datetime.time(0, 0)
                if campaign.time_start:
                    parsed_start = parse_flexible_time(campaign.time_start)
                    if parsed_start:
                        start_time = parsed_start
                launch_datetime = datetime.datetime.combine(launch_date, start_time, tzinfo=tz)
                if now < launch_datetime:
                    return False
            except Exception:
                pass # Parse error, skip date/time restriction

        # B. Check Active Days (e.g. M,T,W,T,F or Mon,Tue,Wed,Thu,Fri)
        if campaign.active_days:
            # Map abbreviations
            day_map = {
                "m": 0, "mon": 0, "t": 1, "tue": 1, "w": 2, "wed": 2,
                "thu": 3, "f": 4, "fri": 4, "sat": 5, "sun": 6
            }
            active_days_list = [d.strip().lower() for d in campaign.active_days.split(",")]
            active_wdays = []
            for d in active_days_list:
                # Handle single character or full abbrev
                if d in day_map:
                    active_wdays.append(day_map[d])
                elif d == "t" and 1 not in active_wdays:  # Second T is Thu
                    active_wdays.append(3)
            
            # If we mapped any days, check weekday
            if active_wdays and now.weekday() not in active_wdays:
                return False

        # C. Check Daily Window Time (time_start - time_end)
        in_window, reason = is_within_daily_window(
            now,
            campaign.time_start or "09:00 AM",
            campaign.time_end or "11:59 PM",
        )
        if not in_window:
            print(f"[Dialer Schedule] Campaign '{campaign.name}' outside window: {reason}")
        return in_window

    def dial_lead(self, db: Session, campaign: Campaign, lead: Lead, agent: Agent | None = None):
        if agent is None:
            agent = db.query(Agent).filter(Agent.id == campaign.agent_id).first()
        agent_label = agent.name if agent else "Unknown Agent"
        kb_note = f" [KB linked: {agent.kb_id}]" if agent and agent.kb_id else ""
        print(f"[Dialer] Initiating call to {lead.name} ({lead.phone_number}) for campaign '{campaign.name}' with agent '{agent_label}'{kb_note}...")

        # 1. Create Call database entry
        call = Call(
            lead_id=lead.id,
            agent_id=campaign.agent_id,
            status="initiated"
        )
        db.add(call)
        
        # 2. Set Lead status to calling
        lead.status = "calling"
        db.commit()
        db.refresh(call)

        # 3. Trigger Outbound Calling
        plivo_auth_id = os.getenv("PLIVO_AUTH_ID")
        plivo_auth_token = os.getenv("PLIVO_AUTH_TOKEN")
        plivo_from = os.getenv("PLIVO_FROM_NUMBER", "+12135550199")

        twilio_sid = os.getenv("TWILIO_ACCOUNT_SID")
        twilio_token = os.getenv("TWILIO_AUTH_TOKEN")
        twilio_from = os.getenv("TWILIO_FROM_NUMBER", "")

        telephony_provider = "plivo"

        try:
            from app.models.all_models import Team, Organization
            if agent and agent.team_id:
                team = db.query(Team).filter(Team.id == agent.team_id).first()
                if team and team.organization_id:
                    org = db.query(Organization).filter(Organization.id == team.organization_id).first()
                    if org:
                        if getattr(org, "telephony_provider", None):
                            telephony_provider = org.telephony_provider.strip().lower()
                        if org.plivo_number:
                            plivo_from = org.plivo_number
                        if getattr(org, "twilio_number", None) and org.twilio_number:
                            twilio_from = org.twilio_number
                        print(f"[Dialer] Resolved telephony configuration for org {org.name}: provider={telephony_provider}, plivo_from={plivo_from}, twilio_from={twilio_from}")
        except Exception as dial_org_err:
            print(f"[Dialer Error] Failed to resolve custom organization telephony config: {dial_org_err}")

        base_url = os.getenv("BASE_URL", "http://localhost:5011")

        if telephony_provider == "twilio" and twilio_sid and twilio_token:
            # Place outbound call via Twilio API
            threading.Thread(
                target=self._make_twilio_call_async,
                args=(twilio_sid, twilio_token, twilio_from, lead.phone_number, call.id, base_url),
                daemon=True
            ).start()
        elif telephony_provider == "plivo" and plivo_auth_id and plivo_auth_token:
            # Place outbound call via Plivo API
            threading.Thread(
                target=self._make_plivo_call_async,
                args=(plivo_auth_id, plivo_auth_token, plivo_from, lead.phone_number, call.id, base_url),
                daemon=True
            ).start()
        else:
            # Fallback to simulation mode in the background
            print(f"[Dialer Simulation] Credentials not configured for provider '{telephony_provider}'. Triggering call simulation...")
            threading.Thread(
                target=self._simulate_call_lifecycle,
                args=(call.id, lead.id, campaign.agent_id),
                daemon=True
            ).start()

    def _make_twilio_call_async(self, account_sid: str, auth_token: str, from_num: str, to_num: str, call_id: int, base_url: str):
        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Calls.json"
            
            # Clean from and to numbers to match E.164 format (remove spaces, parentheses, hyphens)
            from_num_clean = "".join(c for c in from_num if c.isdigit() or c == "+")
            to_num_clean = "".join(c for c in to_num if c.isdigit() or c == "+")
            
            # Normalize the base URL and setup webhook URLs
            normalized_base = base_url.rstrip("/")
            answer_url = f"{normalized_base}/api/v1/calls/twilio/answer?call_id={call_id}"
            status_url = f"{normalized_base}/api/v1/calls/twilio/status?call_id={call_id}"
            
            data = {
                "From": from_num_clean,
                "To": to_num_clean,
                "Url": answer_url,
                "Method": "POST",
                "StatusCallback": status_url,
                "StatusCallbackMethod": "POST"
            }
            
            payload = urllib.parse.urlencode(data).encode("utf-8")
            req = urllib.request.Request(url, data=payload, headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": f"Basic {self._get_basic_auth_header(account_sid, auth_token)}"
            })
            
            import ssl
            context = ssl._create_unverified_context()
            
            with urllib.request.urlopen(req, context=context) as response:
                res_body = response.read().decode("utf-8")
                print(f"[Twilio API Response] Call Triggered: {res_body}")
                try:
                    res_json = json.loads(res_body)
                    request_sid = res_json.get("sid")
                    if request_sid:
                        db2 = SessionLocal()
                        call_db = db2.query(Call).filter(Call.id == call_id).first()
                        if call_db:
                            call_db.provider_call_uuid = request_sid
                            db2.commit()
                        db2.close()
                except Exception:
                    pass
        except Exception as e:
            if isinstance(e, urllib.error.HTTPError):
                err_body = e.read().decode("utf-8") if hasattr(e, "read") else "No response body"
                reason = f"Twilio HTTP {e.code} {e.reason}: {err_body[:300]}"
                print(f"[Twilio API Error] HTTP Error {e.code}: {e.reason}\nResponse Body: {err_body}")
            else:
                reason = f"Twilio request error: {e}"
                print(f"[Twilio API Error] Failed to place outbound call: {e}")
            # A real provider IS configured — surface the actual failure instead of
            # faking a "completed" simulated call (which hides the problem).
            self._mark_call_failed(call_id, reason)

    def _make_plivo_call_async(self, auth_id: str, auth_token: str, from_num: str, to_num: str, call_id: int, base_url: str):
        try:
            url = f"https://api.plivo.com/v1/Account/{auth_id}/Call/"
            
            # Clean from and to numbers to match E.164 format (remove spaces, parentheses, hyphens)
            from_num_clean = "".join(c for c in from_num if c.isdigit() or c == "+")
            to_num_clean = "".join(c for c in to_num if c.isdigit() or c == "+")
            
            # Normalize the base URL and setup webhook URLs
            normalized_base = base_url.rstrip("/")
            answer_url = f"{normalized_base}/api/v1/calls/plivo/answer?call_id={call_id}"
            status_url = f"{normalized_base}/api/v1/calls/plivo/status?call_id={call_id}"
            
            data = {
                "from": from_num_clean,
                "to": to_num_clean,
                "answer_url": answer_url,
                "answer_method": "POST",
                "status_callback_url": status_url,
                "status_callback_method": "POST"
            }
            
            payload = urllib.parse.urlencode(data).encode("utf-8")
            req = urllib.request.Request(url, data=payload, headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": f"Basic {self._get_basic_auth_header(auth_id, auth_token)}"
            })
            
            import ssl
            context = ssl._create_unverified_context()
            
            with urllib.request.urlopen(req, context=context) as response:
                res_body = response.read().decode("utf-8")
                print(f"[Plivo API Response] Call Triggered: {res_body}")
                try:
                    res_json = json.loads(res_body)
                    request_uuid = res_json.get("request_uuid") or res_json.get("request_uuid")
                    if request_uuid:
                        db2 = SessionLocal()
                        call_db = db2.query(Call).filter(Call.id == call_id).first()
                        if call_db:
                            call_db.provider_call_uuid = request_uuid
                            db2.commit()
                        db2.close()
                except Exception:
                    pass
        except Exception as e:
            if isinstance(e, urllib.error.HTTPError):
                err_body = e.read().decode("utf-8") if hasattr(e, "read") else "No response body"
                reason = f"Plivo HTTP {e.code} {e.reason}: {err_body[:300]}"
                print(f"[Plivo API Error] HTTP Error {e.code}: {e.reason}\nResponse Body: {err_body}")
            else:
                reason = f"Plivo request error: {e}"
                print(f"[Plivo API Error] Failed to place outbound call: {e}")
            # A real provider IS configured — surface the actual failure instead of
            # faking a "completed" simulated call (which hides the problem).
            self._mark_call_failed(call_id, reason)

    def _get_basic_auth_header(self, username: str, secret: str) -> str:
        import base64
        credentials = f"{username}:{secret}"
        return base64.b64encode(credentials.encode("utf-8")).decode("utf-8")

    def _mark_call_failed(self, call_id: int, reason: str):
        """Mark a call FAILED (not fake-completed) when a configured provider rejects it.

        The reason is stored on the call's transcript summary so it shows up in the
        call-log detail. Lead retry/terminal state respects the campaign's max_attempts
        and retry delay, so a broken configuration cannot cause a dial storm.
        """
        from app.models.all_models import Transcript
        db = SessionLocal()
        try:
            call = db.query(Call).filter(Call.id == call_id).first()
            if not call:
                return
            call.status = "failed"
            summary = f"Call could not be placed: {reason}"
            transcript = db.query(Transcript).filter(Transcript.call_id == call.id).first()
            if transcript:
                transcript.summary = summary
                transcript.sentiment = "neutral"
            else:
                db.add(Transcript(
                    call_id=call.id,
                    dialogue_json=[],
                    summary=summary,
                    sentiment="neutral",
                    interest_score=0,
                ))
            lead = db.query(Lead).filter(Lead.id == call.lead_id).first()
            campaign = db.query(Campaign).filter(Campaign.id == lead.campaign_id).first() if lead else None
            self.mark_lead_after_failed_attempt(db, lead, campaign)
            db.commit()
            print(f"[Dialer] Call {call_id} marked FAILED (no simulation): {reason}")
        except Exception as mark_err:
            db.rollback()
            print(f"[Dialer] _mark_call_failed error for call {call_id}: {mark_err}")
        finally:
            db.close()

    def _simulate_call_lifecycle(self, call_id: int, lead_id: int, agent_id: int):
        """
        Simulates call lifecycle for developers without Plivo credentials:
        Initiated -> Connected -> Dialogue turn execution -> Completed
        """
        db = SessionLocal()
        try:
            # 1. Answer Delay (2 seconds)
            time.sleep(2)
            call = db.query(Call).filter(Call.id == call_id).first()
            lead = db.query(Lead).filter(Lead.id == lead_id).first()
            agent = db.query(Agent).filter(Agent.id == agent_id).first()
            
            if not call or not lead or not agent:
                return

            print(f"[Dialer Simulation] Lead {lead.name} answered call!")
            call.status = "connected"
            db.commit()

            campaign = db.query(Campaign).filter(Campaign.id == lead.campaign_id).first()
            ctx = build_call_instructions(db, agent, lead, campaign)
            kb_context = ctx["kb_content"]
            capabilities = ctx["capabilities"]

            # 2. Generate simulated dialogue using actual agent config
            duration = random.randint(10, 25)
            dialogue = [
                {"speaker": "agent", "text": ctx["first_message"]},
                {"speaker": "customer", "text": f"Hi, I'm {lead.name}. I have a question."},
            ]

            if kb_context:
                dialogue.append({
                    "speaker": "agent",
                    "text": f"I can help with that. As your {capabilities} specialist, I'll answer based on our knowledge documents."
                })
            else:
                dialogue.append({
                    "speaker": "agent",
                    "text": f"I'm {agent.name}. {agent.prompt_system[:120] if agent.prompt_system else 'How can I assist you today?'}"
                })

            dialogue.append({"speaker": "customer", "text": "Thank you, that's helpful!"})
            dialogue.append({"speaker": "agent", "text": "You're welcome. Have a great day!"})

            time.sleep(duration)

            # 3. Call Completed
            call.status = "completed"
            call.duration_seconds = duration
            lead.status = "called"

            # Create transcript record
            summary = f"Simulated call with agent '{agent.name}' to {lead.name}."
            if ctx["doc_names"]:
                summary += f" KB docs: {', '.join(ctx['doc_names'])}."

            from app.services.transcript_analysis import analyze_call_transcript_and_update
            analyze_call_transcript_and_update(call.id, dialogue, db, agent.id)
            
            # Save stats to local JSON folder
            save_call_to_json(call.id, db, prompt_tokens=800, candidates_tokens=400)
            
            print(f"[Dialer Simulation] Call {call_id} completed successfully after {duration}s. Dialer queue advancing...")

            # 4. Trigger the dialer loop to immediately place the next call
            self.trigger_check()

        except Exception as e:
            db.rollback()
            print(f"[Dialer Simulation Error] {e}")
        finally:
            db.close()
