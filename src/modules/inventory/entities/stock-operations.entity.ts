import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TimestampedEntity } from '../../../core/database/entities/base.entity';
import { Item } from '../../master-data/entities/item.entity';
import { Unit } from '../../master-data/entities/item.entity';
import { Warehouse, WarehouseZone } from '../../master-data/entities/warehouse.entity';
import { User } from '../../users/entities/user.entity';
import { InventoryUnit, StockBatch } from './stock.entity';

@Entity('stock_transfers')
@Index('UQ_stock_transfers_number', ['transferNumber'], { unique: true })
@Index('IDX_stock_transfers_status_date', ['status', 'requestedAt'])
export class StockTransfer extends TimestampedEntity {
  @Column({ name: 'transfer_number', type: 'varchar', length: 50 })
  transferNumber!: string;

  @Column({ name: 'from_warehouse_id', type: 'int', unsigned: true })
  fromWarehouseId!: number;

  @ManyToOne(() => Warehouse, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'from_warehouse_id', foreignKeyConstraintName: 'FK_stock_transfers_from_warehouse' })
  fromWarehouse!: Warehouse;

  @Column({ name: 'from_zone_id', type: 'int', unsigned: true, nullable: true })
  fromZoneId!: number | null;

  @ManyToOne(() => WarehouseZone, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'from_zone_id', foreignKeyConstraintName: 'FK_stock_transfers_from_zone' })
  fromZone!: WarehouseZone | null;

  @Column({ name: 'to_warehouse_id', type: 'int', unsigned: true })
  toWarehouseId!: number;

  @ManyToOne(() => Warehouse, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'to_warehouse_id', foreignKeyConstraintName: 'FK_stock_transfers_to_warehouse' })
  toWarehouse!: Warehouse;

  @Column({ name: 'to_zone_id', type: 'int', unsigned: true, nullable: true })
  toZoneId!: number | null;

  @ManyToOne(() => WarehouseZone, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'to_zone_id', foreignKeyConstraintName: 'FK_stock_transfers_to_zone' })
  toZone!: WarehouseZone | null;

  @Column({ name: 'requested_by_id', type: 'int', unsigned: true })
  requestedById!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'requested_by_id', foreignKeyConstraintName: 'FK_stock_transfers_requester' })
  requestedBy!: User;

  @Column({ name: 'requested_at', type: 'datetime', precision: 6 })
  requestedAt!: Date;

  @Column({ name: 'completed_at', type: 'datetime', precision: 6, nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;
}

@Entity('stock_transfer_lines')
@Index('UQ_stock_transfer_lines_number', ['transferId', 'lineNumber'], { unique: true })
export class StockTransferLine extends TimestampedEntity {
  @Column({ name: 'transfer_id', type: 'int', unsigned: true })
  transferId!: number;

  @ManyToOne(() => StockTransfer, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transfer_id', foreignKeyConstraintName: 'FK_stock_transfer_lines_header' })
  transfer!: StockTransfer;

  @Column({ name: 'line_number', type: 'int', unsigned: true })
  lineNumber!: number;

  @Column({ name: 'inventory_unit_id', type: 'int', unsigned: true, nullable: true })
  inventoryUnitId!: number | null;

  @ManyToOne(() => InventoryUnit, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'inventory_unit_id',
    foreignKeyConstraintName: 'FK_stock_transfer_lines_inventory_unit',
  })
  inventoryUnit!: InventoryUnit | null;

  @Column({ name: 'item_id', type: 'int', unsigned: true })
  itemId!: number;

  @ManyToOne(() => Item, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id', foreignKeyConstraintName: 'FK_stock_transfer_lines_item' })
  item!: Item;

  @Column({ name: 'batch_id', type: 'int', unsigned: true, nullable: true })
  batchId!: number | null;

  @ManyToOne(() => StockBatch, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'batch_id', foreignKeyConstraintName: 'FK_stock_transfer_lines_batch' })
  batch!: StockBatch | null;

  @Column({ name: 'unit_id', type: 'int', unsigned: true })
  unitId!: number;

  @ManyToOne(() => Unit, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id', foreignKeyConstraintName: 'FK_stock_transfer_lines_unit' })
  unit!: Unit;

  @Column({ type: 'decimal', precision: 19, scale: 4 })
  quantity!: string;

  @Column({ name: 'received_quantity', type: 'decimal', precision: 19, scale: 4, default: 0 })
  receivedQuantity!: string;
}

@Entity('stock_counts')
@Index('UQ_stock_counts_number', ['countNumber'], { unique: true })
@Index('IDX_stock_counts_status_date', ['status', 'startedAt'])
export class StockCount extends TimestampedEntity {
  @Column({ name: 'count_number', type: 'varchar', length: 50 })
  countNumber!: string;

  @Column({ name: 'warehouse_id', type: 'int', unsigned: true })
  warehouseId!: number;

  @ManyToOne(() => Warehouse, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'warehouse_id', foreignKeyConstraintName: 'FK_stock_counts_warehouse' })
  warehouse!: Warehouse;

  @Column({ name: 'zone_id', type: 'int', unsigned: true, nullable: true })
  zoneId!: number | null;

  @ManyToOne(() => WarehouseZone, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'zone_id', foreignKeyConstraintName: 'FK_stock_counts_zone' })
  zone!: WarehouseZone | null;

  @Column({ name: 'started_by_id', type: 'int', unsigned: true })
  startedById!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'started_by_id', foreignKeyConstraintName: 'FK_stock_counts_started_by' })
  startedBy!: User;

  @Column({ name: 'started_at', type: 'datetime', precision: 6 })
  startedAt!: Date;

  @Column({ name: 'completed_at', type: 'datetime', precision: 6, nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'approved_by_id', type: 'int', unsigned: true, nullable: true })
  approvedById!: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by_id', foreignKeyConstraintName: 'FK_stock_counts_approved_by' })
  approvedBy!: User | null;

  @Column({ type: 'varchar', length: 20, default: 'in_progress' })
  status!: string;
}

