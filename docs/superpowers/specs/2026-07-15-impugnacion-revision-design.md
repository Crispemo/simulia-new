# Impugnación disponible en la pantalla de revisión

## Problema

Una usuaria reportó que, al revisar un examen ya finalizado ("modo revisión"), no
puede impugnar preguntas. La función de impugnación sí existe y funciona durante
el examen en curso (`exam.jsx`), pero nunca llegó a la pantalla de revisión
(`review.jsx`).

## Causa raíz

En `frontend/src/components/QuestionBox.js`, el bloque completo de botones de
acción (Impugnar + Marcar duda) está condicionado a `!isReviewMode`. Como
`review.jsx` siempre renderiza `QuestionBox` con `isReviewMode={true}`, ambos
botones quedan ocultos. Además, `review.jsx` define `handleImpugnar` como una
función vacía (no hace nada), y no tiene ni el estado ni el modal de
impugnación que sí existen en `exam.jsx`.

## Alcance

Solo se toca el frontend. El backend (`backend/routes/disputeRoutes.js`,
`POST /send-dispute`) ya acepta cualquier pregunta/motivo sin necesitar
cambios.

"Marcar duda" no se muestra en revisión (no aplica: el examen ya terminó).
Solo se habilita el botón "Impugnar".

## Diseño

### 1. `QuestionBox.js`

- Separar el bloque de botones en dos partes independientes:
  - El botón **Impugnar** se renderiza siempre (tanto en examen como en
    revisión).
  - El botón **Marcar duda** se sigue renderizando solo cuando
    `!isReviewMode`.
- Nueva prop opcional `disputedQuestions` (objeto `{ [indice]: true }`,
  default `{}`). Si `disputedQuestions[currentQuestion]` es `true`, el botón
  Impugnar se deshabilita y cambia su texto a "Impugnada ✓".
- `exam.jsx` no pasa esta prop, así que usa el default `{}` y su
  comportamiento actual no cambia.

### 2. `review.jsx`

- Nuevos estados: `isDisputing`, `disputeReason`, `disputedQuestions`
  (objeto), `disputeError` (string para mostrar error del envío).
- `handleImpugnar(index)` reemplaza al stub vacío: abre el modal
  (`setIsDisputing(true)`).
- `handleDisputeSubmit(index)` (nueva función): hace
  `POST ${API_URL}/send-dispute` con
  `{ question, reason: disputeReason, userAnswer }`, igual que
  `exam.jsx`.
  - Éxito: marca `disputedQuestions[index] = true`, cierra el modal, limpia
    `disputeReason` y `disputeError`.
  - Fallo (red o respuesta no-ok): setea `disputeError` con un mensaje
    breve ("No se pudo enviar la impugnación, inténtalo de nuevo") y deja el
    modal abierto con el botón activo para reintentar. Esto es una mejora
    respecto a `exam.jsx`, que hoy cierra el modal en silencio incluso si
    falla.
- Se pasa `disputedQuestions` a `QuestionBox`.
- Se añade el modal JSX (estructura igual a la de `exam.jsx`: overlay,
  botón de cierre, textarea ligado a `disputeReason`, botón "Enviar"), usando
  clases de `review.module.css`.

### 3. `review.module.css`

- Copiar las clases necesarias para el modal desde `exam.module.css`:
  `popupOverlay`, `disputeModal`, `modalCloseButton`, `disputeTextarea`,
  `modalActions`, `submitDisputeButton`.
- Adaptar las variantes de modo oscuro al patrón que ya usa este archivo
  (`.examContainer.dark .clase`), en vez del patrón `body.dark` /
  `body.dark-mode` usado en `exam.module.css`.

## Fuera de alcance

- No se persiste el estado de "impugnada" en base de datos ni en el backend;
  es solo estado de sesión en el frontend, igual que el resto de la lógica de
  impugnación existente. Si la usuaria recarga la página, el botón vuelve a
  estar disponible.
- No se modifica el backend ni el envío de email.
