import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TimestampedEntity } from '../../../core/database/entities/base.entity';
import { Item } from '../../master-data/entities/item.entity';
import { Unit } from '../../master-data/entities/item.entity';
import { Warehouse, WarehouseZone } from '../../master-data/entities/warehouse.entity';
import { Customer } from '../../master-data/entities/customer.entity';
import { User } from '../../users/entities/user.entity';

@Entity('stock_batches')
@Index('UQ_stock_batches_item_number', ['itemId', 'batchNumber'], { unique: true })
@Index('IDX_stock_batches_expiry', ['expiresAt'])
export class StockBatch extends TimestampedEntity {
  @Column({ name: 'item_id', type: 'int', unsigned: true })
  itemId!: number;

  @ManyToOne(() => Item, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id', foreignKeyConstraintName: 'FK_stock_batches_item' })
  item!: Item;

  @Column({ name: 'batch_number', type: 'varchar', length: 80 })
  batchNumber!: string;

  @Column({ name: 'manufactured_at', type: 'date', nullable: true })
  manufacturedAt!: string | null;

  @Column({ name: 'expires_at', type: 'date', nullable: true })
  expiresAt!: string | null;

  @Column({ name: 'qc_status', type: 'varchar', length: 20, default: 'pending' })
  qcStatus!: string;

  @Column({ name: 'source_type', type: 'varchar', length: 50, nullable: true })
  sourceType!: string | null;

  @Column({ name: 'source_id', type: 'varchar', length: 100, nullable: true })
  sourceId!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: string;
}

@Entity('inventory_units')
@Index('UQ_inventory_units_barcode', ['barcode'], { unique: true })
@Index('IDX_inventory_units_location_status', ['warehouseId', 'zoneId', 'status'])
@Index('IDX_inventory_units_item_batch', ['itemId', 'batchId'])
export class InventoryUnit extends TimestampedEntity {
  @Column({ type: 'varchar', length: 100 })
  barcode!: string;

  @Column({ name: 'item_id', type: 'int', unsigned: true })
  itemId!: number;

  @ManyToOne(() => Item, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id', foreignKeyConstraintName: 'FK_inventory_units_item' })
  item!: Item;

  @Column({ name: 'batch_id', type: 'int', unsigned: true, nullable: true })
  batchId!: number | null;

  @ManyToOne(() => StockBatch, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'batch_id', foreignKeyConstraintName: 'FK_inventory_units_batch' })
  batch!: StockBatch | null;

  @Column({ name: 'unit_id', type: 'int', unsigned: true })
  unitId!: number;

  @ManyToOne(() => Unit, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id', foreignKeyConstraintName: 'FK_inventory_units_unit' })
  unit!: Unit;

  @Column({ type: 'decimal', precision: 19, scale: 4, default: 1 })
  quantity!: string;

  @Column({ name: 'warehouse_id', type: 'int', unsigned: true, nullable: true })
  warehouseId!: number | null;

  @ManyToOne(() => Warehouse, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'warehouse_id', foreignKeyConstraintName: 'FK_inventory_units_warehouse' })
  warehouse!: Warehouse | null;

  @Column({ name: 'zone_id', type: 'int', unsigned: true, nullable: true })
  zoneId!: number | null;

  @ManyToOne(() => WarehouseZone, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'zone_id', foreignKeyConstraintName: 'FK_inventory_units_zone' })
  zone!: WarehouseZone | null;

  @Column({ type: 'varchar', length: 20, default: 'qc_hold' })
  status!: string;

  @Column({ name: 'current_customer_id', type: 'int', unsigned: true, nullable: true })
  currentCustomerId!: number | null;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'current_customer_id',
    foreignKeyConstraintName: 'FK_inventory_units_current_customer',
  })
  currentCustomer!: Customer | null;

  @Column({ name: 'printed_at', type: 'datetime', precision: 6, nullable: true })
  printedAt!: Date | null;
}

@Entity('inventory_balances')
@Index(
  'UQ_inventory_balances_item_batch_unit_location_status',
  ['itemId', 'batchId', 'unitId', 'warehouseId', 'zoneId', 'stockStatus'],
  { unique: true },
)
@Index('IDX_inventory_balances_location_status', ['warehouseId', 'zoneId', 'stockStatus'])
export class InventoryBalance extends TimestampedEntity {
  @Column({ name: 'item_id', type: 'int', unsigned: true })
  itemId!: number;

  @ManyToOne(() => Item, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id', foreignKeyConstraintName: 'FK_inventory_balances_item' })
  item!: Item;

  @Column({ name: 'batch_id', type: 'int', unsigned: true })
  batchId!: number;

  @ManyToOne(() => StockBatch, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'batch_id', foreignKeyConstraintName: 'FK_inventory_balances_batch' })
  batch!: StockBatch;