@Entity('stock_count_lines')
@Index('UQ_stock_count_lines_number', ['stockCountId', 'lineNumber'], { unique: true })
export class StockCountLine extends TimestampedEntity {
  @Column({ name: 'stock_count_id', type: 'int', unsigned: true })
  stockCountId!: number;

  @ManyToOne(() => StockCount, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stock_count_id', foreignKeyConstraintName: 'FK_stock_count_lines_header' })
  stockCount!: StockCount;

  @Column({ name: 'line_number', type: 'int', unsigned: true })
  lineNumber!: number;

  @Column({ name: 'inventory_unit_id', type: 'int', unsigned: true, nullable: true })
  inventoryUnitId!: number | null;

  @ManyToOne(() => InventoryUnit, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'inventory_unit_id',
    foreignKeyConstraintName: 'FK_stock_count_lines_inventory_unit',
  })
  inventoryUnit!: InventoryUnit | null;

  @Column({ name: 'item_id', type: 'int', unsigned: true })
  itemId!: number;

  @ManyToOne(() => Item, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id', foreignKeyConstraintName: 'FK_stock_count_lines_item' })
  item!: Item;

  @Column({ name: 'batch_id', type: 'int', unsigned: true, nullable: true })
  batchId!: number | null;

  @ManyToOne(() => StockBatch, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'batch_id', foreignKeyConstraintName: 'FK_stock_count_lines_batch' })
  batch!: StockBatch | null;

  @Column({ name: 'unit_id', type: 'int', unsigned: true })
  unitId!: number;

  @ManyToOne(() => Unit, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id', foreignKeyConstraintName: 'FK_stock_count_lines_unit' })
  unit!: Unit;

  @Column({ name: 'expected_quantity', type: 'decimal', precision: 19, scale: 4 })
  expectedQuantity!: string;

  @Column({ name: 'counted_quantity', type: 'decimal', precision: 19, scale: 4 })
  countedQuantity!: string;

  @Column({ name: 'discrepancy_reason', type: 'varchar', length: 255, nullable: true })
  discrepancyReason!: string | null;
}

@Entity('stock_writeoffs')
@Index('UQ_stock_writeoffs_number', ['writeoffNumber'], { unique: true })
export class StockWriteoff extends TimestampedEntity {
  @Column({ name: 'writeoff_number', type: 'varchar', length: 50 })
  writeoffNumber!: string;

  @Column({ name: 'requested_by_id', type: 'int', unsigned: true })
  requestedById!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'requested_by_id', foreignKeyConstraintName: 'FK_stock_writeoffs_requester' })
  requestedBy!: User;

  @Column({ name: 'approved_by_id', type: 'int', unsigned: true, nullable: true })
  approvedById!: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by_id', foreignKeyConstraintName: 'FK_stock_writeoffs_approver' })
  approvedBy!: User | null;

  @Column({ name: 'requested_at', type: 'datetime', precision: 6 })
  requestedAt!: Date;

  @Column({ type: 'varchar', length: 20, default: 'pending_approval' })
  status!: string;

  @Column({ type: 'text' })
  reason!: string;
}

@Entity('stock_writeoff_lines')
@Index('UQ_stock_writeoff_lines_number', ['writeoffId', 'lineNumber'], { unique: true })
export class StockWriteoffLine extends TimestampedEntity {
  @Column({ name: 'writeoff_id', type: 'int', unsigned: true })
  writeoffId!: number;

  @ManyToOne(() => StockWriteoff, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'writeoff_id', foreignKeyConstraintName: 'FK_stock_writeoff_lines_header' })
  writeoff!: StockWriteoff;

  @Column({ name: 'line_number', type: 'int', unsigned: true })
  lineNumber!: number;

  @Column({ name: 'inventory_unit_id', type: 'int', unsigned: true, nullable: true })
  inventoryUnitId!: number | null;

  @ManyToOne(() => InventoryUnit, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'inventory_unit_id',
    foreignKeyConstraintName: 'FK_stock_writeoff_lines_inventory_unit',
  })
  inventoryUnit!: InventoryUnit | null;
  @Column({ name: 'item_id', type: 'int', unsigned: true })
  itemId!: number;

  @ManyToOne(() => Item, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id', foreignKeyConstraintName: 'FK_stock_writeoff_lines_item' })
  item!: Item;

  @Column({ name: 'batch_id', type: 'int', unsigned: true, nullable: true })
  batchId!: number | null;

  @ManyToOne(() => StockBatch, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'batch_id', foreignKeyConstraintName: 'FK_stock_writeoff_lines_batch' })
  batch!: StockBatch | null;

  @Column({ name: 'unit_id', type: 'int', unsigned: true })
  unitId!: number;

  @ManyToOne(() => Unit, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id', foreignKeyConstraintName: 'FK_stock_writeoff_lines_unit' })
  unit!: Unit;

  @Column({ type: 'decimal', precision: 19, scale: 4 })
  quantity!: string;

  @Column({ type: 'varchar', length: 255 })
  reason!: string;
}
