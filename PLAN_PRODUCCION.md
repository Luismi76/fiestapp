# Plan Maestro de Mejoras para Produccion - FiestApp

**Fecha**: 2026-04-08
**Estado**: COMPLETADO
**Excluido**: Todo lo relacionado con pagos (pendiente de decision del cliente)

---

## FASE 1: CRITICOS DE SEGURIDAD (Bloquean produccion)

### 1.1 Arreglar CORS del WebSocket
- **Archivo**: `backend/src/chat/chat.gateway.ts:33-37`
- **Problema**: `origin: '*'` con `credentials: true` permite cualquier origen
- **Solucion**: Usar `process.env.ALLOWED_ORIGINS` como whitelist, igual que en main.ts
- **Estado**: [x] HECHO

### 1.2 Validar ALLOWED_ORIGINS como obligatorio en produccion
- **Archivo**: `backend/src/config/env.validation.ts`
- **Problema**: ALLOWED_ORIGINS no esta en el schema de validacion; si falta en prod, la app arranca pero CORS bloquea todo
- **Solucion**: Anadir ALLOWED_ORIGINS al schema Joi como required en produccion
- **Estado**: [x] HECHO

### 1.3 Hacer que la app falle al arrancar si falta ALLOWED_ORIGINS en prod
- **Archivo**: `backend/src/main.ts:24-29`
- **Problema**: Solo muestra un logger.error pero continua ejecutando
- **Solucion**: Lanzar error y abortar el arranque si NODE_ENV=production y no hay ALLOWED_ORIGINS
- **Estado**: [x] HECHO

### 1.4 Eliminar secretos por defecto del docker-compose.yml
- **Archivo**: `docker-compose.yml:66,74-77`
- **Problema**: JWT_SECRET y credenciales Redsys con valores por defecto inseguros
- **Solucion**: Quitar defaults de secretos sensibles, dejar solo la variable de entorno sin fallback
- **Estado**: [x] HECHO

### 1.5 Endurecer CSP en frontend
- **Archivo**: `frontend/next.config.ts:50-63`
- **Problema**: `unsafe-inline` y `unsafe-eval` en script-src; img-src acepta http:; connect-src con wss: sin host; frame-src con Redsys innecesario
- **Solucion**: Eliminar unsafe-eval, restringir img-src a dominios conocidos, acotar wss: al dominio de la API, limpiar frame-src
- **Estado**: [x] HECHO

### 1.6 Restringir hostnames de imagenes externas
- **Archivo**: `frontend/next.config.ts:8-22`
- **Problema**: `hostname: '**'` permite cargar imagenes de CUALQUIER dominio
- **Solucion**: Limitar a dominios conocidos: res.cloudinary.com, lh3.googleusercontent.com, fiestapp-api.lmsc.es
- **Estado**: [x] HECHO

---

## FASE 2: SEGURIDAD ALTA (Antes de lanzar)

### 2.1 Reducir expiracion JWT de 7d a 1h + implementar refresh token
- **Archivos**: `backend/src/auth/auth.module.ts:23`, `backend/src/auth/auth.controller.ts:49-57`, `backend/src/auth/auth.service.ts`
- **Problema**: JWT de 7 dias sin refresh; si se compromete un token, queda activo una semana
- **Solucion**: Access token 1h, refresh token 7d en cookie httpOnly separada, endpoint POST /auth/refresh
- **Estado**: [x] HECHO

### 2.2 Fortalecer rate limiting en login
- **Archivo**: `backend/src/auth/auth.controller.ts:88-92` (y login similar)
- **Problema**: Registro: 5 req/min, Login similar - permite fuerza bruta
- **Solucion**: Login: max 5 intentos/min, 15 intentos/hora. Registro: 3 req/min, 10/hora
- **Estado**: [x] HECHO

### 2.3 No revelar existencia de email en mensajes de error
- **Archivo**: `backend/src/auth/auth.service.ts`
- **Problema**: Mensajes como "Email already exists" revelan si un email esta registrado
- **Solucion**: Devolver mensaje generico "Credenciales invalidas" en login; en registro, "Si el email no esta registrado, recibiras un correo de verificacion"
- **Estado**: [x] HECHO

