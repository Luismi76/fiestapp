# FiestApp - Plan de Desarrollo

> Documento de planificación para implementar todas las mejoras pendientes.
> Última actualización: Enero 2026

---

## Resumen Ejecutivo

| Fase | Nombre | Duración Est. | Prioridad |
|------|--------|---------------|-----------|
| 1 | Funcionalidades Críticas | 2-3 semanas | CRÍTICA |
| 2 | Seguridad y Estabilidad | 1-2 semanas | ALTA |
| 3 | Notificaciones y Comunicación | 1-2 semanas | ALTA |
| 4 | UX/UI y Responsive | 2 semanas | MEDIA |
| 5 | Funcionalidades de Negocio | 2 semanas | MEDIA |
| 6 | Admin y Analíticas | 1-2 semanas | MEDIA |
| 7 | Optimización y Performance | 1 semana | BAJA |
| 8 | DevOps y Documentación | 1 semana | BAJA |

**Total estimado: 12-16 semanas**

---

## FASE 1: Funcionalidades Críticas
> Sin esto la plataforma no cumple su propósito

### 1.1 Completar perfil de usuario
**Archivos a modificar:**
- `backend/prisma/schema.prisma`
- `backend/src/auth/dto/auth.dto.ts`
- `backend/src/users/dto/update-user.dto.ts`
- `frontend/src/app/register/page.tsx`
- `frontend/src/app/profile/edit/page.tsx`

**Tareas:**
- [ ] Añadir campo `hasPartner` (Boolean) al modelo User
- [ ] Añadir campo `hasChildren` (Boolean) al modelo User
- [ ] Añadir campo `childrenAges` (String opcional) al modelo User
- [ ] Actualizar RegisterDto con nuevos campos
- [ ] Actualizar UpdateUserDto con nuevos campos
- [ ] Añadir inputs en formulario de registro (radio buttons)
- [ ] Añadir inputs en edición de perfil
- [ ] Migrar base de datos
- [ ] Actualizar seed con datos de ejemplo

### 1.2 Búsqueda por compatibilidad de perfil
**Archivos a modificar:**
- `backend/src/experiences/experiences.service.ts`
- `backend/src/experiences/experiences.controller.ts`
- `frontend/src/app/experiences/page.tsx`

**Tareas:**
- [ ] Crear endpoint GET `/api/experiences/compatible`
- [ ] Implementar algoritmo de compatibilidad:
  - Mismo rango de edad (±10 años)
  - Situación familiar similar (con/sin hijos)
  - Preferencia por mismo tipo (trueque/pago)
- [ ] Añadir filtros en frontend:
  - Rango de edad del anfitrión
  - Con/sin hijos
  - Solo perfiles verificados
- [ ] Ordenar resultados por compatibilidad (score)
- [ ] Guardar preferencias de búsqueda del usuario

### 1.3 Descuento automático de 1,50€ al completar
**Archivos a modificar:**
- `backend/src/matches/matches.service.ts`
- `backend/src/wallet/wallet.service.ts`

**Tareas:**
- [ ] Modificar método `complete()` en matches.service.ts
- [ ] Verificar saldo de ambos usuarios antes de completar
- [ ] Descontar 1,50€ del wallet del requester
- [ ] Descontar 1,50€ del wallet del host
- [ ] Crear transacciones tipo 'platform_fee' para ambos
- [ ] Manejar caso de saldo insuficiente (no permitir completar)
- [ ] Añadir mensaje informativo en frontend
- [ ] Tests unitarios para el flujo

### 1.4 Sistema de match bidireccional
**Archivos a modificar:**
- `backend/prisma/schema.prisma`
- `backend/src/matches/matches.service.ts`
- `backend/src/matches/matches.controller.ts`
- `frontend/src/app/matches/[id]/page.tsx`

**Tareas:**
- [ ] Añadir campo `hostConfirmed` (Boolean) al modelo Match
- [ ] Añadir campo `requesterConfirmed` (Boolean) al modelo Match
- [ ] Modificar flujo de aceptación:
  - Host acepta → hostConfirmed = true
  - Requester confirma → requesterConfirmed = true
  - Ambos true → status = 'accepted'
- [ ] Crear endpoint PUT `/api/matches/:id/confirm` para requester
- [ ] Actualizar UI para mostrar estado de confirmación
- [ ] Notificar cuando falta confirmación de una parte

---

## FASE 2: Seguridad y Estabilidad
> Proteger la plataforma y los usuarios

