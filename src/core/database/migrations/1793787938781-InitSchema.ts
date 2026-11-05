import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1793787938781 implements MigrationInterface {
  name = 'InitSchema1793787938781';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`roles\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`name\` varchar(50) NOT NULL, \`description\` varchar(255) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`UQ_roles_name\` (\`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`users\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`username\` varchar(50) NOT NULL, \`email\` varchar(255) NOT NULL, \`password_hash\` varchar(255) NOT NULL, \`status\` enum ('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active', \`role_id\` int UNSIGNED NOT NULL, \`failed_login_attempts\` int UNSIGNED NOT NULL DEFAULT '0', \`locked_until\` datetime(6) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, UNIQUE INDEX \`UQ_users_username\` (\`username\`), UNIQUE INDEX \`UQ_users_email\` (\`email\`), INDEX \`IDX_users_created_at\` (\`created_at\`), INDEX \`IDX_users_status\` (\`status\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`refresh_tokens\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`user_id\` int UNSIGNED NOT NULL, \`token_hash\` char(64) NOT NULL, \`family_id\` char(36) NOT NULL, \`expires_at\` datetime(6) NOT NULL, \`revoked_at\` datetime(6) NULL, \`user_agent\` varchar(255) NULL, \`ip_address\` varchar(45) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`UQ_refresh_tokens_token_hash\` (\`token_hash\`), INDEX \`IDX_refresh_tokens_user_expires\` (\`user_id\`, \`expires_at\`), INDEX \`IDX_refresh_tokens_family_id\` (\`family_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD CONSTRAINT \`FK_a2cecd1a3531c0b041e29ba46e1\` FOREIGN KEY (\`role_id\`) REFERENCES \`roles\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`refresh_tokens\` ADD CONSTRAINT \`FK_3ddc983c5f7bcf132fd8732c3f4\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`refresh_tokens\` DROP FOREIGN KEY \`FK_3ddc983c5f7bcf132fd8732c3f4\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP FOREIGN KEY \`FK_a2cecd1a3531c0b041e29ba46e1\``,
    );
    await queryRunner.query(`DROP INDEX \`IDX_refresh_tokens_family_id\` ON \`refresh_tokens\``);
    await queryRunner.query(`DROP INDEX \`IDX_refresh_tokens_user_expires\` ON \`refresh_tokens\``);
    await queryRunner.query(`DROP INDEX \`UQ_refresh_tokens_token_hash\` ON \`refresh_tokens\``);
    await queryRunner.query(`DROP TABLE \`refresh_tokens\``);
    await queryRunner.query(`DROP INDEX \`IDX_users_status\` ON \`users\``);
    await queryRunner.query(`DROP INDEX \`IDX_users_created_at\` ON \`users\``);
    await queryRunner.query(`DROP INDEX \`UQ_users_email\` ON \`users\``);
    await queryRunner.query(`DROP INDEX \`UQ_users_username\` ON \`users\``);
    await queryRunner.query(`DROP TABLE \`users\``);
    await queryRunner.query(`DROP INDEX \`UQ_roles_name\` ON \`roles\``);
    await queryRunner.query(`DROP TABLE \`roles\``);
  }
}
