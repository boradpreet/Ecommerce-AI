"""Build Gemini system instructions from agent, campaign, and knowledge-base data."""
import os
import sqlite3
from typing import Optional, Tuple, List
from sqlalchemy.orm import Session

from app.models.all_models import Agent, Lead, Campaign, Document, Organization

# Map UI voice IDs to Gemini Live prebuilt voice names
GEMINI_VOICE_MAP = {
    "female": "Kore",
    "male": "Charon",
    "female voice": "Kore",
    "male voice": "Charon",
    "skylar": "Aoede",
    "corey": "Charon",
    "gemma": "Kore",
    "archie": "Fenrir",
    "daniel": "Charon",
    "katie": "Aoede",
    "aoede": "Aoede",
    "charon": "Charon",
    "kore": "Kore",
    "fenrir": "Fenrir",
    "puck": "Puck",
    "leda": "Leda",
    "achird": "Achird",
    "zephyr": "Zephyr",
    "zepghyre": "Zephyr",
    # Indian / Hindi Voice Map
    "raveena": "Kore",
    "ananya": "Aoede",
    "priya": "Leda",
    "kavita": "Kore",
    "sneha": "Aoede",
    "diya": "Leda",
    "arvind": "Charon",
    "amit": "Fenrir",
    "rohan": "Puck",
    "rahul": "Achird",
    "vikram": "Zephyr",
    "kabir": "Charon",
    "zara": "Zephyr",
    "dev": "Fenrir",
}

MAX_KB_CHARS = 48000


def is_valid_sqlite_db(db_path: str) -> bool:
    if not db_path or not os.path.exists(db_path):
        return False
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        cursor.fetchall()
        conn.close()
        return True
    except Exception:
        return False


def is_valid_users_db(db_path: str) -> bool:
    if not db_path or not os.path.exists(db_path):
        return False
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 1. Check if 'users' table exists and has rows
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users';")
        if cursor.fetchone() is not None:
            cursor.execute("SELECT count(*) FROM users;")
            count = cursor.fetchone()[0]
            if count > 0:
                conn.close()
                return True
            
        # 2. Check if any table contains phone-like or contact-like columns and has rows
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
        tables = [r[0] for r in cursor.fetchall()]
        for table in tables:
            cursor.execute(f'PRAGMA table_info("{table}");')
            cols = [r[1].lower() for r in cursor.fetchall()]
            if any(any(x in c for x in ["phone", "mobile", "tel", "contact"]) for c in cols):
                cursor.execute(f'SELECT count(*) FROM "{table}";')
                count = cursor.fetchone()[0]
                if count > 0:
                    conn.close()
                    return True
                
        conn.close()
        return False
    except Exception:
        return False


def resolve_dynamic_dir(org_id: Optional[int] = None, category: Optional[str] = None, subcategory: Optional[str] = None) -> Optional[str]:
    if not category or not subcategory:
        return None
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    safe_org_id = org_id if org_id is not None else 0
    
    # Try direct join
    db_dir = os.path.join(base_dir, "databses", f"org_{safe_org_id}", category, subcategory)
    if os.path.exists(db_dir) and os.path.isdir(db_dir):
        return db_dir
        
    # Fallback to case-insensitive match
    parent_dir = os.path.join(base_dir, "databses", f"org_{safe_org_id}")
    if os.path.exists(parent_dir) and os.path.isdir(parent_dir):
        for cat_name in os.listdir(parent_dir):
            if cat_name.lower().strip() == category.lower().strip():
                cat_path = os.path.join(parent_dir, cat_name)
                for sub_name in os.listdir(cat_path):
                    if sub_name.lower().strip() == subcategory.lower().strip():
                        matched_dir = os.path.join(cat_path, sub_name)
                        if os.path.isdir(matched_dir):
                            return matched_dir
    return None


def resolve_rhea_db_path(org_id: Optional[int] = None, category: Optional[str] = None, subcategory: Optional[str] = None) -> str:
    db_path = os.getenv("RHEA_ECOMMERCE_DB_PATH")
    if db_path and is_valid_users_db(db_path):
        return db_path
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    safe_org_id = org_id if org_id is not None else 0
    
    # Try custom category/subcategory folder first
    dir_path = resolve_dynamic_dir(org_id, category, subcategory)
    if dir_path:
        # Check if there is any .db file containing tables
        for f in os.listdir(dir_path):
            if f.lower().endswith(".db"):
                p = os.path.join(dir_path, f)
                if is_valid_users_db(p):
                    return p
        # Only return the default name in that folder if it exists
        p_default = os.path.join(dir_path, "rhea_ecommerce.db")
        if is_valid_users_db(p_default):
            return p_default

    # Try dynamic category/subcategory path first
    org_path_dyn = os.path.join(base_dir, "databses", f"org_{safe_org_id}", "Ecommerce", "Project Overview", "rhea_ecommerce.db")
    if os.path.exists(org_path_dyn):
        return org_path_dyn
    # Try legacy subcategory-only path
    return os.path.join(base_dir, "databses", f"org_{safe_org_id}", "Project Overview", "rhea_ecommerce.db")


def resolve_marketing_db_path(org_id: Optional[int] = None) -> str:
    db_path = os.getenv("RHEA_MARKETING_DB_PATH")
    if db_path:
        return db_path
        
    # Case-insensitive resolution
    dir_path = resolve_dynamic_dir(org_id, "Ecommerce", "Marketing Campaign")
    if dir_path:
        org_path = os.path.join(dir_path, "ecommerce_marketing.db")
        if os.path.exists(org_path):
            return org_path

    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    safe_org_id = org_id if org_id is not None else 0
    # Try dynamic category/subcategory path first (with standard and legacy folder spelling)
    for subcat in ["Marketing Campaign", "Marketing Campign"]:
        org_path_dyn = os.path.join(base_dir, "databses", f"org_{safe_org_id}", "Ecommerce", subcat, "ecommerce_marketing.db")
        if os.path.exists(org_path_dyn):
            return org_path_dyn
    # Try legacy subcategory-only path
    return os.path.join(base_dir, "databses", f"org_{safe_org_id}", "Marketing Campign", "ecommerce_marketing.db")


def load_marketing_campaign_context(org_id: Optional[int] = None) -> str:
    db_path = resolve_marketing_db_path(org_id)
    if not os.path.exists(db_path):
        return ""
        
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Check if 'campaigns' table exists first
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='campaigns';")
        if cursor.fetchone() is None:
            conn.close()
            return ""
            
        # 1. Fetch active campaigns
        cursor.execute("SELECT * FROM campaigns WHERE status = 'active';")
        active_camps = [dict(r) for r in cursor.fetchall()]
        
        # If no active campaigns, fall back to clearance/festival types
        if not active_camps:
            cursor.execute("SELECT * FROM campaigns LIMIT 3;")
            active_camps = [dict(r) for r in cursor.fetchall()]
            
        context_parts = []
        for camp in active_camps:
            camp_id = camp["campaign_id"]
            context_parts.append(
                f"### Active Campaign: {camp['name']} ({camp['type'].upper()} Sale)\n"
                f"- Validity: From {camp['start_date']} to {camp['end_date']}"
            )
            
            # Fetch offers for this campaign
            cursor.execute(
                "SELECT co.*, p.name as product_name, p.selling_price, p.description, p.mrp "
                "FROM campaign_offers co "
                "JOIN products p ON co.product_id = p.product_id "
                "WHERE co.campaign_id = ? AND p.is_active = 1;",
                (camp_id,)
            )
            offers = [dict(r) for r in cursor.fetchall()]
            if offers:
                context_parts.append("  * Offers & Today's Schemes:")
                for o in offers:
                    context_parts.append(
                        f"    - {o['product_name']}: {o['offer_label']}! Selling Price: ₹{o['selling_price']} (MRP: ₹{o['mrp']}). {o['description']}. Extra benefit: {o['extra_benefit'] or 'None'}"
                    )
            
            # Fetch active discount codes
            cursor.execute(
                "SELECT * FROM discount_codes WHERE campaign_id = ? AND is_active = 1;",
                (camp_id,)
            )
            codes = [dict(r) for r in cursor.fetchall()]
            if codes:
                context_parts.append("  * Promotional Promo/Discount Codes:")
                for c in codes:
                    benefit = f"{c['discount_pct']}% OFF" if c['discount_pct'] else f"₹{c['flat_off']} OFF"
                    context_parts.append(
                        f"    - Use Code: '{c['code']}' for {benefit} on orders above ₹{c['min_order_amt']}."
                    )
            context_parts.append("")
            
        conn.close()
        return "\n".join(context_parts).strip()
    except Exception as e:
        print(f"Error loading ecommerce_marketing.db: {e}")
        return ""



def resolve_all_db_paths(org_id: Optional[int] = None, category: Optional[str] = None, subcategory: Optional[str] = None) -> List[str]:
    db_paths = []
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    safe_org_id = org_id if org_id is not None else 0
    
    # 1. Custom category/subcategory folder
    dir_path = resolve_dynamic_dir(org_id, category, subcategory)
    if dir_path:
        for f in os.listdir(dir_path):
            if f.lower().endswith(".db"):
                p = os.path.join(dir_path, f)
                if p not in db_paths:
                    db_paths.append(p)
                        
    # 2. Marketing db path (only if it matches Ecommerce / Marketing Campaign)
    if category == "Ecommerce" and subcategory == "Marketing Campaign":
        m_path = resolve_marketing_db_path(org_id)
        if os.path.exists(m_path) and m_path not in db_paths:
            db_paths.append(m_path)
        
    # 3. Rhea db path (only if it matches Ecommerce / Project Overview)
    if category == "Ecommerce" and subcategory == "Project Overview":
        r_path = resolve_rhea_db_path(org_id, category, subcategory)
        if os.path.exists(r_path) and r_path not in db_paths:
            db_paths.append(r_path)
        
    return db_paths


