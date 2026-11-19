import type { Request, Response } from 'express';
import { requireIdentity } from '../../../shared/guards/authenticate.guard';
import { sendSuccess } from '../../../shared/response/api-response';
import type {
  ApproveSalesReturnDto,
  CreateSalesReturnDto,
  ListReturnsQueryDto,
  RejectSalesReturnDto,
} from '../dto/returns.dto';
import type { ReturnsService } from '../services/returns.service';

function requestId(req: Request): number {
  return (req.validated.params as { id: number }).id;
}

export class ReturnsController {
  constructor(private readonly returns: ReturnsService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.returns.list(req.validated.query as ListReturnsQueryDto),
      'Successfully retrieved sales returns',
    );
  };

  get = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.returns.get(requestId(req)), 'Successfully retrieved sales return');
  };

  create = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.returns.create(
        req.validated.body as CreateSalesReturnDto,
        requireIdentity(req).userId,
      ),
      'Successfully created sales return request',
      201,
    );
  };

  approve = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.returns.approve(
        requestId(req),
        req.validated.body as ApproveSalesReturnDto,
        requireIdentity(req).userId,
      ),
      'Successfully approved return, recorded returned stock as available, and issued credit note',
    );
  };

  reject = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.returns.reject(requestId(req), req.validated.body as RejectSalesReturnDto),
      'Successfully rejected sales return request',
    );
  };
}
