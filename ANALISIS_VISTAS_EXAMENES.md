# Análisis de Vistas de Exámenes

## Resumen Ejecutivo

Este documento analiza cómo funcionan las 5 vistas principales de exámenes en la aplicación SIMULIA:
- `Exam.js` - Examen principal (simulacro, errores, protocolos, contrarreloj, quizz)
- `Protocolos.js` - Examen de protocolos
- `Aeleccion.js` - Examen personalizado (a elección)
- `Contrarreloj.js` - Examen contrarreloj
- `Personalizado.js` - Examen personalizado (legacy)

---

## 1. OBTENCIÓN DE PREGUNTAS

### 1.1 Endpoints del Backend

#### Exam.js
- **Endpoint principal**: `/random-question-completos` (POST)
  - Parámetros: `{ count: 200, examType: 'simulacro' | 'errores' | 'protocolos' | 'contrarreloj' | 'quizz' }`
  - Obtiene preguntas de la colección `examen_completos`
  
- **Endpoint secundario**: `/random-fotos` (POST)
  - Parámetros: `{ count: 10 }`
  - Obtiene preguntas con imágenes
  - Se combina con las preguntas normales para total de 210 preguntas

- **Caso especial - Errores**: 
  - NO usa endpoints del backend
  - Carga desde `localStorage.getItem('errorQuestions')`
  - Formato: `{ questions: [], timeAssigned: number }`

#### Protocolos.js
- **Endpoint**: `/random-questions` (POST)
  - Parámetros: `{ numPreguntas: 30, examType: 'protocolos' }`
  - Obtiene preguntas de la colección `examen_protocolos`
  - Siempre devuelve exactamente 30 preguntas

#### Aeleccion.js
- **Tipo "anteriores"**:
  - `/random-question-completos` (POST) - Preguntas normales
    - Parámetros: `{ count: numPreguntas - numPreguntasImagen, examType: 'anteriores', asignaturas: [] }`
  - `/random-fotos` (POST) - Preguntas con imagen
    - Parámetros: `{ count: numPreguntasImagen, asignaturas: [] }`
  
- **Tipo "protocolos"**:
  - `/random-questions` (POST)
    - Parámetros: `{ numPreguntas: numPreguntas, examType: 'protocolos' }`

#### Contrarreloj.js
- **Endpoint**: `/random-question-completos` (POST)
  - Parámetros: `{ count: 20, examType: 'contrarreloj' }`
  - Siempre 20 preguntas, sin imágenes

#### Personalizado.js
- **NO carga preguntas directamente**
- Recibe preguntas desde `sessionStorage.getItem('personalizadoState')`
- Formato: `{ questions: [], selectedAnswers: {}, userAnswers: [], timeLeft: number, totalTime: number }`

### 1.2 Formato de Preguntas

Todas las preguntas siguen un formato estándar:
```javascript
{
  _id: string,
  question: string,
  option_1: string,
  option_2: string,
  option_3: string,
  option_4: string,
  option_5?: string,
  answer: number | string,  // Respuesta correcta (1-5 o texto)
  subject: string,          // Asignatura
  categoria?: string,       // Alternativa a subject
  image?: string,          // Ruta a imagen si existe
  long_answer?: string,    // Respuesta larga/explicación
  exam_name?: string       // Nombre del examen original
}
```

---

## 2. GESTIÓN DE RESPUESTAS

### 2.1 Estructura de Datos

#### Estados Principales:
1. **`selectedAnswers`** (Object): 
   - Formato: `{ [questionIndex]: selectedOption }`
   - Usado para renderizado rápido en UI
   - Ejemplo: `{ 0: "Opción A", 5: "Opción C" }`

2. **`userAnswers`** (Array):
   - Formato nuevo (preferido):
     ```javascript
     [{
       questionId: string,
       selectedAnswer: string | number,
       isCorrect: boolean | null,
       markedAsDoubt: boolean,
       questionData: {
         question: string,
         option_1: string,
         option_2: string,
         option_3: string,
         option_4: string,
         option_5: string,
         answer: string | number,
         subject: string,
         image: string | null,
         long_answer: string
       }
     }]
     ```
   - Formato antiguo (legacy): Array simple de respuestas
   - Usado para guardado en backend

