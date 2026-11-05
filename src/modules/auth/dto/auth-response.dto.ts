import { z } from 'zod';

export const tokenPairSchema = z.object({
  tokenType: z.literal('Bearer'),
  accessToken: z.string(),
  refreshToken: z.string(),
});

export type TokenPairDto = z.infer<typeof tokenPairSchema>;
