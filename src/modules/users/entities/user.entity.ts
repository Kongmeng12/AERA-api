import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../roles/entities/role.entity';
import { USER_STATUSES, type UserStatus } from '../interfaces/user.interface';

@Entity('users')
@Index('IDX_users_status', ['status'])
@Index('IDX_users_created_at', ['createdAt'])
export class User {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  // Unique indexes cover soft-deleted rows, so a deleted user's username/email stay reserved.
  @Index('UQ_users_username', { unique: true })
  @Column({ type: 'varchar', length: 50 })
  username!: string;

  @Index('UQ_users_email', { unique: true })
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'enum', enum: USER_STATUSES, default: 'active' })
  status!: UserStatus;

  @Column({ name: 'role_id', type: 'int', unsigned: true })
  roleId!: number;

  @ManyToOne(() => Role, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'role_id' })
  role!: Role;

  @Column({ name: 'failed_login_attempts', type: 'int', unsigned: true, default: 0 })
  failedLoginAttempts!: number;

  @Column({ name: 'locked_until', type: 'datetime', precision: 6, nullable: true })
  lockedUntil!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'datetime', precision: 6, nullable: true })
  deletedAt!: Date | null;
}
