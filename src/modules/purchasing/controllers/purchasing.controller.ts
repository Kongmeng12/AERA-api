import type { Request, Response } from 'express';
import { requireIdentity } from '../../../shared/guards/authenticate.guard';
import { sendSuccess } from '../../../shared/response/api-response';
import type {
  CreateGoodsReceiptDto,
  CreatePurchaseOrderDto,
  ListGoodsReceiptsQueryDto,
  ListPurchaseOrdersQueryDto,
} from '../dto/purchasing.dto';
import type { PurchasingService } from '../services/purchasing.service';

function requestId(req: Request): number {
  return (req.validated.params as { id: number }).id;
}

export class PurchasingController {
  constructor(private readonly purchasing: PurchasingService) {}

  listPurchaseOrders = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.purchasing.listPurchaseOrders(req.validated.query as ListPurchaseOrdersQueryDto),
      'Successfully retrieved purchase orders',
    );
  };

  getPurchaseOrder = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.purchasing.getPurchaseOrder(requestId(req)),
      'Successfully retrieved purchase order',
    );
  };

  createPurchaseOrder = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.purchasing.createPurchaseOrder(
        req.validated.body as CreatePurchaseOrderDto,
        requireIdentity(req).userId,
      ),
      'Successfully created purchase order',
      201,
    );
  };

  issuePurchaseOrder = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.purchasing.issuePurchaseOrder(requestId(req)),
      'Successfully issued purchase order',
    );
  };

  listGoodsReceipts = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.purchasing.listGoodsReceipts(req.validated.query as ListGoodsReceiptsQueryDto),
      'Successfully retrieved goods receipts',
    );
  };

  getGoodsReceipt = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.purchasing.getGoodsReceipt(requestId(req)),
      'Successfully retrieved goods receipt',
    );
  };

  createGoodsReceipt = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.purchasing.createGoodsReceipt(
        req.validated.body as CreateGoodsReceiptDto,
        requireIdentity(req).userId,
      ),
      'Successfully created goods receipt',
      201,
    );
  };
}
