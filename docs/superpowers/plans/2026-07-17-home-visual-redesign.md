# Rediseño Visual de la Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernizar visualmente `frontend/src/HomePage.js` (tipografía, color, espaciado, sombras, motion) sin cambiar ni una palabra de copy, ni el orden/estructura de secciones, ni ninguna lógica de negocio.

**Architecture:** Cambios puramente de presentación: (1) nueva fuente Inter cargada globalmente, (2) tokens de color/sombra/radio refinados en `index.css` y `tailwind.config.js`, (3) reclases Tailwind en los elementos existentes de `HomePage.js` sección por sección, (4) ajuste fino de la configuración de AOS ya presente, (5) un componente nuevo y autocontenido (`HeroShowcase`) para el carrusel de mockups flotante del hero. Salvo ese componente, ningún string de texto existente se toca.

**Nota sobre el carrusel del Hero:** el spec (`docs/superpowers/specs/2026-07-17-home-visual-redesign-design.md`) describía un mockup del hero que rota entre 3 vistas del producto (IA/dashboard/examen). El usuario pidió explícitamente incluirlo (Task 5), como card flotante decorativa superpuesta al bloque de vídeo existente — el vídeo no se elimina ni pierde funcionalidad. Es el único punto del plan que introduce texto nuevo (3 etiquetas cortas + 3 descripciones breves, ver Task 5), reutilizando vocabulario ya presente en la página (análisis de errores, progreso, simulacro cronometrado).

**Tech Stack:** React (CRA), Tailwind CSS, AOS (ya instalado).

---

## Antes de empezar: snapshot de copy

Antes de tocar nada, se genera un snapshot del texto visible de la Home para poder verificar al final que no ha cambiado ni una palabra.

### Task 0: Snapshot de copy para verificación posterior

**Files:**
- Create: `/tmp/home-copy-before.txt` (fichero temporal, no se comitea)

- [ ] **Step 1: Extraer todo el texto entre comillas relevante de HomePage.js**

Run: `grep -oE '>[^<{}]{3,}<' frontend/src/HomePage.js | sort > /tmp/home-copy-before.txt && wc -l /tmp/home-copy-before.txt`
Expected: un número de líneas > 0 (referencia para comparar al final del plan, en la Task 9).

- [ ] **Step 2: No hay commit en este paso** (es solo una captura de referencia local, no se toca el repo).

---

### Task 1: Cargar la fuente Inter y quitar Poppins/Quicksand del body

**Files:**
- Modify: `frontend/public/index.html:5`
- Modify: `frontend/src/index.css:5-8`

- [ ] **Step 1: Sustituir el `<link>` de Google Fonts**

En `frontend/public/index.html`, sustituir la línea:

```html
<link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@300..700&display=swap" rel="stylesheet">
```

por:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Cambiar la fuente del body en `index.css`**

En `frontend/src/index.css`, sustituir:

```css
@layer base {
  body {
    @apply font-['Poppins',_sans-serif];
  }
```

por:

```css
@layer base {
  body {
    @apply font-['Inter',_sans-serif];
  }
```

- [ ] **Step 3: Añadir tracking negativo a titulares**

En `frontend/src/index.css`, justo después del bloque `h1, h2, h3, h4, h5, h6 { text-wrap: balance; }` (línea 130-132), añadir:

```css
h1, h2, h3 {
  letter-spacing: -0.02em;
}
```

- [ ] **Step 4: Verificar visualmente**

Run: `cd frontend && npm start`
Expected: la Home carga en `localhost:3000` con la tipografía Inter visible en titulares y cuerpo de texto (compáralo con capturas previas si tienes alguna; visualmente debe verse una sans-serif más geométrica que antes). Ningún texto ha cambiado, solo la fuente.

- [ ] **Step 5: Commit**

```bash
git add frontend/public/index.html frontend/src/index.css
git commit -m "Cambia la tipografía global a Inter"
```

---

### Task 2: Refinar tokens de sombra y radio en Tailwind

**Files:**
- Modify: `frontend/tailwind.config.js`

- [ ] **Step 1: Añadir tokens de sombra suave**

En `frontend/tailwind.config.js`, dentro de `theme.extend`, después del bloque `borderRadius` (antes de `keyframes`), añadir:

```js
      boxShadow: {
        soft: "0 20px 40px -12px rgba(23, 42, 46, 0.12)",
        "soft-lg": "0 30px 60px -15px rgba(23, 42, 46, 0.18)",
      },
```

