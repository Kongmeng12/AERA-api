import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { SoftDeletableEntity } from '../../../core/database/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('employees')
@Index('UQ_employees_code', ['employeeCode'], { unique: true })
@Index('IDX_employees_status_type', ['status', 'employeeType'])
export class Employee extends SoftDeletableEntity {
  @Column({ name: 'employee_code', type: 'varchar', length: 50 })
  employeeCode!: string;

  @Column({ name: 'user_id', type: 'int', unsigned: true, nullable: true })
  userId!: number | null;

  @OneToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_employees_user' })
  user!: User | null;

  @Column({ name: 'display_name', type: 'varchar', length: 150 })
  displayName!: string;

  @Column({ name: 'phone_number', type: 'varchar', length: 30, nullable: true })
  phoneNumber!: string | null;

  @Column({ name: 'employee_type', type: 'varchar', length: 30 })
  employeeType!: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: string;
}
