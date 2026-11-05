import bcrypt from 'bcrypt';
import { appConfig } from '../../config/app.config';

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, appConfig.bcryptRounds);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

let dummyHash: Promise<string> | undefined;

/** Spends the same time as a real check so unknown emails cannot be detected by timing. */
export async function burnPasswordCheck(plain: string): Promise<void> {
  dummyHash ??= hashPassword('timing-equalizer-not-a-real-password');
  await bcrypt.compare(plain, await dummyHash);
}
