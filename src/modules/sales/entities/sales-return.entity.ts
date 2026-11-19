import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TimestampedEntity } from '../../../core/database/entities/base.entity';
import { Customer } from '../../master-data/entities/customer.entity';
import { Item } from '../../master-data/entities/item.entity';
import { Unit } from '../../master-data/entities/item.entity';
import { InventoryUnit, StockBatch } from '../../inventory/entities/stock.entity';
import { SalesInvoice, SalesInvoiceLine, CreditNote } from './invoice-payment.entity';
import { User } from '../../users/entities/user.entity';

@Entity('sales_returns')
@Index('UQ_sales_returns_number', ['returnNumber'], { unique: true })
@Index('IDX_sales_returns_customer_date', ['customerId', 'requestedAt'])
export class SalesReturn extends TimestampedEntity {
  @Column({ name: 'return_number', type: 'varchar', length: 50 })
  returnNumber!: string;

  @Column({ name: 'sales_invoice_id', type: 'int', unsigned: true })
  salesInvoiceId!: number;

  @ManyToOne(() => SalesInvoice, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sales_invoice_id', foreignKeyConstraintName: 'FK_sales_returns_invoice' })
  salesInvoice!: SalesInvoice;

  @Column({ name: 'customer_id', type: 'int', unsigned: true })
  customerId!: number;

  @ManyToOne(() => Customer, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id', foreignKeyConstraintName: 'FK_sales_returns_customer' })
  customer!: Customer;

  @Column({ name: 'requested_by_id', type: 'int', unsigned: true })
  requestedById!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'requested_by_id', foreignKeyConstraintName: 'FK_sales_returns_requester' })
  requestedBy!: User;

  @Column({ name: 'requested_at', type: 'datetime', precision: 6 })
  requestedAt!: Date;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: string;

  @Column({ type: 'text' })
  reason!: string;

  @Column({ name: 'credit_note_id', type: 'int', unsigned: true, nullable: true })
  creditNoteId!: number | null;

  @ManyToOne(() => CreditNote, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'credit_note_id', foreignKeyConstraintName: 'FK_sales_returns_credit_note' })
  creditNote!: CreditNote | null;
}

@Entity('sales_return_lines')
@Index('UQ_sales_return_lines_number', ['salesReturnId', 'lineNumber'], { unique: true })
export class SalesReturnLine extends TimestampedEntity {
  @Column({ name: 'sales_return_id', type: 'int', unsigned: true })
  salesReturnId!: number;

  @ManyToOne(() => SalesReturn, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sales_return_id', foreignKeyConstraintName: 'FK_sales_return_lines_header' })
  salesReturn!: SalesReturn;

  @Column({ name: 'sales_invoice_line_id', type: 'int', unsigned: true })
  salesInvoiceLineId!: number;

  @ManyToOne(() => SalesInvoiceLine, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'sales_invoice_line_id',
    foreignKeyConstraintName: 'FK_sales_return_lines_invoice_line',
  })
  salesInvoiceLine!: SalesInvoiceLine;

  @Column({ name: 'line_number', type: 'int', unsigned: true })
  lineNumber!: number;

  @Column({ name: 'inventory_unit_id', type: 'int', unsigned: true, nullable: true })
  inventoryUnitId!: number | null;

  @ManyToOne(() => InventoryUnit, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'inventory_unit_id', foreignKeyConstraintName: 'FK_sales_return_lines_unit' })
  inventoryUnit!: InventoryUnit | null;

  @Column({ name: 'item_id', type: 'int', unsigned: true })
  itemId!: number;

  @ManyToOne(() => Item, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id', foreignKeyConstraintName: 'FK_sales_return_lines_item' })
  item!: Item;

  @Column({ name: 'batch_id', type: 'int', unsigned: true, nullable: true })
  batchId!: number | null;

  @ManyToOne(() => StockBatch, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'batch_id', foreignKeyConstraintName: 'FK_sales_return_lines_batch' })
  batch!: StockBatch | null;

  @Column({ name: 'unit_id', type: 'int', unsigned: true })
  unitId!: number;

  @ManyToOne(() => Unit, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id', foreignKeyConstraintName: 'FK_sales_return_lines_measure' })
  unit!: Unit;

  @Column({ type: 'decimal', precision: 19, scale: 4 })
  quantity!: string;

  @Column({ type: 'varchar', length: 20 })
  disposition!: string;

  @Column({ name: 'unit_price_snapshot', type: 'decimal', precision: 19, scale: 4 })
  unitPriceSnapshot!: string;

  @Column({ name: 'line_credit_amount', type: 'decimal', precision: 19, scale: 4 })
  lineCreditAmount!: string;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;
}

@Entity('credit_note_lines')
@Index('UQ_credit_note_lines_number', ['creditNoteId', 'lineNumber'], { unique: true })
export class CreditNoteLine extends TimestampedEntity {
  @Column({ name: 'credit_note_id', type: 'int', unsigned: true })
  creditNoteId!: number;

  @ManyToOne(() => CreditNote, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'credit_note_id', foreignKeyConstraintName: 'FK_credit_note_lines_header' })
  creditNote!: CreditNote;

  @Column({ name: 'sales_return_line_id', type: 'int', unsigned: true, nullable: true })
  salesReturnLineId!: number | null;

  @ManyToOne(() => SalesReturnLine, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'sales_return_line_id',
    foreignKeyConstraintName: 'FK_credit_note_lines_return_line',
  })
  salesReturnLine!: SalesReturnLine | null;

  @Column({ name: 'line_number', type: 'int', unsigned: true })
  lineNumber!: number;

  @Column({ name: 'item_id', type: 'int', unsigned: true })
  itemId!: number;

  @ManyToOne(() => Item, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id', foreignKeyConstraintName: 'FK_credit_note_lines_item' })
  item!: Item;

  @Column({ name: 'unit_id', type: 'int', unsigned: true })
  unitId!: number;

  @ManyToOne(() => Unit, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id', foreignKeyConstraintName: 'FK_credit_note_lines_unit' })
  unit!: Unit;

  @Column({ type: 'decimal', precision: 19, scale: 4 })
  quantity!: string;

  @Column({ name: 'unit_price', type: 'decimal', precision: 19, scale: 4 })
  unitPrice!: string;

  @Column({ name: 'line_total', type: 'decimal', precision: 19, scale: 4 })
  lineTotal!: string;
}
