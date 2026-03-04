---
name: code-review
description: Analiza el código en busca de problemas de calidad, código muerto, redundancias, funciones sin usar y oportunidades de optimización. Usa esta skill cuando el usuario pida revisar, auditar o mejorar la calidad del código.
allowed-tools: Read, Grep, Glob, Bash
---

# Code Review - Auditoría de Calidad

Realiza una auditoría exhaustiva del código siguiendo estos pasos:

## 1. Análisis de Código Muerto

Busca e identifica:
- **Imports no utilizados**: Módulos importados que nunca se usan
- **Variables declaradas sin usar**: Variables que se definen pero no se referencian
- **Funciones huérfanas**: Funciones definidas que nunca se llaman
- **Componentes no renderizados**: Componentes React que no se importan en ningún lado
- **Archivos huérfanos**: Archivos que no son importados por ningún otro
- **Exports sin consumidores**: Exports que ningún archivo importa

## 2. Detección de Redundancias

Identifica:
- **Código duplicado**: Bloques de código repetidos que deberían abstraerse
- **Lógica repetida**: Patrones similares que podrían unificarse
- **Constantes duplicadas**: Valores hardcodeados repetidos
- **Tipos/interfaces duplicados**: Definiciones de tipos redundantes
- **Estilos CSS duplicados**: Clases con estilos idénticos o muy similares

## 3. Optimización

Revisa:
- **Re-renders innecesarios**: Componentes que se re-renderizan sin necesidad
- **Dependencias de useEffect**: Arrays de dependencias incorrectos o incompletos
- **Memoización faltante**: useMemo/useCallback donde serían beneficiosos
- **Queries N+1**: Llamadas a BD o API dentro de loops
- **Imports pesados**: Librerías grandes importadas para uso mínimo
- **Bundle size**: Imports que podrían ser dinámicos (lazy loading)

## 4. Calidad Profesional

Evalúa:
- **Naming conventions**: Nombres descriptivos y consistentes
- **Principio DRY**: Don't Repeat Yourself
- **Principio SOLID**: Single responsibility, etc.
- **Manejo de errores**: Try/catch apropiados, errores informativos
- **TypeScript estricto**: Uso de `any`, tipos faltantes
- **Consistencia**: Patrones uniformes en todo el código

## 5. Seguridad Básica

Detecta:
- **Secrets expuestos**: API keys, tokens en código
- **Inputs no sanitizados**: Datos de usuario sin validar
- **Console.logs en producción**: Logs que deberían removerse

## Formato de Reporte

Para cada problema encontrado, reporta:

```
### [CATEGORÍA] Descripción del problema

**Archivo**: path/to/file.ts:línea
**Severidad**: Alta | Media | Baja
**Problema**: Explicación clara del issue
**Solución**: Cómo corregirlo

// Código problemático
código actual...

// Código sugerido
código mejorado...
```

## Comandos Útiles

Para TypeScript/JavaScript, usa estos análisis:

```bash
# Buscar imports no usados (aproximación)
grep -r "^import" --include="*.ts" --include="*.tsx" | head -50

# Buscar console.log
grep -rn "console\." --include="*.ts" --include="*.tsx" src/

# Buscar TODO/FIXME pendientes
grep -rn "TODO\|FIXME\|HACK" --include="*.ts" --include="*.tsx" src/

# Buscar any en TypeScript
grep -rn ": any" --include="*.ts" --include="*.tsx" src/
```

## Priorización

Ordena los hallazgos por impacto:
1. **Crítico**: Bugs, seguridad, código que falla
2. **Alto**: Código muerto significativo, redundancias grandes
3. **Medio**: Optimizaciones, mejoras de legibilidad
4. **Bajo**: Estilo, convenciones menores

## Entregable Final

Al terminar, proporciona:
1. **Resumen ejecutivo**: Cantidad de issues por categoría
2. **Lista priorizada**: Issues ordenados por severidad
3. **Quick wins**: Cambios fáciles con alto impacto
4. **Recomendaciones**: Mejoras arquitecturales si aplica

---

Si el usuario especifica archivos o directorios concretos ($ARGUMENTS), enfócate en esos. Si no, analiza las áreas más críticas del proyecto (src/, components/, services/, etc.).
