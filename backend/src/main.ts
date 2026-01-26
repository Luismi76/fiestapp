import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { SanitizePipe } from './common/pipes/sanitize.pipe';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Allowed origins from environment or defaults
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3000', 'http://localhost:3001'];

  // RAW CORS middleware - handles preflight BEFORE anything else
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    // Validate origin against whitelist
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
      // Allow requests without origin (e.g., mobile apps, Postman)
      res.header('Access-Control-Allow-Origin', allowedOrigins[0]);
    }

    res.header('Access-Control-Allow-Credentials', 'true');
    res.header(
      'Access-Control-Allow-Methods',
      'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    );
    res.header(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, Accept, X-Requested-With',
    );
    res.header(
      'Access-Control-Expose-Headers',
      'Content-Range, X-Content-Range',
    );

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    next();
  });

  // Security headers (after CORS)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    }),
  );

  // Compression (gzip)
  app.use(compression());

  // Global pipes: sanitize inputs and validate
  app.useGlobalPipes(
    new SanitizePipe(),
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('FiestApp API')
    .setDescription(
      'API del marketplace peer-to-peer de experiencias en fiestas populares españolas. ' +
        'Conecta viajeros con anfitriones locales para vivir la cultura festiva auténtica.',
    )
    .setVersion('1.0')
    .addTag('auth', 'Autenticación y gestión de usuarios')
    .addTag('users', 'Perfiles de usuario')
    .addTag('festivals', 'Catálogo de festivales')
    .addTag('experiences', 'Experiencias ofrecidas por anfitriones')
    .addTag('matches', 'Solicitudes y conexiones')
    .addTag('reviews', 'Reseñas y valoraciones')
    .addTag('wallet', 'Monedero y transacciones')
    .addTag('favorites', 'Experiencias favoritas')
    .addTag('notifications', 'Notificaciones')
    .addTag('admin', 'Panel de administración')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Introduce tu token JWT',
      },
      'JWT',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'FiestApp API Documentation',
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`🚀 Backend running on http://localhost:${port}`);
  logger.log(
    `📚 API Documentation available at http://localhost:${port}/api/docs`,
  );
}
void bootstrap();
