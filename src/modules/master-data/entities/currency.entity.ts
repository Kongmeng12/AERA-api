import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { SoftDeletableEntity, TimestampedEntity } from '../../../core/database/entities/base.entity';

@Entity('currencies')
@Index('UQ_currencies_code', ['code'], { unique: true })
export class Currency extends SoftDeletableEntity {
  @Column({ type: 'char', length: 3 })
  code!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ name: 'minor_unit_digits', type: 'tinyint', unsigned: true, default: 2 })
  minorUnitDigits!: number;

  @Column({ name: 'is_base_currency', type: 'boolean', default: false })
  isBaseCurrency!: boolean;
}

@Entity('exchange_rates')
@Index('UQ_exchange_rates_pair_effective', ['baseCurrencyId', 'quoteCurrencyId', 'effectiveAt'], {
  unique: true,
})
@Index('IDX_exchange_rates_effective', ['effectiveAt'])
export class ExchangeRate extends TimestampedEntity {
  @Column({ name: 'base_currency_id', type: 'int', unsigned: true })
  baseCurrencyId!: number;

  @ManyToOne(() => Currency, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'base_currency_id',
    foreignKeyConstraintName: 'FK_exchange_rates_base_currency',
  })
  baseCurrency!: Currency;

  @Column({ name: 'quote_currency_id', type: 'int', unsigned: true })
  quoteCurrencyId!: number;

  @ManyToOne(() => Currency, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'quote_currency_id',
    foreignKeyConstraintName: 'FK_exchange_rates_quote_currency',
  })
  quoteCurrency!: Currency;

  @Column({ type: 'decimal', precision: 19, scale: 8 })
  rate!: string;

  @Column({ name: 'effective_at', type: 'datetime', precision: 6 })
  effectiveAt!: Date;
}
