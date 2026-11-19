import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Permission } from './permission.entity';
import { User } from '../../users/entities/user.entity';

@Entity('user_permissions')
@Index('UQ_user_permissions_user_permission', ['userId', 'permissionId'], { unique: true })
@Index('IDX_user_permissions_user', ['userId'])
export class UserPermission {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ name: 'user_id', type: 'int', unsigned: true })
  userId!: number;

  @Column({ name: 'permission_id', type: 'int', unsigned: true })
  permissionId!: number;

  @Column({ type: 'varchar', length: 10 })
  effect!: 'grant' | 'deny';

  @Column({ name: 'granted_by_id', type: 'int', unsigned: true, nullable: true })
  grantedById!: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_user_permissions_user' })
  user!: User;

  @ManyToOne(() => Permission, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'permission_id',
    foreignKeyConstraintName: 'FK_user_permissions_permission',
  })
  permission!: Permission;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'granted_by_id', foreignKeyConstraintName: 'FK_user_permissions_granted_by' })
  grantedBy!: User | null;
}
