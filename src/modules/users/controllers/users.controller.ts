import type { Request, Response } from 'express';
import { requireIdentity } from '../../../shared/guards/authenticate.guard';
import { sendNoContent, sendSuccess } from '../../../shared/response/api-response';
import type { CreateUserDto } from '../dto/create-user.dto';
import type { ListUsersQueryDto } from '../dto/list-users-query.dto';
import type { UpdateUserDto } from '../dto/update-user.dto';
import type { UsersService } from '../services/users.service';

function userId(req: Request): number {
  return (req.validated.params as { id: number }).id;
}

export class UsersController {
  constructor(private readonly users: UsersService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const page = await this.users.list(req.validated.query as ListUsersQueryDto);
    sendSuccess(res, page, 'Successfully retrieved users');
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.users.getById(userId(req)), 'Successfully retrieved user');
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const user = await this.users.create(req.validated.body as CreateUserDto);
    sendSuccess(res, user, 'Successfully created user', 201);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const user = await this.users.update(
      userId(req),
      req.validated.body as UpdateUserDto,
      requireIdentity(req).userId,
    );
    sendSuccess(res, user, 'Successfully updated user');
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.users.remove(userId(req), requireIdentity(req).userId);
    sendNoContent(res);
  };
}