def dynamic_customer_lookup(db_path: str, phone: str, name: Optional[str] = None) -> Optional[dict]:
    if not db_path or not os.path.exists(db_path):
        return None
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
        tables = [r[0] for r in cursor.fetchall()]
        
        digits = "".join(filter(str.isdigit, phone)) if phone else ""
        if len(digits) > 10:
            digits = digits[-10:]
            
        matched_row = None
        matched_table = None
        
        # Search tables for phone number
        for table in tables:
            cursor.execute(f'PRAGMA table_info("{table}");')
            columns = [r["name"] for r in cursor.fetchall()]
            
            phone_cols = [c for c in columns if any(p in c.lower() for p in ["phone", "mobile", "tel", "contact", "number"])]
            name_cols = [c for c in columns if any(n in c.lower() for n in ["name", "customer", "user", "client", "lead"])]
            
            rows = []
            if digits and phone_cols:
                for col in phone_cols:
                    cursor.execute(f'SELECT * FROM "{table}" WHERE "{col}" LIKE ? OR "{col}" LIKE ?', (f"%{digits}", f"%{phone}%"))
                    rows.extend(cursor.fetchall())
            
            if not rows and name and name_cols:
                for col in name_cols:
                    cursor.execute(f'SELECT * FROM "{table}" WHERE "{col}" LIKE ? OR ? LIKE "{col}"', (f"%{name}%", f"%{name}%"))
                    rows.extend(cursor.fetchall())
                    
            if rows:
                selected_row = rows[0]
                if name and len(rows) > 1 and name_cols:
                    name_norm = "".join(c for c in name.lower() if c.isalnum())
                    for r in rows:
                        for col in name_cols:
                            db_val = r[col]
                            if db_val:
                                db_norm = "".join(c for c in str(db_val).lower() if c.isalnum())
                                if db_norm == name_norm or db_norm in name_norm or name_norm in db_norm:
                                    selected_row = r
                                    break
                matched_row = dict(selected_row)
                matched_table = table
                break
                
        if not matched_row:
            conn.close()
            return None
            
        # Reconstruct fields dynamically from the matched row
        db_name = None
        db_phone = None
        db_city = None
        db_address = None
        
        for k, v in matched_row.items():
            k_lower = k.lower()
            if any(n in k_lower for n in ["name", "customer", "user", "client", "lead"]):
                db_name = v
            elif any(p in k_lower for p in ["phone", "mobile", "tel", "contact", "number"]):
                db_phone = v
            elif "city" in k_lower or "town" in k_lower or "region" in k_lower:
                db_city = v
            elif "address" in k_lower or "street" in k_lower or "location" in k_lower:
                db_address = v
                
        cust_id = matched_row.get("user_id") or matched_row.get("id") or matched_row.get("customer_id") or 1
        
        cust = {
            "id": cust_id,
            "name": db_name or name or "Customer",
            "phone": db_phone or phone,
            "city": db_city or "Unknown",
            "address": db_address or "Address Details",
            "type": "none",
            "items": [],
            "amount": 0.0,
            "status": "unknown",
            "issue": None,
            "discount_code": None
        }
        
        # Check other columns / tables for cart or order info dynamically
        for k, v in matched_row.items():
            k_lower = k.lower()
            if any(x in k_lower for x in ["product", "item", "purchase", "order"]):
                if v:
                    cust["items"] = [str(v)]
                    cust["type"] = "order"
            elif any(x in k_lower for x in ["amount", "price", "total", "cost"]):
                try:
                    cust["amount"] = float(v)
                except Exception:
                    pass
            elif "status" in k_lower:
                cust["status"] = str(v)
            elif any(x in k_lower for x in ["issue", "reason", "problem"]):
                cust["issue"] = str(v)
            elif "discount" in k_lower or "promo" in k_lower or "code" in k_lower:
                cust["discount_code"] = str(v)
                
        # Also check related tables
        related_ids = {}
        for k, v in matched_row.items():
            if k.lower().endswith("_id") and v is not None:
                related_ids[k.lower()] = v
                
        if related_ids:
            for table in tables:
                if table == matched_table:
                    continue
                cursor.execute(f'PRAGMA table_info("{table}");')
                col_names = [r["name"].lower() for r in cursor.fetchall()]
                matching_cols = [c for c in col_names if c in related_ids]
                if matching_cols:
                    for col in matching_cols:
                        cursor.execute(f'SELECT * FROM "{table}" WHERE "{col}" = ?', (related_ids[col],))
                        rows = cursor.fetchall()
                        if rows:
                            for r in rows:
                                r_dict = dict(r)
                                for rk, rv in r_dict.items():
                                    rk_lower = rk.lower()
                                    if any(x in rk_lower for x in ["product", "item"]):
                                        if rv and str(rv) not in cust["items"]:
                                            cust["items"].append(str(rv))
                                            cust["type"] = "order"
                                    elif any(x in rk_lower for x in ["amount", "price", "total", "cost"]) and not cust["amount"]:
                                        try:
                                            cust["amount"] += float(rv)
                                        except Exception:
                                            pass
                                    elif "status" in rk_lower and cust["status"] == "unknown":
                                        cust["status"] = str(rv)
                                    elif "address" in rk_lower and cust["address"] == "Address Details":
                                        cust["address"] = str(rv)
                                        
        conn.close()
        return cust
    except Exception as e:
        print(f"[Dynamic Lookup Error] Failed to search DB {db_path} dynamically: {e}")
        return None


def load_sqlite_database_context(db_path: str, lead_phone: Optional[str] = None, lead_name: Optional[str] = None) -> str:
    if not db_path or not os.path.exists(db_path):
        return ""

    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
        tables = [r[0] for r in cursor.fetchall()]

        phone_digits = "".join(filter(str.isdigit, lead_phone)) if lead_phone else ""
        if len(phone_digits) > 10:
            phone_digits = phone_digits[-10:]

        matched_ids: dict = {}
        matched_records: list = []
        catalog_parts: list = []

        # 1. Always load catalog/property/product tables in full (critical for Real Estate, retail, etc.)
        for table in tables:
            cursor.execute(f'PRAGMA table_info("{table}");')
            columns = [r["name"] for r in cursor.fetchall()]
            if not _is_catalog_table(table, columns):
                continue

            cursor.execute(f'SELECT * FROM "{table}" LIMIT 10;')
            rows = [dict(r) for r in cursor.fetchall()]
            if not rows:
                continue

            catalog_parts.append(f"### Property & Catalog Data: {table} ({len(rows)} records)")
            catalog_parts.append(
                "Use this table to answer questions about property names, addresses, zip codes, prices, "
                "bedrooms, locations, and listing details. Match caller questions to property_name or similar fields."
            )
            key_cols = _catalog_key_columns(columns)
            for row in rows:
                if key_cols:
                    row_str = " | ".join(
                        f"{c}: {row[c]}" for c in key_cols
                        if c in row.keys() and row[c] is not None and str(row[c]).strip()
                    )
                else:
                    row_str = ", ".join(
                        f"{k}: {v}" for k, v in row.items() if v is not None and str(v).strip()
                    )
                if row_str:
                    catalog_parts.append(f"- {row_str}")

        # 2. Search customer/lead tables by phone or name
        for table in tables:
            cursor.execute(f'PRAGMA table_info("{table}");')
            columns = [r["name"] for r in cursor.fetchall()]

            if _is_catalog_table(table, columns):
                continue

            phone_cols = [c for c in columns if any(p in c.lower() for p in ["phone", "mobile", "tel", "contact", "number"])]
            name_cols = [c for c in columns if any(n in c.lower() for n in ["name", "customer", "user", "client", "lead"])]

            rows = []
            if phone_digits and phone_cols:
                for col in phone_cols:
                    cursor.execute(
                        f'SELECT * FROM "{table}" WHERE "{col}" LIKE ? OR "{col}" LIKE ?',
                        (f"%{phone_digits}", f"%{lead_phone}%"),
                    )
                    rows.extend(cursor.fetchall())

            if not rows and lead_name and name_cols:
                for col in name_cols:
                    cursor.execute(
                        f'SELECT * FROM "{table}" WHERE "{col}" LIKE ? OR ? LIKE "{col}"',
                        (f"%{lead_name}%", f"%{lead_name}%"),
                    )
                    rows.extend(cursor.fetchall())

            if rows:
                for row in rows:
                    row_dict = dict(row)
                    if (table, row_dict) not in matched_records:
                        matched_records.append((table, row_dict))
                    for k, v in row_dict.items():
                        if k.lower().endswith("_id") and v is not None:
                            matched_ids.setdefault(k.lower(), set()).add(v)

        # 3. Follow foreign key-like IDs
        for _ in range(3):
            new_ids_found = False
            for table in tables:
                cursor.execute(f'PRAGMA table_info("{table}");')
                columns = [r["name"] for r in cursor.fetchall()]

                common_id_cols = [c for c in columns if c.lower() in matched_ids]
                if not common_id_cols:
                    continue

                for col in common_id_cols:
                    vals = list(matched_ids[col.lower()])
                    if not vals:
                        continue
                    placeholders = ",".join("?" for _ in vals)
                    cursor.execute(f'SELECT * FROM "{table}" WHERE "{col}" IN ({placeholders})', vals)
                    for row in cursor.fetchall():
                        row_dict = dict(row)
                        if (table, row_dict) not in matched_records:
                            matched_records.append((table, row_dict))
                            new_ids_found = True
                            for k, v in row_dict.items():
                                if k.lower().endswith("_id") and v is not None:
                                    if v not in matched_ids.setdefault(k.lower(), set()):
                                        matched_ids[k.lower()].add(v)
            if not new_ids_found:
                break

        context_parts: list = []
        if catalog_parts:
            context_parts.append("\n".join(catalog_parts))

        if matched_records:
            context_parts.append("### MATCHED CUSTOMER DATA FROM DATABASE")
            for table, record in matched_records:
                record_str = ", ".join(f"{k}: {v}" for k, v in record.items())
                context_parts.append(f"- Table '{table}': {record_str}")

        # 4. Other reference tables (non-PII, non-catalog)
        reference_parts = []
        for table in tables:
            cursor.execute(f'PRAGMA table_info("{table}");')
            columns = [r["name"] for r in cursor.fetchall()]

            if _is_catalog_table(table, columns):
                continue
            if any(table == t for t, _ in matched_records):
                continue
            if _is_customer_pii_table(table, columns):
                continue

            cursor.execute(f'SELECT * FROM "{table}" LIMIT 100;')
            rows = [dict(r) for r in cursor.fetchall()]
            if not rows:
                continue

            reference_parts.append(f"### Reference Table: {table}")
            for row in rows:
                row_str = ", ".join(f"{k}: {v}" for k, v in row.items())
                reference_parts.append(f"- {row_str}")

        conn.close()

        if reference_parts:
            context_parts.append("\n".join(reference_parts))

        result = "\n\n".join(context_parts).strip()
        if result:
            print(f"[DB Context] Loaded {len(result)} chars from {os.path.basename(db_path)}")
        else:
            print(f"[DB Context] WARNING: Empty context from {db_path} — check table schema")
        return result[:40000]
    except Exception as e:
        print(f"Error loading SQLite database {db_path} dynamically: {e}")
        return ""


