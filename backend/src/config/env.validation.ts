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
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),

  // Optional services - validated if present
  REDIS_URL: Joi.string().uri().optional().allow(''),
  SENTRY_DSN: Joi.string().uri().optional().allow(''),

  // Stripe
  STRIPE_SECRET_KEY: Joi.string().optional().allow(''),
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

  // Seed
  RUN_SEED: Joi.string().valid('true', 'false').default('false'),
}).unknown(true);
