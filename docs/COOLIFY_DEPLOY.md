# Despliegue en Coolify

## Opción 1: Docker Compose (Recomendado)

1. En Coolify, ve a **Projects** > **New Project**
2. Selecciona **Docker Compose**
3. Conecta el repositorio de GitHub: `https://github.com/Luismi76/fiestapp`
4. Configura las variables de entorno:

```env
POSTGRES_USER=fiestapp
POSTGRES_PASSWORD=<contraseña_segura>
POSTGRES_DB=fiestapp
JWT_SECRET=<cadena_aleatoria_32_caracteres>
NEXT_PUBLIC_API_URL=https://api.tudominio.com/api
```

5. Configura los dominios:
   - Frontend: `tudominio.com` → Puerto 3000
   - Backend: `api.tudominio.com` → Puerto 3001

6. Deploy!

## Opción 2: Servicios Separados

### Paso 1: Crear Base de Datos PostgreSQL

1. En Coolify, ve a **Databases** > **New Database**
2. Selecciona **PostgreSQL**
3. Configura:
   - Database Name: `fiestapp`
   - Username: `fiestapp`
   - Password: (genera una segura)
4. Guarda la URL de conexión

### Paso 2: Desplegar Backend

1. **Projects** > **New Service** > **Docker**
2. Repositorio: `https://github.com/Luismi76/fiestapp`
3. Build Path: `/backend`
4. Dockerfile: `Dockerfile`
5. Variables de entorno:
```env
DATABASE_URL=postgresql://fiestapp:password@postgres-host:5432/fiestapp
JWT_SECRET=<cadena_aleatoria_32_caracteres>
NODE_ENV=production
```
6. Puerto: `3001`
7. Dominio: `api.tudominio.com`

### Paso 3: Desplegar Frontend

1. **Projects** > **New Service** > **Docker**
2. Repositorio: `https://github.com/Luismi76/fiestapp`
3. Build Path: `/frontend`
4. Dockerfile: `Dockerfile`
5. Build Arguments:
```env
NEXT_PUBLIC_API_URL=https://api.tudominio.com/api
```
6. Puerto: `3000`
7. Dominio: `tudominio.com`

## Variables de Entorno Requeridas

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | URL de PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Clave secreta para tokens | `abc123def456...` (32+ chars) |
| `NEXT_PUBLIC_API_URL` | URL pública del API | `https://api.tudominio.com/api` |

## Volúmenes Persistentes

- **PostgreSQL**: `/var/lib/postgresql/data`
- **Uploads**: `/app/uploads` (en el backend)

## Después del Despliegue

1. Ejecutar seed de datos (opcional):
```bash
docker exec -it fiestapp-backend npx prisma db seed
```

2. Verificar logs:
```bash
docker logs fiestapp-backend
docker logs fiestapp-frontend
```

## Troubleshooting

### Error de conexión a base de datos
- Verifica que PostgreSQL esté corriendo
- Comprueba la URL de conexión
- Asegúrate de que el backend puede alcanzar la base de datos

### Error 403 en uploads
- Verifica que el volumen de uploads esté montado
- Comprueba permisos del directorio

### Frontend no conecta con backend
- Verifica que `NEXT_PUBLIC_API_URL` apunta al backend correcto
- Comprueba CORS si usas dominios diferentes
