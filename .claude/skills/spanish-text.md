---
description: Reglas obligatorias para escribir texto en castellano en ficheros del proyecto (tsx, ts, md, html). Se activa siempre que se escriba texto visible para el usuario en castellano.
globs: ["**/*.tsx", "**/*.ts", "**/*.md", "**/*.html"]
alwaysApply: true
---

# Castellano correcto en textos del proyecto

Todo texto visible para el usuario DEBE usar acentos, eñes y signos de puntuacion correctos.

## Reglas obligatorias

1. **Siempre usar acentos**: política (no politica), cancelación (no cancelacion), información (no informacion), también (no tambien), días (no dias), está (no esta), más (no mas), qué (no que cuando es interrogativo), cómo (no como cuando es interrogativo), cuándo (no cuando cuando es interrogativo)
2. **Siempre usar ñ**: año (no ano), anfitrión (no anfitrion), España (no Espana), señal (no senal)
3. **Signos de interrogación y exclamación**: usar apertura y cierre (¿...? y ¡...!)
4. **Nunca usar anglicismos** si existe alternativa en castellano: procesador de pagos (no payment processor), monedero (no wallet en textos de usuario), reembolso (no refund en textos de usuario)

## Palabras frecuentes en este proyecto

- política, cancelación, comisión, operación, aplicación, información, verificación
- reembolso, devolución, penalización, valoración, puntuación
- anfitrión, anfitriones
- días, más, está, están, también, además
- mínimo, máximo, último, próximo, código
- qué, cómo, cuándo, dónde, cuánto (interrogativos)
- experiencia, garantía

## Aplica a

- Componentes React (JSX/TSX): labels, textos, placeholders, mensajes de error, títulos
- Ficheros Markdown: documentación, políticas, manuales
- Descripciones en servicios backend que llegan al usuario (emails, notificaciones, descripciones de transacciones)

## NO aplica a

- Nombres de variables, funciones, clases o campos de base de datos (estos van en inglés)
- Comentarios de código (pueden ir sin acentos por conveniencia)
- Logs del servidor
