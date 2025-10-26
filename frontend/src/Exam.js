import React, { useState, useEffect, useCallback } from 'react';
import './Exam.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { debounce } from 'lodash';
import Pagination from './components/Pagination';
import QuestionBox from './components/QuestionBox';
import ExamHeader from './components/ExamHeader';
import { finalizeExam, getExamType, resumeExam as resumeExamUtil, saveExamProgress } from './lib/examUtils';
import SuccessNotification from './components/SuccessNotification';
import { downloadCurrentExamPdf, downloadExamPdfFromData } from './lib/pdfUtils';
import { API_URL } from './config';

// Debug: Verificar que API_URL se importa correctamente
console.log('🔧 EXAM DEBUG - API_URL importado:', API_URL);

const ErrorDisplay = ({ onRetry, onReturn }) => {
  return (
    <div className="exam-error">
      <h2>No se pudieron cargar las preguntas</h2>
      <p>Por favor, intenta de nuevo o vuelve al dashboard</p>
      <div className="error-actions">
        <button onClick={onRetry} className="retry-button">
          Intentar de nuevo
        </button>
        <button onClick={onReturn} className="return-button">
          Volver al Dashboard
        </button>
      </div>
    </div>
  );
};

// Un debounce simple por si no está disponible lodash
const createDebounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const Exam = ({ toggleDarkMode, isDarkMode, userId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const examMode = searchParams.get('mode');
  
  // Use test_user_1 for testing
  const effectiveUserId = userId;
  
  const [questions, setQuestions] = useState([]);
  const [timeLeft, setTimeLeft] = useState(16200); // 4h 30min
  const [totalTime, setTotalTime] = useState(16200); // Tiempo total para calcular tiempo usado
  const [isPaused, setPaused] = useState(true); // Siempre iniciar pausado
  const [hasStarted, setHasStarted] = useState(false); // Nuevo estado para controlar si el examen ha comenzado
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [userAnswers, setUserAnswers] = useState([]); // Añadido estado para userAnswers
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [showStartPopup, setShowStartPopup] = useState(true);
  const [showFinalizePopup, setShowFinalizePopup] = useState(false);
  const [isDisputing, setIsDisputing] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [examType, setExamType] = useState('simulacro');
  console.log('Inicialización del tipo de examen:', examMode, '->', examType);
  const [examId, setExamId] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [examState, setExamState] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [markedAsDoubt, setMarkedAsDoubt] = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  const questionsPerPage = 25;
  const [showCorrectness, setShowCorrectness] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  useEffect(() => {
    console.log('questions', questions);
    console.log('userAnswers', userAnswers);
  }, [questions, userAnswers]);
  
  // Variable para rastrear si ya hay un guardado en progreso y evitar llamadas simultáneas
  const [isSaving, setIsSaving] = useState(false);
  // Variable para rastrear cambios pendientes que requieren guardado
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  // Variable para la última vez que se guardó (para limitar frecuencia)
  const [lastSaveTime, setLastSaveTime] = useState(0);
  
  // Para batching de cambios y reducir peticiones
  const [changesBatch, setChangesBatch] = useState({ 
    answers: {}, // Respuestas que han cambiado
    currentQuestion: null, // Si ha cambiado la pregunta actual
    doubtMarks: {} // Preguntas marcadas como duda que han cambiado
  });
  const [lastBatchTime, setLastBatchTime] = useState(Date.now());
  
  // Debounced save function
  const debouncedSave = useCallback(
    debounce ? debounce(() => {
      if (hasPendingChanges && !isSaving) {
        console.log('Ejecutando guardado debounced...');
        queueProgressSave();
      }
    }, 3000) : createDebounce(() => {
      if (hasPendingChanges && !isSaving) {
        console.log('Ejecutando guardado debounced...');
        queueProgressSave();
      }
    }, 3000), 
    [hasPendingChanges, isSaving]
  );
 
  // Función auxiliar para determinar el tipo de examen
  const getExamType = (mode) => {
    switch (mode) {
      case 'errors':
        return 'errores';
      case 'protocol':
        return 'protocolos';
      case 'timed':
        return 'contrarreloj';
      case 'quizz':
        return 'quizz';
      default:
        return 'simulacro';
    }
  };

  // Modificar loadQuestions para inicializar userAnswers con el formato completo
const loadQuestions = async () => {
  try {
    setIsLoading(true);
    setIsError(false);
    
    // Asegurar que se crea un nuevo examen
    setExamId(null);
    
    // Determinar el tipo de examen
    const currentExamType = getExamType(examMode);
    console.log(`Cargando preguntas para examen tipo: ${currentExamType}`);
    console.log('🔧 EXAM DEBUG - API_URL:', API_URL);
    console.log('🔧 EXAM DEBUG - NODE_ENV:', process.env.NODE_ENV);
    console.log('🔧 EXAM DEBUG - hostname:', typeof window !== 'undefined' ? window.location.hostname : 'undefined');
    
    // SOLUCIÓN DEFINITIVA: Detectar entorno y usar URL correcta
    let effectiveAPI_URL;
    
    // Detectar si estamos en producción (simulia.es)
    const isProduction = typeof window !== 'undefined' && 
      (window.location.hostname === 'www.simulia.es' || 
       window.location.hostname === 'simulia.es' ||
       window.location.protocol === 'https:');
    
    if (isProduction) {
      effectiveAPI_URL = 'https://backend-production-cc6b.up.railway.app';
      console.log('🔧 EXAM DEBUG - PRODUCCIÓN DETECTADA - Usando Railway');
    } else {
      effectiveAPI_URL = 'http://localhost:3001';
      console.log('🔧 EXAM DEBUG - DESARROLLO DETECTADO - Usando localhost');
    }
    
    console.log('🔧 EXAM DEBUG - hostname:', typeof window !== 'undefined' ? window.location.hostname : 'undefined');
    console.log('🔧 EXAM DEBUG - protocol:', typeof window !== 'undefined' ? window.location.protocol : 'undefined');
    console.log('🔧 EXAM DEBUG - effectiveAPI_URL:', effectiveAPI_URL);
    
    let allQuestions = [];
    
    // Para el tipo 'errors', cargar desde localStorage en lugar de hacer llamadas API
    if (currentExamType === 'errores') {
      const storedData = localStorage.getItem('errorQuestions');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        allQuestions = parsedData.questions || [];
        
        // Establecer el tiempo desde localStorage
        const storedTime = parsedData.timeAssigned || 0;
        setTimeLeft(storedTime);
        setTotalTime(storedTime);
        
        console.log(`Cargadas ${allQuestions.length} preguntas de errores desde localStorage`);
        console.log(`Tiempo asignado: ${formatTime(storedTime)}`);
      } else {
        throw new Error('No se encontraron preguntas de errores en localStorage');
      }
    } else {
      // Para otros tipos de examen, mantener el comportamiento original
      // Obtener preguntas completas
      const completosURL = `${effectiveAPI_URL}/random-question-completos`;
      console.log('🔧 EXAM DEBUG - Completos URL:', completosURL);
      const completosResponse = await fetch(completosURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          count: 200,
          examType: currentExamType
        })
      });

      if (!completosResponse.ok) {
        throw new Error(`Error al cargar preguntas completas: ${completosResponse.status}`);
      }

      const completosData = await completosResponse.json();
      console.log(`Recibidas ${completosData.length} preguntas completas`);

      // Obtener preguntas con fotos
      const fotosURL = `${effectiveAPI_URL}/random-fotos`;
      console.log('🔧 EXAM DEBUG - Fotos URL:', fotosURL);
      const fotosResponse = await fetch(fotosURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 10 })
      });

      if (!fotosResponse.ok) {
        throw new Error(`Error al cargar preguntas con fotos: ${fotosResponse.status}`);
      }

      const fotosData = await fotosResponse.json();
      console.log(`Recibidas ${fotosData.length} preguntas con fotos`);

      // Combinar las preguntas
      allQuestions = [...completosData, ...fotosData];
      
      // Ajustar el tiempo según el tipo de examen
      if (currentExamType === 'protocolos') {
        // Para protocolos: 30 minutos
        setTimeLeft(1800);
        setTotalTime(1800);
      } else if (currentExamType === 'contrarreloj') {
        // Para contrarreloj: 14 minutos
        setTimeLeft(840);
        setTotalTime(840);
      } else if (currentExamType === 'quizz') {
        // Para quizz: 65 minutos
        setTimeLeft(3900);
        setTotalTime(3900);
      } else {
        // Para simulacro: 4h 30min (16200 segundos)
        setTimeLeft(16200);
        setTotalTime(16200);
      }
    }
    
    console.log(`Total de preguntas: ${allQuestions.length}`);
    setQuestions(allQuestions);
    
    // Inicializar userAnswers con objetos completos para todas las preguntas
    const initialUserAnswers = allQuestions.map(question => ({
      questionId: question._id,
      selectedAnswer: null,
      isCorrect: null,
      markedAsDoubt: false,
      questionData: {
        question: question.question || '',
        option_1: question.option_1 || question.options?.[0] || '',
        option_2: question.option_2 || question.options?.[1] || '',
        option_3: question.option_3 || question.options?.[2] || '',
        option_4: question.option_4 || question.options?.[3] || '',
        option_5: question.option_5 || question.options?.[4] || '',
        answer: question.answer || question.correctAnswer || '',
        subject: question.subject || question.categoria || 'General',
        image: question.image || null,
        long_answer: question.long_answer || ''
      }
    }));
    
    setUserAnswers(initialUserAnswers);
    setCurrentQuestion(0);

  } catch (error) {
    console.error('Error al cargar preguntas:', error);
    setIsError(true);
  } finally {
    setIsLoading(false);
  }
};

  // Implementar la función que usa la utilidad centralizada
  const resumeExam = async () => {
    try {
      const data = await resumeExamUtil(effectiveUserId);
      
      if (!data || data === false) {
        return false;
      }
      
      const { progress } = data;
      console.log('Restaurando progreso del examen:', progress);
      
      // Establecer el ID del examen para futuras actualizaciones
      if (progress.examId || progress._id) {
        setExamId(progress.examId || progress._id);
        console.log('ID del examen establecido:', progress.examId || progress._id);
      }
      
      // Restaurar las preguntas
      if (progress.questions && Array.isArray(progress.questions)) {
        // Convertir las preguntas al formato usado en el frontend
        const formattedQuestions = progress.questions.map(q => {
          // Manejar tanto el formato guardado como el formato original
          return {
            _id: q.questionId || q._id,
            question: q.question || '',
            option_1: Array.isArray(q.options) ? q.options[0] : '',
            option_2: Array.isArray(q.options) ? q.options[1] : '',
            option_3: Array.isArray(q.options) ? q.options[2] : '',
            option_4: Array.isArray(q.options) ? q.options[3] : '',
            options: q.options || [],
            correctAnswer: q.correctAnswer || '',
            subject: q.subject || q.categoria || '',
            long_answer: q.long_answer || ''  // Asegurar que long_answer se restaura
          };
        });
        
        setQuestions(formattedQuestions);
        console.log(`Restauradas ${formattedQuestions.length} preguntas`);
        
        // Preparar el array para almacenar las respuestas con objetos completos
        const fullAnswersArray = formattedQuestions.map(question => ({
          questionId: question._id,
          selectedAnswer: null,
          isCorrect: null,
          markedAsDoubt: false,
          questionData: {
            question: question.question || '',
            option_1: question.option_1 || question.options?.[0] || '',
            option_2: question.option_2 || question.options?.[1] || '',
            option_3: question.option_3 || question.options?.[2] || '',
            option_4: question.option_4 || question.options?.[3] || '',
            option_5: question.option_5 || question.options?.[4] || '',
            answer: question.answer || question.correctAnswer || '',
            subject: question.subject || question.categoria || 'General',
            image: question.image || null,
            long_answer: question.long_answer || ''
          }
        }));
        
        // Restaurar las respuestas del usuario
        if (progress.userAnswers) {
          if (Array.isArray(progress.userAnswers)) {
            // Verificar si userAnswers es un array de objetos con el nuevo formato
            if (progress.userAnswers.length > 0 && typeof progress.userAnswers[0] === 'object' && progress.userAnswers[0].questionData) {
              console.log('Restaurando respuestas con el nuevo formato...');
              
              // Verificar si hay long_answer en las respuestas
              const withLongAnswer = progress.userAnswers.filter(
                ua => ua && ua.questionData && ua.questionData.long_answer
              ).length;
              console.log(`Respuestas restauradas con long_answer: ${withLongAnswer} de ${progress.userAnswers.length}`);
              
              // Asegurarnos de que todas las preguntas tengan entradas en userAnswers
              progress.userAnswers.forEach(answer => {
                if (answer && answer.questionId) {
                  const questionIndex = formattedQuestions.findIndex(q => 
                    q._id && answer.questionId && q._id.toString() === answer.questionId.toString()
                  );
                  
                  if (questionIndex !== -1 && answer.selectedAnswer) {
                    fullAnswersArray[questionIndex] = {
                      ...answer,
                      markedAsDoubt: markedAsDoubt[questionIndex] || false
                    };
                  }
                }
              });
              
              // También restaurar selectedAnswers para la UI
              const selectedMap = {};
              fullAnswersArray.forEach((answer, index) => {
                if (answer && answer.selectedAnswer) {
                  selectedMap[index] = answer.selectedAnswer;
                }
              });
              setSelectedAnswers(selectedMap);
              
              console.log(`Restauradas ${progress.userAnswers.filter(a => a && a.selectedAnswer).length} respuestas de usuario`);
            }
            // Si userAnswers es un array de objetos con questionId y selectedAnswer (formato anterior)
            else if (progress.userAnswers.length > 0 && typeof progress.userAnswers[0] === 'object' && progress.userAnswers[0].questionId) {
              
              // Mapear las respuestas a los índices correctos
              progress.userAnswers.forEach(answer => {
                const questionIndex = formattedQuestions.findIndex(
                  q => (q.questionId || q._id) === (answer.questionId || answer._id)
                );
                
                if (questionIndex !== -1 && answer.selectedAnswer) {
                  const currentQuestion = formattedQuestions[questionIndex];
                  
                  // Actualizar el objeto en fullAnswersArray con la respuesta del usuario
                  fullAnswersArray[questionIndex] = {
                    ...fullAnswersArray[questionIndex],
                    selectedAnswer: answer.selectedAnswer,
                    isCorrect: answer.selectedAnswer === currentQuestion.answer || answer.selectedAnswer === currentQuestion.correctAnswer,
                    markedAsDoubt: markedAsDoubt[questionIndex] || false
                  };
                }
              });
              
              // También restaurar selectedAnswers para la UI
              const selectedMap = {};
              fullAnswersArray.forEach((answer, index) => {
                if (answer && answer.selectedAnswer) {
                  selectedMap[index] = answer.selectedAnswer;
                }
              });
              setSelectedAnswers(selectedMap);
              
              console.log(`Restauradas ${progress.userAnswers.filter(a => a && a.selectedAnswer).length} respuestas de usuario`);
            } else {
              // Si userAnswers es un array directo de respuestas (formato muy antiguo)
              console.log('Restaurando respuestas con formato antiguo...');
              
              // Actualizar fullAnswersArray con las respuestas del formato antiguo
              progress.userAnswers.forEach((answer, index) => {
                if (answer && index < fullAnswersArray.length) {
                  const currentQuestion = formattedQuestions[index];
                  
                  fullAnswersArray[index] = {
                    ...fullAnswersArray[index],
                    selectedAnswer: answer,
                    isCorrect: answer === currentQuestion.answer || answer === currentQuestion.correctAnswer,
                    markedAsDoubt: markedAsDoubt[index] || false
                  };
                }
              });
              
              // Crear selectedAnswers para la UI
              const selectedMap = {};
              fullAnswersArray.forEach((answer, index) => {
                if (answer && answer.selectedAnswer) {
                  selectedMap[index] = answer.selectedAnswer;
                }
              });
              setSelectedAnswers(selectedMap);
            }
          } else if (progress.selectedAnswers) {
            // Si no hay userAnswers pero hay selectedAnswers (formato muy antiguo)
            console.log('Restaurando usando solo selectedAnswers (formato muy antiguo)...');
            
            setSelectedAnswers(progress.selectedAnswers);
            
            // Actualizar fullAnswersArray con las respuestas de selectedAnswers
            Object.entries(progress.selectedAnswers).forEach(([index, answer]) => {
              const questionIndex = parseInt(index);
              if (questionIndex < fullAnswersArray.length) {
                const currentQuestion = formattedQuestions[questionIndex];
                
                fullAnswersArray[questionIndex] = {
                  ...fullAnswersArray[questionIndex],
                  selectedAnswer: answer,
                  isCorrect: answer === currentQuestion.answer || answer === currentQuestion.correctAnswer,
                  markedAsDoubt: markedAsDoubt[questionIndex] || false
                };
              }
            });
          }
        }
        
        // Finalmente, establecer el array completo de userAnswers
        setUserAnswers(fullAnswersArray);
      }
      
      // Restaurar el tiempo restante
      if (typeof progress.timeLeft === 'number') {
          setTimeLeft(progress.timeLeft);
        console.log(`Tiempo restante restaurado: ${formatTime(progress.timeLeft)}`);
      }
      
      // Restaurar tiempo total
      if (typeof progress.totalTime === 'number') {
        setTotalTime(progress.totalTime);
      }
      
      // Restaurar pregunta actual
      if (typeof progress.currentQuestion === 'number') {
          setCurrentQuestion(progress.currentQuestion);
        console.log(`Pregunta actual restaurada: ${progress.currentQuestion + 1}`);
      }
      
      // Restaurar marcas de duda
      if (progress.markedAsDoubt) {
        // Manejar tanto formato de Map como de objeto
        if (typeof progress.markedAsDoubt === 'object') {
          const doubtMarks = {};
          
          // Si es un Map de MongoDB (formato { dataType: 'Map', value: {...} })
          if (progress.markedAsDoubt.dataType === 'Map' && progress.markedAsDoubt.value) {
            Object.entries(progress.markedAsDoubt.value).forEach(([key, value]) => {
              if (value === true) {
                doubtMarks[key] = true;
              }
            });
          } else {
            // Si es un objeto normal
            Object.entries(progress.markedAsDoubt).forEach(([key, value]) => {
              if (value === true) {
                doubtMarks[key] = true;
              }
            });
          }
          
          setMarkedAsDoubt(doubtMarks);
          console.log(`Restauradas ${Object.keys(doubtMarks).length} marcas de duda`);
        }
      }
      
      // Configurar el estado del examen
      if (progress.status) {
        if (progress.status === 'paused') {
          setPaused(true);
          console.log('Examen restaurado en estado pausado');
        } else {
          setPaused(false);
          console.log(`Examen restaurado en estado: ${progress.status}`);
        }
      }
      
      console.log('Progreso del examen restaurado correctamente');
      return true;
    } catch (error) {
      console.error('Error al recuperar progreso:', error);
      return false;
    }
  };

  // Usar loadQuestions en el useEffect
  useEffect(() => {
    // Si hay userId, intentar primero restaurar el progreso
    if (effectiveUserId) {
      resumeExam()
        .then(progressRestored => {
          // Si no se restauró progreso anterior o no hubo preguntas, cargar nuevas preguntas
          if (!progressRestored || !questions || questions.length === 0) {
            loadQuestions();
          }
        })
        .catch(error => {
          console.error('Error al intentar restaurar el examen:', error);
          loadQuestions();
        });
    } else {
      // Si no hay userId, simplemente cargar nuevas preguntas
      loadQuestions();
    }
  }, [examMode]);
  
  // Asegurarse de que el examen esté pausado al inicio
  useEffect(() => {
    setPaused(true);
  }, []);

  // Pausar el cronómetro mientras el popup está visible
  useEffect(() => {
    console.log('showStartPopup cambió:', showStartPopup);
    if (showStartPopup) {
      console.log('Pausando cronómetro - popup visible');
      setPaused(true);
    }
  }, [showStartPopup]);

  const handleStartExam = () => {
    console.log('Iniciando examen...');
    
    // Primero cerrar el popup
    setShowStartPopup(false);
    
    // Usar setTimeout para asegurarse de que el popup se ha cerrado antes de iniciar el cronómetro
    setTimeout(() => {
      setHasStarted(true); // Marcar que el examen ha comenzado
      setPaused(false); // Quitar la pausa
      console.log('Examen iniciado - Cronómetro activado');
    }, 100);
  };

  // Cuenta regresiva
  useEffect(() => {
    console.log('Cronómetro useEffect - isPaused:', isPaused, 'hasStarted:', hasStarted, 'timeLeft:', timeLeft);
    let timer;
    
    // Solo iniciar el cronómetro si el examen ha comenzado y no está pausado
    if (hasStarted && !isPaused && timeLeft > 0) {
      console.log('Iniciando cronómetro - condiciones cumplidas');
      timer = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else {
      console.log('Cronómetro no iniciado:', {
        hasStarted,
        isPaused,
        timeLeft,
        reason: !hasStarted ? 'no iniciado' : isPaused ? 'pausado' : 'tiempo agotado'
      });
    }
    
    return () => {
      if (timer) {
        console.log('Limpiando cronómetro');
        clearInterval(timer);
      }
    };
  }, [isPaused, hasStarted, timeLeft]);
  
  // Reemplazar saveExamProgress con la versión de utilities
  const saveExamProgressLocal = async (isCompleted = false, forcePauseState = null, forceStatus = null) => {
    try {
      console.log('==== INICIO GUARDADO DE PROGRESO ====');
      console.log(`UserID: ${effectiveUserId}`);
      console.log(`ExamID actual: ${examId || 'NUEVO'}`);
      console.log(`Preguntas: ${questions.length}, Respuestas: ${userAnswers.length}`);
      console.log(`Estado completado: ${isCompleted}, Pausa forzada: ${forcePauseState}, Estado forzado: ${forceStatus || 'no forzado'}`);

      // Establecer estado del examen (pausa forzada o estado actual)
      const currentPauseState = forcePauseState !== null ? forcePauseState : isPaused;
      // Si se proporciona un estado explícito, usarlo; de lo contrario, calcularlo como antes
      const examStatus = forceStatus || (currentPauseState ? 'paused' : (isCompleted ? 'completed' : 'in_progress'));
      
      // Calcular tiempo usado
      const timeUsedValue = Math.max(0, totalTime - timeLeft);
      
      console.log(`Guardando con estado: ${examStatus}, Tiempo usado: ${timeUsedValue}s`);
      
      // Obtener una copia actual del estado para asegurar que estamos enviando los datos más recientes
      // Incluso si el estado de React todavía no ha terminado de actualizarse
      const currentUserAnswers = [...userAnswers];
      const currentSelectedAnswers = {...selectedAnswers};
      const currentMarkedAsDoubt = {...markedAsDoubt};
      
      // Validar si tenemos respuestas válidas
      const validAnswersCount = currentUserAnswers.filter(a => 
        a && typeof a === 'object' && a.selectedAnswer
      ).length;
      
      console.log(`Respuestas válidas a guardar: ${validAnswersCount}/${currentUserAnswers.length}`);
      
      if (currentUserAnswers.length > 0) {
        // Mostrar ejemplo de la primera respuesta para depuración
        console.log('Ejemplo de respuesta:', JSON.stringify(currentUserAnswers[0], null, 2));
      }

      // DEPURACIÓN: Listar todas las respuestas (selectedAnswers) para verificar qué se está enviando
      console.log('Respuestas seleccionadas a enviar:', currentSelectedAnswers);
      console.log('Total de respuestas seleccionadas:', Object.keys(currentSelectedAnswers).length);
      
      // Llamar a la utilidad centralizada
      const result = await saveExamProgress(
        effectiveUserId,
        examId || null, // Pasar null explícitamente si no hay examId
        getExamType(examMode),
        questions,
        currentUserAnswers,  // Usar la copia actual del estado
        currentSelectedAnswers,  // Usar la copia actual del estado
        timeLeft,
        currentQuestion,
        currentMarkedAsDoubt,  // Usar la copia actual del estado
        timeUsedValue,
        totalTime,
        isCompleted,
        examStatus
      );
      
      // Verificar si recibimos un nuevo ID de examen
      if (result && result.examId) {
        if (!examId || examId !== result.examId) {
          console.log(`Recibido nuevo ID de examen: ${result.examId} (antiguo: ${examId || 'ninguno'})`);
          // Actualizar el ID de examen para futuros guardados
          setExamId(result.examId);
        } else {
          console.log(`Examen guardado con el mismo ID: ${result.examId}`);
        }
      }
      
      // Si hay error en el guardado, mostrar solo si es un error real
      if (result && result.error) {
        console.error('Error al guardar estado:', result.error);
        
        // No mostrar alerta si el mensaje indica que todo está bien
        if (!result.error.includes('progreso del examen') && 
            !result.error.toLowerCase().includes('todo esta bien')) {
          alert(`Error al guardar: ${result.error}`);
        }
        return result;
      } else {
        console.log('Guardado completado con éxito');
        setHasPendingChanges(false);
        return result;
      }
      
    } catch (error) {
      console.error('Error en saveExamProgress:', error);
      
      // No mostrar alerta si el mensaje indica que todo está bien
      const errorMsg = error.message || 'Error desconocido';
      if (!errorMsg.includes('progreso del examen') && 
          !errorMsg.toLowerCase().includes('todo esta bien')) {
        alert(`Error al guardar: ${errorMsg}`);
      }
      return { error: errorMsg };
    } finally {
      console.log('==== FIN GUARDADO DE PROGRESO ====');
    }
  };

  // Función para guardar progreso de forma optimizada
  const queueProgressSave = (isForceComplete = false) => {
    console.log(`===== INICIANDO PROCESO DE GUARDADO =====`);
    console.log(`Guardado forzado: ${isForceComplete}, Estado de guardado en progreso: ${isSaving}`);
    console.log(`Tiempo desde último guardado: ${Date.now() - lastSaveTime}ms`);
    
    // No guardar si el examen ya está finalizado o en proceso de finalización
    if (isSubmitted) {
      console.log('Examen ya finalizado o en proceso de finalización, omitiendo guardado');
      return;
    }
    
    // Marcar que hay cambios pendientes
    setHasPendingChanges(true);
    
    // Si es forzado (completado), guardar inmediatamente
    if (isForceComplete) {
      console.log('Ejecutando guardado forzado como completado');
      saveExamProgressLocal(true)
        .then(result => {
          if (result && result.error) {
            console.error('Error al guardar examen como completado:', result.error);
            
            // No mostrar alerta si el mensaje indica que todo está bien
            if (!result.error.includes('progreso del examen') && 
                !result.error.toLowerCase().includes('todo esta bien')) {
              alert(`Error al finalizar: ${result.error}`);
            }
          } else {
            console.log('Examen guardado como completado');
            setHasPendingChanges(false);
          }
        })
        .catch(error => {
          console.error('Error al finalizar examen:', error);
          alert(`Error al finalizar: ${error.message || 'Error desconocido'}`);
        });
      return;
    }
    
    // No guardar si ya hay un guardado en progreso
    if (isSaving) {
      console.log('Ya hay un guardado en progreso, omitiendo...');
      return;
    }
    
    // ELIMINADA LIMITACIÓN DE FRECUENCIA DE GUARDADO
    // Ahora permitimos guardar en cualquier momento sin importar cuándo fue el último guardado
    const now = Date.now();
    const timeSinceLastSave = now - lastSaveTime;
    console.log(`Tiempo desde último guardado: ${timeSinceLastSave}ms - Procediendo con el guardado`);
    
    // Si llegamos aquí, podemos guardar
    console.log('Condiciones cumplidas para guardar, procediendo...');
    setIsSaving(true);
    setLastSaveTime(now);
    
    // Guardar y resetear estado
    saveExamProgressLocal(false)
      .then(result => {
        if (result && result.error) {
          console.warn('Error al guardar progreso:', result.error);
          // Mantener la marca de cambios pendientes para un nuevo intento
        } else {
          console.log('Guardado completado con éxito');
          // Si obtuvimos un ID de examen, registrarlo
          if (result && result.examId) {
            console.log(`Guardado exitoso con ID: ${result.examId}`);
          }
          setHasPendingChanges(false);
        }
      })
      .catch(error => {
        console.error('Error durante el guardado:', error);
        // Mantener la marca de cambios pendientes para un nuevo intento
      })
      .finally(() => {
        setIsSaving(false);
        console.log('===== PROCESO DE GUARDADO FINALIZADO =====');
      });
  };

  // Usar efecto para guardar periódicamente si hay cambios pendientes
  useEffect(() => {
    let interval;
    
    // Solo configurar el guardado periódico si el examen está en progreso
    // y no ha sido finalizado/enviado
    if (timeLeft > 0 && !isSubmitted && !showStartPopup && !isPaused) {
      console.log('Configurando guardado periódico');
      
      // Verificar cada 60 segundos si debemos guardar (incluso sin cambios explícitos)
      interval = setInterval(() => {
        // Verificar nuevamente que el examen no haya sido finalizado
        if (!isSaving && !isSubmitted) {
          console.log('Guardado periódico programado');
          queueProgressSave();
        } else {
          console.log('Omitiendo guardado periódico: examen en proceso de guardado o finalizado');
        }
      }, 60000); // 60 segundos
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [timeLeft, isSubmitted, showStartPopup, isPaused, isSaving]);

  // Función para agregar cambios al batch
  const addToBatch = (type, data) => {
    // Siempre que se modifique una respuesta, actualizar directamente userAnswers
    // para asegurar que se guarda el array completo
    if (type === 'answer') {
      // No es necesario hacer nada aquí, ya que userAnswers se actualiza directamente
      // en handleAnswerClick antes de llamar a addToBatch
    }
    
    // Marcar que hay cambios pendientes
    setHasPendingChanges(true);
    
    // Si es primera respuesta (sin examId aún), guardar inmediatamente
    // para obtener un ID y no depender del debounce
    if (!examId && type === 'answer') {
      console.log('Primera respuesta detectada, guardando inmediatamente para obtener ID');
      queueProgressSave();
      return;
    }
    
    // Programar un guardado debounced para el resto de los casos
    debouncedSave();
  };

  // Modificar handleAnswerClick para actualizar el objeto existente en lugar de crear uno nuevo
  const handleAnswerClick = (questionId, selectedOption) => {
    // Actualizar el estado selectedAnswers (para visualización)
    setSelectedAnswers((prevAnswers) => {
      const currentAnswer = prevAnswers[questionId];
      // Si ya está seleccionada, la quitamos
      if (currentAnswer === selectedOption) {
        const updatedAnswers = { ...prevAnswers };
        delete updatedAnswers[questionId];
        return updatedAnswers;
      }
      // Si no está seleccionada, la añadimos
      return { ...prevAnswers, [questionId]: selectedOption };
    });
    
    // Obtener la pregunta actual y el objeto de respuesta existente
    const currentQuestionData = questions[questionId];
    const existingAnswerObject = userAnswers[questionId];
    
    // Verificar si la respuesta es correcta
    let isCorrect = false;
    
    if (currentQuestionData) {
      // Caso 1: Si selectedOption es un número o string numérico, comparar directamente con answer
      if (!isNaN(selectedOption)) {
        isCorrect = parseInt(selectedOption) === parseInt(currentQuestionData.answer) ||
                   (currentQuestionData.correctAnswer && parseInt(selectedOption) === parseInt(currentQuestionData.correctAnswer));
      }
      // Caso 2: Si selectedOption es el texto completo de una opción
      else if (typeof selectedOption === 'string') {
        // Determinar si selectedOption es una de las opciones (option_1, option_2, etc.)
        if (selectedOption.startsWith('option_')) {
          const selectedIndex = parseInt(selectedOption.replace('option_', ''));
          isCorrect = selectedIndex === parseInt(currentQuestionData.answer) ||
                     (currentQuestionData.correctAnswer && selectedIndex === parseInt(currentQuestionData.correctAnswer));
        } 
        // Caso 3: Si selectedOption es el texto completo de la respuesta
        else {
          // Obtener el texto de la opción correcta
          const correctOptionKey = `option_${currentQuestionData.answer}`;
          const correctOptionText = currentQuestionData[correctOptionKey];
          
          // Comparar el texto seleccionado con el texto de la opción correcta
          isCorrect = selectedOption === correctOptionText;
          
          // Si hay un campo correctAnswer alternativo, también verificar con él
          if (!isCorrect && currentQuestionData.correctAnswer) {
            const altCorrectOptionKey = `option_${currentQuestionData.correctAnswer}`;
            const altCorrectOptionText = currentQuestionData[altCorrectOptionKey];
            isCorrect = selectedOption === altCorrectOptionText;
          }
        }
      }
    }
    
    console.log(`Respuesta seleccionada: ${selectedOption}, Respuesta correcta: ${currentQuestionData?.answer}, Es correcta: ${isCorrect}`);
    
    // Asegurarnos de que mantenemos la estructura completa del objeto de respuesta
    const updatedAnswer = {
      questionId: existingAnswerObject?.questionId || currentQuestionData?._id,
      selectedAnswer: selectedOption,
      isCorrect: isCorrect,
      markedAsDoubt: existingAnswerObject?.markedAsDoubt || markedAsDoubt[questionId] || false,
      questionData: existingAnswerObject?.questionData || {
        question: currentQuestionData?.question || '',
        option_1: currentQuestionData?.option_1 || currentQuestionData?.options?.[0] || '',
        option_2: currentQuestionData?.option_2 || currentQuestionData?.options?.[1] || '',
        option_3: currentQuestionData?.option_3 || currentQuestionData?.options?.[2] || '',
        option_4: currentQuestionData?.option_4 || currentQuestionData?.options?.[3] || '',
        option_5: currentQuestionData?.option_5 || currentQuestionData?.options?.[4] || '',
        answer: currentQuestionData?.answer || currentQuestionData?.correctAnswer || '',
        subject: currentQuestionData?.subject || currentQuestionData?.categoria || 'General',
        image: currentQuestionData?.image || null,
        long_answer: currentQuestionData?.long_answer || (existingAnswerObject?.questionData?.long_answer || '')
      }
    };
    
    // Verificar si updatedAnswer tiene long_answer
    if (updatedAnswer.questionData && !updatedAnswer.questionData.long_answer && currentQuestionData?.long_answer) {
      console.log(`Reparando long_answer para pregunta ${questionId}`);
      updatedAnswer.questionData.long_answer = currentQuestionData.long_answer;
    }
    
    // Actualizar userAnswers para guardar en BD manteniendo los datos completos
    setUserAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[questionId] = updatedAnswer;
      return newAnswers;
    });

    // Agregar al batch en lugar de guardar inmediatamente
    addToBatch('answer', { questionId, answer: updatedAnswer });
  };

  // NEW: Handler for item selection from Pagination component
  const handleItemSelect = (index) => {
    setCurrentQuestion(index);
    // Optional: If clicking a number should always trigger save
    addToBatch('question', { newQuestion: index });
  };

  // Función para manejar el botón "Finalizar"
  const handleFinalizeClick = () => {
    setShowFinalizePopup(true);
  };
        
  const handleDisputeSubmit = async (questionId) => {
    const disputeData = {
      question: questions[questionId]?.question || "Pregunta no disponible",
      reason: disputeReason,
      userAnswer: userAnswers[questionId] || null,
      userId: effectiveUserId
    };

    try {
      // Llamada al backend para enviar la impugnación por correo - corregida la ruta
      const response = await fetch(`${API_URL}/send-dispute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(disputeData),
      });

      if (response.ok) {
        setSuccessMessage('Impugnación enviada');
        setShowSuccessNotification(true);
      } else {
        setSuccessMessage('Error al enviar impugnación');
        setShowSuccessNotification(true);
      }
    } catch (error) {
      console.error('Error:', error);
      setSuccessMessage('Error al enviar impugnación');
      setShowSuccessNotification(true);
    } finally {
      // SIEMPRE cerrar el modal, sin importar si fue exitoso o no
      setIsDisputing(false);
      setDisputeReason('');
    }
  };

  const handleCancelFinish = () => {
    setShowFinalizePopup(false);
  };
  
  // La función confirmFinalize es necesaria - debe mantenerse
  const confirmFinalize = async () => {
    try {
      if (!effectiveUserId) {
        alert('No se identificó al usuario');
        return;
      }

      // Prevenir guardados automáticos durante la finalización
      setIsSubmitted(true);
      setIsSaving(true);

      // Mostrar indicador de carga
      console.log('Finalizando examen...');
      setShowFinalizePopup(false); // Cerrar el popup rápidamente

      // PASO CRUCIAL: Guardar los cambios pendientes primero
      if (hasPendingChanges) {
        try {
          const prevSaveResult = await saveExamProgressLocal(false);
          if (prevSaveResult?.error) {
            console.warn('Advertencia al guardar cambios previos:', prevSaveResult.error);
          }
        } catch (prevSaveError) {
          console.warn('Error al guardar cambios previos:', prevSaveError);
        }
      }

      const timeUsedValue = totalTime - timeLeft;
      const currentExamType = getExamType(examMode);
      
      // Verificar si las preguntas tienen long_answer
      console.log("======= VERIFICACIÓN DE PREGUNTAS ANTES DE FINALIZAR =======");
      if (questions && questions.length > 0) {
        const withLongAnswer = questions.filter(q => q.long_answer).length;
        console.log(`Preguntas con long_answer: ${withLongAnswer} de ${questions.length}`);
        console.log("Ejemplo de pregunta con long_answer:", questions.find(q => q.long_answer));
      }
      
      // Verificar si userAnswers tiene long_answer en questionData
      if (userAnswers && userAnswers.length > 0) {
        const withLongAnswerInQuestionData = userAnswers.filter(
          ua => ua && ua.questionData && ua.questionData.long_answer
        ).length;
        console.log(`userAnswers con long_answer en questionData: ${withLongAnswerInQuestionData} de ${userAnswers.length}`);
        
        if (withLongAnswerInQuestionData > 0) {
          console.log("Ejemplo de userAnswer con long_answer:", 
            userAnswers.find(ua => ua && ua.questionData && ua.questionData.long_answer));
        }
      }
      
      const result = await finalizeExam(
        effectiveUserId,
        currentExamType,
        questions,
        userAnswers,
        selectedAnswers,
        timeUsedValue,
        totalTime,
        markedAsDoubt,
        examId
      );
      
      if (result.error) {
        throw new Error(result.error);
      }

      console.log("===== RESPUESTA DEL BACKEND DESPUÉS DE FINALIZAR =====");
      console.log("ID del examen:", result.examId);
      
      // Verificar la estructura de la respuesta
      if (result.data) {
        console.log("Estructura de datos recibida:", Object.keys(result.data));
        
        // Si hay preguntas, verificar si tienen long_answer
        if (result.data.questions && result.data.questions.length > 0) {
          const withLongAnswer = result.data.questions.filter(q => q.long_answer).length;
          console.log(`Preguntas con long_answer en la respuesta: ${withLongAnswer} de ${result.data.questions.length}`);
          
          // Mostrar ejemplo de una pregunta con long_answer
          const example = result.data.questions.find(q => q.long_answer);
          if (example) {
            console.log("Ejemplo de pregunta con long_answer:", {
              question: example.question.substring(0, 30) + "...",
              long_answer: example.long_answer.substring(0, 30) + "..."
            });
          }
        }
      }
      console.log("=====  FIN RESPUESTA DEL BACKEND =====");

      // Mostrar notificación de éxito
      setSuccessMessage('¡Examen finalizado con éxito!');
      setShowSuccessNotification(true);

      // Esperar 2 segundos antes de redirigir
      setTimeout(() => {
        if (result.examId) {
          navigate(`/review/${result.examId}`);
        } else {
          navigate('/dashboard');
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error en confirmFinalize:', error);
      // Solo mostrar alerta si es un error real, no si el examen se finalizó correctamente
      if (!error.message?.includes('se finalizó correctamente')) {
        alert(`Error al finalizar el examen: ${error.message || 'Error desconocido'}`);
      }
      setIsSaving(false);
      setIsSubmitted(false);
    }
  };

  const handleClosePopup = () => {
    setShowFinalizePopup(false); // Cierra el pop-up
  };
  
  const currentOptions = questions[currentQuestion]
    ? [questions[currentQuestion].option_1, questions[currentQuestion].option_2, 
       questions[currentQuestion].option_3, questions[currentQuestion].option_4]
      .filter(option => option && option !== '-')
    : [];

  const examName = questions[currentQuestion]?.exam_name || '-';

  // Formato de tiempo
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Modificar la función de pausar - Modificado
  const handlePause = () => {
    // Simply toggle the pause state without saving
    setPaused(!isPaused);
  };

  // Modificar el useEffect para cargar el estado guardado
  useEffect(() => {
    const savedState = localStorage.getItem('examState');
    if (savedState) {
      setExamState(JSON.parse(savedState));
    }
  }, []);

  // Renderizado de imágenes mejorado
  const renderQuestionImage = (imagePath) => {
    if (!imagePath) return null;
    
    // Asegurar que la ruta es correcta y añadir timestamp para evitar caché
    const timestamp = new Date().getTime();
    const fullPath = imagePath.startsWith('http') || imagePath.startsWith('/') 
      ? `${imagePath}?t=${timestamp}`
      : `/examen_fotos/${imagePath}?t=${timestamp}`;
    
    return (
      <>
        <div className="question-image">
          <img
            src={fullPath}
            alt="Imagen de la pregunta"
            className="exam-image"
            onClick={() => {
              setSelectedImage(fullPath);
              setShowImageModal(true);
            }}
            style={{ cursor: 'pointer' }}
            onLoad={() => console.log('Imagen cargada correctamente:', fullPath)}
            onError={(e) => {
              console.error('Error al cargar imagen:', fullPath);
              e.target.style.display = 'none';
              
              const errorMsg = document.createElement('div');
              errorMsg.className = 'image-error-message';
              errorMsg.textContent = 'Imagen no disponible';
              e.target.parentNode.appendChild(errorMsg);
            }}
          />
        </div>

        {showImageModal && selectedImage && (
          <div className="image-modal-overlay" onClick={() => setShowImageModal(false)}>
            <div className="image-modal">
              <img src={selectedImage} alt="Imagen ampliada" />
              <button className="close-modal" onClick={() => setShowImageModal(false)}>×</button>
            </div>
          </div>
        )}
      </>
    );
  };

  // En el componente principal, añadir logs para debugging
  useEffect(() => {
    if (questions.length > 0) {
      console.log(`Recibidas ${questions.length} preguntas en total`);
      
      // Contar preguntas con imagen
      const withImages = questions.filter(q => q.image).length;
      console.log(`Preguntas con imágenes: ${withImages}`);
      
      // Revisar una pregunta con imagen
      const sampleWithImage = questions.find(q => q.image);
      if (sampleWithImage) {
        console.log('Ejemplo de pregunta con imagen:', sampleWithImage);
      } else {
        console.log('No se encontraron preguntas con imágenes');
      }
      
      // Revisar las primeras opciones para verificar formato
      console.log('Primera pregunta:', questions[0]);
    }
  }, [questions]);

  // 4. Mejorar la validación de preguntas actual
  const validateCurrentState = () => {
    if (!questions || questions.length === 0) {
      setIsError(true);
      return false;
    }

    if (!questions[currentQuestion]) {
      setIsError(true);
      return false;
    }

    return true;
  };

  // Add helper function to generate item status for Pagination
  const generateItemStatus = (selectedAnswers, markedAsDoubt, questions, userAnswers) => {
    const status = {};
    if (!questions || questions.length === 0) return status;

    for (let i = 0; i < questions.length; i++) {
      if (markedAsDoubt[i]) {
        status[i] = 'doubt';
      } else if (selectedAnswers[i] || (userAnswers[i] && 
                 (typeof userAnswers[i] === 'object' ? 
                  userAnswers[i].selectedAnswer : 
                  userAnswers[i]))) {
        status[i] = 'answered';
      }
    }
    return status;
  };

  // Modificar toggleDoubtMark para actualizar correctamente el estado
  const toggleDoubtMark = (questionIndex) => {
    setMarkedAsDoubt((prev) => {
      const isDubious = !prev[questionIndex];
      console.log(`Marcando pregunta ${questionIndex + 1} como ${isDubious ? 'duda' : 'normal'}`);
      
      // También actualizar la propiedad en userAnswers
      setUserAnswers(prevUserAnswers => {
        const newUserAnswers = [...prevUserAnswers];
        if (newUserAnswers[questionIndex]) {
          newUserAnswers[questionIndex] = {
            ...newUserAnswers[questionIndex],
            markedAsDoubt: isDubious
          };
        }
        return newUserAnswers;
      });
      
      // Agregar al batch en lugar de guardar inmediatamente
      addToBatch('doubt', { questionId: questionIndex, isDubious });
      return { ...prev, [questionIndex]: isDubious };
    });
  };

  // Replace renderCurrentQuestion with QuestionBox component
  const handleImpugnar = (questionId) => {
    setIsDisputing(true);
  };

  // Uso al salir de la página - mejorado para asegurar un guardado correcto
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      // Intentar guardar sin esperar la respuesta
      if (!isSubmitted) {
        console.log('Usuario intentando salir de la página, guardando estado...');
        console.log('IMPORTANTE: Cambiando URL de puerto 5000 a 3003 para consistencia en handleBeforeUnload');
        
        // Forzar un guardado síncrono (no podemos esperar promesas en beforeunload)
        const dataToSend = {
          userId: effectiveUserId,
          examId, 
          type: getExamType(examMode), 
          questions: questions.map(q => ({
            _id: q._id,
            question: q.question || '',
            option_1: q.option_1 || q.options?.[0] || '',
            option_2: q.option_2 || q.options?.[1] || '',
            option_3: q.option_3 || q.options?.[2] || '',
            option_4: q.option_4 || q.options?.[3] || '',
            option_5: q.option_5 || q.options?.[4] || '',
            answer: q.answer || q.correctAnswer || '',
            subject: q.subject || q.categoria || 'General',
            image: q.image || null
          })),
          // userAnswers ya está en el formato nuevo, lo enviamos directamente
          userAnswers,
          selectedAnswers,
          timeLeft,
          currentQuestion,
          markedAsDoubt,
          timeUsed: totalTime - timeLeft,
          totalTime,
          completed: false,
          status: 'paused',
          totalQuestions: questions.length
        };
        
        // Realizar una solicitud síncrona (deprecated pero necesario para este caso)
        const xhr = new XMLHttpRequest();
        const saveURL = (typeof window !== 'undefined' && 
          (window.location.hostname === 'www.simulia.es' || window.location.hostname === 'simulia.es')) 
          ? 'https://backend-production-cc6b.up.railway.app/save-exam-progress'
          : `${API_URL}/save-exam-progress`;
        xhr.open('POST', saveURL, false); // false = síncrono
        xhr.setRequestHeader('Content-Type', 'application/json');
        try {
          xhr.send(JSON.stringify(dataToSend));
          console.log('Estado guardado antes de salir');
        } catch (err) {
          console.error('Error al guardar estado antes de salir:', err);
        }
        
        // Mostrar mensaje al usuario
        e.preventDefault();
        e.returnValue = 'Hay cambios sin guardar. ¿Seguro que quieres salir?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSubmitted, effectiveUserId, examId, questions, userAnswers, selectedAnswers, timeLeft, currentQuestion, markedAsDoubt, totalTime, examType, examMode]);

  // Función para guardar manualmente
  const handleManualSave = () => {
    if (isSaving) {
      console.log('Ya hay un guardado en progreso...');
      return;
    }
    
    console.log('Guardando manualmente y finalizando con estado "en proceso"...');
    setIsSaving(true);
    
    // Calcular tiempo usado para enviar junto con el guardado
    const timeUsedValue = totalTime - timeLeft;
    
    // Forzar guardado inmediato con feedback visual
    // Pasamos true como isCompleted para que ejecute la funcionalidad de finalizar
    // pero forzamos el estado a 'in_progress' en lugar de 'completed'
    saveExamProgressLocal(true, false, 'in_progress')
      .then(result => {
        if (result && result.error) {
          console.warn('Error al guardar manualmente:', result.error);
          alert(`Error al guardar: ${result.error}`);
        } else {
          console.log('Guardado y finalizado con estado "en proceso" completado con éxito');
          setHasPendingChanges(false);
          
          // Mostrar notificación visual de éxito
          const saveConfirmation = document.createElement('div');
          saveConfirmation.className = 'save-confirmation';
          saveConfirmation.textContent = 'Guardado completado';
          document.body.appendChild(saveConfirmation);
          
          // Eliminar la notificación después de 2 segundos
          setTimeout(() => {
            if (saveConfirmation.parentNode) {
              saveConfirmation.parentNode.removeChild(saveConfirmation);
            }
          }, 2000);
        }
      })
      .catch(error => {
        console.error('Error durante el guardado manual:', error);
        alert(`Error al guardar: ${error.message || 'Error de conexión'}`);
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  // Efecto para guardar el modo oscuro en localStorage
  useEffect(() => {
    // Guardar preferencia en localStorage
    if (isDarkMode !== undefined) {
      localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    }
  }, [isDarkMode]);

  // 6. Mejorar el manejo de errores general
  if (isError) {
    return (
      <ErrorDisplay 
        onRetry={loadQuestions}
        onReturn={() => navigate('/dashboard')}
      />
    );
  }

  // Update places where renderCurrentQuestion is used
  return (
    <div id="exam-root" className={`exam-container ${isDarkMode ? 'dark' : ''}`}>
      {showStartPopup && (
        <div className="popup-overlay">
          <div className="popup">
            {examMode === 'errors' ? (
              <>
                <h2><strong>¡Comienza tu repaso de errores!</strong></h2>
                <p>
                  Este examen consta de <strong>{questions.length} preguntas</strong> seleccionadas 
                  de tus errores anteriores. Dispones de <strong>{formatTime(timeLeft)}</strong> para 
                  completarlo. Administra bien tu tiempo y recuerda que puedes revisar y ajustar 
                  tus respuestas antes de finalizar.
                </p>
              </>
            ) : (
              <>
                <h2><strong>¡Comienza tu simulacro!</strong></h2>
                <p>
                  Este examen consta de <strong>210 preguntas</strong> y dispones de 
                  <strong> 4 horas y 30 minutos</strong> para completarlo. De estas preguntas, 
                  <strong> 10 incluyen imágenes</strong>. Administra bien tu tiempo y recuerda 
                  que puedes revisar y ajustar tus respuestas antes de finalizar.
                </p>
              </>
            )}
            <button onClick={handleStartExam} className="control-btn">Estoy list@</button>
          </div>
        </div>
      )}

      <ExamHeader
        timeLeft={timeLeft}
        onPause={handlePause}
        onSave={handleManualSave}
        onFinish={handleFinalizeClick}
        isPaused={isPaused}
        isSaving={isSaving}
        hasPendingChanges={hasPendingChanges}
        toggleDarkMode={toggleDarkMode}
        onDownload={() => downloadExamPdfFromData({
          questions: questions,
          title: 'SIMULIA',
          subtitle: `Examen: ${getExamType(examMode).toUpperCase()}`,
          logoUrl: '/Logo_oscuro.png',
          examId: examId || '',
          date: new Date().toISOString().slice(0,10),
          durationMin: Math.round(totalTime / 60),
          showAnswerKey: false,
          showBubbleSheet: true,
          fileName: `examen-${getExamType(examMode)}.pdf`
        })}
      />

      {/* Render question if not loading, otherwise show spinner/message */}
      {isLoading ? (
          <div className="loading-indicator">Cargando examen...</div>
      ) : isError ? (
          <ErrorDisplay onRetry={loadQuestions} onReturn={() => navigate('/dashboard')} />
      ) : (
          <QuestionBox 
            currentQuestion={currentQuestion}
            questions={questions}
            userAnswers={userAnswers}
            handleAnswerClick={handleAnswerClick}
            markedAsDoubt={markedAsDoubt}
            toggleDoubtMark={toggleDoubtMark}
            onNavigate={(index) => {
              setCurrentQuestion(index);
              // Set the correct page if different from current
              const newPage = Math.floor(index / questionsPerPage);
              if (newPage !== currentPage) {
                setCurrentPage(newPage);
              }
            }}
            onImpugnar={handleImpugnar}
            isDarkMode={isDarkMode}
            showCorrectness={showCorrectness}
          />
      )}

    
     

      {/* Filters remain the same */}
      <div className="exam-filters">
        <input
          type="number"
          placeholder="Ir a pregunta #"
          onChange={(e) => {
            const val = parseInt(e.target.value);
            if (!isNaN(val) && val >= 1 && val <= questions.length) {
              setCurrentQuestion(val - 1);
              // Calcular y establecer la página correcta
              setCurrentPage(Math.floor((val - 1) / 25));
            }
          }}
          className="question-search"
        />
        <button className="control-btn filter-btn" onClick={() => {
          const firstUnanswered = Array.from({ length: questions.length }).findIndex((_, i) => 
            !userAnswers[i] || (typeof userAnswers[i] === 'object' && 
            (!userAnswers[i].selectedAnswer || userAnswers[i].selectedAnswer === null || userAnswers[i].selectedAnswer === ''))
          );
          if (firstUnanswered >= 0) {
            setCurrentQuestion(firstUnanswered);
            // Establecer la página correcta
            setCurrentPage(Math.floor(firstUnanswered / 25));
          }
        }}>
          Ir a no contestadas
        </button>
        <button className="control-btn filter-btn" onClick={() => {
          const firstDoubt = Object.keys(markedAsDoubt).find(key => markedAsDoubt[key]);
          if (firstDoubt) {
            const index = parseInt(firstDoubt);
            setCurrentQuestion(index);
            // Establecer la página correcta
            setCurrentPage(Math.floor(index / 25));
          }
        }}>
          Ir a con duda
        </button>
      </div>

      {/* Use the Pagination component */}
      {!isLoading && !isError && questions.length > 0 && (
        <Pagination
          totalItems={questions.length}
          itemsPerPage={questionsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onItemSelect={(index) => setCurrentQuestion(index)}
          activeItemIndex={currentQuestion}
          itemStatus={generateItemStatus(selectedAnswers, markedAsDoubt, questions, userAnswers)}
          isDarkMode={isDarkMode}
        />
      )}

      {showConfirmPopup && (
        <div className="popup-overlay">
          <div className="popup">
            <h2>¿Estás seguro de que deseas salir el examen? Se guardará el progreso.</h2>
            <div className="popup-buttons">
              <button onClick={handleCancelFinish} className="control-btn">No salir del examen</button>
              <button onClick={confirmFinalize} className="control-btn">Salir del examen</button>
            </div>
          </div>
        </div>
      )}

      {showFinalizePopup && (
        <div className="popup-overlay">
          <div className="popup">
            <h2>¿Finalizar el examen?</h2>
            <p>Has respondido {userAnswers.filter(answer => 
              answer !== null && answer !== undefined && 
              (typeof answer === 'object' ? answer.selectedAnswer !== undefined && answer.selectedAnswer !== null && answer.selectedAnswer !== '' : false)
            ).length} de {questions.length} preguntas.</p>
            <div className="popup-buttons">
              <button onClick={handleCancelFinish} className="control-btn">
                Continuar revisando
              </button>
              <button onClick={confirmFinalize} className="control-btn">
                Finalizar examen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de impugnación - Ahora como un overlay independiente para evitar superposición */}
      {isDisputing && (
        <div className="popup-overlay">
          <div className="dispute-modal">
            <button 
              className="modal-close-button"
              onClick={() => {
                setIsDisputing(false);
                setDisputeReason('');
              }}
            >
              ×
            </button>
            <h3>Escribe tu razón para impugnar</h3>
            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Escribe tu razón para impugnar"
            ></textarea>
            <div className="modal-actions">
              <button
                onClick={() => {
                  handleDisputeSubmit(currentQuestion);
                }}
                className="submit-dispute-btn"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessNotification && (
        <SuccessNotification
          message={successMessage}
          onClose={() => setShowSuccessNotification(false)}
          autoCloseTime={successMessage.includes('Impugnación') ? 1500 : 1000}
        />
      )}
    </div>
  );
}

export default Exam;
