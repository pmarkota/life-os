#!/usr/bin/env python3
"""Parse merged.md Notion export and generate SQL INSERT statements."""

import re
import json
import sys
from datetime import datetime

INPUT_FILE = "/Users/petarmarkota/Desktop/PROD/petar-os/merged.md"
OUTPUT_FILE = "/Users/petarmarkota/Desktop/PROD/petar-os/scripts/leads-inserts.json"
USER_ID = "c0a74433-7f4a-44e9-af96-e87d1c1acbce"

# Mapping tables
STATUS_MAP = {
    "New": "new",
    "Demo Built": "demo_built",
    "Contacted": "contacted",
    "Replied": "replied",
    "Call Booked": "call_booked",
    "Follow-up": "follow_up",
    "Won": "won",
    "Lost": "lost",
}

NICHE_MAP = {
    "Dental": "dental",
    "Frizer": "frizer",
    "Restoran": "restoran",
    "Autoservis": "autoservis",
    "Fizioterapija": "fizioterapija",
    "Wellness": "wellness",
    "Fitness": "fitness",
    "Apartmani": "apartmani",
    "Kozmetika": "kozmetika",
    "Pekara": "pekara",
    "Ostalo": "ostalo",
}

CHANNEL_MAP = {
    "Instagram DM": "instagram_dm",
    "Email": "email",
    "LinkedIn": "linkedin",
    "Telefon": "telefon",
    "WhatsApp": "whatsapp",
    "Osobno": "osobno",
}

MARKET_MAP = {
    "HR": "hr",
    "DACH": "dach",
    "US": "us",
}

KNOWN_KEYS = {
    "Bilješke", "Dani od kontakta", "Email", "Follow-up datum", "Grad",
    "Instagram", "Kanal", "Lead ID", "Niša", "PageSpeed", "Prva poruka",
    "Prvi kontakt", "Stale", "Status", "Telefon", "Treba follow-up",
    "Tržište", "Web URL", "Zadnja izmjena", "Zadnji kontakt",
}

def parse_date(date_str):
    """Parse various date formats from Notion export."""
    if not date_str:
        return None
    date_str = date_str.strip()

    # Try various formats
    formats = [
        "%B %d, %Y",           # March 15, 2026
        "%B %d, %Y %I:%M %p",  # March 15, 2026 10:30 AM
        "%Y-%m-%d",             # 2026-03-15
        "%d/%m/%Y",             # 15/03/2026
    ]

    for fmt in formats:
        try:
            dt = datetime.strptime(date_str, fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue

    # Try to extract just the date part if there's extra text
    match = re.match(r'(\w+ \d+, \d{4})', date_str)
    if match:
        try:
            dt = datetime.strptime(match.group(1), "%B %d, %Y")
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            pass

    return None


def parse_leads(filepath):
    """Parse the merged.md file into a list of lead dicts."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split by top-level headers
    sections = re.split(r'^# ', content, flags=re.MULTILINE)

    leads = []

    for section in sections:
        section = section.strip()
        if not section:
            continue

        lines = section.split('\n')
        business_name = lines[0].strip()

        if not business_name:
            continue

        lead = {"business_name": business_name}

        # Parse key-value pairs
        current_key = None
        current_value = None

        for line in lines[1:]:
            line_stripped = line.strip()
            if not line_stripped:
                # Empty line might be part of a multiline value
                if current_key and current_value:
                    current_value += "\n"
                continue

            # Check if this line starts a new key
            found_key = False
            for key in KNOWN_KEYS:
                if line_stripped.startswith(key + ":"):
                    # Save previous key-value
                    if current_key:
                        lead[current_key] = current_value.strip()

                    current_key = key
                    current_value = line_stripped[len(key) + 1:].strip()
                    found_key = True
                    break

            if not found_key and current_key:
                # This is a continuation of the previous value
                current_value += "\n" + line_stripped

        # Save last key-value
        if current_key:
            lead[current_key] = current_value.strip()

        leads.append(lead)

    return leads


def map_lead(raw):
    """Map a raw parsed lead to our Supabase schema."""
    mapped = {
        "user_id": USER_ID,
        "business_name": raw.get("business_name", "").replace("'", "''"),
        "status": STATUS_MAP.get(raw.get("Status", ""), "new"),
        "niche": NICHE_MAP.get(raw.get("Niša", ""), None),
        "location": raw.get("Grad", None),
        "email": raw.get("Email", None),
        "phone": raw.get("Telefon", None),
        "website_url": raw.get("Web URL", None),
        "instagram": raw.get("Instagram", None),
        "channel": CHANNEL_MAP.get(raw.get("Kanal", ""), None),
        "market": MARKET_MAP.get(raw.get("Tržište", ""), None),
        "notes": raw.get("Bilješke", None),
        "first_message": raw.get("Prva poruka", None),
        "first_contact": parse_date(raw.get("Prvi kontakt")),
        "last_contacted_at": parse_date(raw.get("Zadnji kontakt")),
        "next_follow_up": parse_date(raw.get("Follow-up datum")),
        "page_speed": None,
    }

    # Parse PageSpeed as int
    ps = raw.get("PageSpeed")
    if ps:
        try:
            mapped["page_speed"] = int(float(ps))
        except (ValueError, TypeError):
            pass

    return mapped


def sql_val(v):
    """Convert a Python value to SQL literal."""
    if v is None:
        return "NULL"
    if isinstance(v, int):
        return str(v)
    s = str(v).replace("'", "''")
    return f"'{s}'"


def generate_sql_batches(leads, batch_size=30):
    """Generate SQL INSERT statements in batches."""
    cols = [
        "user_id", "business_name", "status", "niche", "location",
        "email", "phone", "website_url", "instagram", "channel",
        "market", "notes", "first_message", "first_contact",
        "last_contacted_at", "next_follow_up", "page_speed"
    ]

    batches = []

    for i in range(0, len(leads), batch_size):
        batch = leads[i:i + batch_size]
        values = []

        for lead in batch:
            row_vals = [sql_val(lead.get(col)) for col in cols]
            values.append(f"({', '.join(row_vals)})")

        sql = f"INSERT INTO public.leads ({', '.join(cols)})\nVALUES\n" + ",\n".join(values) + ";"
        batches.append(sql)

    return batches


if __name__ == "__main__":
    print("Parsing merged.md...")
    raw_leads = parse_leads(INPUT_FILE)
    print(f"Found {len(raw_leads)} leads")

    mapped_leads = [map_lead(r) for r in raw_leads]

    # Stats
    statuses = {}
    niches = {}
    markets = {}
    for l in mapped_leads:
        s = l["status"]
        statuses[s] = statuses.get(s, 0) + 1
        n = l.get("niche") or "none"
        niches[n] = niches.get(n, 0) + 1
        m = l.get("market") or "none"
        markets[m] = markets.get(m, 0) + 1

    print(f"\nStatus breakdown: {json.dumps(statuses, indent=2)}")
    print(f"\nNiche breakdown: {json.dumps(niches, indent=2)}")
    print(f"\nMarket breakdown: {json.dumps(markets, indent=2)}")

    batches = generate_sql_batches(mapped_leads)
    print(f"\nGenerated {len(batches)} SQL batches")

    # Save batches to JSON for the import script
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(batches, f)

    print(f"SQL batches saved to {OUTPUT_FILE}")
