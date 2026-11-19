import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../../modules/users/entities/user.entity';

@Entity('audit_logs')
@Index('IDX_audit_logs_entity', ['entityType', 'entityId'])
@Index('IDX_audit_logs_created_at', ['createdAt'])
@Index('IDX_audit_logs_actor_created', ['actorId', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: string;

  @Column({ name: 'actor_id', type: 'int', unsigned: true, nullable: true })
  actorId!: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_id', foreignKeyConstraintName: 'FK_audit_logs_actor' })
  actor!: User | null;

  @Column({ name: 'entity_type', type: 'varchar', length: 100 })
  entityType!: string;

  @Column({ name: 'entity_id', type: 'varchar', length: 100 })
  entityId!: string;

  @Column({ type: 'varchar', length: 30 })
  action!: string;

  @Column({ name: 'before_json', type: 'json', nullable: true })
  before!: Record<string, unknown> | null;

  @Column({ name: 'after_json', type: 'json', nullable: true })
  after!: Record<string, unknown> | null;

  @Column({ name: 'request_id', type: 'varchar', length: 100, nullable: true })
  requestId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime', precision: 6 })
  createdAt!: Date;
}
