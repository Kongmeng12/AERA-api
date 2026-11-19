import { Column, Entity, Index } from 'typeorm';
import { SoftDeletableEntity } from './base.entity';

@Entity('document_templates')
@Index('UQ_document_templates_type_locale_version', ['documentType', 'locale', 'version'], {
  unique: true,
})
@Index('IDX_document_templates_type_locale_active', ['documentType', 'locale', 'isActive'])
export class DocumentTemplate extends SoftDeletableEntity {
  @Column({ name: 'document_type', type: 'varchar', length: 50 })
  documentType!: string;

  @Column({ type: 'varchar', length: 10 })
  locale!: string;

  @Column({ type: 'int', unsigned: true })
  version!: number;

  @Column({ name: 'template_uri', type: 'varchar', length: 500 })
  templateUri!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
