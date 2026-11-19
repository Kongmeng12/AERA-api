import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TimestampedEntity } from '../../../core/database/entities/base.entity';
import { SalesOrderLine } from '../../sales/entities/sales-order.entity';
import { User } from '../../users/entities/user.entity';
import { InventoryBalance, StockBatch } from './stock.entity';

@Entity('inventory_reservations')
@Index('IDX_inventory_reservations_order_line_status', ['salesOrderLineId', 'status'])
@Index('IDX_inventory_reservations_balance_status', ['inventoryBalanceId', 'status'])
export class InventoryReservation extends TimestampedEntity {
  @Column({ name: 'sales_order_line_id', type: 'int', unsigned: true })
  salesOrderLineId!: number;

  @ManyToOne(() => SalesOrderLine, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'sales_order_line_id',
    foreignKeyConstraintName: 'FK_inventory_reservations_order_line',
  })
  salesOrderLine!: SalesOrderLine;

  @Column({ name: 'inventory_balance_id', type: 'int', unsigned: true })
  inventoryBalanceId!: number;

  @ManyToOne(() => InventoryBalance, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'inventory_balance_id',
    foreignKeyConstraintName: 'FK_inventory_reservations_balance',
  })
  inventoryBalance!: InventoryBalance;

  @Column({ name: 'batch_id', type: 'int', unsigned: true })
  batchId!: number;

  @ManyToOne(() => StockBatch, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'batch_id', foreignKeyConstraintName: 'FK_inventory_reservations_batch' })
  batch!: StockBatch;

  @Column({ type: 'decimal', precision: 19, scale: 4 })
  quantity!: string;

  @Column({ type: 'varchar', length: 20, default: 'reserved' })
  status!: string;

  @Column({ name: 'reserved_at', type: 'datetime', precision: 6 })
  reservedAt!: Date;

  @Column({ name: 'released_at', type: 'datetime', precision: 6, nullable: true })
  releasedAt!: Date | null;

  @Column({ name: 'released_by_id', type: 'int', unsigned: true, nullable: true })
  releasedById!: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'released_by_id', foreignKeyConstraintName: 'FK_inventory_reservations_user' })
  releasedBy!: User | null;
}
