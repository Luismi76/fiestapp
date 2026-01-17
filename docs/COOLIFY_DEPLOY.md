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

# MinIO Storage
MINIO_ENDPOINT=http://minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=<contraseña_minio_segura>
MINIO_BUCKET=fiestapp
MINIO_PUBLIC_URL=https://storage.tudominio.com
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
| `MINIO_ENDPOINT` | URL interna de MinIO | `http://minio:9000` |
| `MINIO_ACCESS_KEY` | Usuario de MinIO | `minioadmin` |
| `MINIO_SECRET_KEY` | Contraseña de MinIO | `<contraseña_segura>` |
| `MINIO_BUCKET` | Nombre del bucket | `fiestapp` |
| `MINIO_PUBLIC_URL` | URL pública para acceder a imágenes | `https://storage.tudominio.com` |

## Configuración de MinIO

### Opción A: MinIO Externo (Recomendado)
Si ya tienes un servidor MinIO:
```env
MINIO_ENDPOINT=http://192.168.1.102:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=<tu_contraseña>
MINIO_BUCKET=fiestapp
MINIO_PUBLIC_URL=http://192.168.1.102:9000
```

### Opción B: MinIO en Docker Compose
Descomenta la sección `minio` en `docker-compose.yml`:
```yaml
minio:
  image: minio/minio:latest
  container_name: fiestapp-minio
  restart: unless-stopped
  command: server /data --console-address ":9001"
  environment:
    MINIO_ROOT_USER: ${MINIO_ACCESS_KEY:-minioadmin}
    MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY:-minioadmin}
  volumes:
    - minio_data:/data
  ports:
    - "9000:9000"
    - "9001:9001"
```

### Configurar Bucket Público
El StorageService crea automáticamente el bucket si no existe. Para que las imágenes sean accesibles públicamente, puedes configurar la política del bucket desde la consola de MinIO (puerto 9001) o usando `mc`:

```bash
mc alias set fiestapp http://192.168.1.102:9000 minioadmin <password>
mc anonymous set download fiestapp/fiestapp
```

## Volúmenes Persistentes

- **PostgreSQL**: `/var/lib/postgresql/data`
- **MinIO**: `/data` (si usas MinIO en Docker)

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
- Verifica que MinIO esté corriendo y accesible
- Comprueba las credenciales de MinIO
- Asegúrate de que el bucket existe y tiene política pública
- Revisa los logs: `docker logs fiestapp-backend | grep -i minio`

### Imágenes no cargan
- Verifica que `MINIO_PUBLIC_URL` sea accesible desde el navegador
- Si usas HTTPS, asegúrate de configurar un proxy inverso para MinIO
- Comprueba que el bucket tenga política de acceso público

### Frontend no conecta con backend
- Verifica que `NEXT_PUBLIC_API_URL` apunta al backend correcto
- Comprueba CORS si usas dominios diferentes
