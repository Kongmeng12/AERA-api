import { Column, Entity, Index } from 'typeorm';
import { SoftDeletableEntity } from './base.entity';

@Entity('document_number_formats')
@Index('UQ_document_number_formats_code', ['code'], { unique: true })
export class DocumentNumberFormat extends SoftDeletableEntity {
  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ type: 'varchar', length: 30 })
  prefix!: string;

  @Column({ name: 'number_pattern', type: 'varchar', length: 100, default: '{prefix}-{year}-{sequence}' })
  numberPattern!: string;

  @Column({ name: 'sequence_padding', type: 'tinyint', unsigned: true, default: 4 })
  sequencePadding!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
