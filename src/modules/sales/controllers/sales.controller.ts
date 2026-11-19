import type { Request, Response } from 'express';
import { requireIdentity } from '../../../shared/guards/authenticate.guard';
import { sendNoContent, sendSuccess } from '../../../shared/response/api-response';
import type {
  CreatePaymentReceiptDto,
  CreateSalesOrderDto,
  CreateSalesPriceDto,
  ListSalesInvoicesQueryDto,
  ListSalesOrdersQueryDto,
  ListSalesPricesQueryDto,
} from '../dto/sales.dto';
import type { SalesService } from '../services/sales.service';

function requestId(req: Request): number {
  return (req.validated.params as { id: number }).id;
}

export class SalesController {
  constructor(private readonly sales: SalesService) {}

  listOrders = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.sales.listSalesOrders(req.validated.query as ListSalesOrdersQueryDto),
      'Successfully retrieved sales orders',
    );
  };

  getOrder = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.sales.getSalesOrder(requestId(req)),
      'Successfully retrieved sales order',
    );
  };

  createOrder = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.sales.createSalesOrder(
        req.validated.body as CreateSalesOrderDto,
        requireIdentity(req).userId,
      ),
      'Successfully created sales order',
      201,
    );
  };

  approveOrder = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.sales.approveSalesOrder(requestId(req)),
      'Successfully approved sales order and reserved inventory',
    );
  };

  cancelOrder = async (req: Request, res: Response): Promise<void> => {
    const body = req.validated.body as { reason: string };
    const identity = requireIdentity(req);
    await this.sales.cancelSalesOrder(
      requestId(req),
      identity.userId,
      body.reason,
      identity.role === 'admin' || identity.role === 'manager',
    );
    sendNoContent(res);
  };

  listPrices = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.sales.listSalesPrices(req.validated.query as ListSalesPricesQueryDto),
      'Successfully retrieved sales prices',
    );
  };

  createPrice = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.sales.createSalesPrice(req.validated.body as CreateSalesPriceDto),
      'Successfully created sales price',
      201,
    );
  };

  listInvoices = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.sales.listSalesInvoices(req.validated.query as ListSalesInvoicesQueryDto),
      'Successfully retrieved sales invoices',
    );
  };

  getInvoice = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.sales.getSalesInvoice(requestId(req)),
      'Successfully retrieved sales invoice',
    );
  };

  createPaymentReceipt = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.sales.createPaymentReceipt(
        req.validated.body as CreatePaymentReceiptDto,
        requireIdentity(req).userId,
      ),
      'Successfully recorded payment receipt',
      201,
    );
  };
}
