import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Permission } from './permission.entity';
import { Role } from './role.entity';

@Entity('role_permissions')
@Index('UQ_role_permissions_role_permission', ['roleId', 'permissionId'], { unique: true })
@Index('IDX_role_permissions_role', ['roleId'])
@Index('IDX_role_permissions_permission', ['permissionId'])
export class RolePermission {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ name: 'role_id', type: 'int', unsigned: true })
  roleId!: number;

  @Column({ name: 'permission_id', type: 'int', unsigned: true })
  permissionId!: number;

  @ManyToOne(() => Role, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id', foreignKeyConstraintName: 'FK_role_permissions_role' })
  role!: Role;

  @ManyToOne(() => Permission, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'permission_id',
    foreignKeyConstraintName: 'FK_role_permissions_permission',
  })
  permission!: Permission;
}
