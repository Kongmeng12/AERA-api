import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TimestampedEntity } from '../../../core/database/entities/base.entity';
import { DeliveryRoute, Vehicle } from '../../master-data/entities/delivery-setup.entity';
import { Employee } from '../../master-data/entities/employee.entity';
import { SalesOrder, SalesOrderLine } from '../../sales/entities/sales-order.entity';
import { StockScanEvent, ScanDevice } from '../../inventory/entities/barcode.entity';
import { InventoryUnit } from '../../inventory/entities/stock.entity';
import { User } from '../../users/entities/user.entity';

@Entity('deliveries')
@Index('UQ_deliveries_number', ['deliveryNumber'], { unique: true })
@Index('IDX_deliveries_status_planned', ['status', 'plannedAt'])
@Index('IDX_deliveries_driver_planned', ['driverId', 'plannedAt'])
export class Delivery extends TimestampedEntity {
  @Column({ name: 'delivery_number', type: 'varchar', length: 50 })
  deliveryNumber!: string;

  @Column({ name: 'planned_at', type: 'datetime', precision: 6 })
  plannedAt!: Date;

  @Column({ name: 'route_id', type: 'int', unsigned: true, nullable: true })
  routeId!: number | null;

  @ManyToOne(() => DeliveryRoute, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'route_id', foreignKeyConstraintName: 'FK_deliveries_route' })
  route!: DeliveryRoute | null;

  @Column({ name: 'vehicle_id', type: 'int', unsigned: true, nullable: true })
  vehicleId!: number | null;

  @ManyToOne(() => Vehicle, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'vehicle_id', foreignKeyConstraintName: 'FK_deliveries_vehicle' })
  vehicle!: Vehicle | null;

  @Column({ name: 'driver_id', type: 'int', unsigned: true, nullable: true })
  driverId!: number | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'driver_id', foreignKeyConstraintName: 'FK_deliveries_driver' })
  driver!: Employee | null;

  @Column({ name: 'created_by_id', type: 'int', unsigned: true })
  createdById!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_id', foreignKeyConstraintName: 'FK_deliveries_creator' })
  createdBy!: User;

  @Column({ type: 'varchar', length: 20, default: 'planned' })
  status!: string;

  @Column({ name: 'departed_at', type: 'datetime', precision: 6, nullable: true })
  departedAt!: Date | null;

  @Column({ name: 'completed_at', type: 'datetime', precision: 6, nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;
}

@Entity('delivery_orders')
@Index('UQ_delivery_orders_delivery_order', ['deliveryId', 'salesOrderId'], { unique: true })
export class DeliveryOrder extends TimestampedEntity {
  @Column({ name: 'delivery_id', type: 'int', unsigned: true })
  deliveryId!: number;

  @ManyToOne(() => Delivery, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'delivery_id', foreignKeyConstraintName: 'FK_delivery_orders_delivery' })
  delivery!: Delivery;

  @Column({ name: 'sales_order_id', type: 'int', unsigned: true })
  salesOrderId!: number;

  @ManyToOne(() => SalesOrder, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sales_order_id', foreignKeyConstraintName: 'FK_delivery_orders_sales_order' })
  salesOrder!: SalesOrder;
}

@Entity('delivery_lines')
@Index('UQ_delivery_lines_number', ['deliveryOrderId', 'lineNumber'], { unique: true })
@Index('IDX_delivery_lines_order_line', ['salesOrderLineId'])
export class DeliveryLine extends TimestampedEntity {
  @Column({ name: 'delivery_order_id', type: 'int', unsigned: true })
  deliveryOrderId!: number;

  @ManyToOne(() => DeliveryOrder, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'delivery_order_id', foreignKeyConstraintName: 'FK_delivery_lines_delivery_order' })
  deliveryOrder!: DeliveryOrder;

  @Column({ name: 'sales_order_line_id', type: 'int', unsigned: true })
  salesOrderLineId!: number;

  @ManyToOne(() => SalesOrderLine, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sales_order_line_id', foreignKeyConstraintName: 'FK_delivery_lines_order_line' })
  salesOrderLine!: SalesOrderLine;

  @Column({ name: 'line_number', type: 'int', unsigned: true })
  lineNumber!: number;

  @Column({ name: 'planned_quantity', type: 'decimal', precision: 19, scale: 4 })
  plannedQuantity!: string;

  @Column({ name: 'loaded_quantity', type: 'decimal', precision: 19, scale: 4, default: 0 })
  loadedQuantity!: string;

  @Column({ name: 'delivered_quantity', type: 'decimal', precision: 19, scale: 4, default: 0 })
  deliveredQuantity!: string;

  @Column({ name: 'returned_quantity', type: 'decimal', precision: 19, scale: 4, default: 0 })
  returnedQuantity!: string;
}

@Entity('delivery_scans')
@Index('UQ_delivery_scans_scan_event', ['scanEventId'], { unique: true })
@Index('IDX_delivery_scans_delivery_time', ['deliveryId', 'scannedAt'])
export class DeliveryScan extends TimestampedEntity {
  @Column({ name: 'delivery_id', type: 'int', unsigned: true })
  deliveryId!: number;

  @ManyToOne(() => Delivery, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'delivery_id', foreignKeyConstraintName: 'FK_delivery_scans_delivery' })
  delivery!: Delivery;

  @Column({ name: 'delivery_line_id', type: 'int', unsigned: true, nullable: true })
  deliveryLineId!: number | null;

  @ManyToOne(() => DeliveryLine, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'delivery_line_id', foreignKeyConstraintName: 'FK_delivery_scans_line' })
  deliveryLine!: DeliveryLine | null;

  @Column({ name: 'inventory_unit_id', type: 'int', unsigned: true, nullable: true })
  inventoryUnitId!: number | null;

  @ManyToOne(() => InventoryUnit, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'inventory_unit_id', foreignKeyConstraintName: 'FK_delivery_scans_unit' })
  inventoryUnit!: InventoryUnit | null;

  @Column({ name: 'scan_event_id', type: 'int', unsigned: true })
  scanEventId!: number;

  @ManyToOne(() => StockScanEvent, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'scan_event_id', foreignKeyConstraintName: 'FK_delivery_scans_event' })
  scanEvent!: StockScanEvent;

  @Column({ name: 'device_id', type: 'int', unsigned: true, nullable: true })
  deviceId!: number | null;

  @ManyToOne(() => ScanDevice, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'device_id', foreignKeyConstraintName: 'FK_delivery_scans_device' })
  device!: ScanDevice | null;

  @Column({ name: 'scan_action', type: 'varchar', length: 20 })
  scanAction!: string;

  @Column({ name: 'scanned_at', type: 'datetime', precision: 6 })
  scannedAt!: Date;
}

