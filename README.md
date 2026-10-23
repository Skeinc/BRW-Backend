# BRW-Backend

REST API интернет-магазина мебели BRW (Black Red White). Стек: NestJS 12 + TypeScript (ESM) + Drizzle ORM + PostgreSQL + фото на локальном диске.

Документация проекта: `../docs/BRW-dev-plan.md`. Фронтенд: `../BRW-Frontend`.

## Запуск через Docker Compose

```bash
cp .env.example .env   # задайте ADMIN_EMAIL и ADMIN_PASSWORD
docker compose up --build
```

Поднимаются: `postgres` (порт 5434), `api` (порт 3000) и `web` (витрина, порт 8080). Миграции применяются при старте `api`. Загруженные фото лежат в volume `uploads_data` и отдаются по `/media`.

Проверка:

```bash
curl http://localhost:3000/api/health
# { "status": "ok", "db": "ok", "storage": "ok" }
```

Swagger: <http://localhost:3000/api/docs>.

## Админ-API

Вход в админку: `ADMIN_EMAIL` и `ADMIN_PASSWORD` из `.env`, без них compose не стартует. Вместо открытого пароля можно задать bcrypt-хеш в `ADMIN_PASSWORD_HASH` (`npm run admin:hash -- <пароль>`, значение в одинарных кавычках), он используется, только если `ADMIN_PASSWORD` пуст. Админ-API живёт под `/api/admin/*`: войдите через `POST /api/admin/auth/login` в Swagger, дальше cookie подставляется сама.

`JWT_SECRET` обязателен: сгенерируйте свой (`openssl rand -hex 32`). В production (в Docker) заготовки из репозитория отклоняются, приложение не стартует. Токен привязан к текущим email и паролю: после смены любого из них старые cookie перестают работать. За reverse proxy задайте `TRUST_PROXY` (число прокси, nginx = 1), иначе лимит попыток входа (5 в минуту) общий для всех клиентов.

Если том `postgres_data` остался от прошлых запусков с другой схемой, пересоздайте его: `docker compose down -v`.

Что умеет админ-API (все маршруты под `/api/admin/*`, без cookie отвечают `401 UNAUTHORIZED`):

| Раздел | Маршруты |
| --- | --- |
| Вход | `POST auth/login` (5 попыток в минуту), `POST auth/logout`, `GET auth/me` |
| Категории | `categories`: страница дерева с поиском и фильтрами (`GET ?page&pageSize&q&isPublished&depth`: страница это ровно pageSize строк дерева (родители перед детьми)), `GET tree` (всё дерево для выбора родителя), CRUD, `PATCH :id/move` (порядок среди соседей), до 3 уровней |
| Коллекции | `collections`: страница списка с поиском и фильтрами (`GET ?page&pageSize&q&isPublished&hasProducts`), `GET options` (все коллекции как id и название для выбора), CRUD, `PATCH :id/move` (порядок) |
| Товары | CRUD `products`, список с фильтрами `categoryId`, `collectionId`, `q`, `isPublished` |
| Статьи | CRUD `articles` |
| Заявки | `GET orders` (фильтр `status`, поиск `q` по номеру, имени и телефону; телефон ищется и по цифрам, без учёта пробелов и скобок), `GET orders/:id`, `PATCH orders/:id` (смена статуса по цепочке `new → in_progress → done`, отмена; иначе `ORDER_STATUS_INVALID`) |
| Фото | `products`, `categories`, `collections`, `articles`: `GET/POST /:id/images`, `PATCH /:id/images/order`, `PATCH/DELETE /:id/images/:imageId`; картинки в тексте статей: `POST/DELETE media/images` |

Общие правила: slug строится из названия (кириллица транслитерируется) или задаётся явно, повтор даёт `409 SLUG_TAKEN`, смена slug сохраняет старый в `slug_redirect`. Цены передаются строками (`"1299.00"`). Ошибки приходят как `{ code, message, details }`.

Фото обрабатывает модуль `media`: jpeg, png или webp до 10 МБ превращаются в webp до 1600 px плюс превью 480 px. Первая картинка галереи считается обложкой. 
## Публичное API