El archivo debe quedar así en esa zona:

```js
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        soft: "0 20px 40px -12px rgba(23, 42, 46, 0.12)",
        "soft-lg": "0 30px 60px -15px rgba(23, 42, 46, 0.18)",
      },
      keyframes: {
```

- [ ] **Step 2: Verificar que Tailwind compila**

Run: `cd frontend && npx tailwindcss -i ./src/index.css -o /tmp/tailwind-check.css --config tailwind.config.js`
Expected: el comando termina sin errores y genera `/tmp/tailwind-check.css`.

- [ ] **Step 3: Commit**

```bash
git add frontend/tailwind.config.js
git commit -m "Añade tokens de sombra suave (shadow-soft, shadow-soft-lg)"
```

---

### Task 3: Afinar el motion de AOS (scroll reveal más sutil)

**Files:**
- Modify: `frontend/src/HomePage.js:31-35,244-247`

- [ ] **Step 1: Unificar y suavizar la inicialización de AOS**

Hay dos `useEffect` que inicializan AOS por separado (líneas 31-35 y 244-247), uno de ellos condicionado a `window.innerWidth > 768`. Se deja un único `useEffect` con una configuración más suave (duración menor, easing explícito, offset para que la animación empiece un poco antes de entrar en viewport).

Sustituir el primer bloque:

```js
  useEffect(() => {
    if (window.innerWidth > 768) {
      AOS.init({ duration: 1200, once: true });
    }
  }, []);
```

por:

```js
  useEffect(() => {
    AOS.init({
      duration: 600,
      easing: 'ease-out-cubic',
      once: true,
      offset: 40,
      disable: window.innerWidth <= 480,
    });
  }, []);
```

Y eliminar el segundo bloque duplicado (líneas ~244-247):

```js
  // Inicializar AOS (sin llamadas a API que interfieren)
  useEffect(() => {
    AOS.init({ duration: 1200, once: true });
  }, []);

```

(se borra completo, ya que la inicialización única de arriba cubre el mismo propósito).

- [ ] **Step 2: Añadir `data-aos` a las secciones que aún no lo tengan**

Cada `<section>` de `HomePage.js` (franja de aviso, hero, stats, modalidades, funcionalidades, testimonios, quién hay detrás, planes, FAQ) debe llevar `data-aos="fade-up"` en su elemento raíz si no lo tiene ya. Ejemplo para la sección de stats (línea 650):

Antes:
```jsx
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-balance text-secondary">
            Elige tu modalidad de entrenamiento, mejora justo donde lo necesitas
          </h2>
```

Después:
```jsx
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20" data-aos="fade-up">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-balance text-secondary">
            Elige tu modalidad de entrenamiento, mejora justo donde lo necesitas
          </h2>
```

Aplicar el mismo patrón (añadir `data-aos="fade-up"` al `<section>` raíz, sin tocar el contenido interior) a todas las secciones listadas arriba que no lo tengan ya.

- [ ] **Step 3: Verificar visualmente**

Run: `cd frontend && npm start`
Expected: al hacer scroll por la Home, cada sección aparece con un fade-in + slide-up suave y rápido (no brusco), sin parpadeos ni animaciones que tarden más de medio segundo.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/HomePage.js
git commit -m "Afina el motion de scroll-reveal (AOS) en toda la Home"
```

---

### Task 4: Restilizar el Hero (tipografía, espaciado, sombras)

**Files:**
- Modify: `frontend/src/HomePage.js:513-627`

- [ ] **Step 1: Aumentar el peso y ajustar el tamaño del titular**

Línea 516-518, sustituir:

```jsx
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-balance text-secondary">
              Entrena el EIR como si ya estuvieras dentro del examen.
            </h1>
```

por:

```jsx
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight text-balance text-secondary">
              Entrena el EIR como si ya estuvieras dentro del examen.
            </h1>
```

- [ ] **Step 2: Suavizar el badge de countdown**

Línea 519, sustituir:

```jsx
            <div className="inline-flex items-center justify-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-5 py-2 text-sm font-medium text-secondary">
```

por:

```jsx
            <div className="inline-flex items-center justify-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-5 py-2 text-sm font-medium text-secondary shadow-soft">
