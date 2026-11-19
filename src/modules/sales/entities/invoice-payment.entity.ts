import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TimestampedEntity } from '../../../core/database/entities/base.entity';
import { Currency } from '../../master-data/entities/currency.entity';
import { Customer } from '../../master-data/entities/customer.entity';
import { Item } from '../../master-data/entities/item.entity';
import { Unit } from '../../master-data/entities/item.entity';
import { SalesOrder, SalesOrderLine } from './sales-order.entity';
import { User } from '../../users/entities/user.entity';

@Entity('sales_invoices')
@Index('UQ_sales_invoices_number', ['invoiceNumber'], { unique: true })
@Index('IDX_sales_invoices_customer_status_due', ['customerId', 'status', 'dueAt'])
@Index('IDX_sales_invoices_issued_at', ['issuedAt'])
export class SalesInvoice extends TimestampedEntity {
  @Column({ name: 'invoice_number', type: 'varchar', length: 50 })
  invoiceNumber!: string;

  @Column({ name: 'sales_order_id', type: 'int', unsigned: true })
  salesOrderId!: number;

  @ManyToOne(() => SalesOrder, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sales_order_id', foreignKeyConstraintName: 'FK_sales_invoices_order' })
  salesOrder!: SalesOrder;

  @Column({ name: 'customer_id', type: 'int', unsigned: true })
  customerId!: number;

  @ManyToOne(() => Customer, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id', foreignKeyConstraintName: 'FK_sales_invoices_customer' })
  customer!: Customer;

  @Column({ name: 'currency_id', type: 'int', unsigned: true })
  currencyId!: number;

  @ManyToOne(() => Currency, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'currency_id', foreignKeyConstraintName: 'FK_sales_invoices_currency' })
  currency!: Currency;

  @Column({ name: 'exchange_rate_snapshot', type: 'decimal', precision: 19, scale: 8, default: 1 })
  exchangeRateSnapshot!: string;

  @Column({ name: 'issued_at', type: 'datetime', precision: 6 })
  issuedAt!: Date;

  @Column({ name: 'due_at', type: 'datetime', precision: 6, nullable: true })
  dueAt!: Date | null;

  @Column({ type: 'varchar', length: 20, default: 'issued' })
  status!: string;

  @Column({ name: 'subtotal', type: 'decimal', precision: 19, scale: 4, default: 0 })
  subtotal!: string;

  @Column({ name: 'discount_total', type: 'decimal', precision: 19, scale: 4, default: 0 })
  discountTotal!: string;

  @Column({ name: 'tax_total', type: 'decimal', precision: 19, scale: 4, default: 0 })
  taxTotal!: string;

  @Column({ name: 'total', type: 'decimal', precision: 19, scale: 4 })
  total!: string;

  @Column({ name: 'cancelled_by_id', type: 'int', unsigned: true, nullable: true })
  cancelledById!: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cancelled_by_id', foreignKeyConstraintName: 'FK_sales_invoices_cancelled_by' })
  cancelledBy!: User | null;

  @Column({ name: 'cancelled_at', type: 'datetime', precision: 6, nullable: true })
  cancelledAt!: Date | null;

  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason!: string | null;
}

@Entity('sales_invoice_lines')
@Index('UQ_sales_invoice_lines_number', ['salesInvoiceId', 'lineNumber'], { unique: true })
export class SalesInvoiceLine extends TimestampedEntity {
  @Column({ name: 'sales_invoice_id', type: 'int', unsigned: true })
  salesInvoiceId!: number;

  @ManyToOne(() => SalesInvoice, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sales_invoice_id', foreignKeyConstraintName: 'FK_sales_invoice_lines_header' })
  salesInvoice!: SalesInvoice;

  @Column({ name: 'sales_order_line_id', type: 'int', unsigned: true })
  salesOrderLineId!: number;

  @ManyToOne(() => SalesOrderLine, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'sales_order_line_id',
    foreignKeyConstraintName: 'FK_sales_invoice_lines_order_line',
  })
  salesOrderLine!: SalesOrderLine;

  @Column({ name: 'line_number', type: 'int', unsigned: true })
  lineNumber!: number;

  @Column({ name: 'item_id', type: 'int', unsigned: true })
  itemId!: number;

  @ManyToOne(() => Item, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id', foreignKeyConstraintName: 'FK_sales_invoice_lines_item' })
  item!: Item;

  @Column({ name: 'unit_id', type: 'int', unsigned: true })
  unitId!: number;

  @ManyToOne(() => Unit, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id', foreignKeyConstraintName: 'FK_sales_invoice_lines_unit' })
  unit!: Unit;

  @Column({ name: 'item_name_snapshot', type: 'varchar', length: 200 })
  itemNameSnapshot!: string;

  @Column({ name: 'item_sku_snapshot', type: 'varchar', length: 50 })
  itemSkuSnapshot!: string;

  @Column({ name: 'unit_code_snapshot', type: 'varchar', length: 30 })
  unitCodeSnapshot!: string;

  @Column({ type: 'decimal', precision: 19, scale: 4 })
  quantity!: string;

  @Column({ name: 'unit_price', type: 'decimal', precision: 19, scale: 4 })
  unitPrice!: string;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 19, scale: 4, default: 0 })
  discountAmount!: string;

