import type { z } from 'zod';
import type {
  changePasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
} from '../validators/auth.validator';

export type LoginDto = z.infer<typeof loginSchema>;
export type RefreshDto = z.infer<typeof refreshSchema>;
export type LogoutDto = z.infer<typeof logoutSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
