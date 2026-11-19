import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TimestampedEntity } from '../../../core/database/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { InventoryUnit } from './stock.entity';

@Entity('scan_devices')
@Index('UQ_scan_devices_device_code', ['deviceCode'], { unique: true })
export class ScanDevice extends TimestampedEntity {
  @Column({ name: 'device_code', type: 'varchar', length: 100 })
  deviceCode!: string;

  @Column({ name: 'device_name', type: 'varchar', length: 150 })
  deviceName!: string;

  @Column({ name: 'device_type', type: 'varchar', length: 30 })
  deviceType!: string;

  @Column({ name: 'platform', type: 'varchar', length: 30, nullable: true })
  platform!: string | null;

  @Column({ name: 'user_id', type: 'int', unsigned: true, nullable: true })
  userId!: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_scan_devices_user' })
  user!: User | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: string;

  @Column({ name: 'last_sync_at', type: 'datetime', precision: 6, nullable: true })
  lastSyncAt!: Date | null;
}

@Entity('stock_scan_events')
@Index('UQ_stock_scan_events_device_operation', ['deviceId', 'clientOperationId'], { unique: true })
@Index('IDX_stock_scan_events_barcode_time', ['barcode', 'scannedAt'])
@Index('IDX_stock_scan_events_status_received', ['status', 'receivedAt'])
export class StockScanEvent extends TimestampedEntity {
  @Column({ name: 'device_id', type: 'int', unsigned: true })
  deviceId!: number;

  @ManyToOne(() => ScanDevice, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'device_id', foreignKeyConstraintName: 'FK_stock_scan_events_device' })
  device!: ScanDevice;

  @Column({ name: 'client_operation_id', type: 'char', length: 36 })
  clientOperationId!: string;

  @Column({ name: 'actor_id', type: 'int', unsigned: true })
  actorId!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'actor_id', foreignKeyConstraintName: 'FK_stock_scan_events_actor' })
  actor!: User;

  @Column({ name: 'event_type', type: 'varchar', length: 30 })
  eventType!: string;

  @Column({ type: 'varchar', length: 100 })
  barcode!: string;

  @Column({ name: 'inventory_unit_id', type: 'int', unsigned: true, nullable: true })
  inventoryUnitId!: number | null;

  @ManyToOne(() => InventoryUnit, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'inventory_unit_id',
    foreignKeyConstraintName: 'FK_stock_scan_events_inventory_unit',
  })
  inventoryUnit!: InventoryUnit | null;

  @Column({ name: 'source_type', type: 'varchar', length: 50, nullable: true })
  sourceType!: string | null;

  @Column({ name: 'source_id', type: 'varchar', length: 100, nullable: true })
  sourceId!: string | null;

  @Column({ name: 'scanned_at', type: 'datetime', precision: 6 })
  scannedAt!: Date;

  @Column({ name: 'received_at', type: 'datetime', precision: 6 })
  receivedAt!: Date;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: string;

  @Column({ name: 'failure_reason', type: 'varchar', length: 255, nullable: true })
  failureReason!: string | null;
}

@Entity('barcode_printer_profiles')
@Index('UQ_barcode_printer_profiles_code', ['code'], { unique: true })
export class BarcodePrinterProfile extends TimestampedEntity {
  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 20 })
  symbology!: string;

  @Column({ name: 'label_width_mm', type: 'decimal', precision: 8, scale: 2 })
  labelWidthMm!: string;

  @Column({ name: 'label_height_mm', type: 'decimal', precision: 8, scale: 2 })
  labelHeightMm!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}

@Entity('barcode_print_jobs')
@Index('UQ_barcode_print_jobs_number', ['jobNumber'], { unique: true })
@Index('IDX_barcode_print_jobs_created', ['createdAt'])
export class BarcodePrintJob extends TimestampedEntity {
  @Column({ name: 'job_number', type: 'varchar', length: 50 })
  jobNumber!: string;

  @Column({ name: 'printer_profile_id', type: 'int', unsigned: true, nullable: true })
  printerProfileId!: number | null;

  @ManyToOne(() => BarcodePrinterProfile, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'printer_profile_id',
    foreignKeyConstraintName: 'FK_barcode_print_jobs_profile',
  })
  printerProfile!: BarcodePrinterProfile | null;

  @Column({ name: 'created_by_id', type: 'int', unsigned: true })
  createdById!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_id', foreignKeyConstraintName: 'FK_barcode_print_jobs_user' })
  createdBy!: User;

  @Column({ type: 'varchar', length: 20, default: 'queued' })
  status!: string;

  @Column({ name: 'printed_at', type: 'datetime', precision: 6, nullable: true })
  printedAt!: Date | null;
}

@Entity('barcode_print_job_items')
@Index('UQ_barcode_print_job_items_unit', ['printJobId', 'inventoryUnitId'], { unique: true })
export class BarcodePrintJobItem extends TimestampedEntity {
  @Column({ name: 'print_job_id', type: 'int', unsigned: true })
  printJobId!: number;

  @ManyToOne(() => BarcodePrintJob, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'print_job_id',
    foreignKeyConstraintName: 'FK_barcode_print_job_items_job',
  })
  printJob!: BarcodePrintJob;

  @Column({ name: 'inventory_unit_id', type: 'int', unsigned: true })
  inventoryUnitId!: number;

  @ManyToOne(() => InventoryUnit, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'inventory_unit_id',
    foreignKeyConstraintName: 'FK_barcode_print_job_items_unit',
  })
  inventoryUnit!: InventoryUnit;

  @Column({ type: 'int', unsigned: true, default: 1 })
  copies!: number;
}
