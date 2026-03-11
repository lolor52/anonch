from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]

FORBIDDEN_FILES = [
    ROOT / "package.json",
    ROOT / "package-lock.json",
    ROOT / "playwright.config.js",
    ROOT / "tests" / "unit" / "auth-manager.test.mjs",
    ROOT / "tests" / "unit" / "provider-adapters.test.mjs",
    ROOT / "tests" / "unit" / "mbti-engine.test.mjs",
    ROOT / "tests" / "unit" / "mbti-service.test.mjs",
    ROOT / "tests" / "e2e" / "auth.spec.js",
    ROOT / "tests" / "e2e" / "catalog.spec.js",
    ROOT / "tests" / "e2e" / "guards.spec.js",
    ROOT / "tests" / "e2e" / "mbti.spec.js",
    ROOT / "tests" / "e2e" / "helpers" / "app.js",
    ROOT / "tools" / "run-visual-check.mjs",
    ROOT / "tools" / "visual-check.mjs",
    ROOT / "src" / "pages" / "yandex-token.js",
    ROOT / "auth" / "yandex" / "token" / "index.html",
    ROOT / "auth" / "index.html",
    ROOT / "auth" / "callback" / "index.html",
    ROOT / "src" / "config" / "auth-providers.js",
    ROOT / "src" / "pages" / "auth.js",
    ROOT / "src" / "pages" / "auth-callback.js",
    ROOT / "src" / "styles" / "pages" / "auth.css",
    ROOT / "src" / "features" / "auth" / "auth-manager.js",
    ROOT / "src" / "features" / "auth" / "auth-modal.js",
    ROOT / "src" / "features" / "auth" / "auth-store.js",
    ROOT / "src" / "features" / "auth" / "page-guard.js",
    ROOT / "src" / "features" / "auth" / "profile-utils.js",
    ROOT / "src" / "features" / "auth" / "protected-page.js",
    ROOT / "src" / "features" / "auth" / "providers" / "provider-utils.js",
    ROOT / "src" / "features" / "auth" / "providers" / "vk-provider.js",
    ROOT / "src" / "features" / "auth" / "providers" / "yandex-provider.js",
]

SCAN_FILES = [
    ROOT / "README.md",
    ROOT / "guide" / "project-rules.md",
    ROOT / "llms.txt",
    ROOT / "index.html",
    ROOT / "src" / "shared" / "shell.js",
    ROOT / "src" / "pages" / "test.js",
    ROOT / "src" / "pages" / "result.js",
    ROOT / "src" / "pages" / "types.js",
    ROOT / "src" / "pages" / "type-detail.js",
]

FORBIDDEN_MARKERS = [
    "node:",
    "@playwright/test",
    "playwright",
    "http-server",
    "loadExternalScript",
    "sdk-suggest",
    "YaAuthSuggest",
    "YaSendSuggestToken",
    "tokenPageOrigin",
    "tokenSdkUrl",
    "sdkUrl",
    "/auth/yandex/token/",
    "/auth/",
    "createAuthManager",
    "features/auth",
    "auth-modal",
    "auth-callback",
    "auth-providers.js",
    "VK ID",
    "Yandex ID",
]

DOC_MARKERS = {
    ROOT / "README.md": [
        "без `Node.js`",
        "без npm-пакетов",
        "чистый `JavaScript`",
    ],
    ROOT / "guide" / "project-rules.md": [
        "Разрешены только `HTML`, `CSS`, чистый `JavaScript` и `JSON`.",
        "В репозитории не должно быть `Node.js`-зависимостей",
        "без внешних JS-библиотек и SDK",
    ],
    ROOT / "AGENTS.md": [
        "Жёсткое ограничение: только `HTML`, `CSS`, чистый `JavaScript` и `JSON`.",
        "Нельзя добавлять `Node.js`, `npm`, `package.json`, `package-lock.json`, `node_modules`",
        "Нельзя добавлять внешние JS SDK",
    ],
}


def main() -> None:
    errors: list[str] = []

    for path in FORBIDDEN_FILES:
        if path.exists():
            errors.append(f"Лишний файл для Node.js-стека: {path.relative_to(ROOT)}")

    for path in SCAN_FILES:
        content = path.read_text(encoding="utf-8")
        for marker in FORBIDDEN_MARKERS:
            if marker in content:
                errors.append(f"Запрещённый маркер {marker!r} найден в {path.relative_to(ROOT)}")

    for path, markers in DOC_MARKERS.items():
        content = path.read_text(encoding="utf-8")
        for marker in markers:
            if marker not in content:
                errors.append(f"В инструкции {path.relative_to(ROOT)} отсутствует обязательный маркер: {marker}")

    if errors:
        raise SystemExit("\n".join(errors))

    print("Project stack checks passed.")


if __name__ == "__main__":
    main()
