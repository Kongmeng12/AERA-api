import type { Request, Response } from 'express';
import { sendSuccess } from '../../../shared/response/api-response';
import type { InventoryService } from '../services/inventory.service';
import type {
  ListInventoryBalancesQueryDto,
  ListStockBatchesQueryDto,
  ListStockMovementsQueryDto,
} from '../dto/inventory.dto';

export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  listBalances = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.inventory.listBalances(req.validated.query as ListInventoryBalancesQueryDto),
      'Successfully retrieved inventory balances',
    );
  };

  listBatches = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.inventory.listBatches(req.validated.query as ListStockBatchesQueryDto),
      'Successfully retrieved stock batches',
    );
  };

  listMovements = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.inventory.listMovements(req.validated.query as ListStockMovementsQueryDto),
      'Successfully retrieved stock movements',
    );
  };
}
