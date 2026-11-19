import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TimestampedEntity } from '../../../core/database/entities/base.entity';
import { Item } from '../../master-data/entities/item.entity';
import { Unit } from '../../master-data/entities/item.entity';
import { User } from '../../users/entities/user.entity';
import { StockBatch } from '../../inventory/entities/stock.entity';

@Entity('qc_test_definitions')
@Index('UQ_qc_test_definitions_code', ['code'], { unique: true })
@Index('IDX_qc_test_definitions_item_active', ['itemId', 'isActive'])
export class QcTestDefinition extends TimestampedEntity {
  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ name: 'item_id', type: 'int', unsigned: true, nullable: true })
  itemId!: number | null;

  @ManyToOne(() => Item, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id', foreignKeyConstraintName: 'FK_qc_test_definitions_item' })
  item!: Item | null;

  @Column({ name: 'measurement_unit_id', type: 'int', unsigned: true, nullable: true })
  measurementUnitId!: number | null;

  @ManyToOne(() => Unit, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'measurement_unit_id',
    foreignKeyConstraintName: 'FK_qc_test_definitions_unit',
  })
  measurementUnit!: Unit | null;

  @Column({ name: 'minimum_value', type: 'decimal', precision: 19, scale: 6, nullable: true })
  minimumValue!: string | null;

  @Column({ name: 'maximum_value', type: 'decimal', precision: 19, scale: 6, nullable: true })
  maximumValue!: string | null;

  @Column({ name: 'is_required', type: 'boolean', default: true })
  isRequired!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}

@Entity('qc_inspections')
@Index('UQ_qc_inspections_number', ['inspectionNumber'], { unique: true })
@Index('IDX_qc_inspections_batch_date', ['batchId', 'inspectedAt'])
@Index('IDX_qc_inspections_status', ['status'])
export class QcInspection extends TimestampedEntity {
  @Column({ name: 'inspection_number', type: 'varchar', length: 50 })
  inspectionNumber!: string;

  @Column({ name: 'batch_id', type: 'int', unsigned: true })
  batchId!: number;

  @ManyToOne(() => StockBatch, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'batch_id', foreignKeyConstraintName: 'FK_qc_inspections_batch' })
  batch!: StockBatch;

  @Column({ name: 'inspected_by_id', type: 'int', unsigned: true })
  inspectedById!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'inspected_by_id', foreignKeyConstraintName: 'FK_qc_inspections_inspector' })
  inspectedBy!: User;

  @Column({ name: 'inspected_at', type: 'datetime', precision: 6 })
  inspectedAt!: Date;

  @Column({ type: 'varchar', length: 20, default: 'in_progress' })
  status!: string;

  @Column({ name: 'rejected_quantity', type: 'decimal', precision: 19, scale: 4, default: 0 })
  rejectedQuantity!: string;

  @Column({ name: 'hold_reason', type: 'text', nullable: true })
  holdReason!: string | null;

  @Column({ name: 'released_by_id', type: 'int', unsigned: true, nullable: true })
  releasedById!: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'released_by_id', foreignKeyConstraintName: 'FK_qc_inspections_releaser' })
  releasedBy!: User | null;

  @Column({ name: 'released_at', type: 'datetime', precision: 6, nullable: true })
  releasedAt!: Date | null;
}

@Entity('qc_inspection_results')
@Index('UQ_qc_inspection_results_test', ['inspectionId', 'testDefinitionId'], { unique: true })
export class QcInspectionResult extends TimestampedEntity {
  @Column({ name: 'inspection_id', type: 'int', unsigned: true })
  inspectionId!: number;

  @ManyToOne(() => QcInspection, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'inspection_id',
    foreignKeyConstraintName: 'FK_qc_inspection_results_inspection',
  })
  inspection!: QcInspection;

  @Column({ name: 'test_definition_id', type: 'int', unsigned: true })
  testDefinitionId!: number;

  @ManyToOne(() => QcTestDefinition, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'test_definition_id',
    foreignKeyConstraintName: 'FK_qc_inspection_results_test',
  })
  testDefinition!: QcTestDefinition;

  @Column({ name: 'numeric_value', type: 'decimal', precision: 19, scale: 6, nullable: true })
  numericValue!: string | null;

  @Column({ name: 'text_value', type: 'varchar', length: 255, nullable: true })
  textValue!: string | null;

  @Column({ name: 'passed', type: 'boolean' })
  passed!: boolean;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;
}