def _is_catalog_table(table_name: str, columns: List[str]) -> bool:
    t = table_name.lower()
    catalog_names = (
        "propert", "product", "listing", "inventory", "catalog", "item", "unit",
        "project", "amenit", "house", "villa", "penthouse", "apartment", "bungalow",
    )
    if any(k in t for k in catalog_names):
        return True

    cols = [c.lower() for c in columns]
    catalog_signals = (
        "property_name", "zipcode", "zip_code", "bedrooms", "bathrooms",
        "listing_type", "area_sqft", "lot_size", "year_built", "sku", "product_name",
    )
    return sum(1 for sig in catalog_signals if any(sig in c for c in cols)) >= 2


def _is_customer_pii_table(table_name: str, columns: List[str]) -> bool:
    """Skip raw customer PII tables from generic reference dump (not catalog tables)."""
    if _is_catalog_table(table_name, columns):
        return False

    t = table_name.lower()
    if t in ("users", "customers", "leads", "contacts", "clients"):
        return True

    cols = [c.lower() for c in columns]
    has_phone = any(any(p in c for p in ["phone", "mobile", "tel"]) for c in cols)
    has_personal = any(any(p in c for p in ["email", "ssn", "password"]) for c in cols)
    return has_phone and has_personal


def _catalog_key_columns(columns: List[str]) -> List[str]:
    """Prefer voice-relevant columns to keep catalog context compact."""
    priority = (
        "property_name", "name", "title", "product_name", "sku",
        "address", "city", "state", "country", "zipcode", "zip_code",
        "price", "bedrooms", "bathrooms", "area_sqft", "listing_type",
        "status", "description", "property_type", "furnished",
    )
    cols_lower = {c.lower(): c for c in columns}
    selected = [cols_lower[p] for p in priority if p in cols_lower]
    return selected if selected else columns[:12]


def get_customer_details_from_rhea_db(
    phone_number: str, 
    org_id: Optional[int] = None, 
    category: Optional[str] = None, 
    subcategory: Optional[str] = None,
    lead_name: Optional[str] = None
) -> Optional[dict]:
    db_path = resolve_rhea_db_path(org_id, category, subcategory)
    if not os.path.exists(db_path):
        return None

    # Check if DB has legacy 'users' table
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users';")
        has_users = cursor.fetchone() is not None
        conn.close()
    except Exception:
        has_users = False

    if not has_users:
        return dynamic_customer_lookup(db_path, phone_number, lead_name)

    # Normalize phone number to last 10 digits
    digits = "".join(filter(str.isdigit, phone_number))
    if len(digits) > 10:
        digits = digits[-10:]
    if not digits:
        return None

    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Query users table
        cursor.execute("SELECT * FROM users WHERE phone = ? OR phone LIKE ?", (digits, f"%{digits}"))
        rows = cursor.fetchall()
        if not rows:
            conn.close()
            return None

        # Choose the user row. If multiple users have the same phone number, disambiguate using lead_name
        selected_row = rows[0]
        if lead_name and len(rows) > 1:
            lead_norm = "".join(c for c in lead_name.lower() if c.isalnum())
            for r in rows:
                db_name = r["name"]
                if db_name:
                    db_norm = "".join(c for c in db_name.lower() if c.isalnum())
                    if db_norm == lead_norm or db_norm in lead_norm or lead_norm in db_norm:
                        selected_row = r
                        break

        user_data = dict(selected_row)
        user_id = user_data.get("user_id")

        # Check cart table first
        cursor.execute(
            "SELECT cart.*, products.name as product_name, products.price FROM cart "
            "JOIN products ON cart.product_id = products.product_id WHERE cart.user_id = ?",
            (user_id,)
        )
        cart_rows = cursor.fetchall()
        
        if cart_rows:
            # User has items in cart -> Cart Recovery scenario
            items = [r["product_name"] for r in cart_rows]
            amount = sum(r["price"] * r["quantity"] for r in cart_rows)
            cust = {
                "id": user_id,
                "name": user_data.get("name"),
                "city": user_data.get("city"),
                "address": user_data.get("address"),
                "type": "cart",
                "items": items,
                "amount": amount,
                "status": "pending",
                "issue": "cart abandoned",
                "discount_code": None
            }
        else:
            # User has no cart items -> Check orders table
            cursor.execute(
                "SELECT * FROM orders WHERE user_id = ? ORDER BY placed_at DESC LIMIT 1",
                (user_id,)
            )
            order_row = cursor.fetchone()
            if order_row:
                order_data = dict(order_row)
                order_id = order_data.get("order_id")
                
                # Fetch order items
                cursor.execute("SELECT product_name FROM order_items WHERE order_id = ?", (order_id,))
                items = [r["product_name"] for r in cursor.fetchall()]
                
                # Check for delivery address in cod_confirmations
                cursor.execute("SELECT delivery_address FROM cod_confirmations WHERE order_id = ?", (order_id,))
                cod_row = cursor.fetchone()
                address = cod_row["delivery_address"] if cod_row else user_data.get("address")
                
                cust = {
                    "id": user_id,
                    "name": user_data.get("name"),
                    "city": user_data.get("city"),
                    "address": address,
                    "type": "order",
                    "items": items,
                    "amount": order_data.get("total"),
                    "status": order_data.get("status"),
                    "issue": order_data.get("issue"),
                    "discount_code": order_data.get("discount_code")
                }
            else:
                cust = {
                    "id": user_id,
                    "name": user_data.get("name"),
                    "city": user_data.get("city"),
                    "address": user_data.get("address"),
                    "type": "none",
                    "items": [],
                    "amount": 0,
                    "status": "unknown",
                    "issue": None,
                    "discount_code": None
                }
        conn.close()
        return cust
    except Exception as e:
        print(f"Error reading DB at {db_path}: {e}")
        return None


def get_customer_details_by_name(
    name: str, 
    org_id: Optional[int] = None, 
    category: Optional[str] = None, 
    subcategory: Optional[str] = None
) -> Optional[dict]:
    db_path = resolve_rhea_db_path(org_id, category, subcategory)
    if not os.path.exists(db_path):
        return None

    # Check if DB has legacy 'users' table
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users';")
        has_users = cursor.fetchone() is not None
        conn.close()
    except Exception:
        has_users = False

    if not has_users:
        return dynamic_customer_lookup(db_path, "", name)

    clean_name = name.strip()
    if not clean_name:
        return None

    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        # Query users table by name
        cursor.execute("SELECT * FROM users WHERE name = ? OR name LIKE ?", (clean_name, f"%{clean_name}%"))
        row = cursor.fetchone()
        if not row:
            # Try matching parts of the name
            parts = [p for p in clean_name.split() if len(p) > 2]
            found = False
            for p in parts:
                cursor.execute("SELECT * FROM users WHERE name LIKE ?", (f"%{p}%",))
                row = cursor.fetchone()
                if row:
                    found = True
                    break
            if not found:
                conn.close()
                return None

        user_data = dict(row)
        user_id = user_data.get("user_id")

        # Check cart table first
        cursor.execute(
            "SELECT cart.*, products.name as product_name, products.price FROM cart "
            "JOIN products ON cart.product_id = products.product_id WHERE cart.user_id = ?",
            (user_id,)
        )
        cart_rows = cursor.fetchall()
        
        if cart_rows:
            # User has items in cart -> Cart Recovery scenario
            items = [r["product_name"] for r in cart_rows]
            amount = sum(r["price"] * r["quantity"] for r in cart_rows)
            cust = {
                "id": user_id,
                "name": user_data.get("name"),
                "city": user_data.get("city"),
                "address": user_data.get("address"),
                "type": "cart",
                "items": items,
                "amount": amount,
                "status": "pending",
                "issue": "cart abandoned",
                "discount_code": None
            }
        else:
            # User has no cart items -> Check orders table
            cursor.execute(
                "SELECT * FROM orders WHERE user_id = ? ORDER BY placed_at DESC LIMIT 1",
                (user_id,)
            )
            order_row = cursor.fetchone()
            if order_row:
                order_data = dict(order_row)
                order_id = order_data.get("order_id")
                
                # Fetch order items
                cursor.execute("SELECT product_name FROM order_items WHERE order_id = ?", (order_id,))
                items = [r["product_name"] for r in cursor.fetchall()]
                
                # Check for delivery address in cod_confirmations
                cursor.execute("SELECT delivery_address FROM cod_confirmations WHERE order_id = ?", (order_id,))
                cod_row = cursor.fetchone()
                address = cod_row["delivery_address"] if cod_row else user_data.get("address")
                
                cust = {
                    "id": user_id,
                    "name": user_data.get("name"),
                    "city": user_data.get("city"),
                    "address": address,
                    "type": "order",
                    "items": items,
                    "amount": order_data.get("total"),
                    "status": order_data.get("status"),
                    "issue": order_data.get("issue"),
                    "discount_code": order_data.get("discount_code")
                }
            else:
                cust = {
                    "id": user_id,
                    "name": user_data.get("name"),
                    "city": user_data.get("city"),
                    "address": user_data.get("address"),
                    "type": "none",
                    "items": [],
                    "amount": 0,
                    "status": "unknown",
                    "issue": None,
                    "discount_code": None
                }
        conn.close()
        return cust
    except Exception as e:
        print(f"Error reading DB by name at {db_path}: {e}")
        return None


