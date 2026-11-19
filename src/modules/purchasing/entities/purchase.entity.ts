import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TimestampedEntity } from '../../../core/database/entities/base.entity';
import { Currency } from '../../master-data/entities/currency.entity';
import { Item } from '../../master-data/entities/item.entity';
import { Supplier } from '../../master-data/entities/supplier.entity';
import { Unit } from '../../master-data/entities/item.entity';
import { Warehouse, WarehouseZone } from '../../master-data/entities/warehouse.entity';
import { StockBatch } from '../../inventory/entities/stock.entity';
import { User } from '../../users/entities/user.entity';

@Entity('purchase_requisitions')
@Index('UQ_purchase_requisitions_number', ['requisitionNumber'], { unique: true })
@Index('IDX_purchase_requisitions_status_date', ['status', 'requestedAt'])
export class PurchaseRequisition extends TimestampedEntity {
  @Column({ name: 'requisition_number', type: 'varchar', length: 50 })
  requisitionNumber!: string;

  @Column({ name: 'requested_by_id', type: 'int', unsigned: true })
  requestedById!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'requested_by_id',
    foreignKeyConstraintName: 'FK_purchase_requisitions_requester',
  })
  requestedBy!: User;

  @Column({ name: 'requested_at', type: 'datetime', precision: 6 })
  requestedAt!: Date;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;
}

@Entity('purchase_requisition_lines')
@Index('UQ_purchase_requisition_lines_number', ['requisitionId', 'lineNumber'], { unique: true })
export class PurchaseRequisitionLine extends TimestampedEntity {
  @Column({ name: 'requisition_id', type: 'int', unsigned: true })
  requisitionId!: number;

  @ManyToOne(() => PurchaseRequisition, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'requisition_id',
    foreignKeyConstraintName: 'FK_purchase_requisition_lines_header',
  })
  requisition!: PurchaseRequisition;

  @Column({ name: 'line_number', type: 'int', unsigned: true })
  lineNumber!: number;

  @Column({ name: 'item_id', type: 'int', unsigned: true })
  itemId!: number;

  @ManyToOne(() => Item, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id', foreignKeyConstraintName: 'FK_purchase_requisition_lines_item' })
  item!: Item;

  @Column({ name: 'unit_id', type: 'int', unsigned: true })
  unitId!: number;

  @ManyToOne(() => Unit, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id', foreignKeyConstraintName: 'FK_purchase_requisition_lines_unit' })
  unit!: Unit;

  @Column({ type: 'decimal', precision: 19, scale: 4 })
  quantity!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;
}

@Entity('purchase_orders')
@Index('UQ_purchase_orders_number', ['purchaseOrderNumber'], { unique: true })
@Index('IDX_purchase_orders_supplier_status', ['supplierId', 'status'])
@Index('IDX_purchase_orders_ordered_at', ['orderedAt'])
export class PurchaseOrder extends TimestampedEntity {
  @Column({ name: 'purchase_order_number', type: 'varchar', length: 50 })
  purchaseOrderNumber!: string;

  @Column({ name: 'requisition_id', type: 'int', unsigned: true, nullable: true })
  requisitionId!: number | null;

  @ManyToOne(() => PurchaseRequisition, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'requisition_id', foreignKeyConstraintName: 'FK_purchase_orders_requisition' })
  requisition!: PurchaseRequisition | null;

  @Column({ name: 'supplier_id', type: 'int', unsigned: true })
  supplierId!: number;

  @ManyToOne(() => Supplier, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplier_id', foreignKeyConstraintName: 'FK_purchase_orders_supplier' })
  supplier!: Supplier;

  @Column({ name: 'currency_id', type: 'int', unsigned: true })
  currencyId!: number;

  @ManyToOne(() => Currency, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'currency_id', foreignKeyConstraintName: 'FK_purchase_orders_currency' })
  currency!: Currency;

  @Column({ name: 'ordered_by_id', type: 'int', unsigned: true })
  orderedById!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ordered_by_id', foreignKeyConstraintName: 'FK_purchase_orders_ordered_by' })
  orderedBy!: User;

  @Column({ name: 'ordered_at', type: 'datetime', precision: 6 })
  orderedAt!: Date;

  @Column({ name: 'expected_at', type: 'datetime', precision: 6, nullable: true })
  expectedAt!: Date | null;

  @Column({ name: 'delivery_address_snapshot', type: 'varchar', length: 500, nullable: true })
  deliveryAddressSnapshot!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: string;

  @Column({ name: 'subtotal', type: 'decimal', precision: 19, scale: 4, default: 0 })
  subtotal!: string;

  @Column({ name: 'discount_total', type: 'decimal', precision: 19, scale: 4, default: 0 })
  discountTotal!: string;

  @Column({ name: 'tax_total', type: 'decimal', precision: 19, scale: 4, default: 0 })
  taxTotal!: string;

  @Column({ name: 'total', type: 'decimal', precision: 19, scale: 4, default: 0 })
  total!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;
}

