import type { Request, Response } from 'express';
import { sendSuccess } from '../../../shared/response/api-response';
import type { RolesService } from '../services/roles.service';

export class RolesController {
  constructor(private readonly roles: RolesService) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.roles.list(), 'Successfully retrieved roles');
  };
}
