# Development Guidelines – Node.js API

## 1. Project Overview

Develop a scalable, maintainable, and secure RESTful API using:

- Runtime: Node.js
- Language: TypeScript (strict mode)
- HTTP framework: Express.js
- ORM: TypeORM
- Database: MySQL
- Authentication: JWT
- Password hashing: bcrypt
- Validation: Zod
- Logging: Pino or Winston
- API documentation: Swagger / OpenAPI
- Testing: Jest
- Code quality: ESLint + Prettier

Use **Modular Architecture** with Clean Code principles. Organize the application by business domain, keep each module cohesive, and avoid unnecessary abstractions.

## 2. Recommended Project Structure

```text
project-root/
├── src/
│   ├── config/
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   └── env.config.ts
│   ├── core/
│   │   ├── database/
│   │   │   ├── data-source.ts
│   │   │   └── migrations/
│   │   ├── exceptions/
│   │   ├── interfaces/
│   │   ├── types/
│   │   └── utils/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── repositories/
│   │   │   ├── entities/
│   │   │   ├── dto/
│   │   │   ├── validators/
│   │   │   ├── interfaces/
│   │   │   ├── routes/
│   │   │   └── auth.module.ts
│   │   ├── users/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── repositories/
│   │   │   ├── entities/
│   │   │   ├── dto/
│   │   │   ├── validators/
│   │   │   ├── interfaces/
│   │   │   ├── routes/
│   │   │   └── users.module.ts
│   │   └── roles/
│   │       └── ...
│   ├── shared/
│   │   ├── middlewares/
│   │   ├── guards/
│   │   ├── decorators/
│   │   ├── constants/
│   │   ├── helpers/
│   │   ├── response/
│   │   └── logger/
│   ├── routes/
│   │   └── index.ts
│   ├── app.ts
│   └── server.ts
├── tests/
│   ├── unit/
│   └── integration/
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── eslint.config.js
├── .prettierrc
└── README.md
```

### Architecture rules

1. Put all business modules under `src/modules/`.
2. Each module owns its business logic, entities, repositories, DTOs, validators, and routes.
3. Put genuinely reusable infrastructure in `src/core/` or `src/shared/`.
4. Keep controllers thin; never put business logic or database queries in controllers.
5. Services implement business rules and coordinate repositories.
6. Repositories encapsulate TypeORM database access.
7. Do not access another module's repository directly. Expose required operations through a service or explicit module interface.
8. Avoid circular dependencies and unnecessary global abstractions.
9. Use dependency injection or explicit constructor injection consistently.
10. Enable TypeScript strict mode and avoid `any`.

## 3. Responsibilities Within a Module

Recommended internal structure:

```text
modules/example/
├── controllers/
│   └── example.controller.ts
├── services/
│   └── example.service.ts
├── repositories/
│   └── example.repository.ts
├── entities/
│   └── example.entity.ts
├── dto/
│   ├── create-example.dto.ts
│   ├── update-example.dto.ts
│   └── example-response.dto.ts
├── validators/
│   └── example.validator.ts
├── interfaces/
│   └── example.interface.ts
├── routes/
│   └── example.routes.ts
└── example.module.ts
```

### Controllers

- Receive HTTP requests and extract body, query, and route parameters.
- Call the relevant service.
- Return standardized HTTP responses.
- Pass errors to centralized error handling.
- Do not contain database access, business rules, password hashing, or JWT implementation.

### Services

- Implement business logic and business-rule validation.
- Coordinate repositories and other module services through explicit interfaces.
- Define transaction boundaries for operations that must succeed or fail together.
- Throw meaningful application errors.
- Do not depend on Express `Request` or `Response`.

### Repositories

- Encapsulate TypeORM operations: find, create, update, delete, and complex queries.
- Use QueryBuilder where appropriate.
- Use parameterized queries and safe query construction.
- Avoid N+1 queries and unnecessary database calls.
- Never return sensitive fields such as password hashes to API clients.

