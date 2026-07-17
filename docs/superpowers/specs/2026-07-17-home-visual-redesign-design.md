# Rediseño visual de la Home (Fase 1) — Simulia

## Objetivo

Modernizar la estética de la Home (`frontend/src/HomePage.js`) para que transmita un producto de 2026: premium, dinámico, cuidado — sin tocar copy, contenido, estructura de secciones ni funcionalidad. Es un cambio puramente visual (tipografía, color, espaciado, motion, tratamiento de componentes).

**Fuera de alcance:** dashboard, páginas de examen, blog, y cualquier reescritura de textos o reordenación/fusión de secciones. Este spec cubre solo la Home; el mismo sistema de diseño se reutilizará en fases posteriores para el resto de la app.

## Dirección de estilo

Referencia: Apple / Stripe — minimalismo elegante, tipografía grande y cuidada, mucho espacio en blanco, producto mostrado con mockups flotantes y sombra suave, motion sutil (no scroll-storytelling agresivo, no parallax).

## Sistema de diseño

### Color

- Se mantiene la paleta de marca actual: primary `#7ea0a7` (verde-azulado), secondary `#3E5055` (gris pizarra).
- **No se introduce un acento vivo nuevo** (se descartó lima/coral/degradado en brainstorming). La sensación de modernidad viene de:
  - Fondos más neutros/blancos en vez de tintados.
  - Mayor contraste entre texto y fondo.
  - Sombras suaves y bordes finos en vez de bloques de color o bordes duros.
- Los tokens CSS existentes (`--primary`, `--secondary`, `--background`, `--card`, etc. en `frontend/src/index.css` / `tailwind.config.js`) se mantienen; se ajustan solo si hace falta refinar contraste (p.ej. un tono de gris pizarra más oscuro para texto sobre blanco).

### Tipografía

- Sustituir la fuente actual por **Inter** (o Geist si está disponible vía Google Fonts/self-host) como fuente principal, cargada vía `@font-face` o Google Fonts en `index.css`/`public/index.html`.
- Titulares (`h1`, `h2` de sección): peso 700-800, `letter-spacing` ligeramente negativo (`-0.02em` a `-0.03em`), tamaños grandes (los ya usados en Tailwind: `text-4xl sm:text-5xl lg:text-6xl` para h1, mantener escala).
- Cuerpo de texto: peso 400-500, `line-height` generoso (1.6-1.7) para legibilidad.
- No se cambia ningún texto — solo la fuente, peso y tracking aplicados al copy existente.

### Espaciado y layout

- Aumentar el padding vertical entre secciones (`py-16`/`py-20`/`py-24` actuales → revisar y homogeneizar, tendiendo al valor mayor de cada rango para más "aire").
- Radios de borde consistentes en cards/botones (usar el token `--radius` ya existente en Tailwind, homogeneizando el valor entre secciones que hoy puedan diferir).
- Sombras suaves (`box-shadow` sutil, tipo `0 20px 40px -12px rgba(0,0,0,.08)`) en vez de bordes duros para cards y mockups flotantes.

### Motion

- Se mantiene AOS (ya integrado, `AOS.init` en `HomePage.js`), afinando duración/easing para fade-in + slide-up sutil (8-16px de desplazamiento, 400-600ms, easing suave) en vez de la configuración actual si es más brusca.
- Hover states en botones y cards: escala ligera (`scale(1.02)`), sombra que crece, transición 200-300ms.
- Sin parallax, sin scroll-storytelling con elementos sticky que se transforman — el motion es de apoyo, no protagonista.

## Hero

- Layout asimétrico: bloque de texto (badge/kicker, `h1`, subtítulo, CTA) alineado a la izquierda; a la derecha, un mockup de producto flotando sobre fondo claro con sombra suave (ver mockup de referencia `hero-direction.html`, opción C, en `.superpowers/brainstorm/`).
- El mockup del hero **rota entre 3 vistas** del producto (sin cambiar copy, son capturas/representaciones visuales del producto real):
  1. Panel de análisis de errores con IA.
  2. Dashboard de progreso (rachas, temas débiles, gráfico).
  3. Pregunta de examen en vivo con temporizador.
  - Transición simple entre vistas (cross-fade o slide), con auto-avance cada pocos segundos y sin controles necesarios para el MVP visual.
- El copy del hero (título, subtítulo, texto del CTA, video demo) se mantiene exactamente igual; solo cambia el tratamiento visual y la composición.

## Resto de secciones (mismo contenido y orden, mismo copy)

Orden actual a preservar tal cual: franja de aviso → hero → modos de examen (`#modalidades`) → funcionalidades → testimonios → sección "quién hay detrás" (`#quien-hay-detras`) → planes (`#planes`) → FAQ (`#faq`).

Para cada sección, aplicar el mismo lenguaje visual (no rediseños ad-hoc por sección):

- **Franja de aviso:** mantener como banda fina, ajustar tipografía/color al nuevo sistema.
- **Modos de examen / Funcionalidades:** cards con mismo radio de borde, misma sombra, mismo ritmo de espaciado entre ellas; iconos/emoji actuales se conservan (no se sustituyen por un set de iconos nuevo, para no ampliar el alcance), pero se les da más aire y jerarquía tipográfica clara (título de card en semibold, descripción en gris medio).
- **Testimonios:** mismo contenido, tratamiento de card más limpio (fondo blanco o muy sutilmente tintado, sombra suave, sin bordes duros).
- **Quién hay detrás:** mismo contenido, tipografía y espaciado alineados al resto.
- **Planes/precios:** mismo contenido y lógica de negocio (Stripe checkout, `PaymentButton`, etc. no se tocan), solo la presentación visual de las cards de precio (jerarquía del plan destacado, espaciado, sombra).
- **FAQ:** mismo accordion/contenido, solo refinamiento visual (tipografía, espaciado, transición de apertura/cierre más suave si aplica).

## Alcance técnico

- Archivos principales afectados: `frontend/src/HomePage.js` (JSX/clases Tailwind), `frontend/src/index.css` (tokens de color/tipografía si se ajustan), `frontend/tailwind.config.js` (si se añaden tokens de sombra/radio), y componentes usados en Home si necesitan ajuste visual puntual (p.ej. `DemoModal.js`).
- **No se toca:** lógica de negocio, llamadas a API, `firebase.js`, `context/`, checkout/Stripe, ni el copy en español de ninguna sección.
- Se añade la fuente Inter/Geist (Google Fonts o self-hosted) como dependencia de estilo, sin nuevas dependencias de JS más allá de lo ya instalado (AOS ya está presente).

## Testing / verificación

- Verificación visual manual en navegador (desktop y mobile) recorriendo toda la Home tras el cambio: hero, todas las secciones, FAQ, CTA de planes.
- Confirmar que ningún texto visible ha cambiado respecto a la versión actual (diff de copy = ninguno).
- Comprobar que el checkout/Stripe y el login con Google siguen funcionando sin cambios funcionales.
- Revisar accesibilidad básica: contraste de texto sobre los nuevos fondos/tarjetas, tamaños de fuente legibles en mobile.
