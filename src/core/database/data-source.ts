import 'reflect-metadata';
import path from 'node:path';
import { DataSource } from 'typeorm';
import { databaseConfig } from '../../config/database.config';
import { RefreshToken } from '../../modules/auth/entities/refresh-token.entity';
import { Delivery, DeliveryAttempt, DeliveryLine, DeliveryOrder, DeliveryScan } from '../../modules/delivery/entities/delivery.entity';
import {
  SupplierBill,
  SupplierBillLine,
  SupplierBillReceiptMatch,
  SupplierPayment,
  SupplierPaymentAllocation,
} from '../../modules/finance/entities/accounts-payable.entity';
import {
  BarcodePrintJob,
  BarcodePrintJobItem,
  BarcodePrinterProfile,
  ScanDevice,
  StockScanEvent,
} from '../../modules/inventory/entities/barcode.entity';
import { ContainerLedgerEntry } from '../../modules/inventory/entities/container-ledger.entity';
import { InventoryReservation } from '../../modules/inventory/entities/inventory-reservation.entity';
import {
  StockBatch,
  InventoryBalance,
  InventoryUnit,
  StockMovement,
} from '../../modules/inventory/entities/stock.entity';
import {
  StockCount,
  StockCountLine,
  StockTransfer,
  StockTransferLine,
  StockWriteoff,
  StockWriteoffLine,
} from '../../modules/inventory/entities/stock-operations.entity';
import {
  Customer,
  CustomerAddress,
  CustomerType,
} from '../../modules/master-data/entities/customer.entity';
import { Currency, ExchangeRate } from '../../modules/master-data/entities/currency.entity';
import {
  DeliveryRoute,
  DeliveryZone,
  Vehicle,
} from '../../modules/master-data/entities/delivery-setup.entity';
import { Employee } from '../../modules/master-data/entities/employee.entity';
import {
  Item,
  ItemCategory,
  ItemUnitConversion,
  Unit,
} from '../../modules/master-data/entities/item.entity';
import { Promotion, SalesPrice } from '../../modules/master-data/entities/pricing.entity';
import { SupplierItemPrice } from '../../modules/master-data/entities/supplier-item-price.entity';
import { Supplier } from '../../modules/master-data/entities/supplier.entity';
import { Warehouse, WarehouseZone } from '../../modules/master-data/entities/warehouse.entity';
import {
  BillOfMaterialLine,
  BillOfMaterials,
  ProductionMaterialIssue,
  ProductionOrder,
  ProductionOrderOutput,
} from '../../modules/production/entities/production.entity';
import {
  GoodsReceipt,
  GoodsReceiptLine,
  PurchaseOrder,
  PurchaseOrderLine,
  PurchaseRequisition,
  PurchaseRequisitionLine,
} from '../../modules/purchasing/entities/purchase.entity';
import { SupplierReturn, SupplierReturnLine } from '../../modules/purchasing/entities/supplier-return.entity';
import {
  QcInspection,
  QcInspectionResult,
  QcTestDefinition,
} from '../../modules/quality-control/entities/quality-control.entity';
import {
  CreditNote,
  PaymentAllocation,
  PaymentReceipt,
  SalesInvoice,
  SalesInvoiceLine,
} from '../../modules/sales/entities/invoice-payment.entity';
import {
  CreditNoteLine,
  SalesReturn,
  SalesReturnLine,
} from '../../modules/sales/entities/sales-return.entity';
import { SalesOrder, SalesOrderLine } from '../../modules/sales/entities/sales-order.entity';
import { Permission } from '../../modules/roles/entities/permission.entity';
import { Role } from '../../modules/roles/entities/role.entity';
import { RolePermission } from '../../modules/roles/entities/role-permission.entity';
import { UserPermission } from '../../modules/roles/entities/user-permission.entity';
import { User } from '../../modules/users/entities/user.entity';
import { ApprovalDecision, ApprovalRequest } from './entities/approval.entity';
import { AuditLog } from './entities/audit-log.entity';
import { DocumentTemplate } from './entities/document-template.entity';
import { DocumentNumberFormat } from './entities/document-number-format.entity';
import { DocumentSequence } from './entities/document-sequence.entity';
import { Notification, NotificationRecipient } from './entities/notification.entity';

export const AppDataSource = new DataSource({
  type: 'mysql',
  ...databaseConfig,
  charset: 'utf8mb4',
  timezone: 'Z',
  synchronize: false,
  // TypeORM's logger prints SQL parameters, which include password and token hashes.
  logging: false,
  entities: [
    Role,
    Permission,
    RolePermission,
    UserPermission,
    User,
    RefreshToken,
    AuditLog,
    ApprovalRequest,
    ApprovalDecision,
    DocumentNumberFormat,
    DocumentSequence,
    DocumentTemplate,
    Notification,
    NotificationRecipient,
    Employee,
    CustomerType,
    Customer,
    CustomerAddress,
    Supplier,
    Warehouse,
    WarehouseZone,
    DeliveryZone,
    DeliveryRoute,
    Vehicle,
    Unit,
    ItemCategory,
    Item,
    ItemUnitConversion,
    SupplierItemPrice,
    Currency,
    ExchangeRate,
    SalesPrice,
    Promotion,
    PurchaseRequisition,
    PurchaseRequisitionLine,
    PurchaseOrder,
    PurchaseOrderLine,
    GoodsReceipt,
    GoodsReceiptLine,
    SupplierReturn,
    SupplierReturnLine,
    StockBatch,
    InventoryUnit,
    InventoryBalance,
    StockMovement,
    StockTransfer,
    StockTransferLine,
    StockCount,
    StockCountLine,
    StockWriteoff,
    StockWriteoffLine,
    ScanDevice,
    StockScanEvent,
    BarcodePrinterProfile,
    BarcodePrintJob,
    BarcodePrintJobItem,
    ContainerLedgerEntry,
    InventoryReservation,
    SalesOrder,
    SalesOrderLine,
    SalesInvoice,
    SalesInvoiceLine,
    PaymentReceipt,
    PaymentAllocation,
    CreditNote,
    SalesReturn,
    SalesReturnLine,
    CreditNoteLine,
    Delivery,
    DeliveryOrder,
    DeliveryLine,
    DeliveryScan,
    DeliveryAttempt,
    BillOfMaterials,
    BillOfMaterialLine,
    ProductionOrder,
    ProductionMaterialIssue,
    ProductionOrderOutput,
    QcTestDefinition,
    QcInspection,
    QcInspectionResult,
    SupplierBill,
    SupplierBillLine,
    SupplierBillReceiptMatch,
    SupplierPayment,
    SupplierPaymentAllocation,
  ],
  migrations: [path.join(__dirname, 'migrations', '*.{ts,js}')],
  poolSize: 10,
});