def get_customer_name_from_rhea_db(
    phone_number: str, 
    org_id: Optional[int] = None, 
    category: Optional[str] = None, 
    subcategory: Optional[str] = None,
    lead_name: Optional[str] = None
) -> Optional[str]:
    cust = get_customer_details_from_rhea_db(phone_number, org_id, category, subcategory, lead_name)
    return cust.get("name") if cust else None


def resolve_gemini_voice(agent: Optional[Agent]) -> str:
    if not agent:
        return "Kore"
    voice_id = (agent.voice_id or "").strip()
    voice_lower = voice_id.lower()
    category = (agent.category or "").strip().lower()
    
    # 1. If explicitly requesting one of the prebuilt Gemini voices
    valid_gemini_voices = {"Aoede", "Charon", "Kore", "Fenrir", "Puck", "Leda", "Achird", "Zephyr", "Zepghyre"}
    # Normalize cases for exact voice match if it's a known voice name
    for v in valid_gemini_voices:
        if voice_lower == v.lower():
            return "Zephyr" if v == "Zepghyre" else v

    # 2. Determine gender from voice_id
    is_male = False
    is_female = False
    female_voice_names = {
        "female", "woman", "sarah", "kore", "aoede", "leda", "katie", 
        "gemma", "skylar", "raveena", "ananya", "priya", "kavita", "sneha", "diya",
        "zephyr", "zepghyre", "zara"
    }
    male_voice_names = {
        "male", "arvind", "daniel", "fenrir", "puck", "charon", "corey", 
        "archie", "achird", "amit", "rohan", "rahul", "vikram", "kabir", "dev"
    }
    
    if any(name in voice_lower for name in female_voice_names):
        is_female = True
    if any(name in voice_lower for name in male_voice_names):
        if "female" not in voice_lower:
            is_male = True

    # If neither is matched, default to female (or check language defaults)
    if not is_male and not is_female:
        # Default based on voice_lower mapping if present in GEMINI_VOICE_MAP
        if voice_lower in GEMINI_VOICE_MAP:
            mapped = GEMINI_VOICE_MAP[voice_lower]
            if mapped in ["Charon", "Fenrir", "Puck", "Achird"]:
                is_male = True
            else:
                is_female = True
        else:
            is_female = True

    # 3. Apply category-specific voice mapping
    if "healthcare" in category:
        return "Puck" if is_male else "Leda"
    elif "finance" in category:
        return "Achird" if is_male else "Kore"
    elif "sales" in category or "salles" in category:
        return "Puck" if is_male else "Zephyr"
    elif "ecommerce" in category or "customer" in category or "support" in category:
        return "Charon" if is_male else "Kore"
    
    # 4. Fallback if no specific category matched
    if is_male:
        return "Charon"
    else:
        return "Kore"


def load_kb_content(db: Session, agent: Agent, lead: Optional[Lead] = None) -> Tuple[str, List[str]]:
    """Load knowledge-base context for call RAG using vector retrieval + fallback."""
    from app.services.rag_service import load_kb_content_rag

    org_id = None
    if agent and agent.team and agent.team.organization_id:
        org_id = agent.team.organization_id
    return load_kb_content_rag(db, agent, lead, max_chars=MAX_KB_CHARS, org_id=org_id)


def get_campaign_for_lead(db: Session, lead: Optional[Lead]) -> Optional[Campaign]:
    if not lead or not lead.campaign_id:
        return None
    return db.query(Campaign).filter(Campaign.id == lead.campaign_id).first()


