#!/usr/bin/env python3
"""
demo_bank/names_experiment.py: Test harness for Indian Name Tokenisation.

Evaluates 40 typical Indian names (12 existing multi-word + single-word and regional names)
across 4 different payload phrasing formats through Aran Cloud's real /v1/protect endpoint.
Prints an honest tokenisation rate table and reports the best performing format.
"""

import argparse
import json
import os
import re
import sqlite3
import sys
import time
from typing import Dict, List, Tuple
import requests

CLOUD_URL = os.environ.get("ARAN_CLOUD_URL", "http://127.0.0.1:8100")

# 40 Typical Indian Names (12 from original seed + single-word & diverse regional names)
NAMES = [
    # 12 from before
    "Aarav Sharma",
    "Priya Patel",
    "Vikram Malhotra",
    "Ananya Deshmukh",
    "Rajesh Iyer",
    "Meera Nair",
    "Amitabh Verma",
    "Sunita Rao",
    "Kavita Reddy",
    "Rohan Gupta",
    "Siddharth Joshi",
    "Deepa Menon",
    # Single-word names
    "Rahul",
    "Pooja",
    "Arun",
    "Suresh",
    "Lakshmi",
    "Karthik",
    "Sneha",
    "Anil",
    "Deepak",
    "Vijay",
    "Anita",
    "Divya",
    "Ganesh",
    "Manoj",
    # Regional & multi-word names
    "Ramesh Kumar",
    "Sanjay Mehta",
    "Pooja Hegde",
    "Naveen Patnaik",
    "Swati Kulkarni",
    "Ashok Singhal",
    "Geeta Phogat",
    "Manish Sisodia",
    "Harish Salve",
    "Sangeeta Bhatia",
    "Preeti Shenoy",
    "Kunal Kamra",
    "Alok Nath",
    "Neha Dhupia",
]

DUMMY_MOBILE = "9123456789"
DUMMY_AADHAAR = "999912345678"
DUMMY_CARD = "4111111111111111"


def get_api_key(passed_key: str = None) -> str:
    if passed_key:
        return passed_key
    if os.environ.get("ARAN_API_KEY"):
        return os.environ["ARAN_API_KEY"]

    # Try .env.local
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    env_local = os.path.join(repo_root, ".env.local")
    if os.path.exists(env_local):
        with open(env_local) as f:
            for line in f:
                if line.startswith("ARAN_API_KEY="):
                    return line.strip().split("=", 1)[1]

    # Create workspace on the fly if needed
    try:
        r = requests.post(
            f"{CLOUD_URL}/v1/workspaces",
            json={"name": "Names Experiment Workspace", "email": f"names_eval_{int(time.time())}@test.com"},
            timeout=5,
        )
        if r.status_code == 200:
            return r.json().get("admin_key") or r.json().get("api_key")
    except Exception:
        pass

    return "aran_live_feba8af0c584b553aacec186201c34fc"


def format_payload(format_idx: int, name: str) -> str:
    if format_idx == 1:
        return f"Customer name: {name}"
    elif format_idx == 2:
        return f"Name: {name}, Mobile: {DUMMY_MOBILE}, Aadhaar: {DUMMY_AADHAAR}"
    elif format_idx == 3:
        return json.dumps({
            "name": name,
            "mobile": DUMMY_MOBILE,
            "aadhaar": DUMMY_AADHAAR,
            "card": DUMMY_CARD,
        })
    elif format_idx == 4:
        return f"Account holder {name} opened an account"
    raise ValueError(f"Unknown format index {format_idx}")