Без авторизации, под `/api`:

| Маршрут | Назначение |
| --- | --- |
| `GET categories`, `GET categories/:id` | дерево категорий и карточка категории |
| `GET collections`, `GET collections/:id` | коллекции |
| `GET products` | каталог: фильтры, сортировка, `page`, `pageSize` (максимум 48) |
| `GET products/facets` | значения фильтров для текущей выборки |
| `GET products/:id` | карточка товара |
| `GET articles`, `GET articles/:id` | статьи (`pageSize` максимум 48) |
| `POST orders` | заявка с витрины (лимит попыток) |
| `GET seo/urls` | slug и `updatedAt` опубликованных сущностей для sitemap |
| `GET seo/resolve` | новый адрес переименованного slug (для 301) |
| `GET health` | состояние API, БД и хранилища |

Видимы только опубликованные сущности; товар виден, если вся цепочка его категорий опубликована.

## Запуск без Docker

Нужны Node.js 24 и PostgreSQL.

```bash
npm install
cp .env.example .env   # DATABASE_URL укажите на localhost; фото пишутся в UPLOADS_DIR (по умолчанию ./uploads)
npm run db:migrate
npm run start:dev
```

Можно поднять только инфраструктуру: `docker compose up postgres`.

## Структура

`src/modules/<модуль>`: в корне `module`, `controller`, `service`, `repository`, остальное по папкам (`dto/`, `types/`, `constants/`, `lib/`, `admin/`). Подробные правила в `CLAUDE.md`.

Модули: `admin-auth`, `categories`, `collections`, `products`, `articles`, `orders`, `media` (все изображения и галереи), `slug-redirects`, `analytics`, `seo`, `health`.

## Переменные окружения

Описаны в `.env.example`. Приложение проверяет их при старте и падает с понятным сообщением, если что-то не задано или неверно (значения в ошибке не выводятся).

| Переменная | Назначение |
| --- | --- |
| `PORT`, `NODE_ENV` | порт и режим |
| `DATABASE_URL` | строка подключения PostgreSQL |
| `CORS_ORIGIN` | origin витрины, можно списком через запятую |
| `UPLOADS_DIR`, `PUBLIC_MEDIA_URL` | папка загрузок и публичный URL `/media` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` / `ADMIN_PASSWORD_HASH` | вход в админку |
| `JWT_SECRET` | подпись cookie админки (в production заготовка отклоняется) |
| `TRUST_PROXY`, `COOKIE_SECURE` | за reverse proxy: число прокси и secure-cookie (в production `true`) |
| `ORDER_NOTIFY_EMAIL` | почта менеджера, на которую приходит каждая новая заявка; пусто = писем нет |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` | SMTP-сервер для писем (обязателен `SMTP_HOST`, если задан `ORDER_NOTIFY_EMAIL`) |
| `SWAGGER_ENABLED` | Swagger на `/api/docs`; по умолчанию включён вне production и выключен в production |

В API включены helmet, gzip-сжатие и лог каждого запроса (метод, URL, статус, время). Ошибки всегда приходят как `{ code, message, details }`.

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

## Ветки

`feature/*` → PR в `develop` → релиз: merge `develop` → `main` и тег `v1.0.0`. Коммиты: Conventional Commits. Прямых коммитов в `develop` и `main` нет.

## Как добавить товар

Seed-данных нет, каталог наполняется через админку (витрина: `/admin`) или админ-API:

1. Войдите: `POST /api/admin/auth/login` (email и пароль из `.env`).
2. Убедитесь, что есть опубликованная категория (`POST /api/admin/categories`) и, при необходимости, коллекция.
3. `POST /api/admin/products`: название, `categoryId`, `sku` (уникальный), цена строкой (`"1299.00"`), `isPublished`. Slug строится из названия.
4. Загрузите фото: `POST /api/admin/products/:id/images` (jpeg, png, webp до 10 МБ). Первое фото становится обложкой.
5. Опубликуйте товар. Он появится в каталоге и в `sitemap.xml` витрины сразу, если опубликована вся цепочка его категорий.

## Правила

Соглашения по коду: `CLAUDE.md`.
