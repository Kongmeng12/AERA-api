import { z } from 'zod';
import { emailSchema, passwordSchema } from '../../users/validators/user.validator';

export const loginSchema = z.strictObject({
  email: emailSchema,
  // Not checked against the password policy: older passwords must still be able to log in.
  password: z.string().min(1).max(1024),
});

const refreshTokenField = z.string().min(1).max(4096);

export const refreshSchema = z.strictObject({ refreshToken: refreshTokenField });
export const logoutSchema = z.strictObject({ refreshToken: refreshTokenField });

export const changePasswordSchema = z
  .strictObject({
    currentPassword: z.string().min(1).max(1024),
    newPassword: passwordSchema,
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    path: ['newPassword'],
    message: 'New password must differ from the current password',
  });