def run_experiment(api_key: str) -> Dict[str, any]:
    print("================================================================================")
    print(" Indian Name Tokenisation Experiment (40 Typical Names x 4 Formats)")
    print(" Core Detector: Preserved (No modifications to core NER/Regex)")
    print(" Endpoint:      POST /v1/protect")
    print("================================================================================")

    formats = [
        (1, "Customer name: <Name>"),
        (2, "Name: <Name>, Mobile: <m>, Aadhaar: <a>"),
        (3, 'JSON string {"name": ...}'),
        (4, "Account holder <Name> opened an account"),
    ]

    results = []  # list of dict per name
    format_counts = {1: 0, 2: 0, 3: 0, 4: 0}

    session = requests.Session()
    headers = {"X-API-Key": api_key, "Content-Type": "application/json"}

    for idx, name in enumerate(NAMES, start=1):
        name_res = {"id": idx, "name": name, "scores": {}}
        for f_idx, _ in formats:
            text = format_payload(f_idx, name)
            try:
                resp = session.post(
                    f"{CLOUD_URL}/v1/protect",
                    headers=headers,
                    json={
                        "text": text,
                        "customer_ref": None,
                        "purpose": "KYC",
                        "sink": "kyc-archive",
                    },
                    timeout=5,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    findings = data.get("findings", [])
                    after = data.get("after", "")
                    # Tokenised if PER finding detected OR name replaced in after text
                    has_per_finding = any(f.get("type") == "PER" for f in findings)
                    raw_in_after = name in after
                    tokenised = has_per_finding or not raw_in_after

                    if tokenised:
                        format_counts[f_idx] += 1
                        name_res["scores"][f_idx] = True
                    else:
                        name_res["scores"][f_idx] = False
                else:
                    name_res["scores"][f_idx] = False
            except Exception as e:
                name_res["scores"][f_idx] = False

        results.append(name_res)

    # Print Table
    print("\n" + "-" * 90)
    print(f"{'#':<3} | {'Name':<22} | {'F1: Cust name':<14} | {'F2: Name,Mob,Aad':<16} | {'F3: JSON':<10} | {'F4: Acct holder':<15}")
    print("-" * 90)

    for r in results:
        f1_str = "✔ Protected" if r["scores"][1] else "✗ Raw"
        f2_str = "✔ Protected" if r["scores"][2] else "✗ Raw"
        f3_str = "✔ Protected" if r["scores"][3] else "✗ Raw"
        f4_str = "✔ Protected" if r["scores"][4] else "✗ Raw"
        print(f"{r['id']:<3} | {r['name']:<22} | {f1_str:<14} | {f2_str:<16} | {f3_str:<10} | {f4_str:<15}")

    print("-" * 90)
    total_names = len(NAMES)
    f1_pct = (format_counts[1] / total_names) * 100
    f2_pct = (format_counts[2] / total_names) * 100
    f3_pct = (format_counts[3] / total_names) * 100
    f4_pct = (format_counts[4] / total_names) * 100

    print(f"{'TOTAL':<3} | {f'{total_names} Names Tested':<22} | {format_counts[1]}/{total_names} ({f1_pct:.1f}%) | {format_counts[2]}/{total_names} ({f2_pct:.1f}%)   | {format_counts[3]}/{total_names} ({f3_pct:.1f}%) | {format_counts[4]}/{total_names} ({f4_pct:.1f}%)")
    print("-" * 90)

    rates = {
        1: (f1_pct, format_counts[1], "Customer name: <Name>"),
        2: (f2_pct, format_counts[2], "Name: <Name>, Mobile: <m>, Aadhaar: <a>"),
        3: (f3_pct, format_counts[3], 'JSON string {"name": ...}'),
        4: (f4_pct, format_counts[4], "Account holder <Name> opened an account"),
    }

    best_idx = max(rates.keys(), key=lambda k: rates[k][0])
    best_rate, best_count, best_desc = rates[best_idx]

    print("\n================================================================================")
    print(f" EXPERIMENT CONCLUSION:")
    print(f" Best Format: Format {best_idx} -> '{best_desc}'")
    print(f" Tokenisation Success Rate: {best_count}/{total_names} ({best_rate:.1f}%)")
    print("================================================================================\n")

    return {
        "rates": rates,
        "best_idx": best_idx,
        "best_desc": best_desc,
        "best_rate": best_rate,
        "counts": format_counts,
        "total": total_names,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test Indian name tokenisation across formats")
    parser.add_argument("--api-key", help="Aran Cloud API key", default=None)
    args = parser.parse_args()

    key = get_api_key(args.api_key)
    run_experiment(key)
