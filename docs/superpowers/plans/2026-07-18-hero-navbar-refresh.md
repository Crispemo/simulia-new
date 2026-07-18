# Refresco del Hero, botones y navbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sustituir el vídeo del hero por un mockup CSS estático de la plataforma, dar un acabado "glow" al CTA principal del hero, y recolorear el navbar a un tono claro de marca — implementando `docs/superpowers/specs/2026-07-18-hero-navbar-refresh-design.md`.

**Architecture:** (1) nuevo componente `HeroMockupStack.jsx` que sustituye a `HeroShowcase.jsx` y a todo el bloque de vídeo de YouTube en el hero; (2) reclases Tailwind con sombra de color en el CTA principal del hero; (3) reclases Tailwind en `<nav>` (desktop + menú móvil) de `HomePage.js`.

**Tech Stack:** React (CRA), Tailwind CSS.

---

### Task 0: Snapshot de copy para verificación posterior

**Files:**
- Create: `/tmp/hero-navbar-copy-before.txt` (fichero temporal, no se comitea)

- [ ] **Step 1: Extraer todo el texto entre comillas relevante de HomePage.js**

Run: `grep -oE '>[^<{}]{3,}<' frontend/src/HomePage.js | sort > /tmp/hero-navbar-copy-before.txt && wc -l /tmp/hero-navbar-copy-before.txt`
Expected: un número de líneas > 0 (referencia para comparar al final del plan, en la Task 5).

- [ ] **Step 2: No hay commit en este paso** (es solo una captura de referencia local).

---

### Task 1: Crear `HeroMockupStack` y eliminar `HeroShowcase`

**Files:**
- Create: `frontend/src/components/HeroMockupStack.jsx`
- Delete: `frontend/src/components/HeroShowcase.jsx`

- [ ] **Step 1: Crear el componente `HeroMockupStack`**

Crear `frontend/src/components/HeroMockupStack.jsx` con este contenido:

```jsx
import React from 'react';

function HeroMockupStack() {
  return (
    <div className="relative w-full aspect-video" aria-hidden="true">
      <div className="absolute top-[38%] left-[6%] w-44 sm:w-52 -rotate-6 rounded-2xl bg-card border border-border shadow-soft-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">📊</span>
          <span className="text-xs font-semibold text-secondary">Progreso</span>
        </div>
        <div className="space-y-1.5">
          <div className="h-2 rounded-full bg-primary/15 relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-primary/60 rounded-full" style={{ width: '70%' }} />
          </div>
          <div className="h-2 rounded-full bg-primary/15 relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-primary/60 rounded-full" style={{ width: '45%' }} />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground pt-2 leading-snug">Tu evolución semana a semana</p>
      </div>

      <div className="absolute top-[8%] left-[30%] w-44 sm:w-52 rounded-2xl bg-card border border-border shadow-soft-lg p-4 z-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🧩</span>
          <span className="text-xs font-semibold text-secondary">7 modos de práctica</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <span className="bg-primary/10 rounded-md px-1.5 py-1 text-sm">📝</span>
          <span className="bg-primary/10 rounded-md px-1.5 py-1 text-sm">🔍</span>
          <span className="bg-primary/10 rounded-md px-1.5 py-1 text-sm">⏱️</span>
          <span className="bg-primary/10 rounded-md px-1.5 py-1 text-sm">🔄</span>
          <span className="bg-primary/10 rounded-md px-1.5 py-1 text-sm">✏️</span>
        </div>
        <p className="text-[11px] text-muted-foreground pt-2 leading-snug">Elige cómo practicar hoy</p>
      </div>

      <div className="absolute top-[42%] left-[52%] w-40 sm:w-48 rotate-6 rounded-2xl bg-secondary text-secondary-foreground shadow-soft-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🤖</span>
          <span className="text-xs font-semibold">Análisis IA</span>
        </div>
        <div className="space-y-1.5">
          <div className="h-2 rounded-full bg-white/15 relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-white/50 rounded-full" style={{ width: '75%' }} />
          </div>
          <div className="h-2 rounded-full bg-white/15 relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-white/50 rounded-full" style={{ width: '55%' }} />
          </div>
        </div>
        <p className="text-[11px] text-white/70 pt-2 leading-snug">Identifica qué fallaste y por qué</p>
      </div>
    </div>
  );
}

export default HeroMockupStack;
```

Notas sobre este componente:
- Es puramente decorativo (`aria-hidden="true"`), sin estado ni intervalos — las 3 tarjetas son estáticas.
- Las 3 etiquetas y descripciones son texto nuevo autocontenido en este componente (no tocan copy existente de `HomePage.js`).
- No incluye ninguna referencia a "examen en vivo" ni "simulacro" en vivo — esa función ya tiene su propio CTA en el navbar.
- El contenedor `aspect-video` mantiene aproximadamente el mismo alto que ocupaba el bloque de vídeo que sustituye, para no descuadrar el hero.