### 2.1 Rate Limiting
**Archivos a crear/modificar:**
- `backend/src/common/guards/throttle.guard.ts`
- `backend/src/app.module.ts`

**Tareas:**
- [ ] Instalar `@nestjs/throttler`
- [ ] Configurar límites globales (100 req/min)
- [ ] Límites específicos para auth (5 req/min)
- [ ] Límites para chat (30 msg/min)
- [ ] Respuestas 429 con mensaje claro
- [ ] Logging de IPs bloqueadas

### 2.2 Validación y Sanitización
**Archivos a modificar:**
- Todos los DTOs en `backend/src/*/dto/`
- `backend/src/main.ts`

**Tareas:**
- [ ] Revisar todas las validaciones con class-validator
- [ ] Añadir sanitización de HTML en campos de texto
- [ ] Validar URLs de imágenes
- [ ] Validar formatos de fecha
- [ ] Límites de longitud en todos los campos
- [ ] Mensajes de error claros en español

### 2.3 CAPTCHA en registro
**Archivos a modificar:**
- `backend/src/auth/auth.controller.ts`
- `frontend/src/app/register/page.tsx`

**Tareas:**
- [ ] Integrar reCAPTCHA v3 o hCaptcha
- [ ] Verificar token en backend antes de registrar
- [ ] Añadir componente CAPTCHA en formulario
- [ ] Fallback si CAPTCHA no carga

### 2.4 Autenticación social (Google)
**Archivos a crear:**
- `backend/src/auth/strategies/google.strategy.ts`
- `backend/src/auth/dto/social-auth.dto.ts`

**Tareas:**
- [ ] Configurar Google OAuth credentials
- [ ] Implementar GoogleStrategy con Passport
- [ ] Endpoint POST `/api/auth/google`
- [ ] Vincular cuenta existente o crear nueva
- [ ] Botón "Continuar con Google" en login/registro

### 2.5 Two-Factor Authentication (2FA)
**Archivos a crear:**
- `backend/src/auth/two-factor/`
- `frontend/src/app/settings/security/page.tsx`

**Tareas:**
- [ ] Instalar `otplib` para generar códigos TOTP
- [ ] Añadir campos `twoFactorEnabled`, `twoFactorSecret` a User
- [ ] Endpoint para activar/desactivar 2FA
- [ ] Generar QR code para apps autenticadoras
- [ ] Verificar código en login si 2FA activo
- [ ] Códigos de respaldo (backup codes)
- [ ] UI para configurar en ajustes

### 2.6 Sistema de bloqueo de usuarios
**Archivos a modificar:**
- `backend/prisma/schema.prisma`
- `backend/src/users/users.service.ts`

**Tareas:**
- [ ] Crear modelo BlockedUser (blockerId, blockedId)
- [ ] Endpoint POST `/api/users/:id/block`
- [ ] Endpoint DELETE `/api/users/:id/unblock`
- [ ] Filtrar usuarios bloqueados en búsquedas
- [ ] No permitir matches con usuarios bloqueados
- [ ] No mostrar mensajes de usuarios bloqueados
- [ ] Lista de bloqueados en ajustes

---

## FASE 3: Notificaciones y Comunicación
> Mantener a los usuarios informados

### 3.1 Sistema centralizado de notificaciones
**Archivos a crear:**
- `backend/src/notifications/notifications.module.ts`
- `backend/src/notifications/notifications.service.ts`
- `backend/src/notifications/notifications.controller.ts`
- `backend/prisma/schema.prisma` (modelo Notification)

**Tareas:**
- [ ] Crear modelo Notification:
  - userId, type, title, message, data (JSON)
  - read (Boolean), createdAt
- [ ] Servicio para crear notificaciones
- [ ] Endpoint GET `/api/notifications` (paginado)
- [ ] Endpoint PUT `/api/notifications/:id/read`
- [ ] Endpoint PUT `/api/notifications/read-all`
- [ ] Contador de no leídas en header
- [ ] Centro de notificaciones en frontend

### 3.2 Notificaciones por email
**Archivos a crear:**
- `backend/src/email/email.module.ts`
- `backend/src/email/email.service.ts`
- `backend/src/email/templates/`

**Tareas:**
- [ ] Configurar Resend o SendGrid
- [ ] Templates HTML para cada tipo:
  - Bienvenida tras registro
  - Verificación de email (ya existe, mejorar)
  - Nueva solicitud de match
  - Match aceptado/rechazado
  - Nuevo mensaje en chat
  - Recordatorio 3 días antes
  - Recordatorio 1 día antes
  - Experiencia completada (pedir review)
  - Reporte resuelto
