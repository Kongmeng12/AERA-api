import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../../core/exceptions/app-error';
import { ERROR_CODES } from '../../../shared/constants/error-codes';
import { requireIdentity } from '../../../shared/guards/authenticate.guard';
import { sendSuccess } from '../../../shared/response/api-response';
import type { UserResponseDto } from '../../users/dto/user-response.dto';
import type { ChangePasswordDto, LoginDto, LogoutDto, RefreshDto } from '../dto/auth-request.dto';
import type { ClientMetadata } from '../interfaces/auth.interface';
import type { AuthService } from '../services/auth.service';

const USER_AGENT_MAX_LENGTH = 255;

function clientMetadata(req: Request): ClientMetadata {
  return {
    userAgent: req.get('user-agent')?.slice(0, USER_AGENT_MAX_LENGTH) ?? null,
    ipAddress: req.ip ?? null,
  };
}

export interface CurrentUserReader {
  getById(id: number): Promise<UserResponseDto>;
}

export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: CurrentUserReader,
  ) {}

  login = async (req: Request, res: Response): Promise<void> => {
    const tokens = await this.auth.login(req.validated.body as LoginDto, clientMetadata(req));
    sendSuccess(res, tokens, 'Successfully logged in');
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.validated.body as RefreshDto;
    const tokens = await this.auth.refresh(refreshToken, clientMetadata(req));
    sendSuccess(res, tokens, 'Successfully refreshed tokens');
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    await this.auth.logout((req.validated.body as LogoutDto).refreshToken);
    sendSuccess(res, null, 'Successfully logged out');
  };

  me = async (req: Request, res: Response): Promise<void> => {
    const { userId } = requireIdentity(req);
    const user = await this.users.getById(userId).catch(() => {
      throw new UnauthorizedError(ERROR_CODES.AUTH_UNAUTHORIZED, 'Account is no longer available');
    });
    sendSuccess(res, user, 'Successfully retrieved current user');
  };

  changePassword = async (req: Request, res: Response): Promise<void> => {
    await this.auth.changePassword(
      requireIdentity(req).userId,
      req.validated.body as ChangePasswordDto,
    );
    sendSuccess(res, null, 'Successfully changed password. Please log in again.');
  };
}