@Entity('purchase_order_lines')
@Index('UQ_purchase_order_lines_number', ['purchaseOrderId', 'lineNumber'], { unique: true })
@Index('IDX_purchase_order_lines_item', ['itemId'])
export class PurchaseOrderLine extends TimestampedEntity {
  @Column({ name: 'purchase_order_id', type: 'int', unsigned: true })
  purchaseOrderId!: number;

  @ManyToOne(() => PurchaseOrder, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_order_id', foreignKeyConstraintName: 'FK_purchase_order_lines_header' })
  purchaseOrder!: PurchaseOrder;

  @Column({ name: 'line_number', type: 'int', unsigned: true })
  lineNumber!: number;

  @Column({ name: 'item_id', type: 'int', unsigned: true })
  itemId!: number;

  @ManyToOne(() => Item, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id', foreignKeyConstraintName: 'FK_purchase_order_lines_item' })
  item!: Item;

  @Column({ name: 'unit_id', type: 'int', unsigned: true })
  unitId!: number;

  @ManyToOne(() => Unit, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id', foreignKeyConstraintName: 'FK_purchase_order_lines_unit' })
  unit!: Unit;

  @Column({ name: 'item_sku_snapshot', type: 'varchar', length: 50 })
  itemSkuSnapshot!: string;

  @Column({ name: 'item_name_snapshot', type: 'varchar', length: 200 })
  itemNameSnapshot!: string;

  @Column({ name: 'unit_code_snapshot', type: 'varchar', length: 30 })
  unitCodeSnapshot!: string;

  @Column({ name: 'conversion_to_base_snapshot', type: 'decimal', precision: 19, scale: 6 })
  conversionToBaseSnapshot!: string;

  @Column({ type: 'decimal', precision: 19, scale: 4 })
  quantity!: string;

  @Column({ name: 'unit_price', type: 'decimal', precision: 19, scale: 4 })
  unitPrice!: string;

  @Column({ name: 'received_quantity', type: 'decimal', precision: 19, scale: 4, default: 0 })
  receivedQuantity!: string;

  @Column({ name: 'line_total', type: 'decimal', precision: 19, scale: 4 })
  lineTotal!: string;
}

@Entity('goods_receipts')
@Index('UQ_goods_receipts_number', ['receiptNumber'], { unique: true })
@Index('IDX_goods_receipts_supplier_received', ['supplierId', 'receivedAt'])
export class GoodsReceipt extends TimestampedEntity {
  @Column({ name: 'receipt_number', type: 'varchar', length: 50 })
  receiptNumber!: string;

  @Column({ name: 'purchase_order_id', type: 'int', unsigned: true })
  purchaseOrderId!: number;

  @ManyToOne(() => PurchaseOrder, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'purchase_order_id', foreignKeyConstraintName: 'FK_goods_receipts_order' })
  purchaseOrder!: PurchaseOrder;

  @Column({ name: 'supplier_id', type: 'int', unsigned: true })
  supplierId!: number;

  @ManyToOne(() => Supplier, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplier_id', foreignKeyConstraintName: 'FK_goods_receipts_supplier' })
  supplier!: Supplier;

  @Column({ name: 'warehouse_id', type: 'int', unsigned: true })
  warehouseId!: number;

  @ManyToOne(() => Warehouse, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'warehouse_id', foreignKeyConstraintName: 'FK_goods_receipts_warehouse' })
  warehouse!: Warehouse;

  @Column({ name: 'received_by_id', type: 'int', unsigned: true })
  receivedById!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'received_by_id', foreignKeyConstraintName: 'FK_goods_receipts_receiver' })
  receivedBy!: User;

