import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "public" / "data"
TYPE_PAGE_DIR = ROOT / "types"


def load_json(name: str) -> dict:
    path = DATA_DIR / f"{name}.json"
    return json.loads(path.read_text(encoding="utf-8"))


def assert_true(condition: bool, message: str, errors: list[str]) -> None:
    if not condition:
        errors.append(message)


def validate_questions(data: dict, errors: list[str]) -> None:
    items = data.get("items", [])
    valid_letters = {"E", "I", "S", "N", "T", "F", "J", "P"}

    assert_true(len(items) == 22, "questions.json: должно быть 22 вопроса", errors)

    seen_ids: set[str] = set()
    for item in items:
        question_id = item.get("id")
        assert_true(bool(question_id), "questions.json: у вопроса отсутствует id", errors)
        if question_id in seen_ids:
            errors.append(f"questions.json: повторяющийся id вопроса {question_id}")
        seen_ids.add(question_id)

        options = item.get("options", [])
        assert_true(len(options) == 4, f"questions.json: у {question_id} должно быть 4 варианта", errors)

        for option in options:
            weights = option.get("weights", {})
            assert_true(bool(weights), f"questions.json: у {option.get('id')} нет weights", errors)
            assert_true(
                set(weights).issubset(valid_letters),
                f"questions.json: у {option.get('id')} есть неизвестные буквы в weights",
                errors,
            )
            assert_true(
                all(isinstance(value, int) and value > 0 for value in weights.values()),
                f"questions.json: у {option.get('id')} все веса должны быть положительными целыми",
                errors,
            )


def validate_categories(data: dict, type_codes: set[str], errors: list[str]) -> None:
    items = data.get("items", [])
    assert_true(len(items) == 4, "categories.json: должно быть 4 группы", errors)

    seen_codes: set[str] = set()
    total_types = 0
    for item in items:
        code = item.get("code")
        assert_true(bool(code), "categories.json: у группы отсутствует code", errors)
        if code in seen_codes:
            errors.append(f"categories.json: повторяющийся code группы {code}")
        seen_codes.add(code)

        members = item.get("types", [])
        total_types += len(members)
        for member in members:
            assert_true(
                member in type_codes,
                f"categories.json: неизвестный тип {member} в группе {code}",
                errors,
            )

    assert_true(total_types == 16, "categories.json: суммарно в группах должно быть 16 типов", errors)


def validate_types(data: dict, category_codes: set[str], errors: list[str]) -> list[str]:
    required_fields = {
        "code",
        "fullName",
        "group",
        "shortDescription",
        "strengths",
        "weaknesses",
        "friendship",
        "romance",
        "workStyle",
        "giftIdeas",
        "communicationTips",
        "growthAdvice",
        "difficultMatches",
        "strongMatches",
    }
    items = data.get("items", [])
    order = data.get("order", [])
    assert_true(len(items) == 16, "types.json: должно быть 16 типов", errors)
    assert_true(len(order) == 16, "types.json: order должен содержать 16 кодов", errors)

    codes: list[str] = []
    for item in items:
        code = item.get("code")
        codes.append(code)
        missing = required_fields - set(item)
        if missing:
            errors.append(f"types.json: у {code} отсутствуют поля {sorted(missing)}")

        assert_true(item.get("group") in category_codes, f"types.json: у {code} неизвестная группа", errors)

        for key in ("strengths", "weaknesses", "giftIdeas", "communicationTips", "growthAdvice"):
            value = item.get(key, [])
            assert_true(
                isinstance(value, list) and len(value) >= 3,
                f"types.json: у {code} поле {key} должно быть списком минимум из 3 пунктов",
                errors,
            )

        for key in ("friendship", "romance", "workStyle", "shortDescription"):
            value = item.get(key, "")
            assert_true(
                isinstance(value, str) and value.strip(),
                f"types.json: у {code} поле {key} должно быть непустой строкой",
                errors,
            )

    unique_codes = set(codes)
    assert_true(len(unique_codes) == 16, "types.json: коды типов должны быть уникальны", errors)
    assert_true(set(order) == unique_codes, "types.json: order должен совпадать с кодами типов", errors)

    for item in items:
        code = item["code"]
        for relation in ("strongMatches", "difficultMatches"):
            matches = item.get(relation, [])
            assert_true(
                isinstance(matches, list) and len(matches) >= 2,
                f"types.json: у {code} поле {relation} должно быть списком минимум из 2 кодов",
                errors,
            )
            for match in matches:
                assert_true(
                    match in unique_codes and match != code,
                    f"types.json: у {code} в {relation} недопустимое значение {match}",
                    errors,
                )

    return codes


def validate_compatibility(data: dict, type_codes: list[str], errors: list[str]) -> None:
    order = data.get("order", [])
    matrix = data.get("matrix", {})
    pair_notes = data.get("pairNotes", {})

    assert_true(order == type_codes, "compatibility.json: order должен совпадать с types.json", errors)
    assert_true(set(matrix) == set(type_codes), "compatibility.json: матрица должна содержать все 16 строк", errors)

    for left in type_codes:
        row = matrix.get(left, {})
        assert_true(set(row) == set(type_codes), f"compatibility.json: строка {left} должна содержать все 16 столбцов", errors)
        for right, score in row.items():
            assert_true(
                isinstance(score, int) and 1 <= score <= 7,
                f"compatibility.json: значение {left}/{right} должно быть целым от 1 до 7",
                errors,
            )
            assert_true(
                matrix.get(right, {}).get(left) == score,
                f"compatibility.json: матрица несимметрична для пары {left}/{right}",
                errors,
            )

    for pair, note in pair_notes.items():
        left, right = pair.split(":")
        assert_true(left in type_codes and right in type_codes, f"compatibility.json: неизвестная пара {pair}", errors)
        assert_true(left != right, f"compatibility.json: пара {pair} не должна ссылаться на один тип", errors)
        assert_true(
            isinstance(note.get("text"), str) and note["text"].strip(),
            f"compatibility.json: у пары {pair} отсутствует текст пояснения",
            errors,
        )


def validate_ui_copy(data: dict, type_codes: list[str], errors: list[str]) -> None:
    preview = data.get("resultPreview", {})
    profiles = preview.get("profiles", {})
    assert_true(preview.get("defaultType") in type_codes, "ui-copy.json: defaultType должен быть валидным кодом", errors)
    assert_true(set(profiles) == set(type_codes), "ui-copy.json: profiles должны быть определены для всех 16 типов", errors)


def validate_type_pages(type_codes: list[str], errors: list[str]) -> None:
    for code in type_codes:
        path = TYPE_PAGE_DIR / code.lower() / "index.html"
        assert_true(path.exists(), f"Отсутствует страница типа {code}: {path.relative_to(ROOT)}", errors)


def main() -> None:
    errors: list[str] = []

    questions = load_json("questions")
    categories = load_json("categories")
    types = load_json("types")
    compatibility = load_json("compatibility")
    ui_copy = load_json("ui-copy")

    category_codes = {item["code"] for item in categories["items"]}
    type_codes = validate_types(types, category_codes, errors)
    validate_questions(questions, errors)
    validate_categories(categories, set(type_codes), errors)
    validate_compatibility(compatibility, type_codes, errors)
    validate_ui_copy(ui_copy, type_codes, errors)
    validate_type_pages(type_codes, errors)

    if errors:
        raise SystemExit("\n".join(errors))

    print("Data layer checks passed.")


if __name__ == "__main__":
    main()
