# AGENTS.md

## Repository purpose

This is the Aera Mineral REST API: Node.js, TypeScript, Express 5, TypeORM, and MySQL.
Follow [development.md](development.md) and keep [README.md](README.md) accurate.

## Mandatory workflow

Before changing code:

1. Inspect the relevant module and package versions.
2. Read the existing service, repository, validator, route, OpenAPI, and test patterns.
3. Make the smallest coherent change; do not redesign unrelated modules.
4. Keep `development.md` aligned with behavior changes if this repository's requirements change.

After changing code:

1. Run `npm run typecheck`.
2. Run `npm run lint`.
3. Run the smallest relevant test command.
4. Run migrations or a migration check when entities or schemas change.
5. Update OpenAPI and README/documentation for endpoint or setup changes.
6. Report changed files, validation commands, and remaining risks.

## Toolchain and commands

- Node.js: `^20.19.0`, `^22.13.0`, or `>=24.11.0`.
- Package manager: npm; use `package.json` scripts.
- Development server: `npm run dev`
- Build/start: `npm run build`, then `npm start`
- Quality: `npm run typecheck`, `npm run lint`, `npm run format`
- Unit tests: `npm run test:unit`
- Integration tests: `npm run test:db:up`, `npm run test:integration`, `npm run test:db:down`
- Full Jest run: `npm test`
- Integration tests are destructive: only run against a database whose name ends in `_test`.

Use `npm run format` only on source/tests you intentionally changed. Do not use `npm run format` as an unreviewed whole-repository operation.

## Architecture

Keep these boundaries:

- `src/config/`: validated environment and application settings.
- `src/core/`: DataSource, migrations, application errors, and shared core types.
- `src/modules/<domain>/`: domain-owned controllers, services, repositories, entities, DTOs, validators, routes, and module composition.
- `src/shared/`: reusable middleware, guards, helpers, logging, OpenAPI helpers, and response utilities.
- `src/routes/`: API and Swagger route composition.
- `src/app.ts`: Express setup only; export a configured app.
- `src/server.ts`: startup and graceful shutdown only.

Follow the request flow:

`Router -> middleware -> authentication -> authorization -> Zod validation -> controller -> service -> repository -> TypeORM`.

Rules:

- Controllers extract HTTP input and call services. Keep business logic and database access out of controllers.
- Services implement business rules, coordinate repositories, and define transaction boundaries.
- Services must not depend on Express `Request` or `Response`.
- Repositories encapsulate TypeORM access and QueryBuilder logic.
- Do not access another module's repository directly; use an explicit service or interface.
- Avoid circular dependencies and unnecessary abstractions.
- `app.ts` must not listen; `server.ts` owns listening and shutdown.

## TypeScript standards

- Strict mode is enabled. Avoid `any`, unsafe casts, and untyped `unknown` assumptions.
- Use async/await and explicit types for public/module boundaries.
- ESLint rejects `any`; keep unused values named with a leading underscore only when the compiler/ESLint requires it.
- Prefer existing DTO types and Zod-inferred types over duplicating shapes.
- Express 5 forwards rejected async handlers to the error middleware.
- Do not introduce abstractions unless they solve a concrete repeated problem.

## Validation and HTTP conventions

- Base API path: `/api/v1`.
- Public `GET /health` is the health endpoint.
- Use Zod for body, query, and path parameters.
- `validate(...)` reads from `req.validated`, not directly from `req.body/query/params`.
- Strict Zod objects reject unknown keys and prevent mass assignment.
- Normalize input in schemas (for example, trim and lowercase email).
- Whitelist sortable fields and always parameterize QueryBuilder values.
- Use pagination defaults and limits established in `src/shared/helpers/pagination.ts`.

Use the shared response helpers:

- Success: `sendSuccess(res, data, message, status)`
- No content: `sendNoContent(res)`
- Standard success shape: `{ success: true, message, data }`
- Standard paginated shape: `{ success: true, message, data: { items, pagination } }`
- Standard error shape: `{ success: false, code, message, errors? }`

Keep controllers thin and never return entities directly. Use explicit response DTO mappers that exclude secret fields.

## Errors and status codes

Use `AppError` subclasses and stable codes in `ERROR_CODES`:

- `ValidationError`: HTTP 422
- `UnauthorizedError`: HTTP 401
- `ForbiddenError`: HTTP 403
- `NotFoundError`: HTTP 404
- `ConflictError`: HTTP 409

Add a code to `src/shared/constants/error-codes.ts` only for a stable public error contract.
Pass failures to the centralized error middleware. Do not expose stack traces, SQL, parameters, secrets, or internal implementation details.
Unexpected server errors must be logged through Pino using the request ID and safe fields.

