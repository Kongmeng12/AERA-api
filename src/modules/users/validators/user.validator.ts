import { z } from 'zod';
import { paginationQueryShape } from '../../../shared/helpers/pagination';
import { USER_STATUSES } from '../interfaces/user.interface';

const BCRYPT_MAX_BYTES = 72;

export const emailSchema = z.string().trim().toLowerCase().max(255).pipe(z.email());

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine(
    (value) => Buffer.byteLength(value, 'utf8') <= BCRYPT_MAX_BYTES,
    `Password must be at most ${BCRYPT_MAX_BYTES} bytes`,
  );

const usernameSchema = z
  .string()
  .trim()
  .regex(/^[a-zA-Z0-9_.-]{3,50}$/, 'Username must be 3-50 letters, digits, ".", "_" or "-"');

const idSchema = z.coerce.number().int().min(1).max(4_294_967_295);

export const userIdParamsSchema = z.object({ id: idSchema });

// Strict objects reject unknown keys, which blocks mass assignment.
export const createUserSchema = z.strictObject({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  roleId: idSchema,
  status: z.enum(USER_STATUSES).default('active'),
});

export const replaceUserSchema = z.strictObject({
  username: usernameSchema,
  email: emailSchema,
  roleId: idSchema,
  status: z.enum(USER_STATUSES),
});

export const patchUserSchema = replaceUserSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const USER_SORT_FIELDS = ['id', 'username', 'email', 'status', 'created_at'] as const;

export const listUsersQuerySchema = z.object({
  ...paginationQueryShape,
  search: z.string().trim().min(1).max(100).optional(),
  status: z.enum(USER_STATUSES).optional(),
  roleId: idSchema.optional(),
  sortBy: z.enum(USER_SORT_FIELDS).default('created_at'),
  sortOrder: z.enum(['ASC', 'DESC']).default('DESC'),
});
