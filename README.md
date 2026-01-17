# FiestApp - Plataforma de Experiencias en Fiestas Populares

![FiestApp Banner](./images/feria_abril.png)

Plataforma web full-stack para intercambio y contratación de experiencias auténticas en fiestas populares españolas.

## 🎯 Descripción

FiestApp conecta a viajeros con locales para vivir experiencias únicas en las fiestas más emblemáticas de España. Desde la Feria de Abril en Sevilla hasta San Fermín en Pamplona, nuestra plataforma facilita el intercambio cultural y la inmersión en tradiciones locales.

## ✨ Características Principales

- 🔐 **Autenticación Segura**: Sistema de registro y login con JWT
- 🎭 **Experiencias Personalizadas**: Crea y descubre experiencias únicas
- 💬 **Chat en Tiempo Real**: Comunícate con anfitriones e invitados
- 💰 **Sistema de Pagos**: Integración con Stripe, PayPal y Bizum
- ⭐ **Reseñas y Ratings**: Sistema de valoraciones verificadas
- 📱 **Responsive Design**: Optimizado para móvil, tablet y desktop
- 🌐 **PWA Ready**: Instalable como aplicación nativa

## 🛠️ Stack Tecnológico

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI**: React 18 + TypeScript
- **Estilos**: Tailwind CSS
- **State**: Zustand + React Query
- **Validación**: Zod + React Hook Form

### Backend
- **Framework**: NestJS
- **Base de Datos**: PostgreSQL 15
- **ORM**: Prisma
- **Autenticación**: Passport.js + JWT
- **Real-time**: Socket.io
- **Cache**: Redis

### DevOps
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Railway
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry + Vercel Analytics

## 📁 Estructura del Proyecto

```
fiestapp/
├── backend/                 # NestJS API
│   ├── prisma/             # Database schema y migraciones
│   │   └── schema.prisma   # 9 modelos (User, Experience, Match, etc.)
│   ├── src/
│   │   ├── auth/           # Módulo de autenticación
│   │   ├── prisma/         # Servicio de Prisma
│   │   ├── app.module.ts   # Módulo principal
│   │   └── main.ts         # Entry point con CORS y validación
│   └── .env                # Variables de entorno
├── frontend/               # Next.js 14 Application
│   ├── src/
│   │   ├── app/            # App Router (páginas)
│   │   ├── components/     # Componentes reutilizables
│   │   └── lib/            # Utilidades y helpers
│   ├── public/             # Assets estáticos
│   └── .env.local          # Variables de entorno
├── shared/                 # Código compartido (DTOs, types)
├── docs/                   # Documentación
│   ├── QUICK_START.md      # Guía de inicio rápido
│   └── FRONTEND_ENV.md     # Configuración de variables
├── images/                 # Imágenes del prototipo
├── styles/                 # CSS del prototipo (legacy)
├── *.html                  # Prototipo HTML (legacy)
└── package.json            # Workspace configuration
```

## 🚀 Inicio Rápido

### Requisitos Previos

- Node.js 18+
- PostgreSQL 15+
- npm 9+

### Instalación

```bash
# 1. Clonar repositorio
git clone <repository-url>
cd fiestapp

# 2. Instalar dependencias
npm install

# 3. Configurar base de datos
createdb fiestapp_dev

# 4. Configurar variables de entorno
# Ver docs/QUICK_START.md para detalles

# 5. Ejecutar migraciones
cd backend
npx prisma migrate dev
npx prisma generate

# 6. Iniciar aplicación
cd ..
npm run dev
```

La aplicación estará disponible en:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- API Docs: http://localhost:3001/api

Ver [docs/QUICK_START.md](./docs/QUICK_START.md) para instrucciones detalladas.

## 📖 Documentación

- [Guía de Inicio Rápido](./docs/QUICK_START.md)
- [Plan de Implementación](./docs/IMPLEMENTATION_PLAN.md)
- [Configuración de Variables de Entorno](./docs/FRONTEND_ENV.md)

## 🗄️ Modelos de Base de Datos

- **User**: Usuarios y perfiles
- **UserPreference**: Preferencias de festivales y actividades
- **Festival**: Catálogo de festivales
- **Experience**: Experiencias publicadas
- **ExperienceAvailability**: Disponibilidad de fechas
- **Match**: Conexiones entre usuarios
- **Message**: Mensajes de chat
- **Transaction**: Historial de pagos
- **Wallet**: Saldo virtual de usuarios
- **Review**: Reseñas y valoraciones

## 🔐 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Perfil actual (protegido)

### Próximos Endpoints (En desarrollo)
- Experiencias (CRUD)
- Matches (crear, aceptar, rechazar)
- Chat (mensajes en tiempo real)
- Pagos (Stripe, PayPal, Bizum)
- Reseñas

## 🎨 Diseño

### Paleta de Colores
- **Primario**: Naranja (#FF6B35) - Energía festiva
- **Secundario**: Morado (#8B5CF6) - Sofisticación
- **Acento**: Verde (#10B981) - Acciones positivas

### Tipografía
- **Headings**: Poppins (Bold)
- **Body**: Inter (Regular)

### Efectos Visuales
- Glassmorphism en paneles
- Gradientes animados
- Transiciones suaves
- Diseño completamente responsive

## 🧪 Testing

```bash
# Backend tests
cd backend
npm run test
npm run test:e2e

# Frontend tests
cd frontend
npm run test
npm run test:e2e
```

## 📦 Build y Despliegue

```bash
# Build para producción
npm run build

# Build backend
cd backend
npm run build

# Build frontend
cd frontend
npm run build
```

## 🗺️ Roadmap

### ✅ Fase 1: Fundamentos (Completada)
- [x] Configuración de monorepo
- [x] Backend NestJS con Prisma
- [x] Frontend Next.js con Tailwind
- [x] Sistema de autenticación JWT
- [x] Schema de base de datos

### 🚧 Fase 2: Funcionalidades Core (En progreso)
- [ ] Módulo de Experiencias
- [ ] Sistema de Matching
- [ ] Chat en tiempo real
- [ ] Sistema de pagos (Stripe + PayPal + Bizum)

### ⏳ Fase 3: Funcionalidades Avanzadas
- [ ] Sistema de reseñas
- [ ] Búsqueda avanzada
- [ ] Panel de administración
- [ ] Notificaciones push

### ⏳ Fase 4: Testing y Seguridad
- [ ] Tests unitarios e integración
- [ ] Tests E2E con Playwright
- [ ] Auditoría de seguridad
- [ ] Optimización de performance

### ⏳ Fase 5: Despliegue
- [ ] CI/CD con GitHub Actions
- [ ] Deploy a Vercel + Railway
- [ ] Monitoreo con Sentry
- [ ] Analytics

### ⏳ Fase 6: Lanzamiento
- [ ] Documentación completa
- [ ] Legal (T&C, Privacy Policy)
- [ ] Beta testing
- [ ] Lanzamiento público

## 🤝 Contribuir

Este es un proyecto privado. Para contribuir, contacta al equipo de desarrollo.

## 📄 Licencia

Privado y confidencial. Todos los derechos reservados.

## 📧 Contacto

Para preguntas o soporte, contacta al equipo de desarrollo de FiestApp.

---

**FiestApp** - Vive las fiestas desde dentro 🎉

*De prototipo HTML a aplicación de producción full-stack*

