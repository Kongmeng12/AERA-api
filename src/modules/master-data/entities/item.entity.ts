import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { SoftDeletableEntity } from '../../../core/database/entities/base.entity';

@Entity('units')
@Index('UQ_units_code', ['code'], { unique: true })
export class Unit extends SoftDeletableEntity {
  @Column({ type: 'varchar', length: 30 })
  code!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 30 })
  symbol!: string;

  @Column({ name: 'decimal_places', type: 'tinyint', unsigned: true, default: 0 })
  decimalPlaces!: number;
}

@Entity('item_categories')
@Index('UQ_item_categories_code', ['code'], { unique: true })
export class ItemCategory extends SoftDeletableEntity {
  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ name: 'parent_id', type: 'int', unsigned: true, nullable: true })
  parentId!: number | null;

  @ManyToOne(() => ItemCategory, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'parent_id', foreignKeyConstraintName: 'FK_item_categories_parent' })
  parent!: ItemCategory | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;
}

@Entity('items')
@Index('UQ_items_sku', ['sku'], { unique: true })
@Index('IDX_items_category_type', ['categoryId', 'itemType'])
@Index('IDX_items_status', ['status'])
export class Item extends SoftDeletableEntity {
  @Column({ type: 'varchar', length: 50 })
  sku!: string;

  @Column({ name: 'category_id', type: 'int', unsigned: true })
  categoryId!: number;

  @ManyToOne(() => ItemCategory, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id', foreignKeyConstraintName: 'FK_items_category' })
  category!: ItemCategory;

  @Column({ name: 'base_unit_id', type: 'int', unsigned: true })
  baseUnitId!: number;

  @ManyToOne(() => Unit, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'base_unit_id', foreignKeyConstraintName: 'FK_items_base_unit' })
  baseUnit!: Unit;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ name: 'item_type', type: 'varchar', length: 30 })
  itemType!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'shelf_life_days', type: 'int', unsigned: true, nullable: true })
  shelfLifeDays!: number | null;

  @Column({
    name: 'daily_production_capacity',
    type: 'decimal',
    precision: 19,
    scale: 4,
    nullable: true,
  })
  dailyProductionCapacity!: string | null;

  @Column({ name: 'reorder_point', type: 'decimal', precision: 19, scale: 4, default: 0 })
  reorderPoint!: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: string;
}

@Entity('item_unit_conversions')
@Index('UQ_item_unit_conversions_item_unit', ['itemId', 'unitId'], { unique: true })
export class ItemUnitConversion extends SoftDeletableEntity {
  @Column({ name: 'item_id', type: 'int', unsigned: true })
  itemId!: number;

  @ManyToOne(() => Item, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id', foreignKeyConstraintName: 'FK_item_unit_conversions_item' })
  item!: Item;

  @Column({ name: 'unit_id', type: 'int', unsigned: true })
  unitId!: number;

  @ManyToOne(() => Unit, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id', foreignKeyConstraintName: 'FK_item_unit_conversions_unit' })
  unit!: Unit;

  @Column({ name: 'factor_to_base', type: 'decimal', precision: 19, scale: 6 })
  factorToBase!: string;
}
