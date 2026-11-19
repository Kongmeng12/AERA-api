import { Column, Entity, Index } from 'typeorm';
import { SoftDeletableEntity } from '../../../core/database/entities/base.entity';

@Entity('suppliers')
@Index('UQ_suppliers_code', ['supplierCode'], { unique: true })
@Index('IDX_suppliers_name', ['name'])
export class Supplier extends SoftDeletableEntity {
  @Column({ name: 'supplier_code', type: 'varchar', length: 50 })
  supplierCode!: string;

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

  @Column({ name: 'address_text', type: 'varchar', length: 500, nullable: true })
  addressText!: string | null;

  @Column({ name: 'payment_term_days', type: 'int', unsigned: true, default: 0 })
  paymentTermDays!: number;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;
}
