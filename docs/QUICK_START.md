# FiestApp - Guía de Inicio Rápido

## 📋 Requisitos Previos

- Node.js 18+ y npm 9+
- PostgreSQL 15+
- Git

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd fiestapp
```

### 2. Instalar dependencias

```bash
# Instalar dependencias del monorepo
npm install

# Instalar dependencias del backend
cd backend
npm install

# Instalar dependencias del frontend
cd ../frontend
npm install
```

### 3. Configurar Base de Datos

#### Crear base de datos PostgreSQL

```bash
# Conectar a PostgreSQL
psql -U postgres

# Crear base de datos
CREATE DATABASE fiestapp_dev;
\q
```

#### Configurar variables de entorno del backend

Crea un archivo `.env` en `backend/`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fiestapp_dev?schema=public"
JWT_SECRET=dev-secret-key-change-in-production-12345
JWT_EXPIRES_IN=7d
PORT=3001
FRONTEND_URL=http://localhost:3000
```

#### Ejecutar migraciones

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Configurar Frontend

Crea un archivo `.env.local` en `frontend/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_ENV=development
```

## 🏃 Ejecutar la Aplicación

### Opción 1: Ejecutar todo desde la raíz

```bash
npm run dev
```

Esto ejecutará simultáneamente:
- Backend en `http://localhost:3001`
- Frontend en `http://localhost:3000`

### Opción 2: Ejecutar por separado

#### Terminal 1 - Backend

```bash
cd backend
npm run start:dev
```

#### Terminal 2 - Frontend

```bash
cd frontend
npm run dev
```

## 📁 Estructura del Proyecto

```
fiestapp/
├── backend/              # NestJS API
│   ├── prisma/          # Schema y migraciones
│   ├── src/
│   │   ├── auth/        # Autenticación (JWT, guards)
│   │   ├── prisma/      # Servicio de Prisma
│   │   └── main.ts      # Entry point
│   └── .env             # Variables de entorno
├── frontend/            # Next.js 14 App
│   ├── src/
│   │   ├── app/         # App Router
│   │   └── components/  # Componentes React
│   └── .env.local       # Variables de entorno
├── shared/              # Código compartido
├── docs/                # Documentación
└── package.json         # Workspace config
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm run test

# Frontend tests
cd frontend
npm run test
```

## 📚 API Endpoints

### Autenticación

- `POST /api/auth/register` - Registrar nuevo usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Obtener perfil (requiere auth)

### Ejemplo de Registro

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@fiestapp.com",
    "password": "password123",
    "name": "Test User",
    "age": 25,
    "city": "Sevilla"
  }'
```

## 🔧 Comandos Útiles

### Prisma

```bash
# Generar cliente de Prisma
npx prisma generate

# Crear migración
npx prisma migrate dev --name <migration-name>

# Abrir Prisma Studio (GUI)
npx prisma studio

# Reset database
npx prisma migrate reset
```

### Build

```bash
# Build backend
cd backend
npm run build

# Build frontend
cd frontend
npm run build
```

## 🐛 Troubleshooting

### Error: Cannot find module '@prisma/client'

```bash
cd backend
npx prisma generate
```

### Error: Database connection failed

Verifica que PostgreSQL esté corriendo y que la `DATABASE_URL` en `.env` sea correcta.

### Error: Port 3000/3001 already in use

Cambia el puerto en las variables de entorno o mata el proceso:

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

## 📖 Próximos Pasos

1. ✅ Backend y Frontend configurados
2. ⏳ Implementar módulos de Experiencias
3. ⏳ Implementar sistema de Matching
4. ⏳ Implementar Chat en tiempo real
5. ⏳ Integrar sistema de pagos

## 🤝 Contribuir

Ver [CONTRIBUTING.md](./CONTRIBUTING.md) para guías de contribución.

## 📄 Licencia

Este proyecto es privado y confidencial.

---

**FiestApp** - Vive las fiestas desde dentro 🎉
