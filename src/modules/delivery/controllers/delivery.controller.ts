import type { Request, Response } from 'express';
import { requireIdentity } from '../../../shared/guards/authenticate.guard';
import { sendSuccess } from '../../../shared/response/api-response';
import type { CreateDeliveryDto, ListDeliveriesQueryDto } from '../dto/delivery.dto';
import type { CompleteDeliveryDto } from '../validators/delivery.validator';
import type { DeliveryService } from '../services/delivery.service';

function requestId(req: Request): number {
  return (req.validated.params as { id: number }).id;
}

export class DeliveryController {
  constructor(private readonly delivery: DeliveryService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.delivery.list(req.validated.query as ListDeliveriesQueryDto),
      'Successfully retrieved deliveries',
    );
  };

  get = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.delivery.get(requestId(req)), 'Successfully retrieved delivery');
  };

  create = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.delivery.create(
        req.validated.body as CreateDeliveryDto,
        requireIdentity(req).userId,
      ),
      'Successfully planned delivery',
      201,
    );
  };

  dispatch = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.delivery.dispatch(requestId(req), requireIdentity(req).userId),
      'Successfully dispatched delivery',
    );
  };

  complete = async (req: Request, res: Response): Promise<void> => {
    const body = req.validated.body as CompleteDeliveryDto;
    sendSuccess(
      res,
      await this.delivery.complete(
        requestId(req),
        body.invoiceNumber,
        body.lines,
        requireIdentity(req).userId,
      ),
      'Successfully completed delivery and issued invoice',
    );
  };
}