  @Column({ name: 'tax_rate', type: 'decimal', precision: 8, scale: 4, default: 0 })
  taxRate!: string;

  @Column({ name: 'line_total', type: 'decimal', precision: 19, scale: 4 })
  lineTotal!: string;
}

@Entity('payment_receipts')
@Index('UQ_payment_receipts_number', ['receiptNumber'], { unique: true })
@Index('IDX_payment_receipts_customer_date', ['customerId', 'receivedAt'])
export class PaymentReceipt extends TimestampedEntity {
  @Column({ name: 'receipt_number', type: 'varchar', length: 50 })
  receiptNumber!: string;

  @Column({ name: 'customer_id', type: 'int', unsigned: true })
  customerId!: number;

  @ManyToOne(() => Customer, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id', foreignKeyConstraintName: 'FK_payment_receipts_customer' })
  customer!: Customer;

  @Column({ name: 'currency_id', type: 'int', unsigned: true })
  currencyId!: number;

  @ManyToOne(() => Currency, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'currency_id', foreignKeyConstraintName: 'FK_payment_receipts_currency' })
  currency!: Currency;

  @Column({ name: 'received_amount', type: 'decimal', precision: 19, scale: 4 })
  receivedAmount!: string;

  @Column({
    name: 'exchange_rate_snapshot',
    type: 'decimal',
    precision: 19,
    scale: 8,
    default: 1,
  })
  exchangeRateSnapshot!: string;

  @Column({ name: 'payment_method', type: 'varchar', length: 20 })
  paymentMethod!: string;

  @Column({ name: 'reference_number', type: 'varchar', length: 100, nullable: true })
  referenceNumber!: string | null;

  @Column({ name: 'received_at', type: 'datetime', precision: 6 })
  receivedAt!: Date;

  @Column({ name: 'received_by_id', type: 'int', unsigned: true })
  receivedById!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'received_by_id', foreignKeyConstraintName: 'FK_payment_receipts_user' })
  receivedBy!: User;

  @Column({ type: 'varchar', length: 20, default: 'posted' })
  status!: string;

  @Column({ name: 'void_reason', type: 'text', nullable: true })
  voidReason!: string | null;
}

@Entity('payment_allocations')
@Index('UQ_payment_allocations_receipt_invoice', ['paymentReceiptId', 'salesInvoiceId'], {
  unique: true,
})
export class PaymentAllocation extends TimestampedEntity {
  @Column({ name: 'payment_receipt_id', type: 'int', unsigned: true })
  paymentReceiptId!: number;

  @ManyToOne(() => PaymentReceipt, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'payment_receipt_id',
    foreignKeyConstraintName: 'FK_payment_allocations_receipt',
  })
  paymentReceipt!: PaymentReceipt;

  @Column({ name: 'sales_invoice_id', type: 'int', unsigned: true })
  salesInvoiceId!: number;

  @ManyToOne(() => SalesInvoice, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'sales_invoice_id',
    foreignKeyConstraintName: 'FK_payment_allocations_invoice',
  })
  salesInvoice!: SalesInvoice;

  @Column({ type: 'decimal', precision: 19, scale: 4 })
  amount!: string;
}

@Entity('credit_notes')
@Index('UQ_credit_notes_number', ['creditNoteNumber'], { unique: true })
@Index('IDX_credit_notes_customer_date', ['customerId', 'issuedAt'])
export class CreditNote extends TimestampedEntity {
  @Column({ name: 'credit_note_number', type: 'varchar', length: 50 })
  creditNoteNumber!: string;

  @Column({ name: 'sales_invoice_id', type: 'int', unsigned: true })
  salesInvoiceId!: number;

  @ManyToOne(() => SalesInvoice, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sales_invoice_id', foreignKeyConstraintName: 'FK_credit_notes_invoice' })
  salesInvoice!: SalesInvoice;

  @Column({ name: 'customer_id', type: 'int', unsigned: true })
  customerId!: number;

  @ManyToOne(() => Customer, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id', foreignKeyConstraintName: 'FK_credit_notes_customer' })
  customer!: Customer;

  @Column({ name: 'issued_at', type: 'datetime', precision: 6 })
  issuedAt!: Date;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: string;

  @Column({ type: 'decimal', precision: 19, scale: 4 })
  amount!: string;

  @Column({ type: 'text' })
  reason!: string;
}
