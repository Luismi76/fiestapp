# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Descripción del Proyecto

FiestApp es un marketplace peer-to-peer de experiencias en fiestas populares españolas. Conecta viajeros con anfitriones locales para vivir la cultura festiva auténtica. Es un monorepo TypeScript con npm workspaces.

**IMPORTANTE: Responder siempre en castellano.**

## Comandos Comunes

### Desarrollo
```bash
npm run dev                 # Ejecutar frontend y backend simultáneamente
npm run dev:backend         # NestJS en modo watch (puerto 3001)
npm run dev:frontend        # Next.js servidor dev (puerto 3000)
```

### Compilación
```bash
npm run build               # Compilar ambos proyectos
npm run build:backend       # cd backend && nest build
npm run build:frontend      # cd frontend && next build
```

### Tests
```bash
npm run test                # Ejecutar todos los tests
npm run test:backend        # cd backend && jest
npm run test:frontend       # cd frontend && npm test

# Backend específico
cd backend
npm run test:watch          # Jest en modo watch
npm run test:cov            # Reporte de cobertura
npm run test:e2e            # Tests E2E (config jest-e2e.json)
npm test -- --testPathPattern="auth"  # Ejecutar test específico
```

### Linting y Formato
```bash
npm run lint                # Lint en ambos proyectos
cd backend && npm run format  # Prettier para backend
```

### Base de Datos (Prisma)
```bash
cd backend
npx prisma generate         # Generar cliente Prisma
npx prisma migrate dev      # Ejecutar migraciones en desarrollo
npx prisma studio           # Abrir Prisma Studio GUI
```

## Arquitectura

### Estructura del Monorepo
- **backend/** - API NestJS 11 con Prisma ORM
- **frontend/** - Next.js 14 (App Router) con React 19 y Tailwind CSS 4
- **shared/** - Reservado para tipos/utilidades compartidas (actualmente vacío)

### Backend (NestJS)
Arquitectura modular organizada por funcionalidad:
- `src/auth/` - Autenticación JWT con Passport.js (registro, login, rutas protegidas)
- `src/prisma/` - Servicio Prisma global para acceso a BD
- Guards: `JwtAuthGuard` para endpoints protegidos
- DTOs usan decoradores de class-validator para validación
- Prefijo API: `/api`

### Frontend (Next.js App Router)
- `src/app/` - Páginas usando convenciones App Router
- `src/contexts/AuthContext.tsx` - Estado de auth global via React Context
- `src/lib/api.ts` - Cliente Axios con interceptor JWT
- `src/types/` - Definiciones de tipos TypeScript
- Formularios usan react-hook-form + validación Zod

### Esquema de Base de Datos (Prisma)
Entidades principales en `backend/prisma/schema.prisma`:
- **User** - Usuario con perfil, vinculado a Wallet
- **Festival** - Catálogo maestro de fiestas españolas
- **Experience** - Ofertas de anfitriones (pago/intercambio/ambos)
- **Match** - Conecta solicitantes con experiencias (pending→accepted→completed)
- **Message** - Chat adjunto a matches
- **Transaction** - Seguimiento de pagos (Stripe/PayPal)
- **Review** - Valoraciones y comentarios

### Flujo de Autenticación
1. Backend usa JWT (expiración 7 días) con hash bcrypt para contraseñas
2. Frontend almacena token en localStorage
3. Interceptor Axios añade Bearer token automáticamente
4. Rutas protegidas usan `JwtAuthGuard` (backend) y hook `useAuth()` (frontend)

### Endpoints API
Todos bajo prefijo `/api`:
- `POST /api/auth/register` - Crear cuenta
- `POST /api/auth/login` - Autenticar
- `GET /api/auth/me` - Obtener perfil (protegido)

### Sistema de Diseño
Frontend usa Tailwind con componentes personalizados en `globals.css`:
- Color primario: #FF6B35 (naranja)
- Color secundario: #8B5CF6 (púrpura)
- Clases de componentes: `.btn-primary`, `.btn-secondary`, `.card`, `.glass`

## Configuración de Entorno
- Backend: archivo `.env` con `DATABASE_URL`, `JWT_SECRET`
- Frontend: `NEXT_PUBLIC_API_URL` (por defecto `http://localhost:3001/api`)