- [ ] **Step 2: Eliminar `HeroShowcase.jsx`**

Run: `rm frontend/src/components/HeroShowcase.jsx`

- [ ] **Step 3: Verificar que no compila roto (esperado: sí falla, `HomePage.js` aún lo importa)**

Run: `cd frontend && npx tailwindcss -i ./src/index.css -o /tmp/tailwind-check.css --config tailwind.config.js`
Expected: Tailwind compila igual (no depende de imports JS). El `npm run build`/`npm start` fallará hasta la Task 2 porque `HomePage.js` todavía importa `HeroShowcase` — es esperado, se corrige en la siguiente tarea.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/HeroMockupStack.jsx
git rm frontend/src/components/HeroShowcase.jsx
git commit -m "Añade HeroMockupStack y elimina HeroShowcase"
```

---

### Task 2: Sustituir el bloque de vídeo del hero por `HeroMockupStack`

**Files:**
- Modify: `frontend/src/HomePage.js:12` (import)
- Modify: `frontend/src/HomePage.js:21,23,91-97` (estado y efecto del vídeo)
- Modify: `frontend/src/HomePage.js:561-624` (bloque del hero)
- Modify: `frontend/src/HomePage.js:88-89` (constantes del vídeo)

- [ ] **Step 1: Cambiar el import**

En `frontend/src/HomePage.js:12`, sustituir:

```jsx
import HeroShowcase from './components/HeroShowcase';
```

por:

```jsx
import HeroMockupStack from './components/HeroMockupStack';
```

- [ ] **Step 2: Eliminar el estado y efecto del vídeo**

Eliminar la línea 21:
```jsx
  const [showHeroVideo, setShowHeroVideo] = useState(false);
```

Eliminar la línea 23:
```jsx
  const [showHeroVideoHint, setShowHeroVideoHint] = useState(false);
```

Eliminar las líneas 88-89:
```jsx
  const HERO_VIDEO_YT_ID = 'mq2DUm4h7r4';
  const HERO_VIDEO_THUMB_URL = `https://img.youtube.com/vi/${HERO_VIDEO_YT_ID}/hqdefault.jpg`;
```

Eliminar el bloque completo (líneas 91-97):
```jsx
  useEffect(() => {
    if (!showHeroVideo) return;
    // Mostrar un "hint" corto para que se entienda que el video ya está reproduciéndose.
    setShowHeroVideoHint(true);
    const t = setTimeout(() => setShowHeroVideoHint(false), 2600);
    return () => clearTimeout(t);
  }, [showHeroVideo]);