- [ ] Cola de emails async (Bull queue)
- [ ] Tracking de envíos (opcional)
- [ ] Unsubscribe por tipo de notificación

### 3.3 Notificaciones push (navegador)
**Archivos a crear:**
- `backend/src/push/push.service.ts`
- `frontend/src/lib/push-notifications.ts`
- `frontend/public/sw.js` (service worker)

**Tareas:**
- [ ] Configurar Web Push API
- [ ] Service worker para recibir push
- [ ] Guardar suscripciones en BD (PushSubscription model)
- [ ] Pedir permiso al usuario
- [ ] Enviar push en eventos clave:
  - Nuevo mensaje
  - Match aceptado
  - Recordatorios
- [ ] Preferencias de push en ajustes

### 3.4 Recordatorios automáticos
**Archivos a modificar:**
- `backend/src/reminders/reminders.service.ts`
- `backend/src/reminders/reminders.module.ts`

**Tareas:**
- [ ] Añadir campos a Match:
  - `reminder3DaysSent` (Boolean)
  - `reminder1DaySent` (Boolean)
- [ ] Cron job diario a las 9:00 AM
- [ ] Buscar matches con fecha en 3 días (sin reminder enviado)
- [ ] Buscar matches con fecha en 1 día (sin reminder enviado)
- [ ] Enviar email + notificación + push
- [ ] Marcar reminder como enviado
- [ ] Logging de reminders enviados

### 3.5 Preferencias de notificación
**Archivos a crear:**
- `frontend/src/app/settings/notifications/page.tsx`

**Tareas:**
- [ ] Añadir a UserPreference o crear NotificationPreference:
  - emailNewMatch, emailMessages, emailReminders
  - pushNewMatch, pushMessages, pushReminders
- [ ] UI con toggles para cada tipo
- [ ] Respetar preferencias al enviar

---

## FASE 4: UX/UI y Responsive
> Mejorar la experiencia de usuario

### 4.1 Diseño responsive móvil
**Archivos a modificar:**
- `frontend/src/app/globals.css`
- Todos los componentes de página

**Tareas:**
- [ ] Auditar todas las páginas en móvil
- [ ] Breakpoints: 640px (sm), 768px (md), 1024px (lg)
- [ ] Menú hamburguesa en móvil
- [ ] Cards de experiencia adaptables
- [ ] Formularios full-width en móvil
- [ ] Chat optimizado para móvil
- [ ] Botones de acción sticky en móvil
- [ ] Imágenes responsive (srcset)

### 4.2 Loading states y skeletons
**Archivos a crear:**
- `frontend/src/components/skeletons/`

**Tareas:**
- [ ] Skeleton para card de experiencia
- [ ] Skeleton para lista de matches
- [ ] Skeleton para perfil de usuario
- [ ] Skeleton para chat
- [ ] Implementar Suspense boundaries
- [ ] Loading spinner global

### 4.3 Feedback visual mejorado
**Archivos a crear:**
- `frontend/src/components/ui/toast.tsx`
- `frontend/src/contexts/ToastContext.tsx`

**Tareas:**
- [ ] Sistema de toast notifications
- [ ] Tipos: success, error, warning, info
- [ ] Auto-dismiss configurable
- [ ] Implementar en todas las acciones:
  - Guardar perfil
  - Crear experiencia
  - Enviar mensaje
  - Aceptar/rechazar match
- [ ] Animaciones de entrada/salida

### 4.4 Modales de confirmación
**Archivos a crear:**
- `frontend/src/components/ui/confirm-modal.tsx`

**Tareas:**
- [ ] Modal reutilizable para confirmaciones
- [ ] Implementar en acciones destructivas:
  - Eliminar experiencia
  - Cancelar match
  - Eliminar cuenta
  - Rechazar solicitud
- [ ] Doble confirmación para acciones críticas

### 4.5 Mejoras en formularios
**Tareas:**
- [ ] Indicador de progreso en formularios largos (crear experiencia)
- [ ] Validación en tiempo real
- [ ] Autoguardado de borradores
- [ ] Preview de imágenes antes de subir
- [ ] Drag & drop para imágenes
- [ ] Mensajes de error inline

