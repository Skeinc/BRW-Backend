# BRW API

Coding rules for Claude Code in this repo. Stack and plan: `../docs/BRW-dev-plan.md`.

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
    errors/
    filters/
    lib/
    setup/
    storage/
  database/
    database.module.ts
    schema/
  modules/
    health/
    categories/
    products/
    orders/
    seo/
    admin-auth/
```

- `config/` — typed env (`EnvironmentVariables`) and fail-fast validation.
- `common/` — infrastructure with no business domain: exception filter, error codes, local-disk `storage/`, app setup (`configure-app.ts`), pure helpers in `common/lib/` (slugify, pagination). Do not leave generic helpers inside a feature repository.
- `database/schema/` — Drizzle table files, one file per table. `drizzle-kit` migrations only. Never push or sync the schema at runtime.
- `modules/` — business features.

Do not add barrel `index.ts` files. Import the file directly.

## Business module

Keep the module **root thin**. Prefer grouping by concern in folders; do not pile many sibling files next to `*.module.ts`.

### Root files (core of the feature)

- `feature.module.ts`
- `feature.service.ts` — business rules for the core entity
- `feature.repository.ts` — Drizzle queries only (when the module owns table(s))
- `feature.controller.ts` — public HTTP for the core entity
- `feature.types.ts` — optional shared plain output types

### Folders (always use when needed)

- `dto/` — `class-validator` inputs. Outputs are plain types / `feature.types.ts`.
- `guards/`, `decorators/`
- `admin/` — admin controllers of the feature (`/api/admin/*`, behind the admin guard)

### Subdomains (when the feature grows)

Split by **domain name**, not by technical layer (`controllers/`, `services/` are forbidden):

```
products/
  products.module.ts
  products.controller.ts
  products.service.ts
  products.repository.ts
  products.types.ts
  dto/
  admin/
    admin-products.controller.ts
  images/
    product-images.controller.ts
    product-images.service.ts
```

Keep related controller / service of a subdomain in the same folder. The Nest module stays one (`products.module.ts`) and wires providers from subfolders.

### Examples

- `categories/` — module + controller + service + repository + `dto/` + `admin/`.
- `admin-auth/` — module + controller + service + `guards/` + `dto/` (no table → no repository).
- `health/` — module + controller only (no table → no repository).

`categories` owns the `category` table, `products` owns `product` and `product_image`. `products` may depend on `categories`; `categories` does not import `products` (counts come through a read-only repository method or an injected port). Cross-module use of `common/storage` is allowed.

Skip a file that has nothing to do. Do not add `domain/`, `application/`, or `infrastructure/` layers inside a module.

## API

- Global `ValidationPipe`: `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true` (set in `common/setup/configure-app.ts`).
- Errors: `{ code, message, details? }`. Domain failures throw `AppException` with `ErrorCode` from `common/errors` (not HTTP-status-only codes).
- Money is `numeric` in the database and a **string** in the API (`"1299.00"`). No arithmetic on money with floats.
- Never log or return secrets (passwords, tokens). Environment errors name the variable, never its value.
- Swagger decorators on controller methods.
