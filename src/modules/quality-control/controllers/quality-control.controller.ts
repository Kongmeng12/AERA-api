import type { Request, Response } from 'express';
import { requireIdentity } from '../../../shared/guards/authenticate.guard';
import { sendSuccess } from '../../../shared/response/api-response';
import type {
  CreateInspectionDto,
  CreateTestDefinitionDto,
  ListInspectionsQueryDto,
  ListTestDefinitionsQueryDto,
} from '../dto/quality-control.dto';
import type { QualityControlService } from '../services/quality-control.service';

function id(req: Request): number {
  return (req.validated.params as { id: number }).id;
}

export class QualityControlController {
  constructor(private readonly qualityControl: QualityControlService) {}

  listTestDefinitions = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.qualityControl.listTestDefinitions(
        req.validated.query as ListTestDefinitionsQueryDto,
      ),
      'Successfully retrieved QC test definitions',
    );
  };
  createTestDefinition = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.qualityControl.createTestDefinition(req.validated.body as CreateTestDefinitionDto),
      'Successfully created QC test definition',
      201,
    );
  };
  listInspections = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.qualityControl.listInspections(req.validated.query as ListInspectionsQueryDto),
      'Successfully retrieved QC inspections',
    );
  };
  getInspection = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.qualityControl.getInspection(id(req)),
      'Successfully retrieved QC inspection',
    );
  };
  createInspection = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.qualityControl.createInspection(
        req.validated.body as CreateInspectionDto,
        requireIdentity(req).userId,
      ),
      'Successfully recorded QC inspection results',
      201,
    );
  };
  releaseInspection = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.qualityControl.releaseInspection(id(req), requireIdentity(req).userId),
      'Successfully released QC-hold stock',
    );
  };
}
