from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]

REQUIRED_FILES = {
    "index.html": [
        'data-page="home"',
        "/auth/",
        'data-home-groups',
        'src/pages/home.js',
        "Скоро будет реализован анонимный чат",
    ],
    "auth/index.html": [
        'data-page="auth"',
        'data-auth-page',
        'src/pages/auth.js',
    ],
    "auth/callback/index.html": ['data-auth-callback-page', 'src/pages/auth-callback.js'],
    "auth/yandex/token/index.html": ['data-yandex-token-page', 'src/pages/yandex-token.js'],
    "test/index.html": ['data-page="test"', 'data-test-layout', 'src/pages/test.js'],
    "result/index.html": ['data-page="result"', 'data-result-page', 'src/pages/result.js'],
    "types/index.html": ['data-page="types"', 'data-types-grid', 'src/pages/types.js'],
    "groups/index.html": ['data-page="groups"', 'data-groups-grid', 'src/pages/groups.js'],
    "chat/index.html": ['data-page="chat"', "Анонимный чат"],
    "types/template/index.html": ['data-page="types"', "Универсальный шаблон"],
    "src/shared/shell.js": ['key: "auth"', 'href: "/auth/"'],
    "src/styles/pages/auth.css": [".auth-layout", ".auth-summary-grid", ".auth-message", ".auth-helper-page"],
}


def assert_contains(path: Path, markers: list[str]) -> list[str]:
    content = path.read_text(encoding="utf-8")
    return [marker for marker in markers if marker not in content]


def main() -> None:
    errors: list[str] = []

    for relative_path, markers in REQUIRED_FILES.items():
        path = ROOT / relative_path

        if not path.exists():
            errors.append(f"Missing file: {relative_path}")
            continue

        missing_markers = assert_contains(path, markers)

        if missing_markers:
            joined_markers = ", ".join(missing_markers)
            errors.append(f"Missing markers in {relative_path}: {joined_markers}")

    if errors:
        raise SystemExit("\n".join(errors))

    print("Static UI smoke checks passed.")


if __name__ == "__main__":
    main()