RHEA_ECOMMERCE_LANG_MAP = {
    "HINDI": {
        "mismatch": "माफ़ कीजियेगा, मुझे इस बारे में कोई जानकारी नहीं है।",
        "cart": "नमस्ते {name}। मुझे आपके कार्ट में {items} दिख रहे हैं जो अभी पेंडिंग हैं। आप अपनी खरीदारी कब तक पूरी करना चाहेंगे?",
        "order": "नमस्ते {name}। आपका कैश ऑन डिलीवरी का ऑर्डर {status} हो गया है। क्या यह डिलीवरी का पता सही है ताकि हम इसे रवाना कर सकें?",
        "marketing": "नमस्ते {name}। हमारे पास आज आपके लिए कुछ बेहतरीन ऑफर्स हैं। क्या आप हमारी नई डील्स के बारे में जानना चाहेंगे?",
        "fallback": "नमस्ते {name}।",
        "mismatch_prompt": "आप इस कॉलर को नहीं जानते हैं। कॉलर के विवरण या नाम आपके डेटाबेस रिकॉर्ड से मेल नहीं खाते हैं। आपको केवल और केवल यही उत्तर देना होगा: 'माफ़ कीजियेगा, मुझे इस बारे में कोई जानकारी नहीं है।' किसी भी प्रश्न का उत्तर न दें, कोई छूट न दें, किसी पते की पुष्टि न करें और किसी अन्य विषय पर बात न करें।"
    },
    "GUJARATI": {
        "mismatch": "માફ કરશો, મને આ વિશે કોઈ માહિતી નથી.",
        "cart": "નમસ્તે {name}. તમારા કાર્ટમાં {items} બાકી હોવાનું જણાય છે. તમે આ ખરીદી ક્યારે પૂર્ણ કરવા ઈચ્છો છો?",
        "order": "નમસ્તે {name}. તમારો કેશ ઓન ડિલિવરી ઓર્ડર {status} થઈ ગયો છે. શું આ ડિલિવરી સરનામું સાચું છે જેથી અમે ઓર્ડર મોકલી શકીએ?",
        "marketing": "નમસ્તે {name}. અમારી પાસે આજે તમારા માટે કેટલીક રોમાંચક ઑફર્સ છે. શું તમે અમારી લેટેસ્ટ ઑફર્સ વિશે જાણવા માંગો છો?",
        "fallback": "નમસ્તે {name}.",
        "mismatch_prompt": "તમે આ કોલરને ઓળખતા નથી. કોલરની વિગતો અથવા નામ તમારા ડેટાબેઝ રેકોર્ડ સાથે મેળ ખાતા નથી. તમારે ફક્ત અને ફક્ત આ જ જવાબ આપવો જ પડશે: 'માફ કરશો, મને આ વિશે કોઈ માહિતી નથી.' કોઈ પ્રશ્નોના જવાબ ન આપો, કોઈ ડિસ્કાઉન્ટ ન આપો, કોઈ સરનામાની પુષ્ટિ ન કરો અને કોઈ અન્ય બાબત વિશે વાત ન કરો."
    },
    "SPANISH": {
        "mismatch": "Disculpe, no tengo información sobre eso.",
        "cart": "Hola, {name}. Veo que tiene un carrito pendiente con {items}. ¿Cuándo le gustaría completar su compra?",
        "order": "Hola, {name}. Su pedido con pago contra entrega está en estado {status}. ¿Es correcta esta dirección de envío para que podamos realizar el despacho?",
        "marketing": "Hola {name}. Tenemos excelentes ofertas para usted hoy. ¿Le gustaría conocer nuestras últimas promociones?",
        "fallback": "Hola, {name}.",
        "mismatch_prompt": "No conoces a esta persona. Los detalles o el nombre del llamador no coinciden con los registros de tu base de datos. DEBES responder ÚNICAMENTE con exactamente: 'Disculpe, no tengo información sobre eso.' No respondas ninguna pregunta, no ofrezcas descuentos, no confirmes direcciones y no hables de nada más."
    },
    "BENGALI": {
        "mismatch": "দুঃখিত, এই বিষয়ে আমার কাছে কোনো তথ্য নেই।",
        "cart": "নমস্কার {name}। আপনার কার্টে {items} অমীমাংসিত রয়েছে। আপনি কখন কেনাকাটা শেষ করতে পারবেন?",
        "order": "নমস্কার {name}। ক্যাশ অন ডেলিভারির জন্য আপনার অর্ডারের স্ট্যাটাস {status} হয়েছে। এই শিপিং ঠিকানাটি কি সঠিক যাতে আমরা এটি পাঠাতে পারি?",
        "marketing": "নমস্কার {name}। আমাদের কাছে আজ আপনার জন্য কিছু দুর্দান্ত অফার রয়েছে। আপনি কি আমাদের সর্বশেষ ডিল সম্পর্কে জানতে চান?",
        "fallback": "নমস্কার {name}।",
        "mismatch_prompt": "আপনি এই কলারকে চেনেন না। কলারের বিবরণ বা নাম আপনার ডাটাবেস রেকর্ডের সাথে মেলে না। আপনাকে অবশ্যই এবং শুধুমাত্র প্রতিক্রিয়া জানাতে হবে: 'দুঃখিত, এই বিষয়ে আমার কাছে কোনো তথ্য নেই।' কোনো প্রশ্নের উত্তর দেবেন না, কোনো ডিসকাউন্ট দেবেন না, কোনো ঠিকানা নিশ্চিত করবেন না এবং অন্য কোনো বিষয়ে কথা বলবেন না."
    },
    "TAMIL": {
        "mismatch": "மன்னிக்கவும், இது குறித்த விவரங்கள் என்னிடம் இல்லை.",
        "cart": "வணக்கம் {name}. உங்கள் கார்ட்டில் {items} நிலுவையில் இருப்பதைக் காண்கிறேன். நீங்கள் எப்போது வாங்குதலை முடிக்க விரும்புகிறீர்கள்?",
        "order": "வணக்கம் {name}. கேஷ் ஆன் டெலிவரிக்கான உங்கள் ஆர்டர் நிலை {status} ஆக உள்ளது. நாங்கள் அனுப்ப இந்த ஷிப்பிங் முகவரி சரியானதா?",
        "marketing": "வணக்கம் {name}. இன்று உங்களுக்காக சில அற்புதமான சலுகைகள் எங்களிடம் உள்ளன. எங்களின் சமீபத்திய டீல்களைப் பற்றி அறிய விரும்புகிறீர்களா?",
        "fallback": "வணக்கம் {name}.",
        "mismatch_prompt": "இந்த அழைப்பாளரை உங்களுக்குத் தெரியாது. அழைப்பாளரின் விவரங்கள் அல்லது பெயர் உங்கள் தரவுத்தள பதிவுகளுடன் பொருந்தவில்லை. நீங்கள் கண்டிப்பாக இதனுடன் மட்டுமே பதிலளிக்க வேண்டும்: 'மன்னிக்கவும், இது குறித்த விவரங்கள் என்னிடம் இல்லை.' எந்தக் கேள்விக்கும் பதிலளிக்க வேண்டாம், தள்ளுபடிகள் எதையும் வழங்க வேண்டாம், முகவரிகள் எதையும் உறுதிப்படுத்த வேண்டாம் மற்றும் வேறு எதையும் பற்றி பேச வேண்டாம்."
    },
    "TELUGU": {
        "mismatch": "క్షమించండి, ఈ సమాచారం నా దగ్గర లేదు.",
        "cart": "నమస్తే {name}. మీ కార్ట్‌లో {items} పెండింగ్‌లో ఉన్నట్లు కనిపిస్తోంది. మీరు కొనుగోలును ఎప్పుడు పూర్తి చేయాలనుకుంటున్నారు?",
        "order": "నమస్తే {name}. క్యాష్ ఆన్ డెలివరీ కోసం మీ ఆర్డర్ స్థితి {status} గా ఉంది. మేము పంపడానికి ఈ షిప్పింగ్ చిరునామా సరైనదేనా?",
        "marketing": "నమస్తే {name}. ఈరోజు మీకోసం కొన్ని అద్భుతమైన ఆఫర్‌లు ఉన్నాయి. మా తాజా డీల్స్ గురించి తెలుసుకోవాలనుకుంటున్నారా?",
        "fallback": "నమస్తే {name}.",
        "mismatch_prompt": "ఈ కాలర్ మీకు తెలియదు. కాలర్ వివరాలు లేదా పేరు మీ డేటాబేస్ రికార్డులతో సరిపోలడం లేదు. మీరు ఖచ్చితంగా దీనితో మాత్రమే స్పందించాలి: 'క్షమించండి, ఈ సమాచారం నా దగ్గర లేదు.' ఏ ప్రశ్నలకూ సమాధానం ఇవ్వకండి, ఎటువంటి డిస్కౌంట్‌లను అందించకండి, ఏ చిరునామాలను నిర్ధారించకండి మరియు మరే ఇతర విషయాల గురించి మాట్లాడకండి."
    },
    "KANNADA": {
        "mismatch": "ಕ್ಷಮಿಸಿ, ಈ ಬಗ್ಗೆ ನನ್ನಲ್ಲಿ ಯಾವುದೇ ಮಾಹಿತಿ ಇಲ್ಲ.",
        "cart": "ನಮಸ್ತೆ {name}. ನಿಮ್ಮ ಕಾರ್ಟ್‌ನಲ್ಲಿ {items} ಬಾಕಿ ಉಳಿದಿರುವುದು ಕಂಡುಬರುತ್ತಿದೆ. ನೀವು ಖರೀದಿಯನ್ನು ಯಾವಾಗ ಪೂರ್ಣಗೊಳಿಸಲು ಬಯಸುತ್ತೀರಿ?",
        "order": "ನಮಸ್ತೆ {name}. ಕ್ಯಾಶ್ ಆನ್ ಡೆಲಿವರಿಗಾಗಿ ನಿಮ್ಮ ಆರ್ಡರ್ ಸ್ಥಿತಿ {status} ಆಗಿದೆ. ನಾವು ರವಾನಿಸಲು ಈ ಶಿಪ್ಪಿಂಗ್ ವಿಳಾಸ ಸರಿಯಾಗಿದೆಯೇ?",
        "marketing": "ನಮಸ್ತೆ {name}. ಇಂದು ನಿಮಗಾಗಿ ಕೆಲವು ಅತ್ಯಾಕರ್ಷಕ ಆಫರ್‌ಗಳು ನಮ್ಮಲ್ಲಿವೆ. ನಮ್ಮ ಇತ್ತೀಚಿನ ಕೊಡುಗೆಗಳ ಬಗ್ಗೆ ತಿಳಿಯಲು ಬಯಸುವಿರಾ?",
        "fallback": "ನಮಸ್ತೆ {name}.",
        "mismatch_prompt": "ಈ ಕಾಲರ್ ಯಾರೆಂದು ನಿಮಗೆ ತಿಳಿದಿಲ್ಲ. ಕಾಲರ್‌ನ ವಿವರಗಳು ಅಥವಾ ಹೆಸರು ನಿಮ್ಮ ಡೇಟಾಬೇಸ್ ದಾಖಲೆಗಳಿಗೆ ಹೊಂದಿಕೆಯಾಗುತ್ತಿಲ್ಲ. ನೀವು ಕೇವಲ ಮತ್ತು ನಿಖರವಾಗಿ ಹೀಗೆ ಪ್ರತಿಕ್ರಿಯಿಸಬೇಕು: 'ಕ್ಷಮಿಸಿ, ಈ ಬಗ್ಗೆ ನನ್ನಲ್ಲಿ ಯಾವುದೇ ಮಾಹಿತಿ ಇಲ್ಲ.' ಯಾವುದೇ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಬೇಡಿ, ಯಾವುದೇ ರಿಯಾಯಿತಿಗಳನ್ನು ನೀಡಬೇಡಿ, ಯಾವುದೇ ವಿಳಾಸಗಳನ್ನು ಖಚಿತಪಡಿಸಬೇಡಿ ಮತ್ತು ಬೇರೆ ಯಾವುದರ ಬಗ್ಗೆಯೂ ಮಾತನಾಡಬೇಡಿ."
    },
    "MALAYALAM": {
        "mismatch": "ക്ഷമിക്കണം, ഈ വിവരങ്ങൾ എന്റെ പക്കലില്ല.",
        "cart": "നമസ്കാരം {name}. നിങ്ങളുടെ കാർട്ടിൽ {items} ബാക്കിയുള്ളതായി കാണുന്നു. നിങ്ങൾ എപ്പോഴാണ് വാങ്ങൽ പൂർത്തിയാക്കാൻ ആഗ്രഹിക്കുന്നത്?",
        "order": "നമസ്കാരം {name}. ക്യാഷ് ഓൺ ഡെലിവറിക്ക് നിങ്ങളുടെ ഓർഡർ നില {status} ആണ്. ഞങ്ങൾക്ക് അയക്കാൻ ഈ ഷിപ്പിംഗ് വിലാസം ശരിയാണോ?",
        "fallback": "നമസ്കാരം {name}.",
        "mismatch_prompt": "ഈ വിളിക്കുന്നയാളെ നിങ്ങൾക്ക് അറിയില്ല. വിളിക്കുന്നയാളുടെ വിവരങ്ങളോ പേരോ നിങ്ങളുടെ ഡാറ്റാബേസ് റെക്കോർഡുകളുമായി പൊരുത്തപ്പെടുന്നില്ല. നിങ്ങൾ കൃത്യമായി ഇതിനോട് മാത്രമേ പ്രതികരിക്കാവൂ: 'ക്ഷമിക്കണം, ഈ വിവരങ്ങൾ എന്റെ പക്കലില്ല.' ചോദ്യങ്ങൾക്ക് ഉത്തരം നൽകരുത്, ഡിസ്കൗണ്ടുകൾ നൽകരുത്, വിലാസങ്ങൾ സ്ഥിരീകരിക്കരുത്, മറ്റൊന്നിനെക്കുറിച്ചും സംസാരിക്കരുത്."
    },
    "MARATHI": {
        "mismatch": "माफ करा, याबद्दल माझ्याकडे कोणतीही माहिती नाही.",
        "cart": "नमस्कार {name}। तुमच्या कार्टमध्ये {items} प्रलंबित असल्याचे दिसत आहे. तुम्ही खरेदी कधी पूर्ण करू इच्छिता?",
        "order": "नमस्कार {name}। कॅश ऑन डिलिव्हरीसाठी तुमच्या ऑर्डरची स्थिती {status} आहे. आम्ही पाठवू शकू म्हणून हा शिपिंग पत्ता बरोबर आहे का?",
        "fallback": "नमस्कार {name}।",
        "mismatch_prompt": "तुम्ही या कॉलरला ओळखत नाही. कॉलरचे तपशील किंवा नाव तुमच्या डेटाबेस रेकॉर्डशी जुळत नाही. तुम्ही फक्त आणि नेमके याच शब्दांत उत्तर दिले पाहिजे: 'माफ करा, याबद्दल माझ्याकडे कोणतीही माहिती नाही.' कोणत्याही प्रश्नांची उत्तरे देऊ नका, कोणतीही सूट देऊ नका, कोणत्याही पत्त्याची पुष्टी करू नका आणि इतर कोणत्याही गोष्टीबद्दल बोलू नका."
    },
    "PUNJABI": {
        "mismatch": "ਮਾਫ਼ ਕਰਨਾ, ਇਸ ਬਾਰੇ ਮੇਰੇ ਕੋਲ ਕੋਈ ਜਾਣਕਾਰੀ ਨਹੀਂ ਹੈ।",
        "cart": "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ {name}। ਤੁਹਾਡੇ ਕਾਰਟ ਵਿੱਚ {items} ਪੈਂਡਿੰਗ ਹੋਣ ਦੀ ਜਾਣਕਾਰੀ ਮਿਲੀ ਹੈ। ਤੁਸੀਂ ਖਰੀਦਦਾਰੀ ਕਦੋਂ ਪੂਰੀ ਕਰਨਾ ਚਾਹੋਗੇ?",
        "order": "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ {name}। ਕੈਸ਼ ਆਨ ਡਿਲੀਵਰੀ ਲਈ ਤੁਹਾਡੇ ਆਰਡਰ ਦੀ ਸਥਿતી {status} ਹੈ। ਕੀ ਇਹ ਸਹੀ ਹੈ ਤਾਂ ਜੋ ਅਸੀਂ ਇੱਥੋਂ ਭੇਜ ਸਕੀਏ?",
        "fallback": "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ {name}।",
        "mismatch_prompt": "ਤੁਸੀਂ ਇਸ ਕਾਲਰ ਨੂੰ ਨਹੀਂ ਜਾਣਦੇ ਹੋ। ਕਾਲਰ ਦੇ ਵੇਰਵੇ ਜਾਂ ਨਾਮ ਤੁਹਾਡੇ ਡੇਟਾਬੇਸ ਰਿਕਾਰਡ ਨਾਲ ਮੇਲ ਨਹੀਂ ਖਾਂਦੇ। ਤੁਹਾਨੂੰ ਸਿਰਫ ਅਤੇ ਸਿਰਫ ਇਹ ਜਵਾਬ ਦੇਣਾ ਚਾਹੀਦਾ ਹੈ: 'ਮਾਫ਼ ਕਰਨਾ, ਇਸ ਬਾਰੇ ਮੇਰੇ ਕੋਲ ਕੋਈ ਜਾਣਕਾਰੀ ਨਹੀਂ ਹੈ।' ਕਿਸੇ ਵੀ ਸਵਾਲ ਦਾ ਜਵਾਬ ਨਾ ਦਿਓ, ਕੋਈ ਛੋਟ ਨਾ ਦਿਓ, ਕਿਸੇ ਪਤੇ ਦੀ ਪੁਸ਼ਟੀ ਨਾ ਕਰੋ ਅਤੇ ਕਿਸੇ ਹੋਰ ਵਿਸ਼ੇ ਬਾਰੇ ਗੱલ ਨਾ ਕਰੋ।"
    },
    "ENGLISH": {
        "mismatch": "I am sorry, I don't have information about that.",
        "cart": "Hello {name}. I see that you have some items left in your cart, including {items}. When would you like to complete your purchase?",
        "order": "Hello {name}. I see that your order status is {status} for Cash on Delivery. Is this shipping address correct so we can dispatch it for you?",
        "fallback": "Hello {name}.",
        "mismatch_prompt": "You do not know this caller. The caller's details or name do not match your database records. You MUST ONLY respond with exactly: 'I am sorry, I don't have information about that.' Do not answer any questions, do not offer any discounts, do not confirm any addresses, and do not speak about anything else."
    }
}


