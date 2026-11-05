import type { EntityManager } from 'typeorm';
import type { RoleName } from '../../../shared/constants/roles';

export const USER_STATUSES = ['active', 'inactive', 'suspended'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** Internal credential view for the auth module. Never send it to API clients. */
export interface UserAuthRecord {
  id: number;
  passwordHash: string;
  status: UserStatus;
  role: RoleName;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}

export interface LoginFailurePolicy {
  maxAttempts: number;
  lockedUntil: Date;
}

/** The contract the auth module uses instead of reaching into user tables. */
export interface UserCredentialStore {
  findAuthRecordByEmail(email: string): Promise<UserAuthRecord | null>;
  findAuthRecordById(id: number): Promise<UserAuthRecord | null>;
  recordFailedLogin(id: number, policy: LoginFailurePolicy): Promise<void>;
  clearLoginFailures(id: number): Promise<void>;
  updatePasswordHash(id: number, passwordHash: string, manager?: EntityManager): Promise<void>;
}