### Entities

- Define database tables, columns, relationships, indexes, and constraints using TypeORM.
- Use consistent column and table naming.
- Do not expose entities directly as public API response objects.

### DTOs and validators

- Separate request input and response shapes from database entities.
- Use Zod to validate request bodies, query parameters, and route parameters.
- Keep Create, Update, and Response DTOs separate where their shapes differ.
- Validate all untrusted input before business logic runs.

### Routes and module registration

- Define endpoints and connect them to controllers.
- Apply authentication, authorization, and validation middleware.
- Keep business logic out of route files.
- Export only the functionality other modules need.

## 4. Request Processing Flow

```text
Client Request
    ↓
Express Router
    ↓
Global Middleware
    ↓
Authentication (when required)
    ↓
Authorization (when required)
    ↓
Request Validation
    ↓
Controller
    ↓
Service
    ↓
Repository
    ↓
TypeORM
    ↓
MySQL
    ↓
Service → Controller → Standard API Response
```

Use centralized error handling for failures at every stage.

## 5. Authentication and Authorization

Implement JWT authentication with:

- Login
- Logout
- Refresh token
- Get current user
- Change password
- Forgot/reset password when required

### Token policy

Use two token types:

**Access token**
- Short-lived; a suggested starting point is 15 minutes.
- Sent as a Bearer token to protected endpoints.
- Verify signature, issuer/audience where configured, and expiration.

**Refresh token**
- Longer-lived; a suggested starting point is 7 days.
- Store only a cryptographic hash of the refresh token in the database.
- Rotate refresh tokens on use and revoke the previous token.
- Support revocation on logout and suspected compromise.
- Consider storing token-family/session metadata to detect refresh-token reuse.

Keep signing secrets in environment variables or a managed secret store. Use strong, separate secrets for access and refresh tokens. Never hardcode secrets.

### Authentication middleware

1. Read and validate the `Authorization: Bearer <token>` header.
2. Verify the JWT signature and claims.
3. Reject invalid or expired tokens with HTTP 401.
4. Attach the verified identity to a typed request context.
5. Do not trust user identity or permissions supplied in the request body.

### Authorization

Use Role-Based Access Control (RBAC), with roles such as Admin, Manager, Staff, and User as examples. Authentication answers who the user is; authorization determines what the user may do. Check permissions on the server for every protected operation.

## 6. Database and TypeORM

- Use a centralized TypeORM `DataSource`.
- Use migrations for schema changes.
- Set `synchronize: false` outside disposable local experiments; never enable it in production.
- Use transactions for related writes that must be atomic.
- Define appropriate indexes, foreign keys, unique constraints, and nullability.
- Use pagination for list endpoints.
- Avoid unnecessary eager relations and N+1 queries.
- Use least-privilege database credentials.

### Naming conventions

- Tables: plural `snake_case`, e.g. `users`.
- Columns: `snake_case`, e.g. `created_at`.
- Entity classes: `PascalCase`, e.g. `User`.
- Entity files: consistent kebab-case, e.g. `user.entity.ts`.

Example `users` columns: `id`, `username`, `email`, `password_hash`, `status`, `created_at`, `updated_at`, `deleted_at`.

Do not assume every table needs soft deletion; choose it according to business and retention requirements.

## 7. REST API Standards

Use `/api/v1` as the versioned base path.

Examples:

```text
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/me

GET    /api/v1/users
GET    /api/v1/users/:id
POST   /api/v1/users
PUT    /api/v1/users/:id
PATCH  /api/v1/users/:id
DELETE /api/v1/users/:id
```

Use HTTP methods consistently:

- GET: retrieve
- POST: create or perform a defined operation
- PUT: replace a resource
- PATCH: partially update
- DELETE: delete

Use appropriate status codes, including 200, 201, 204, 400, 401, 403, 404, 409, 422, 429, and 500.

