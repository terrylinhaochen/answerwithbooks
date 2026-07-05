#!/usr/bin/env python3
import json
import sys
from pathlib import Path

from pypdf import PdfReader


def main():
    if len(sys.argv) != 3:
        print("usage: extract-pdf-text.py input.pdf output.txt", file=sys.stderr)
        return 2

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    reader = PdfReader(str(input_path))
    pages = []
    for index, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        pages.append(f"\n\n--- Page {index} ---\n\n{text.strip()}")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("".join(pages).strip() + "\n", encoding="utf-8")
    print(json.dumps({"pages": len(reader.pages), "output": str(output_path)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