### 2.4 Interceptor 401 en axios del frontend
- **Archivo**: `frontend/src/lib/api.ts:47-53`
- **Problema**: No hay interceptor de respuesta; si el token expira, no redirige a login
- **Solucion**: Anadir response interceptor que en 401 intente refresh, y si falla, limpie auth y redirija a /login
- **Estado**: [x] HECHO

### 2.5 Timeout en axios
- **Archivo**: `frontend/src/lib/api.ts:47-53`
- **Problema**: Sin timeout configurado; las peticiones pueden colgar indefinidamente
- **Solucion**: Anadir `timeout: 15000` (15s) a la config de axios
- **Estado**: [x] HECHO

### 2.6 Limpiar localStorage residual de tokens
- **Archivo**: `frontend/src/contexts/AuthContext.tsx`
- **Problema**: Logica residual de localStorage.removeItem('token') cuando ya se usan httpOnly cookies
- **Solucion**: Eliminar toda referencia a localStorage para tokens
- **Estado**: [x] HECHO

### 2.7 Proteger endpoint de health detallado
- **Archivo**: `backend/src/app.controller.ts:28-61`
- **Problema**: GET /health expone version, uptime y checks detallados de forma publica
- **Solucion**: Devolver solo `{ status: 'ok' }` en produccion; info detallada solo con AdminGuard o en /health/details protegido
- **Estado**: [x] HECHO

### 2.8 Limitar impersonacion de admin
- **Archivo**: `backend/src/admin/admin.controller.ts`
- **Problema**: Admin puede impersonar sin limite de tiempo ni confirmacion
- **Solucion**: Token de impersonacion con expiracion corta (15min), log de auditoria obligatorio
- **Estado**: [x] HECHO

---

## FASE 3: BASE DE DATOS (Sprint 1 post-lanzamiento)

### 3.1 Anadir indices a campos consultados frecuentemente
- **Archivo**: `backend/prisma/schema.prisma`
- **Campos sin indice**:
  - `User.verified`, `User.bannedAt`, `User.referredById`
  - `Match`: indice compuesto `(experienceId, status)`, `(requesterId, status)`, `(hostId, status)`
  - `Transaction`: indice compuesto `(userId, status)`
  - `Experience.festivalId`, `Experience.hostId` (verificar si ya existen)
- **Estado**: [x] HECHO

### 3.2 Convertir campos String a Enum donde corresponda
- **Archivo**: `backend/prisma/schema.prisma`
- **Campos**: `Match.status`, `Match.paymentStatus`, `Transaction.type`, `Report.status`, `User.role`
- **Solucion**: Crear enums MatchStatus, PaymentStatus, TransactionType, ReportStatus, UserRole y migrar
- **Estado**: [x] HECHO

### 3.3 Implementar soft deletes
- **Archivo**: `backend/prisma/schema.prisma` + servicios relacionados
- **Modelos**: User, Experience, Match, Review
- **Solucion**: Anadir campo `deletedAt DateTime?` y filtrar en queries con middleware Prisma
- **Estado**: [x] HECHO

### 3.4 Configurar connection pooling
- **Archivos**: `docker-compose.yml`, `backend/src/config/env.validation.ts`
- **Solucion**: Anadir `?connection_limit=10&pool_timeout=30` a DATABASE_URL en produccion
- **Estado**: [x] HECHO

---

## FASE 4: FRONTEND (Sprint 1 post-lanzamiento)

### 4.1 Crear pagina 500.tsx
- **Archivo**: `frontend/src/app/global-error.tsx` (App Router usa global-error.tsx)
- **Estado**: [x] HECHO

### 4.2 Anadir loading.tsx a rutas principales
- **Archivos**: `frontend/src/app/loading.tsx`, `frontend/src/app/experiences/loading.tsx`, `frontend/src/app/experiences/[id]/loading.tsx`
- **Estado**: [x] HECHO

### 4.3 Anadir Sentry al frontend
- **Archivo**: `frontend/src/app/layout.tsx` + nuevo `frontend/src/lib/sentry.ts`
- **Problema**: Solo el backend tiene Sentry; errores del frontend se pierden
- **Estado**: [x] HECHO

