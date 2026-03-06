# TODO - FiestApp UX Improvements

## ELIMINAR

### E1. Campo "situacion familiar" del registro [HECHO]
- Campos `hasPartner`, `hasChildren`, `childrenAges` eliminados del schema y formulario

### E2. Stat cards redundantes del dashboard [HECHO]
- Stat cards (conversaciones, pendientes, experiencias) eliminadas
- Reemplazadas por stats de anfitrion contextuales (A11)

### E3. Mock data hardcodeada en experience detail [HECHO]
- `mockExperiencesMap` eliminado, fallback a error real
- Variables `useMockData` y bloques condicionales eliminados

## ANADIR / MEJORAR

### A1. Filtros persistentes en URL [HECHO]
- `useSearchParams` + `router.replace` sincroniza filtros con URL
- Al refrescar o compartir URL, los filtros se mantienen

### A2. Favoritos desde el grid [HECHO]
- FavoriteButton con toggle optimista en ExperienceCard
- Integrado con API de favoritos

### A3. Boton compartir experiencia [HECHO]
- ShareButton con Web Share API integrado en experience detail

### A4. Borrador auto-guardado en crear experiencia [HECHO]
- localStorage con key `fiestapp_experience_draft`
- Carga al montar, guardado con debounce 500ms
- Boton "Descartar borrador" visible si hay datos guardados
- Limpia al publicar exitosamente

### A5. Consolidar pasos crear experiencia 5->3 [HECHO]
- Paso 1: "Que ofreces" (titulo + tipo + festival + ciudad + precio + categoria + descripcion + highlights + capacidad)
- Paso 2: "Fotos y disponibilidad" (fotos + calendario)
- Paso 3: "Revisar y publicar" (resumen + publicar)

### A6. Mensajes de error especificos [HECHO]
- Login: mapeo "Invalid credentials" -> mensaje en espanol con contexto
- Register: deteccion "already registered" con link a login
- Rate limiting (429) con mensaje apropiado
- AuthContext expone status code del error

### A7. Placeholder de busqueda con ejemplos [HECHO]
- "Busca por fiesta, ciudad o tipo de experiencia..."

### A8. Empty states contextuales [HECHO]
- Con filtros: muestra filtros activos como pills + boton "Limpiar filtros"
- Sin filtros: sugerencia explorar festivales o crear experiencia
- Dashboard: empty state mejorado para "Mis experiencias"

### A9. Accesibilidad sistematica [HECHO]
- aria-hidden="true" en iconos decorativos de home page
- aria-invalid + aria-describedby en inputs de login y register
- role="alert" en mensajes de error de formulario
- aria-hidden en iconos SVG dentro de errores

### A10. Boton Google login en frontend [HECHO]
- Boton "Continuar con Google" en login y register
- Pagina callback /auth/callback creada (usa loginWithToken)
- Separador visual "o" entre Google y formulario

### A11. Dashboard de anfitrion con stats [HECHO]
- Cards: experiencias publicadas, pendientes, tasa de aceptacion
- Visible solo cuando el usuario tiene experiencias

### A12. Scroll to top en cambio de ruta [HECHO]
- usePathname + window.scrollTo(0, 0) en AppWrapper
