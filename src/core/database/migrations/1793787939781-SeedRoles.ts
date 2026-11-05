import type { MigrationInterface, QueryRunner } from 'typeorm';

const ROLES = [
  ['admin', 'Full access, including user management'],
  ['manager', 'Can view users and roles'],
  ['staff', 'Standard internal access'],
  ['user', 'Basic access'],
];

export class SeedRoles1793787939781 implements MigrationInterface {
  name = 'SeedRoles1793787939781';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [name, description] of ROLES) {
      await queryRunner.query('INSERT INTO `roles` (`name`, `description`) VALUES (?, ?)', [
        name,
        description,
      ]);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DELETE FROM `roles` WHERE `name` IN (?)', [
      ROLES.map(([name]) => name),
    ]);
  }
}
