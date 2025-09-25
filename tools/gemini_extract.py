import os
import sys
import json
from typing import List, Dict, Any


def read_first_page_text(pdf_path: str) -> str:
    try:
        from pypdf import PdfReader
    except Exception as e:
        raise RuntimeError("pypdf is required. Please install with: pip install pypdf") from e

    reader = PdfReader(pdf_path)
    if len(reader.pages) == 0:
        return ""
    first_page = reader.pages[0]
    try:
        text = first_page.extract_text() or ""
    except Exception:
        text = ""
    return text.strip()


def build_extraction_schema() -> Dict[str, Any]:
    # JSON schema aligned with extracted_metadata and thesis core needs
    return {
        "type": "object",
        "properties": {
            "title": {
                "type": "object",
                "properties": {
                    "fr": {"type": "string", "nullable": True},
                    "en": {"type": "string", "nullable": True},
                    "ar": {"type": "string", "nullable": True}
                },
                "required": []
            },
            "thesis_number": {"type": "string", "nullable": True},
            "institutions": {
                "type": "object",
                "properties": {
                    "university": {"type": "string", "nullable": True},
                    "faculty": {"type": "string", "nullable": True},
                    "school": {"type": "string", "nullable": True},
                    "department": {"type": "string", "nullable": True}
                },
                "required": []
            },
            "author": {
                "type": "object",
                "properties": {
                    "full_name": {"type": "string", "nullable": True},
                    "first_name": {"type": "string", "nullable": True},
                    "last_name": {"type": "string", "nullable": True},
                    "birth_date": {"type": "string", "nullable": True, "description": "YYYY-MM-DD if present"},
                    "birth_place": {"type": "string", "nullable": True}
                },
                "required": []
            },
            "committee": {
                "type": "object",
                "properties": {
                    "director": {
                        "type": "object",
                        "properties": {
                            "full_name": {"type": "string", "nullable": True},
                            "first_name": {"type": "string", "nullable": True},
                            "last_name": {"type": "string", "nullable": True}
                        },
                        "required": []
                    },
                    "co_director": {
                        "type": "object",
                        "properties": {
                            "full_name": {"type": "string", "nullable": True},
                            "first_name": {"type": "string", "nullable": True},
                            "last_name": {"type": "string", "nullable": True}
                        },
                        "required": []
                    },
                    "jury_members": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "full_name": {"type": "string", "nullable": True},
                                "role": {"type": "string", "nullable": True}
                            },
                            "required": []
                        }
                    }
                },
                "required": []
            },
            "degree": {"type": "string", "nullable": True},
            "defense_date": {"type": "string", "nullable": True, "description": "YYYY-MM-DD if available"},
            "language": {"type": "string", "nullable": True, "description": "Primary language code if present"},
            "secondary_languages": {"type": "array", "items": {"type": "string"}},
            "keywords": {
                "type": "object",
                "properties": {
                    "fr": {"type": "string", "nullable": True},
                    "en": {"type": "string", "nullable": True},
                    "ar": {"type": "string", "nullable": True}
                },
                "required": []
            }
        },
        "required": []
    }


def build_prompt(first_page_text: str) -> str:
    instructions = (
        "Extract thesis metadata from the first page text."
        " If multiple languages appear, prefer the language of the title for title fields,"
        " and return other languages in their respective fields when obvious."
        " Normalize dates to YYYY-MM-DD when full date is present; otherwise return null."
        " Only return fields you are confident about; leave others null."
        " Roles examples: director, co-director, rapporteur, president, examiner."
        " Return JSON only."
    )
    return f"{instructions}\n\n---\nTEXT:\n{first_page_text}\n---"


def call_gemini(prompt: str, schema: Dict[str, Any]) -> Dict[str, Any]:
    try:
        import google.generativeai as genai
    except Exception as e:
        raise RuntimeError("google-generativeai is required. Install with: pip install google-generativeai") from e

    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY environment variable is not set")

    genai.configure(api_key=api_key)

    # Use the responses API with a JSON schema
    model = genai.GenerativeModel(
        model_name="gemini-1.5-pro",
        generation_config={
            "response_mime_type": "application/json",
            "response_schema": schema,
            "temperature": 0.2,
        },
    )
    response = model.generate_content(prompt)
    text = response.text or "{}"
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Sometimes the SDK returns candidates with .candidates[0].content.parts
        try:
            return json.loads(response.candidates[0].content.parts[0].text)
        except Exception as inner:
            raise RuntimeError(f"Failed to parse JSON response: {text}") from inner


def validate_minimal(output: Dict[str, Any]) -> List[str]:
    errors: List[str] = []
    # Minimal checks aligning with DB expectations
    if not isinstance(output, dict):
        errors.append("Output is not an object")
        return errors
    # Optional but check types when present
    def check_path(path: str, expected_type: type):
        parts = path.split(".")
        node: Any = output
        for p in parts:
            if not isinstance(node, dict) or p not in node:
                return
            node = node[p]
        if node is not None and not isinstance(node, expected_type):
            errors.append(f"{path} should be {expected_type.__name__}")

    check_path("title.fr", str)
    check_path("title.en", str)
    check_path("title.ar", str)
    check_path("institutions.university", str)
    check_path("institutions.faculty", str)
    check_path("institutions.school", str)
    check_path("institutions.department", str)
    check_path("author.full_name", str)
    check_path("committee.director.full_name", str)
    check_path("committee.co_director.full_name", str)
    if "committee" in output and isinstance(output["committee"], dict) and "jury_members" in output["committee"]:
        if not isinstance(output["committee"]["jury_members"], list):
            errors.append("committee.jury_members should be array")
    return errors


def main(argv: List[str]) -> int:
    if len(argv) < 2:
        print("Usage: python tools/gemini_extract.py <pdf_path> [<pdf_path> ...]", file=sys.stderr)
        return 2

    schema = build_extraction_schema()
    results: Dict[str, Any] = {}
    for pdf in argv[1:]:
        text = read_first_page_text(pdf)
        prompt = build_prompt(text)
        try:
            output = call_gemini(prompt, schema)
            errors = validate_minimal(output)
            results[pdf] = {
                "ok": len(errors) == 0,
                "errors": errors,
                "extracted_preview": {
                    "title": output.get("title"),
                    "author": output.get("author"),
                    "institutions": output.get("institutions"),
                    "degree": output.get("degree"),
                    "defense_date": output.get("defense_date"),
                },
                "full": output,
            }
        except Exception as e:
            results[pdf] = {"ok": False, "errors": [str(e)], "extracted_preview": None}

    print(json.dumps(results, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))

