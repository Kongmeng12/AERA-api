import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TimestampedEntity } from './base.entity';
import { User } from '../../../modules/users/entities/user.entity';

@Entity('approval_requests')
@Index('IDX_approval_requests_subject', ['subjectType', 'subjectId'])
@Index('IDX_approval_requests_status_created', ['status', 'createdAt'])
export class ApprovalRequest extends TimestampedEntity {
  @Column({ name: 'request_type', type: 'varchar', length: 50 })
  requestType!: string;

  @Column({ name: 'subject_type', type: 'varchar', length: 50 })
  subjectType!: string;

  @Column({ name: 'subject_id', type: 'varchar', length: 100 })
  subjectId!: string;

  @Column({ name: 'requested_by_id', type: 'int', unsigned: true })
  requestedById!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'requested_by_id', foreignKeyConstraintName: 'FK_approval_requests_requester' })
  requestedBy!: User;

  @Column({ name: 'requested_at', type: 'datetime', precision: 6 })
  requestedAt!: Date;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: string;

  @Column({ name: 'decided_at', type: 'datetime', precision: 6, nullable: true })
  decidedAt!: Date | null;
}

@Entity('approval_decisions')
@Index('IDX_approval_decisions_request_time', ['approvalRequestId', 'decidedAt'])
export class ApprovalDecision extends TimestampedEntity {
  @Column({ name: 'approval_request_id', type: 'int', unsigned: true })
  approvalRequestId!: number;

  @ManyToOne(() => ApprovalRequest, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'approval_request_id', foreignKeyConstraintName: 'FK_approval_decisions_request' })
  approvalRequest!: ApprovalRequest;

  @Column({ name: 'decided_by_id', type: 'int', unsigned: true })
  decidedById!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'decided_by_id', foreignKeyConstraintName: 'FK_approval_decisions_user' })
  decidedBy!: User;

  @Column({ type: 'varchar', length: 20 })
  decision!: string;

  @Column({ name: 'decided_at', type: 'datetime', precision: 6 })
  decidedAt!: Date;

  @Column({ type: 'text', nullable: true })
  comments!: string | null;
}
