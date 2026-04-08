import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Required
  DATABASE_URL: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'JWT_SECRET debe tener al menos 32 caracteres en producción',
    'any.required': 'JWT_SECRET es obligatorio',
  }),

  // Server
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3001),

  // Frontend URL (required for CORS and emails)
  FRONTEND_URL: Joi.string()
    .uri()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().uri().required().messages({
        'any.required': 'FRONTEND_URL es obligatorio en producción',
      }),
      otherwise: Joi.string().uri().default('http://localhost:3000'),
    }),

  // CORS - required in production
  ALLOWED_ORIGINS: Joi.string()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().required().messages({
        'any.required':
          'ALLOWED_ORIGINS es obligatorio en produccion (lista de origenes separados por coma)',
      }),
      otherwise: Joi.string()
        .optional()
        .default('http://localhost:3000'),
    }),

  // Optional services - validated if present
  REDIS_URL: Joi.string().uri().optional().allow(''),
  SENTRY_DSN: Joi.string().uri().optional().allow(''),

  // Stripe
  STRIPE_SECRET_KEY: Joi.string().required().messages({
    'any.required': 'STRIPE_SECRET_KEY es obligatorio para procesar pagos',
  }),
  STRIPE_WEBHOOK_SECRET: Joi.string().optional().allow(''),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: Joi.string().optional().allow(''),
  CLOUDINARY_API_KEY: Joi.string().optional().allow(''),
  CLOUDINARY_API_SECRET: Joi.string().optional().allow(''),

  // Email
  RESEND_API_KEY: Joi.string().optional().allow(''),
  RESEND_FROM_EMAIL: Joi.string().optional().allow(''),

  // Google OAuth
  GOOGLE_CLIENT_ID: Joi.string().optional().allow(''),
  GOOGLE_CLIENT_SECRET: Joi.string().optional().allow(''),
  GOOGLE_CALLBACK_URL: Joi.string().uri().optional().allow(''),

  // Captcha
  HCAPTCHA_SECRET_KEY: Joi.string().optional().allow(''),

  // Seed - blocked in production
  RUN_SEED: Joi.string()
    .valid('true', 'false')
    .default('false')
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().invalid('true').messages({
        'any.invalid': 'RUN_SEED=true is not allowed in production',
      }),
    }),
}).unknown(true);