### 2.2 Manejo de Respuestas por Componente

#### Exam.js
- **`handleAnswerClick(questionId, selectedOption)`**:
  - Actualiza `selectedAnswers` para UI
  - Actualiza `userAnswers` con objeto completo
  - Calcula `isCorrect` comparando con `answer` o `correctAnswer`
  - Mantiene `questionData` completo para persistencia
  - Marca `hasPendingChanges = true`
  - Llama a `addToBatch('answer')` que dispara guardado debounced

#### Protocolos.js
- Similar a Exam.js pero con formato ligeramente diferente
- Usa `saveExamProgressLocal()` directamente

#### Aeleccion.js
- Actualiza ambos estados (`selectedAnswers` y `userAnswers`)
- Marca `hasPendingChanges = true`
- Guardado manual o periódico (no automático al responder)

#### Contrarreloj.js
- Actualiza `selectedAnswers` y `userAnswers`
- Guarda en `localStorage` inmediatamente
- NO guarda automáticamente en backend (optimizado para velocidad)

#### Personalizado.js
- Actualiza ambos estados
- Guardado periódico cada 30 segundos

---

## 3. GUARDADO DE EXÁMENES

### 3.1 Endpoints del Backend

#### Guardado de Progreso (En Curso)
- **Endpoint**: `/validate-and-save-exam-in-progress` (POST)
  - Usado por: Exam.js, Protocolos.js, Aeleccion.js, Contrarreloj.js
  - Parámetros:
    ```javascript
    {
      userId: string,
      examData: {
        type: string,
        questions: Array,
        userAnswers: Array,
        selectedAnswers: Object,
        timeLeft: number,
        currentQuestion: number,
        markedAsDoubt: Object,
        timeUsed: number,
        totalTime: number,
        status: 'in_progress' | 'paused',
        totalQuestions: number,
        examId?: string  // Si existe, actualiza; si no, crea nuevo
      }
    }
    ```
  - Retorna: `{ success: true, examId: string }`

#### Finalización de Examen
- **Endpoint**: `/validate-and-save-exam` (POST)
  - Usado por: Todos los componentes al finalizar
  - Parámetros similares pero con `completed: true` y `status: 'completed'`
  - Valida respuestas y calcula puntuación
  - Retorna: `{ examId: string, results: { correct, incorrect, blank, score } }`

### 3.2 Utilidades Centralizadas

#### `lib/examUtils.js`

**`saveExamProgress()`**:
- Función centralizada para guardar progreso
- Maneja detección de entorno (producción/desarrollo)
- Formatea datos antes de enviar
- Maneja timeouts y errores

**`finalizeExam()`**:
- Función centralizada para finalizar examen
- Valida datos antes de enviar
- Calcula estadísticas
- Maneja redirección después de finalizar

**`resumeExam()`**:
- Recupera examen en progreso
- Endpoint: `/get-exam-progress/${userId}`
- Retorna: `{ progress: { questions, userAnswers, timeLeft, ... } }`

### 3.3 Estrategias de Guardado

#### Exam.js
- **Debounced save**: Guarda 3 segundos después del último cambio
- **Guardado periódico**: Cada 60 segundos si hay cambios pendientes
- **Guardado manual**: Botón "Guardar" en header
- **Guardado antes de salir**: `beforeunload` event

#### Protocolos.js
- Similar a Exam.js
- Guardado inmediato al pausar

#### Aeleccion.js
- Guardado manual o periódico
- Guardado antes de salir

#### Contrarreloj.js
- Guardado optimizado (menos frecuente)
- Guardado en localStorage inmediato
- Guardado en backend menos frecuente

#### Personalizado.js
- Guardado periódico cada 30 segundos
- Guardado antes de salir

---

## 4. PAUSA Y REANUDACIÓN

### 4.1 Estados de Pausa

