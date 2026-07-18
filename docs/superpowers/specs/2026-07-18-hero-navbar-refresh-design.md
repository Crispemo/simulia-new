# Refresco del Hero, botones y navbar — Design Spec

Fecha: 2026-07-18
Sustituye/complementa: `docs/superpowers/specs/2026-07-18-home-visual-redesign-design.md` (ya implementado y fusionado a `main`).

## Contexto

Tras desplegar el rediseño visual de la Home (18/07), feedback del usuario en producción:

1. El vídeo del hero "no aporta mucho valor" — se pidió sustituirlo por un mockup visual interactivo de la plataforma.
2. El navbar en gris pizarra oscuro (`bg-secondary`) se percibe "muy oscuro, poco minimalista".
3. Los CTAs del hero deberían tener un acabado más "2026" (glow al hover).

Explorado con mockups CSS en sesión de brainstorming (`.superpowers/brainstorm/22245-1784395106/content/`), con estas decisiones:

## 1. Hero: `HeroMockupStack` reemplaza a `HeroShowcase`

**Elimina:** `frontend/src/components/HeroShowcase.jsx` y todo el bloque de vídeo del hero en `HomePage.js` (thumbnail de YouTube, iframe, estados `showHeroVideo` / `showHeroVideoHint` y su `useEffect` asociado). El botón **"Ver Simulia en acción" NO se toca** — abre el `DemoModal` (mini simulacro de prueba), una función distinta que no depende del vídeo; sigue existiendo tal cual.

**Crea:** `frontend/src/components/HeroMockupStack.jsx`, un componente decorativo (`aria-hidden="true"`, sin lógica ni estado) con 3 tarjetas CSS superpuestas en abanico (rotadas ligeramente, `position: absolute` dentro de un contenedor `relative`), estáticas (sin rotación automática ni intervalos):

- **Progreso** (fondo blanco, texto slate): título "📊 Progreso", dos barras de progreso con relleno parcial, texto "Tu evolución semana a semana".
- **Análisis IA** (fondo `bg-secondary`, texto blanco): título "🤖 Análisis IA", dos barras, texto "Identifica qué fallaste y por qué".
- **7 modos de práctica** (fondo blanco): título "🧩 7 modos de práctica", fila de 5 iconos (📝🔍⏱️🔄✏️) sin etiquetas, texto "Elige cómo practicar hoy".

Contenido en español, autocontenido en el componente (no toca los datos reales de modalidades/progreso). Tamaño similar al bloque de vídeo que sustituye, para no alterar el alto del hero. Reemplaza directamente el hueco donde vivía `{!showHeroVideo ? (...) : (...)}`.

Los dos CTAs del hero ("Haz tu primer simulacro gratis" y "Ver Simulia en acción") no cambian de comportamiento — solo cambia lo que hay a su derecha en el grid.

## 2. Botones: glow ambiental en el CTA principal del hero

Estilo (basado en la opción A validada):
- Sombra de color en vez de negra: `shadow-[0_8px_20px_-4px_rgba(126,160,167,0.5)]` en reposo.
- Al hover: sombra más amplia y difusa (`hover:shadow-[0_10px_34px_-2px_rgba(126,160,167,0.85),0_0_40px_-6px_rgba(126,160,167,0.6)]`) + elevación sutil (`hover:-translate-y-0.5`).
- Transición 300ms.

No se toca ningún otro botón (planes, FAQ, navbar, etc.) — quedan como en el rediseño del 18/07.

## 3. Navbar: wash claro

`frontend/src/HomePage.js`, elemento `<nav>`:

- Fondo: de `bg-secondary/95` (gris pizarra oscuro) a un tinte teal muy claro, ej. `bg-[#eef4f3]/95`.
- Borde inferior: de `border-white/5` a algo como `border-[#dbe6e5]`.
- Texto de marca ("SIMULIA") y enlaces (`Simulacro EIR`, `Precios`, `Blog`): de `text-white` / `text-white/80` a `text-secondary` / `text-secondary/80` (gris pizarra oscuro sobre fondo claro).
- El botón "Haz tu simulacro EIR" del navbar mantiene su relleno sólido en `primary` (teal) como único acento de color — no cambia.
- Menú móvil (hamburguesa/panel desplegable): mismo ajuste de fondo/texto para mantener coherencia, ya que actualmente hereda `bg-secondary`.

## Fuera de alcance

- No se toca el resto de la página (secciones ya restilizadas el 18/07).
- No se anima ni rota el nuevo `HeroMockupStack` — es estático.
- No se re-introduce ninguna referencia a "examen en vivo" en el hero (esa función ya tiene entrada propia vía el botón "Simulacro EIR" del navbar).
