"""
build-market-data.py
Reads the full market sales CSV and outputs site/data/market-data.json.
Run from repo root: py scripts/build-market-data.py
Update the CSV path below if the source file moves.
"""

import csv
import json
import statistics
from collections import defaultdict
from datetime import date
from pathlib import Path

CSV_PATH = r"C:\Users\wmm4\Documents\email-generator\data\Sales (1).csv"
OUT_PATH = Path(__file__).parent.parent / "site" / "data" / "market-data.json"

YEAR_MIN = 2011
YEAR_MAX = 2025

# Property type normalization
TYPE_MAP = {
    "Market Rate": "Market Rate",
    "LIHTC": "Affordable",
    "HAP": "Affordable",
    "Student": "Student",
    "Senior": "Senior",
}

# Market definitions: each entry is (msa_filter, city_set_or_None, exclude_cities_or_None)
# city_set=None means "all cities in that MSA"
# exclude_cities is only used for Denver to carve out Boulder-group
BOULDER_CITIES = {
    "Boulder", "Longmont", "Lafayette", "Louisville", "Superior", "Erie", "Lyons"
}
FORT_COLLINS_CITIES = {
    "Fort Collins", "Loveland", "Windsor", "Johnstown", "Wellington", "Eaton", "Ault"
}
GREELEY_CITIES = {"Greeley", "Evans"}
WESTERN_SLOPE_CITIES = {
    "Grand Junction", "Craig", "Montrose", "Cortez", "Rifle", "Clifton", "Gypsum",
    "Fruita", "Parachute", "Delta", "Meeker", "Rangely", "Palisade", "Norwood",
    "Paonia", "Olathe", "New Castle", "Hayden", "De Beque", "Pagosa Springs",
}
MOUNTAIN_TOWN_CITIES = {
    "Steamboat Springs", "Aspen", "Silverthorne", "Avon", "Eagle", "Vail",
    "Snowmass Village", "Breckenridge", "Dillon", "Granby", "Fraser", "Buena Vista",
    "Keystone", "Crested Butte", "Telluride", "Idaho Springs", "Georgetown",
    "Estes Park", "Carbondale", "Salida", "Glenwood Springs", "Gunnison",
    "Durango", "Basalt",
}
MANITOU_SPRINGS = {"Manitou Springs"}

MARKETS = {
    "denver": {
        "label": "Denver Metro",
        "msa": "Denver",
        "include_cities": None,
        "exclude_cities": BOULDER_CITIES,
        "cities_note": "Denver MSA excluding Boulder-group cities",
    },
    "boulder": {
        "label": "Boulder",
        "msa": "Denver",
        "include_cities": BOULDER_CITIES,
        "exclude_cities": None,
        "cities_note": "Boulder, Longmont, Lafayette, Louisville, Superior, Erie, Lyons",
    },
    "colorado-springs": {
        "label": "Colorado Springs",
        "msa": "Colorado Springs",
        "include_cities": None,
        "exclude_cities": None,
        "extra": [("Mountain", MANITOU_SPRINGS)],
        "cities_note": "Colorado Springs MSA + Manitou Springs",
    },
    "fort-collins": {
        "label": "Fort Collins",
        "msa": "Fort Collins",
        "include_cities": FORT_COLLINS_CITIES,
        "exclude_cities": None,
        "cities_note": "Fort Collins, Loveland, Windsor, Johnstown, Wellington, Eaton, Ault",
    },
    "greeley": {
        "label": "Greeley",
        "msa": "Fort Collins",
        "include_cities": GREELEY_CITIES,
        "exclude_cities": None,
        "cities_note": "Greeley, Evans",
    },
    "western-slope": {
        "label": "Western Slope",
        "msa": "Mountain",
        "include_cities": WESTERN_SLOPE_CITIES,
        "exclude_cities": None,
        "cities_note": "Grand Junction, Montrose, and surrounding Western Slope cities",
    },
    "mountain-towns": {
        "label": "Mountain Towns",
        "msa": "Mountain",
        "include_cities": MOUNTAIN_TOWN_CITIES,
        "exclude_cities": None,
        "cities_note": "Steamboat Springs, Aspen, Vail, Breckenridge, Durango, and other resort markets",
    },
}


def parse_money(val: str) -> float | None:
    """Strip $ and commas, return float or None."""
    cleaned = val.strip().replace("$", "").replace(",", "").strip()
    if not cleaned:
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def parse_year(date_str: str) -> int | None:
    """Parse M/D/YYYY and return the year."""
    parts = date_str.strip().split("/")
    if len(parts) != 3:
        return None
    try:
        return int(parts[2])
    except ValueError:
        return None


def vintage_bucket(yoc_str: str) -> str | None:
    try:
        yoc = int(yoc_str.strip())
    except (ValueError, AttributeError):
        return None
    if yoc < 1990:
        return "pre_1990"
    if yoc <= 2010:
        return "1990_to_2010"
    return "post_2010"


