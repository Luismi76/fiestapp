#!/bin/bash
set -euo pipefail

# ---------------------------------------------------------------------------
# backup-db.sh — Copia de seguridad de PostgreSQL para FiestApp
#
# Ejecuta pg_dump dentro del contenedor Docker 'fiestapp-db', comprime el
# volcado con gzip y elimina copias con mas de 7 dias de antiguedad.
# ---------------------------------------------------------------------------

# Credenciales (sobreescribibles con variables de entorno)
DB_USER="${POSTGRES_USER:-fiestapp}"
DB_NAME="${POSTGRES_DB:-fiestapp}"

# Contenedor y rutas
CONTAINER="fiestapp-db"
BACKUP_DIR="/data/backups/fiestapp"
RETENTION_DAYS=7

# Nombre del archivo con marca temporal
TIMESTAMP="$(date +'%Y-%m-%d_%H-%M')"
FILENAME="fiestapp_${TIMESTAMP}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${FILENAME}"

# ---------------------------------------------------------------------------
# Funciones auxiliares
# ---------------------------------------------------------------------------
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

die() {
  log "ERROR: $*" >&2
  exit 1
}

# ---------------------------------------------------------------------------
# Validaciones previas
# ---------------------------------------------------------------------------
# Comprobar que Docker esta disponible
command -v docker >/dev/null 2>&1 || die "docker no encontrado en PATH"

# Comprobar que el contenedor esta en ejecucion
if ! docker inspect --format='{{.State.Running}}' "$CONTAINER" 2>/dev/null | grep -q true; then
  die "El contenedor '$CONTAINER' no esta en ejecucion"
fi

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR" || die "No se pudo crear el directorio $BACKUP_DIR"

# ---------------------------------------------------------------------------
# Backup
# ---------------------------------------------------------------------------
log "Inicio de backup de la base de datos '$DB_NAME' (usuario: $DB_USER)"
log "Destino: $BACKUP_PATH"

if docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-acl \
  | gzip > "$BACKUP_PATH"; then
  # Verificar que el archivo no este vacio (cabecera gzip minima ~20 bytes)
  FILESIZE=$(stat -c%s "$BACKUP_PATH" 2>/dev/null || stat -f%z "$BACKUP_PATH" 2>/dev/null || echo 0)
  if [ "$FILESIZE" -lt 100 ]; then
    rm -f "$BACKUP_PATH"
    die "El archivo de backup esta vacio o es demasiado pequeno (${FILESIZE} bytes). Algo fallo en pg_dump."
  fi
  log "Backup completado correctamente ($(du -h "$BACKUP_PATH" | cut -f1))"
else
  rm -f "$BACKUP_PATH"
  die "pg_dump fallo. Backup abortado."
fi

# ---------------------------------------------------------------------------
# Limpieza de backups antiguos
# ---------------------------------------------------------------------------
log "Eliminando backups con mas de ${RETENTION_DAYS} dias de antiguedad..."
DELETED=$(find "$BACKUP_DIR" -name "fiestapp_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -print -delete | wc -l)
log "Backups eliminados: $DELETED"

# ---------------------------------------------------------------------------
# Resumen
# ---------------------------------------------------------------------------
REMAINING=$(find "$BACKUP_DIR" -name "fiestapp_*.sql.gz" -type f | wc -l)
log "Backups disponibles en $BACKUP_DIR: $REMAINING"
log "Fin del proceso de backup"
