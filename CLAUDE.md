# BRW API

Coding rules for Claude Code in this repo. Project docs: `../docs/README.md`.

# Tests

No tests on the backend: do not write unit or e2e tests, spec files, or test fixtures, and do not add test steps to tasks, plans or acceptance criteria. Verify changes with `npm run typecheck`, `npm run lint` and `npm run format:check`.

# TypeScript

Senior TypeScript. Clean code and design patterns. English for all code and documentation.

## Basic principles

- Always declare the type of each variable and function (parameters and return value).
- Avoid `any`. Create the necessary types.
- Use JSDoc on public classes and methods.
- Do not leave blank lines inside a function.
- One export per file.

## Names

- PascalCase for classes.
- camelCase for variables, functions, and methods.
- kebab-case for file and directory names.
- UPPER_SNAKE_CASE for environment variables.
- No magic numbers. Define constants.
- Start each function with a verb.
- Booleans: `isLoading`, `hasError`, `canDelete`.
- Full words, correct spelling. Allowed abbreviations: API, URL, `i`/`j` in loops, `err`, `ctx`, `req`, `res`, `next`.

## Functions

- A method follows the same rules as a function.
- One purpose. Under 20 statements.
- Name: verb plus object. Boolean return: `isX` / `hasX` / `canX`. No return value: `executeX` / `saveX`.
- Avoid nesting: early return, extract helpers.
- Prefer `map` / `filter` / `reduce` over nested loops.
- Arrow functions under 3 statements. Named functions otherwise.
- Default parameters instead of null checks.
- RO-RO: pass many arguments as one object, return results as one object, with declared input and output types.
- One level of abstraction per function.

## Data

- Do not pass raw primitives when a composite type is clearer.
- Validate in classes, not in ad-hoc function checks.
- Prefer immutability: `readonly` for data that does not change, `as const` for fixed literals.

## Classes

- SOLID. Composition over inheritance. Interfaces for contracts.
- One purpose. Under 200 statements, under 10 public methods, under 10 properties.

## Exceptions

- Throw for unexpected failures.
- Catch only to fix an expected case or to add context. Otherwise let the global filter handle it.

# NestJS

Modular NestJS API. REST under `/api`. OpenAPI. No GraphQL.

Dependency direction: controller → service → repository → database. A lower module does not import a higher one.

## Layout

```
src/
  main.ts
  app.module.ts
  config/
  common/
    decorators/
    dto/
    errors/
    filters/
    lib/
    setup/
    storage/
  database/
    database.module.ts
    schema/
  modules/
    admin-auth/
    articles/
    categories/
    collections/
    health/
    analytics/
    seo/
    media/
    news/
    orders/
    products/
    slug-redirects/
```

- `config/` — typed env (`EnvironmentVariables`) and fail-fast validation.
- `common/` — infrastructure with no business domain: exception filter, error codes, local-disk `storage/`, app setup (`configure-app.ts`), shared DTOs, pure helpers in `common/lib/` (slugify, pagination). Do not leave generic helpers inside a feature repository.
- `database/schema/` — Drizzle table files, one file per table. `drizzle-kit` migrations only. Never push or sync the schema at runtime.
- `modules/` — business features.

Do not add barrel `index.ts` files. Import the file directly.

## Business module

The module **root holds at most four files**: `feature.module.ts`, `feature.controller.ts`, `feature.service.ts`, `feature.repository.ts`. The controller is the root controller of the module and is always named `feature.controller.ts`. Everything else lives in a folder named by what it contains. Never put `*.types.ts`, `*.constants.ts`, DTOs, helpers or extra controllers next to the module file.

| File or folder | Content |
| --- | --- |
| `feature.module.ts` | Nest wiring |
| `feature.controller.ts` | the main HTTP controller of the module: the public controller (`/api/*`); admin controllers live in `admin/` (`/api/admin/*`, behind the admin guard) |
| `feature.service.ts` | business rules of the core entity |
| `feature.repository.ts` | Drizzle queries only; present only when the module owns table(s) |
| `admin/` | additional admin controllers (`admin-*.controller.ts`, `/api/admin/*`, behind the admin guard) |
| `dto/` | `class-validator` inputs. Outputs are plain types |
| `types/` | `feature.types.ts`: plain output and input types |
| `constants/` | `feature.constants.ts`: named constants, no magic numbers |
| `lib/` | pure helpers and data structures (for example `category-tree.ts`) |
| `guards/`, `decorators/` | Nest guards and decorators of the feature |

Skip a file or folder that has nothing to hold.

### Subdomains (when the feature grows)

Split by **domain name**, not by technical layer. A subdomain is a folder named after the domain and follows the same rule (controller, service and repository at its root, everything else in folders). The Nest module stays one and wires providers from the subfolders.

```
orders/
  orders.module.ts
  orders.controller.ts
  orders.service.ts
  orders.repository.ts
  admin/
  dto/
  types/
  constants/
  payments/            # a subdomain, same shape
    order-payments.controller.ts
    order-payments.service.ts
    order-payments.repository.ts
    dto/
    types/
```

No module has a subdomain yet; split one out only when a part of a module grows its own table and rules.

### Examples

- `categories/` — module, controller, service, repository, plus `dto/`, `types/`, `constants/`, `lib/`.
- `admin-auth/` — module, controller, service, plus `guards/`, `decorators/`, `dto/`, `types/`, `constants/` (no table, no repository).
- `health/` — module and controller only (no table, no service).
- `media/` — module, controller (text-content images), service, repository, plus `admin/` (the gallery controllers), `dto/`, `types/`, `constants/`, `lib/`.

### Module boundaries

- `categories` owns `category`, `products` owns `product`, `articles` owns `article`, `news` owns `news` (a separate module on purpose: news may diverge from articles). `products` may depend on `categories`; `categories` does not import `products` (counts come through a read-only repository method or an injected port).
- `media` owns the `media_image` table and is the only module that converts, stores, lists and removes images. Products, categories, collections, articles and news do not store image columns: each owns a gallery addressed by `(entityType, entityId)`, the cover is the image with the lowest sort order. An entity module calls `MediaService` (`listImages`, `getCovers` for lists, `removeAllImages` when the entity is deleted). The gallery endpoints `/api/admin/{products|categories|collections|articles|news}/:id/images` are built by `createEntityImagesController` in `media/lib/`; to give a new entity a gallery add its type to the `media_entity_type` enum, to `OWNER_TABLES` in `media.repository.ts` and a controller file in `media/admin/`.
- `slug-redirects` records renamed slugs for categories, collections, products, articles and news.
- Cross-module use of `common/storage` is allowed.

Do not add `domain/`, `application/`, or `infrastructure/` layers inside a module.

## API

- Global `ValidationPipe`: `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true` (set in `common/setup/configure-app.ts`).
- Errors: `{ code, message, details? }`. Domain failures throw `AppException` with `ErrorCode` from `common/errors` (not HTTP-status-only codes).
- Money is `numeric` in the database and a **string** in the API (`"1299.00"`). No arithmetic on money with floats.
- Never log or return secrets (passwords, tokens). Environment errors name the variable, never its value.
- Swagger decorators on controller methods.
