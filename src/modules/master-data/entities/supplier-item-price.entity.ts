import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TimestampedEntity } from '../../../core/database/entities/base.entity';
import { Currency } from './currency.entity';
import { Item } from './item.entity';
import { Unit } from './item.entity';
import { Supplier } from './supplier.entity';

@Entity('supplier_item_prices')
@Index('UQ_supplier_item_prices_effective', [
  'supplierId',
  'itemId',
  'unitId',
  'effectiveFrom',
], { unique: true })
@Index('IDX_supplier_item_prices_lookup', ['supplierId', 'itemId', 'effectiveFrom', 'effectiveTo'])
export class SupplierItemPrice extends TimestampedEntity {
  @Column({ name: 'supplier_id', type: 'int', unsigned: true })
  supplierId!: number;

  @ManyToOne(() => Supplier, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplier_id', foreignKeyConstraintName: 'FK_supplier_item_prices_supplier' })
  supplier!: Supplier;

  @Column({ name: 'item_id', type: 'int', unsigned: true })
  itemId!: number;

  @ManyToOne(() => Item, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id', foreignKeyConstraintName: 'FK_supplier_item_prices_item' })
  item!: Item;

  @Column({ name: 'unit_id', type: 'int', unsigned: true })
  unitId!: number;

  @ManyToOne(() => Unit, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id', foreignKeyConstraintName: 'FK_supplier_item_prices_unit' })
  unit!: Unit;

  @Column({ name: 'currency_id', type: 'int', unsigned: true })
  currencyId!: number;

  @ManyToOne(() => Currency, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'currency_id', foreignKeyConstraintName: 'FK_supplier_item_prices_currency' })
  currency!: Currency;

  @Column({ name: 'supplier_item_code', type: 'varchar', length: 100, nullable: true })
  supplierItemCode!: string | null;

  @Column({ name: 'unit_price', type: 'decimal', precision: 19, scale: 4 })
  unitPrice!: string;

  @Column({ name: 'minimum_order_quantity', type: 'decimal', precision: 19, scale: 4, default: 0 })
  minimumOrderQuantity!: string;

  @Column({ name: 'effective_from', type: 'datetime', precision: 6 })
  effectiveFrom!: Date;

  @Column({ name: 'effective_to', type: 'datetime', precision: 6, nullable: true })
  effectiveTo!: Date | null;
}
