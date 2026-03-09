# АнонЧ

Frontend-only сервис по MBTI без backend, без `Node.js`, без npm-пакетов и без сторонних JS-библиотек. Проект использует только `HTML`, `CSS`, чистый `JavaScript` и `JSON`.

Подробные правила проекта зафиксированы в [guide/project-rules.md](guide/project-rules.md).

## Что реализовано

- multi-page приложение на `HTML`, `CSS`, чистом `JavaScript` и `JSON`
- local auth: регистрация, вход, выход, восстановление сессии
- внешний вход через `VK ID` и `Yandex ID` с `mock` и `real` режимами без внешних JS SDK
- безопасная локальная сессия без долговременного хранения внешних токенов
- MBTI test engine с 22 вопросами, черновиком и сохранением результата
- страница результата с осями, группой, описанием и совместимостью
- каталог всех 16 типов с поиском и фильтром по группам
- отдельные страницы типов, собранные из JSON
- страница классификации и страница будущего чата
- статические и структурные проверки на `Python`

## Локальный запуск

1. Перейти в папку проекта:

```bash
cd /mnt/c/Users/lol20/Documents/GitHub/anonch
```

2. Запустить локальный сервер стандартными средствами `Python`:

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

3. Открыть в браузере:

```text
http://127.0.0.1:4173
```

## Конфиг внешней авторизации

Главный файл: [src/config/auth-providers.js](src/config/auth-providers.js).

Для `VK ID`:
- `appId`
- `redirectUri`
- при необходимости `origins.allowedAppOrigins`

Для `Yandex ID`:
- `clientId`
- `redirectUri`
- при необходимости `origins.allowedAppOrigins`

Рекомендуемые redirect URI для локальной проверки:
- `VK ID`: `http://127.0.0.1:4173/auth/callback/?provider=vk`
- `Yandex ID`: `http://127.0.0.1:4173/auth/callback/?provider=yandex`

Режимы провайдеров:
- `mock` — безопасный локальный сценарий без внешних ключей
- `real` — реальная интеграция с заполненными ключами и redirect URI
- `disabled` — провайдер отключён

Если включить `real` и оставить обязательные поля пустыми, интерфейс не падает: на странице входа показывается понятный статус конфигурации, а при попытке входа пользователь получает явное сообщение об ошибке.

## Mock mode

По умолчанию `VK ID` и `Yandex ID` работают в `mock` режиме. Для локальной проверки достаточно:

1. оставить `mode: "mock"` у нужного провайдера в [src/config/auth-providers.js](src/config/auth-providers.js)
2. запустить `python3 -m http.server 4173 --bind 127.0.0.1`
3. открыть `/auth/`
4. нажать кнопку `VK ID` или `Yandex ID`

## Проверки

Запуск:

```bash
python3 tests/unit/check_data_layer.py
python3 tests/unit/check_static_ui.py
python3 tests/unit/check_project_stack.py
```

Что проверяется:
- корректность данных
- наличие ключевых страниц и точек входа
- отсутствие `Node.js`-зависимостей и внешних JS SDK в проекте
- фиксация правила «только `HTML`, `CSS`, чистый `JavaScript`, `JSON`» в основных инструкциях

## Структура проекта

```text
public/data/          JSON-данные: вопросы, типы, группы, совместимость, UI copy
src/config/           конфиг провайдеров
src/features/auth/    local auth, провайдеры, guards, store
src/features/mbti/    движок теста, store, service
src/pages/            entry-модули страниц
src/shared/           shell, storage, data helpers
src/styles/           дизайн-система, layout, page styles
auth/                 страницы входа и callback flow
test/                 страница теста
result/               страница результата
types/                каталог и 16 страниц типов
groups/               страница классификации
chat/                 страница будущего чата
tests/unit/           Python-проверки структуры и данных
tools/                вспомогательные Python-скрипты
```

## Ограничения

- все пользовательские данные хранятся только в `localStorage`
- для реального использования авторизации и пользовательских данных нужен backend
- реальный `VK ID` / `Yandex ID` требуют собственных ключей и зарегистрированных redirect URI