```

- [ ] **Step 3: Sustituir el bloque de vídeo por `HeroMockupStack`**

Buscar el bloque (aprox. líneas 561-624):

```jsx
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-md relative">
                <HeroShowcase />
                {!showHeroVideo ? (
                  <button
                    type="button"
                    onClick={() => setShowHeroVideo(true)}
                      className="relative w-full overflow-hidden rounded-3xl bg-card shadow-soft hover:shadow-soft-lg transition-all duration-300"
                    aria-label="Ver video de Simulia en acción"
                  >
                      <div className="p-[2px] rounded-3xl bg-gradient-to-r from-primary via-accent to-primary">
                        <div className="rounded-[1.15rem] overflow-hidden">
                          <div className="aspect-video relative">
                            <img
                              src={HERO_VIDEO_THUMB_URL}
                              alt="Video de Simulia"
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                              <div className="flex flex-col items-center gap-2">
                                <div className="h-14 w-14 rounded-full bg-white/90 flex items-center justify-center animate-pulse-subtle">
                                  <span className="text-2xl">▶</span>
                                </div>
                                <span className="text-white text-sm font-semibold px-4 text-center">
                                  Toca para ver
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                  </button>
                ) : (
                    <div className="relative w-full overflow-hidden rounded-3xl bg-card shadow-soft">
                      <div className="p-[2px] rounded-3xl bg-gradient-to-r from-primary via-accent to-primary">
                        <div className="rounded-[1.15rem] overflow-hidden">
                          <div className="aspect-video relative">
                            <iframe
                              className="absolute inset-0 w-full h-full"
                              src={`https://www.youtube.com/embed/${HERO_VIDEO_YT_ID}?autoplay=1&mute=1&rel=0`}
                              title="Simulia - Video"
                              frameBorder="0"
                              allow="autoplay; encrypted-media"
                              allowFullScreen
                            />
                            {showHeroVideoHint && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="backdrop-blur-sm bg-black/40 border border-white/20 px-5 py-3 rounded-full">
                                  <div className="flex items-center gap-2">
                                    <span className="text-white text-lg">▶</span>
                                    <span className="text-white/95 text-sm font-semibold">
                                      Video en marcha (sin sonido)
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                    </div>
                  </div>
                )}
              </div>
```

Sustituir por:

```jsx
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-md relative">
                <HeroMockupStack />
              </div>
```

(El `</div>` de cierre inmediatamente después, que cerraba el `grid lg:grid-cols-2`, no se toca — solo se reemplaza el contenido interior del segundo hijo del grid.)

- [ ] **Step 4: Verificar visualmente**

Run: `cd frontend && npm start`
Expected: la Home carga sin errores de consola. En el hero, a la derecha (desktop) o debajo (mobile) de los botones, aparecen 3 tarjetas superpuestas ("Progreso", "7 modos de práctica", "Análisis IA") en vez del vídeo. El botón "Ver Simulia en acción" sigue abriendo el `DemoModal` igual que antes. No hay ninguna referencia a vídeo/YouTube restante.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/HomePage.js
git commit -m "Sustituye el vídeo del hero por HeroMockupStack"
```

---

### Task 3: Glow ambiental en el CTA principal del hero

**Files:**
- Modify: `frontend/src/HomePage.js:534-535` (número de línea puede haberse desplazado tras la Task 2; buscar por contenido)

- [ ] **Step 1: Añadir sombra de color al botón "Haz tu primer simulacro gratis"**

Buscar:

```jsx
                  <button
                    className="w-full bg-primary hover:bg-primary/90 hover:scale-[1.02] text-white px-8 py-4 rounded-full font-bold shadow-soft hover:shadow-soft-lg transition-all duration-300 text-base flex items-center justify-center gap-2"
                    onClick={() => {
                      const pricingSection = document.querySelector('#planes');
                      pricingSection?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    aria-label="Comenzar prueba gratuita"
                  >
```

Sustituir la clase por:

```jsx
                  <button
                    className="w-full bg-primary hover:bg-primary/90 hover:scale-[1.02] hover:-translate-y-0.5 text-white px-8 py-4 rounded-full font-bold shadow-[0_8px_20px_-4px_rgba(126,160,167,0.5)] hover:shadow-[0_10px_34px_-2px_rgba(126,160,167,0.85),0_0_40px_-6px_rgba(126,160,167,0.6)] transition-all duration-300 text-base flex items-center justify-center gap-2"
                    onClick={() => {
                      const pricingSection = document.querySelector('#planes');
                      pricingSection?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    aria-label="Comenzar prueba gratuita"
                  >
```

No se toca ningún otro botón (el secundario "Ver Simulia en acción", los de planes, FAQ, etc. quedan igual).

- [ ] **Step 2: Verificar visualmente**

Run: `cd frontend && npm start`
Expected: al pasar el ratón sobre "Haz tu primer simulacro gratis", el botón se eleva ligeramente y su sombra crece y se vuelve más difusa, con un tono verde-azulado (no negro). El resto de botones no cambia.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/HomePage.js
git commit -m "Añade glow ambiental al CTA principal del hero"
```

---

### Task 4: Navbar en tono claro de marca

**Files:**
- Modify: `frontend/src/HomePage.js:406` (nav)
- Modify: `frontend/src/HomePage.js:410-433` (logo, enlaces desktop, botón menú móvil)
- Modify: `frontend/src/HomePage.js:438-460` (panel del menú móvil)

- [ ] **Step 1: Fondo y borde del `<nav>`**

Buscar:

```jsx
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-secondary/95 backdrop-blur supports-[backdrop-filter]:bg-secondary/80 shadow-soft">
```

Sustituir por:

```jsx
    <nav className="sticky top-0 z-50 border-b border-[#dbe6e5] bg-[#eef4f3]/95 backdrop-blur supports-[backdrop-filter]:bg-[#eef4f3]/80 shadow-soft">
```

- [ ] **Step 2: Enlaces del menú desktop**

Buscar las 3 apariciones de:

```jsx
              <a href="/simulacro" className="text-sm font-medium text-white/80 hover:text-white transition-colors duration-200">
```
```jsx
              <a href="/precios" className="text-sm font-medium text-white/80 hover:text-white transition-colors duration-200">
```
```jsx
              <a href="/blog" className="text-sm font-medium text-white/80 hover:text-white transition-colors duration-200">
```

Sustituir `text-white/80 hover:text-white` por `text-secondary/80 hover:text-secondary` en cada una, quedando (ejemplo con `/simulacro`, aplicar igual a `/precios` y `/blog`):

```jsx
              <a href="/simulacro" className="text-sm font-medium text-secondary/80 hover:text-secondary transition-colors duration-200">
```

- [ ] **Step 3: Botón hamburguesa (mobile)**

Buscar:

```jsx
            <button 
              className="md:hidden text-white text-2xl focus:outline-none" 
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              aria-label="Menú móvil"
            >
```

Sustituir por:

```jsx
            <button 
              className="md:hidden text-secondary text-2xl focus:outline-none" 
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              aria-label="Menú móvil"
            >
```

- [ ] **Step 4: Panel del menú móvil**

Buscar:

```jsx
            <div className="md:hidden border-t border-white/20 bg-secondary/98 backdrop-blur">
```

Sustituir por:

```jsx
            <div className="md:hidden border-t border-[#dbe6e5] bg-[#eef4f3]/98 backdrop-blur">
```

Buscar las 3 apariciones de enlaces del menú móvil:

```jsx
                  className="block text-sm font-medium text-white/80 hover:text-white transition-colors py-2"
```

Sustituir cada una por:

```jsx
                  className="block text-sm font-medium text-secondary/80 hover:text-secondary transition-colors py-2"
```

(El botón "Entrar en Simulia" / "Haz tu simulacro EIR" dentro del menú móvil, y el de `renderActionButtons()` en desktop, usan `bg-primary` sólido — no se tocan, ya tienen buen contraste sobre el nuevo fondo claro.)

- [ ] **Step 5: Verificar visualmente**

Run: `cd frontend && npm start`
Expected: el navbar tiene fondo casi blanco con un tinte verde-azulado sutil, el logo y el texto "SIMULIA" siguen visibles (el logo ya es de color teal, no blanco), los enlaces "Simulacro EIR" / "Precios" / "Blog" se leen en gris pizarra oscuro, y el botón de acción sigue siendo el mismo botón sólido en teal. Repetir en mobile abriendo el menú hamburguesa: incluye mismo fondo claro y texto oscuro.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/HomePage.js
git commit -m "Recolorea el navbar a un tono claro de marca"
```

---

### Task 5: Verificación final de copy, build y funcionalidad

**Files:**
- No se modifican archivos de producto en esta tarea (solo verificación), salvo que el Step 1 detecte una regresión de copy no esperada.

- [ ] **Step 1: Comparar el copy antes/después**

Run: `grep -oE '>[^<{}]{3,}<' frontend/src/HomePage.js | sort > /tmp/hero-navbar-copy-after.txt && diff /tmp/hero-navbar-copy-before.txt /tmp/hero-navbar-copy-after.txt`

Expected: el diff no debe mostrar ningún cambio de copy existente (los textos nuevos de `HeroMockupStack` viven en su propio archivo, no en `HomePage.js`, así que no deberían aparecer aquí). Si aparece cualquier diferencia inesperada, revisar qué Task la introdujo.

- [ ] **Step 2: Comprobar que el proyecto compila sin errores**

Run: `cd frontend && CI=true npm run build`
Expected: build finaliza con `Compiled successfully` (o solo warnings preexistentes).

- [ ] **Step 3: Verificación manual end-to-end en el navegador**

Run: `cd frontend && npm start`

Recorrer manualmente, en desktop y en una vista mobile (DevTools responsive, ~375px de ancho):
- Navbar: fondo claro, logo y texto legibles, enlaces funcionan, botón de acción abre login/dashboard igual que antes. Menú hamburguesa en mobile con el mismo estilo claro.
- Hero: título, countdown, botones. `HeroMockupStack` visible con sus 3 tarjetas (Progreso, 7 modos, Análisis IA), sin animación de rotación.
- CTA "Haz tu primer simulacro gratis": glow de color al hover, sigue haciendo scroll a `#planes`.
- CTA "Ver Simulia en acción": sigue abriendo el `DemoModal` (mini simulacro de prueba).
- Resto de la página (stats, funcionalidades, modalidades, planes, FAQ, footer): sin cambios respecto al rediseño del 18/07.
- Login con Google sigue funcionando sin cambios.

Expected: toda la funcionalidad existente funciona exactamente igual que antes; solo cambia el aspecto visual del navbar, el hero (mockup en vez de vídeo) y el hover del CTA principal.

- [ ] **Step 4: Commit final (solo si Step 1-3 requirieron un ajuste de código)**

Si alguna verificación anterior requirió un ajuste de código, comitear ese ajuste puntual:

```bash
git add frontend/src/HomePage.js frontend/src/components/HeroMockupStack.jsx
git commit -m "Corrige regresión detectada en verificación final"
```

Si no hubo que tocar nada, no se crea commit en este paso.
