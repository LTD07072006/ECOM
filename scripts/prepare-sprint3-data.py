"""Normalize the Wave 2 PX-Web JSON-stat exports and OurAirports CSV."""

import argparse
import csv
from hashlib import sha256
import json
from pathlib import Path
import re
import unicodedata
from uuid import NAMESPACE_URL, uuid5


TABLES = {
    "grdp": ("PL.V03.02", "GRDP_PC", "GRDP per capita", "Gross regional domestic product per resident at current prices.", "million VND/person", "decimal", "current_prices_per_resident"),
    "growth": ("PL.V03.01", "GRDP_GROWTH", "GRDP growth", "Annual percentage change in provincial gross regional domestic product at constant prices.", "%", "decimal", "real_grdp_year_over_year"),
    "retail": ("PL.V08.01", "RETAIL_TOTAL", "Retail sales and consumer services", "Total retail sales of goods and consumer service revenue at current prices.", "billion VND", "decimal", "goods_and_consumer_services_current_prices"),
    "fdi": ("PL.V04.02", "FDI_LICENSED", "Licensed FDI registered capital", "Total registered capital reported in the annual licensed foreign direct investment table.", "million USD", "decimal", "annual_licensed_fdi_registered_capital"),
    "business": ("PL.V05.01", "ENTERPRISES_NEW", "New enterprise registrations", "Enterprises newly registered during the reporting year.", "enterprises", "integer", "new_registrations"),
    "workforce": ("PL.V02.24", "LABOR_FORCE", "Labour force aged 15+", "Size of the labour force aged 15 years and older.", "thousand people", "decimal", "labour_force_age_15_plus"),
    "talent": ("PL.V02.27", "TRAINED_LABOR_RATE", "Share of trained workers aged 15+", "Reported share of workers aged 15 years and older who have received training.", "%", "percent", "trained_workers_age_15_plus"),
}

LIMITATIONS = {
    "fdi": "Amounts follow the registered-capital definition in the source table. Negative values are preserved as reported. An omitted province or blank cell is unavailable. Disbursements are a separate measure.",
    "business": "Counts new registrations during the year. The stock of operating enterprises is a separate measure.",
    "retail": "Current-price figures include price changes. Coverage is province level.",
}

PRESS_URL = "https://www.nso.gov.vn/du-lieu-va-so-lieu-thong-ke/2026/01/thong-cao-bao-chi-ve-ket-qua-tang-truong-tong-san-pham-tren-dia-ban-grdp-cua-34-tinh-thanh-pho-nam-2025/"


def key(label):
    return " ".join(unicodedata.normalize("NFC", label).casefold().split())


def table_snapshot(path, province_codes, name):
    data = json.loads(path.read_text(encoding="utf-8-sig").rstrip("\0\r\n"))["dataset"]
    dims = data["dimension"]
    if len(dims["id"]) != 2 or len(data["value"]) != dims["size"][0] * dims["size"][1]:
        raise ValueError(f"Unexpected dimensions for {name}")
    places, columns = (dims[dimension]["category"] for dimension in dims["id"])
    if name == "fdi":
        column = next(code for code, label in columns["label"].items() if label.startswith("Tổng vốn đăng ký"))
        period = "2025"
    else:
        column = next(code for code, label in columns["label"].items() if re.search(r"\b2025\b", label))
        period = {"Sơ bộ 2025": "2025 (preliminary)", "Ước tính 2025": "2025 (estimated)"}.get(columns["label"][column], "2025")
    located = {}
    for area_id, label in places["label"].items():
        code = province_codes.get(key(label))
        if code is None:
            continue
        if code in located:
            raise ValueError(f"Duplicate province {code} in {name}")
        offset = places["index"][area_id] * dims["size"][1] + columns["index"][column]
        number = data["value"][offset]
        located[code] = round(number - 100, 10) if name == "growth" and number is not None else number
    codes = sorted(province_codes.values())
    if name != "fdi" and set(located) != set(codes):
        raise ValueError(f"Province coverage mismatch for {name}: {set(codes) - set(located)}")
    print(name, "published province values", sum(value is not None for value in located.values()))
    return {"periodLabel": period, "values": [{"code": code, "value": located.get(code)} for code in codes]}


def write_json(output, filename, payload):
    content = (json.dumps(payload, indent=2, ensure_ascii=False, allow_nan=False) + "\n").encode()
    (output / filename).write_bytes(content)
    return sha256(content).hexdigest()


