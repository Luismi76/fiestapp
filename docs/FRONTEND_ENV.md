# FiestApp Frontend - Variables de Entorno

## Configuración Requerida

Crea un archivo `.env.local` en la raíz del proyecto frontend con las siguientes variables:

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Environment
NEXT_PUBLIC_ENV=development
```

## Producción

Para producción, configura estas variables en tu plataforma de hosting (Vercel):

```env
NEXT_PUBLIC_API_URL=https://api.fiestapp.com/api
NEXT_PUBLIC_ENV=production
```
