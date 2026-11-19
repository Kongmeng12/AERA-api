import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TimestampedEntity } from '../../../core/database/entities/base.entity';
import { Currency } from '../../master-data/entities/currency.entity';
import { Item } from '../../master-data/entities/item.entity';
import { Supplier } from '../../master-data/entities/supplier.entity';
import { Unit } from '../../master-data/entities/item.entity';
import { GoodsReceiptLine, PurchaseOrder, PurchaseOrderLine } from '../../purchasing/entities/purchase.entity';
import { User } from '../../users/entities/user.entity';

@Entity('supplier_bills')
@Index('UQ_supplier_bills_number', ['billNumber'], { unique: true })
@Index('UQ_supplier_bills_supplier_invoice', ['supplierId', 'supplierInvoiceNumber'], { unique: true })
@Index('IDX_supplier_bills_supplier_due', ['supplierId', 'status', 'dueAt'])
export class SupplierBill extends TimestampedEntity {
  @Column({ name: 'bill_number', type: 'varchar', length: 50 })
  billNumber!: string;

  @Column({ name: 'supplier_invoice_number', type: 'varchar', length: 100 })
  supplierInvoiceNumber!: string;

  @Column({ name: 'supplier_id', type: 'int', unsigned: true })
  supplierId!: number;

  @ManyToOne(() => Supplier, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplier_id', foreignKeyConstraintName: 'FK_supplier_bills_supplier' })
  supplier!: Supplier;

  @Column({ name: 'purchase_order_id', type: 'int', unsigned: true, nullable: true })
  purchaseOrderId!: number | null;

  @ManyToOne(() => PurchaseOrder, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'purchase_order_id', foreignKeyConstraintName: 'FK_supplier_bills_order' })
  purchaseOrder!: PurchaseOrder | null;

  @Column({ name: 'currency_id', type: 'int', unsigned: true })
  currencyId!: number;

  @ManyToOne(() => Currency, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'currency_id', foreignKeyConstraintName: 'FK_supplier_bills_currency' })
  currency!: Currency;

  @Column({ name: 'invoice_date', type: 'date' })
  invoiceDate!: string;

  @Column({ name: 'due_at', type: 'date', nullable: true })
  dueAt!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: string;

  @Column({ name: 'subtotal', type: 'decimal', precision: 19, scale: 4, default: 0 })
  subtotal!: string;

  @Column({ name: 'tax_total', type: 'decimal', precision: 19, scale: 4, default: 0 })
  taxTotal!: string;

  @Column({ name: 'total', type: 'decimal', precision: 19, scale: 4 })
  total!: string;

  @Column({ name: 'recorded_by_id', type: 'int', unsigned: true })
  recordedById!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'recorded_by_id', foreignKeyConstraintName: 'FK_supplier_bills_user' })
  recordedBy!: User;
}

@Entity('supplier_bill_lines')
@Index('UQ_supplier_bill_lines_number', ['supplierBillId', 'lineNumber'], { unique: true })
export class SupplierBillLine extends TimestampedEntity {
  @Column({ name: 'supplier_bill_id', type: 'int', unsigned: true })
  supplierBillId!: number;

  @ManyToOne(() => SupplierBill, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplier_bill_id', foreignKeyConstraintName: 'FK_supplier_bill_lines_header' })
  supplierBill!: SupplierBill;

  @Column({ name: 'line_number', type: 'int', unsigned: true })
  lineNumber!: number;

  @Column({ name: 'purchase_order_line_id', type: 'int', unsigned: true, nullable: true })
  purchaseOrderLineId!: number | null;

  @ManyToOne(() => PurchaseOrderLine, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'purchase_order_line_id',
    foreignKeyConstraintName: 'FK_supplier_bill_lines_order_line',
  })
  purchaseOrderLine!: PurchaseOrderLine | null;

  @Column({ name: 'item_id', type: 'int', unsigned: true })
  itemId!: number;