### 4.6 Accesibilidad (a11y)
**Tareas:**
- [ ] Auditar con Lighthouse
- [ ] Labels en todos los inputs
- [ ] Alt text en imágenes
- [ ] Contraste de colores WCAG AA
- [ ] Navegación por teclado
- [ ] Focus visible
- [ ] ARIA labels donde sea necesario
- [ ] Skip to content link

---

## FASE 5: Funcionalidades de Negocio
> Monetización y engagement

### 5.1 Sistema de reputación y badges
**Archivos a crear:**
- `backend/src/badges/badges.module.ts`
- `backend/prisma/schema.prisma` (modelo Badge, UserBadge)

**Tareas:**
- [ ] Modelo Badge: name, description, icon, criteria
- [ ] Badges predefinidos:
  - "Verificado" (email verificado)
  - "Anfitrión estrella" (5+ reviews de 5 estrellas)
  - "Viajero frecuente" (10+ experiencias completadas)
  - "Primera fiesta" (1 experiencia completada)
  - "Perfil completo" (todos los campos rellenos)
- [ ] Asignación automática al cumplir criterios
- [ ] Mostrar badges en perfil público
- [ ] Notificación al obtener badge

### 5.2 Sistema de strikes y bans
**Archivos a modificar:**
- `backend/prisma/schema.prisma`
- `backend/src/admin/admin.service.ts`

**Tareas:**
- [ ] Añadir campo `strikes` (Int) a User
- [ ] Añadir campo `bannedAt` (DateTime?) a User
- [ ] Añadir campo `banReason` (String?) a User
- [ ] Al resolver reporte negativo → +1 strike
- [ ] 3 strikes → ban automático
- [ ] Endpoint para ban/unban manual
- [ ] Impedir login de usuarios baneados
- [ ] Email notificando ban con razón

### 5.3 Códigos de descuento
**Archivos a crear:**
- `backend/src/discounts/discounts.module.ts`
- `backend/prisma/schema.prisma` (modelo DiscountCode)

**Tareas:**
- [ ] Modelo DiscountCode:
  - code, type (percentage/fixed), value
  - maxUses, usedCount, expiresAt
  - minAmount (opcional)
- [ ] Endpoint para validar código
- [ ] Aplicar descuento en recarga de wallet
- [ ] UI para introducir código en checkout
- [ ] Admin: crear/editar/desactivar códigos

### 5.4 Sistema de referidos
**Archivos a crear:**
- `backend/src/referrals/referrals.module.ts`

**Tareas:**
- [ ] Añadir campo `referralCode` único a User
- [ ] Añadir campo `referredBy` (userId) a User
- [ ] Generar código al registrar
- [ ] Validar código en registro
- [ ] Crédito al referidor cuando referido completa primera experiencia
- [ ] Panel de referidos en perfil
- [ ] Compartir link de referido

### 5.5 Respuestas a reseñas
**Archivos a modificar:**
- `backend/prisma/schema.prisma`
- `backend/src/reviews/reviews.service.ts`

**Tareas:**
- [ ] Añadir campo `hostResponse` (String?) a Review
- [ ] Añadir campo `hostResponseAt` (DateTime?) a Review
- [ ] Endpoint PUT `/api/reviews/:id/respond`
- [ ] Solo el host puede responder
- [ ] Solo una respuesta por review
- [ ] Mostrar respuesta en UI de reviews

### 5.6 Auditoría financiera
**Archivos a crear:**
- `backend/src/admin/reports/financial-report.service.ts`

**Tareas:**
- [ ] Endpoint GET `/api/admin/reports/financial`
- [ ] Métricas:
  - Ingresos totales por período
  - Número de transacciones
  - Ticket medio
  - Ingresos por comisión vs recarga
- [ ] Filtros por fecha
- [ ] Export a CSV
- [ ] Gráfica en dashboard admin

---

## FASE 6: Admin y Analíticas
> Herramientas para gestionar la plataforma

### 6.1 Dashboard mejorado
**Archivos a modificar:**
- `frontend/src/app/admin/page.tsx`
- `backend/src/admin/admin.service.ts`

**Tareas:**
- [ ] Gráfica de usuarios registrados por mes
- [ ] Gráfica de ingresos por mes
- [ ] Tasa de conversión (visita → registro → match)
- [ ] Matches completados vs cancelados
- [ ] Top experiencias por rating
- [ ] Top anfitriones
- [ ] Usuarios activos últimos 7/30 días

### 6.2 Gestión avanzada de usuarios
**Archivos a modificar:**
- `frontend/src/app/admin/users/page.tsx`