Todos los componentes usan:
- **`isPaused`** o **`paused`**: Boolean que controla si el cronómetro está pausado
- **`hasStarted`**: Boolean que indica si el examen ha comenzado

### 4.2 Lógica de Pausa

#### Inicio Siempre Pausado
```javascript
const [isPaused, setIsPaused] = useState(true);
const [hasStarted, setHasStarted] = useState(false);
```

#### Popup de Inicio
- Mientras `showStartPopup === true`, el examen está pausado
- Al hacer click en "Estoy list@", se cierra el popup y se inicia el cronómetro

#### Botón de Pausa
- **Exam.js**: `handlePause()` - Toggle simple, guarda estado
- **Protocolos.js**: `handlePause()` - Toggle + guardado + opción de volver al dashboard
- **Contrarreloj.js**: NO permite pausar (muestra alerta)
- **Aeleccion.js**: Toggle simple
- **Personalizado.js**: Toggle simple

### 4.3 Guardado al Pausar

Cuando se pausa, se guarda el estado:
```javascript
saveExamProgressLocal(false, true, 'paused')
// Parámetros: isCompleted, forcePauseState, forceStatus
```

---

## 5. DESCARGA DE PDF

### 5.1 Función Principal

**`lib/pdfUtils.js`** - `downloadExamPdfFromData()`

### 5.2 Uso en Componentes

Todos los componentes usan el mismo patrón:
```javascript
onDownload={() => downloadExamPdfFromData({
  questions: questions,
  title: 'SIMULIA',
  subtitle: `Examen: ${examType.toUpperCase()}`,
  logoUrl: '/Logo_oscuro.png',
  examId: examId || '',
  date: new Date().toISOString().slice(0,10),
  durationMin: Math.round(totalTime / 60),
  showAnswerKey: false,
  showBubbleSheet: true,
  fileName: `examen-${examType}.pdf`
})}
```

### 5.3 Generación de PDF

La función `generateExamPdfSimulia()`:
1. Crea documento jsPDF con formato A4
2. Dibuja header con logo y metadata
3. Añade watermark "SIMULIA"
4. Renderiza preguntas en 2 columnas
5. Maneja imágenes si existen
6. Añade numeración de páginas
7. Descarga el archivo

---

## 6. IMPUGNACIÓN DE PREGUNTAS

### 6.1 Endpoint del Backend

**`/send-dispute`** (POST)
```javascript
{
  question: string,
  reason: string,
  userAnswer: string | object,
  userId: string
}
```

### 6.2 Implementación

Todos los componentes siguen el mismo patrón:

1. **Estado**:
   ```javascript
   const [isDisputing, setIsDisputing] = useState(false);
   const [disputeReason, setDisputeReason] = useState('');
   ```

2. **Abrir modal**:
   ```javascript
   const handleImpugnar = () => setIsDisputing(true);
   ```

3. **Enviar impugnación**:
   ```javascript
   const handleDisputeSubmit = async (questionId) => {
     const disputeData = {
       question: questions[questionId]?.question,
       reason: disputeReason,
       userAnswer: userAnswers[questionId] || selectedAnswers[questionId],
       userId: userId
     };
     
     await fetch(`${API_URL}/send-dispute`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(disputeData)
     });
     
     // Cerrar modal siempre
     setIsDisputing(false);
     setDisputeReason('');
   };
   ```

4. **Modal UI**:
   - Overlay con textarea para razón
   - Botón de enviar
   - Botón de cerrar (×)

---

## 7. MARCAR COMO DUDA

### 7.1 Estado

```javascript
const [markedAsDoubt, setMarkedAsDoubt] = useState({});
// Formato: { [questionIndex]: true }
```

### 7.2 Función Toggle

```javascript
const toggleDoubtMark = (questionIndex) => {
  setMarkedAsDoubt(prev => ({
    ...prev,
    [questionIndex]: !prev[questionIndex]
  }));
  
  // También actualizar en userAnswers
  setUserAnswers(prev => {
    const newAnswers = [...prev];
    if (newAnswers[questionIndex]) {
      newAnswers[questionIndex].markedAsDoubt = !markedAsDoubt[questionIndex];
    }
    return newAnswers;
  });
  
  // Marcar cambios pendientes
  setHasPendingChanges(true);
};
```

