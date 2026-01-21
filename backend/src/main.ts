import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { SanitizePipe } from './common/pipes/sanitize.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet());

  // Compression (gzip)
  app.use(compression());

  // Enable CORS - allow all origins for now
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

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
  console.log(`🚀 Backend running on http://localhost:${port}`);
  console.log(`📚 API Documentation available at http://localhost:${port}/api/docs`);
}
void bootstrap();
