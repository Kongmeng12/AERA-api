# Aera Mineral API

REST API built with Node.js, TypeScript, Express 5, TypeORM and MySQL. It follows the conventions in [development.md](development.md).

## Requirements

- Node.js `^20.19`, `^22.13` or `>=24.11`
- MySQL 8
- Docker, only for the integration tests

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` before continuing. The API refuses to start with the placeholder secrets, so generate each JWT secret separately:

```bash
openssl rand -base64 48
```

Create the database and a dedicated database user, then:

```bash
npm run migration:run   # create tables and the four default roles
npm run seed:admin      # create the first admin from ADMIN_* in .env
npm run dev
```

Remove `ADMIN_PASSWORD` from `.env` after seeding. Log in with the admin email and password, then use the token as `Authorization: Bearer <accessToken>`.

- API base: `http://localhost:3000/api/v1`
- Swagger UI: `http://localhost:3000/api/docs/`
- OpenAPI JSON: `http://localhost:3000/api/docs/openapi.json`

Swagger is off in production unless `SWAGGER_ENABLED=true`.

## Scripts

| Command                                                           | Purpose                                   |
| ----------------------------------------------------------------- | ----------------------------------------- |
| `npm run dev`                                                     | Run with reload                           |
| `npm run build` / `npm start`                                     | Compile to `dist/` and run it             |
| `npm run typecheck` / `lint` / `format`                           | Code quality                              |
| `npm test`                                                        | All tests (needs the test database)       |
| `npm run test:unit`                                               | Unit tests only (no database)             |
| `npm run test:db:up` / `test:db:down`                             | Start or remove the disposable test MySQL |
| `npm run test:integration`                                        | Integration tests only                    |
| `npm run migration:generate -- src/core/database/migrations/Name` | Generate a migration from entity changes  |
| `npm run migration:run` / `migration:revert`                      | Apply or revert migrations                |
| `npm run migration:check`                                         | Fail if the entities and database differ  |
| `npm run migration:run:prod` / `seed:admin:prod`                  | The same, against the compiled build      |

Integration tests **wipe the database they connect to**, so they refuse to run unless its name ends in `_test`. They use `docker-compose.test.yml` by default; a `.env.test` file can override the connection.

## Endpoints

| Method and path                                                          | Access                                                     |
| ------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `GET /health`                                                            | Public                                                     |
| `POST /auth/login`                                                       | Public, rate limited                                       |
| `POST /auth/refresh`                                                     | Public, rate limited                                       |
| `POST /auth/logout`                                                      | Public (needs the refresh token)                           |
| `GET /auth/me`                                                           | Any logged-in user                                         |
| `POST /auth/change-password`                                             | Any logged-in user, rate limited                           |
| `GET /roles`                                                             | Admin, Manager                                             |
| `GET /users`, `GET /users/:id`                                           | Admin, Manager                                             |
| `POST /users`, `PUT /users/:id`, `PATCH /users/:id`, `DELETE /users/:id` | Admin                                                      |
| `GET /sales-prices`                                                      | Admin, Manager, Sales                                      |
| `POST /sales-prices`                                                     | Admin                                                      |
| `GET /sales-orders`, `GET /sales-orders/:id`                             | Admin, Manager, Sales, Accounting                          |
| `POST /sales-orders`                                                     | Admin, Sales                                               |
| `POST /sales-orders/:id/approve`                                         | Admin, Manager                                             |
| `POST /sales-orders/:id/cancel`                                          | Admin, Manager (sales may cancel their own pending orders) |
| `GET /inventory/transfers`, `GET /inventory/transfers/:id`                | Admin, Manager, Warehouse, Purchasing                      |
| `POST /inventory/transfers`, `POST /inventory/transfers/:id/dispatch`, `POST /inventory/transfers/:id/receive` | Admin, Manager, Warehouse |
| `GET /inventory/counts`, `GET /inventory/counts/:id`                      | Admin, Manager, Warehouse, Purchasing                      |
| `POST /inventory/counts`                                                  | Admin, Manager, Warehouse                                  |
| `POST /inventory/counts/:id/approve`                                      | Admin, Manager                                             |
| `GET /inventory/writeoffs`, `GET /inventory/writeoffs/:id`                | Admin, Manager, Warehouse, Purchasing                       |
| `POST /inventory/writeoffs`                                               | Admin, Manager, Warehouse                                  |
| `POST /inventory/writeoffs/:id/approve`, `POST /inventory/writeoffs/:id/reject` | Admin, Manager                                     |
| `GET /sales-invoices`, `GET /sales-invoices/:id`                         | Admin, Manager, Sales, Accounting                          |
| `POST /payment-receipts`                                                 | Admin, Accounting                                          |
| `GET /sales-returns`, `GET /sales-returns/:id`                           | Admin, Manager, Sales, Accounting                          |
| `POST /sales-returns`                                                    | Admin, Manager, Sales                                       |
| `POST /sales-returns/:id/approve`, `POST /sales-returns/:id/reject`      | Admin, Manager                                             |
| `GET /supplier-bills`, `GET /supplier-bills/:id`                         | Admin, Manager, Purchasing, Accounting                     |
| `POST /supplier-bills`                                                   | Admin, Accounting                                          |
| `POST /supplier-bills/:id/post`                                          | Admin, Manager, Accounting                                 |
| `POST /supplier-payments`                                                | Admin, Accounting                                          |
| `GET /production/bills-of-materials`, `GET /production/bills-of-materials/:id` | Admin, Manager, Warehouse                         |
| `POST /production/bills-of-materials`, `POST /production/bills-of-materials/:id/activate` | Admin, Manager |
| `GET /production/orders`, `GET /production/orders/:id`                   | Admin, Manager, Warehouse                                  |
| `POST /production/orders`                                                | Admin, Manager                                             |
| `POST /production/orders/:id/material-issues`, `POST /production/orders/:id/outputs` | Admin, Manager, Warehouse                  |
| `GET /deliveries`, `GET /deliveries/:id`                                 | Admin, Manager, Sales, Warehouse, Driver                   |
| `POST /deliveries`                                                       | Admin, Manager, Warehouse                                  |
| `POST /deliveries/:id/dispatch`, `POST /deliveries/:id/complete`         | Admin, Manager, Warehouse, Driver                          |