### 7.3 Visualización

- En `Pagination` component: Preguntas marcadas como duda se muestran con color diferente
- En `QuestionBox`: Indicador visual de duda

---

## 8. FINALIZACIÓN DE EXÁMENES

### 8.1 Flujo de Finalización

1. **Usuario hace click en "Finalizar"**
   - Se muestra popup de confirmación
   - Muestra número de preguntas respondidas

2. **Usuario confirma**
   - Se llama a `confirmFinalize()`
   - Se previenen guardados automáticos: `setIsSubmitted(true)`
   - Se guardan cambios pendientes primero

3. **Llamada a `finalizeExam()`**
   - Formatea datos finales
   - Envía a `/validate-and-save-exam`
   - Backend valida respuestas y calcula puntuación

4. **Redirección**
   - Si hay `examId`, redirige a `/review/${examId}`
   - Si no, redirige a `/dashboard`

### 8.2 Implementación por Componente

#### Exam.js
```javascript
const confirmFinalize = async () => {
  setIsSubmitted(true);
  setIsSaving(true);
  
  // Guardar cambios pendientes primero
  if (hasPendingChanges) {
    await saveExamProgressLocal(false);
  }
  
  const result = await finalizeExam(
    effectiveUserId,
    getExamType(examMode),
    questions,
    userAnswers,
    selectedAnswers,
    timeUsedValue,
    totalTime,
    markedAsDoubt,
    examId
  );
  
  // Redirigir después de 2 segundos
  setTimeout(() => {
    navigate(`/review/${result.examId}`);
  }, 2000);
};
```

#### Protocolos.js
- Similar a Exam.js
- Tipo fijo: 'protocolos'

#### Aeleccion.js
- Similar a Exam.js
- Tipo: 'personalizado'
- Limpia `sessionStorage`

#### Contrarreloj.js
- Similar a Exam.js
- Tipo: 'contrarreloj'
- Tiempo fijo: 840 segundos (14 minutos)

#### Personalizado.js
- Implementación legacy diferente
- Valida respuestas antes de guardar
- No usa `finalizeExam()` centralizado

---

## 9. RESTAURACIÓN DE EXÁMENES

### 9.1 Función `resumeExam()`

Todos los componentes (excepto Personalizado.js) usan:
```javascript
const resumeExam = async () => {
  const data = await resumeExamUtil(userId);
  
  if (!data || !data.progress) {
    return false; // No hay progreso para restaurar
  }
  
  // Restaurar preguntas
  setQuestions(data.progress.questions);
  
  // Restaurar respuestas
  setUserAnswers(data.progress.userAnswers);
  setSelectedAnswers(data.progress.selectedAnswers);
  
  // Restaurar tiempo
  setTimeLeft(data.progress.timeLeft);
  setTotalTime(data.progress.totalTime);
  
  // Restaurar posición
  setCurrentQuestion(data.progress.currentQuestion);
  
  // Restaurar dudas
  setMarkedAsDoubt(data.progress.markedAsDoubt);
  
  // Restaurar ID
  setExamId(data.progress.examId || data.progress._id);
  
  return true;
};
```

### 9.2 Lógica de Restauración

En `useEffect` inicial:
```javascript
useEffect(() => {
  if (userId) {
    resumeExam()
      .then(progressRestored => {
        if (!progressRestored || !questions || questions.length === 0) {
          loadQuestions(); // Cargar nuevas si no hay progreso
        } else {
          setShowStartPopup(false); // Omitir popup si se restaura
        }
      });
  } else {
    loadQuestions(); // Cargar nuevas si no hay userId
  }
}, [examMode]);
```

---

## 10. DIFERENCIAS CLAVE ENTRE COMPONENTES

### Exam.js
- **Más completo**: Maneja múltiples tipos de examen
- **Guardado más sofisticado**: Debounced + periódico
- **Restauración robusta**: Maneja múltiples formatos de datos antiguos
- **Carga desde localStorage** para tipo 'errores'