## 8. Standard API Responses

Use one shared response convention across modules.

### Success

```json
{
  "success": true,
  "message": "Successfully retrieved data",
  "data": {
    "id": 1,
    "name": "Example"
  }
}
```

### Paginated list

```json
{
  "success": true,
  "message": "Successfully retrieved data",
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

### Error

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email address"
    }
  ]
}
```

Do not expose stack traces, SQL statements, secrets, or internal implementation details in production responses.

## 9. Centralized Error Handling

Implement:

- A base application error type with safe status and error code.
- A global Express error middleware.
- Validation error mapping.
- Known database error mapping.
- Authentication and authorization error mapping.
- A not-found handler.

Use stable machine-readable codes, for example:

- `AUTH_INVALID_CREDENTIALS`
- `AUTH_TOKEN_EXPIRED`
- `AUTH_UNAUTHORIZED`
- `USER_NOT_FOUND`
- `USER_ALREADY_EXISTS`
- `VALIDATION_ERROR`

Log unexpected errors with a request/correlation ID. Do not log credentials or tokens.

## 10. Security Requirements

Implement security controls appropriate to the deployment:

- Helmet security headers.
- Explicit CORS allowlist.
- Rate limiting, especially for login and token endpoints.
- bcrypt password hashing with an appropriate work factor.
- Strong JWT verification and token expiration.
- Refresh-token rotation and revocation.
- Zod validation for all untrusted input.
- Parameterized database queries.
- Protection against mass assignment.
- Safe serialization that excludes secrets.
- HTTPS in production.
- Login brute-force protection and sensible account lockout/throttling.
- Secret management and least-privilege database access.

Never store plain-text passwords, return password hashes, commit `.env`, or log passwords, tokens, or secrets.

## 11. Environment Configuration

Create `.env.example` with placeholders, not real credentials.

```env
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=app_user
DB_PASSWORD=replace_me
DB_DATABASE=app_database

JWT_ACCESS_SECRET=replace_with_strong_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=replace_with_different_strong_secret
JWT_REFRESH_EXPIRES_IN=7d

CORS_ORIGIN=http://localhost:3000
```

Validate environment variables at startup and fail fast if required values are missing or invalid. Never commit the real `.env` file.

## 12. Logging and Observability

Use a centralized structured logger such as Pino or Winston.

Log relevant events:

- Application startup and shutdown.
- Database connection failures.
- Unexpected API errors.
- Authentication failures, without credentials or tokens.
- Important business events where auditability is needed.

Use request IDs/correlation IDs. Keep operational logs separate from business audit records where appropriate.

## 13. Pagination, Filtering, and Sorting

Support query parameters where relevant, for example:

```text
GET /api/v1/users?page=1&limit=20&search=john&sortBy=created_at&sortOrder=DESC
```

Rules:

- Default page: 1.
- Default limit: 10.
- Maximum limit: 100.
- Validate and normalize all query values.
- Whitelist sortable fields and sort directions.
- Never interpolate arbitrary client input into SQL identifiers or order clauses.
- Return consistent pagination metadata.

## 14. API Documentation

Use Swagger / OpenAPI.

Document every endpoint, including:

- HTTP method and path.
- Authentication and required permissions.
- Path and query parameters.
- Request body and validation rules.
- Success and error responses.
- Example requests and responses.

Group endpoints by module and keep documentation updated with implementation changes.

## 15. Testing

Use Jest (and an HTTP test helper such as Supertest where appropriate).

### Unit tests

Test service business rules, validators, utility functions, and error mapping. Mock repositories where appropriate.

### Integration tests

Test endpoints, database operations, migrations, authentication, authorization, validation, and response formats.

Use a dedicated test database and isolated test data. Never run destructive tests against production.

## 16. Coding Standards