Sales orders use effective customer/item price lists and require manager approval before full stock reservation. Only available stock from active batches can be reserved. Delivery dispatch reduces on-hand stock; completion records delivered/returned quantities and invoices delivered goods. Payment receipts must be fully allocated to matching customer invoices.

Approved customer returns create a credit note and record returned quantities as available stock.
Supplier bills are matched to received PO quantities before posting; supplier payments must be allocated to posted bills.
Accepted receipts and production outputs are recorded as available stock. QC is performed manually outside the API; QC endpoints are deferred. Production quantities currently use the item's base output unit, and material issues require inventory in the BOM unit; automatic unit conversion is not supported.

Inventory transfers deduct available stock at dispatch and add it to the destination as quantities are received; partial receipts are supported. Stock counts capture a zone snapshot and require admin/manager approval before adjustments; any stock movement in that zone after the snapshot requires a recount. Write-offs require admin/manager approval, and the requester cannot approve their own request. These operations only affect available stock; existing QC-held balances are unchanged.

## Project layout

```text
src/
├── config/    Validated environment and app settings
├── core/      DataSource, migrations, application errors, shared types
├── modules/   auth, users, roles, health
├── shared/    Middleware, guards, logger, response and OpenAPI helpers
├── routes/    API and docs route composition
├── app.ts     Express setup, without listening
└── server.ts  Startup and graceful shutdown
```

To add a business module, copy the structure of `modules/users`, add its entity to `core/database/data-source.ts`, mount it in `routes/index.ts`, import its `*.openapi.ts` in `routes/openapi.ts`, then generate a migration.

## Behaviour to know about

- **Column types:** always set `type` on entity columns. `tsx` (esbuild) does not emit decorator metadata, so TypeORM cannot infer types under `npm run dev` or the migration CLI.
- **TypeScript version:** stay below 6.1 until `ts-jest` and `typescript-eslint` support newer versions.
- **Access changes:** suspending or demoting a user takes effect at their next refresh. An access token already issued stays valid until it expires (15 minutes by default).
- **Refresh tokens:** each works once. A client that sends the same token twice, even by accident in parallel requests, is logged out of that session, so clients should serialize refresh calls.
- **Account lockout:** 5 wrong passwords lock an account for 15 minutes. Because the response is the same as any failed login, a locked user is not told about the lock.
- **Rate limits:** counters are held in memory per process. Running several instances needs a shared store such as Redis.
- **Reverse proxy:** set `TRUST_PROXY` to the number of proxies in front of the API, or all clients will share one rate limit. Terminate HTTPS at the proxy in production.