def row_matches_market(row: dict, market_key: str) -> bool:
    cfg = MARKETS[market_key]
    msa = row["MSA"].strip()
    city = row["CITY"].strip()

    def matches_primary():
        if msa != cfg["msa"]:
            return False
        if cfg.get("include_cities") and city not in cfg["include_cities"]:
            return False
        if cfg.get("exclude_cities") and city in cfg["exclude_cities"]:
            return False
        return True

    if matches_primary():
        return True

    for extra_msa, extra_cities in cfg.get("extra", []):
        if msa == extra_msa and city in extra_cities:
            return True

    return False


def compute_stats(values: list[float]) -> dict:
    if not values:
        return {"count": 0, "median": None, "p25": None, "p75": None}
    s = sorted(values)
    n = len(s)
    median = statistics.median(s)
    p25 = s[int(n * 0.25)]
    p75 = s[int(n * 0.75)]
    return {
        "count": n,
        "median": round(median),
        "p25": round(p25),
        "p75": round(p75),
    }


def build_market_data() -> dict:
    # Buckets: market_key -> list of rows
    market_rows: dict[str, list[dict]] = {k: [] for k in MARKETS}

    with open(CSV_PATH, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for raw in reader:
            year = parse_year(raw["DATE"])
            if year is None or year < YEAR_MIN or year > YEAR_MAX:
                continue
            if not raw["MSA"].strip():
                continue

            for market_key in MARKETS:
                if row_matches_market(raw, market_key):
                    market_rows[market_key].append({
                        "year": year,
                        "city": raw["CITY"].strip(),
                        "prop_type": TYPE_MAP.get(raw["PROPERTY TYPE"].strip()),
                        "units": raw["UNITS"].strip(),
                        "yoc": raw["YOC"].strip(),
                        "ppu": parse_money(raw["$/UNIT"]),
                    })
                    break  # each row maps to at most one market

    output = {}
    for market_key, rows in market_rows.items():
        cfg = MARKETS[market_key]

        # $/unit stats — exclude rows with no $/unit, include all property types
        ppu_values = [r["ppu"] for r in rows if r["ppu"] and r["ppu"] > 0]
        ppu_stats = compute_stats(ppu_values)

        # Transaction count (all rows)
        total_count = len(rows)

        # Property type mix
        type_counts: dict[str, int] = defaultdict(int)
        for r in rows:
            if r["prop_type"]:
                type_counts[r["prop_type"]] += 1
        type_mix = {}
        typed_total = sum(type_counts.values())
        if typed_total:
            for t, c in sorted(type_counts.items()):
                type_mix[t] = round(c / typed_total, 3)

        # Volume by year
        by_year: dict[str, dict] = {}
        year_buckets: dict[int, list[float]] = defaultdict(list)
        for r in rows:
            year_buckets[r["year"]].append(r["ppu"] if r["ppu"] and r["ppu"] > 0 else None)
        for yr in range(YEAR_MIN, YEAR_MAX + 1):
            vals = [v for v in year_buckets.get(yr, []) if v is not None]
            by_year[str(yr)] = {
                "count": len(year_buckets.get(yr, [])),
                "median_ppu": round(statistics.median(vals)) if vals else None,
            }

        # $/unit by vintage
        vintage_buckets: dict[str, list[float]] = defaultdict(list)
        for r in rows:
            vb = vintage_bucket(r["yoc"])
            if vb and r["ppu"] and r["ppu"] > 0:
                vintage_buckets[vb].append(r["ppu"])
        by_vintage = {}
        for bucket in ["pre_1990", "1990_to_2010", "post_2010"]:
            by_vintage[bucket] = compute_stats(vintage_buckets[bucket])

        output[market_key] = {
            "label": cfg["label"],
            "cities_note": cfg["cities_note"],
            "transaction_count": total_count,
            "dollar_per_unit": ppu_stats,
            "property_type_mix": type_mix,
            "by_year": by_year,
            "by_vintage": by_vintage,
        }

    return {
        "generated": date.today().isoformat(),
        "year_range": f"{YEAR_MIN}–{YEAR_MAX}",
        "note": "2026 YTD excluded. Contact team for current market data.",
        "markets": output,
    }


if __name__ == "__main__":
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    data = build_market_data()
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"Written to {OUT_PATH}")
    for market, stats in data["markets"].items():
        d = stats["dollar_per_unit"]
        print(
            f"  {market:20s}  {stats['transaction_count']:4d} txn  "
            f"${d['p25']:,}–${d['p75']:,}/unit  median ${d['median']:,}"
            if d["median"] else
            f"  {market:20s}  {stats['transaction_count']:4d} txn  (no $/unit data)"
        )
