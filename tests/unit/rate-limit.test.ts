import express from 'express';
import request from 'supertest';
import { errorHandler } from '../../src/shared/middlewares/error.middleware';
import { createRateLimiter } from '../../src/shared/middlewares/rate-limit.middleware';

describe('createRateLimiter', () => {
  it('returns a standard 429 error after the limit', async () => {
    const app = express();
    app.use(createRateLimiter(2, 60_000));
    app.get('/', (_req, res) => {
      res.send('ok');
    });
    app.use(errorHandler);

    await request(app).get('/').expect(200);
    await request(app).get('/').expect(200);
    const blocked = await request(app).get('/').expect(429);
    expect(blocked.body).toMatchObject({ success: false, code: 'RATE_LIMITED' });
  });
});
