import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TimestampedEntity } from './base.entity';
import { User } from '../../../modules/users/entities/user.entity';

@Entity('notifications')
@Index('IDX_notifications_type_created', ['eventType', 'createdAt'])
@Index('IDX_notifications_source', ['sourceType', 'sourceId'])
export class Notification extends TimestampedEntity {
  @Column({ name: 'event_type', type: 'varchar', length: 50 })
  eventType!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text' })
  body!: string;

  @Column({ type: 'json', nullable: true })
  payload!: Record<string, unknown> | null;

  @Column({ name: 'source_type', type: 'varchar', length: 50, nullable: true })
  sourceType!: string | null;

  @Column({ name: 'source_id', type: 'varchar', length: 100, nullable: true })
  sourceId!: string | null;

  @Column({ name: 'created_by_id', type: 'int', unsigned: true, nullable: true })
  createdById!: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id', foreignKeyConstraintName: 'FK_notifications_creator' })
  createdBy!: User | null;
}

@Entity('notification_recipients')
@Index('UQ_notification_recipients_notification_user', ['notificationId', 'userId'], {
  unique: true,
})
@Index('IDX_notification_recipients_user_read', ['userId', 'readAt'])
export class NotificationRecipient extends TimestampedEntity {
  @Column({ name: 'notification_id', type: 'int', unsigned: true })
  notificationId!: number;

  @ManyToOne(() => Notification, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notification_id', foreignKeyConstraintName: 'FK_notification_recipients_notice' })
  notification!: Notification;

  @Column({ name: 'user_id', type: 'int', unsigned: true })
  userId!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_notification_recipients_user' })
  user!: User;

  @Column({ name: 'read_at', type: 'datetime', precision: 6, nullable: true })
  readAt!: Date | null;

  @Column({ name: 'delivered_at', type: 'datetime', precision: 6, nullable: true })
  deliveredAt!: Date | null;
}