  @Column({ name: 'unit_id', type: 'int', unsigned: true })
  unitId!: number;

  @ManyToOne(() => Unit, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id', foreignKeyConstraintName: 'FK_inventory_balances_unit' })
  unit!: Unit;

  @Column({ name: 'warehouse_id', type: 'int', unsigned: true })
  warehouseId!: number;

  @ManyToOne(() => Warehouse, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'warehouse_id', foreignKeyConstraintName: 'FK_inventory_balances_warehouse' })
  warehouse!: Warehouse;

  @Column({ name: 'zone_id', type: 'int', unsigned: true })
  zoneId!: number;

  @ManyToOne(() => WarehouseZone, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'zone_id', foreignKeyConstraintName: 'FK_inventory_balances_zone' })
  zone!: WarehouseZone;

  @Column({ name: 'stock_status', type: 'varchar', length: 20 })
  stockStatus!: string;

  @Column({ name: 'quantity_on_hand', type: 'decimal', precision: 19, scale: 4, default: 0 })
  quantityOnHand!: string;

  @Column({ name: 'quantity_reserved', type: 'decimal', precision: 19, scale: 4, default: 0 })
  quantityReserved!: string;
}

@Entity('stock_movements')
@Index('UQ_stock_movements_number', ['movementNumber'], { unique: true })
@Index('UQ_stock_movements_idempotency', ['idempotencyKey'], { unique: true })
@Index('IDX_stock_movements_item_time', ['itemId', 'createdAt'])
@Index('IDX_stock_movements_source', ['sourceType', 'sourceId'])
export class StockMovement extends TimestampedEntity {
  @Column({ name: 'movement_number', type: 'varchar', length: 50 })
  movementNumber!: string;

  @Column({ name: 'movement_type', type: 'varchar', length: 30 })
  movementType!: string;

  @Column({ name: 'item_id', type: 'int', unsigned: true })
  itemId!: number;

  @ManyToOne(() => Item, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id', foreignKeyConstraintName: 'FK_stock_movements_item' })
  item!: Item;

  @Column({ name: 'batch_id', type: 'int', unsigned: true, nullable: true })
  batchId!: number | null;

  @ManyToOne(() => StockBatch, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'batch_id', foreignKeyConstraintName: 'FK_stock_movements_batch' })
  batch!: StockBatch | null;

  @Column({ name: 'unit_id', type: 'int', unsigned: true })
  unitId!: number;

  @ManyToOne(() => Unit, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id', foreignKeyConstraintName: 'FK_stock_movements_unit' })
  unit!: Unit;

  @Column({ type: 'decimal', precision: 19, scale: 4 })
  quantity!: string;

  @Column({ name: 'from_warehouse_id', type: 'int', unsigned: true, nullable: true })
  fromWarehouseId!: number | null;

  @ManyToOne(() => Warehouse, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'from_warehouse_id', foreignKeyConstraintName: 'FK_stock_movements_from_warehouse' })
  fromWarehouse!: Warehouse | null;

  @Column({ name: 'from_zone_id', type: 'int', unsigned: true, nullable: true })
  fromZoneId!: number | null;

  @ManyToOne(() => WarehouseZone, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'from_zone_id', foreignKeyConstraintName: 'FK_stock_movements_from_zone' })
  fromZone!: WarehouseZone | null;

  @Column({ name: 'to_warehouse_id', type: 'int', unsigned: true, nullable: true })
  toWarehouseId!: number | null;

  @ManyToOne(() => Warehouse, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'to_warehouse_id', foreignKeyConstraintName: 'FK_stock_movements_to_warehouse' })
  toWarehouse!: Warehouse | null;

  @Column({ name: 'to_zone_id', type: 'int', unsigned: true, nullable: true })
  toZoneId!: number | null;

  @ManyToOne(() => WarehouseZone, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'to_zone_id', foreignKeyConstraintName: 'FK_stock_movements_to_zone' })
  toZone!: WarehouseZone | null;
  @Column({ name: 'source_type', type: 'varchar', length: 50 })
  sourceType!: string;

  @Column({ name: 'source_id', type: 'varchar', length: 100 })
  sourceId!: string;

  @Column({ name: 'idempotency_key', type: 'char', length: 36, nullable: true })
  idempotencyKey!: string | null;

  @Column({ name: 'actor_id', type: 'int', unsigned: true })
  actorId!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'actor_id', foreignKeyConstraintName: 'FK_stock_movements_actor' })
  actor!: User;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;
}