```

- [ ] **Step 3: Dar más aire y sombra suave al bloque de vídeo/demo**

Línea 567, sustituir:

```jsx
                      className="relative w-full overflow-hidden rounded-3xl bg-card shadow-md hover:shadow-xl transition-all"
```

por:

```jsx
                      className="relative w-full overflow-hidden rounded-3xl bg-card shadow-soft hover:shadow-soft-lg transition-all duration-300"
```

Y en la línea 594 (contenedor del iframe cuando el vídeo ya está reproduciéndose), sustituir:

```jsx
                    <div className="relative w-full overflow-hidden rounded-3xl bg-card shadow-md">
```

por:

```jsx
                    <div className="relative w-full overflow-hidden rounded-3xl bg-card shadow-soft">
```

- [ ] **Step 4: Suavizar hover del CTA principal**

Línea 534-535, sustituir:

```jsx
                    className="w-full bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-full font-bold shadow-lg hover:shadow-xl transition-all text-base flex items-center justify-center gap-2 animate-pulse-subtle"
```

por:

```jsx
                    className="w-full bg-primary hover:bg-primary/90 hover:scale-[1.02] text-white px-8 py-4 rounded-full font-bold shadow-soft hover:shadow-soft-lg transition-all duration-300 text-base flex items-center justify-center gap-2"
```

(Se retira `animate-pulse-subtle` del CTA principal del hero porque un botón que pulsa constantemente no encaja con el tono "sutil y elegante" acordado; el énfasis pasa a un hover más marcado. Ver Task 7 para el resto de usos de `animate-pulse-subtle`.)

- [ ] **Step 5: Verificar visualmente**

Run: `cd frontend && npm start`
Expected: el hero se ve con un titular más grande y compacto, el badge y el bloque de vídeo tienen una sombra más difusa y elegante, y el botón principal crece ligeramente al hacer hover en vez de pulsar todo el rato. Ningún texto ha cambiado.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/HomePage.js
git commit -m "Restiliza el Hero: tipografía más grande, sombras suaves, hover refinado"
```

---

### Task 5: Añadir el carrusel de mockups flotante en el Hero

**Files:**
- Create: `frontend/src/components/HeroShowcase.jsx`
- Modify: `frontend/src/index.css` (nuevo keyframe de fade-in)
- Modify: `frontend/src/HomePage.js:561-563` (import + inserción en el hero)

- [ ] **Step 1: Crear el componente `HeroShowcase`**

Crear `frontend/src/components/HeroShowcase.jsx` con este contenido:

```jsx
import React, { useEffect, useState } from 'react';

const VIEWS = [
  { key: 'ia', label: 'Análisis IA', icon: '🤖', caption: 'Identifica qué fallaste y por qué' },
  { key: 'progreso', label: 'Progreso', icon: '📊', caption: 'Tu evolución semana a semana' },
  { key: 'examen', label: 'Examen en vivo', icon: '📝', caption: 'Simulacro cronometrado' },
];

function HeroShowcase() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive((i) => (i + 1) % VIEWS.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const view = VIEWS[active];

  return (
    <div
      className="absolute -top-6 -left-6 z-10 w-44 sm:w-52 rounded-2xl bg-card border border-border shadow-soft-lg p-4 hidden sm:block"
      aria-hidden="true"
    >
      <div key={view.key} className="hero-showcase-content space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{view.icon}</span>
          <span className="text-xs font-semibold text-secondary">{view.label}</span>
        </div>
        <div className="space-y-1.5">
          <div className="h-2 rounded-full bg-primary/15 relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-primary/60 rounded-full" style={{ width: '80%' }} />
          </div>
          <div className="h-2 rounded-full bg-primary/15 relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-primary/60 rounded-full" style={{ width: '55%' }} />
          </div>
          <p className="text-[11px] text-muted-foreground pt-1 leading-snug">{view.caption}</p>
        </div>
      </div>
      <div className="flex gap-1 justify-center mt-3">
        {VIEWS.map((v, idx) => (
          <span
            key={v.key}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === active ? 'w-4 bg-primary' : 'w-1.5 bg-primary/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default HeroShowcase;
```

