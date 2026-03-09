from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]

REQUIRED_FILES = {
    "index.html": [
        'data-page="home"',
        "/auth/",
        'data-home-groups',
        'src/pages/home.js',
        'src/shared/seo.js',
        'name="description"',
        'rel="icon"',
        "Скоро будет реализован анонимный чат",
        "Партнеры",
        "/media/head_logo_fasie.png",
    ],
    "auth/index.html": [
        'data-page="auth"',
        'data-auth-page',
        'src/pages/auth.js',
        "noindex,follow",
    ],
    "auth/callback/index.html": ['data-auth-callback-page', 'src/pages/auth-callback.js'],
    "test/index.html": ['data-page="test"', 'data-test-layout', 'src/pages/test.js'],
    "result/index.html": ['data-page="result"', 'data-result-page', 'src/pages/result.js'],
    "types/index.html": ['data-page="types"', 'data-types-grid', 'src/pages/types.js'],
    "groups/index.html": ['data-page="groups"', 'data-groups-grid', 'src/pages/groups.js'],
    "chat/index.html": ['data-page="chat"', "Анонимный чат"],
    "types/template/index.html": ['data-page="types"', "Шаблон типа MBTI"],
    "src/shared/shell.js": ['key: "auth"', 'href: "/auth/"'],
    "src/shared/seo.js": ["updateSeoMetadata", "og:title", "application/ld+json"],
    "src/styles/pages/auth.css": [".auth-layout", ".auth-summary-grid", ".auth-message", ".auth-helper-page"],
    "robots.txt": ["User-agent: *", "GPTBot", "OAI-SearchBot"],
    "llms.txt": ["# АнонЧ", "## Основные страницы"],
    "site.webmanifest": ['"short_name": "АнонЧ"', '"/media/logo.png"'],
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