def translate_status(status: str, lang: str) -> str:
    status_lower = (status or "").lower()
    lang_upper = (lang or "").upper()
    
    maps = {
        "HINDI": {"placed": "कन्फर्म", "pending": "पेंडिंग", "shipped": "रवाना", "delivered": "डिलीवर"},
        "GUJARATI": {"placed": "કન્ફર્મ", "pending": "પેન્ડિંગ", "shipped": "રવાના", "delivered": "ડિલિવર"},
        "SPANISH": {"placed": "confirmado", "pending": "pendiente", "shipped": "enviado", "delivered": "entregado"},
        "BENGALI": {"placed": "কনফার্ম", "pending": "পেন্ডিং", "shipped": "পাঠানো", "delivered": "ডেলিভার"},
        "TAMIL": {"placed": "உறுதிசெய்யப்பட்டது", "pending": "நிலுவையில் உள்ளது", "shipped": "அனுப்பப்பட்டது", "delivered": "வழங்கப்பட்டது"},
        "TELUGU": {"placed": "కన్ఫర్మ్", "pending": "పెండింగ్", "shipped": "పంపబడింది", "delivered": "పంపిణీ చేయబడింది"},
        "KANNADA": {"placed": "ಖಚಿತಪಡಿಸಲಾಗಿದೆ", "pending": "ಬಾಕಿ ಇದೆ", "shipped": "ರವಾನಿಸಲಾಗಿದೆ", "delivered": "ತಲುಪಿಸಲಾಗಿದೆ"},
        "MALAYALAM": {"placed": "സ്ഥിരീകരിച്ചു", "pending": "തീർപ്പുകൽപ്പിക്കാത്തത്", "shipped": "അയച്ചു", "delivered": "ഡെലിവർ ചെയ്തു"},
        "MARATHI": {"placed": "कन्फर्म", "pending": "पेंडिंग", "shipped": "पाठवले", "delivered": "वितरित"},
        "PUNJABI": {"placed": "ਕਨਫਰਮ", "pending": "ਪੈਂਡਿੰગ", "shipped": "ਭੇਜ ਦਿੱਤਾ", "delivered": "ਪਹੁੰਚਾ ਦਿੱਤਾ"},
    }
    
    for k in maps:
        if k in lang_upper:
            return maps[k].get(status_lower, status)
            
    return status


def resolve_ecommerce_greeting(rhea_cust: Optional[dict], lead_name: str, lang: str, subcategory: Optional[str] = None) -> str:
    lang_upper = (lang or "").upper()
    
    tpl = None
    for k in RHEA_ECOMMERCE_LANG_MAP:
        if k in lang_upper:
            tpl = RHEA_ECOMMERCE_LANG_MAP[k]
            break
    if not tpl:
        tpl = RHEA_ECOMMERCE_LANG_MAP["ENGLISH"]
        
    subcat_lower = (subcategory or "").strip().lower() if subcategory else ""
    is_marketing = "marketing" in subcat_lower or "salles" in subcat_lower or "sales" in subcat_lower
    
    if is_marketing:
        db_name = rhea_cust.get("name") if rhea_cust else lead_name
        return tpl["marketing"].format(name=db_name)

    if not rhea_cust:
        return tpl["mismatch"]
        
    db_name = rhea_cust.get("name") or lead_name
    cust_type = rhea_cust.get("type")
    
    # Check if subcategory is Marketing Campaign or Sales/Salles
    subcat_lower = (subcategory or "").strip().lower()
    is_marketing = "marketing" in subcat_lower or "salles" in subcat_lower or "sales" in subcat_lower
    
    if is_marketing:
        # Resolve using marketing greeting template
        return tpl["marketing"].format(name=db_name)
        
    if cust_type == "cart":
        items_str = ", ".join(rhea_cust.get("items", [])) if rhea_cust.get("items") else "items"
        return tpl["cart"].format(name=db_name, items=items_str)
    elif cust_type == "order":
        raw_status = rhea_cust.get("status") or "placed"
        status_translated = translate_status(raw_status, lang)
        return tpl["order"].format(name=db_name, status=status_translated)
    else:
        return tpl["fallback"].format(name=db_name)


def resolve_mismatch_prompt(lang: str) -> str:
    lang_upper = (lang or "").upper()
    for k in RHEA_ECOMMERCE_LANG_MAP:
        if k in lang_upper:
            return RHEA_ECOMMERCE_LANG_MAP[k]["mismatch_prompt"]
    return RHEA_ECOMMERCE_LANG_MAP["ENGLISH"]["mismatch_prompt"]


def get_standard_greeting_text(customer_name: str, lang_upper: str) -> str:
    if "HINDI" in lang_upper:
        if customer_name:
            return f"नमस्ते {customer_name}।"
        else:
            return "नमस्ते।"
    elif "BENGALI" in lang_upper:
        if customer_name:
            return f"নমস্কার {customer_name}।"
        else:
            return "নমস্কার।"
    elif "TAMIL" in lang_upper:
        if customer_name:
            return f"வணக்கம் {customer_name}."
        else:
            return "வணக்கம்."
    elif "TELUGU" in lang_upper:
        if customer_name:
            return f"నమస్తే {customer_name}."
        else:
            return "నమస్తే."
    elif "GUJARATI" in lang_upper:
        if customer_name:
            return f"નમસ્તે {customer_name}."
        else:
            return "નમસ્તે."
    elif "KANNADA" in lang_upper:
        if customer_name:
            return f"ನಮಸ್ತೆ {customer_name}."
        else:
            return "ನಮಸ್ತೆ."
    elif "MALAYALAM" in lang_upper:
        if customer_name:
            return f"നമസ്കാരം {customer_name}."
        else:
            return "നമസ്കാരം."
    elif "MARATHI" in lang_upper:
        if customer_name:
            return f"नमस्कार {customer_name}।"
        else:
            return "नमस्कार।"
    elif "PUNJABI" in lang_upper:
        if customer_name:
            return f"ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ {customer_name}।"
        else:
            return "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ।"
    elif "SPANISH" in lang_upper:
        if customer_name:
            return f"Hola {customer_name}."
        else:
            return "Hola."
    else: # Default English
        if customer_name:
            return f"Hello {customer_name}."
        else:
            return "Hello."