  @Column({ name: 'received_at', type: 'datetime', precision: 6 })
  receivedAt!: Date;

  @Column({ type: 'varchar', length: 20, default: 'posted' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;
}

@Entity('goods_receipt_lines')
@Index('UQ_goods_receipt_lines_number', ['goodsReceiptId', 'lineNumber'], { unique: true })
export class GoodsReceiptLine extends TimestampedEntity {
  @Column({ name: 'goods_receipt_id', type: 'int', unsigned: true })
  goodsReceiptId!: number;

  @ManyToOne(() => GoodsReceipt, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'goods_receipt_id', foreignKeyConstraintName: 'FK_goods_receipt_lines_header' })
  goodsReceipt!: GoodsReceipt;

  @Column({ name: 'purchase_order_line_id', type: 'int', unsigned: true })
  purchaseOrderLineId!: number;

  @ManyToOne(() => PurchaseOrderLine, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'purchase_order_line_id',
    foreignKeyConstraintName: 'FK_goods_receipt_lines_order_line',
  })
  purchaseOrderLine!: PurchaseOrderLine;

  @Column({ name: 'line_number', type: 'int', unsigned: true })
  lineNumber!: number;

  @Column({ name: 'stock_batch_id', type: 'int', unsigned: true, nullable: true })
  stockBatchId!: number | null;

  @ManyToOne(() => StockBatch, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'stock_batch_id', foreignKeyConstraintName: 'FK_goods_receipt_lines_batch' })
  stockBatch!: StockBatch | null;

  @Column({ name: 'warehouse_zone_id', type: 'int', unsigned: true, nullable: true })
  warehouseZoneId!: number | null;

  @ManyToOne(() => WarehouseZone, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'warehouse_zone_id',
    foreignKeyConstraintName: 'FK_goods_receipt_lines_zone',
  })
  warehouseZone!: WarehouseZone | null;

  @Column({ name: 'item_id', type: 'int', unsigned: true })
  itemId!: number;

  @ManyToOne(() => Item, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id', foreignKeyConstraintName: 'FK_goods_receipt_lines_item' })
  item!: Item;

  @Column({ name: 'unit_id', type: 'int', unsigned: true })
  unitId!: number;

  @ManyToOne(() => Unit, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id', foreignKeyConstraintName: 'FK_goods_receipt_lines_unit' })
  unit!: Unit;

  @Column({ name: 'item_name_snapshot', type: 'varchar', length: 200 })
  itemNameSnapshot!: string;

  @Column({ name: 'unit_code_snapshot', type: 'varchar', length: 30 })
  unitCodeSnapshot!: string;

  @Column({ name: 'ordered_quantity', type: 'decimal', precision: 19, scale: 4 })
  orderedQuantity!: string;

  @Column({ name: 'received_quantity', type: 'decimal', precision: 19, scale: 4 })
  receivedQuantity!: string;

  @Column({ name: 'rejected_quantity', type: 'decimal', precision: 19, scale: 4, default: 0 })
  rejectedQuantity!: string;

  @Column({ name: 'unit_cost', type: 'decimal', precision: 19, scale: 4 })
  unitCost!: string;

  @Column({ name: 'batch_number', type: 'varchar', length: 80, nullable: true })
  batchNumber!: string | null;

  @Column({ name: 'manufactured_at', type: 'date', nullable: true })
  manufacturedAt!: string | null;

  @Column({ name: 'expires_at', type: 'date', nullable: true })
  expiresAt!: string | null;
}
