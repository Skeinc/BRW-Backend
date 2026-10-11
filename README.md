# BRW-Backend

REST API интернет-магазина мебели BRW (Black Red White). Стек: NestJS 12 + TypeScript (ESM) + Drizzle ORM + PostgreSQL + фото на локальном диске.

Документация проекта: `../docs/BRW-dev-plan.md`. Фронтенд: `../BRW-Frontend`.

## Запуск через Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

Поднимаются: `postgres` (порт 5434), `api` (порт 3000; загруженные фото лежат в volume `uploads_data` и отдаются по `/media`).

Проверка:

```bash
curl http://localhost:3000/api/health
# { "status": "ok", "db": "ok", "storage": "ok" }
```

Swagger: <http://localhost:3000/api/docs>.

Сервис `web` (фронтенд) подключается профилем, когда появится `../BRW-Frontend`:

```bash
docker compose --profile web up --build
```

Хеш пароля админа в `.env` пишите в одинарных кавычках. В `docker-compose.yml` символ `$` экранируется как `$$`.

## Админ-API

1. Сгенерируйте хеш: `npm run admin:hash -- <пароль>` и вставьте строку `ADMIN_PASSWORD_HASH='…'` в `.env`.
2. Откройте Swagger: `http://localhost:3000/api/docs`.
3. Выполните `POST /api/admin/auth/login` с `ADMIN_EMAIL` и паролем. Сервер ставит httpOnly-cookie, дальше Swagger отправляет её сам.
4. Все остальные `/api/admin/*` без cookie отвечают `401 UNAUTHORIZED`. Вход ограничен 5 попытками в минуту.

## Запуск без Docker

Нужны Node.js 24 и PostgreSQL.

```bash
npm install
cp .env.example .env   # DATABASE_URL укажите на localhost; фото пишутся в UPLOADS_DIR (по умолчанию ./uploads)
npm run db:migrate
npm run start:dev
```

Можно поднять только инфраструктуру: `docker compose up postgres`.

## Переменные окружения

Описаны в `.env.example`. Приложение проверяет их при старте и падает с понятным сообщением, если что-то не задано или неверно (значения в ошибке не выводятся).

## Скрипты

| Скрипт | Назначение |
| --- | --- |
| `npm run build` | сборка в `dist/` |
| `npm run start` / `start:dev` / `start:debug` / `start:prod` | запуск |
| `npm run typecheck` | проверка типов (`tsc --noEmit`) |
| `npm run lint` | oxlint (type-aware) |
| `npm run format` / `format:check` | prettier |
| `npm run db:generate` | генерация миграций Drizzle |
| `npm run db:migrate` | применение миграций |
| `npm run admin:hash -- <пароль>` | bcrypt-хеш для `ADMIN_PASSWORD_HASH` |
| `npm run pre-commit` | prettier по staged → typecheck → lint |

## Pre-commit

Husky запускает `npm run pre-commit` (`scripts/pre-commit.mjs`) перед каждым коммитом. Хуки ставятся при `npm install` (скрипт `prepare`).

## Правила

Соглашения по коду: `CLAUDE.md`. Коммиты: Conventional Commits. Основная ветка разработки: `develop`.
