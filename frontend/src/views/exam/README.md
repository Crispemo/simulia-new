# Vista de Examen Reutilizable

Esta es una vista reutilizable para exámenes que se adapta a diferentes tipos de exámenes (simulacro, protocolos, contrarreloj, etc.).

## Características

- ✅ Diseño moderno basado en las especificaciones
- ✅ CSS Modules para estilos encapsulados
- ✅ Soporte para modo oscuro
- ✅ Responsive design
- ✅ Reutilizable para diferentes tipos de exámenes
- ✅ Integración con componentes existentes (QuestionBox, Pagination)

## Uso Básico

```jsx
import ExamView from './views/exam/exam';
import { downloadExamPdfFromData } from './lib/pdfUtils';
import { saveExamProgress, finalizeExam } from './lib/examUtils';

function MyExamComponent() {
  const [questions, setQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(16200); // 4h 30min
  const [isPaused, setIsPaused] = useState(false);
  
  const handleAnswerClick = (questionId, selectedOption) => {
    // Tu lógica para manejar respuestas
  };

  const handleSave = async () => {
    await saveExamProgress(
      userId,
      examId,
      'simulacro',
      questions,
      userAnswers,
      selectedAnswers,
      timeLeft,
      currentQuestion,
      markedAsDoubt,
      timeUsed,
      totalTime,
      false,
      'in_progress'
    );
  };

  const handleFinalize = async () => {
    const result = await finalizeExam(
      userId,
      'simulacro',
      questions,
      userAnswers,
      selectedAnswers,
      timeUsed,
      totalTime,
      markedAsDoubt,
      examId
    );
    
    if (result.examId) {
      navigate(`/review/${result.examId}`);
    }
  };

  return (
    <ExamView
      questions={questions}
      userAnswers={userAnswers}
      handleAnswerClick={handleAnswerClick}
      markedAsDoubt={markedAsDoubt}
      toggleDoubtMark={toggleDoubtMark}
      onSave={handleSave}
      onFinalize={handleFinalize}
      onPause={() => setIsPaused(!isPaused)}
      onDownload={() => downloadExamPdfFromData({
        questions: questions,
        title: 'SIMULIA',
        subtitle: 'Examen: SIMULACRO',
        logoUrl: '/Logo_oscuro.png',
        examId: examId || '',
        date: new Date().toISOString().slice(0,10),
        durationMin: Math.round(totalTime / 60),
        showAnswerKey: false,
        showBubbleSheet: true,
        fileName: 'examen-simulacro.pdf'
      })}
      onExit={() => navigate('/dashboard')}
      timeLeft={timeLeft}
      totalTime={totalTime}
      isPaused={isPaused}
      isSaving={isSaving}
      hasPendingChanges={hasPendingChanges}
      examType="simulacro"
      isDarkMode={isDarkMode}
    />
  );
}
```

## Ejemplo: Examen de Protocolos

```jsx
<ExamView
  questions={questions}
  userAnswers={userAnswers}
  handleAnswerClick={handleAnswerClick}
  markedAsDoubt={markedAsDoubt}
  toggleDoubtMark={toggleDoubtMark}
  onSave={handleSave}
  onFinalize={handleFinalize}
  onPause={handlePause}
  onDownload={handleDownload}
  timeLeft={1800} // 30 minutos
  totalTime={1800}
  isPaused={paused}
  examType="protocolos"
  disabledButtons={[]}
  isDarkMode={isDarkMode}
/>
```

## Ejemplo: Examen Contrarreloj

```jsx
<ExamView
  questions={questions}
  userAnswers={userAnswers}
  handleAnswerClick={handleAnswerClick}
  markedAsDoubt={markedAsDoubt}
  toggleDoubtMark={toggleDoubtMark}
  onSave={handleSave}
  onFinalize={handleFinalize}
  onDownload={handleDownload}
  timeLeft={840} // 14 minutos
  totalTime={840}
  isPaused={false}
  examType="contrarreloj"
  disabledButtons={['pause']} // No permite pausar
  showTimeBar={true}
  timePerQuestion={40}
  onTimeUp={handleTimeUp}
  isDarkMode={isDarkMode}
/>
```

## Ejemplo: Modo Revisión

```jsx
<ExamView
  questions={questions}
  userAnswers={userAnswers}
  handleAnswerClick={handleAnswerClick}
  markedAsDoubt={markedAsDoubt}
  toggleDoubtMark={toggleDoubtMark}
  onDownload={handleDownload}
  examType="simulacro"
  isReviewMode={true}
  correctAnswersMap={correctAnswersMap}
  answerIsCorrect={(index) => questions[index]?.isCorrect === true}
  justification={currentQuestion?.long_answer || currentQuestion?.explanation}
  isDarkMode={isDarkMode}
/>
```

## Props

### Props Requeridas
- `questions`: Array de preguntas
- `userAnswers`: Array de respuestas del usuario
- `handleAnswerClick`: Función para manejar clic en respuesta
- `toggleDoubtMark`: Función para marcar/desmarcar duda

### Props Opcionales
- `markedAsDoubt`: Object con preguntas marcadas como duda (default: {})
- `onSave`: Función para guardar progreso
- `onFinalize`: Función para finalizar examen
- `onPause`: Función para pausar/reanudar
- `onDownload`: Función para descargar PDF
- `onExit`: Función para salir (default: navega a /dashboard)
- `timeLeft`: Tiempo restante en segundos (default: 0)
- `totalTime`: Tiempo total en segundos (default: 0)
- `isPaused`: Si está pausado (default: false)
- `isSaving`: Si se está guardando (default: false)
- `hasPendingChanges`: Si hay cambios pendientes (default: false)
- `examType`: Tipo de examen (default: 'simulacro')
- `isReviewMode`: Si está en modo revisión (default: false)
- `correctAnswersMap`: Mapa de respuestas correctas (default: {})
- `answerIsCorrect`: Función para verificar si respuesta es correcta (default: null)
- `justification`: Texto de justificación para modo revisión (default: null)
- `showTimeBar`: Mostrar barra de tiempo por pregunta (default: false)
- `timePerQuestion`: Tiempo por pregunta en segundos (default: 40)
- `onTimeUp`: Callback cuando se acaba el tiempo (default: null)
- `disabledButtons`: Array de botones a deshabilitar ['pause', 'save', 'download'] (default: [])
- `isDarkMode`: Si está en modo oscuro (default: false)

## Adaptación a Diferentes Tipos de Exámenes

La vista se adapta automáticamente según el `examType`:

- **simulacro**: 210 preguntas, 4h 30min
- **protocolos**: 30 preguntas, 30min
- **contrarreloj**: 20 preguntas, 14min, sin pausa
- **quizz**: 65 minutos
- **errores**: Carga desde localStorage
- **personalizado**: Configuración personalizada

## Notas

- La vista usa los componentes `QuestionBox` y `Pagination` existentes
- Los estilos están en CSS Modules para evitar conflictos
- Soporta modo oscuro automáticamente
- Es completamente responsive