1. Enable TypeScript strict mode.
2. Avoid `any`; use explicit types and safe narrowing.
3. Prefer async/await.
4. Use clear, consistent names.
5. Keep functions and classes focused.
6. Avoid duplicate logic and deeply nested conditions.
7. Use constants for repeated values.
8. Apply ESLint and Prettier consistently.
9. Separate business logic from HTTP and infrastructure concerns.
10. Add comments only where they clarify non-obvious decisions.
11. Do not introduce abstractions without a concrete benefit.
12. Keep controllers, services, and repositories reasonably small.

## 17. Module Independence

Example business modules:

```text
modules/
├── auth/
├── users/
├── roles/
├── permissions/
├── products/
├── customers/
├── orders/
└── reports/
```

Each module owns its domain logic and persistence details. Other modules should use explicit service interfaces rather than reaching into its repositories or tables. Shared code should be genuinely cross-cutting, not a place to hide domain-specific logic.

## 18. Application Startup and Shutdown

Separate Express application setup from server startup.

**`app.ts`**
- Create and configure the Express application.
- Register global middleware.
- Register versioned routes.
- Register not-found and error middleware.
- Export the configured app without listening on a port.

**`server.ts`**
- Load and validate configuration.
- Initialize the database connection.
- Start listening only after required dependencies are ready.
- Handle SIGTERM and SIGINT.
- Stop accepting requests, close the HTTP server, and close the database connection during graceful shutdown.

Avoid unhandled promise rejections and uncaught exceptions. Log them and shut down safely when the process may be in an inconsistent state.

## 19. Package Scripts

Provide scripts appropriate to the selected TypeORM version and module system. Example:

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "lint": "eslint src",
    "format": "prettier --write src",
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

Configure TypeORM migration commands to match the project's installed TypeORM version, TypeScript runner, module system, and source/build paths. Verify each command rather than copying an incompatible CLI example.

## 20. AI Development Workflow

Work in small, verifiable phases. Do not generate the whole application in one oversized file or implement all business modules at once.

### Phase 1 — Project initialization

- Initialize Node.js and TypeScript.
- Install and configure Express, TypeORM, MySQL driver, Zod, JWT, bcrypt, and development tools.
- Enable strict TypeScript settings.
- Create the agreed folder structure.
- Add `.env.example`, `.gitignore`, and README.

### Phase 2 — Core infrastructure

Implement and verify:

- Environment validation.
- TypeORM DataSource and database connection.
- Logging.
- Standard API response utilities.
- Application error types and global error middleware.
- Request validation middleware.
- Authentication and authorization middleware foundations.
- Route registration and health-check endpoint.

### Phase 3 — Authentication

Implement the Auth module, including login, logout, refresh-token rotation, current-user endpoint, password hashing, token revocation, and tests.

### Phase 4 — User management

Implement the Users module: create, update, delete, get by ID, list, search, pagination, and status management. Apply permissions and validation.

### Phase 5 — Additional modules

Build each new business module using the same conventions. Do not modify unrelated modules unless required. Document any cross-module contract before implementing it.

### Phase 6 — Documentation and verification

- Generate/update Swagger documentation.
- Add unit and integration tests.
- Verify migrations against a test database.
- Run build, lint, and tests.
- Review security and response consistency.
- Update README and setup instructions.

## 21. Mandatory AI Instructions

Before changing code:

1. Inspect the existing project structure and package versions.
2. Read existing conventions and reusable utilities.
3. Identify the smallest set of files that need changes.
4. Explain the intended approach briefly for significant changes.
5. Preserve existing behavior unless the task explicitly changes it.

After changing code:

1. Run TypeScript build/check.
2. Run ESLint.
3. Run relevant tests.
4. Verify migrations and database assumptions.
5. Check response consistency and authorization.
6. Update API documentation and README when needed.
7. Summarize changed files, commands run, results, and any remaining risks.

**Final objective:** deliver a secure, maintainable, testable, modular REST API that can grow with additional business modules without unnecessary coupling.