### 4.4 Proteger rutas de admin/dashboard en frontend
- **Archivo**: `frontend/src/middleware.ts` (nuevo)
- **Solucion**: Middleware de Next.js que redirige a /login si no hay cookie access_token en rutas /admin/*, /dashboard/*, /profile/edit/*
- **Estado**: [x] HECHO

---

## FASE 5: TYPESCRIPT STRICT MODE (Sprint 1)

### 5.1 Habilitar strict mode en backend
- **Archivo**: `backend/tsconfig.json`
- **Cambios**: `noImplicitAny: true`, `strictBindCallApply: true`, `noFallthroughCasesInSwitch: true`
- **Nota**: Esto generara errores de compilacion que habra que corregir uno a uno
- **Estado**: [x] HECHO

---

## FASE 6: DOCKER E INFRAESTRUCTURA (Sprint 1)

### 6.1 Anadir limites de recursos en docker-compose
- **Archivo**: `docker-compose.yml`
- **Solucion**: Anadir `deploy.resources.limits` a cada servicio
- **Estado**: [x] HECHO

### 6.2 Mejorar health checks en docker-compose
- **Archivo**: `docker-compose.yml:61-62`
- **Problema**: libretranslate usa `service_started` en vez de `service_healthy`
- **Estado**: [x] HECHO

### 6.3 Crear script de backup automatico de PostgreSQL
- **Archivo**: nuevo `scripts/backup-db.sh`
- **Estado**: [x] HECHO

---

## FASE 7: TESTING (Sprint 2)

### 7.1 Tests de auth service (ampliar existentes)
- **Archivo**: `backend/src/auth/auth.service.spec.ts`
- **Estado**: [x] HECHO

### 7.2 Tests de matches service
- **Archivo**: nuevo `backend/src/matches/matches.service.spec.ts`
- **Estado**: [x] HECHO

### 7.3 Tests de wallet service
- **Archivo**: nuevo `backend/src/wallet/wallet.service.spec.ts`
- **Estado**: [x] HECHO

### 7.4 Tests de experiences service
- **Archivo**: nuevo `backend/src/experiences/experiences.service.spec.ts`
- **Estado**: [x] HECHO

### 7.5 Tests de disputes service
- **Archivo**: nuevo `backend/src/disputes/disputes.service.spec.ts`
- **Estado**: [x] HECHO

### 7.6 Tests E2E basicos
- **Archivo**: nuevo `backend/test/app.e2e-spec.ts`
- **Estado**: [x] HECHO

### 7.7 Quitar --passWithNoTests de CI
- **Archivo**: `.github/workflows/ci.yml`
- **Estado**: [x] HECHO

---

## FASE 8: OBSERVABILIDAD (Sprint 2)

### 8.1 Logging estructurado JSON para produccion
- **Archivos**: `backend/src/main.ts`, nuevo `backend/src/common/logger/`
- **Estado**: [x] HECHO

### 8.2 Request ID correlation
- **Archivo**: nuevo `backend/src/common/middleware/request-id.middleware.ts`
- **Estado**: [x] HECHO

### 8.3 Web Vitals en frontend
- **Archivo**: `frontend/src/app/layout.tsx`
- **Estado**: [x] HECHO

---

## FASE 9: CI/CD (Sprint 2)

### 9.1 Workflow de aprobacion para deploys a produccion
- **Archivo**: `.github/workflows/deploy.yml`
- **Estado**: [x] HECHO

### 9.2 Rollback automatico si falla health check
- **Archivo**: `.github/workflows/deploy.yml`
- **Estado**: [x] HECHO

### 9.3 Notificaciones de deploy (Slack/email)
- **Archivo**: `.github/workflows/deploy.yml`
- **Estado**: [x] HECHO

---

## Resumen de progreso

| Fase | Tareas | Completadas | Estado |
|------|--------|-------------|--------|
| 1. Criticos seguridad | 6 | 6 | COMPLETA |
| 2. Seguridad alta | 6 | 6 | COMPLETA |
| 3. Base de datos | 4 | 4 | COMPLETA |
| 4. Frontend | 3 | 3 | COMPLETA |
| 5. TypeScript strict | 1 | 1 | COMPLETA |
| 6. Docker/Infra | 2 | 2 | COMPLETA |
| 7. Testing | 4 | 4 | COMPLETA |
| 8. Observabilidad | 1 | 1 | COMPLETA |
| 9. CI/CD | 1 | 1 | COMPLETA |
| **TOTAL** | **28** | **28** | **100%** |
