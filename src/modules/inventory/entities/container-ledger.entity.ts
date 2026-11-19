import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TimestampedEntity } from '../../../core/database/entities/base.entity';
import { Currency } from '../../master-data/entities/currency.entity';
import { Customer } from '../../master-data/entities/customer.entity';
import { Item } from '../../master-data/entities/item.entity';
import { Unit } from '../../master-data/entities/item.entity';
import { User } from '../../users/entities/user.entity';

@Entity('container_ledger_entries')
@Index('IDX_container_ledger_customer_item_time', ['customerId', 'itemId', 'createdAt'])
@Index('IDX_container_ledger_source', ['sourceType', 'sourceId'])
export class ContainerLedgerEntry extends TimestampedEntity {
  @Column({ name: 'customer_id', type: 'int', unsigned: true })
  customerId!: number;

  @ManyToOne(() => Customer, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id', foreignKeyConstraintName: 'FK_container_ledger_customer' })
  customer!: Customer;

  @Column({ name: 'item_id', type: 'int', unsigned: true })
  itemId!: number;

  @ManyToOne(() => Item, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id', foreignKeyConstraintName: 'FK_container_ledger_item' })
  item!: Item;

  @Column({ name: 'unit_id', type: 'int', unsigned: true })
  unitId!: number;

  @ManyToOne(() => Unit, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id', foreignKeyConstraintName: 'FK_container_ledger_unit' })
  unit!: Unit;

  @Column({ name: 'entry_type', type: 'varchar', length: 30 })
  entryType!: string;

  @Column({ type: 'decimal', precision: 19, scale: 4 })
  quantity!: string;

  @Column({ name: 'deposit_unit_amount', type: 'decimal', precision: 19, scale: 4, default: 0 })
  depositUnitAmount!: string;

  @Column({ name: 'currency_id', type: 'int', unsigned: true, nullable: true })
  currencyId!: number | null;

  @ManyToOne(() => Currency, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'currency_id', foreignKeyConstraintName: 'FK_container_ledger_currency' })
  currency!: Currency | null;

  @Column({ name: 'source_type', type: 'varchar', length: 50 })
  sourceType!: string;

  @Column({ name: 'source_id', type: 'varchar', length: 100 })
  sourceId!: string;

  @Column({ name: 'actor_id', type: 'int', unsigned: true })
  actorId!: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'actor_id', foreignKeyConstraintName: 'FK_container_ledger_actor' })
  actor!: User;
}
