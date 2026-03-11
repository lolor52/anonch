# АнонЧ

Frontend-only сервис по MBTI без backend, без `Node.js`, без npm-пакетов и без сторонних JS-библиотек. Проект использует только `HTML`, `CSS`, чистый `JavaScript` и `JSON`.

Подробные правила проекта зафиксированы в [guide/project-rules.md](guide/project-rules.md).

## Что реализовано

- multi-page приложение на `HTML`, `CSS`, чистом `JavaScript` и `JSON`
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
src/features/mbti/    движок теста, store, service
src/pages/            entry-модули страниц
src/shared/           shell, storage, data helpers
src/styles/           дизайн-система, layout, page styles
test/                 страница теста
result/               страница результата
types/                каталог и 16 страниц типов
groups/               страница классификации
chat/                 страница будущего чата
tests/unit/           Python-проверки структуры и данных
tools/                вспомогательные Python-скрипты
```

## Ограничения

- черновик теста и итоговый результат хранятся только в `localStorage`
- данные привязаны к текущему браузеру и устройству
- без backend нет общей синхронизации между устройствами и браузерами