Notas sobre este componente:
- Es puramente decorativo (`aria-hidden="true"`): no añade información nueva relevante para lectores de pantalla, solo refuerzo visual.
- Las 3 etiquetas (`label`) y las 3 descripciones (`caption`) son el único texto nuevo de todo este plan. Son cortas y reutilizan vocabulario ya presente en la página (análisis de errores, progreso, simulacro/examen cronometrado).
- Se oculta en mobile (`hidden sm:block`) para no saturar el hero en pantallas pequeñas, donde ya hay poco espacio.
- El `key={view.key}` en el contenedor interior fuerza el remount de ese nodo en cada rotación, lo que retrigguea la animación CSS `hero-showcase-content` definida en el Step 2.

- [ ] **Step 2: Añadir el keyframe de fade-in en `index.css`**

En `frontend/src/index.css`, después del bloque `.animate-pulse-subtle { ... }` (línea 113-115), añadir:

```css
@keyframes fade-in-showcase {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hero-showcase-content {
  animation: fade-in-showcase 0.5s ease-out;
}
```

- [ ] **Step 3: Insertar `HeroShowcase` en el Hero**

En `frontend/src/HomePage.js`, añadir el import junto al resto de imports de componentes (cerca de la línea 12):

```jsx
import HeroShowcase from './components/HeroShowcase';
```

Y en el hero, sustituir (línea 561-563):

```jsx
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-md">
                {!showHeroVideo ? (
```

por:

```jsx
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-md relative">
                <HeroShowcase />
                {!showHeroVideo ? (
```

(El resto del bloque del vídeo, líneas siguientes, no cambia — el carrusel queda superpuesto en la esquina superior izquierda del bloque de vídeo gracias a `relative` en el contenedor padre y `absolute` en `HeroShowcase`.)

- [ ] **Step 4: Verificar visualmente**

Run: `cd frontend && npm start`
Expected: en desktop/tablet (≥640px de ancho), aparece una pequeña card flotante en la esquina superior izquierda del bloque de vídeo del hero, que rota cada 3.5s entre "Análisis IA", "Progreso" y "Examen en vivo" con un fade-in suave. En mobile (<640px) la card no aparece. El vídeo del hero sigue funcionando exactamente igual (clic para reproducir).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/HeroShowcase.jsx frontend/src/index.css frontend/src/HomePage.js
git commit -m "Añade carrusel de mockups flotante (HeroShowcase) en el Hero"
```

---

### Task 6: Restilizar secciones de stats, modalidades y funcionalidades

**Files:**
- Modify: `frontend/src/HomePage.js:628-786`

- [ ] **Step 1: Homogeneizar el padding vertical hacia el valor mayor de cada rango**

Tres secciones usan un padding vertical más corto que el resto (`py-12` en vez de `py-16`/`py-20`+). Ajustarlas para dar más aire, sin tocar el contenido:

Línea 650:
```jsx
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
```
→
```jsx
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
```

Línea 662:
```jsx
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
```
→
```jsx
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
```

Línea 750:
```jsx
      <section id="modalidades" className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
```
→
```jsx
      <section id="modalidades" className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
```

- [ ] **Step 2: Sombra suave en el bloque de stats**

Línea 629, sustituir:

```jsx
        <div className="bg-gradient-to-br from-primary/10 to-accent/5 rounded-2xl border-2 border-primary/20 p-8 lg:p-12">
```

por:

```jsx
        <div className="bg-gradient-to-br from-primary/10 to-accent/5 rounded-2xl border border-primary/20 p-8 lg:p-12 shadow-soft">
```

- [ ] **Step 3: Cards de funcionalidades con sombra consistente**

Hay 6 cards idénticas en estructura (líneas 664, 678, 692, 706, 720, 734), todas con esta clase en el `<div>` raíz de la card:

```jsx
          <div className="rounded-xl border border-border hover:border-primary/50 transition-all shadow-md hover:shadow-xl bg-card p-6">
```

Sustituir **cada una de las 6 apariciones** por:

```jsx
          <div className="rounded-xl border border-border hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-soft bg-card p-6">
```

- [ ] **Step 4: Cards de modalidades con sombra y hover consistentes**

Línea 769-775, el div de cada modalidad tiene:

```jsx
              className={`flex flex-col items-center text-center gap-2 p-5 rounded-xl border-2 transition-all cursor-pointer group shadow-sm hover:shadow-md ${
                item.highlight
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border bg-card hover:border-primary/50'
              }`}
```

Sustituir por:

```jsx
              className={`flex flex-col items-center text-center gap-2 p-5 rounded-xl border-2 transition-all duration-300 hover:-translate-y-1 cursor-pointer group shadow-sm hover:shadow-soft ${
                item.highlight
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border bg-card hover:border-primary/50'
              }`}