  @ManyToOne(() => Item, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id', foreignKeyConstraintName: 'FK_supplier_bill_lines_item' })
  item!: Item;

  @Column({ name: 'unit_id', type: 'int', unsigned: true })
  unitId!: number;

  @ManyToOne(() => Unit, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id', foreignKeyConstraintName: 'FK_supplier_bill_lines_unit' })
  unit!: Unit;

  @Column({ type: 'decimal', precision: 19, scale: 4 })
  quantity!: string;

  @Column({ name: 'unit_price', type: 'decimal', precision: 19, scale: 4 })
  unitPrice!: string;

  @Column({ name: 'line_total', type: 'decimal', precision: 19, scale: 4 })
  lineTotal!: string;
}

@Entity('supplier_bill_receipt_matches')
@Index('UQ_supplier_bill_receipt_matches', ['supplierBillLineId', 'goodsReceiptLineId'], {
  unique: true,
})
export class SupplierBillReceiptMatch extends TimestampedEntity {
  @Column({ name: 'supplier_bill_line_id', type: 'int', unsigned: true })
  supplierBillLineId!: number;

  @ManyToOne(() => SupplierBillLine, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'supplier_bill_line_id',
    foreignKeyConstraintName: 'FK_supplier_bill_receipt_matches_bill_line',
  })
  supplierBillLine!: SupplierBillLine;

  @Column({ name: 'goods_receipt_line_id', type: 'int', unsigned: true })
  goodsReceiptLineId!: number;

  @ManyToOne(() => GoodsReceiptLine, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'goods_receipt_line_id',
    foreignKeyConstraintName: 'FK_supplier_bill_receipt_matches_receipt_line',
  })
  goodsReceiptLine!: GoodsReceiptLine;

  @Column({ name: 'matched_quantity', type: 'decimal', precision: 19, scale: 4 })
  matchedQuantity!: string;

  @Column({ name: 'matched_unit_price', type: 'decimal', precision: 19, scale: 4 })
  matchedUnitPrice!: string;
}

@Entity('supplier_payments')
@Index('UQ_supplier_payments_number', ['paymentNumber'], { unique: true })
@Index('IDX_supplier_payments_supplier_date', ['supplierId', 'paidAt'])
export class SupplierPayment extends TimestampedEntity {
  @Column({ name: 'payment_number', type: 'varchar', length: 50 })
  paymentNumber!: string;

  @Column({ name: 'supplier_id', type: 'int', unsigned: true })
  supplierId!: number;

  @ManyToOne(() => Supplier, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplier_id', foreignKeyConstraintName: 'FK_supplier_payments_supplier' })
  supplier!: Supplier;

  @Column({ name: 'currency_id', type: 'int', unsigned: true })
  currencyId!: number;

  @ManyToOne(() => Currency, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'currency_id', foreignKeyConstraintName: 'FK_supplier_payments_currency' })
  currency!: Currency;

  @Column({ type: 'decimal', precision: 19, scale: 4 })
  amount!: string;

  @Column({ name: 'payment_method', type: 'varchar', length: 20 })
  paymentMethod!: string;

  @Column({ name: 'reference_number', type: 'varchar', length: 100, nullable: true })
  referenceNumber!: string | null;

  @Column({ name: 'paid_at', type: 'datetime', precision: 6 })
  paidAt!: Date;

  @Column({ name: 'paid_by_id', type: 'int', unsigned: true })
  paidById!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'paid_by_id', foreignKeyConstraintName: 'FK_supplier_payments_user' })
  paidBy!: User;

  @Column({ type: 'varchar', length: 20, default: 'posted' })
  status!: string;
}

@Entity('supplier_payment_allocations')
@Index('UQ_supplier_payment_allocations_payment_bill', ['supplierPaymentId', 'supplierBillId'], {
  unique: true,
})
export class SupplierPaymentAllocation extends TimestampedEntity {
  @Column({ name: 'supplier_payment_id', type: 'int', unsigned: true })
  supplierPaymentId!: number;

  @ManyToOne(() => SupplierPayment, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'supplier_payment_id',
    foreignKeyConstraintName: 'FK_supplier_payment_allocations_payment',
  })
  supplierPayment!: SupplierPayment;

  @Column({ name: 'supplier_bill_id', type: 'int', unsigned: true })
  supplierBillId!: number;

  @ManyToOne(() => SupplierBill, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'supplier_bill_id',
    foreignKeyConstraintName: 'FK_supplier_payment_allocations_bill',
  })
  supplierBill!: SupplierBill;

  @Column({ type: 'decimal', precision: 19, scale: 4 })
  amount!: string;
}
