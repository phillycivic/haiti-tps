#!/usr/bin/env python3
"""
Fetch all House members from the Clerk of the House XML feed
and save to data/house_reps.csv.

Columns match targeted.csv: name, party, stateAbbr, district, stateDistrict, phone
(area and searchTerms are left blank — fill in manually for targeted reps)
"""

import csv
import xml.etree.ElementTree as ET
import urllib.request
import sys
from pathlib import Path

URL = "https://clerk.house.gov/xml/lists/MemberData.xml"
OUT = Path(__file__).parent.parent / "data" / "house_reps.csv"

def fetch_xml(url: str) -> ET.Element:
    print(f"Fetching {url} ...")
    with urllib.request.urlopen(url, timeout=30) as resp:
        return ET.fromstring(resp.read())

def parse_members(root: ET.Element) -> list[dict]:
    members = []
    for member in root.findall(".//member"):
        info = member.find("member-info")
        if info is None:
            continue

        first = (info.findtext("firstname") or "").strip()
        last  = (info.findtext("lastname")  or "").strip()
        suffix = (info.findtext("suffix") or "").strip()
        name = f"{first} {last}"
        if suffix:
            name += f" {suffix}"

        party = (info.findtext("party") or "").strip()

        state_el = info.find("state")
        state_abbr = (state_el.get("postal-code") or "").strip() if state_el is not None else ""

        raw_district = (info.findtext("district") or "").strip()
        if raw_district.lower() in ("at large", "at-large", ""):
            district = "00"
        else:
            # Strip ordinal suffixes: "1st" -> "1", "2nd" -> "2", etc.
            num_str = raw_district.rstrip("stndrh")  # removes st/nd/rd/th
            try:
                district = f"{int(num_str):02d}"
            except ValueError:
                district = raw_district.zfill(2)

        state_district = f"{state_abbr}{district}"
        phone = (info.findtext("phone") or "").strip()

        members.append({
            "name": name,
            "party": party,
            "stateAbbr": state_abbr,
            "district": district,
            "stateDistrict": state_district,
            "phone": phone,
            "area": "",
            "searchTerms": "",
            "targeted": "",
        })

    members.sort(key=lambda m: (m["stateAbbr"], m["district"]))
    return members

def main():
    try:
        root = fetch_xml(URL)
    except Exception as e:
        print(f"Error fetching data: {e}", file=sys.stderr)
        sys.exit(1)

    members = parse_members(root)
    print(f"Found {len(members)} members")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["name","party","stateAbbr","district","stateDistrict","phone","area","searchTerms","targeted"])
        writer.writeheader()
        writer.writerows(members)

    print(f"Saved to {OUT}")

if __name__ == "__main__":
    main()