```

- [ ] **Step 5: Verificar visualmente**

Run: `cd frontend && npm start`
Expected: las secciones tienen más aire vertical, y al pasar el ratón sobre las cards de funcionalidades y modalidades, se elevan ligeramente (`-translate-y-1`) con una sombra más difusa, con una transición de 300ms. El contenido y el texto de cada card es idéntico al actual.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/HomePage.js
git commit -m "Restiliza cards de stats, modalidades y funcionalidades con sombra y hover consistentes"
```

---

### Task 7: Restilizar testimonios, "quién hay detrás", planes y FAQ

**Files:**
- Modify: `frontend/src/HomePage.js:788-1088`

- [ ] **Step 1: Cards de "¿esto ayuda a aprobar?"**

Líneas 800, 805, 810, cada una:

```jsx
              <div className="bg-card border-2 border-border rounded-xl p-6 text-center space-y-3">
```

Sustituir las 3 apariciones por:

```jsx
              <div className="bg-card border border-border rounded-xl p-6 text-center space-y-3 shadow-sm hover:shadow-soft transition-shadow duration-300">
```

- [ ] **Step 2: Cards de testimonios**

Línea 856:

```jsx
                <div key={idx} className="flex-shrink-0 w-80 border border-border hover:border-primary/50 transition-all shadow-md hover:shadow-lg bg-card rounded-xl">
```

Sustituir por:

```jsx
                <div key={idx} className="flex-shrink-0 w-80 border border-border hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-soft bg-card rounded-xl">
```

- [ ] **Step 3: Bloque "quién hay detrás"**

Línea 878:

```jsx
        <div className="max-w-3xl mx-auto bg-card border-2 border-border rounded-2xl p-8 sm:p-10 flex flex-col sm:flex-row items-center gap-8 text-center sm:text-left">
```

Sustituir por:

```jsx
        <div className="max-w-3xl mx-auto bg-card border border-border rounded-2xl p-8 sm:p-10 flex flex-col sm:flex-row items-center gap-8 text-center sm:text-left shadow-soft">
```

- [ ] **Step 4: Cards de planes/precios**

Línea 911 (plan mensual):

```jsx
          <div className="bg-card border-2 border-border hover:border-primary/50 transition-all shadow-lg hover:shadow-xl rounded-xl p-8 space-y-6">
```

Sustituir por:

```jsx
          <div className="bg-card border-2 border-border hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-soft rounded-xl p-8 space-y-6">
```

Línea 955 (plan anual destacado):

```jsx
          <div className="bg-card border-2 border-primary relative shadow-xl hover:shadow-2xl transition-all bg-gradient-to-br from-card to-primary/5 rounded-xl p-8 pt-12 md:pt-8 space-y-6">
```

Sustituir por:

```jsx
          <div className="bg-card border-2 border-primary relative shadow-soft hover:shadow-soft-lg transition-all duration-300 bg-gradient-to-br from-card to-primary/5 rounded-xl p-8 pt-12 md:pt-8 space-y-6">
```

Los botones de ambos planes (líneas 947-952 y 1003-1008) usan `animate-pulse-subtle` en el botón del plan anual (línea 1005). Se retira ese `animate-pulse-subtle` por el mismo motivo que en el Task 4 (Step 4):

Línea 1005, sustituir:

```jsx
              className="w-full bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all text-white py-3 rounded-full font-bold animate-pulse-subtle"
```

por:

```jsx
              className="w-full bg-primary hover:bg-primary/90 hover:scale-[1.02] shadow-soft hover:shadow-soft-lg transition-all duration-300 text-white py-3 rounded-full font-bold"
```

- [ ] **Step 5: FAQ accordion**

Cada uno de los 6 bloques FAQ (líneas 1021, 1032, 1043, 1054, 1065, 1076) tiene:

```jsx
            <div className="border-2 border-border hover:border-primary/50 rounded-xl px-6 transition-all shadow-sm hover:shadow-md bg-card">
```

Sustituir **las 6 apariciones** por:

```jsx
            <div className="border border-border hover:border-primary/50 rounded-xl px-6 transition-all duration-300 shadow-sm hover:shadow-soft bg-card">
```

- [ ] **Step 6: Verificar visualmente**

