import type { Express } from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../../src/app';
import { AppDataSource } from '../../src/core/database/data-source';
import { RefreshToken } from '../../src/modules/auth/entities/refresh-token.entity';
import { Role } from '../../src/modules/roles/entities/role.entity';
import { User } from '../../src/modules/users/entities/user.entity';
import { hashPassword } from '../../src/shared/helpers/password';

const API = '/api/v1';
const ADMIN = { email: 'admin@test.example', password: 'admin-password-1' };
const MANAGER = { email: 'manager@test.example', password: 'manager-password-1' };
const STAFF = { email: 'staff@test.example', password: 'staff-password-1' };

let app: Express;
let roleIds: Record<string, number>;

interface ApiBody<T = Record<string, unknown>> {
  success: boolean;
  code?: string;
  message: string;
  data: T;
  errors?: { field: string; message: string }[];
}
interface Tokens {
  accessToken: string;
  refreshToken: string;
}

const bodyOf = <T>(res: request.Response) => res.body as ApiBody<T>;

async function login(credentials: { email: string; password: string }): Promise<Tokens> {
  const res = await request(app).post(`${API}/auth/login`).send(credentials).expect(200);
  return bodyOf<Tokens>(res).data;
}

async function seedUser(username: string, email: string, password: string, role: string) {
  const repo = AppDataSource.getRepository(User);
  return repo.save(
    repo.create({
      username,
      email,
      passwordHash: await hashPassword(password),
      roleId: roleIds[role],
      status: 'active',
    }),
  );
}

const credentialsOf = ({ email, password }: { email: string; password: string }) => ({
  email,
  password,
});
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
let counter = 0;
const uniqueUser = () => {
  counter += 1;
  return {
    username: `user${counter}`,
    email: `user${counter}@test.example`,
    password: 'a-long-passphrase',
    roleId: roleIds.staff,
  };
};

beforeAll(async () => {
  // Safety rail: this suite wipes the database it connects to.
  if (!process.env.DB_DATABASE?.endsWith('_test')) {
    throw new Error('Integration tests only run against a database whose name ends in _test');
  }
  await AppDataSource.initialize();
  await AppDataSource.dropDatabase();
  await AppDataSource.runMigrations();

  const roles = await AppDataSource.getRepository(Role).find();
  roleIds = Object.fromEntries(roles.map((role) => [role.name, role.id]));
  await seedUser('admin', ADMIN.email, ADMIN.password, 'admin');
  await seedUser('manager', MANAGER.email, MANAGER.password, 'manager');
  await seedUser('staff', STAFF.email, STAFF.password, 'staff');
  app = createApp(AppDataSource);
});

afterAll(async () => {
  await AppDataSource.destroy();
});

