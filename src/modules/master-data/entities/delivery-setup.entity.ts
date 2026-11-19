import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { SoftDeletableEntity } from '../../../core/database/entities/base.entity';
import { Employee } from './employee.entity';
import { Unit } from './item.entity';

@Entity('delivery_zones')
@Index('UQ_delivery_zones_code', ['code'], { unique: true })
export class DeliveryZone extends SoftDeletableEntity {
  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: string;
}

@Entity('delivery_routes')
@Index('UQ_delivery_routes_code', ['code'], { unique: true })
@Index('IDX_delivery_routes_zone_status', ['deliveryZoneId', 'status'])
export class DeliveryRoute extends SoftDeletableEntity {
  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ name: 'delivery_zone_id', type: 'int', unsigned: true })
  deliveryZoneId!: number;

  @ManyToOne(() => DeliveryZone, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'delivery_zone_id', foreignKeyConstraintName: 'FK_delivery_routes_zone' })
  deliveryZone!: DeliveryZone;

  @Column({ name: 'default_driver_id', type: 'int', unsigned: true, nullable: true })
  defaultDriverId!: number | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'default_driver_id',
    foreignKeyConstraintName: 'FK_delivery_routes_driver',
  })
  defaultDriver!: Employee | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: string;
}

@Entity('vehicles')
@Index('UQ_vehicles_plate_number', ['plateNumber'], { unique: true })
export class Vehicle extends SoftDeletableEntity {
  @Column({ name: 'plate_number', type: 'varchar', length: 30 })
  plateNumber!: string;

  @Column({ name: 'vehicle_type', type: 'varchar', length: 50 })
  vehicleType!: string;

  @Column({ name: 'capacity_quantity', type: 'decimal', precision: 19, scale: 4, nullable: true })
  capacityQuantity!: string | null;

  @Column({ name: 'capacity_unit_id', type: 'int', unsigned: true, nullable: true })
  capacityUnitId!: number | null;

  @ManyToOne(() => Unit, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'capacity_unit_id', foreignKeyConstraintName: 'FK_vehicles_capacity_unit' })
  capacityUnit!: Unit | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: string;
}
