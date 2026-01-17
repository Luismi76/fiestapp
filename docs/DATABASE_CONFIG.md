# FiestApp Backend - Configuración de PostgreSQL Remoto

## Servidor PostgreSQL

Tu servidor PostgreSQL está en: **192.168.1.38**

## Configuración del DATABASE_URL

Actualiza el archivo `.env` en `backend/` con la siguiente configuración:

```env
DATABASE_URL="postgresql://USUARIO:CONTRASEÑA@192.168.1.38:5432/fiestapp_dev?schema=public"
```

### Parámetros a configurar:

- **USUARIO**: Tu usuario de PostgreSQL (por defecto: `postgres`)
- **CONTRASEÑA**: La contraseña de tu usuario PostgreSQL
- **192.168.1.38**: IP de tu servidor PostgreSQL
- **5432**: Puerto de PostgreSQL (por defecto)
- **fiestapp_dev**: Nombre de la base de datos

## Ejemplo completo

```env
DATABASE_URL="postgresql://postgres:micontraseña@192.168.1.38:5432/fiestapp_dev?schema=public"
```

## Verificar conexión

```bash
# Probar conexión
cd backend
npx prisma db push

# Si funciona, ejecutar migraciones
npx prisma migrate dev --name init

# Generar cliente
npx prisma generate
```

## Troubleshooting

### Error: Connection refused

Verifica que:
1. PostgreSQL esté corriendo en 192.168.1.38
2. El puerto 5432 esté abierto en el firewall
3. PostgreSQL acepte conexiones remotas (editar `postgresql.conf` y `pg_hba.conf`)

### Error: Database does not exist

Crear la base de datos primero:

```bash
# Conectar al servidor remoto
psql -h 192.168.1.38 -U postgres

# Crear base de datos
CREATE DATABASE fiestapp_dev;
\q
```

### Configurar PostgreSQL para conexiones remotas

En el servidor 192.168.1.38, editar:

**postgresql.conf:**
```conf
listen_addresses = '*'
```

**pg_hba.conf:**
```conf
host    all             all             0.0.0.0/0               md5
```

Luego reiniciar PostgreSQL:
```bash
sudo systemctl restart postgresql
```