def get_personalized_greeting(agent: Optional[Agent], lead: Optional[Lead], org_id: Optional[int] = None) -> Tuple[str, str, str]:
    if not agent:
        return "Hello.", "en-IN", "Polly.Raveena"
        
    lang_upper = (agent.lang or "ENGLISH").upper()
    customer_name = (lead.name or "").strip() if lead else ""
    
    category = agent.category
    subcategory = agent.subcategory

    # Resolve org_id self-healingly from agent if not passed
    if org_id is None and agent.team:
        org_id = agent.team.organization_id

    db_path = resolve_rhea_db_path(org_id, category, subcategory)
    db_exists = db_path is not None and os.path.exists(db_path)

    # Check if we can get a matching name from the resolved db path
    if db_exists and lead and lead.phone_number:
        rhea_name = get_customer_name_from_rhea_db(
            lead.phone_number, 
            org_id, 
            category, 
            subcategory, 
            lead_name=customer_name
        )
        if rhea_name:
            customer_name = rhea_name

    voice_lower = (agent.voice_id or "").strip().lower()
    
    # Check if voice choice is male
    is_male = "male" in voice_lower or "arvind" in voice_lower or "daniel" in voice_lower or "fenrir" in voice_lower or "puck" in voice_lower or "charon" in voice_lower or "corey" in voice_lower or "archie" in voice_lower
    
    if "HINDI" in lang_upper:
        plivo_lang = "hi-IN"
        plivo_voice = "Polly.Arvind" if is_male else "Polly.Aditi"
    elif "BENGALI" in lang_upper:
        plivo_lang = "bn-IN"
        plivo_voice = "Polly.Kanishk" if is_male else "Polly.Standard"
    elif "TAMIL" in lang_upper:
        plivo_lang = "ta-IN"
        plivo_voice = "Polly.Standard"
    elif "TELUGU" in lang_upper:
        plivo_lang = "te-IN"
        plivo_voice = "Polly.Standard"
    elif "GUJARATI" in lang_upper:
        plivo_lang = "gu-IN"
        plivo_voice = "Polly.Dhwani" if is_male else "Polly.Standard"
    elif "KANNADA" in lang_upper:
        plivo_lang = "kn-IN"
        plivo_voice = "Polly.Standard"
    elif "MALAYALAM" in lang_upper:
        plivo_lang = "ml-IN"
        plivo_voice = "Polly.Standard"
    elif "MARATHI" in lang_upper:
        plivo_lang = "mr-IN"
        plivo_voice = "Polly.Standard"
    elif "PUNJABI" in lang_upper:
        plivo_lang = "pa-IN"
        plivo_voice = "Polly.Standard"
    elif "SPANISH" in lang_upper:
        plivo_lang = "es-MX"
        plivo_voice = "Polly.Enrique" if is_male else "Polly.Mia"
    else: # Default English
        plivo_lang = "en-IN"
        plivo_voice = "Polly.Kanishk" if is_male else "Polly.Raveena"

    if db_exists:
        rhea_cust = None
        if lead and lead.phone_number:
            rhea_cust = get_customer_details_from_rhea_db(
                lead.phone_number, 
                org_id, 
                category, 
                subcategory, 
                lead_name=customer_name
            )
            
        # Fallback to name lookup if phone lookup didn't yield a match or was empty
        if not rhea_cust and lead and lead.name:
            rhea_cust = get_customer_details_by_name(lead.name, org_id, category, subcategory)
            
        db_name = rhea_cust.get("name") if rhea_cust else None
        lead_name = (lead.name or "").strip() if lead else ""
        
        name_matches = False
        if db_name and lead_name:
            db_norm = "".join(c for c in db_name.lower() if c.isalnum())
            lead_norm = "".join(c for c in lead_name.lower() if c.isalnum())
            if db_norm == lead_norm or db_norm in lead_norm or lead_norm in db_norm:
                name_matches = True
                
        is_ecommerce = category and "ecommerce" in category.lower()
        subcat_lower = (subcategory or "").strip().lower() if subcategory else ""
        is_marketing = "marketing" in subcat_lower or "salles" in subcat_lower or "sales" in subcat_lower
        
        if is_marketing:
            name_matches = True

        if not name_matches:
            if not is_ecommerce:
                greeting_text = get_standard_greeting_text(customer_name, lang_upper)
                return greeting_text, plivo_lang, plivo_voice
            else:
                greeting_text = resolve_ecommerce_greeting(None, lead_name, lang_upper, subcategory)
                return greeting_text, plivo_lang, plivo_voice
            
        if not is_ecommerce:
            greeting_text = get_standard_greeting_text(customer_name, lang_upper)
            return greeting_text, plivo_lang, plivo_voice
            
        greeting_text = resolve_ecommerce_greeting(rhea_cust, lead_name, lang_upper, subcategory)
        return greeting_text, plivo_lang, plivo_voice

    greeting_text = get_standard_greeting_text(customer_name, lang_upper)
    return greeting_text, plivo_lang, plivo_voice


def load_custom_database_context(category: str, subcategory: str, org_id: Optional[int] = None) -> str:
    """Load all custom database CSV and TXT files uploaded for the given category/subcategory."""
    import os
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    if org_id is not None:
        db_dir = os.path.join(base_dir, "databses", f"org_{org_id}", category, subcategory)
    else:
        db_dir = os.path.join(base_dir, "databses", category, subcategory)

    # Handle case variations dynamically
    if not os.path.exists(db_dir):
        if org_id is not None:
            parent_dir = os.path.join(base_dir, "databses", f"org_{org_id}")
        else:
            parent_dir = os.path.join(base_dir, "databses")
            
        if os.path.exists(parent_dir):
            for cat_name in os.listdir(parent_dir):
                if cat_name.lower().strip() == category.lower().strip():
                    cat_path = os.path.join(parent_dir, cat_name)
                    for sub_name in os.listdir(cat_path):
                        if sub_name.lower().strip() == subcategory.lower().strip():
                            db_dir = os.path.join(cat_path, sub_name)
                            break

    if not os.path.exists(db_dir) or not os.path.isdir(db_dir):
        return ""

    parts = []
    for filename in os.listdir(db_dir):
        if filename.lower().endswith(".csv") or filename.lower().endswith(".txt"):
            file_path = os.path.join(db_dir, filename)
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read().strip()
                if content:
                    parts.append(f"### Custom Database File: {filename}\n{content}")
            except Exception as e:
                print(f"Error reading custom database file {filename}: {e}")
    return "\n\n".join(parts)