describe('platform', () => {
  it('reports health and echoes a safe request ID', async () => {
    const res = await request(app).get(`${API}/health`).set('x-request-id', 'abc-123').expect(200);
    expect(res.body).toEqual({
      success: true,
      message: 'Service is healthy',
      data: { status: 'ok' },
    });
    expect(res.headers['x-request-id']).toBe('abc-123');
  });

  it('replaces an unsafe request ID', async () => {
    const res = await request(app).get(`${API}/health`).set('x-request-id', 'bad id<script>');
    expect(res.headers['x-request-id']).not.toContain('script');
  });

  it('sets security headers and hides Express', async () => {
    const res = await request(app).get(`${API}/health`);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('applies the CORS allowlist', async () => {
    const allowed = await request(app).get(`${API}/health`).set('Origin', 'http://allowed.example');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://allowed.example');
    const denied = await request(app).get(`${API}/health`).set('Origin', 'http://evil.example');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('returns the standard error for unknown routes, bad JSON and large bodies', async () => {
    const missing = await request(app).get(`${API}/nope`).expect(404);
    expect(missing.body).toEqual({
      success: false,
      code: 'ROUTE_NOT_FOUND',
      message: 'Route not found',
    });

    const malformed = await request(app)
      .post(`${API}/auth/login`)
      .set('Content-Type', 'application/json')
      .send('{bad')
      .expect(400);
    expect(bodyOf(malformed).code).toBe('BAD_REQUEST');

    const large = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: 'a@b.co', password: 'x'.repeat(200_000) })
      .expect(413);
    expect(bodyOf(large).code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('documents every endpoint', async () => {
    const res = await request(app).get('/api/docs/openapi.json').expect(200);
    const { paths } = res.body as { paths: Record<string, Record<string, unknown>> };
    const documented = Object.entries(paths).flatMap(([path, operations]) =>
      Object.keys(operations).map((method) => `${method.toUpperCase()} ${path}`),
    );
    expect(documented.sort()).toEqual(
      [
        'GET /health',
        'POST /auth/login',
        'POST /auth/refresh',
        'POST /auth/logout',
        'GET /auth/me',
        'POST /auth/change-password',
        'GET /roles',
        'GET /users',
        'POST /users',
        'GET /users/{id}',
        'PUT /users/{id}',
        'PATCH /users/{id}',
        'DELETE /users/{id}',
        'GET /purchase-orders',
        'GET /purchase-orders/{id}',
        'POST /purchase-orders',
        'POST /purchase-orders/{id}/issue',
        'GET /goods-receipts',
        'GET /goods-receipts/{id}',
        'POST /goods-receipts',
        'GET /inventory/balances',
        'GET /inventory/batches',
        'GET /inventory/movements',
        'GET /sales-orders',
        'GET /sales-orders/{id}',
        'POST /sales-orders',
        'POST /sales-orders/{id}/approve',
        'POST /sales-orders/{id}/cancel',
        'GET /sales-returns',
        'GET /sales-returns/{id}',
        'POST /sales-returns',
        'POST /sales-returns/{id}/approve',
        'POST /sales-returns/{id}/reject',
        'GET /supplier-bills',
        'GET /supplier-bills/{id}',
        'POST /supplier-bills',
        'POST /supplier-bills/{id}/post',
        'POST /supplier-payments',
        'GET /production/bills-of-materials',
        'GET /production/bills-of-materials/{id}',
        'POST /production/bills-of-materials',
        'POST /production/bills-of-materials/{id}/activate',
        'GET /production/orders',
        'GET /production/orders/{id}',
        'POST /production/orders',
        'POST /production/orders/{id}/material-issues',
        'POST /production/orders/{id}/outputs',
        'GET /sales-prices',
        'POST /sales-prices',
        'GET /sales-invoices',
        'GET /sales-invoices/{id}',
        'POST /payment-receipts',
        'GET /deliveries',
        'GET /deliveries/{id}',
        'POST /deliveries',
        'POST /deliveries/{id}/dispatch',
        'POST /deliveries/{id}/complete',
        ...[
          '/customer-types',
          '/customers',
          '/suppliers',
          '/units',
          '/item-categories',
          '/items',
          '/warehouses',
        ].flatMap((path) => [
          `GET ${path}`,
          `POST ${path}`,
          `GET ${path}/{id}`,
          `PATCH ${path}/{id}`,
          `DELETE ${path}/{id}`,
        ]),
      ].sort(),
    );
    await request(app).get('/api/docs/').expect(200).expect('Content-Type', /html/);
  });
});

describe('master data', () => {
  it('protects master-data routes and creates customer types and customers', async () => {
    await request(app).get(`${API}/customers`).expect(401);

    const { accessToken: staffToken } = await login(STAFF);
    await request(app).get(`${API}/customers`).set(bearer(staffToken)).expect(403);

    const { accessToken: adminToken } = await login(ADMIN);
    const suffix = Date.now().toString();
    const customerType = await request(app)
      .post(`${API}/customer-types`)
      .set(bearer(adminToken))
      .send({ code: `TYPE-${suffix}`, name: 'Retail' })
      .expect(201);
    const customerTypeId = bodyOf<{ id: number }>(customerType).data.id;

    const customer = await request(app)
      .post(`${API}/customers`)
      .set(bearer(adminToken))
      .send({
        customerCode: `CUS-${suffix}`,
        customerTypeId,
        name: 'Example Shop',
      })
      .expect(201);
    expect(bodyOf<{ customerCode: string; creditLimit: string }>(customer).data).toMatchObject({
      customerCode: `CUS-${suffix}`,
      creditLimit: '0.0000',
    });

    await request(app)
      .post(`${API}/customers`)
      .set(bearer(adminToken))
      .send({
        customerCode: `CUS-${suffix}`,
        customerTypeId,
        name: 'Duplicate Shop',
      })
      .expect(409);
  });
});

describe('authentication', () => {
  it('logs in and returns the current user without secrets', async () => {
    const { accessToken } = await login(STAFF);
    const res = await request(app).get(`${API}/auth/me`).set(bearer(accessToken)).expect(200);
    expect(bodyOf<{ email: string; role: { name: string } }>(res).data).toMatchObject({
      email: STAFF.email,
      role: { name: 'staff' },
    });
    expect(JSON.stringify(res.body)).not.toMatch(/hash|password/i);
  });

  it('accepts a differently cased email', async () => {
    await login({ ...STAFF, email: STAFF.email.toUpperCase() });
  });

  it('gives identical answers for a wrong password and an unknown email', async () => {
    const wrong = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: MANAGER.email, password: 'wrong-password' })
      .expect(401);
    const unknown = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: 'ghost@test.example', password: 'wrong-password' })
      .expect(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(bodyOf(wrong).code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('returns field errors for invalid login input', async () => {
    const res = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: 'nope', password: '' })
      .expect(422);
    expect(bodyOf(res).code).toBe('VALIDATION_ERROR');
    expect(
      bodyOf(res)
        .errors?.map((error) => error.field)
        .sort(),
    ).toEqual(['email', 'password']);
  });

  it.each([
    ['no header', undefined],
    ['wrong scheme', 'Basic abc'],
    ['garbage token', 'Bearer not.a.jwt'],
  ])('rejects %s with 401', async (_name, header) => {
    const req = request(app).get(`${API}/auth/me`);
    const res = await (header ? req.set('Authorization', header) : req).expect(401);
    expect(bodyOf(res).code).toBe('AUTH_UNAUTHORIZED');
  });

  it('rejects forged tokens', async () => {
    const claims = {
      role: 'admin',
      sub: '1',
      iss: 'aera-mineral-api',
      aud: 'aera-mineral-clients',
    };
    const forged = [
      jwt.sign(claims, 'an-attacker-secret-of-sufficient-length-000'),
      jwt.sign(claims, '', { algorithm: 'none' }),
      // A refresh-secret token must not work as an access token.
      jwt.sign(claims, process.env.JWT_REFRESH_SECRET as string),
    ];
    for (const token of forged) {
      await request(app).get(`${API}/auth/me`).set(bearer(token)).expect(401);
    }
  });

  it('reports an expired access token with its own code', async () => {
    const expired = jwt.sign(
      { role: 'staff', sub: '1', iss: 'aera-mineral-api', aud: 'aera-mineral-clients' },
      process.env.JWT_ACCESS_SECRET as string,
      { expiresIn: -10 },
    );
    const res = await request(app).get(`${API}/auth/me`).set(bearer(expired)).expect(401);
    expect(bodyOf(res).code).toBe('AUTH_TOKEN_EXPIRED');
  });

  it('stores refresh tokens only as hashes', async () => {
    const { refreshToken } = await login(STAFF);
    const stored = await AppDataSource.getRepository(RefreshToken).find();
    expect(stored.length).toBeGreaterThan(0);
    expect(stored.some((row) => row.tokenHash === refreshToken)).toBe(false);
    expect(stored.every((row) => /^[0-9a-f]{64}$/.test(row.tokenHash))).toBe(true);
  });
});

describe('refresh tokens', () => {
  const refresh = (refreshToken: string) =>
    request(app).post(`${API}/auth/refresh`).send({ refreshToken });

  it('rotates, and reuse of an old token kills the whole session', async () => {
    const first = await login(STAFF);
    const second = bodyOf<Tokens>(await refresh(first.refreshToken).expect(200)).data;
    expect(second.refreshToken).not.toBe(first.refreshToken);

    const reuse = await refresh(first.refreshToken).expect(401);
    expect(bodyOf(reuse).code).toBe('AUTH_REFRESH_INVALID');
    // The legitimate newer token dies too, because the session is treated as compromised.
    await refresh(second.refreshToken).expect(401);
  });

  it('allows only one winner when the same token is used concurrently', async () => {
    const { refreshToken } = await login(STAFF);
    const results = await Promise.all([refresh(refreshToken), refresh(refreshToken)]);
    expect(results.map((res) => res.status).sort()).toEqual([200, 401]);
    // Nothing from the session may survive, including the winner's new token.
    const winner = results.find((res) => res.status === 200) as request.Response;
    await refresh(bodyOf<Tokens>(winner).data.refreshToken).expect(401);
  });

  it('does not accept an access token as a refresh token', async () => {
    const { accessToken } = await login(STAFF);
    await refresh(accessToken).expect(401);
  });

  it('logout revokes the session and is idempotent', async () => {
    const { refreshToken } = await login(STAFF);
    await request(app).post(`${API}/auth/logout`).send({ refreshToken }).expect(200);
    await request(app).post(`${API}/auth/logout`).send({ refreshToken }).expect(200);
    await refresh(refreshToken).expect(401);
  });

  it('keeps other sessions alive on logout', async () => {
    const one = await login(STAFF);
    const two = await login(STAFF);
    await request(app)
      .post(`${API}/auth/logout`)
      .send({ refreshToken: one.refreshToken })
      .expect(200);
    await refresh(two.refreshToken).expect(200);
  });
});

describe('account protection', () => {
  it('locks after 5 wrong passwords, and the right password then fails too', async () => {
    const creds = { email: 'lockme@test.example', password: 'right-password-1' };
    await seedUser('lockme', creds.email, creds.password, 'staff');
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app)
        .post(`${API}/auth/login`)
        .send({ email: creds.email, password: 'wrong-password' })
        .expect(401);
    }
    await request(app).post(`${API}/auth/login`).send(creds).expect(401);

    const repo = AppDataSource.getRepository(User);
    const locked = await repo.findOneByOrFail({ email: creds.email });
    expect(locked.lockedUntil?.getTime()).toBeGreaterThan(Date.now());

    // When the lock expires, the correct password works again.
    await repo.update({ id: locked.id }, { lockedUntil: new Date(Date.now() - 1000) });
    await login(creds);
    const cleared = await repo.findOneByOrFail({ email: creds.email });
    expect(cleared.lockedUntil).toBeNull();
    expect(cleared.failedLoginAttempts).toBe(0);
  });

  it('changing password revokes sessions and replaces the credential', async () => {
    const creds = { email: 'changer@test.example', password: 'old-password-1' };
    await seedUser('changer', creds.email, creds.password, 'staff');
    const session = await login(creds);

    await request(app)
      .post(`${API}/auth/change-password`)
      .set(bearer(session.accessToken))
      .send({ currentPassword: 'wrong-one', newPassword: 'new-password-1' })
      .expect(401);
    await request(app)
      .post(`${API}/auth/change-password`)
      .set(bearer(session.accessToken))
      .send({ currentPassword: creds.password, newPassword: 'new-password-1' })
      .expect(200);

    await request(app)
      .post(`${API}/auth/refresh`)
      .send({ refreshToken: session.refreshToken })
      .expect(401);
    await request(app).post(`${API}/auth/login`).send(creds).expect(401);
    await login({ email: creds.email, password: 'new-password-1' });
  });
});

describe('users and RBAC', () => {
  let admin: Tokens;
  let manager: Tokens;
  let staff: Tokens;

  beforeAll(async () => {
    [admin, manager, staff] = await Promise.all([login(ADMIN), login(MANAGER), login(STAFF)]);
  });

  const create = (body: object, token = admin.accessToken) =>
    request(app).post(`${API}/users`).set(bearer(token)).send(body);

  it('enforces the role matrix', async () => {
    await request(app).get(`${API}/users`).expect(401);
    await request(app).get(`${API}/users`).set(bearer(staff.accessToken)).expect(403);
    await request(app).get(`${API}/roles`).set(bearer(staff.accessToken)).expect(403);
    await request(app).get(`${API}/users`).set(bearer(manager.accessToken)).expect(200);
    await request(app).get(`${API}/roles`).set(bearer(manager.accessToken)).expect(200);
    await create(uniqueUser(), manager.accessToken).expect(403);
    await create(uniqueUser(), staff.accessToken).expect(403);
    await request(app).delete(`${API}/users/1`).set(bearer(manager.accessToken)).expect(403);
    await request(app)
      .patch(`${API}/users/1`)
      .set(bearer(manager.accessToken))
      .send({ status: 'inactive' })
      .expect(403);
  });

  it('checks permissions before validating input', async () => {
    await create({}, staff.accessToken).expect(403);
  });

  it('creates a user with a hashed password and returns no secrets', async () => {
    const input = uniqueUser();
    const res = await create(input).expect(201);
    expect(JSON.stringify(res.body)).not.toMatch(/hash|password/i);
    const row = await AppDataSource.getRepository(User).findOneByOrFail({ email: input.email });
    expect(row.passwordHash).toMatch(/^\$2[aby]\$/);
    await login(credentialsOf(input));
  });

  it('rejects mass assignment and invalid input', async () => {
    const res = await create({ ...uniqueUser(), failedLoginAttempts: 0 }).expect(422);
    expect(bodyOf(res).code).toBe('VALIDATION_ERROR');
    await create({ ...uniqueUser(), email: 'bad' }).expect(422);
    await create({ ...uniqueUser(), password: 'short' }).expect(422);
    const role = await create({ ...uniqueUser(), roleId: 999_999 }).expect(422);
    expect(bodyOf(role).code).toBe('ROLE_NOT_FOUND');
  });

  it('returns 409 for duplicate username or email', async () => {
    const input = uniqueUser();
    await create(input).expect(201);
    const email = await create({ ...uniqueUser(), email: input.email }).expect(409);
    expect(bodyOf(email).code).toBe('USER_ALREADY_EXISTS');
    await create({ ...uniqueUser(), username: input.username }).expect(409);
  });

  it('turns a concurrent duplicate into a 409, not a 500', async () => {
    const input = uniqueUser();
    const results = await Promise.all([create(input), create(input), create(input)]);
    const statuses = results.map((res) => res.status).sort();
    expect(statuses[0]).toBe(201);
    expect(statuses.slice(1)).toEqual([409, 409]);
  });

  it('gets by ID, and validates and 404s bad IDs', async () => {
    const created = bodyOf<{ id: number }>(await create(uniqueUser()).expect(201)).data;
    const get = (id: number | string) =>
      request(app).get(`${API}/users/${id}`).set(bearer(admin.accessToken));
    await get(created.id).expect(200);
    const missing = await get(999_999).expect(404);
    expect(bodyOf(missing).code).toBe('USER_NOT_FOUND');
    await get('abc').expect(422);
    await get('1 OR 1=1').expect(422);
  });

  it('supports PUT and PATCH, and PUT requires every field', async () => {
    const input = uniqueUser();
    const { id } = bodyOf<{ id: number }>(await create(input).expect(201)).data;
    const url = `${API}/users/${id}`;
    await request(app)
      .put(url)
      .set(bearer(admin.accessToken))
      .send({ username: 'x12' })
      .expect(422);
    await request(app).patch(url).set(bearer(admin.accessToken)).send({}).expect(422);

    const put = await request(app)
      .put(url)
      .set(bearer(admin.accessToken))
      .send({
        username: `${input.username}x`,
        email: input.email,
        roleId: roleIds.manager,
        status: 'active',
      })
      .expect(200);
    expect(bodyOf<{ role: { name: string } }>(put).data.role.name).toBe('manager');

    const patch = await request(app)
      .patch(url)
      .set(bearer(admin.accessToken))
      .send({ status: 'inactive' })
      .expect(200);
    expect(bodyOf<{ status: string; username: string }>(patch).data).toMatchObject({
      status: 'inactive',
      username: `${input.username}x`,
    });
    // A password cannot be changed through user updates.
    await request(app)
      .patch(url)
      .set(bearer(admin.accessToken))
      .send({ password: 'x' })
      .expect(422);
  });

  it('blocks a suspended user from logging in or refreshing, and a role change applies on refresh', async () => {
    const input = uniqueUser();
    const { id } = bodyOf<{ id: number }>(await create(input).expect(201)).data;
    const url = `${API}/users/${id}`;
    const session = await login(credentialsOf(input));

    await request(app)
      .patch(url)
      .set(bearer(admin.accessToken))
      .send({ roleId: roleIds.manager })
      .expect(200);
    const rotated = bodyOf<Tokens>(
      await request(app)
        .post(`${API}/auth/refresh`)
        .send({ refreshToken: session.refreshToken })
        .expect(200),
    ).data;
    expect((jwt.decode(rotated.accessToken) as { role: string }).role).toBe('manager');

    await request(app)
      .patch(url)
      .set(bearer(admin.accessToken))
      .send({ status: 'suspended' })
      .expect(200);
    await request(app)
      .post(`${API}/auth/refresh`)
      .send({ refreshToken: rotated.refreshToken })
      .expect(401);
    await request(app).post(`${API}/auth/login`).send(credentialsOf(input)).expect(401);
  });

  it('stops an admin removing their own access', async () => {
    const me = bodyOf<{ id: number }>(
      await request(app).get(`${API}/auth/me`).set(bearer(admin.accessToken)).expect(200),
    ).data;
    const url = `${API}/users/${me.id}`;
    const code = 'USER_SELF_MODIFICATION_FORBIDDEN';
    const del = await request(app).delete(url).set(bearer(admin.accessToken)).expect(403);
    expect(bodyOf(del).code).toBe(code);
    const demote = await request(app)
      .patch(url)
      .set(bearer(admin.accessToken))
      .send({ roleId: roleIds.user })
      .expect(403);
    expect(bodyOf(demote).code).toBe(code);
  });

  it('soft-deletes: the user disappears, cannot log in, and the email stays reserved', async () => {
    const input = uniqueUser();
    const { id } = bodyOf<{ id: number }>(await create(input).expect(201)).data;
    const session = await login(credentialsOf(input));
    const url = `${API}/users/${id}`;

    const res = await request(app).delete(url).set(bearer(admin.accessToken)).expect(204);
    expect(res.text).toBe('');
    await request(app).get(url).set(bearer(admin.accessToken)).expect(404);
    await request(app).delete(url).set(bearer(admin.accessToken)).expect(404);
    await request(app).post(`${API}/auth/login`).send(credentialsOf(input)).expect(401);
    await request(app)
      .post(`${API}/auth/refresh`)
      .send({ refreshToken: session.refreshToken })
      .expect(401);
    await request(app).get(`${API}/auth/me`).set(bearer(session.accessToken)).expect(401);
    await create({ ...uniqueUser(), email: input.email }).expect(409);

    const row = await AppDataSource.getRepository(User).findOne({
      where: { id },
      withDeleted: true,
    });
    expect(row?.deletedAt).toBeInstanceOf(Date);
  });

  describe('listing', () => {
    const list = (query: string, token = admin.accessToken) =>
      request(app).get(`${API}/users?${query}`).set(bearer(token));
    interface Page {
      items: { username: string; email: string; status: string; role: { name: string } }[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }
    const pageOf = (res: request.Response) => bodyOf<Page>(res).data;

    beforeAll(async () => {
      for (const username of ['zeta_list', 'alpha_list', 'mid%list']) {
        const safe = username.replace('%', 'pct');
        await seedUser(safe, `${safe}@test.example`, 'list-password-1', 'staff');
      }
    });

    it('paginates with correct metadata and no secrets', async () => {
      const res = await list('page=1&limit=2').expect(200);
      const { items, pagination } = pageOf(res);
      expect(items).toHaveLength(2);
      expect(pagination).toMatchObject({ page: 1, limit: 2 });
      expect(pagination.totalPages).toBe(Math.ceil(pagination.total / 2));
      expect(JSON.stringify(res.body)).not.toMatch(/hash|password/i);
    });

    it('applies defaults and enforces the maximum limit', async () => {
      expect(pageOf(await list('').expect(200)).pagination).toMatchObject({ page: 1, limit: 10 });
      await list('limit=101').expect(422);
    });

    it('searches and sorts', async () => {
      const usernames = (res: request.Response) => pageOf(res).items.map((item) => item.username);
      expect(
        usernames(await list('search=_list&sortBy=username&sortOrder=ASC').expect(200)),
      ).toEqual(['alpha_list', 'zeta_list']);
      expect(
        usernames(await list('search=_list&sortBy=username&sortOrder=DESC').expect(200)),
      ).toEqual(['zeta_list', 'alpha_list']);
    });

    it('treats LIKE wildcards in search literally', async () => {
      expect(pageOf(await list('search=%25').expect(200)).pagination.total).toBe(0);
      const underscore = pageOf(await list('search=_').expect(200));
      expect(underscore.items.every((item) => /_/.test(item.username + item.email))).toBe(true);
    });

    it('rejects sort columns outside the whitelist', async () => {
      await list('sortBy=password_hash').expect(422);
      await list('sortBy=id;DROP TABLE users').expect(422);
      await list('sortOrder=sideways').expect(422);
    });

    it('filters by status and role', async () => {
      const staffOnly = pageOf(await list(`roleId=${roleIds.staff}&limit=100`).expect(200));
      expect(staffOnly.items.length).toBeGreaterThan(0);
      expect(staffOnly.items.every((item) => item.role.name === 'staff')).toBe(true);
      const active = pageOf(await list('status=active&limit=100').expect(200));
      expect(active.items.every((item) => item.status === 'active')).toBe(true);
    });
  });
});

describe('logging safety', () => {
  it('does not let TypeORM print SQL parameters', async () => {
    const consoleLog = jest.spyOn(console, 'log');
    const input = uniqueUser();
    const { accessToken } = await login(ADMIN);
    const send = () => request(app).post(`${API}/users`).set(bearer(accessToken)).send(input);
    await Promise.all([send(), send()]);
    expect(consoleLog).not.toHaveBeenCalled();
    consoleLog.mockRestore();
  });
});

describe('migrations', () => {
  it('are fully reversible and match the entities', async () => {
    // Removing the seeded roles is blocked by a foreign key while users still reference them.
    await AppDataSource.getRepository(User).createQueryBuilder().delete().execute();
    const countMigrations = AppDataSource.migrations.length;
    for (let index = 0; index < countMigrations; index += 1) {
      await AppDataSource.undoLastMigration();
    }
    expect(await AppDataSource.createQueryRunner().hasTable('users')).toBe(false);
    await AppDataSource.runMigrations();
    expect(await AppDataSource.getRepository(Role).count()).toBe(4);

    const pending = await AppDataSource.driver.createSchemaBuilder().log();
    expect(pending.upQueries.map((query) => query.query)).toEqual([]);
  });
});
