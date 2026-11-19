import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TimestampedEntity } from '../../../core/database/entities/base.entity';
import { Item } from '../../master-data/entities/item.entity';
import { Unit } from '../../master-data/entities/item.entity';
import { Supplier } from '../../master-data/entities/supplier.entity';
import { GoodsReceipt, GoodsReceiptLine } from './purchase.entity';
import { StockBatch } from '../../inventory/entities/stock.entity';
import { User } from '../../users/entities/user.entity';

@Entity('supplier_returns')
@Index('UQ_supplier_returns_number', ['returnNumber'], { unique: true })
@Index('IDX_supplier_returns_supplier_date', ['supplierId', 'requestedAt'])
export class SupplierReturn extends TimestampedEntity {
  @Column({ name: 'return_number', type: 'varchar', length: 50 })
  returnNumber!: string;

  @Column({ name: 'supplier_id', type: 'int', unsigned: true })
  supplierId!: number;

  @ManyToOne(() => Supplier, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplier_id', foreignKeyConstraintName: 'FK_supplier_returns_supplier' })
  supplier!: Supplier;

  @Column({ name: 'goods_receipt_id', type: 'int', unsigned: true, nullable: true })
  goodsReceiptId!: number | null;

  @ManyToOne(() => GoodsReceipt, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'goods_receipt_id', foreignKeyConstraintName: 'FK_supplier_returns_receipt' })
  goodsReceipt!: GoodsReceipt | null;

  @Column({ name: 'requested_by_id', type: 'int', unsigned: true })
  requestedById!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'requested_by_id', foreignKeyConstraintName: 'FK_supplier_returns_requester' })
  requestedBy!: User;

  @Column({ name: 'requested_at', type: 'datetime', precision: 6 })
  requestedAt!: Date;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: string;

  @Column({ type: 'text' })
  reason!: string;
}

@Entity('supplier_return_lines')
@Index('UQ_supplier_return_lines_number', ['supplierReturnId', 'lineNumber'], { unique: true })
export class SupplierReturnLine extends TimestampedEntity {
  @Column({ name: 'supplier_return_id', type: 'int', unsigned: true })
  supplierReturnId!: number;

  @ManyToOne(() => SupplierReturn, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplier_return_id', foreignKeyConstraintName: 'FK_supplier_return_lines_header' })
  supplierReturn!: SupplierReturn;

  @Column({ name: 'goods_receipt_line_id', type: 'int', unsigned: true, nullable: true })
  goodsReceiptLineId!: number | null;

  @ManyToOne(() => GoodsReceiptLine, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'goods_receipt_line_id',
    foreignKeyConstraintName: 'FK_supplier_return_lines_receipt_line',
  })
  goodsReceiptLine!: GoodsReceiptLine | null;

  @Column({ name: 'line_number', type: 'int', unsigned: true })
  lineNumber!: number;

  @Column({ name: 'item_id', type: 'int', unsigned: true })
  itemId!: number;

  @ManyToOne(() => Item, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id', foreignKeyConstraintName: 'FK_supplier_return_lines_item' })
  item!: Item;

  @Column({ name: 'batch_id', type: 'int', unsigned: true, nullable: true })
  batchId!: number | null;

  @ManyToOne(() => StockBatch, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'batch_id', foreignKeyConstraintName: 'FK_supplier_return_lines_batch' })
  batch!: StockBatch | null;

  @Column({ name: 'unit_id', type: 'int', unsigned: true })
  unitId!: number;

  @ManyToOne(() => Unit, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id', foreignKeyConstraintName: 'FK_supplier_return_lines_unit' })
  unit!: Unit;

  @Column({ type: 'decimal', precision: 19, scale: 4 })
  quantity!: string;
}
