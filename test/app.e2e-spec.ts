import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/common/setup/configure-app.js';

describe('Common (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health reports database and storage as ok', async () => {
    const response = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(response.body).toEqual({ status: 'ok', db: 'ok', storage: 'ok' });
  });

  it('GET /api/no-such-route returns NOT_FOUND body', async () => {
    const response = await request(app.getHttpServer()).get('/api/no-such-route').expect(404);
    expect(response.body).toMatchObject({
      code: 'NOT_FOUND',
      message: expect.any(String),
      details: null,
    });
  });
});