**Tareas:**
- [ ] Filtros: verificado, baneado, con strikes, por fecha
- [ ] Búsqueda por email/nombre
- [ ] Ordenar por fecha, matches, ingresos
- [ ] Ver detalle completo de usuario
- [ ] Historial de matches y transacciones
- [ ] Acciones en bulk (verificar, banear)
- [ ] Export a CSV

### 6.3 Gestión de reportes mejorada
**Archivos a modificar:**
- `frontend/src/app/admin/reports/page.tsx`

**Tareas:**
- [ ] Filtros por tipo, estado, fecha
- [ ] Ver contexto completo (match, mensajes)
- [ ] Templates de respuesta
- [ ] Acciones rápidas (strike, ban, warn)
- [ ] Historial de acciones del admin
- [ ] Notificar al reportador del resultado

### 6.4 Logs y auditoría
**Archivos a crear:**
- `backend/src/audit/audit.module.ts`
- `backend/prisma/schema.prisma` (modelo AuditLog)

**Tareas:**
- [ ] Modelo AuditLog: userId, action, entity, entityId, data, ip, createdAt
- [ ] Interceptor para loggear acciones críticas:
  - Login/logout
  - Cambios de perfil
  - Transacciones
  - Acciones de admin
- [ ] Endpoint GET `/api/admin/audit-logs`
- [ ] Filtros y búsqueda
- [ ] Retención de 90 días

### 6.5 Analytics (Google Analytics 4)
**Archivos a modificar:**
- `frontend/src/app/layout.tsx`

**Tareas:**
- [ ] Integrar GA4 script
- [ ] Eventos personalizados:
  - Registro completado
  - Experiencia creada
  - Match solicitado
  - Match completado
  - Recarga de wallet
- [ ] Conversiones configuradas en GA
- [ ] Excluir admins de tracking

---

## FASE 7: Optimización y Performance
> Hacer la plataforma rápida y eficiente

### 7.1 Caché con Redis
**Archivos a crear:**
- `backend/src/cache/cache.module.ts`

**Tareas:**
- [ ] Instalar `@nestjs/cache-manager` y `cache-manager-redis-store`
- [ ] Configurar conexión Redis
- [ ] Cachear:
  - Lista de festivales (1 hora)
  - Experiencias populares (5 min)
  - Perfil público (5 min)
  - Contadores de stats
- [ ] Invalidar caché al modificar
- [ ] Cache headers en respuestas

### 7.2 Optimización de queries
**Archivos a modificar:**
- `backend/src/experiences/experiences.service.ts`
- `backend/src/matches/matches.service.ts`

**Tareas:**
- [ ] Añadir índices en schema.prisma:
  - Experience: festivalId, hostId, type, isPublished
  - Match: experienceId, requesterId, status
  - Message: matchId, createdAt
  - Transaction: walletId, type, createdAt
- [ ] Usar select para traer solo campos necesarios
- [ ] Evitar N+1 con include estratégico
- [ ] Paginación cursor-based para listados grandes

### 7.3 Optimización de imágenes
**Tareas:**
- [ ] Configurar Cloudinary transformations
- [ ] Thumbnails automáticos (150x150, 300x300, 600x600)
- [ ] Formato WebP automático
- [ ] Lazy loading en frontend
- [ ] Placeholder blur mientras carga
- [ ] Límite de tamaño en upload (5MB)

### 7.4 Compresión y CDN
**Tareas:**
- [ ] Habilitar gzip/brotli en backend
- [ ] Headers de caché para assets estáticos
- [ ] Configurar CDN (Cloudflare)
- [ ] Preload de fuentes críticas
- [ ] Code splitting en frontend

---

## FASE 8: DevOps y Documentación
> Preparar para producción

### 8.1 Docker y Docker Compose
**Archivos a crear:**
- `Dockerfile` (backend)
- `frontend/Dockerfile`
- `docker-compose.yml`
- `docker-compose.prod.yml`

**Tareas:**
- [ ] Dockerfile multi-stage para backend
- [ ] Dockerfile para frontend (build + nginx)
- [ ] docker-compose para desarrollo local
- [ ] docker-compose para producción
- [ ] Variables de entorno externalizadas
- [ ] Health checks

