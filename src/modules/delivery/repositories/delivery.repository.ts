import type {
  DataSource,
  DeepPartial,
  EntityManager,
  EntityTarget,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { DeliveryRoute, Vehicle } from '../../master-data/entities/delivery-setup.entity';
import { Employee } from '../../master-data/entities/employee.entity';
import { InventoryReservation } from '../../inventory/entities/inventory-reservation.entity';
import { Delivery, DeliveryLine, DeliveryOrder } from '../entities/delivery.entity';
import type { ListDeliveriesQueryDto } from '../dto/delivery.dto';

export class DeliveryRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly manager?: EntityManager,
  ) {}

  transaction<T>(
    operation: (repository: DeliveryRepository, manager: EntityManager) => Promise<T>,
  ) {
    return this.dataSource.transaction((manager) =>
      operation(new DeliveryRepository(this.dataSource, manager), manager),
    );
  }

  findDeliveries(query: ListDeliveriesQueryDto) {
    const builder = this.repo(Delivery).createQueryBuilder('delivery');
    if (query.status) {
      builder.andWhere('delivery.status = :status', { status: query.status });
    }
    if (query.driverId !== undefined) {
      builder.andWhere('delivery.driverId = :driverId', { driverId: query.driverId });
    }
    if (query.salesOrderId !== undefined) {
      builder
        .innerJoin(DeliveryOrder, 'deliveryOrder', 'deliveryOrder.deliveryId = delivery.id')
        .andWhere('deliveryOrder.salesOrderId = :salesOrderId', {
          salesOrderId: query.salesOrderId,
        });
    }
    return builder
      .distinct(true)
      .orderBy('delivery.plannedAt', 'DESC')
      .addOrderBy('delivery.id', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
  }

  findDelivery(id: number) {
    return this.repo(Delivery).findOne({ where: { id } });
  }

  findDeliveryForUpdate(id: number) {
    return this.lockedQuery(Delivery, 'delivery').where('delivery.id = :id', { id }).getOne();
  }

  findDeliveryOrders(deliveryIds: number[]) {
    if (deliveryIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.repo(DeliveryOrder)
      .createQueryBuilder('deliveryOrder')
      .where('deliveryOrder.deliveryId IN (:...deliveryIds)', { deliveryIds })
      .getMany();
  }

  findDeliveryOrderForUpdate(deliveryId: number) {
    return this.lockedQuery(DeliveryOrder, 'deliveryOrder')
      .where('deliveryOrder.deliveryId = :deliveryId', { deliveryId })
      .getOne();
  }

  findDeliveryLines(deliveryOrderIds: number[]) {
    if (deliveryOrderIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.repo(DeliveryLine)
      .createQueryBuilder('line')
      .where('line.deliveryOrderId IN (:...deliveryOrderIds)', { deliveryOrderIds })
      .orderBy('line.deliveryOrderId', 'ASC')
      .addOrderBy('line.lineNumber', 'ASC')
      .getMany();
  }

  findDeliveryLinesForUpdate(deliveryOrderId: number) {
    return this.lockedQuery(DeliveryLine, 'line')
      .where('line.deliveryOrderId = :deliveryOrderId', { deliveryOrderId })
      .orderBy('line.id', 'ASC')
      .getMany();
  }

  findRoute(id: number) {
    return this.repo(DeliveryRoute).findOne({ where: { id, status: 'active' } });
  }

  findVehicle(id: number) {
    return this.repo(Vehicle).findOne({ where: { id, status: 'active' } });
  }

  findDriver(id: number) {
    return this.repo(Employee).findOne({
      where: { id, status: 'active', employeeType: 'driver' },
    });
  }

  findReservedQuantity(salesOrderLineId: number) {
    return this.repo(InventoryReservation)
      .createQueryBuilder('reservation')
      .select('COALESCE(SUM(reservation.quantity), 0)', 'quantity')
      .where('reservation.salesOrderLineId = :salesOrderLineId', { salesOrderLineId })
      .andWhere('reservation.status = :status', { status: 'reserved' })
      .getRawOne<{ quantity: string }>();
  }

  findQuantityPlannedForDispatch(salesOrderLineId: number) {
    return this.repo(DeliveryLine)
      .createQueryBuilder('line')
      .select('COALESCE(SUM(line.plannedQuantity), 0)', 'quantity')
      .innerJoin(DeliveryOrder, 'deliveryOrder', 'deliveryOrder.id = line.deliveryOrderId')
      .innerJoin(Delivery, 'delivery', 'delivery.id = deliveryOrder.deliveryId')
      .where('line.salesOrderLineId = :salesOrderLineId', { salesOrderLineId })
      .andWhere('delivery.status = :status', { status: 'planned' })
      .getRawOne<{ quantity: string }>();
  }

  createDelivery(data: DeepPartial<Delivery>) {
    const repository = this.repo(Delivery);
    return repository.save(repository.create(data));
  }

  createDeliveryOrder(data: DeepPartial<DeliveryOrder>) {
    const repository = this.repo(DeliveryOrder);
    return repository.save(repository.create(data));
  }

  createDeliveryLines(data: DeepPartial<DeliveryLine>[]) {
    const repository = this.repo(DeliveryLine);
    return repository.save(data.map((line) => repository.create(line)));
  }

  updateDeliveryStatus(id: number, data: Pick<Delivery, 'status' | 'departedAt' | 'completedAt'>) {
    return this.repo(Delivery).update({ id }, data);
  }

  updateDeliveryLine(
    id: number,
    data: Pick<DeliveryLine, 'loadedQuantity' | 'deliveredQuantity' | 'returnedQuantity'>,
  ) {
    return this.repo(DeliveryLine).update({ id }, data);
  }

  withManager(manager: EntityManager) {
    return new DeliveryRepository(this.dataSource, manager);
  }

  private repo<T extends ObjectLiteral>(entity: EntityTarget<T>): Repository<T> {
    return this.manager
      ? this.manager.getRepository(entity)
      : this.dataSource.getRepository(entity);
  }

  private lockedQuery<T extends ObjectLiteral>(entity: EntityTarget<T>, alias: string) {
    if (!this.manager) {
      throw new Error('Locked reads must run inside a transaction');
    }
    return this.manager
      .getRepository(entity)
      .createQueryBuilder(alias)
      .setLock('pessimistic_write');
  }
}
