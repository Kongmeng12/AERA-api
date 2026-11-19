import type { Request, Response } from 'express';
import { requireIdentity } from '../../../shared/guards/authenticate.guard';
import { sendSuccess } from '../../../shared/response/api-response';
import type {
  CreateBomDto,
  CreateProductionOrderDto,
  IssueMaterialsDto,
  ListBomsQueryDto,
  ListProductionOrdersQueryDto,
  RecordOutputDto,
} from '../dto/production.dto';
import type { ProductionService } from '../services/production.service';

function id(req: Request): number {
  return (req.validated.params as { id: number }).id;
}

export class ProductionController {
  constructor(private readonly production: ProductionService) {}

  listBoms = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.production.listBoms(req.validated.query as ListBomsQueryDto),
      'Successfully retrieved bills of materials',
    );
  };
  getBom = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.production.getBom(id(req)),
      'Successfully retrieved bill of materials',
    );
  };
  createBom = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.production.createBom(req.validated.body as CreateBomDto),
      'Successfully created bill of materials',
      201,
    );
  };
  activateBom = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.production.activateBom(id(req)),
      'Successfully activated bill of materials',
    );
  };
  listOrders = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.production.listOrders(req.validated.query as ListProductionOrdersQueryDto),
      'Successfully retrieved production orders',
    );
  };
  getOrder = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.production.getOrder(id(req)),
      'Successfully retrieved production order',
    );
  };
  createOrder = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.production.createOrder(req.validated.body as CreateProductionOrderDto),
      'Successfully created production order',
      201,
    );
  };
  issueMaterials = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.production.issueMaterials(
        id(req),
        req.validated.body as IssueMaterialsDto,
        requireIdentity(req).userId,
      ),
      'Successfully issued raw materials',
    );
  };
  recordOutput = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.production.recordOutput(
        id(req),
        req.validated.body as RecordOutputDto,
        requireIdentity(req).userId,
      ),
      'Successfully recorded production output as available stock',
      201,
    );
  };
}
