export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  SALES: 'sales',
  WAREHOUSE: 'warehouse',
  QC: 'qc',
  PURCHASING: 'purchasing',
  ACCOUNTING: 'accounting',
  DRIVER: 'driver',
  STAFF: 'staff',
  USER: 'user',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_NAMES = Object.values(ROLES) as [RoleName, ...RoleName[]];
