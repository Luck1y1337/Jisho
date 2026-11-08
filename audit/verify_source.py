"""Recheck the raw vocabulary transcription against the supplied PDF.

Run: python audit/verify_source.py
Requires: pymupdf. Does not modify the source or PDF.
Character counts detect missing/added characters, not semantic correctness or order.
The accompanying Markdown report records the separate visual review.
"""
from collections import Counter
import hashlib
import json
from pathlib import Path
import re

import pymupdf

ROOT = Path(__file__).resolve().parents[1]
PDF = Path(r"C:\Users\Luck1y\Downloads\Telegram Desktop\Minna no Nihongo 1.pdf")
SOURCE = ROOT / "MINNA_25_LESSONS_VOCAB_SOURCE.md"


def check():
    source = SOURCE.read_text(encoding="utf-8")
    doc = pymupdf.open(PDF)
    sections = re.findall(
        r"### Страница PDF (\d+)\s+```text\n(.*?)\n```", source, re.S
    )
    expected = [n for start in range(28, 173, 6) for n in (start, start + 1)]
    expected.insert(expected.index(95) + 1, 96)
    assert [int(n) for n, _ in sections] == expected, "Page coverage/order differs"
    assert len(doc) == 206
    assert re.findall(r"^## Урок (\d+)$", source, re.M) == [str(n) for n in range(1, 26)]
    results = []
    for number, transcription in sections:
        page_number = int(number)
        text = doc[page_number - 1].get_text(sort=False)
        if "Yangi so" in text:
            text = re.sub(r"^.*?Ⅰ[.．]\s*Yangi so.zlar\s*", "", text, flags=re.S)
        text = re.split(r"Ⅱ\.\s*Tarjima", text)[0]
        left = Counter(re.sub(r"\s", "", transcription))
        right = Counter(re.sub(r"\s", "", text))
        results.append({
            "pdfPage": page_number,
            "nonWhitespaceCharacters": sum(left.values()),
            "characterInventoryMatches": left == right,
            "onlyInMarkdown": dict(left - right),
            "onlyInPdfText": dict(right - left),
        })
    result = {
        "pdf": str(PDF),
        "pdfSha256": hashlib.sha256(PDF.read_bytes()).hexdigest(),
        "sourceSha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        "pdfPages": len(doc),
        "lessons": 25,
        "vocabularyPages": len(results),
        "method": "character multiset excluding whitespace and section headings; visual review is separate",
        "allCharacterInventoriesMatch": all(r["characterInventoryMatches"] for r in results),
        "pages": results,
    }
    target = ROOT / "audit" / "source-check.json"
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    assert result["allCharacterInventoriesMatch"], "Transcription differs from PDF text"
    print(f"PASS: 25 lessons, {len(results)} vocabulary pages, 206 PDF pages")
    print(f"PDF SHA-256: {result['pdfSha256']}")


if __name__ == "__main__":
    check()
