import type { Request, Response } from 'express';
import { requireIdentity } from '../../../shared/guards/authenticate.guard';
import { sendSuccess } from '../../../shared/response/api-response';
import type {
  CreateStockCountDto,
  CreateStockTransferDto,
  CreateStockWriteoffDto,
  ListStockCountsQueryDto,
  ListStockTransfersQueryDto,
  ListStockWriteoffsQueryDto,
  ReceiveStockTransferDto,
  RejectStockWriteoffDto,
} from '../dto/stock-operations.dto';
import type { StockOperationsService } from '../services/stock-operations.service';

function requestId(req: Request): number {
  return (req.validated.params as { id: number }).id;
}

export class StockOperationsController {
  constructor(private readonly operations: StockOperationsService) {}

  listTransfers = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.operations.listTransfers(req.validated.query as ListStockTransfersQueryDto),
      'Successfully retrieved stock transfers',
    );
  };

  getTransfer = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.operations.getTransfer(requestId(req)),
      'Successfully retrieved stock transfer',
    );
  };

  createTransfer = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.operations.createTransfer(
        req.validated.body as CreateStockTransferDto,
        requireIdentity(req).userId,
      ),
      'Successfully created stock transfer',
      201,
    );
  };

  dispatchTransfer = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.operations.dispatchTransfer(requestId(req), requireIdentity(req).userId),
      'Successfully dispatched stock transfer',
    );
  };

  receiveTransfer = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.operations.receiveTransfer(
        requestId(req),
        req.validated.body as ReceiveStockTransferDto,
        requireIdentity(req).userId,
      ),
      'Successfully received stock transfer quantities',
    );
  };

  listCounts = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.operations.listCounts(req.validated.query as ListStockCountsQueryDto),
      'Successfully retrieved stock counts',
    );
  };

  getCount = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.operations.getCount(requestId(req)),
      'Successfully retrieved stock count',
    );
  };

  createCount = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.operations.createCount(
        req.validated.body as CreateStockCountDto,
        requireIdentity(req).userId,
      ),
      'Successfully recorded stock count for approval',
      201,
    );
  };

  approveCount = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.operations.approveCount(requestId(req), requireIdentity(req).userId),
      'Successfully approved stock count and applied adjustments',
    );
  };

  listWriteoffs = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.operations.listWriteoffs(req.validated.query as ListStockWriteoffsQueryDto),
      'Successfully retrieved stock write-offs',
    );
  };

  getWriteoff = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.operations.getWriteoff(requestId(req)),
      'Successfully retrieved stock write-off',
    );
  };

  createWriteoff = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.operations.createWriteoff(
        req.validated.body as CreateStockWriteoffDto,
        requireIdentity(req).userId,
      ),
      'Successfully submitted stock write-off for approval',
      201,
    );
  };

  approveWriteoff = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.operations.approveWriteoff(requestId(req), requireIdentity(req).userId),
      'Successfully approved stock write-off',
    );
  };

  rejectWriteoff = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.operations.rejectWriteoff(
        requestId(req),
        req.validated.body as RejectStockWriteoffDto,
      ),
      'Successfully rejected stock write-off',
    );
  };
}
