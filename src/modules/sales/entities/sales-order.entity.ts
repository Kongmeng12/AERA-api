import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TimestampedEntity } from '../../../core/database/entities/base.entity';
import { Customer, CustomerAddress } from '../../master-data/entities/customer.entity';
import { Currency } from '../../master-data/entities/currency.entity';
import { Employee } from '../../master-data/entities/employee.entity';
import { Item } from '../../master-data/entities/item.entity';
import { Promotion, SalesPrice } from '../../master-data/entities/pricing.entity';
import { Unit } from '../../master-data/entities/item.entity';
import { User } from '../../users/entities/user.entity';

@Entity('sales_orders')
@Index('UQ_sales_orders_number', ['orderNumber'], { unique: true })
@Index('IDX_sales_orders_customer_date', ['customerId', 'orderedAt'])
@Index('IDX_sales_orders_status_date', ['status', 'orderedAt'])
@Index('IDX_sales_orders_sales_employee_date', ['salesEmployeeId', 'orderedAt'])
export class SalesOrder extends TimestampedEntity {
  @Column({ name: 'order_number', type: 'varchar', length: 50 })
  orderNumber!: string;

  @Column({ name: 'customer_id', type: 'int', unsigned: true })
  customerId!: number;

  @ManyToOne(() => Customer, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id', foreignKeyConstraintName: 'FK_sales_orders_customer' })
  customer!: Customer;

  @Column({ name: 'customer_address_id', type: 'int', unsigned: true, nullable: true })
  customerAddressId!: number | null;

  @ManyToOne(() => CustomerAddress, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'customer_address_id',
    foreignKeyConstraintName: 'FK_sales_orders_address',
  })
  customerAddress!: CustomerAddress | null;

  @Column({ name: 'delivery_address_snapshot', type: 'varchar', length: 500, nullable: true })
  deliveryAddressSnapshot!: string | null;

  @Column({ name: 'sales_employee_id', type: 'int', unsigned: true, nullable: true })
  salesEmployeeId!: number | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'sales_employee_id',
    foreignKeyConstraintName: 'FK_sales_orders_sales_employee',
  })
  salesEmployee!: Employee | null;

  @Column({ name: 'created_by_id', type: 'int', unsigned: true })
  createdById!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_id', foreignKeyConstraintName: 'FK_sales_orders_creator' })
  createdBy!: User;

  @Column({ name: 'ordered_at', type: 'datetime', precision: 6 })
  orderedAt!: Date;

  @Column({ name: 'requested_delivery_at', type: 'datetime', precision: 6, nullable: true })
  requestedDeliveryAt!: Date | null;

  @Column({ name: 'currency_id', type: 'int', unsigned: true })
  currencyId!: number;

  @ManyToOne(() => Currency, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'currency_id', foreignKeyConstraintName: 'FK_sales_orders_currency' })
  currency!: Currency;

  @Column({ name: 'exchange_rate_snapshot', type: 'decimal', precision: 19, scale: 8, default: 1 })
  exchangeRateSnapshot!: string;

  @Column({ type: 'varchar', length: 25, default: 'pending_approval' })
  status!: string;

  @Column({ name: 'subtotal', type: 'decimal', precision: 19, scale: 4, default: 0 })
  subtotal!: string;

  @Column({ name: 'discount_total', type: 'decimal', precision: 19, scale: 4, default: 0 })
  discountTotal!: string;

  @Column({ name: 'tax_total', type: 'decimal', precision: 19, scale: 4, default: 0 })
  taxTotal!: string;

  @Column({ name: 'total', type: 'decimal', precision: 19, scale: 4, default: 0 })
  total!: string;

  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason!: string | null;

  @Column({ name: 'cancelled_by_id', type: 'int', unsigned: true, nullable: true })
  cancelledById!: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cancelled_by_id', foreignKeyConstraintName: 'FK_sales_orders_cancelled_by' })
  cancelledBy!: User | null;

  @Column({ name: 'cancelled_at', type: 'datetime', precision: 6, nullable: true })
  cancelledAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;
}

@Entity('sales_order_lines')
@Index('UQ_sales_order_lines_number', ['salesOrderId', 'lineNumber'], { unique: true })
@Index('IDX_sales_order_lines_item', ['itemId'])
export class SalesOrderLine extends TimestampedEntity {
  @Column({ name: 'sales_order_id', type: 'int', unsigned: true })
  salesOrderId!: number;

  @ManyToOne(() => SalesOrder, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sales_order_id', foreignKeyConstraintName: 'FK_sales_order_lines_header' })
  salesOrder!: SalesOrder;

  @Column({ name: 'line_number', type: 'int', unsigned: true })
  lineNumber!: number;

  @Column({ name: 'item_id', type: 'int', unsigned: true })
  itemId!: number;

  @ManyToOne(() => Item, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id', foreignKeyConstraintName: 'FK_sales_order_lines_item' })
  item!: Item;

  @Column({ name: 'unit_id', type: 'int', unsigned: true })
  unitId!: number;

  @ManyToOne(() => Unit, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id', foreignKeyConstraintName: 'FK_sales_order_lines_unit' })
  unit!: Unit;

  @Column({ name: 'item_sku_snapshot', type: 'varchar', length: 50 })
  itemSkuSnapshot!: string;

  @Column({ name: 'item_name_snapshot', type: 'varchar', length: 200 })
  itemNameSnapshot!: string;

  @Column({ name: 'unit_code_snapshot', type: 'varchar', length: 30 })
  unitCodeSnapshot!: string;

  @Column({ type: 'decimal', precision: 19, scale: 4 })
  quantity!: string;

  @Column({ name: 'conversion_to_base_snapshot', type: 'decimal', precision: 19, scale: 6 })
  conversionToBaseSnapshot!: string;

  @Column({ name: 'price_id', type: 'int', unsigned: true, nullable: true })
  priceId!: number | null;

  @ManyToOne(() => SalesPrice, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'price_id', foreignKeyConstraintName: 'FK_sales_order_lines_price' })
  price!: SalesPrice | null;

  @Column({ name: 'promotion_id', type: 'int', unsigned: true, nullable: true })
  promotionId!: number | null;

  @ManyToOne(() => Promotion, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'promotion_id', foreignKeyConstraintName: 'FK_sales_order_lines_promotion' })
  promotion!: Promotion | null;

  @Column({ name: 'unit_price', type: 'decimal', precision: 19, scale: 4 })
  unitPrice!: string;

  @Column({ name: 'discount_type', type: 'varchar', length: 20, nullable: true })
  discountType!: string | null;

  @Column({ name: 'discount_value', type: 'decimal', precision: 19, scale: 4, default: 0 })
  discountValue!: string;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 19, scale: 4, default: 0 })
  discountAmount!: string;

  @Column({ name: 'tax_rate', type: 'decimal', precision: 8, scale: 4, default: 0 })
  taxRate!: string;

  @Column({ name: 'line_total', type: 'decimal', precision: 19, scale: 4 })
  lineTotal!: string;
}