### 8.2 CI/CD con GitHub Actions
**Archivos a crear:**
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`

**Tareas:**
- [ ] Workflow CI:
  - Lint (ESLint)
  - Type check (TypeScript)
  - Tests unitarios
  - Tests E2E
  - Build
- [ ] Workflow Deploy:
  - Deploy a staging en PR
  - Deploy a producción en merge a main
- [ ] Secrets configurados en GitHub
- [ ] Notificación en Slack/Discord

### 8.3 Testing
**Archivos a crear:**
- `backend/src/**/*.spec.ts`
- `backend/test/*.e2e-spec.ts`
- `frontend/src/**/*.test.tsx`

**Tareas:**
- [ ] Tests unitarios backend:
  - AuthService
  - ExperiencesService
  - MatchesService
  - WalletService
- [ ] Tests E2E backend:
  - Flujo de registro completo
  - Flujo de match completo
  - Flujo de pago completo
- [ ] Tests frontend:
  - Componentes críticos
  - Hooks personalizados
- [ ] Coverage mínimo 70%

### 8.4 Documentación API (Swagger)
**Archivos a modificar:**
- `backend/src/main.ts`
- Todos los controllers (decoradores)

**Tareas:**
- [ ] Instalar `@nestjs/swagger`
- [ ] Configurar Swagger en main.ts
- [ ] Decoradores @ApiTags en controllers
- [ ] @ApiOperation en cada endpoint
- [ ] @ApiResponse para respuestas
- [ ] @ApiProperty en DTOs
- [ ] Disponible en `/api/docs`

### 8.5 Documentación del proyecto
**Archivos a crear/modificar:**
- `README.md`
- `CONTRIBUTING.md`
- `docs/DEPLOYMENT.md`
- `docs/ARCHITECTURE.md`

**Tareas:**
- [ ] README con:
  - Descripción del proyecto
  - Requisitos
  - Instalación
  - Comandos disponibles
  - Variables de entorno
- [ ] Guía de contribución
- [ ] Guía de despliegue
- [ ] Documentación de arquitectura

### 8.6 Monitoring y alertas
**Tareas:**
- [ ] Integrar Sentry para errores
- [ ] Health endpoint `/api/health`
- [ ] Métricas básicas (uptime, response time)
- [ ] Alertas por email si servicio caído
- [ ] Logs estructurados (JSON)
- [ ] Rotación de logs

---

## Checklist de Lanzamiento

Antes de lanzar a producción, verificar:

### Seguridad
- [ ] HTTPS configurado
- [ ] Variables de entorno seguras
- [ ] Rate limiting activo
- [ ] CORS configurado correctamente
- [ ] Headers de seguridad (helmet)
- [ ] Validación en todos los inputs
- [ ] SQL injection imposible (Prisma)
- [ ] XSS prevenido

### Legal
- [ ] Términos y condiciones actualizados
- [ ] Política de privacidad RGPD
- [ ] Aviso de cookies
- [ ] Derecho al olvido implementado
- [ ] Consentimiento explícito en registro

### Pagos
- [ ] Stripe en modo producción
- [ ] Webhook configurado en Stripe Dashboard
- [ ] Facturas/recibos generados
- [ ] Política de reembolsos clara

### Comunicación
- [ ] Email de soporte configurado
- [ ] Emails transaccionales funcionando
- [ ] Templates de email revisados
- [ ] Unsubscribe funcional

### Performance
- [ ] Lighthouse score > 80
- [ ] Tiempo de carga < 3s
- [ ] Imágenes optimizadas
- [ ] Caché configurado

### Backup
- [ ] Backup automático de BD
- [ ] Procedimiento de restauración probado
- [ ] Backup de archivos/imágenes

---

## Notas Adicionales

### Priorización
Si hay limitación de tiempo, priorizar en este orden:
1. Fase 1 (Crítico) - Imprescindible
2. Fase 2 (Seguridad) - Muy importante
3. Fase 3 (Notificaciones) - Importante para retención
4. Fase 4 (UX/UI) - Importante para conversión
5. Resto - Mejoras incrementales

### Recursos recomendados
- **Hosting**: Vercel (frontend) + Railway (backend + BD)
- **Email**: Resend (100 emails/día gratis)
- **Imágenes**: Cloudinary (25 créditos/mes gratis)
- **Pagos**: Stripe (ya integrado)
- **Caché**: Upstash Redis (10k comandos/día gratis)
- **Monitoring**: Sentry (5k errores/mes gratis)

### Contacto desarrollo
Para dudas sobre este plan, contactar con el equipo de desarrollo.

---

*Documento generado: Enero 2026*
*Versión: 1.0*
