import { MigrationInterface, QueryRunner } from 'typeorm';

const PERMISSIONS = [
  ['users.manage', 'Manage users'],
  ['roles.manage', 'Manage roles and permissions'],
  ['customers.manage', 'Manage customers'],
  ['suppliers.manage', 'Manage suppliers'],
  ['products.manage', 'Manage products'],
  ['warehouse.manage', 'Manage warehouse and stock'],
  ['qc.manage', 'Manage quality control'],
  ['purchasing.manage', 'Manage purchasing'],
  ['sales.manage', 'Manage sales orders'],
  ['delivery.manage', 'Manage deliveries'],
  ['accounting.manage', 'Manage billing and accounts'],
  ['reports.view', 'View reports'],
  ['audit.view', 'View audit logs'],
];

export class Phase1AuthorizationAudit1793787940781 implements MigrationInterface {
  name = 'Phase1AuthorizationAudit1793787940781';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`permissions\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`code\` varchar(100) NOT NULL, \`name\` varchar(255) NOT NULL, \`description\` varchar(255) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`UQ_permissions_code\` (\`code\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`role_permissions\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`role_id\` int UNSIGNED NOT NULL, \`permission_id\` int UNSIGNED NOT NULL, PRIMARY KEY (\`id\`), UNIQUE INDEX \`UQ_role_permissions_role_permission\` (\`role_id\`, \`permission_id\`), INDEX \`IDX_role_permissions_role\` (\`role_id\`), INDEX \`IDX_role_permissions_permission\` (\`permission_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`role_permissions\` ADD CONSTRAINT \`FK_role_permissions_role\` FOREIGN KEY (\`role_id\`) REFERENCES \`roles\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`role_permissions\` ADD CONSTRAINT \`FK_role_permissions_permission\` FOREIGN KEY (\`permission_id\`) REFERENCES \`permissions\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE TABLE \`audit_logs\` (\`id\` bigint UNSIGNED NOT NULL AUTO_INCREMENT, \`actor_id\` int UNSIGNED NULL, \`entity_type\` varchar(100) NOT NULL, \`entity_id\` varchar(100) NOT NULL, \`action\` varchar(30) NOT NULL, \`before_json\` json NULL, \`after_json\` json NULL, \`request_id\` varchar(100) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_audit_logs_entity\` (\`entity_type\`, \`entity_id\`), INDEX \`IDX_audit_logs_created_at\` (\`created_at\`), INDEX \`IDX_audit_logs_actor_created\` (\`actor_id\`, \`created_at\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`audit_logs\` ADD CONSTRAINT \`FK_audit_logs_actor\` FOREIGN KEY (\`actor_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE TABLE \`document_sequences\` (\`id\` int UNSIGNED NOT NULL AUTO_INCREMENT, \`key\` varchar(50) NOT NULL, \`prefix\` varchar(50) NULL, \`value\` int UNSIGNED NOT NULL DEFAULT '0', \`year\` char(4) NOT NULL DEFAULT '2026', \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`UQ_document_sequences_key\` (\`key\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );

    for (const [code, name] of PERMISSIONS) {
      await queryRunner.query(
        'INSERT INTO `permissions` (`code`, `name`) VALUES (?, ?)',
        [code, name],
      );
    }

    await queryRunner.query(`
      INSERT INTO \`roles\` (\`name\`, \`description\`)
      SELECT name, description
      FROM (SELECT 'sales' AS name, 'Sales and customer operations' AS description
            UNION ALL SELECT 'warehouse', 'Warehouse and stock operations'
            UNION ALL SELECT 'qc', 'Quality-control operations'
            UNION ALL SELECT 'purchasing', 'Purchasing and supplier operations'
            UNION ALL SELECT 'accounting', 'Billing and accounts operations'
            UNION ALL SELECT 'driver', 'Delivery operations') AS missing_roles
      WHERE NOT EXISTS (SELECT 1 FROM \`roles\` WHERE \`roles\`.name = missing_roles.name)
    `);

    await queryRunner.query(`
      INSERT INTO \`role_permissions\` (\`role_id\`, \`permission_id\`)
      SELECT r.id, p.id
      FROM \`roles\` r
      JOIN \`permissions\` p
      WHERE r.name = 'admin'
    `);

    await queryRunner.query(`
      INSERT INTO \`role_permissions\` (\`role_id\`, \`permission_id\`)
      SELECT r.id, p.id
      FROM \`roles\` r
      JOIN \`permissions\` p
      WHERE r.name = 'manager' AND p.code IN ('users.manage','reports.view','audit.view')
    `);

    await queryRunner.query(`
      INSERT INTO \`role_permissions\` (\`role_id\`, \`permission_id\`)
      SELECT r.id, p.id
      FROM \`roles\` r
      JOIN \`permissions\` p
      WHERE
        (r.name = 'sales' AND p.code IN ('customers.manage','sales.manage','delivery.manage','reports.view'))
        OR (r.name = 'warehouse' AND p.code IN ('warehouse.manage','delivery.manage','reports.view'))
        OR (r.name = 'qc' AND p.code IN ('qc.manage','reports.view'))
        OR (r.name = 'purchasing' AND p.code IN ('suppliers.manage','purchasing.manage','products.manage','reports.view'))
        OR (r.name = 'accounting' AND p.code IN ('accounting.manage','reports.view'))
        OR (r.name = 'driver' AND p.code = 'delivery.manage')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`audit_logs\` DROP FOREIGN KEY \`FK_audit_logs_actor\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`role_permissions\` DROP FOREIGN KEY \`FK_role_permissions_permission\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`role_permissions\` DROP FOREIGN KEY \`FK_role_permissions_role\``,
    );
    await queryRunner.query(`DROP TABLE \`document_sequences\``);
    await queryRunner.query(`DROP TABLE \`audit_logs\``);
    await queryRunner.query(`DROP TABLE \`role_permissions\``);
    await queryRunner.query(`DROP TABLE \`permissions\``);
  }
}
