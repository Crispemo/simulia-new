# Prompts de imagen para el blog de Simulia

Basados en el estilo de referencia (ilustración plana tipo cómic, líneas
gruesas negras, enfermera en su escritorio con dos portátiles y carteles
de contexto), pero modernizados con la paleta de marca de Simulia y con
la piel de la enfermera en tonos humanos naturales (no verde/salvia).

Genera cada imagen con el **prompt base** + el **prompt específico** del
post. Tamaño recomendado: 1600×720 (ratio hero blog, 2.2:1). Formato PNG.

## Personaje de referencia (YA GENERADO — usar tal cual desde el post 7)

Las imágenes de los posts 1 (Preparar_EIR.png), 3 (Especialidad_EIR.png) y
6 (Errores_EIR.png) ya están generadas y fijan al personaje definitivo.
**A partir del post 7, adjunta una de esas 3 imágenes como referencia
visual/imagen base en el generador** (image-to-image o "character
reference") además del prompt de texto, para que la cara, el pelo y el
tono de piel no varíen entre posts. Si el generador no admite imagen de
referencia, usa esta descripción exacta del personaje en todos los
prompts:

```
Young female nurse, pale natural human skin tone (light warm beige,
NOT tan, NOT green, NOT blue-tinted), straight black hair worn in a
low ponytail with a center part, soft rounded face, thin black
eyebrows, simple dot-and-line eyes in the flat-vector style. Wears a
sage-teal (#7ea0a7) v-neck scrub top with a small rectangular ID
badge on the left chest and a slightly darker teal trim on the
sleeves. Same exact character in every illustration, only her pose,
expression and props change per scene.
```

## Prompt base (pegar siempre delante del específico)

```
Flat vector illustration, modern editorial style, thick clean black
outlines (3-4px), minimal cel-shading, no gradients. Color palette
restricted to: cream/off-white background (#fbf8f2), deep teal
(#3e5055) for dark elements, text and outlines-fill, sage teal
(#7ea0a7) as the main accent color (clothing, highlights, sign
borders, icon circles), soft coral red (#e57373) used sparingly as a
small highlight only. [INSERT CHARACTER REFERENCE ABOVE HERE]. Scene
includes small symbolic props relevant to the topic. Flat geometric
shapes, slightly retro poster-like composition, generous negative
space, no text rendered inside the illustration itself (title boxes
must stay empty or use placeholder lines, not real letters).
Square/rounded-square frame elements allowed for side "poster"
callouts, matching the reference layout of stacked laptops + nurse
desk scene. High resolution, clean vector edges, no photographic
textures, no noise.
```

## Notas de consistencia

- La enfermera debe ser **el mismo personaje exacto** que en los posts
  1, 3 y 6 (piel clara natural, pelo negro liso en coleta baja, scrub
  teal con placa) — no volver a improvisar tono de piel ni peinado.
- Los carteles/recuadros laterales usan el mismo borde negro grueso
  pero con fondo crema y texto simulado (líneas, no letras reales), o
  con texto real corto si el generador lo respeta bien (como en las 3
  imágenes ya generadas, que sí incluyen texto legible).
- Evita el rojo salvo como acento puntual (ej. una alerta, un error
  marcado) — el protagonismo cromático es el teal de marca.

---

## 1. Preparar_EIR.png — "¿Cómo preparar el EIR con Simulia?"

```
STYLE LOCK: flat vector illustration / cartoon drawing in the exact style of the reference images — thick black outlines, flat cel-shaded color fills. This is NOT a photo, NOT photorealistic, NOT 3D render, NOT painterly. 

Scene: the nurse sits at a desk with an open laptop showing a simple
progress checklist (flat UI, no real text), next to a stack of books
and a cup of coffee. Her expression is calm and determined, pen in
hand ticking a checkbox. Side poster callout reads (as blank lined
placeholder) "PLAN DE ESTUDIO". Small Simulia-style accent shape
(rounded teal badge) in a corner suggesting an app/platform.
```

## 3. Especialidad_EIR.png — "Especialidades EIR: ¿Cuál elegir?"

```
STYLE LOCK: flat vector illustration / cartoon drawing in the exact style of the reference images — thick black outlines, flat cel-shaded color fills. This is NOT a photo, NOT photorealistic, NOT 3D render, NOT painterly. 

Scene: the nurse stands centered with a thought bubble split into
three simple icon options (a heart for cardiology, a baby bottle for
pediatrics, a brain for mental health) rendered as flat teal icons in
rounded cream badges, as if choosing between paths. Two small signpost
arrows behind her pointing in different directions.
```

## 4. Que_es_EIR.png — "¿Qué es el EIR? Descubre cómo avanzar en tu carrera"

```
STYLE LOCK: flat vector illustration / cartoon drawing in the exact style of the reference images — thick black outlines, flat cel-shaded color fills. This is NOT a photo, NOT photorealistic, NOT 3D render, NOT painterly. 

Scene: the nurse stands proudly in scrubs holding a rolled diploma/
certificate tied with a teal ribbon, a rising staircase made of flat
geometric blocks behind her suggesting career progression, small
nurse badge pin on her chest.
```

## 6. Errores_EIR.png — "Errores comunes al preparar el EIR y cómo evitarlos"

```
STYLE LOCK: flat vector illustration / cartoon drawing in the exact style of the reference images — thick black outlines, flat cel-shaded color fills. This is NOT a photo, NOT photorealistic, NOT 3D render, NOT painterly. 

Scene: matches the original reference almost exactly — the nurse sits
at a desk between two open laptops, writing worriedly in a notebook.
Left poster callout: "SIMULACROS EIR". Right poster callout: "ERRORES
COMUNES". Keep this one closest to the reference composition since it
IS the reference image; just update the palette to the modernized
brand colors and natural skin tone.
```

## 7. Merece_pena_EIR.png — "¿Merece la pena hacer el EIR? Pros, contras y cómo decidir"

```
STYLE LOCK: flat vector illustration / cartoon drawing in the exact style of the reference images — thick black outlines, flat cel-shaded color fills. This is NOT a photo, NOT photorealistic, NOT 3D render, NOT painterly. 

Scene: the nurse sits on a giant flat balance scale illustrated in
teal outlines, one side slightly higher than the other, holding a
clipboard, weighing a decision. Small plus/minus flat icons floating
on each side of the scale.
```

## 8. Salario_enfermeria.png — "Salario de enfermería en España, con y sin especialidad EIR"

```
STYLE LOCK: flat vector illustration / cartoon drawing in the exact style of the reference images — thick black outlines, flat cel-shaded color fills. This is NOT a photo, NOT photorealistic, NOT 3D render, NOT painterly. 

Scene: the nurse stands next to two simple flat bar-chart columns of
different heights (teal and cream with black outline), one labeled
with a small coin icon, comparing figures with a satisfied/curious
expression. A euro coin icon floats near her hand.
```

## 9. Enfermera_sin_especialidad.png — "Trabajar de enfermera sin especialidad EIR: opciones reales"

```
STYLE LOCK: flat vector illustration / cartoon drawing in the exact style of the reference images — thick black outlines, flat cel-shaded color fills. This is NOT a photo, NOT photorealistic, NOT 3D render, NOT painterly. 

Scene: the nurse stands at a crossroads made of flat paths/roads,
three simple signposts ahead (hospital cross icon, home-care house
icon, private clinic building icon), confident walking pose, looking
forward at the options.
```

## 10. Plazas_EIR_comunidad.png — "Plazas EIR por especialidad y comunidad autónoma"

```
STYLE LOCK: flat vector illustration / cartoon drawing in the exact style of the reference images — thick black outlines, flat cel-shaded color fills. This is NOT a photo, NOT photorealistic, NOT 3D render, NOT painterly. 

Scene: the nurse stands next to a simplified flat map silhouette of
Spain divided into a few teal/cream regions, pinning a small flat
location marker on it, clipboard in the other hand.
```

## 11. Calendario_EIR.png — "Calendario de la convocatoria EIR: paso a paso"

```
STYLE LOCK: flat vector illustration / cartoon drawing in the exact style of the reference images — thick black outlines, flat cel-shaded color fills. This is NOT a photo, NOT photorealistic, NOT 3D render, NOT painterly. 

Scene: the nurse points at a large wall calendar rendered in flat
style with a few dates circled in coral red, checklist items beside
it, one hand holding a pen mid-circle-drawing motion.
```

## 12. academia-eir-vs-cuenta.png — "Academia EIR vs. preparación por tu cuenta: cómo decidir"

```
STYLE LOCK: flat vector illustration / cartoon drawing in the exact style of the reference images — thick black outlines, flat cel-shaded color fills. This is NOT a photo, NOT photorealistic, NOT 3D render, NOT painterly. 

Scene: split composition — on one side the nurse studies alone at a
minimalist desk with a single laptop; mirrored on the other side (same
character, symmetrical pose) she sits in a small flat classroom icon
setting with a teal presentation board. A thin dashed vertical line
divides both halves.
```

## 13. elegir-academia-eir.png — "Cómo elegir academia EIR: criterios reales para comparar"

```
STYLE LOCK: flat vector illustration / cartoon drawing in the exact style of the reference images — thick black outlines, flat cel-shaded color fills. This is NOT a photo, NOT photorealistic, NOT 3D render, NOT painterly. 

Scene: the nurse holds a flat clipboard with a simple checklist of 3-4
blank lined criteria, checking items with a pencil, small magnifying
glass icon overlapping the clipboard corner to suggest comparison.
```

## 14. manuales-eir-gratis-pdf.png — "Manuales EIR gratis en PDF: qué encontrarás y cómo usarlos"

```
STYLE LOCK: flat vector illustration / cartoon drawing in the exact style of the reference images — thick black outlines, flat cel-shaded color fills. This is NOT a photo, NOT photorealistic, NOT 3D render, NOT painterly. 

Scene: the nurse holds an open flat-style tablet/laptop displaying a
simple document icon with a download arrow, a small stack of flat
book icons beside her on the desk, relaxed reading posture.
```

## 15. plan-estudio-eir.png — "Plan de estudio EIR: cómo organizar tu preparación mes a mes"

```
STYLE LOCK: flat vector illustration / cartoon drawing in the exact style of the reference images — thick black outlines, flat cel-shaded color fills. This is NOT a photo, NOT photorealistic, NOT 3D render, NOT painterly. 

Scene: the nurse stands beside a flat wall planner with a simple
month-by-month grid (teal outlined boxes, a few filled cream/teal
blocks suggesting scheduled tasks), pointing at one column with a
ruler in hand.
```

## 16. banco-preguntas-eir.png — "Banco de preguntas del EIR: convocatorias anteriores resueltas"

```
STYLE LOCK: flat vector illustration / cartoon drawing in the exact style of the reference images — thick black outlines, flat cel-shaded color fills. This is NOT a photo, NOT photorealistic, NOT 3D render, NOT painterly. 

Scene: the nurse sits with a stack of flat flashcard-style question
cards fanned in her hand (each card just a rounded rectangle with a
small "?" glyph, not real text), thoughtful expression, one card
floating mid-air as if being reviewed.
```
