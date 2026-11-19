import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { SoftDeletableEntity } from '../../../core/database/entities/base.entity';

@Entity('warehouses')
@Index('UQ_warehouses_code', ['code'], { unique: true })
export class Warehouse extends SoftDeletableEntity {
  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ name: 'address_text', type: 'varchar', length: 500, nullable: true })
  addressText!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: string;
}

@Entity('warehouse_zones')
@Index('UQ_warehouse_zones_warehouse_code', ['warehouseId', 'code'], { unique: true })
@Index('UQ_warehouse_zones_barcode', ['barcode'], { unique: true })
export class WarehouseZone extends SoftDeletableEntity {
  @Column({ name: 'warehouse_id', type: 'int', unsigned: true })
  warehouseId!: number;

  @ManyToOne(() => Warehouse, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'warehouse_id', foreignKeyConstraintName: 'FK_warehouse_zones_warehouse' })
  warehouse!: Warehouse;

  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ name: 'zone_type', type: 'varchar', length: 30, default: 'storage' })
  zoneType!: string;

  @Column({ type: 'varchar', length: 100 })
  barcode!: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: string;
}