def dataset(output, filename, payload, code, version, publisher, title, url, date, raw_hash=None, airport=False):
    return {
        "file": filename, "sha256": write_json(output, filename, payload), "datasetCode": code, "version": version,
        "sourceSha256": raw_hash, "owner": "Market Intelligence Data Steward", "dataAsOf": date,
        "reviewedOn": "2026-11-20", "reviewIntervalDays": 90 if airport else 365,
        "source": {
            "id": str(uuid5(NAMESPACE_URL, url)), "type": "manual" if airport else "official", "publisher": publisher,
            "title": title, "url": url, "license": "Public Domain" if airport else "Public NSO statistics. Credit Cục Thống kê when reproducing.",
            "citation": f"{publisher}, {title}",
        },
    }


def indicator(pair):
    _, code, label, definition, unit, value_type, scope = pair
    return {"code": code, "label": label, "definition": definition, "unit": unit, "valueType": value_type, "scope": scope}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("exports", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    master = json.loads(Path("data/sprint1/administration.json").read_text(encoding="utf-8"))
    province_codes = {key(re.sub(r"^(Tỉnh|Thành phố)\s+", "", row["name"])): row["code"] for row in master if row["parent"] == "VN"}
    province_codes["tp. hồ chí minh"] = province_codes.pop("hồ chí minh")
    source_owner = "Cục Thống kê, Bộ Tài chính"
    series = []
    for name, definition in TABLES.items():
        matrix = definition[0]
        url = (args.exports / f"{name}.url").read_text(encoding="utf-8-sig").splitlines()[1]
        raw = args.exports / f"{name}.raw"
        payload = table_snapshot(raw, province_codes, name)
        method = f"NSO 34-province appendix, table {matrix}, 2025 column, matched to July 2025 province codes."
        if name == "growth":
            method += " Subtracted 100 from the published previous-year index."
        entry = dataset(args.output, f"{name}.json", payload, f"VN_NSO_{matrix.replace('.', '_')}", f"{matrix}-2025", source_owner,
                        f"Statistical Yearbook 2025 appendix, table {matrix}", url, "2025-12-31", sha256(raw.read_bytes()).hexdigest())
        series.append({"indicator": indicator(definition), "coverage": "national_provinces", "method": method,
                       "limitations": LIMITATIONS.get(name, "Figures follow the period and coverage of the source. Province-level statistics."), "dataset": entry})

    # Four figures stated explicitly in the press release narrative, sections 2.1 and 2.3.
    highlights = [{"code": code, "value": value} for code, value in [("01", 8.16), ("22", 11.89), ("31", 11.81), ("79", 7.53)]]
    press = dataset(args.output, "growth-press.json", {"periodLabel": "2025 (estimated)", "values": highlights},
                    "VN_NSO_GRDP_PRESS", "2025-press-estimate", source_owner, "2025 provincial GRDP growth press release",
                    PRESS_URL, "2025-12-31")
    series.append({"indicator": indicator(TABLES["growth"]), "coverage": "selected_provinces",
                   "method": "Published provincial growth rates transcribed from sections 2.1 and 2.3 of the NSO press release.",
                   "limitations": "Four provinces explicitly identified in the release narrative. Coverage for comparison is limited to these provinces and revisions may differ.",
                   "dataset": press})

    raw_airports = args.exports / "airports.csv"
    with raw_airports.open(encoding="utf-8-sig", newline="") as stream:
        rows = [row for row in csv.DictReader(stream) if row["iso_country"] == "VN" and row["scheduled_service"] == "yes"
                and row["type"] in {"large_airport", "medium_airport", "small_airport"}]
    airports = [{"id": row["ident"], "code": row["iata_code"] or None, "name": row["name"].split(" / ")[0],
                 "longitude": float(row["longitude_deg"]), "latitude": float(row["latitude_deg"]),
                 "url": f"https://ourairports.com/airports/{row['ident']}/"} for row in sorted(rows, key=lambda item: item["ident"])]
    entry = dataset(args.output, "airports.json", airports, "VN_OURAIRPORTS_SCHEDULED", "2026-11-20", "OurAirports",
                    "Vietnam civil airport locations with scheduled service in the source snapshot", "https://ourairports.com/data/",
                    "2026-11-20", sha256(raw_airports.read_bytes()).hexdigest(), airport=True)
    write_json(args.output, "manifest.json", {"geographyVersion": "VN_ADMIN_2025_07", "year": 2025,
                                             "series": series, "airports": entry})
    print("Airport locations", len(airports))


if __name__ == "__main__":
    main()
