import React, { useState, useEffect, useCallback } from 'react';
import './Protocolos.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaArrowLeft, FaArrowRight, FaDoorOpen } from 'react-icons/fa';
import ExamHeader from './components/ExamHeader';
import QuestionBox from './components/QuestionBox';
import Pagination from './components/Pagination';
import { finalizeExam } from './lib/examUtils';
import SuccessNotification from './components/SuccessNotification';
import { API_URL } from './config';
import { downloadCurrentExamPdf, downloadExamPdfFromData } from './lib/pdfUtils';

// Componente para mostrar errores
const ErrorDisplay = ({ onRetry, onReturn }) => {
  return (
    <div className="exam-error">
      <h2>Error al cargar las preguntas</h2>
      <p>No se pudieron cargar las preguntas de protocolos. Por favor, inténtalo de nuevo.</p>
      <div className="error-buttons">
        <button onClick={onRetry} className="control-btn">
          Reintentar
        </button>
        <button onClick={onReturn} className="control-btn">
          Volver al Dashboard
        </button>
      </div>
    </div>
  );
};

// Función de debounce para evitar guardados excesivos
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

const Protocolos = ({ toggleDarkMode, isDarkMode, userId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Usar siempre test_user_1 para pruebas
  const testUserId = userId || 'test_user_1';
  
  // Estados principales
  const [questions, setQuestions] = useState([]);
  const [timeLeft, setTimeLeft] = useState(1800); // 30min
  const [totalTime, setTotalTime] = useState(1800); // Tiempo total para calcular tiempo usado
  const [paused, setPaused] = useState(true); // Siempre iniciar pausado
  const [hasStarted, setHasStarted] = useState(false); // Nuevo estado para controlar si el examen ha comenzado
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [userAnswers, setUserAnswers] = useState([]); // Añadido estado para userAnswers
  const [questionMarkedAsDoubt, setQuestionMarkedAsDoubt] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [showStartPopup, setShowStartPopup] = useState(true);
  const [showFinalizePopup, setShowFinalizePopup] = useState(false);
  const [isDisputing, setIsDisputing] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [examType] = useState('protocolos');
  const [examId, setExamId] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle, saving, saved, error
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState(0);
  // Variables para rastrear cambios pendientes que requieren guardado
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  
  // Para batching de cambios y reducir peticiones
  const [changesBatch, setChangesBatch] = useState({ 
    answers: {}, // Respuestas que han cambiado
    currentQuestion: null, // Si ha cambiado la pregunta actual
    doubtMarks: {} // Preguntas marcadas como duda que han cambiado
  });
  const [lastBatchTime, setLastBatchTime] = useState(Date.now());
  
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Cuando el componente se carga, cargar preguntas del protocolo
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('Cargando preguntas de protocolos...');
        
        const response = await fetch(`${API_URL}/random-questions`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            numPreguntas: 30,
            examType: 'protocolos'
          })
        });
        
        if (!response.ok) {
          throw new Error(`Error del servidor: ${response.status}`);
        }
        
        const data = await response.json();
        
        console.log(`Recibidas ${data.length} preguntas de protocolos`);
        
        // Verificar que tenemos exactamente 30 preguntas
        if (data.length !== 30) {
          console.warn(`Se esperaban 30 preguntas pero se recibieron ${data.length}`);
          
          // Si hay más de 30, solo tomamos las primeras 30
          if (data.length > 30) {
            console.log('Limitando a 30 preguntas');
            setQuestions(data.slice(0, 30));
          } else {
            setQuestions(data);
          }
        } else {
          setQuestions(data);
        }
        
        // Inicializar userAnswers con objetos completos para todas las preguntas
        const initialUserAnswers = Array(Math.min(data.length, 30)).fill(null);
        setUserAnswers(initialUserAnswers);
        setIsLoading(false);
      } catch (err) {
        console.error('Error al cargar preguntas de protocolos:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };
  
    loadQuestions();
  }, []);
  
  // Pausar el cronómetro hasta que el usuario esté listo
  useEffect(() => {
    if (showStartPopup) {
      setPaused(true);
    }
  }, [showStartPopup]);

  // Iniciar examen
  const handleStartExam = () => {
    console.log('Iniciando examen de protocolos...');
    
    // Primero cerrar el popup
    setShowStartPopup(false);
    
    // Guardar estado inicial
    const initialState = {
      type: 'protocolos',
      startTime: new Date().toISOString(),
      status: 'in_progress'
    };
    
    localStorage.setItem('protocolosState', JSON.stringify(initialState));
    
    // Usar setTimeout para asegurarse de que el popup se ha cerrado antes de iniciar el cronómetro
    setTimeout(() => {
      setHasStarted(true); // Marcar que el examen ha comenzado
      setPaused(false); // Quitar la pausa
      console.log('Examen de protocolos iniciado - Cronómetro activado');
      
      // Intentar guardar progreso inicial
      saveProgressToDB(false);
    }, 100);
  };

  // Cuenta regresiva
  useEffect(() => {
    console.log('Cronómetro useEffect - paused:', paused, 'hasStarted:', hasStarted, 'timeLeft:', timeLeft);
    let timer;
    
    // Solo iniciar el cronómetro si el examen ha comenzado y no está pausado
    if (hasStarted && !paused && timeLeft > 0) {
      console.log('Iniciando cronómetro - condiciones cumplidas');
      timer = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else {
      console.log('Cronómetro no iniciado:', {
        hasStarted,
        paused,
        timeLeft,
        reason: !hasStarted ? 'no iniciado' : paused ? 'pausado' : 'tiempo agotado'
      });
    }
    
    // Si el tiempo se acaba, finalizar automáticamente
    if (timeLeft === 0) {
      handleFinishExam();
    }
    
    return () => {
      if (timer) {
        console.log('Limpiando cronómetro');
        clearInterval(timer);
      }
    };
  }, [paused, hasStarted, timeLeft]);
  
  // Implementación de saveExamProgressLocal adaptada de ExamInProgress.js
  const saveExamProgressLocal = async (isCompleted = false, forcePauseState = null, forceStatus = null) => {
    try {
      console.log('==== INICIO GUARDADO DE PROGRESO ====');
      console.log(`UserID: ${testUserId}`);
      console.log(`ExamID actual: ${examId || 'NUEVO'}`);
      console.log(`Preguntas: ${questions.length}, Respuestas: ${userAnswers.length}`);
      console.log(`Estado completado: ${isCompleted}, Pausa forzada: ${forcePauseState}, Estado forzado: ${forceStatus || 'no forzado'}`);

      // Establecer estado del examen (pausa forzada o estado actual)
      const currentPauseState = forcePauseState !== null ? forcePauseState : paused;
      // Si se proporciona un estado explícito, usarlo; de lo contrario, calcularlo como antes
      const examStatus = forceStatus || (currentPauseState ? 'paused' : (isCompleted ? 'completed' : 'in_progress'));
      
      // Calcular tiempo usado
      const timeUsedValue = Math.max(0, totalTime - timeLeft);
      
      console.log(`Guardando con estado: ${examStatus}, Tiempo usado: ${timeUsedValue}s`);
      
      // Formatear userAnswers correctamente
      const formattedUserAnswers = [];
      
      for (let i = 0; i < questions.length; i++) {
        // Crear el objeto questionData con toda la información de la pregunta
        const questionData = {
          question: questions[i].question || "",
          option_1: questions[i].option_1 || questions[i].options?.[0] || "",
          option_2: questions[i].option_2 || questions[i].options?.[1] || "",
          option_3: questions[i].option_3 || questions[i].options?.[2] || "",
          option_4: questions[i].option_4 || questions[i].options?.[3] || "",
          option_5: questions[i].option_5 || questions[i].options?.[4] || "-",
          answer: questions[i].answer || "",
          subject: questions[i].subject || questions[i].categoria || "General",
          image: questions[i].image || null,
          _id: questions[i]._id || `question_${i}`
        };
        
        formattedUserAnswers.push({
          questionId: questions[i]._id || `question_${i}`,
          selectedAnswer: userAnswers[i],
          isCorrect: null,
          questionData: questionData
        });
      }

      // Validar si tenemos respuestas válidas
      const validAnswersCount = formattedUserAnswers.filter(a => 
        a && typeof a === 'object' && a.selectedAnswer
      ).length;
      
      console.log(`Respuestas válidas a guardar: ${validAnswersCount}/${formattedUserAnswers.length}`);
      
      if (formattedUserAnswers.length > 0) {
        // Mostrar ejemplo de la primera respuesta para depuración
        console.log('Ejemplo de respuesta:', JSON.stringify(formattedUserAnswers[0], null, 2));
      }

      // DEPURACIÓN: Listar todas las respuestas (selectedAnswers) para verificar qué se está enviando
      console.log('Respuestas seleccionadas a enviar:', selectedAnswers);
      console.log('Total de respuestas seleccionadas:', Object.keys(selectedAnswers).length);
      
      // Preparar los datos para enviar al servidor - siguiendo el formato exacto esperado
      const dataToSend = {
        userId: testUserId,
        examId: examId || null,
        examData: {
          type: 'protocolos',
          questions: questions,
          userAnswers: formattedUserAnswers,
          selectedAnswers: selectedAnswers,
          timeLeft: timeLeft,
          currentQuestion: currentQuestion,
          markedAsDoubt: questionMarkedAsDoubt,
          timeUsed: timeUsedValue,
          totalTime: totalTime,
          completed: isCompleted,
          status: examStatus,
          totalQuestions: questions.length
        }
      };
      
      // Logging para debug
      if (isCompleted) {
        console.log('Guardando progreso final - Formato de datos:', {
          type: dataToSend.examData.type,
          questionsFormat: dataToSend.examData.questions.length > 0 ? dataToSend.examData.questions[0] : null,
          userAnswersFormat: dataToSend.examData.userAnswers.length > 0 ? dataToSend.examData.userAnswers[0] : null
        });
      }
      
      // Guardar localmente siempre como respaldo
      localStorage.setItem('protocolosState', JSON.stringify(dataToSend));
      
      console.log('Enviando datos al servidor:', JSON.stringify(dataToSend).substring(0, 200) + '...');
      
      // Enviar a servidor
      const response = await fetch(`${API_URL}/validate-and-save-exam-in-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify(dataToSend),
      });
      
      if (!response.ok) {
        // Intentar obtener mensaje de error detallado
        try {
          const errorText = await response.text();
          console.error('Error de servidor:', errorText);
          throw new Error(`Error al guardar (${response.status}): ${errorText}`);
        } catch (textError) {
          throw new Error(`Error al guardar: ${response.status}`);
        }
      }
      
      const data = await response.json();
      
      // Actualizar examId si es la primera vez
      if (data.examId && !examId) {
        setExamId(data.examId);
        console.log('Nuevo examId recibido:', data.examId);
      }
      
      setSaveStatus('saved');
      setLastSaved(new Date());
      
      return { success: true, examId: data.examId, data };
    } catch (error) {
      console.error('Error en saveExamProgressLocal:', error);
      setSaveStatus('error');
      return { success: false, error: error.message || 'Error desconocido' };
    } finally {
      console.log('==== FIN GUARDADO DE PROGRESO ====');
    }
  };

  // Función mejorada para guardar progreso en la base de datos
  const saveProgressToDB = async (isCompleted = false, forcePaused = null) => {
    try {
      setSaveStatus('saving');
      
      // Establecer estado del examen (pausa forzada o estado actual)
      const currentPauseState = forcePaused !== null ? forcePaused : paused;
      const examStatus = currentPauseState ? 'paused' : (isCompleted ? 'completed' : 'in_progress');
      
      // Usar la nueva implementación de guardado adaptada de ExamInProgress.js
      return await saveExamProgressLocal(isCompleted, currentPauseState, examStatus);
    } catch (error) {
      console.error('Error al guardar progreso:', error);
      setSaveStatus('error');
      return { success: false, error: error.message };
    }
  };

  // Función para validar y guardar el examen completo
  const validateAndSaveExam = async (examIdToValidate) => {
    try {
      console.log('Validando y guardando examen con ID:', examIdToValidate);
      
      // Formatear userAnswers con questionData completo para el backend
      const formattedUserAnswers = [];
      
      for (let i = 0; i < questions.length; i++) {
        // Crear el objeto questionData con toda la información de la pregunta
        const questionData = {
          question: questions[i].question || "",
          option_1: questions[i].option_1 || questions[i].options?.[0] || "",
          option_2: questions[i].option_2 || questions[i].options?.[1] || "",
          option_3: questions[i].option_3 || questions[i].options?.[2] || "",
          option_4: questions[i].option_4 || questions[i].options?.[3] || "",
          option_5: questions[i].option_5 || questions[i].options?.[4] || "-",
          answer: questions[i].answer || "",
          subject: questions[i].subject || questions[i].categoria || "General",
          image: questions[i].image || null,
          _id: questions[i]._id || `question_${i}`
        };
        
        formattedUserAnswers.push({
          questionId: questions[i]._id || `question_${i}`,
          selectedAnswer: userAnswers[i],
          isCorrect: null,
          questionData: questionData
        });
      }
      
      // Preparar los datos en el formato esperado por la API - siguiendo exactamente el mismo formato
      const dataToSend = {
        userId: testUserId,
        examId: examIdToValidate,
        examData: {
          type: 'protocolos',
          questions: questions,
          userAnswers: formattedUserAnswers,
          selectedAnswers: selectedAnswers,
          timeLeft: 0, // En validación final, el tiempo restante es 0
          currentQuestion: currentQuestion,
          markedAsDoubt: questionMarkedAsDoubt,
          timeUsed: totalTime - timeLeft,
          totalTime: totalTime,
          completed: true,
          status: 'completed',
          totalQuestions: questions.length
        }
      };
      
      console.log('Estructura de datos enviada:', JSON.stringify(dataToSend).substring(0, 200) + '...');
      
      // Guardar resultados y validar
      const response = await fetch(`${API_URL}/validate-and-save-exam`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify(dataToSend),
      });
      
      if (!response.ok) {
        // Intentar obtener mensaje de error detallado
        try {
          const errorText = await response.text();
          console.error('Error de servidor:', errorText);
          throw new Error(`Error al validar (${response.status}): ${errorText}`);
        } catch (textError) {
          throw new Error(`Error al validar: ${response.status}`);
        }
      }
      
      const data = await response.json();
      console.log('Examen validado con éxito:', data);
      
      // Si hay ID de examen, redirigir a la revisión
      if (data.examId) {
        console.log('Redirigiendo a pantalla de revisión con ID:', data.examId);
        navigate(`/ReviewExam/${data.examId}`);
      } else {
        // Navegar al dashboard si no hay ID
        console.log('No hay ID de examen, redirigiendo al dashboard');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error general al validar examen:', error);
      alert(`Error al validar el examen: ${error.message || 'Inténtalo de nuevo más tarde'}`);
    }
  };

  // Función optimizada para guardar progreso periódicamente
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
            alert(`Error al finalizar: ${result.error}`);
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
    
    // Permitimos guardar en cualquier momento sin importar cuándo fue el último guardado
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

  // Guardar al salir de la página
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!isSubmitted) {
        // Guardar sincronicamente antes de salir
        const formattedUserAnswers = [];
        
        for (let i = 0; i < questions.length; i++) {
          // Crear el objeto questionData con toda la información de la pregunta
          const questionData = {
            question: questions[i].question || "",
            option_1: questions[i].option_1 || questions[i].options?.[0] || "",
            option_2: questions[i].option_2 || questions[i].options?.[1] || "",
            option_3: questions[i].option_3 || questions[i].options?.[2] || "",
            option_4: questions[i].option_4 || questions[i].options?.[3] || "",
            option_5: questions[i].option_5 || questions[i].options?.[4] || "-",
            answer: questions[i].answer || "",
            subject: questions[i].subject || questions[i].categoria || "General",
            image: questions[i].image || null,
            _id: questions[i]._id || `question_${i}`
          };
          
          formattedUserAnswers.push({
            questionId: questions[i]._id || `question_${i}`,
            selectedAnswer: userAnswers[i],
            isCorrect: null,
            questionData: questionData
          });
        }
        
        const examData = {
          userId: testUserId,
          examId: examId || null,
          examData: {
            type: 'protocolos',
            questions: questions,
            userAnswers: formattedUserAnswers,
            selectedAnswers,
            timeLeft,
            currentQuestion,
            markedAsDoubt: questionMarkedAsDoubt,
            timeUsed: totalTime - timeLeft,
            totalTime,
            status: 'paused',
            totalQuestions: questions.length
          }
        };
        
        localStorage.setItem('protocolosState', JSON.stringify(examData));
        
        // Realizar una solicitud síncrona (deprecated pero necesario para este caso)
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_URL}/save-exam-progress`, false); // false = síncrono
        xhr.setRequestHeader('Content-Type', 'application/json');
        try {
          xhr.send(JSON.stringify(examData));
          console.log('Estado guardado antes de salir');
        } catch (err) {
          console.error('Error al guardar estado antes de salir:', err);
        }
        
        // Mostrar mensaje al usuario
        e.preventDefault();
        e.returnValue = '¿Seguro que quieres salir? Tu progreso del examen puede perderse.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSubmitted, testUserId, examId, examType, questions, selectedAnswers, questionMarkedAsDoubt, timeLeft, totalTime, currentQuestion, userAnswers]);

  // Manejar selección de respuesta
  const handleAnswerClick = (questionId, selectedOption) => {
    // Actualizar el estado selectedAnswers (para visualización)
    setSelectedAnswers((prevAnswers) => {
      const newAnswers = { ...prevAnswers };
      newAnswers[questionId] = selectedOption;
      return newAnswers;
    });
    
    // Actualizar userAnswers para guardar en BD
    setUserAnswers(prev => {
      const newAnswers = [...prev];
      const question = questions[questionId];
      
      // Determinar si la respuesta es correcta
      const correctAnswer = question.answer || question.correctAnswer;
      let isCorrect = false;
      
      if (typeof correctAnswer === 'number') {
        // Si es un número, comparar con el índice de la opción
        const optionIndex = [
          question.option_1,
          question.option_2,
          question.option_3,
          question.option_4,
          question.option_5
        ].findIndex(option => option === selectedOption) + 1;
        isCorrect = optionIndex === correctAnswer;
      } else {
        // Si es texto, comparar directamente
        isCorrect = selectedOption === correctAnswer;
      }
      
      // Incluir markedAsDoubt en el objeto de respuesta
      newAnswers[questionId] = {
        questionId: question._id || `question_${questionId}`,
        selectedAnswer: selectedOption,
        isCorrect: isCorrect,
        markedAsDoubt: questionMarkedAsDoubt[questionId] || false,
        questionData: {
          question: question.question || "",
          option_1: question.option_1 || question.options?.[0] || "",
          option_2: question.option_2 || question.options?.[1] || "",
          option_3: question.option_3 || question.options?.[2] || "",
          option_4: question.option_4 || question.options?.[3] || "",
          option_5: question.option_5 || question.options?.[4] || "-",
          answer: question.answer || "",
          subject: question.subject || question.categoria || "General",
          image: question.image || null
        }
      };
      
      return newAnswers;
    });
  };

  // Navegación de preguntas
  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  // Función para manejar el botón "Finalizar"
  const handleFinalizeClick = () => {
    setShowFinalizePopup(true);
  };
        
  // Enviar impugnación
  const handleDisputeSubmit = async () => {
    if (!disputeReason.trim()) {
      return;
    }
    
    const currentQ = questions[currentQuestion];
    const disputeData = {
      question: currentQ?.question || "Pregunta no disponible",
      reason: disputeReason,
      userAnswer: selectedAnswers[currentQuestion] || "Sin respuesta",
      userId: testUserId
    };

    try {
      // Llamada al backend para enviar la impugnación
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

  // Cancelar finalización
  const handleCancelFinish = () => {
    setShowFinalizePopup(false);
  };

  // Confirmar finalización y guardar
  const confirmFinalize = async () => {
    try {
      console.log('Finalizando examen de Protocolos...');
      setShowFinalizePopup(false);
      
      setIsSubmitted(true);
      setIsSaving(true);

      // Guardar cambios pendientes primero
      if (hasPendingChanges) {
        try {
          const prevSaveResult = await saveExamProgressLocal(false, null, "in_progress");
          if (prevSaveResult?.error) {
            console.warn('Advertencia al guardar cambios previos:', prevSaveResult.error);
          }
        } catch (prevSaveError) {
          console.warn('Error al guardar cambios previos:', prevSaveError);
        }
      }

      const timeUsed = totalTime - timeLeft;

      const result = await finalizeExam(
        testUserId,
        'protocolos',
        questions,
        userAnswers,
        selectedAnswers,
        timeUsed,
        totalTime,
        questionMarkedAsDoubt,
        examId
      );

      if (result.error) {
        throw new Error(result.error);
      }

      // Mostrar notificación de éxito
      setSuccessMessage('¡Examen de protocolos finalizado con éxito!');
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
      console.error('Error general al finalizar examen:', error);
      alert(`Error al finalizar el examen: ${error.message || 'Inténtalo de nuevo más tarde'}`);
      setIsSubmitted(false);
      setIsSaving(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Cerrar popup
  const handleClosePopup = () => {
    setShowFinalizePopup(false); // Cierra el pop-up
  };
  
  // Obtener opciones para la pregunta actual
  const getCurrentOptions = () => {
    if (!questions[currentQuestion]) return [];
    
    // Primero intentar usar el array options si existe
    if (questions[currentQuestion].options && Array.isArray(questions[currentQuestion].options)) {
      return questions[currentQuestion].options;
    }
    
    // Si no hay array options, extraer de los campos individuales
    return [
      questions[currentQuestion].option_1, 
      questions[currentQuestion].option_2,
      questions[currentQuestion].option_3, 
      questions[currentQuestion].option_4,
      questions[currentQuestion].option_5
    ].filter(Boolean);
  };
  
  // Formato de tiempo
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Función mejorada para pausar
  const handlePause = async () => {
    try {
      // Cambiar el estado de pausa primero
      const newPausedState = !paused;
      setPaused(newPausedState);
      
      // Guardar el estado con la nueva pausa inmediatamente
      console.log(`Examen ${newPausedState ? 'pausado' : 'reanudado'}, guardando estado...`);
      
      // Usar la implementación adaptada para guardar con el estado de pausa correcto
      setIsSaving(true);
      const result = await saveExamProgressLocal(false, newPausedState, newPausedState ? 'paused' : 'in_progress');
      setIsSaving(false);
      
      if (result && result.error) {
        console.error('Error al guardar estado de pausa:', result.error);
        alert(`Error al ${newPausedState ? 'pausar' : 'reanudar'} el examen: ${result.error}`);
      } else {
        console.log(`Examen ${newPausedState ? 'pausado' : 'reanudado'} correctamente`);
        
        // Si el examen está pausado, mostrar opción de volver al dashboard
        if (newPausedState) {
          const confirmation = window.confirm('El examen ha sido pausado y tu progreso guardado. ¿Deseas volver al dashboard?');
          if (confirmation) {
            navigate('/dashboard');
          }
        }
      }
      
    } catch (error) {
      console.error('Error:', error);
      alert(`Error al ${!paused ? 'pausar' : 'reanudar'} el examen: ${error.message || 'Error desconocido'}`);
    }
  };

  // Función para reanudar
  const resumeExam = async () => {
    if (paused) {
      setPaused(false);
    }
  };

  // Marcar pregunta como duda
  const toggleDoubtMark = (questionIndex) => {
    setQuestionMarkedAsDoubt(prev => {
      const newState = { ...prev };
      const isDubious = !newState[questionIndex];
      newState[questionIndex] = isDubious;
      
      // Actualizar también markedAsDoubt en userAnswers
      setUserAnswers(prevUserAnswers => {
        const newUserAnswers = [...prevUserAnswers];
        if (questionIndex < newUserAnswers.length) {
          // Si ya existe un objeto para esta pregunta, actualizarlo
          if (newUserAnswers[questionIndex]) {
            // Si es un objeto, actualizar la propiedad markedAsDoubt
            if (typeof newUserAnswers[questionIndex] === 'object') {
              newUserAnswers[questionIndex] = {
                ...newUserAnswers[questionIndex],
                markedAsDoubt: isDubious
              };
            } 
            // Si es un valor primitivo, convertirlo a objeto
            else {
              const question = questions[questionIndex];
              newUserAnswers[questionIndex] = {
                questionId: question._id || `question_${questionIndex}`,
                selectedAnswer: newUserAnswers[questionIndex],
                isCorrect: null,
                markedAsDoubt: isDubious,
                questionData: {
                  question: question.question || "",
                  option_1: question.option_1 || question.options?.[0] || "",
                  option_2: question.option_2 || question.options?.[1] || "",
                  option_3: question.option_3 || question.options?.[2] || "",
                  option_4: question.option_4 || question.options?.[3] || "",
                  option_5: question.option_5 || question.options?.[4] || "-",
                  answer: question.answer || "",
                  subject: question.subject || question.categoria || "General",
                  image: question.image || null
                }
              };
            }
          } 
          // Si no hay respuesta para esta pregunta, crear un objeto con solo markedAsDoubt
          else {
            const question = questions[questionIndex];
            newUserAnswers[questionIndex] = {
              questionId: question._id || `question_${questionIndex}`,
              selectedAnswer: null,
              isCorrect: null,
              markedAsDoubt: isDubious,
              questionData: {
                question: question.question || "",
                option_1: question.option_1 || question.options?.[0] || "",
                option_2: question.option_2 || question.options?.[1] || "",
                option_3: question.option_3 || question.options?.[2] || "",
                option_4: question.option_4 || question.options?.[3] || "",
                option_5: question.option_5 || question.options?.[4] || "-",
                answer: question.answer || "",
                subject: question.subject || question.categoria || "General",
                image: question.image || null
              }
            };
          }
        }
        return newUserAnswers;
      });
      
      return newState;
    });
  };

  // Guardar manualmente
  const handleManualSave = async () => {
    if (isSaving) {
      console.log('Ya hay un guardado en progreso...');
      return;
    }
    
    console.log('Guardando manualmente...');
    setIsSaving(true);
    
    // Forzar guardado inmediato con feedback visual
    try {
      const result = await saveExamProgressLocal(false);
      
      if (result && result.error) {
        console.warn('Error al guardar manualmente:', result.error);
        alert(`Error al guardar: ${result.error}`);
        setSaveStatus('error');
      } else {
        console.log('Guardado manual completado con éxito');
        setSaveStatus('saved');
        setLastSaved(new Date());
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
    } catch (error) {
      console.error('Error durante el guardado manual:', error);
      alert(`Error al guardar: ${error.message || 'Error de conexión'}`);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  // Finalizar examen
  const handleFinishExam = async () => {
    try {
      setIsSubmitted(true);
      
      // Guardar como completado usando queueProgressSave
      queueProgressSave(true);
      
      // Redirigir al dashboard después de finalizar
      setTimeout(() => {
        navigate(`/dashboard`);
      }, 1000);
    } catch (error) {
      console.error('Error al finalizar:', error);
      alert('Error al finalizar el examen. Inténtalo de nuevo.');
      setIsSubmitted(false);
    } finally {
      setShowFinalizePopup(false);
    }
  };

  //

  // Función para generar el objeto de estado para la paginación
  const generateItemStatus = useCallback(() => {
    const status = {};
    if (!questions || questions.length === 0) return status;

    for (let i = 0; i < questions.length; i++) {
      if (questionMarkedAsDoubt[i]) {
        status[i] = 'doubt';
      } else if (selectedAnswers[i]) {
        status[i] = 'answered';
      }
    }
    return status;
  }, [selectedAnswers, questionMarkedAsDoubt, questions]);

  if (isLoading) {
    return <div className="loading">Cargando preguntas de protocolos...</div>;
  }

  if (error) {
    return (
      <ErrorDisplay 
        onRetry={() => window.location.reload()} 
        onReturn={() => navigate('/dashboard')}
      />
    );
  }

  const currentOptions = getCurrentOptions();
  const examName = questions[currentQuestion]?.exam_name || '';

  return (
    <div id="exam-root" className="exam-container">
      {showStartPopup && (
        <div className="popup-overlay">
          <div className="popup">
            <h2><strong>¡Comienza tu examen de Protocolos!</strong></h2>
            <p>
              Este examen consta de <strong>30 preguntas</strong> y dispones de 
              <strong> 30 minutos</strong> para completarlo. Estas preguntas son extraídas 
              del <strong>Ministerio de Sanidad</strong>. Administra bien tu tiempo y recuerda 
              que puedes revisar y ajustar tus respuestas antes de finalizar.
            </p>
            <button onClick={handleStartExam} className="control-btn">Estoy list@</button>
          </div>
        </div>
      )}

      <ExamHeader
        timeLeft={timeLeft}
        onPause={() => setPaused(!paused)}
        onSave={handleManualSave}
        onFinish={handleFinalizeClick}
        isPaused={paused}
        isSaving={saveStatus === 'saving'}
        hasPendingChanges={false}
        toggleDarkMode={toggleDarkMode}
        onDownload={() => downloadExamPdfFromData({
          questions: questions,
          title: 'SIMULIA',
          subtitle: 'Examen: PROTOCOLOS',
          logoUrl: '/Logo_oscuro.png',
          examId: examId || '',
          date: new Date().toISOString().slice(0,10),
          durationMin: Math.round(timeLeft > 0 ? totalTime/60 : 30),
          showAnswerKey: false,
          showBubbleSheet: true,
          fileName: 'examen-protocolos.pdf'
        })}
      />

      {questions.length > 0 && (
        <QuestionBox
          currentQuestion={currentQuestion}
          questions={questions}
          userAnswers={userAnswers}
          handleAnswerClick={handleAnswerClick}
          markedAsDoubt={questionMarkedAsDoubt}
          toggleDoubtMark={toggleDoubtMark}
          onNavigate={setCurrentQuestion}
          onImpugnar={() => setIsDisputing(true)}
          isDarkMode={isDarkMode}
        />
      )}
      
      {/* Reemplazar la paginación personalizada con el componente Pagination */}
      <Pagination
        totalItems={questions.length}
        itemsPerPage={30} // Cambiar de 10 a 25 preguntas por página
        currentPage={currentPage - 1} // Convertir a base cero para el componente
        onPageChange={(page) => setCurrentPage(page + 1)} // Convertir de vuelta a base uno
        onItemSelect={setCurrentQuestion}
        activeItemIndex={currentQuestion}
        itemStatus={generateItemStatus()}
        isDarkMode={isDarkMode}
      />

      {showFinalizePopup && (
        <div className="popup-overlay">
          <div className="popup">
            <h2>¿Finalizar el examen?</h2>
            <p>Has respondido {Object.keys(selectedAnswers).length} de {questions.length} preguntas.</p>
            <div className="popup-buttons">
              <button onClick={handleCancelFinish} className="control-btn">
                Continuar revisando
              </button>
              <button onClick={confirmFinalize} className="control-btn">
                Finalizar examen
              </button>
            </div>
            {isDarkMode !== undefined && (
              <button
                className="dark-mode-toggle"
                onClick={toggleDarkMode}
                title="Activar/Desactivar Modo Oscuro"
              >
                {isDarkMode ? '☀️' : '🌙'}
              </button>
            )}
          </div>
        </div>
      )}

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

export default Protocolos;