import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

interface HealthResponse {
  status: string;
  timestamp: string;
  checks: {
    database: unknown;
  };
}

interface ExperiencesResponse {
  data: unknown[];
  meta: unknown;
}

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Root', () => {
    it('/api (GET) should return Hello World', () => {
      return request(app.getHttpServer())
        .get('/api')
        .expect(200)
        .expect('Hello World!');
    });
  });

  describe('Health Checks', () => {
    it('/api/health (GET) should return health status', () => {
      return request(app.getHttpServer())
        .get('/api/health')
        .expect(200)
        .expect((res) => {
          const body = res.body as HealthResponse;
          expect(body).toHaveProperty('status');
          expect(body).toHaveProperty('timestamp');
          expect(body).toHaveProperty('checks');
          expect(body.checks).toHaveProperty('database');
        });
    });

    it('/api/health/live (GET) should return liveness', () => {
      return request(app.getHttpServer())
        .get('/api/health/live')
        .expect(200)
        .expect((res) => {
          const body = res.body as { status: string };
          expect(body.status).toBe('ok');
        });
    });

    it('/api/health/ready (GET) should return readiness', () => {
      return request(app.getHttpServer())
        .get('/api/health/ready')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('ready');
        });
    });
  });

  describe('Auth Endpoints', () => {
    // Test user data for future use in registration tests
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _testUser = {
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      name: 'Test User',
    };

    it('/api/auth/register (POST) should validate input', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'invalid-email' })
        .expect(400);
    });

    it('/api/auth/login (POST) should reject invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('/api/auth/me (GET) should require authentication', () => {
      return request(app.getHttpServer()).get('/api/auth/me').expect(401);
    });
  });

  describe('Festivals Endpoints', () => {
    it('/api/festivals (GET) should return festivals list', () => {
      return request(app.getHttpServer())
        .get('/api/festivals')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('Experiences Endpoints', () => {
    it('/api/experiences (GET) should return experiences list', () => {
      return request(app.getHttpServer())
        .get('/api/experiences')
        .expect(200)
        .expect((res) => {
          const body = res.body as ExperiencesResponse;
          expect(body).toHaveProperty('data');
          expect(body).toHaveProperty('meta');
          expect(Array.isArray(body.data)).toBe(true);
        });
    });

    it('/api/experiences/cities (GET) should return cities list', () => {
      return request(app.getHttpServer())
        .get('/api/experiences/cities')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('/api/experiences/:id (GET) should return 404 for non-existent', () => {
      return request(app.getHttpServer())
        .get('/api/experiences/non-existent-id')
        .expect(404);
    });
  });
});
