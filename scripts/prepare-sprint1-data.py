"""Build the pinned Sprint 1 snapshots from the three public exports.

Requires xlrd and Shapely 2.1+. Usage is documented in docs/sprint1-data-foundation.md.
"""

import argparse
from collections import Counter
from decimal import Decimal, ROUND_HALF_UP
import gzip
from hashlib import sha256
import json
from pathlib import Path
import re
import unicodedata
from zipfile import ZipFile

import shapely
import xlrd


def clean(value):
    return unicodedata.normalize("NFC", " ".join(value.split()))


def prepare_administration(path):
    sheet = xlrd.open_workbook(str(path)).sheet_by_index(0)
    if sheet.row_values(0)[:4] != ["Tỉnh", "Tên Tỉnh", "Xã", "Tên Xã"]:
        raise ValueError("Unexpected historical administration export columns")
    provinces = {}
    communes = {}
    for index in range(1, sheet.nrows):
        province, province_name, commune, commune_name = map(clean, sheet.row_values(index)[:4])
        if not re.fullmatch(r"\d{2}", province) or not re.fullmatch(r"\d{5}", commune):
            raise ValueError(f"Invalid administrative code on row {index + 1}")
        if commune in communes or provinces.setdefault(province, province_name) != province_name:
            raise ValueError(f"Duplicate or conflicting administrative code on row {index + 1}")
        communes[commune] = {"code": commune, "name": commune_name, "parent": province}
    if len(provinces) != 34 or len(communes) != 3321:
        raise ValueError("Expected 34 provinces and 3,321 communes, wards and special zones")
    kinds = Counter(unit["name"].split()[0].casefold() for unit in communes.values())
    if kinds != {"xã": 2621, "phường": 687, "đặc": 13}:
        raise ValueError(f"Unexpected distribution of commune-level types: {dict(kinds)}")
    print("Administration:", len(provinces), "provinces; commune-level type prefixes:", dict(kinds))
    rows = [{"code": "VN", "name": "Việt Nam", "parent": None}]
    rows.extend({"code": code, "name": name, "parent": "VN"} for code, name in sorted(provinces.items()))
    rows.extend(communes[code] for code in sorted(communes))
    return rows, provinces


def prepare_boundaries(path, provinces):
    with ZipFile(path) as archive, archive.open("vnm_admin1.geojson") as source:
        features = json.load(source)["features"]
    boundaries = []
    for feature in features:
        properties = feature["properties"]
        code = properties["adm1_pcode"].removeprefix("VN")
        if properties["version"] != "v02" or code not in provinces:
            raise ValueError(f"Unexpected COD-AB geography or version for {code}")
        original = shapely.from_geojson(json.dumps(feature["geometry"]))
        if not original.is_valid and code != "91":
            raise ValueError(f"Unexpected invalid source geometry for {code}: {shapely.is_valid_reason(original)}")
        corrected = shapely.make_valid(original) if not original.is_valid else original
        if corrected.geom_type == "GeometryCollection":
            polygons = [part for part in corrected.geoms if part.geom_type in ("Polygon", "MultiPolygon")]
            corrected = shapely.union_all(polygons)
        simplified = shapely.orient_polygons(corrected.simplify(0.0008, preserve_topology=True))
        if (not simplified.is_valid or simplified.is_empty or simplified.geom_type not in ("Polygon", "MultiPolygon")
                or abs(simplified.area - original.area) / original.area > 0.01):
            raise ValueError(f"Invalid or materially changed display geometry for {code}")
        boundaries.append({"type": "Feature", "properties": {"code": code}, "geometry": json.loads(shapely.to_geojson(simplified))})
    codes = [feature["properties"]["code"] for feature in boundaries]
    if len(codes) != len(provinces) or set(codes) != set(provinces):
        raise ValueError("COD-AB coverage differs from the official province codes")
    return {"type": "FeatureCollection", "features": sorted(boundaries, key=lambda feature: feature["properties"]["code"])}


def prepare_population(path, provinces):
    labels = {re.sub(r"^(Tỉnh|Thành phố)\s+", "", name): code for code, name in provinces.items()}
    labels["TP. Hồ Chí Minh"] = labels.pop("Hồ Chí Minh")
    labels["CẢ NƯỚC"] = "VN"
    payload = json.loads(path.read_text(encoding="utf-8-sig").rstrip("\x00\r\n"), parse_float=Decimal)["dataset"]
    dimensions = payload["dimension"]
    if dimensions["id"] != ["Địa phương", "Năm", "Chỉ tiêu"] or dimensions["size"] != [41, 1, 3]:
        raise ValueError("Unexpected PL.V02.01 table dimensions")
    area = dimensions["Địa phương"]["category"]
    year = int(dimensions["Năm"]["category"]["label"]["0"])
    measures = dimensions["Chỉ tiêu"]["category"]
    measure_id = next(key for key, label in measures["label"].items() if label == "Dân số trung bình (Nghìn người)")
    measure_index = measures["index"][measure_id]
    records = []
    for area_id, area_name in area["label"].items():
        if area_name not in labels:
            continue  # The source also contains six regional totals.
        index = area["index"][area_id] * dimensions["size"][2] + measure_index
        raw = Decimal(payload["value"][index])
        people = int((raw * 1000).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
        records.append({"code": labels[area_name], "people": people})
    if year != 2025 or len(records) != len(labels) or {item["code"] for item in records} != set(labels.values()):
        raise ValueError("Population coverage or reporting year differs from the expected table")
    return {
        "year": year,
        "method": "PX-Web table PL.V02.01. National and provincial values were mapped to official codes and converted from thousands of people to the nearest person.",
        "limitations": "Annual average estimates for 2025 in the 34-province statistical appendix. Commune-level estimates are unavailable in this table.",
        "values": sorted(records, key=lambda item: item["code"]),
    }


def write_json(directory, filename, payload, compressed=False):
    encoded = (json.dumps(payload, ensure_ascii=False, separators=(",", ":") if compressed else None,
                          indent=None if compressed else 2) + "\n").encode("utf-8")
    content = gzip.compress(encoded, mtime=0) if compressed else encoded
    (directory / filename).write_bytes(content)
    return sha256(content).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("administration", type=Path)
    parser.add_argument("boundaries", type=Path)
    parser.add_argument("population", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    administration, provinces = prepare_administration(args.administration)
    boundaries = prepare_boundaries(args.boundaries, provinces)
    population = prepare_population(args.population, provinces)
    args.output.mkdir(parents=True, exist_ok=True)
    for filename, payload, compressed in (
        ("administration.json", administration, False),
        ("province-boundaries.json.gz", boundaries, True),
        ("population-2025.json", population, False),
    ):
        print(write_json(args.output, filename, payload, compressed), filename)


if __name__ == "__main__":
    main()