def build_call_instructions(
    db: Session,
    agent: Agent,
    lead: Optional[Lead] = None,
    campaign: Optional[Campaign] = None,
    direction: str = "outbound",
) -> dict:
    """
    Assemble everything configured on the agent (and optional campaign) for a live call.
    `direction` ("inbound"|"outbound") selects the inbound vs outbound master prompt.
    Returns dict with: system_instructions, first_message, voice_name, kb_content, doc_names, capabilities
    """
    org_id = None
    if agent.team and agent.team.organization_id:
        org_id = agent.team.organization_id

    if campaign is None and lead:
        campaign = get_campaign_for_lead(db, lead)

    kb_content, doc_names = load_kb_content(db, agent, lead)

    # Direction-aware prompt: inbound calls ANSWER, outbound calls DIAL OUT.
    is_inbound = str(direction).lower() == "inbound"
    if is_inbound:
        raw_prompt = (getattr(agent, "prompt_system_inbound", None) or "").strip()
        if not raw_prompt:
            try:
                from app.services.agent_catalog_service import resolve_catalog_prompt
                raw_prompt = (resolve_catalog_prompt(
                    db, agent.category, agent.subcategory, org_id, direction="inbound"
                ) or "").strip()
            except Exception:
                raw_prompt = ""
        if not raw_prompt:
            raw_prompt = (agent.prompt_system or "").strip()
    else:
        raw_prompt = (agent.prompt_system or "").strip()
    
    # Resolve category-specific professional defaults
    category = (agent.category or "").strip().lower()
    subcategory = (agent.subcategory or "").strip().lower()
    
    category_default = ""
    if "finance" in category:
        category_default = (
            "You are a highly professional, secure, and precise financial representative. "
            "Maintain strict compliance, answer questions regarding statements, account balances, or interest rates clearly, "
            "and speak with a trustworthy, objective, and expert financial tone. Avoid making speculative financial predictions."
        )
    elif "healthcare" in category:
        if "booking" in subcategory or "query" in subcategory:
            category_default = (
                "You are a professional and organized healthcare booking coordinator. "
                "When scheduling, you MUST politely ask the caller for and confirm the specific purpose of the appointment, "
                "as well as their preferred date and time, to ensure accurate patient scheduling and care."
            )
        else:
            category_default = (
                "You are a professional and helpful healthcare support representative. "
                "Answer healthcare-related questions and scheduling inquiries clearly, while maintaining strict patient privacy."
            )
    else:
        category_default = "You are a professional voice representative. Answer the caller's inquiries professionally, directly, and clearly."

    # Combine instructions
    if kb_content:
        kb_guideline = (
            "You are a professional calling representative. You MUST answer the caller's questions "
            "accurately and professionally using the facts in the KNOWLEDGE BASE CONTEXT below. "
            "Always prioritize the details from the documentation over general knowledge, and do not make up facts."
        )
        role_prompt = raw_prompt if raw_prompt else category_default
        if "KNOWLEDGE BASE CONTEXT" not in role_prompt:
            system_prompt = f"{kb_guideline}\n\nAdditional Role Guidelines:\n{role_prompt}"
        else:
            system_prompt = role_prompt
    else:
        if raw_prompt:
            if category_default and category_default != "You are a professional voice representative. Answer the caller's inquiries professionally, directly, and clearly." and category_default not in raw_prompt:
                system_prompt = f"{raw_prompt}\n\nCategory Guidelines:\n- {category_default}"
            else:
                system_prompt = raw_prompt
        else:
            system_prompt = category_default

    rhea_cust = None
    category = agent.category
    subcategory = agent.subcategory
    db_path = resolve_rhea_db_path(org_id, category, subcategory)
    db_exists = db_path is not None and os.path.exists(db_path)

    if db_exists:
        if lead and lead.phone_number:
            rhea_cust = get_customer_details_from_rhea_db(
                lead.phone_number, 
                org_id, 
                category, 
                subcategory, 
                lead_name=lead.name
            )
        if not rhea_cust and lead and lead.name:
            rhea_cust = get_customer_details_by_name(lead.name, org_id, category, subcategory)

    name_matches = False
    db_name = rhea_cust.get("name") if rhea_cust else None
    lead_name = (lead.name or "Prospect").strip() if lead else ""
    if db_name and lead_name:
        db_norm = "".join(c for c in db_name.lower() if c.isalnum())
        lead_norm = "".join(c for c in lead_name.lower() if c.isalnum())
        if db_norm == lead_norm or db_norm in lead_norm or lead_norm in db_norm:
            name_matches = True

    is_ecommerce = category and "ecommerce" in category.lower()
    subcat_lower = (subcategory or "").strip().lower() if subcategory else ""
    is_marketing = "marketing" in subcat_lower or "salles" in subcat_lower or "sales" in subcat_lower
    if db_exists and not name_matches and is_ecommerce and not is_marketing:
        system_prompt = resolve_mismatch_prompt(agent.lang or "ENGLISH")

    first_message, _, _ = get_personalized_greeting(agent, lead, org_id)
    capabilities = (agent.capabilities or "Customer Support / General FAQ").strip()
    agent_name = (agent.name or "Voice Agent").strip()
    lang = (agent.lang or "ENGLISH (US)").strip()

    voice_name = resolve_gemini_voice(agent)
    # Determine pronoun and gender rules based on voice name
    if voice_name in ["Charon", "Fenrir", "Puck", "Achird"]:
        gender_guidance = "You are a male representative. Always refer to yourself using male pronouns (he/him/his) and male terms. Speak and act exactly like a professional human."
    else:
        gender_guidance = "You are a female representative. Always refer to yourself using female pronouns (she/her/hers) and female terms. Speak and act exactly like a professional human."

    customer_info = ""
    if lead:
        customer_name = db_name if (rhea_cust and db_name) else (lead.name or "Prospect").strip()
        customer_phone = (lead.phone_number or "Unknown").strip()

        customer_info = f"\n\n# CUSTOMER INFORMATION\nName: {customer_name}\nPhone Number: {customer_phone}"

        if rhea_cust:
            items_str = ", ".join(rhea_cust.get("items", [])) if rhea_cust.get("items") else "None"
            customer_info += (
                f"\n\n# CUSTOMER & ORDER DETAILS (RETRIEVED FROM DATABASE)\n"
                f"- Customer ID: {rhea_cust.get('id')}\n"
                f"- City: {rhea_cust.get('city')}\n"
                f"- Order/Cart Type: {rhea_cust.get('type')}\n"
                f"- Items: {items_str}\n"
                f"- Total Order/Cart Amount: ₹{rhea_cust.get('amount')}\n"
                f"- Current Status: {rhea_cust.get('status')}\n"
                f"- Abandonment/Order Issue: {rhea_cust.get('issue') or 'None'}\n"
                f"- Discount Code Allocated: {rhea_cust.get('discount_code') or 'None'}\n"
                f"- Shipping Address: {rhea_cust.get('address') or 'None'}"
            )

    # Campaign-level prompt override (optional extra instructions)
    campaign_override = ""
    if campaign and campaign.agent_prompt_override:
        campaign_override = f"\n\n--- CAMPAIGN-SPECIFIC INSTRUCTIONS ---\n{campaign.agent_prompt_override.strip()}\n--- END CAMPAIGN INSTRUCTIONS ---"

    language_block = (
        f"Speak and respond entirely in {lang}. "
        f"You MUST conduct the entire conversation, including all greetings, responses, and confirmations, strictly in {lang}. "
        f"Do NOT speak English or any other language, except when pronouncing proper names, cities, or product names. "
        f"Translate all instructions, roles, status responses, and out-of-bound replies into {lang} before speaking."
    )

    kb_rules = ""
    if kb_content:
        kb_rules = """
KNOWLEDGE-BASE & SYSTEM PROMPT GROUNDING RULES (STRICT):
- **Database-Only Answers:** You MUST answer every factual question using ONLY the KNOWLEDGE BASE CONTEXT below and your SYSTEM PROMPT. Never invent prices, policies, product names, dates, or contact details.
- **No Hallucination:** If the answer is not explicitly in the KNOWLEDGE BASE CONTEXT, do NOT guess. Say you do not have that detail in your records and offer a team follow-up.
- **Voice-Friendly & Natural Speech:** Synthesize retrieved facts into natural spoken language. Keep responses to 1-2 concise sentences. Do NOT read bullet lists, table headers, or file names aloud.
- **Synonym & Intent Matching:** Map caller questions to the right facts (pricing, returns, shipping, support, hours, products, policies).
- **Disambiguation:** If multiple items match, ask one short clarifying question instead of listing everything.
- **Follow-Up Consistency:** When the caller asks follow-up questions, stay grounded in the same knowledge base facts. Do not contradict earlier answers.
- **Graceful Gap Handoff:** If neither SYSTEM PROMPT nor KNOWLEDGE BASE CONTEXT contains the answer, respond: "I don't have the exact details on that in my records right now, but I can note this and have our team follow up with you. Would you like me to do that?" """
    else:
        kb_rules = """
- Answer helpfully based on your system prompt and capabilities.
- If you do not know something, say so honestly and offer to escalate."""

    # Load custom database context (if any)
    custom_db_context = load_custom_database_context(
        agent.category or "Ecommerce", 
        agent.subcategory or "Project Overview",
        org_id
    )

    # Load SQLite databases context dynamically
    sqlite_db_context_parts = []
    
    # Check if there is standard marketing campaign db context
    marketing_context = load_marketing_campaign_context(org_id)
    if marketing_context:
        sqlite_db_context_parts.append(marketing_context)
        
    db_paths = resolve_all_db_paths(org_id, agent.category, agent.subcategory)
    lead_phone = lead.phone_number if lead else None
    lead_name = lead.name if lead else None
    
    for db_p in db_paths:
        # Avoid duplicate loading of marketing db as generic if already loaded
        if "ecommerce_marketing.db" in db_p.lower() and marketing_context:
            continue
        db_ctx = load_sqlite_database_context(db_p, lead_phone, lead_name)
        if db_ctx:
            sqlite_db_context_parts.append(f"### SQLite Database: {os.path.basename(db_p)}\n{db_ctx}")
            
    sqlite_db_context = "\n\n".join(sqlite_db_context_parts)

    # Company details + auto follow-up guidance. When the vendor has configured Company
    # Details, share them on request and let the caller know the full details will be sent
    # to their WhatsApp and email right after the call (the system auto-sends on interest).
    company_block = ""
    try:
        if org_id:
            org_row = db.query(Organization).filter(Organization.id == org_id).first()
            company_details = (getattr(org_row, "company_details", None) or "").strip() if org_row else ""
            if company_details:
                has_email = bool(lead and getattr(lead, "email", None))
                email_line = (
                    "We already have the caller's email on file."
                    if has_email
                    else "If the caller wants the details by email, politely ask for their email address and read it back to confirm."
                )
                company_block = f"""

# COMPANY DETAILS (share these when asked)
{company_details}

# SENDING DETAILS TO THE CALLER
- If the caller asks for details, pricing, a brochure, or more information — OR clearly shows strong interest — answer their question briefly, then tell them you will send the full details to their WhatsApp and email right after this call.
- {email_line}
- Do not read out long lists of details on the call; keep it conversational and reassure them the complete information is on its way to their WhatsApp and email."""
    except Exception:
        company_block = ""

    combined = f"""# AGENT IDENTITY
Name: {agent_name}
Gender/Voice Profile: {gender_guidance}
Capabilities: {capabilities}{customer_info}

# SYSTEM PROMPT
{system_prompt}{company_block}

# CALL BEHAVIOR
1. Speak with a natural, human-like conversational voice. You are a professional human representative talking to a customer, NOT an AI bot, machine, or automated agent. Never say "I am an AI", "I am an agent", "I am a computer program", or "as a bot". Talk to the customer exactly like a professional human would, maintaining a highly professional, neutral, and direct demeanor. Avoid expressing any personal emotion, warm check-ins, or friendly banter. Speak in a normal, professional agent tone.
2. Begin the conversation by saying EXACTLY this greeting (word for word): "{first_message}"
3. Keep responses concise and suitable for a phone call.
4. {language_block}
5. Conclude the call: Once the conversation has naturally finished (for example, if all customer questions are answered, or if the customer says thank you, goodbye, bye, or indicates they want to end the call), you MUST say a professional and polite goodbye (such as "Thank you for calling. Have a great day! Goodbye!"). Do NOT append any brackets, system commands, or technical tokens (like "[CONVERSATION_ENDED]" or "[hangup]"). Just end the conversation with a natural, polite goodbye.
{kb_rules}
{campaign_override}
 
--- KNOWLEDGE BASE CONTEXT ---
{kb_content if kb_content else "(No knowledge base documents linked to this agent.)"}
--- END KNOWLEDGE BASE CONTEXT ---"""
 
    if custom_db_context or sqlite_db_context:
        combined += f"""

--- CUSTOM DATABASE CONTEXT ---
You MUST use the following custom database files to answer any questions or check details.
When the caller asks about a property, product, listing, zip code, address, or price — search this data FIRST.
Match property names flexibly (e.g. "Villa 98" matches property_name Villa 98). Never say data is missing if it appears below.
{custom_db_context}
{sqlite_db_context}
--- END CUSTOM DATABASE CONTEXT ---"""
 
    return {
        "system_instructions": combined.strip(),
        "first_message": first_message,
        "voice_name": voice_name,
        "kb_content": kb_content,
        "doc_names": doc_names,
        "capabilities": capabilities,
        "agent_name": agent_name,
        "lang": lang,
    }
