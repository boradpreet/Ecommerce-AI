"""Agent catalog helpers: global defaults vs org-specific custom entries."""

from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.all_models import AgentCatalog
from app.services.industry_catalog import INDUSTRIES

# Industry order for the catalog dropdowns (12 built-in industries).
GLOBAL_CATEGORIES = tuple(INDUSTRIES)

# Legacy / onboarding industry ids -> catalog category names.
_LEGACY_INDUSTRY_MAP = {
    "e-commerce": "E-commerce", "ecommerce": "E-commerce",
    "fintech": "Banking & Finance", "finance": "Banking & Finance",
    "banking & finance": "Banking & Finance",
}


def resolve_default_category(industry: Optional[str], categories: List[Dict[str, Any]]) -> str:
    """Map the org's onboarded industry to a catalog category for pre-selection."""
    names = [c["name"] for c in categories]
    if not names:
        return ""
    raw = (industry or "").strip()
    if not raw:
        return names[0]
    for n in names:
        if n.lower() == raw.lower():
            return n
    mapped = _LEGACY_INDUSTRY_MAP.get(raw.lower())
    if mapped and mapped in names:
        return mapped
    return names[0]


def _catalog_prompt_field(item, direction: str) -> str:
    """Pick the outbound (system_prompt) or inbound (inbound_prompt) column,
    falling back to the outbound prompt when an inbound one hasn't been set."""
    if item is None:
        return ""
    if direction == "inbound":
        return (getattr(item, "inbound_prompt", None) or item.system_prompt or "")
    return item.system_prompt or ""


def resolve_catalog_prompt(
    db: Session,
    category: str,
    subcategory: str,
    organization_id: Optional[int],
    direction: str = "outbound",
) -> str:
    """Org-specific catalog entry wins over global defaults. `direction` selects
    the inbound vs outbound prompt column."""
    direction = "inbound" if str(direction).lower() == "inbound" else "outbound"
    if organization_id is not None:
        org_item = (
            db.query(AgentCatalog)
            .filter(
                AgentCatalog.category == category,
                AgentCatalog.subcategory == subcategory,
                AgentCatalog.organization_id == organization_id,
            )
            .first()
        )
        resolved = _catalog_prompt_field(org_item, direction)
        if resolved:
            return resolved

    global_item = (
        db.query(AgentCatalog)
        .filter(
            AgentCatalog.category == category,
            AgentCatalog.subcategory == subcategory,
            AgentCatalog.organization_id.is_(None),
        )
        .first()
    )
    return _catalog_prompt_field(global_item, direction)


def build_catalog_options(db: Session, organization_id: Optional[int] = None) -> Dict[str, Any]:
    """Merge global catalog entries with org-specific custom entries."""
    global_items = (
        db.query(AgentCatalog)
        .filter(AgentCatalog.organization_id.is_(None))
        .order_by(AgentCatalog.category, AgentCatalog.subcategory)
        .all()
    )
    org_items = []
    if organization_id is not None:
        org_items = (
            db.query(AgentCatalog)
            .filter(AgentCatalog.organization_id == organization_id)
            .order_by(AgentCatalog.category, AgentCatalog.subcategory)
            .all()
        )

    categories: Dict[str, Dict[str, Any]] = {}

    for item in global_items:
        cat = categories.setdefault(
            item.category,
            {"name": item.category, "is_global": True, "is_custom": False, "subcategories": []},
        )
        cat["subcategories"].append(
            {"name": item.subcategory, "is_custom": False, "id": item.id}
        )

    for item in org_items:
        is_global_category = item.category in GLOBAL_CATEGORIES
        if item.category not in categories:
            categories[item.category] = {
                "name": item.category,
                "is_global": False,
                "is_custom": True,
                "subcategories": [],
            }
        cat = categories[item.category]
        existing_names = {s["name"] for s in cat["subcategories"]}
        if item.subcategory not in existing_names:
            cat["subcategories"].append(
                {"name": item.subcategory, "is_custom": True, "id": item.id}
            )
        elif is_global_category:
            for sub in cat["subcategories"]:
                if sub["name"] == item.subcategory:
                    sub["is_custom"] = True
                    sub["id"] = item.id

    ordered: List[Dict[str, Any]] = []
    for name in GLOBAL_CATEGORIES:
        if name in categories:
            ordered.append(categories.pop(name))
    for name in sorted(categories.keys()):
        ordered.append(categories[name])

    return {"categories": ordered}
