"""
Prepare bilingual (AR/EN) instruction-tuning dataset (.jsonl) from
academy-permitted course materials stored in ./starter_data/.
"""
import json
from pathlib import Path

STARTER_DIR = Path(__file__).parent / "starter_data"
OUTPUT_FILE = Path(__file__).parent / "dataset.jsonl"


def extract_text(path: Path) -> str:
    if path.suffix.lower() == ".pdf":
        from pypdf import PdfReader
        reader = PdfReader(str(path))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    return path.read_text(encoding="utf-8", errors="ignore")


def chunk_text(text: str, max_chars: int = 1800) -> list[str]:
    paragraphs = [p.strip() for p in text.split("\n\n") if len(p.strip()) > 60]
    chunks, current = [], ""
    for para in paragraphs:
        if len(current) + len(para) > max_chars and current:
            chunks.append(current.strip())
            current = para
        else:
            current = f"{current}\n\n{para}".strip()
    if current:
        chunks.append(current.strip())
    return chunks


def detect_lang(text: str) -> str:
    arabic_chars = sum(1 for c in text if "\u0600" <= c <= "\u06FF")
    return "ar" if arabic_chars > len(text) * 0.15 else "en"


def main():
    STARTER_DIR.mkdir(parents=True, exist_ok=True)
    files = list(STARTER_DIR.glob("*.pdf")) + list(STARTER_DIR.glob("*.txt")) + list(STARTER_DIR.glob("*.md"))

    if not files:
        print(f"Place permitted PDF/TXT/MD course materials in {STARTER_DIR} and re-run.")
        return

    records = []
    for file in files:
        raw = extract_text(file)
        for idx, chunk in enumerate(chunk_text(raw)):
            lang = detect_lang(chunk)
            instruction = (
                "أنشئ أسئلة اختيار من متعدد بتنسيق JSON من نص الدرس التالي."
                if lang == "ar"
                else "Generate multiple-choice questions (MCQ) in strict JSON from the following lesson text."
            )
            records.append({
                "source": file.name,
                "chunk_index": idx,
                "lang": lang,
                "instruction": instruction,
                "input": chunk,
                "output": json.dumps({"questions": []}, ensure_ascii=False),
            })

    with OUTPUT_FILE.open("w", encoding="utf-8") as f:
        for rec in records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    print(f"Prepared {len(records)} training chunks -> {OUTPUT_FILE}")
    print("Next: populate verified reference MCQ JSON outputs and run train_qlora.py.")


if __name__ == "__main__":
    main()

