import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TimestampedEntity } from '../../../core/database/entities/base.entity';
import { Item } from '../../master-data/entities/item.entity';
import { Unit } from '../../master-data/entities/item.entity';
import { User } from '../../users/entities/user.entity';
import { StockBatch } from '../../inventory/entities/stock.entity';

@Entity('bills_of_materials')
@Index('UQ_bills_of_materials_item_revision', ['itemId', 'revision'], { unique: true })
@Index('IDX_bills_of_materials_effective', ['itemId', 'status', 'effectiveFrom', 'effectiveTo'])
export class BillOfMaterials extends TimestampedEntity {
  @Column({ name: 'item_id', type: 'int', unsigned: true })
  itemId!: number;

  @ManyToOne(() => Item, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id', foreignKeyConstraintName: 'FK_bills_of_materials_item' })
  item!: Item;

  @Column({ type: 'varchar', length: 30 })
  revision!: string;

  @Column({ name: 'effective_from', type: 'date' })
  effectiveFrom!: string;

  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: string;
}

@Entity('bill_of_material_lines')
@Index('UQ_bill_of_material_lines_number', ['billOfMaterialsId', 'lineNumber'], { unique: true })
export class BillOfMaterialLine extends TimestampedEntity {
  @Column({ name: 'bill_of_materials_id', type: 'int', unsigned: true })
  billOfMaterialsId!: number;

  @ManyToOne(() => BillOfMaterials, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bill_of_materials_id', foreignKeyConstraintName: 'FK_bom_lines_header' })
  billOfMaterials!: BillOfMaterials;

  @Column({ name: 'line_number', type: 'int', unsigned: true })
  lineNumber!: number;

  @Column({ name: 'material_item_id', type: 'int', unsigned: true })
  materialItemId!: number;

  @ManyToOne(() => Item, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'material_item_id', foreignKeyConstraintName: 'FK_bom_lines_material' })
  materialItem!: Item;

  @Column({ name: 'unit_id', type: 'int', unsigned: true })
  unitId!: number;

  @ManyToOne(() => Unit, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id', foreignKeyConstraintName: 'FK_bom_lines_unit' })
  unit!: Unit;

  @Column({ type: 'decimal', precision: 19, scale: 6 })
  quantity!: string;

  @Column({ name: 'scrap_percent', type: 'decimal', precision: 8, scale: 4, default: 0 })
  scrapPercent!: string;
}

@Entity('production_orders')
@Index('UQ_production_orders_number', ['productionOrderNumber'], { unique: true })
@Index('IDX_production_orders_status_date', ['status', 'plannedStartAt'])
export class ProductionOrder extends TimestampedEntity {
  @Column({ name: 'production_order_number', type: 'varchar', length: 50 })
  productionOrderNumber!: string;

  @Column({ name: 'bill_of_materials_id', type: 'int', unsigned: true })
  billOfMaterialsId!: number;

  @ManyToOne(() => BillOfMaterials, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'bill_of_materials_id', foreignKeyConstraintName: 'FK_production_orders_bom' })
  billOfMaterials!: BillOfMaterials;

  @Column({ name: 'item_id', type: 'int', unsigned: true })
  itemId!: number;

  @ManyToOne(() => Item, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id', foreignKeyConstraintName: 'FK_production_orders_item' })
  item!: Item;

  @Column({ name: 'planned_quantity', type: 'decimal', precision: 19, scale: 4 })
  plannedQuantity!: string;

  @Column({ name: 'actual_quantity', type: 'decimal', precision: 19, scale: 4, default: 0 })
  actualQuantity!: string;

  @Column({ name: 'output_unit_id', type: 'int', unsigned: true })
  outputUnitId!: number;

  @ManyToOne(() => Unit, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'output_unit_id', foreignKeyConstraintName: 'FK_production_orders_unit' })
  outputUnit!: Unit;

  @Column({ name: 'planned_start_at', type: 'datetime', precision: 6 })
  plannedStartAt!: Date;

  @Column({ name: 'actual_start_at', type: 'datetime', precision: 6, nullable: true })
  actualStartAt!: Date | null;

  @Column({ name: 'completed_at', type: 'datetime', precision: 6, nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'started_by_id', type: 'int', unsigned: true, nullable: true })
  startedById!: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'started_by_id', foreignKeyConstraintName: 'FK_production_orders_user' })
  startedBy!: User | null;

  @Column({ type: 'varchar', length: 20, default: 'planned' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;
}

@Entity('production_material_issues')
@Index('UQ_production_material_issues_order_item_batch', [
  'productionOrderId',
  'materialItemId',
  'batchId',
])
export class ProductionMaterialIssue extends TimestampedEntity {
  @Column({ name: 'production_order_id', type: 'int', unsigned: true })
  productionOrderId!: number;

  @ManyToOne(() => ProductionOrder, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'production_order_id',
    foreignKeyConstraintName: 'FK_production_material_issues_order',
  })
  productionOrder!: ProductionOrder;

  @Column({ name: 'material_item_id', type: 'int', unsigned: true })
  materialItemId!: number;

  @ManyToOne(() => Item, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'material_item_id', foreignKeyConstraintName: 'FK_production_material_issues_item' })
  materialItem!: Item;

  @Column({ name: 'batch_id', type: 'int', unsigned: true })
  batchId!: number;

  @ManyToOne(() => StockBatch, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'batch_id', foreignKeyConstraintName: 'FK_production_material_issues_batch' })
  batch!: StockBatch;

  @Column({ name: 'unit_id', type: 'int', unsigned: true })
  unitId!: number;

  @ManyToOne(() => Unit, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id', foreignKeyConstraintName: 'FK_production_material_issues_unit' })
  unit!: Unit;

  @Column({ name: 'issued_quantity', type: 'decimal', precision: 19, scale: 4 })
  issuedQuantity!: string;

  @Column({ name: 'returned_quantity', type: 'decimal', precision: 19, scale: 4, default: 0 })
  returnedQuantity!: string;
}

@Entity('production_order_outputs')
@Index('UQ_production_order_outputs_order_batch', ['productionOrderId', 'batchId'], { unique: true })
export class ProductionOrderOutput extends TimestampedEntity {
  @Column({ name: 'production_order_id', type: 'int', unsigned: true })
  productionOrderId!: number;

  @ManyToOne(() => ProductionOrder, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'production_order_id',
    foreignKeyConstraintName: 'FK_production_order_outputs_order',
  })
  productionOrder!: ProductionOrder;

  @Column({ name: 'batch_id', type: 'int', unsigned: true })
  batchId!: number;

  @ManyToOne(() => StockBatch, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'batch_id', foreignKeyConstraintName: 'FK_production_order_outputs_batch' })
  batch!: StockBatch;

  @Column({ name: 'unit_id', type: 'int', unsigned: true })
  unitId!: number;

  @ManyToOne(() => Unit, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id', foreignKeyConstraintName: 'FK_production_order_outputs_unit' })
  unit!: Unit;

  @Column({ type: 'decimal', precision: 19, scale: 4 })
  quantity!: string;
}
