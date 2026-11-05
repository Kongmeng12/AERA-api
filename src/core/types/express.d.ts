import type { RoleName } from '../../shared/constants/roles';

declare global {
  namespace Express {
    interface Request {
      /** Identity from a verified access token; set by the authenticate guard. */
      auth?: { userId: number; role: RoleName };
      /** Parsed values from the validate middleware (Express 5 `req.query` is read-only). */
      validated: { body?: unknown; query?: unknown; params?: unknown };
    }
  }
}
