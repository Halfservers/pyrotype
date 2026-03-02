import { describe, it, expect } from 'vitest';
import express, { type Request, type Response } from 'express';
import supertest from 'supertest';
import { z } from 'zod';
import { validate } from '../../src/middleware/validate';
import { errorHandler } from '../../src/middleware/errorHandler';

function createApp(schemas: Parameters<typeof validate>[0], method: 'get' | 'post' = 'post') {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  if (method === 'post') {
    app.post('/test', validate(schemas), (req: Request, res: Response) => {
      res.json({ ok: true, body: req.body, query: req.query, params: req.params });
    });
  }

  if (method === 'get') {
    app.get('/test', validate(schemas), (req: Request, res: Response) => {
      res.json({ ok: true, body: req.body, query: req.query, params: req.params });
    });
  }

  // Route with params
  app.get(
    '/items/:id',
    validate(schemas),
    (req: Request, res: Response) => {
      res.json({ ok: true, params: req.params });
    },
  );

  app.use(errorHandler);
  return app;
}

describe('validate middleware', () => {
  describe('body validation', () => {
    const bodySchema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      age: z.number().int().min(0).optional(),
    });

    it('should pass with valid body', async () => {
      const app = createApp({ body: bodySchema });
      const res = await supertest(app)
        .post('/test')
        .send({ name: 'John', email: 'john@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.body).toMatchObject({ name: 'John', email: 'john@example.com' });
    });

    it('should reject invalid body (422 with Zod details)', async () => {
      const app = createApp({ body: bodySchema });
      const res = await supertest(app)
        .post('/test')
        .send({ name: '', email: 'not-an-email' });

      expect(res.status).toBe(422);
      expect(res.body.errors[0].code).toBe('ValidationError');
      expect(res.body.errors[0].detail).toBe('Validation failed');
    });

    it('should reject when required fields are missing', async () => {
      const app = createApp({ body: bodySchema });
      const res = await supertest(app).post('/test').send({});

      expect(res.status).toBe(422);
    });

    it('should strip unknown fields via Zod parse', async () => {
      const strictSchema = z.object({ name: z.string() }).strict();
      const app = createApp({ body: strictSchema });
      const res = await supertest(app)
        .post('/test')
        .send({ name: 'John', extraField: 'hack' });

      expect(res.status).toBe(422);
    });
  });

  describe('query validation', () => {
    const querySchema = z.object({
      page: z.string().regex(/^\d+$/),
      limit: z.string().regex(/^\d+$/).optional(),
    }).passthrough();

    it('should pass with valid query params', async () => {
      const app = createApp({ query: querySchema }, 'get');
      const res = await supertest(app).get('/test?page=1&limit=10');

      expect(res.status).toBe(200);
      expect(res.body.query).toMatchObject({ page: '1', limit: '10' });
    });

    it('should reject invalid query params', async () => {
      const app = createApp({ query: querySchema }, 'get');
      const res = await supertest(app).get('/test?page=abc');

      expect(res.status).toBe(422);
    });
  });

  describe('params validation', () => {
    const paramsSchema = z.object({
      id: z.string().regex(/^\d+$/),
    });

    it('should pass with valid route params', async () => {
      const app = createApp({ params: paramsSchema });
      const res = await supertest(app).get('/items/123');

      expect(res.status).toBe(200);
      expect(res.body.params).toMatchObject({ id: '123' });
    });

    it('should reject invalid route params', async () => {
      const app = createApp({ params: paramsSchema });
      const res = await supertest(app).get('/items/abc');

      expect(res.status).toBe(422);
    });
  });

  describe('combined validation', () => {
    it('should validate body and query together', async () => {
      const bodySchema = z.object({ name: z.string() });
      const querySchema = z.object({ sort: z.string().optional() }).passthrough();

      const app = express();
      app.use(express.json());
      app.post(
        '/test',
        validate({ body: bodySchema, query: querySchema }),
        (req: Request, res: Response) => {
          res.json({ ok: true, body: req.body, query: req.query });
        },
      );
      app.use(errorHandler);

      const res = await supertest(app)
        .post('/test?sort=name')
        .send({ name: 'Alice' });

      expect(res.status).toBe(200);
    });
  });
});
