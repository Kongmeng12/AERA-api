import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TimestampedEntity } from '../../../core/database/entities/base.entity';
import { Currency } from './currency.entity';
import { CustomerType, Customer } from './customer.entity';
import { Item } from './item.entity';
import { Unit } from './item.entity';

@Entity('sales_prices')
@Index('IDX_sales_prices_item_scope_effective', [
  'itemId',
  'customerTypeId',
  'customerId',
  'unitId',
  'effectiveFrom',
  'effectiveTo',
])
export class SalesPrice extends TimestampedEntity {
  @Column({ name: 'item_id', type: 'int', unsigned: true })
  itemId!: number;

  @ManyToOne(() => Item, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id', foreignKeyConstraintName: 'FK_sales_prices_item' })
  item!: Item;

  @Column({ name: 'unit_id', type: 'int', unsigned: true })
  unitId!: number;

  @ManyToOne(() => Unit, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id', foreignKeyConstraintName: 'FK_sales_prices_unit' })
  unit!: Unit;

  @Column({ name: 'customer_type_id', type: 'int', unsigned: true, nullable: true })
  customerTypeId!: number | null;

  @ManyToOne(() => CustomerType, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_type_id', foreignKeyConstraintName: 'FK_sales_prices_customer_type' })
  customerType!: CustomerType | null;

  @Column({ name: 'customer_id', type: 'int', unsigned: true, nullable: true })
  customerId!: number | null;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id', foreignKeyConstraintName: 'FK_sales_prices_customer' })
  customer!: Customer | null;

  @Column({ name: 'currency_id', type: 'int', unsigned: true })
  currencyId!: number;

  @ManyToOne(() => Currency, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'currency_id', foreignKeyConstraintName: 'FK_sales_prices_currency' })
  currency!: Currency;

  @Column({ name: 'unit_price', type: 'decimal', precision: 19, scale: 4 })
  unitPrice!: string;

  @Column({ name: 'effective_from', type: 'datetime', precision: 6 })
  effectiveFrom!: Date;

  @Column({ name: 'effective_to', type: 'datetime', precision: 6, nullable: true })
  effectiveTo!: Date | null;
}

@Entity('promotions')
@Index('UQ_promotions_code', ['code'], { unique: true })
@Index('IDX_promotions_active_period', ['status', 'startsAt', 'endsAt'])
export class Promotion extends TimestampedEntity {
  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ name: 'customer_type_id', type: 'int', unsigned: true, nullable: true })
  customerTypeId!: number | null;

  @ManyToOne(() => CustomerType, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_type_id', foreignKeyConstraintName: 'FK_promotions_customer_type' })
  customerType!: CustomerType | null;

  @Column({ name: 'buy_item_id', type: 'int', unsigned: true, nullable: true })
  buyItemId!: number | null;

  @ManyToOne(() => Item, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'buy_item_id', foreignKeyConstraintName: 'FK_promotions_buy_item' })
  buyItem!: Item | null;

  @Column({ name: 'buy_quantity', type: 'decimal', precision: 19, scale: 4, nullable: true })
  buyQuantity!: string | null;

  @Column({ name: 'buy_unit_id', type: 'int', unsigned: true, nullable: true })
  buyUnitId!: number | null;

  @ManyToOne(() => Unit, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'buy_unit_id', foreignKeyConstraintName: 'FK_promotions_buy_unit' })
  buyUnit!: Unit | null;

  @Column({ name: 'get_item_id', type: 'int', unsigned: true, nullable: true })
  getItemId!: number | null;

  @ManyToOne(() => Item, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'get_item_id', foreignKeyConstraintName: 'FK_promotions_get_item' })
  getItem!: Item | null;

  @Column({ name: 'get_quantity', type: 'decimal', precision: 19, scale: 4, nullable: true })
  getQuantity!: string | null;

  @Column({ name: 'get_unit_id', type: 'int', unsigned: true, nullable: true })
  getUnitId!: number | null;

  @ManyToOne(() => Unit, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'get_unit_id', foreignKeyConstraintName: 'FK_promotions_get_unit' })
  getUnit!: Unit | null;

  @Column({ name: 'discount_item_id', type: 'int', unsigned: true, nullable: true })
  discountItemId!: number | null;

  @ManyToOne(() => Item, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'discount_item_id', foreignKeyConstraintName: 'FK_promotions_discount_item' })
  discountItem!: Item | null;

  @Column({ name: 'discount_unit_id', type: 'int', unsigned: true, nullable: true })
  discountUnitId!: number | null;

  @ManyToOne(() => Unit, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'discount_unit_id', foreignKeyConstraintName: 'FK_promotions_discount_unit' })
  discountUnit!: Unit | null;
  @Column({ name: 'discount_type', type: 'varchar', length: 20, nullable: true })
  discountType!: string | null;

  @Column({ name: 'discount_value', type: 'decimal', precision: 19, scale: 4, nullable: true })
  discountValue!: string | null;

  @Column({ name: 'starts_at', type: 'datetime', precision: 6 })
  startsAt!: Date;

  @Column({ name: 'ends_at', type: 'datetime', precision: 6, nullable: true })
  endsAt!: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: string;
}
