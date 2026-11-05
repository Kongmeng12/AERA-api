import type { RoleName } from '../../../shared/constants/roles';

/** What other modules may ask of the roles module. */
export interface RoleLookup {
  exists(roleId: number): Promise<boolean>;
  findIdByName(name: RoleName): Promise<number | null>;
}