## Authentication and authorization

- Access tokens are short-lived Bearer tokens.
- Refresh tokens are opaque, stored only as cryptographic hashes, rotated once, and revocable.
- Verify signature, issuer, audience, and expiration.
- Never trust identity or role values supplied in a request body.
- Use `authenticate` for identity and `authorize(...roles)` for RBAC.
- Preserve existing self-modification protection for users.
- Use the existing account lockout behavior and login limit; do not leak whether credentials are invalid or an account is locked.
- Never log passwords, access/refresh tokens, password hashes, or JWT secrets.
- Never hardcode secrets. Validate environment variables at startup and keep placeholders in `.env.example`.

## TypeORM and migrations

- `synchronize: false`; use migrations for every schema change.
- Register each entity in `src/core/database/data-source.ts`.
- Always set explicit `type` on entity columns. Under `tsx`, decorator metadata is not a reliable source for migrations.
- Use plural `snake_case` table names and `snake_case` column names.
- Use explicit indexes, unique constraints, foreign keys, and nullability.
- Use transactions for writes that must succeed or fail together.
- Avoid eager relations and N+1 queries.
- Use parameterized queries and safe whitelisted sort columns.
- Use soft delete only when its semantics and identity reservation are required.
- TypeORM's MySQL driver does not support `CHECK` constraints; enforce positive quantities and cross-field business rules in transactional services and their tests.
- Do not run migration commands against a database that is not explicitly intended to receive schema changes.

Migration commands:

- Generate: `npm run migration:generate -- src/core/database/migrations/Name`
- Run: `npm run migration:run`
- Revert: `npm run migration:revert`
- Check: `npm run migration:check`

## Requirements decisions to confirm

- Treat the seeded role/permission grants as bootstrap defaults only; obtain approval for the final permission matrix before production.
- FR-022 does not settle whether received stock is recorded before or after QC. Confirm the lifecycle before implementing receiving and stock-release workflows.
- FR-023 makes returnable containers conditional. Confirm applicability before enabling container deposits, returns, or reconciliation.
- Derive reports and dashboards from transactional records; backups, hosting, performance targets, and Lao-language output are operational/API requirements, not additional business tables.

## Security

- Use Helmet, an explicit CORS allowlist, and rate limiting.
- Set `TRUST_PROXY` to the actual reverse-proxy hop count.
- Use bcrypt for passwords and a work factor of at least 10 in production.
- Limit JSON request bodies; the current API limit is 100 KB.
- Never commit `.env` or real secrets.
- Remove `ADMIN_PASSWORD` after the initial admin seed.
- Use least-privilege database credentials.
- Never return password hashes or other sensitive fields.
- Terminate HTTPS at the proxy or load balancer in production.

## OpenAPI and documentation

- Register each endpoint in a module `routes/*.openapi.ts` file.
- Import module OpenAPI files from `src/routes/openapi.ts`.
- Document method, path, auth, permissions, parameters, body, and success/error responses.
- Keep Swagger examples consistent with actual DTOs and response shapes.
- Swagger is disabled in production unless `SWAGGER_ENABLED=true`.

## Testing

Jest is split into unit and integration projects.

- Unit tests: `tests/unit/**/*.test.ts`; mock repositories and external services.
- Integration tests: `tests/integration/**/*.test.ts`; use Supertest and an isolated `_test` MySQL database.
- Integration setup wipes and re-migrates its database.
- Add focused tests for behavior introduced or changed; do not test implementation constants or framework behavior.
- Cover auth, authorization, validation, response shape, and database behavior as relevant.
- Preserve the safety check for `_test` database names.

## Adding a module

For a new business module:

1. Add the domain module under `src/modules/<domain>/`.
2. Add DTOs and Zod validators.
3. Add explicit service/repository interfaces only where they reduce coupling.
4. Add thin controller and route files.
5. Register a module factory in `src/modules/<domain>/<domain>.module.ts`.
6. Register the entity in `src/core/database/data-source.ts`.
7. Mount routes in `src/routes/index.ts`.
8. Import its OpenAPI registration in `src/routes/openapi.ts`.
9. Generate and review a TypeORM migration.
10. Add unit and integration coverage.
11. Update README endpoint/setup documentation.

## Existing behavior to preserve

- Access-role changes take effect at the user's next refresh; an already-issued access token remains valid until expiry.
- Refresh reuse/replay revokes the refresh-token family/session.
- Account lockout is 5 failed attempts for 15 minutes.
- Rate-limit counters are process-local; Redis or another shared store is required across replicas.
- Soft-deleted identity values remain reserved.
- The API cannot delete or demote its own currently authenticated account through user-management endpoints.
