import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { SoftDeletableEntity } from '../../../core/database/entities/base.entity';
import { Employee } from './employee.entity';
import { DeliveryZone } from './delivery-setup.entity';
import { Currency } from './currency.entity';

@Entity('customer_types')
@Index('UQ_customer_types_code', ['code'], { unique: true })
export class CustomerType extends SoftDeletableEntity {
  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;
}

@Entity('customers')
@Index('UQ_customers_code', ['customerCode'], { unique: true })
@Index('IDX_customers_name', ['name'])
@Index('IDX_customers_type_status', ['customerTypeId', 'status'])
export class Customer extends SoftDeletableEntity {
  @Column({ name: 'customer_code', type: 'varchar', length: 50 })
  customerCode!: string;

  @Column({ name: 'customer_type_id', type: 'int', unsigned: true })
  customerTypeId!: number;

  @ManyToOne(() => CustomerType, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_type_id', foreignKeyConstraintName: 'FK_customers_type' })
  customerType!: CustomerType;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ name: 'contact_name', type: 'varchar', length: 150, nullable: true })
  contactName!: string | null;

  @Column({ name: 'phone_number', type: 'varchar', length: 30, nullable: true })
  phoneNumber!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email!: string | null;

  @Column({ name: 'tax_number', type: 'varchar', length: 50, nullable: true })
  taxNumber!: string | null;

  @Column({ name: 'credit_limit', type: 'decimal', precision: 19, scale: 4, default: 0 })
  creditLimit!: string;

  @Column({ name: 'credit_currency_id', type: 'int', unsigned: true, nullable: true })
  creditCurrencyId!: number | null;

  @ManyToOne(() => Currency, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'credit_currency_id',
    foreignKeyConstraintName: 'FK_customers_credit_currency',
  })
  creditCurrency!: Currency | null;

  @Column({ name: 'credit_term_days', type: 'int', unsigned: true, default: 0 })
  creditTermDays!: number;

  @Column({ name: 'sales_employee_id', type: 'int', unsigned: true, nullable: true })
  salesEmployeeId!: number | null;

  @ManyToOne(() => Employee, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'sales_employee_id',
    foreignKeyConstraintName: 'FK_customers_sales_employee',
  })
  salesEmployee!: Employee | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: string;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;
}

@Entity('customer_addresses')
@Index('IDX_customer_addresses_customer_default', ['customerId', 'isDefault'])
export class CustomerAddress extends SoftDeletableEntity {
  @Column({ name: 'customer_id', type: 'int', unsigned: true })
  customerId!: number;

  @ManyToOne(() => Customer, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id', foreignKeyConstraintName: 'FK_customer_addresses_customer' })
  customer!: Customer;

  @Column({ name: 'label', type: 'varchar', length: 80, nullable: true })
  label!: string | null;

  @Column({ name: 'address_line1', type: 'varchar', length: 255 })
  addressLine1!: string;

  @Column({ name: 'address_line2', type: 'varchar', length: 255, nullable: true })
  addressLine2!: string | null;

  @Column({ name: 'village', type: 'varchar', length: 120, nullable: true })
  village!: string | null;

  @Column({ name: 'district', type: 'varchar', length: 120, nullable: true })
  district!: string | null;

  @Column({ name: 'province', type: 'varchar', length: 120, nullable: true })
  province!: string | null;

  @Column({ name: 'country_code', type: 'char', length: 2, default: 'LA' })
  countryCode!: string;

  @Column({ name: 'delivery_zone_id', type: 'int', unsigned: true, nullable: true })
  deliveryZoneId!: number | null;

  @ManyToOne(() => DeliveryZone, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'delivery_zone_id',
    foreignKeyConstraintName: 'FK_customer_addresses_delivery_zone',
  })
  deliveryZone!: DeliveryZone | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude!: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude!: string | null;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;
}
