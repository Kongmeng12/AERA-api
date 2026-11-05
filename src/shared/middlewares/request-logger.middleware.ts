import { randomUUID } from 'node:crypto';
import { pinoHttp } from 'pino-http';
import { logger } from '../logger/logger';

const SAFE_REQUEST_ID = /^[\w-]{1,64}$/;

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const incoming = req.headers['x-request-id'];
    const id =
      typeof incoming === 'string' && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
    res.setHeader('x-request-id', id);
    return id;
  },
  // The query string is excluded from logs because it may contain search terms.
  serializers: {
    req: (req: { id: unknown; method: string; url: string }) => ({
      id: req.id,
      method: req.method,
      path: req.url.split('?')[0],
    }),
    res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
  },
});
