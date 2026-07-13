"""Parse and normalize campaign schedule times from the dashboard UI."""
import datetime
import re
from typing import Optional, Tuple


def normalize_time_str(s: str) -> str:
    if not s:
        return s
    s = s.strip().replace("(", " ").replace(")", " ")
    return " ".join(s.split())


def parse_flexible_time(s: str) -> Optional[datetime.time]:
    """
    Accept multiple formats from the UI:
    - 09:00 AM / 12:25 PM
    - 09:00 (AM) -> 09:00 AM
    - 14:30 (24h from <input type="time">)
    - 00:25 AM -> 12:25 AM (midnight edge case)
    """
    normalized = normalize_time_str(s)
    if not normalized:
        return None

    # 24-hour HH:MM (no AM/PM) — from HTML time input
    if re.fullmatch(r"\d{1,2}:\d{2}", normalized):
        try:
            return datetime.datetime.strptime(normalized, "%H:%M").time()
        except ValueError:
            pass

    # Fix invalid 00:xx AM/PM -> 12:xx AM/PM for 12-hour parser
    midnight_fix = re.match(r"^00:(\d{2})\s*(AM|PM)$", normalized, re.IGNORECASE)
    if midnight_fix:
        normalized = f"12:{midnight_fix.group(1)} {midnight_fix.group(2).upper()}"

    for fmt in ("%I:%M %p", "%I:%M%p", "%H:%M"):
        try:
            return datetime.datetime.strptime(normalized, fmt).time()
        except ValueError:
            continue
    return None


def format_time_12h(t: datetime.time) -> str:
    """Store consistent 12-hour strings in the database."""
    return t.strftime("%I:%M %p").lstrip("0")


def normalize_campaign_time_field(raw: Optional[str], default: str) -> str:
    parsed = parse_flexible_time(raw or default)
    if parsed is None:
        return default
    return format_time_12h(parsed)


def is_within_daily_window(
    now: datetime.datetime,
    time_start_str: str,
    time_end_str: str,
) -> Tuple[bool, str]:
    """Return (in_window, debug_reason)."""
    start_time = parse_flexible_time(time_start_str or "09:00 AM")
    end_time = parse_flexible_time(time_end_str or "11:59 PM")

    if start_time is None or end_time is None:
        return False, f"unparseable window '{time_start_str}' - '{time_end_str}'"

    current_time = now.time()
    if start_time <= end_time:
        in_window = start_time <= current_time <= end_time
    else:
        in_window = current_time >= start_time or current_time <= end_time

    reason = (
        f"now={current_time.strftime('%H:%M')} window={start_time.strftime('%H:%M')}-"
        f"{end_time.strftime('%H:%M')} in_window={in_window}"
    )
    return in_window, reason
