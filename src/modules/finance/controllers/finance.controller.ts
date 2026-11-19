import type { Request, Response } from 'express';
import { requireIdentity } from '../../../shared/guards/authenticate.guard';
import { sendSuccess } from '../../../shared/response/api-response';
import type {
  CreateSupplierBillDto,
  CreateSupplierPaymentDto,
  ListSupplierBillsQueryDto,
} from '../dto/finance.dto';
import type { FinanceService } from '../services/finance.service';

function requestId(req: Request): number {
  return (req.validated.params as { id: number }).id;
}

export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  listSupplierBills = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.finance.listSupplierBills(req.validated.query as ListSupplierBillsQueryDto),
      'Successfully retrieved supplier bills',
    );
  };

  getSupplierBill = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.finance.getSupplierBill(requestId(req)),
      'Successfully retrieved supplier bill',
    );
  };

  createSupplierBill = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.finance.createSupplierBill(
        req.validated.body as CreateSupplierBillDto,
        requireIdentity(req).userId,
      ),
      'Successfully created supplier bill draft',
      201,
    );
  };

  postSupplierBill = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.finance.postSupplierBill(requestId(req)),
      'Successfully posted supplier bill',
    );
  };

  createSupplierPayment = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.finance.createSupplierPayment(
        req.validated.body as CreateSupplierPaymentDto,
        requireIdentity(req).userId,
      ),
      'Successfully recorded supplier payment receipt',
      201,
    );
  };
}
