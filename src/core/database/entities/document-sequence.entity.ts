import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DocumentNumberFormat } from './document-number-format.entity';

@Entity('document_sequences')
@Index('UQ_document_sequences_key_year', ['key', 'year'], { unique: true })
export class DocumentSequence {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ type: 'varchar', length: 50 })
  key!: string;

  @ManyToOne(() => DocumentNumberFormat, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'key',
    referencedColumnName: 'code',
    foreignKeyConstraintName: 'FK_document_sequences_format',
  })
  format!: DocumentNumberFormat;

  @Column({ type: 'varchar', length: 50, nullable: true })
  prefix!: string | null;

  @Column({ type: 'int', unsigned: true, default: 0 })
  value!: number;

  @Column({ type: 'char', length: 4 })
  year!: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime', precision: 6 })
  updatedAt!: Date;
}