@Entity('delivery_attempts')
@Index('UQ_delivery_attempts_number', ['deliveryOrderId', 'attemptNumber'], { unique: true })
@Index('IDX_delivery_attempts_outcome_time', ['outcome', 'attemptedAt'])
export class DeliveryAttempt extends TimestampedEntity {
  @Column({ name: 'delivery_id', type: 'int', unsigned: true })
  deliveryId!: number;

  @ManyToOne(() => Delivery, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'delivery_id', foreignKeyConstraintName: 'FK_delivery_attempts_delivery' })
  delivery!: Delivery;

  @Column({ name: 'delivery_order_id', type: 'int', unsigned: true })
  deliveryOrderId!: number;

  @ManyToOne(() => DeliveryOrder, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'delivery_order_id',
    foreignKeyConstraintName: 'FK_delivery_attempts_delivery_order',
  })
  deliveryOrder!: DeliveryOrder;

  @Column({ name: 'attempt_number', type: 'int', unsigned: true })
  attemptNumber!: number;

  @Column({ type: 'varchar', length: 20 })
  outcome!: string;

  @Column({ name: 'attempted_at', type: 'datetime', precision: 6 })
  attemptedAt!: Date;

  @Column({ name: 'recipient_name', type: 'varchar', length: 150, nullable: true })
  recipientName!: string | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason!: string | null;

  @Column({ name: 'signature_uri', type: 'varchar', length: 500, nullable: true })
  signatureUri!: string | null;

  @Column({ name: 'photo_uri', type: 'varchar', length: 500, nullable: true })
  photoUri!: string | null;

  @Column({ name: 'confirmed_by_id', type: 'int', unsigned: true, nullable: true })
  confirmedById!: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'confirmed_by_id', foreignKeyConstraintName: 'FK_delivery_attempts_confirmer' })
  confirmedBy!: User | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;
}
