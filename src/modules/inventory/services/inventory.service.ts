import { toPaginatedResult } from '../../../shared/helpers/pagination';
import type { PaginatedResult } from '../../../shared/response/api-response';
import {
  toInventoryBalanceResponse,
  toStockBatchResponse,
  toStockMovementResponse,
  type InventoryBalanceResponseDto,
  type ListInventoryBalancesQueryDto,
  type ListStockBatchesQueryDto,
  type ListStockMovementsQueryDto,
  type StockBatchResponseDto,
  type StockMovementResponseDto,
} from '../dto/inventory.dto';
import type { InventoryRepository } from '../repositories/inventory.repository';

export class InventoryService {
  constructor(private readonly repository: InventoryRepository) {}

  async listBalances(
    query: ListInventoryBalancesQueryDto,
  ): Promise<PaginatedResult<InventoryBalanceResponseDto>> {
    const [rows, total] = await this.repository.findBalances(query);
    return toPaginatedResult(rows.map(toInventoryBalanceResponse), total, query.page, query.limit);
  }

  async listBatches(
    query: ListStockBatchesQueryDto,
  ): Promise<PaginatedResult<StockBatchResponseDto>> {
    const [rows, total] = await this.repository.findBatches(query);
    return toPaginatedResult(rows.map(toStockBatchResponse), total, query.page, query.limit);
  }

  async listMovements(
    query: ListStockMovementsQueryDto,
  ): Promise<PaginatedResult<StockMovementResponseDto>> {
    const [rows, total] = await this.repository.findMovements(query);
    return toPaginatedResult(rows.map(toStockMovementResponse), total, query.page, query.limit);
  }
}
