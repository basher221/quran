#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Replace Quran ayah text in offline-data/quran-uthmani.json from surahquran.com."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


def ensure_deps() -> None:
    try:
        import requests  # noqa: F401
        from bs4 import BeautifulSoup  # noqa: F401
    except Exception:
        import subprocess

        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "requests", "beautifulsoup4"]
        )


ensure_deps()

import requests
from bs4 import BeautifulSoup


PROJECT_ROOT = Path(__file__).resolve().parent
JSON_PATH = PROJECT_ROOT / "offline-data" / "quran-uthmani.json"
SURAH_URL = "https://surahquran.com/quran-search/sorah-{surah}.html"

ARABIC_TO_WESTERN = str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789")


def normalize_text(text: str) -> str:
    return " ".join((text or "").split()).strip()


def extract_ayah_items_from_html(html: str) -> dict[int, str]:
    soup = BeautifulSoup(html, "html.parser")
    ayahs: dict[int, str] = {}

    # Primary extraction: anchors usually contain "text(number)"
    for a in soup.find_all("a", href=True):
        text = normalize_text(a.get_text(" ", strip=True))
        if not text:
            continue
        m = re.search(r"^(?P<txt>.+?)\((?P<num>[0-9٠-٩]+)\)$", text)
        if not m:
            continue
        num = int(m.group("num").translate(ARABIC_TO_WESTERN))
        ayah_text = normalize_text(m.group("txt"))
        if ayah_text and num not in ayahs:
            ayahs[num] = ayah_text

    # Fallback extraction from plain text fragments
    if not ayahs:
        for elem in soup.find_all(["td", "p", "div", "span"]):
            text = normalize_text(elem.get_text(" ", strip=True))
            if not text:
                continue
            m = re.search(r"^(?P<txt>.+?)\((?P<num>[0-9٠-٩]+)\)$", text)
            if not m:
                continue
            num = int(m.group("num").translate(ARABIC_TO_WESTERN))
            ayah_text = normalize_text(m.group("txt"))
            if ayah_text and num not in ayahs:
                ayahs[num] = ayah_text

    return ayahs


def fetch_surah_ayahs(surah_number: int) -> dict[int, str]:
    url = SURAH_URL.format(surah=surah_number)
    response = requests.get(
        url,
        timeout=30,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            )
        },
    )
    response.raise_for_status()
    response.encoding = "utf-8"
    ayahs = extract_ayah_items_from_html(response.text)
    return ayahs


def main() -> None:
    if not JSON_PATH.exists():
        raise FileNotFoundError(f"Missing file: {JSON_PATH}")

    with JSON_PATH.open("r", encoding="utf-8") as f:
        payload = json.load(f)

    # Supports both shapes:
    # - {"code":..., "status":..., "data":{"surahs":[...]}}
    # - {"quran":[...]}
    if isinstance(payload, dict) and "data" in payload and "surahs" in payload["data"]:
        surahs = payload["data"]["surahs"]
    elif isinstance(payload, dict) and "quran" in payload:
        surahs = payload["quran"]
    else:
        raise ValueError("Unsupported Quran JSON shape.")

    if len(surahs) != 114:
        raise ValueError(f"Expected 114 surahs, found {len(surahs)}")

    sample_before = ""
    sample_after = ""

    for idx, surah in enumerate(surahs, start=1):
        existing_ayahs = surah.get("ayahs", [])
        expected_count = len(existing_ayahs)
        if expected_count == 0:
            raise ValueError(f"Surah {idx} has zero ayahs in existing JSON.")

        fetched = fetch_surah_ayahs(idx)

        if len(fetched) != expected_count:
            keys = sorted(fetched.keys())
            raise ValueError(
                f"Ayah count mismatch at surah {idx}: expected {expected_count}, "
                f"fetched {len(fetched)}. Fetched keys sample: {keys[:15]}"
            )

        for ayah in existing_ayahs:
            # Existing files can use either numberInSurah or ayah
            num = ayah.get("numberInSurah", ayah.get("ayah"))
            if not isinstance(num, int):
                raise ValueError(f"Invalid ayah number type at surah {idx}: {num!r}")
            if num not in fetched:
                raise ValueError(f"Missing ayah {num} for surah {idx} from source.")

            if idx == 1 and num == 1:
                sample_before = ayah.get("text", "")
                sample_after = fetched[num]

            ayah["text"] = fetched[num]

        print(f"Surah {idx:03d}: OK ({expected_count} ayahs)")

    with JSON_PATH.open("w", encoding="utf-8", newline="\n") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))

    # Final sanity check
    with JSON_PATH.open("r", encoding="utf-8") as f:
        verify = json.load(f)

    if "data" in verify and "surahs" in verify["data"]:
        verify_surahs = verify["data"]["surahs"]
    elif "quran" in verify:
        verify_surahs = verify["quran"]
    else:
        raise ValueError("Post-write JSON shape invalid.")

    if len(verify_surahs) != 114:
        raise ValueError("Post-write verification failed: surah count not 114.")

    print("\nDone.")
    print("Updated: yes")
    print("Mismatches: none")
    print(f"Sample Surah 1 Ayah 1 before: {sample_before}")
    print(f"Sample Surah 1 Ayah 1 after : {sample_after}")


if __name__ == "__main__":
    main()
