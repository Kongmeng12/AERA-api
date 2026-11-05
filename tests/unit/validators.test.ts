import { DEFAULT_LIMIT, MAX_LIMIT } from '../../src/shared/helpers/pagination';
import {
  createUserSchema,
  listUsersQuerySchema,
  passwordSchema,
} from '../../src/modules/users/validators/user.validator';
import {
  changePasswordSchema,
  loginSchema,
} from '../../src/modules/auth/validators/auth.validator';

const validUser = {
  username: 'somchai',
  email: 'somchai@example.com',
  password: 'a-long-passphrase',
  roleId: 3,
};

describe('validators', () => {
  it('normalizes email case and whitespace', () => {
    expect(loginSchema.parse({ email: '  A@Example.COM ', password: 'x' }).email).toBe(
      'a@example.com',
    );
  });

  it('rejects unknown fields to block mass assignment', () => {
    expect(createUserSchema.safeParse({ ...validUser, isAdmin: true }).success).toBe(false);
  });

  it('rejects passwords bcrypt would silently truncate', () => {
    expect(passwordSchema.safeParse('a'.repeat(72)).success).toBe(true);
    expect(passwordSchema.safeParse('a'.repeat(73)).success).toBe(false);
    expect(passwordSchema.safeParse('ກ'.repeat(25)).success).toBe(false);
  });

  it('applies pagination defaults and coerces query strings', () => {
    expect(listUsersQuerySchema.parse({})).toMatchObject({ page: 1, limit: DEFAULT_LIMIT });
    expect(listUsersQuerySchema.parse({ page: '3', limit: '20' })).toMatchObject({
      page: 3,
      limit: 20,
    });
  });

  it.each([
    { limit: String(MAX_LIMIT + 1) },
    { page: '0' },
    { sortBy: 'password_hash' },
    { sortOrder: 'x;DROP' },
  ])('rejects unsafe list query %j', (query) => {
    expect(listUsersQuerySchema.safeParse(query).success).toBe(false);
  });

  it('requires the new password to differ', () => {
    const same = { currentPassword: 'same-password', newPassword: 'same-password' };
    expect(changePasswordSchema.safeParse(same).success).toBe(false);
  });
});
