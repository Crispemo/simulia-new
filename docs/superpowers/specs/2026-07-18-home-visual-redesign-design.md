# Rediseño visual + ajustes de contenido de la Home (Fase 1) — Simulia

> Sustituye a `docs/superpowers/specs/2026-07-17-home-visual-redesign-design.md`. Mismo sistema de diseño visual descrito allí, ampliado con dos cambios de copy puntuales que salieron del capítulo 5 del informe de auditoría (`docs/...Capítulo 5...`). El resto del contenido de ese capítulo (nuevas páginas: blog, `/como-funciona`, `/simulacro`, `/precios`) queda fuera de este spec — es un sub-proyecto aparte, pendiente de brainstorming propio.

## Objetivo

Modernizar la estética de la Home (`frontend/src/HomePage.js`) para que transmita un producto de 2026: premium, dinámico, cuidado. Es principalmente un cambio visual (tipografía, color, espaciado, motion, tratamiento de componentes), con dos excepciones puntuales de copy descritas en la sección "Cambios de contenido" más abajo. Fuera de esas dos excepciones, no se toca ningún otro texto, ni la estructura/orden de secciones, ni la lógica de negocio.

**Fuera de alcance:** dashboard, páginas de examen, blog, páginas nuevas (`/como-funciona`, `/simulacro` en detalle, `/precios` rediseñada), y cualquier reescritura de copy u reordenación de secciones más allá de las dos excepciones listadas abajo.

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
- Salvo las dos excepciones de copy descritas abajo, no se cambia ningún texto — solo la fuente, peso y tracking aplicados al copy existente.

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
- El mockup del hero **rota entre 3 vistas** del producto (sin cambiar el resto del copy del hero, son capturas/representaciones visuales del producto real):
  1. Panel de análisis de errores con IA.
  2. Dashboard de progreso (rachas, temas débiles, gráfico).
  3. Pregunta de examen en vivo con temporizador.
  - Transición simple entre vistas (cross-fade o slide), con auto-avance cada pocos segundos y sin controles necesarios para el MVP visual.
- El resto del hero (subtítulo, texto del CTA, video demo) se mantiene exactamente igual; solo cambia el tratamiento visual, la composición y el titular (ver "Cambios de contenido").

## Resto de secciones (mismo contenido y orden, mismo copy salvo excepción de modalidades)

Orden actual a preservar tal cual: franja de aviso → hero → stats → funcionalidades → modos de examen (`#modalidades`) → "¿esto realmente ayuda a aprobar?" → testimonios → sección "quién hay detrás" (`#quien-hay-detras`) → planes (`#planes`) → FAQ (`#faq`).

Para cada sección, aplicar el mismo lenguaje visual (no rediseños ad-hoc por sección):

- **Franja de aviso:** mantener como banda fina, ajustar tipografía/color al nuevo sistema.
- **Stats / Funcionalidades:** cards con mismo radio de borde, misma sombra, mismo ritmo de espaciado entre ellas; iconos actuales se conservan (no se sustituyen por un set de iconos nuevo, para no ampliar el alcance), pero se les da más aire y jerarquía tipográfica clara (título de card en semibold, descripción en gris medio).
- **Modos de examen (`#modalidades`):** mismo tratamiento visual que el resto de cards, más el cambio de contenido descrito abajo (subtítulo visible bajo cada modalidad).
- **"¿Esto realmente ayuda a aprobar?":** mismo contenido y datos ya existentes, solo refinamiento visual (sombra, tipografía).
- **Testimonios:** mismo contenido, tratamiento de card más limpio (fondo blanco o muy sutilmente tintado, sombra suave, sin bordes duros).
- **Quién hay detrás:** mismo contenido, tipografía y espaciado alineados al resto.
- **Planes/precios:** mismo contenido y lógica de negocio (Stripe checkout, `handlePlanSelection`, etc. no se tocan), solo la presentación visual de las cards de precio (jerarquía del plan destacado, espaciado, sombra).
- **FAQ:** mismo accordion/contenido, solo refinamiento visual (tipografía, espaciado, transición de apertura/cierre más suave si aplica).

## Cambios de contenido (las dos únicas excepciones de copy)

Estos dos cambios vienen del capítulo 5 del informe de auditoría ("ideas a considerar" de copy) y se incluyen en este mismo ciclo de trabajo porque encajan con el tono más premium del rediseño visual. El email de contacto (`simuliaproject@simulia.es`) se queda tal cual — no se toca, es el dominio real existente.

1. **Titular del hero** (`HomePage.js:517`): sustituir
   > "Entrena el EIR como si ya estuvieras dentro del examen."

   por:
   > "Practica el EIR exactamente como lo vas a vivir, hasta que dejar de sorprenderte sea la norma."

2. **Subtítulos visibles en las 7 modalidades** (`HomePage.js:759-785`): cada modalidad ya tiene un campo `desc` en el array de datos, pero hoy solo se expone como atributo `title` (tooltip HTML), invisible en móvil/táctil. Se cambia a un párrafo corto siempre visible debajo del nombre de la modalidad, dentro de la misma card. Esto además corrige una brecha de accesibilidad (contenido solo-hover no es accesible por teclado/táctil). No se reescribe el texto de `desc` — se muestra el que ya existe.

## Alcance técnico

- Archivos principales afectados: `frontend/src/HomePage.js` (JSX/clases Tailwind, más los dos cambios de copy de arriba), `frontend/src/index.css` (tokens de color/tipografía si se ajustan), `frontend/tailwind.config.js` (si se añaden tokens de sombra/radio), `frontend/src/components/HeroShowcase.jsx` (nuevo), y componentes usados en Home si necesitan ajuste visual puntual (p.ej. `DemoModal.js`).
- **No se toca:** lógica de negocio, llamadas a API, `firebase.js`, `context/`, checkout/Stripe, el email de contacto, ni ningún otro texto en español fuera de los dos puntos de la sección "Cambios de contenido".
- Se añade la fuente Inter/Geist (Google Fonts o self-hosted) como dependencia de estilo, sin nuevas dependencias de JS más allá de lo ya instalado (AOS ya está presente).

## Testing / verificación

- Verificación visual manual en navegador (desktop y mobile) recorriendo toda la Home tras el cambio: hero, todas las secciones, FAQ, CTA de planes.
- Confirmar que el único texto visible que cambia respecto a la versión actual es el titular del hero y los subtítulos de modalidades (diff de copy = solo esas líneas).
- Comprobar que el checkout/Stripe y el login con Google siguen funcionando sin cambios funcionales.
- Revisar accesibilidad básica: contraste de texto sobre los nuevos fondos/tarjetas, tamaños de fuente legibles en mobile, y que los subtítulos de modalidades sean legibles/navegables sin depender de hover.