Run: `cd frontend && npm start`
Expected: testimonios, bloque de fundadora, planes y FAQ se ven con bordes más finos, sombras suaves y consistentes con el resto de la página. Ningún texto, precio ni funcionalidad ha cambiado.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/HomePage.js
git commit -m "Restiliza testimonios, planes y FAQ con el mismo lenguaje de sombras y bordes"
```

---

### Task 8: Refinar navbar y footer

**Files:**
- Modify: `frontend/src/HomePage.js:406-487,1089-1141`

- [ ] **Step 1: Sombra más sutil en la navbar**

Línea 406:

```jsx
    <nav className="sticky top-0 z-50 border-b bg-secondary/95 backdrop-blur supports-[backdrop-filter]:bg-secondary/80 shadow-sm">
```

Sustituir por:

```jsx
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-secondary/95 backdrop-blur supports-[backdrop-filter]:bg-secondary/80 shadow-soft">
```

- [ ] **Step 2: Transición suave en los links de navegación**

Los links `Simulacro EIR`, `Precios`, `Blog` (líneas 415, 418, 421) tienen:

```jsx
className="text-sm font-medium text-white/80 hover:text-white transition-colors"
```

Sustituir las 3 apariciones (desktop) por:

```jsx
className="text-sm font-medium text-white/80 hover:text-white transition-colors duration-200"
```

(Solo se añade `duration-200` explícito; no se toca el texto ni el `href`.)

- [ ] **Step 3: Footer — separación y contraste**

Línea 1105:

```jsx
            <div className="border-t border-secondary-foreground/20 pt-8 space-y-4">
```

Sustituir por:

```jsx
            <div className="border-t border-secondary-foreground/10 pt-10 space-y-4">
```

- [ ] **Step 4: Verificar visualmente**

Run: `cd frontend && npm start`
Expected: navbar y footer mantienen exactamente el mismo contenido y enlaces, con una separación y sombra ligeramente más refinadas.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/HomePage.js
git commit -m "Refina navbar y footer con el nuevo lenguaje visual"
```

---

### Task 9: Verificación final de que no cambió copy ni funcionalidad

**Files:**
- No se modifican archivos de producto en esta tarea (solo verificación).

- [ ] **Step 1: Comparar el copy antes/después**

Run: `grep -oE '>[^<{}]{3,}<' frontend/src/HomePage.js | sort > /tmp/home-copy-after.txt && diff /tmp/home-copy-before.txt /tmp/home-copy-after.txt`
Expected: **sin diferencias** (el comando `diff` no debe imprimir nada). Si aparece alguna diferencia, hay que revisar qué Task la introdujo y revertir ese cambio de texto sin tocar el resto del styling.

- [ ] **Step 2: Comprobar que el proyecto compila sin errores**

Run: `cd frontend && CI=true npm run build`
Expected: build finaliza con `Compiled successfully` (o con únicamente los warnings que ya existían antes de este trabajo).

- [ ] **Step 3: Verificación manual end-to-end en el navegador**

Run: `cd frontend && npm start`

Recorrer manualmente, en desktop y en una vista mobile (DevTools responsive, ~375px de ancho):
- Hero: título, countdown, botones, vídeo demo.
- Franja de stats (+15.000 preguntas, etc.).
- Modalidades (7 modos) y funcionalidades (6 cards).
- Testimonios (scroll horizontal automático).
- Quién hay detrás.
- Planes: los dos botones deben seguir abriendo el flujo de Stripe (`handlePlanSelection`) — probarlo con un usuario logueado si es posible, o al menos confirmar que el click dispara la función sin error en consola.
- FAQ: los `<details>` abren y cierran correctamente.
- Login con Google (botón "Entrar en Simulia" / "Haz tu simulacro EIR") sigue funcionando sin cambios.

Expected: toda la funcionalidad existente (scroll a `#planes`, countdown en vivo, login, checkout, FAQ accordion) funciona exactamente igual que antes de este trabajo; solo cambia el aspecto visual.

- [ ] **Step 4: Commit final (si Step 1-3 no generaron cambios de código, este paso no aplica)**

Si alguna verificación anterior requirió un ajuste de código (por ejemplo, revertir un cambio de copy accidental), comitear ese ajuste puntual:

```bash
git add frontend/src/HomePage.js
git commit -m "Corrige regresión detectada en verificación final"
```

Si no hubo que tocar nada, no se crea commit en este paso.