### Protocolos.js
- **Especializado**: Solo protocolos
- **30 preguntas fijas**
- **30 minutos fijos**
- **Guardado similar a Exam.js**

### Aeleccion.js
- **Configuración previa**: Usuario selecciona tipo, número de preguntas, asignaturas
- **Multi-paso**: Wizard de configuración antes del examen
- **Guardado menos frecuente**: Optimizado para no interrumpir

### Contrarreloj.js
- **Sin pausa**: No permite pausar
- **20 preguntas, 14 minutos**
- **Guardado optimizado**: Menos frecuente para no afectar velocidad
- **localStorage adicional**: Guarda respuestas localmente

### Personalizado.js
- **Legacy**: Implementación más antigua
- **SessionStorage**: Usa sessionStorage en lugar de backend
- **No restaura**: No tiene lógica de restauración
- **Validación manual**: Valida respuestas antes de guardar

---

## 11. PATRONES COMUNES

### 11.1 Estructura de Estados
```javascript
// Estados principales (todos los componentes)
const [questions, setQuestions] = useState([]);
const [timeLeft, setTimeLeft] = useState(initialTime);
const [isPaused, setIsPaused] = useState(true);
const [hasStarted, setHasStarted] = useState(false);
const [currentQuestion, setCurrentQuestion] = useState(0);
const [selectedAnswers, setSelectedAnswers] = useState({});
const [userAnswers, setUserAnswers] = useState([]);
const [markedAsDoubt, setMarkedAsDoubt] = useState({});
const [examId, setExamId] = useState(null);
const [showStartPopup, setShowStartPopup] = useState(true);
const [showFinalizePopup, setShowFinalizePopup] = useState(false);
```

### 11.2 Componentes Compartidos
- **`ExamHeader`**: Header con tiempo, botones de pausa/guardar/finalizar/descargar
- **`QuestionBox`**: Renderiza pregunta actual con opciones
- **`Pagination`**: Navegación entre preguntas con estados visuales
- **`SuccessNotification`**: Notificaciones de éxito

### 11.3 Utilidades Compartidas
- **`lib/examUtils.js`**: Funciones centralizadas para guardado y finalización
- **`lib/pdfUtils.js`**: Generación de PDFs
- **`config.js`**: Configuración de API_URL según entorno

---

## 12. RECOMENDACIONES

### 12.1 Unificación
- Considerar unificar la lógica de guardado en todos los componentes
- Usar siempre `saveExamProgress()` y `finalizeExam()` de `examUtils.js`
- Estandarizar formato de `userAnswers` en todos los componentes

### 12.2 Optimizaciones
- Reducir frecuencia de guardado en componentes que no lo necesitan
- Implementar batching más agresivo para múltiples cambios rápidos
- Considerar usar Web Workers para guardado asíncrono

### 12.3 Mejoras
- Añadir indicador visual de "guardando..."
- Mejorar manejo de errores de red
- Implementar retry automático para guardados fallidos
- Añadir validación de datos antes de enviar al backend

---

## 13. ENDPOINTS DEL BACKEND

### Resumen de Endpoints Usados

1. **`POST /random-question-completos`**: Obtener preguntas normales
2. **`POST /random-fotos`**: Obtener preguntas con imágenes
3. **`POST /random-questions`**: Obtener preguntas (protocolos)
4. **`POST /validate-and-save-exam-in-progress`**: Guardar progreso
5. **`POST /validate-and-save-exam`**: Finalizar examen
6. **`GET /get-exam-progress/:userId`**: Obtener examen en progreso
7. **`POST /send-dispute`**: Enviar impugnación

---

## CONCLUSIÓN

Las vistas de exámenes comparten una estructura similar pero tienen diferencias importantes en:
- Cómo obtienen las preguntas
- Frecuencia de guardado
- Manejo de pausa
- Restauración de progreso

La mayoría usa las utilidades centralizadas (`examUtils.js`), pero algunos componentes (especialmente `Personalizado.js`) tienen implementaciones legacy que deberían migrarse.

