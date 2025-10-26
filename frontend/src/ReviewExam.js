import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Exam.css';
import { FaSun, FaMoon } from 'react-icons/fa';
import { useLogo } from './context/LogoContext';
import QuestionBox from './components/QuestionBox';
import Pagination from './components/Pagination';
import ExamHeader from './components/ExamHeader';
import { downloadCurrentExamPdf, downloadExamPdfFromData } from './lib/pdfUtils';

function ReviewExam() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { logoSrc } = useLogo();
  const [currentPage, setCurrentPage] = useState(0);
  const questionsPerPage = 25;
  const [markedAsDoubt, setMarkedAsDoubt] = useState({});
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [debugCount, setDebugCount] = useState(0);
  const [isInProgress, setIsInProgress] = useState(false);

  // Utilidad: extraer long_answer desde múltiples ubicaciones posibles
  const getLongAnswer = (q) => {
    if (!q) return '';
    if (q.long_answer) return q.long_answer;
    if (q.questionData && q.questionData.long_answer) return q.questionData.long_answer;
    if (q.userAnswer && typeof q.userAnswer === 'object' && q.userAnswer.questionData && q.userAnswer.questionData.long_answer) {
      return q.userAnswer.questionData.long_answer;
    }
    // Intentar en respuestas del usuario acopladas en la pregunta
    if (q.user_answer && q.user_answer.questionData && q.user_answer.questionData.long_answer) return q.user_answer.questionData.long_answer;
    // Como fallback, revisar si el texto contiene un bloque marcado (poco frecuente)
    if (typeof q.text === 'string' && q.text.includes('Justificación:')) {
      return q.text.split('Justificación:').slice(1).join('Justificación:').trim();
    }
    return '';
  };

  // Normalizar cualquier valor a texto seguro para render
  const normalizeToText = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) {
      const joined = value
        .map((v) => (typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : ''))
        .filter(Boolean)
        .join(' ');
      return joined;
    }
    if (typeof value === 'object') {
      // Intentar campos comunes
      if (value.text && typeof value.text === 'string') return value.text;
      if (value.content && typeof value.content === 'string') return value.content;
      // Fallback genérico
      try {
        return JSON.stringify(value);
      } catch (_) {
        return '';
      }
    }
    return '';
  };

  // Diagnóstico: loguear de dónde sale long_answer cuando cambia la pregunta
  useEffect(() => {
    if (!exam || !exam.questions || currentQuestionIndex >= exam.questions.length) return;
    const currentQuestion = exam.questions[currentQuestionIndex] || {};
    const longAnswer = getLongAnswer(currentQuestion);
    
    const sources = {
      direct: Boolean(currentQuestion.long_answer),
      inQuestionData: Boolean(currentQuestion.questionData && currentQuestion.questionData.long_answer),
      inUserAnswer: Boolean(currentQuestion.userAnswer && currentQuestion.userAnswer.questionData && currentQuestion.userAnswer.questionData.long_answer),
      inUser_answer: Boolean(currentQuestion.user_answer && currentQuestion.user_answer.questionData && currentQuestion.user_answer.questionData.long_answer),
      fromText: Boolean(typeof currentQuestion.text === 'string' && currentQuestion.text.includes('Justificación:'))
    };
    // Solo para depurar el caso en producción
    try {
      console.log('[REVIEW long_answer] qId:', currentQuestion._id || currentQuestion.id || currentQuestion.index, 'found:', !!longAnswer, 'sources:', sources);
      if (!longAnswer) {
        console.log('[REVIEW long_answer] Pregunta sin long_answer resoluble:', currentQuestion);
      }
    } catch (_) {}
  }, [exam, currentQuestionIndex]);

  useEffect(() => {
    // Comprobar el modo oscuro en localStorage
    const savedMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(savedMode);
    
    // Aplicar modo oscuro al body si es necesario
    if (savedMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    
    const fetchExamReview = async () => {
      try {
        console.log("Intentando recuperar examen con ID:", examId);
        // FORZAR URL DE PRODUCCIÓN SI ESTAMOS EN SIMULIA.ES
        const isProduction = typeof window !== 'undefined' && 
          (window.location.hostname === 'www.simulia.es' || 
           window.location.hostname === 'simulia.es' ||
           window.location.protocol === 'https:');
        
        const apiUrl = isProduction ? 'https://backend-production-cc6b.up.railway.app' : 'http://localhost:5002';
        console.log('🔧 REVIEWEXAM DEBUG - isProduction:', isProduction, 'apiUrl:', apiUrl);
        
        const response = await axios.get(`${apiUrl}/exam-review/${examId}`);
        console.log("Datos recibidos del servidor:", response.data);
        
        // Información detallada para diagnóstico
        if (response.data.exam) {
          console.log("Tipo de examen recibido:", response.data.exam.type);
          console.log("Total de preguntas recibidas:", response.data.questions ? response.data.questions.length : 0);
          console.log("Estado del examen:", response.data.exam.status);
          
          // Añadir más información detallada
          console.log("----------- DIAGNÓSTICO DE REVIEW EXAM -----------");
          console.log("ID del examen cargado:", examId);
          if (response.data.questions && response.data.questions.length > 0) {
            console.log("Primera pregunta:", response.data.questions[0]);
            console.log("Última pregunta:", response.data.questions[response.data.questions.length-1]);
          }
          console.log("----------- FIN DIAGNÓSTICO -----------");
        } else {
          console.log("Tipo de examen recibido:", response.data.type);
          console.log("Total de preguntas recibidas:", response.data.questions ? response.data.questions.length : 0);
          console.log("Estado del examen:", response.data.status);
          
          // Añadir más información detallada
          console.log("----------- DIAGNÓSTICO DE REVIEW EXAM -----------");
          console.log("ID del examen cargado:", examId);
          if (response.data.questions && response.data.questions.length > 0) {
            console.log("Primera pregunta:", response.data.questions[0]);
            console.log("Última pregunta:", response.data.questions[response.data.questions.length-1]);
          }
          console.log("----------- FIN DIAGNÓSTICO -----------");
        }
        
        // Procesar la respuesta según su estructura
        let processedData;
        if (response.data.exam && response.data.questions) {
          // Si viene en formato {exam, questions}
          processedData = {
            ...response.data.exam,
            questions: response.data.questions || []
          };
        } else {
          // Si viene en formato plano
          processedData = response.data;
        }
        
        // Verificar si el examen está en progreso
        const examStatus = processedData.status || 'completed';
        setIsInProgress(examStatus === 'in_progress' || examStatus === 'paused');
        
        setExam(processedData);
        
        // Inicializar markedAsDoubt 
        // Primero checamos si hay markedAsDoubt en el examen
        const examDoubtMarks = {};
        
        if (processedData.markedAsDoubt || (response.data.exam && response.data.exam.markedAsDoubt)) {
          const doubtData = processedData.markedAsDoubt || response.data.exam.markedAsDoubt;
          
          // Handle both Map and object format
          if (typeof doubtData === 'object') {
            // If it's a MongoDB Map (format { dataType: 'Map', value: {...} })
            if (doubtData.dataType === 'Map' && doubtData.value) {
              Object.entries(doubtData.value).forEach(([key, value]) => {
                if (value === true) {
                  examDoubtMarks[key] = true;
                }
              });
            } else {
              // If it's a regular object
              Object.entries(doubtData).forEach(([key, value]) => {
                if (value === true) {
                  examDoubtMarks[key] = true;
                }
              });
            }
          }
        }
        
        // También revisamos las marcas de duda en cada objeto userAnswer
        if (processedData.questions && Array.isArray(processedData.questions)) {
          processedData.questions.forEach((question, index) => {
            if (question.userAnswer && 
                typeof question.userAnswer === 'object' && 
                question.userAnswer.markedAsDoubt === true) {
              examDoubtMarks[index] = true;
            }
          });
        }
        
        // Actualizar el estado con todas las marcas de duda encontradas
        setMarkedAsDoubt(examDoubtMarks);
        
        // Siempre empezar en la primera pregunta
        setCurrentQuestionIndex(0);
        setCurrentPage(0);
        
        setLoading(false);
      } catch (err) {
        console.error("Error completo:", err);
        setError("Error al cargar el examen: " + err.message);
        setLoading(false);
      }
    };
    
    fetchExamReview();
  }, [examId]);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('darkMode', newMode);
    
    if (newMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  };

  // Función para navegar entre preguntas
  const handleNavigate = (index) => {
    setCurrentQuestionIndex(index);
    // Establecer la página correcta si es diferente de la actual
    const newPage = Math.floor(index / questionsPerPage);
    if (newPage !== currentPage) {
      setCurrentPage(newPage);
    }
  };

  // Función simulada para mantener la compatibilidad con QuestionBox
  const handleAnswerClick = () => {
    // No hace nada en el modo de revisión
  };

  // Función simulada para mantener la compatibilidad con QuestionBox
  const toggleDoubtMark = () => {
    // No hace nada en el modo de revisión
  };

  // Función simulada para mantener la compatibilidad con QuestionBox
  const handleImpugnar = () => {
    // No hace nada en el modo de revisión
  };

  // Activar panel de debug con 5 clics
  const incrementDebugCounter = () => {
    setDebugCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 5) {
        setShowDebugInfo(true);
        return 0;
      }
      return newCount;
    });
  };

  // Función para generar el estado de los ítems para el componente Pagination
  const generateItemStatus = (questions) => {
    const status = {};
    if (!questions || !Array.isArray(questions) || questions.length === 0) return status;

    for (let i = 0; i < questions.length; i++) {
      // Check if the question has a user answer
      const hasAnswer = questions[i].userAnswer && 
                       (typeof questions[i].userAnswer === 'object' ? 
                        questions[i].userAnswer.selectedAnswer : questions[i].userAnswer);
      
      // A question should only be marked as doubt if it doesn't have an answer
      // or if the question object explicitly maintains the doubt flag even after answering
      const isMarkedAsDoubt = !hasAnswer && (
                            markedAsDoubt[i] || 
                           (questions[i].userAnswer && 
                            typeof questions[i].userAnswer === 'object' && 
                            questions[i].userAnswer.markedAsDoubt === true));
      
      // Set status based on what's present
      if (isMarkedAsDoubt) {
        status[i] = 'doubt';
      } else if (hasAnswer) {
        // Si tiene respuesta, verificar si es correcta o incorrecta
        status[i] = questions[i].isCorrect === true ? 'correct' : 'incorrect';
      } else {
        status[i] = 'unanswered';
      }
    }
    return status;
  };

  // Función para obtener si una respuesta es correcta
  const isAnswerCorrect = (questionIndex) => {
    if (!exam || !exam.questions) return false;
    
    const question = exam.questions[questionIndex];
    if (!question) return false;
    
    // Ahora isCorrect viene directamente en la pregunta
    return question.isCorrect === true;
  };

  if (loading) return <div className="loading-screen">Cargando revisión del examen...</div>;
  if (error) return <div className="error-screen">Error: {error}</div>;
  if (!exam) return <div className="error-screen">No se encontró el examen</div>;
  if (!exam.questions || !Array.isArray(exam.questions) || exam.questions.length === 0) {
    return <div className="error-screen">El examen no contiene preguntas válidas</div>;
  }

  // Preparar las preguntas en el formato que espera QuestionBox
  const formattedQuestions = exam.questions.map((q, index) => {
    return {
      _id: q._id || index,
      question: q.question || "Texto de la pregunta no disponible",
      option_1: q.option_1 || "Opción A",
      option_2: q.option_2 || "Opción B",
      option_3: q.option_3 || "Opción C",
      option_4: q.option_4 || "Opción D",
      option_5: q.option_5 || "-",
      options: [q.option_1, q.option_2, q.option_3, q.option_4, q.option_5].filter(opt => opt && opt !== '-'),
      answer: q.answer || "",
      image: q.image || "",
      subject: q.subject || "",
      userAnswer: q.userAnswer || null,
      isCorrect: q.isCorrect === true
    };
  });

  // Extraer respuestas de usuario directamente de las preguntas
  const processedUserAnswers = exam.questions.map(q => q.userAnswer || null);

  // Buscar y mapear las respuestas correctas para cada pregunta
  const mapCorrectAnswers = () => {
    if (!exam || !exam.questions) return {};
    
    const correctAnswersMap = {};
    
    exam.questions.forEach((question, index) => {
      // Si hay un answer/correctAnswer explícito en la pregunta
      if (question.answer !== undefined) {
        correctAnswersMap[index] = question.answer;
      }
    });
    
    return correctAnswersMap;
  };
  
  const correctAnswersMap = mapCorrectAnswers();

  const currentQuestion = exam.questions[currentQuestionIndex] || {};
  const longAnswer = getLongAnswer(currentQuestion);
  const justificationText = normalizeToText(longAnswer || currentQuestion.explanation || currentQuestion.justificacion || '');
  
  // Verificar si la respuesta del usuario es correcta
  const isCorrect = currentQuestion.isCorrect === true;
  
  // Función para obtener el texto de la respuesta correcta
  const getCorrectAnswerText = (question) => {
    const answerIndex = Number(question.answer || 0);
    
    // Si el answerIndex es un número válido, obtener la opción correspondiente
    if (!isNaN(answerIndex) && answerIndex >= 1 && answerIndex <= 5) {
      const optionKey = `option_${answerIndex}`;
      return question[optionKey] || `Opción ${answerIndex}`;
    }
    
    // Si answer es ya el texto de la respuesta (no un índice)
    return question.answer;
  };

  
  return (
    <div id="exam-root" className={`exam-container ${isDarkMode ? 'dark' : ''}`}>
      {/* Cabecera con ExamHeader component */}
      <ExamHeader
        disabledButtons={['pause', 'save']} // Disable pause and save buttons
        onFinish={() => navigate('/dashboard')} // Use the finish button to return to dashboard
        toggleDarkMode={toggleDarkMode}
        onDownload={() => downloadExamPdfFromData({
          questions: exam?.questions || [],
          title: 'SIMULIA',
          subtitle: `Revisión examen: ${(exam && exam.type) ? exam.type.toUpperCase() : ''}`,
          logoUrl: '/Logo_oscuro.png',
          examId: examId,
          date: (exam && exam.date) ? new Date(exam.date).toISOString().slice(0,10) : new Date().toISOString().slice(0,10),
          durationMin: null,
          showAnswerKey: true,
          showBubbleSheet: false,
          fileName: `examen-${examId}-revision.pdf`
        })}
      />

      {/* Panel de información de diagnóstico */}
      {showDebugInfo && (
        <div className="debug-panel" style={{padding: '10px', background: '#f0f0f0', border: '1px solid #ccc', margin: '10px', borderRadius: '4px'}}>
          <h3>Información de diagnóstico:</h3>
          <p>ID del examen: {examId}</p>
          <p>Tipo de examen: {exam.type}</p>
          <p>Preguntas totales: {exam.questions.length}</p>
          <p>Status del examen: {exam.status}</p>
          <p>Verificación de tipo: {exam.type === 'simulacro' ? '✅ OK' : `⚠️ Tipo incorrecto (${exam.type})`}</p>
          <p>Verificación de preguntas: {exam.questions.length >= 200 ? '✅ OK' : `⚠️ Faltan preguntas (${exam.questions.length})`}</p>
          <button 
            onClick={() => {
              // Guardar ID en localStorage para depuración
              localStorage.setItem('lastExamDebugId', examId);
              alert(`ID del examen guardado: ${examId}`);
            }} 
            style={{marginTop: '10px', marginRight: '10px'}}
          >
            Guardar ID
          </button>
          <button onClick={() => setShowDebugInfo(false)} style={{marginTop: '10px'}}>Cerrar</button>
        </div>
      )}

      {/* Usar el componente QuestionBox */}
      <QuestionBox
        currentQuestion={currentQuestionIndex}
        questions={formattedQuestions}
        userAnswers={processedUserAnswers}
        handleAnswerClick={handleAnswerClick}
        markedAsDoubt={markedAsDoubt}
        toggleDoubtMark={toggleDoubtMark}
        onNavigate={handleNavigate}
        onImpugnar={handleImpugnar}
        isDarkMode={isDarkMode}
        showCorrectness={true}
        correctAnswersMap={correctAnswersMap}
        isReviewMode={true}
        // Pasamos una función para verificar si una respuesta es correcta basado en isCorrect
        answerIsCorrect={(index) => {
          const question = exam.questions[index];
          return question ? question.isCorrect === true : false;
        }}
      />

      {/* Mostrar estado de la respuesta */}
      <div className="justification-section">
        {currentQuestion && (
          <div className="correct-answer-display">
            <h3>Justificación:</h3>
            <p>{justificationText || 'No hay justificación disponible'}</p>
            {exam && exam.type !== 'protocolos' && (
              <p className="subject-info">Tema: {currentQuestion.subject || 'No especificada'}</p>
            )}
          </div>
        )}
      </div>

      {/* Usar el componente Pagination */}
      <Pagination
        totalItems={exam.questions.length}
        itemsPerPage={questionsPerPage}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onItemSelect={handleNavigate}
        activeItemIndex={currentQuestionIndex}
        itemStatus={generateItemStatus(exam.questions)}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}

export default ReviewExam;