import React, { useState, useEffect, useCallback, useRef } from 'react';
import './Quizz.css';
import { useNavigate, useLocation } from 'react-router-dom';
import { debounce } from 'lodash';
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import { API_URL } from './config';
import { finalizeExam, getExamType, saveExamProgress } from './lib/examUtils';
import SuccessNotification from './components/SuccessNotification';
import { downloadExamPdfFromData } from './lib/pdfUtils';
import ExamView from './views/exam/exam';

const createDebounce = (func, wait) => {
  let timeout;
  const executedFunction = function(...args) {
    const later = () => {
      clearTimeout(timeout);
      timeout = null;
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
  
  // Añadir función cancel
  executedFunction.cancel = () => {
    clearTimeout(timeout);
    timeout = null;
  };
  
  return executedFunction;
};

const Quizz = ({ toggleDarkMode, isDarkMode, userId }) => {
  const navigate = useNavigate();
  
  const [questions, setQuestions] = useState([]);
  const [timeLeft, setTimeLeft] = useState(3900); // 65 minutos (3900 segundos)
  const [totalTime, setTotalTime] = useState(3900); // Tiempo total para calcular tiempo usado
  const [isPaused, setPaused] = useState(true); // Siempre iniciar pausado
  const [hasStarted, setHasStarted] = useState(false); // Nuevo estado para controlar si el examen ha comenzado
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [userAnswers, setUserAnswers] = useState([]);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [showStartPopup, setShowStartPopup] = useState(true);
  const [showFinalizePopup, setShowFinalizePopup] = useState(false);
  const [isDisputing, setIsDisputing] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [examId, setExamId] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [markedAsDoubt, setMarkedAsDoubt] = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  const questionsPerPage = 25;
  
  // Variables para gestionar el guardado
  const [isSaving, setIsSaving] = useState(false);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState(0);
  
  // Para batching de cambios y reducir peticiones
  const [changesBatch, setChangesBatch] = useState({ 
    answers: {}, // Respuestas que han cambiado
    currentQuestion: null, // Si ha cambiado la pregunta actual
    doubtMarks: {} // Preguntas marcadas como duda que han cambiado
  });
  const [lastBatchTime, setLastBatchTime] = useState(Date.now());
  
  // Debounced save function
  const debouncedSave = React.useCallback(
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

  // Cuando el componente se carga, elimina cualquier progreso de un examen anterior
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('Iniciando fetchQuestions para Quizz');

        const response = await fetch(`${API_URL}/random-question-completos`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            count: 50,
            examType: 'quizz'
          })
        });

        if (!response.ok) {
          throw new Error(`Error del servidor: ${response.status}`);
        }

        const data = await response.json();
        console.log(`Recibidas ${data.length} preguntas para Quizz`);

        if (!data || !Array.isArray(data) || data.length === 0) {
          throw new Error('No se recibieron preguntas del servidor');
        }
        
        // Verificar que tengamos 50 preguntas
        if (data.length !== 50) {
          console.warn(`Se esperaban 50 preguntas pero se recibieron ${data.length}`);
          
          // Si hay más de 50, tomar solo las primeras 50
          if (data.length > 50) {
            setQuestions(data.slice(0, 50));
            setUserAnswers(new Array(50).fill(null));
          } else {
            setQuestions(data);
            setUserAnswers(new Array(data.length).fill(null));
          }
        } else {
          setQuestions(data);
          setUserAnswers(new Array(data.length).fill(null));
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error("Error en fetchQuestions:", err);
        setError(err.message);
        setIsLoading(false);
      }
    };
    
    fetchQuestions();
  }, []);

  // Pausar el cronómetro hasta que el usuario esté listo
  useEffect(() => {
    if (showStartPopup) {
      setPaused(true);
    }
  }, [showStartPopup]);

  const handleStartExam = () => {
    console.log('Iniciando quizz...');
    
    // Primero cerrar el popup
    setShowStartPopup(false);
    
    // Usar setTimeout para asegurarse de que el popup se ha cerrado antes de iniciar el cronómetro
    setTimeout(() => {
      setHasStarted(true); // Marcar que el examen ha comenzado
      setPaused(false); // Quitar la pausa
      console.log('Quizz iniciado - Cronómetro activado');
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
    
    // IMPORTANTE: No guardar si ya hay un guardado en progreso (incluyendo guardado manual)
    if (isSaving) {
      console.log('Ya hay un guardado en progreso (manual o automático), omitiendo guardado debounced...');
      return;
    }
    
    // Debug: verificar estructura de userAnswers antes de guardar
    console.log(`DEBUG - Estado actual de userAnswers:`, userAnswers);
    console.log(`DEBUG - Respuestas contestadas: ${userAnswers.filter(a => a && typeof a === 'object' && a.selectedAnswer !== null && a.selectedAnswer !== undefined).length}`);
    console.log(`DEBUG - Respuestas con duda: ${userAnswers.filter(a => a && typeof a === 'object' && a.markedAsDoubt === true).length}`);
    
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
    
    // Permitimos guardar en cualquier momento sin importar cuándo fue el último guardado
    const now = Date.now();
    const timeSinceLastSave = now - lastSaveTime;
    console.log(`Tiempo desde último guardado: ${timeSinceLastSave}ms - Procediendo con el guardado`);
    
    // Si llegamos aquí, podemos guardar
    console.log('Condiciones cumplidas para guardar, procediendo...');
    setIsSaving(true);
    setLastSaveTime(now);
    
    // Usar timeout para asegurar que todos los cambios de estado se han aplicado 
    // antes de intentar guardar
    setTimeout(() => {
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
    }, 100); // Pequeño timeout para asegurar que el estado se ha actualizado
  };

  // Función para guardar progreso en la base de datos
  const saveExamProgressLocal = async (isCompleted = false, forcePaused = null, forceStatus = null) => {
    try {
      console.log('==== INICIO GUARDADO DE PROGRESO ====');
      console.log(`UserID: test_user_1`);
      console.log(`ExamID actual: ${examId || 'NUEVO'}`);
      console.log(`Preguntas: ${questions.length}, Respuestas: ${userAnswers.length}`);
      console.log(`Estado completado: ${isCompleted}, Pausa forzada: ${forcePaused}, Estado forzado: ${forceStatus || 'no forzado'}`);

      // Establecer estado del examen (pausa forzada o estado actual)
      const currentPauseState = forcePaused !== null ? forcePaused : isPaused;
      // Si se proporciona un estado explícito, usarlo; de lo contrario, calcularlo como antes
      const examStatus = forceStatus || (currentPauseState ? 'paused' : (isCompleted ? 'completed' : 'in_progress'));
      
      // Calcular tiempo usado - asegurar que sea número
      const timeUsedValue = Math.max(0, Number(totalTime) - Number(timeLeft));
      
      console.log(`Guardando con estado: ${examStatus}, Tiempo usado: ${timeUsedValue}s`);
      
      // Obtener una copia actual del estado para asegurar que estamos enviando los datos más recientes
      const currentUserAnswers = [...userAnswers];
      const currentSelectedAnswers = {...selectedAnswers};
      const currentMarkedAsDoubt = {...markedAsDoubt};
      
      // Debug: mostrar información sobre selectedAnswers
      console.log(`DEBUG - selectedAnswers tiene ${Object.keys(currentSelectedAnswers).length} respuestas`);
      if (Object.keys(currentSelectedAnswers).length > 0) {
        console.log(`DEBUG - Primera clave en selectedAnswers: ${Object.keys(currentSelectedAnswers)[0]}, valor: ${currentSelectedAnswers[Object.keys(currentSelectedAnswers)[0]]}`);
      }
      
      // Procesar las respuestas del usuario para que coincidan con el formato esperado por el backend
      // El backend espera un array de objetos, no un array de strings
      const formattedUserAnswers = [];
      
      // Debug: verificar estructura de userAnswers antes de formatear
      console.log(`DEBUG - Estructura de userAnswers antes de formatear:`, 
                  userAnswers.length > 0 ? 
                  (typeof userAnswers[0] === 'object' ? 'Objeto' : typeof userAnswers[0]) : 
                  'Array vacío');
      
      // Debug: contar respuestas válidas antes de formatear
      const answersBeforeFormat = currentUserAnswers.filter(a => 
        a !== null && a !== undefined && 
        (typeof a === 'object' ? a.selectedAnswer !== undefined && a.selectedAnswer !== null : a !== null)
      ).length;
      console.log(`DEBUG - Respuestas válidas antes de formatear: ${answersBeforeFormat}`);
      
      // IMPORTANTE: Procesar todas las preguntas Y verificar también selectedAnswers directamente
      // para asegurar que no perdemos ninguna respuesta
      for (let i = 0; i < questions.length; i++) {
        // Obtener la respuesta del usuario de ambas fuentes
        const userAnswer = i < currentUserAnswers.length ? currentUserAnswers[i] : null;
        const hasSelectedAnswer = currentSelectedAnswers[i] !== undefined;
        
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
        
        // Determinar la respuesta seleccionada, priorizando selectedAnswers
        let finalSelectedAnswer = null;
        
        if (hasSelectedAnswer) {
          // Si existe en selectedAnswers, usar ese valor
          finalSelectedAnswer = currentSelectedAnswers[i];
        } else if (userAnswer) {
          // Si no, pero existe en userAnswers, usar ese valor
          finalSelectedAnswer = typeof userAnswer === 'object' ? userAnswer.selectedAnswer : userAnswer;
        }
        
        formattedUserAnswers.push({
          questionId: questions[i]._id || `question_${i}`,
          selectedAnswer: finalSelectedAnswer,
          isCorrect: null,
          markedAsDoubt: currentMarkedAsDoubt[i] || false,
          questionData: questionData
        });
      }
      
      // Debug: verificar estructura después de formatear
      console.log(`DEBUG - Respuestas formateadas:`, 
                  formattedUserAnswers.length > 0 ? 
                  JSON.stringify(formattedUserAnswers[0], null, 2) : 
                  'Array vacío');
      console.log(`DEBUG - Total respuestas formateadas: ${formattedUserAnswers.length}`);
      console.log(`DEBUG - Respuestas contestadas después de formatear: ${formattedUserAnswers.filter(a => a && a.selectedAnswer !== null && a.selectedAnswer !== undefined).length}`);
      
      // Asegurar que markedAsDoubt sea un objeto de booleanos, no strings
      const currentMarkedAsDoubtFormatted = {};
      Object.keys(currentMarkedAsDoubt).forEach(key => {
        currentMarkedAsDoubtFormatted[key] = Boolean(currentMarkedAsDoubt[key]);
      });
      
      // Validar si tenemos respuestas válidas
      const validAnswersCount = formattedUserAnswers.length;
      console.log(`Respuestas formateadas a guardar: ${validAnswersCount}/${questions.length}`);
      
      // Verificar que timeLeft sea un número
      const timeLeftValue = Number(timeLeft);
      if (isNaN(timeLeftValue)) {
        console.warn('timeLeft no es un número válido:', timeLeft);
      }
      
      // Verificar que totalTime sea un número
      const totalTimeValue = Number(totalTime);
      if (isNaN(totalTimeValue)) {
        console.warn('totalTime no es un número válido:', totalTime);
      }
      
      // Verificar que currentQuestion sea un número
      const currentQuestionValue = Number(currentQuestion);
      if (isNaN(currentQuestionValue)) {
        console.warn('currentQuestion no es un número válido:', currentQuestion);
      }
      
      // Llamar a la utilidad centralizada
      const result = await saveExamProgress(
        userId || 'test_user_1',
        examId || null, // Pasar null explícitamente si no hay examId
        'quizz',
        questions,
        formattedUserAnswers, // Usar las respuestas formateadas correctamente
        currentSelectedAnswers, // Usar la copia actual del estado
        timeLeftValue,
        currentQuestionValue,
        currentMarkedAsDoubtFormatted,
        timeUsedValue,
        totalTimeValue,
        Boolean(isCompleted),
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
      
      // Si hay error en el guardado, mostrar
      if (result && result.error) {
        console.error('Error al guardar estado:', result.error);
        alert(`Error al guardar: ${result.error}`);
        return result;
      } else {
        console.log('Guardado completado con éxito');
        setHasPendingChanges(false);
        return result;
      }
      
    } catch (error) {
      console.error('Error en saveExamProgress:', error);
      alert(`Error al guardar: ${error.message || 'Error desconocido'}`);
      return { error: error.message || 'Error desconocido' };
    } finally {
      console.log('==== FIN GUARDADO DE PROGRESO ====');
    }
  };

  // Uso al terminar el examen
  const handleFinishExam = async () => {
    setIsSubmitted(true);
    await saveExamProgressLocal(true);
  };

  // Evento cuando el usuario sale de la página
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!isSubmitted) {
        // Intentar guardar sin esperar la respuesta
        if (!isSubmitted) {
          console.log('Usuario intentando salir de la página, guardando estado...');
          
          // Asegurar que los valores numéricos son enviados como números, no como strings
          const timeUsedValue = Math.max(0, Number(totalTime) - Number(timeLeft));
          
          // Formatear userAnswers correctamente
          const formattedUserAnswers = [];
          
          // Asegurar que procesamos TODAS las preguntas, incluso si no tienen respuesta
          for (let i = 0; i < questions.length; i++) {
            // Obtener la respuesta del usuario si existe
            const userAnswer = i < userAnswers.length ? userAnswers[i] : null;
            
            // Si la respuesta ya tiene el formato correcto, usarla directamente
            if (userAnswer && typeof userAnswer === 'object' && userAnswer.questionId && userAnswer.questionData) {
              formattedUserAnswers.push(userAnswer);
              continue;
            }
            
            // Si no, crear el objeto questionData con toda la información de la pregunta
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
              selectedAnswer: (userAnswer && typeof userAnswer === 'object') ? userAnswer.selectedAnswer : userAnswer,
              isCorrect: null,
              markedAsDoubt: markedAsDoubt[i] || false,
              questionData: questionData
            });
          }
          
          // Forzar un guardado síncrono (no podemos esperar promesas en beforeunload)
          const dataToSend = {
            userId: userId || 'test_user_1',
            examData: {
              type: 'quizz', 
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
              userAnswers: formattedUserAnswers, // Usar el formato correcto
              selectedAnswers,
              timeLeft: Number(timeLeft),
              currentQuestion: Number(currentQuestion),
              markedAsDoubt: Object.keys(markedAsDoubt).reduce((obj, key) => {
                obj[key] = Boolean(markedAsDoubt[key]);
                return obj;
              }, {}),
              timeUsed: timeUsedValue,
              totalTime: Number(totalTime),
              completed: false,
              status: 'paused',
              totalQuestions: Number(questions.length)
            }
          };
          
          // Realizar una solicitud síncrona (deprecated pero necesario para este caso)
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `${API_URL}/validate-and-save-exam-in-progress`, false); // false = síncrono
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.setRequestHeader('Authorization', 'Bearer ' + localStorage.getItem('token'));
          try {
            xhr.send(JSON.stringify(dataToSend));
            console.log('Estado guardado antes de salir');
          } catch (err) {
            console.error('Error al guardar estado antes de salir:', err);
          }
        }
        
        // Mostrar mensaje al usuario
        e.preventDefault();
        e.returnValue = 'Hay cambios sin guardar. ¿Seguro que quieres salir?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSubmitted, questions, userAnswers, selectedAnswers, timeLeft, currentQuestion, markedAsDoubt, totalTime]);

  // Función para agregar cambios al batch
  const addToBatch = (type, data) => {
    setChangesBatch(prev => {
      const now = Date.now();
      // Si han pasado más de 5 segundos desde el último batch, crear uno nuevo
      if (now - lastBatchTime > 5000) {
        setLastBatchTime(now);
        
        if (type === 'answer') {
          return { 
            answers: { [data.questionId]: data.answer },
            currentQuestion: null,
            doubtMarks: {}
          };
        } else if (type === 'question') {
          return {
            answers: {},
            currentQuestion: data.newQuestion,
            doubtMarks: {}
          };
        } else if (type === 'doubt') {
          return {
            answers: {},
            currentQuestion: null,
            doubtMarks: { [data.questionId]: data.isDubious }
          };
        }
      }
      
      // Si no, actualizar el batch existente
      if (type === 'answer') {
        return { 
          ...prev,
          answers: { ...prev.answers, [data.questionId]: data.answer }
        };
      } else if (type === 'question') {
        return {
          ...prev,
          currentQuestion: data.newQuestion
        };
      } else if (type === 'doubt') {
        return {
          ...prev,
          doubtMarks: { ...prev.doubtMarks, [data.questionId]: data.isDubious }
        };
      }
      
      return prev;
    });
    
    // Marcar que hay cambios pendientes
    setHasPendingChanges(true);
    
    // Programar un guardado debounced
    debouncedSave();
  };

  // Modify handleAnswerClick to include markedAsDoubt property
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
    
    // Actualizar userAnswers para guardar en BD
    let answerObject;
    setUserAnswers(prev => {
      const newAnswers = [...prev];
      // Preservar el valor de markedAsDoubt si existe
      const isMarkedAsDoubt = markedAsDoubt[questionId] || false;
      
      // Verificamos que tenemos un índice válido
      if (questionId >= 0 && questionId < questions.length) {
        const questionData = {
          question: questions[questionId]?.question || "",
          option_1: questions[questionId]?.option_1 || questions[questionId]?.options?.[0] || "",
          option_2: questions[questionId]?.option_2 || questions[questionId]?.options?.[1] || "",
          option_3: questions[questionId]?.option_3 || questions[questionId]?.options?.[2] || "",
          option_4: questions[questionId]?.option_4 || questions[questionId]?.options?.[3] || "",
          option_5: questions[questionId]?.option_5 || questions[questionId]?.options?.[4] || "-",
          answer: questions[questionId]?.answer || "",
          subject: questions[questionId]?.subject || questions[questionId]?.categoria || "General",
          image: questions[questionId]?.image || null
        };
        
        answerObject = {
          questionId: questions[questionId]?._id || `question_${questionId}`,
          selectedAnswer: selectedOption,
          isCorrect: null,
          markedAsDoubt: isMarkedAsDoubt,
          questionData: questionData
        };
        
        newAnswers[questionId] = answerObject;
      }
      
      return newAnswers;
    });

    // Agregar al batch en lugar de guardar inmediatamente
    // Pasar el objeto completo de respuesta en lugar de solo el valor seleccionado
    addToBatch('answer', { questionId, answer: answerObject || { selectedAnswer: selectedOption } });
  };

  // Modify toggleDoubtMark to update markedAsDoubt in userAnswers
  const toggleDoubtMark = (questionIndex) => {
    setMarkedAsDoubt((prev) => {
      const isDubious = !prev[questionIndex];
      
      // También actualizar markedAsDoubt en userAnswers
      setUserAnswers(prevUserAnswers => {
        const newUserAnswers = [...prevUserAnswers];
        
        // Verificamos que tenemos un índice válido
        if (questionIndex >= 0 && questionIndex < questions.length) {
          // Si existe un objeto de respuesta, actualizar su propiedad markedAsDoubt
          if (newUserAnswers[questionIndex]) {
            // Si es un objeto, actualizar la propiedad
            if (typeof newUserAnswers[questionIndex] === 'object' && newUserAnswers[questionIndex] !== null) {
              newUserAnswers[questionIndex] = {
                ...newUserAnswers[questionIndex],
                markedAsDoubt: isDubious
              };
            } 
            // Si es un valor primitivo (string, número), convertirlo a objeto
            else if (newUserAnswers[questionIndex] !== null && newUserAnswers[questionIndex] !== undefined) {
              const questionData = {
                question: questions[questionIndex]?.question || "",
                option_1: questions[questionIndex]?.option_1 || questions[questionIndex]?.options?.[0] || "",
                option_2: questions[questionIndex]?.option_2 || questions[questionIndex]?.options?.[1] || "",
                option_3: questions[questionIndex]?.option_3 || questions[questionIndex]?.options?.[2] || "",
                option_4: questions[questionIndex]?.option_4 || questions[questionIndex]?.options?.[3] || "",
                option_5: questions[questionIndex]?.option_5 || questions[questionIndex]?.options?.[4] || "-",
                answer: questions[questionIndex]?.answer || "",
                subject: questions[questionIndex]?.subject || questions[questionIndex]?.categoria || "General",
                image: questions[questionIndex]?.image || null
              };
              
              newUserAnswers[questionIndex] = {
                questionId: questions[questionIndex]?._id || `question_${questionIndex}`,
                selectedAnswer: newUserAnswers[questionIndex],
                isCorrect: null,
                markedAsDoubt: isDubious,
                questionData: questionData
              };
            }
            // Si es null o undefined, crear un objeto con solo markedAsDoubt
            else {
              const questionData = {
                question: questions[questionIndex]?.question || "",
                option_1: questions[questionIndex]?.option_1 || questions[questionIndex]?.options?.[0] || "",
                option_2: questions[questionIndex]?.option_2 || questions[questionIndex]?.options?.[1] || "",
                option_3: questions[questionIndex]?.option_3 || questions[questionIndex]?.options?.[2] || "",
                option_4: questions[questionIndex]?.option_4 || questions[questionIndex]?.options?.[3] || "",
                option_5: questions[questionIndex]?.option_5 || questions[questionIndex]?.options?.[4] || "-",
                answer: questions[questionIndex]?.answer || "",
                subject: questions[questionIndex]?.subject || questions[questionIndex]?.categoria || "General",
                image: questions[questionIndex]?.image || null
              };
              
              newUserAnswers[questionIndex] = {
                questionId: questions[questionIndex]?._id || `question_${questionIndex}`,
                selectedAnswer: null,
                isCorrect: null,
                markedAsDoubt: isDubious,
                questionData: questionData
              };
            }
          }
          // Si no hay respuesta para esta pregunta, crear un objeto con solo markedAsDoubt
          else {
            const questionData = {
              question: questions[questionIndex]?.question || "",
              option_1: questions[questionIndex]?.option_1 || questions[questionIndex]?.options?.[0] || "",
              option_2: questions[questionIndex]?.option_2 || questions[questionIndex]?.options?.[1] || "",
              option_3: questions[questionIndex]?.option_3 || questions[questionIndex]?.options?.[2] || "",
              option_4: questions[questionIndex]?.option_4 || questions[questionIndex]?.options?.[3] || "",
              option_5: questions[questionIndex]?.option_5 || questions[questionIndex]?.options?.[4] || "-",
              answer: questions[questionIndex]?.answer || "",
              subject: questions[questionIndex]?.subject || questions[questionIndex]?.categoria || "General",
              image: questions[questionIndex]?.image || null
            };
            
            newUserAnswers[questionIndex] = {
              questionId: questions[questionIndex]?._id || `question_${questionIndex}`,
              selectedAnswer: null,
              isCorrect: null,
              markedAsDoubt: isDubious,
              questionData: questionData
            };
          }
        }
        return newUserAnswers;
      });
      
      // Agregar al batch en lugar de guardar inmediatamente
      addToBatch('doubt', { questionId: questionIndex, isDubious });
      
      return { ...prev, [questionIndex]: isDubious };
    });
  };

  // Función para manejar el botón "Finalizar"
  const handleFinalizeClick = () => {
    setShowFinalizePopup(true);
  };
        
  const handleDisputeSubmit = async (questionId) => {
    const disputeData = {
      question: questions[questionId]?.question || "Pregunta no disponible",
      reason: disputeReason,
    };

    try {
      // Llamada al backend para enviar la impugnación por correo
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

  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const confirmFinalize = async () => {
    try {
      if (!userId) {
        alert('No se identificó al usuario');
        return;
      }

      // Prevenir guardados automáticos durante la finalización
      setIsSubmitted(true);
      setIsSaving(true);

      // Mostrar indicador de carga
      console.log('Finalizando examen de quizz...');
      setShowFinalizePopup(false);

      // PASO CRUCIAL: Guardar los cambios pendientes primero para asegurar que la última respuesta
      // se incluya antes de finalizar el examen
      if (hasPendingChanges) {
        console.log('Se detectaron cambios pendientes antes de finalizar, guardando primero...');
        try {
          // Esperar a que se complete el guardado previo - IMPORTANTE: guardar en estado "in_progress", no como completado
          const prevSaveResult = await saveExamProgressLocal(false, null, "in_progress");
          if (prevSaveResult && prevSaveResult.error) {
            console.warn('Advertencia al guardar cambios previos:', prevSaveResult.error);
            // Continuamos aunque haya error, para intentar finalizar de todas formas
          } else {
            console.log('Cambios previos guardados correctamente antes de finalizar');
          }
        } catch (prevSaveError) {
          console.warn('Error al guardar cambios previos:', prevSaveError);
          // Continuamos aunque haya error, para intentar finalizar de todas formas
        }
      }

      // Calcular tiempo usado
      const timeUsedValue = totalTime - timeLeft;

      // Añadir logs detallados de preguntas y respuestas
      console.log('----------- RESUMEN DEL EXAMEN A ENVIAR -----------');
      console.log(`Total de preguntas: ${questions.length}`);
      console.log(`ID de examen actual: ${examId || 'NUEVO'}`);
      
      // Contar sólo las preguntas efectivamente respondidas (con selectedAnswer válida)
      const answeredCount = userAnswers.filter(r => 
        r !== null && r !== undefined && 
        (typeof r === 'object' ? r.selectedAnswer !== undefined && r.selectedAnswer !== null && r.selectedAnswer !== '' : false)
      ).length;
      
      console.log(`Total de preguntas respondidas: ${answeredCount}`);
      console.log(`Total de preguntas enviadas (incluidas sin responder): ${userAnswers.length}`);
      console.log('----------------------------------------------');

      // Formatear userAnswers correctamente
      const formattedUserAnswers = [];
      
      // Asegurar que procesamos TODAS las preguntas, incluso si no tienen respuesta
      for (let i = 0; i < questions.length; i++) {
        // Obtener la respuesta del usuario si existe
        const userAnswer = i < userAnswers.length ? userAnswers[i] : null;
        
        // Si la respuesta ya tiene el formato correcto, usarla directamente
        if (userAnswer && typeof userAnswer === 'object' && userAnswer.questionId && userAnswer.questionData) {
          formattedUserAnswers.push(userAnswer);
          continue;
        }
        
        // Si no, crear el objeto questionData con toda la información de la pregunta
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
          selectedAnswer: (userAnswer && typeof userAnswer === 'object') ? userAnswer.selectedAnswer : userAnswer,
          isCorrect: null,
          markedAsDoubt: markedAsDoubt[i] || false,
          questionData: questionData
        });
      }

      // Debug: verificar respuestas antes de finalizar
      console.log(`DEBUG - Respuestas formateadas antes de finalizar: ${formattedUserAnswers.length}`);
      console.log(`DEBUG - Respuestas contestadas: ${formattedUserAnswers.filter(a => a && a.selectedAnswer !== null && a.selectedAnswer !== undefined).length}`);

      // Utilizar la función reutilizable para finalizar
      const result = await finalizeExam(
        userId || 'test_user_1',
        'quizz', // Tipo fijo para este componente
        questions,
        formattedUserAnswers, // Usar las respuestas formateadas correctamente
        selectedAnswers,
        timeUsedValue,
        totalTime,
        markedAsDoubt,
        examId // Pasar el ID del examen actual para actualizar en lugar de crear nuevo
      );

      if (result.error) {
        console.error('Error al finalizar el quizz:', result.error);
        alert(`Error al finalizar el quizz: ${result.error}`);
        setIsSaving(false);
        setIsSubmitted(false);
        return;
      }

      // Si todo ha ido bien, actualizamos el estado
      setIsSubmitted(true);
      setIsSaving(false);
      
      // Mostrar notificación de éxito
      setSuccessMessage('¡Quizz finalizado con éxito!');
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
      console.error('Error general al finalizar quizz:', error);
      alert(`Error al finalizar el quizz: ${error.message || 'Error desconocido'}`);
      setIsSaving(false);
      setIsSubmitted(false);
    }
  };

  const handleCancelFinish = () => {
    setShowFinalizePopup(false);
  };

  const examName = questions[currentQuestion]?.exam_name || '';
  
  const getCurrentOptions = () => {
    if (!questions[currentQuestion]) return [];
    
    // Primero intentar usar el array options si existe
    if (questions[currentQuestion].options && Array.isArray(questions[currentQuestion].options)) {
      return questions[currentQuestion].options.filter(opt => opt && opt !== '-');
    }
    
    // Si no hay array options, extraer de los campos individuales
    return [
      questions[currentQuestion].option_1, 
      questions[currentQuestion].option_2,
      questions[currentQuestion].option_3, 
      questions[currentQuestion].option_4,
      questions[currentQuestion].option_5
    ].filter(option => option && option !== '-'); // Filtrar valores vacíos o "-"
  };
  
  const currentOptions = getCurrentOptions();

  // Formato de tiempo
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Función para guardar manualmente
  const handleManualSave = () => {
    if (isSaving) {
      console.log('Ya hay un guardado en progreso...');
      return;
    }
    
    console.log('Guardando manualmente...');
    
    // IMPORTANTE: Cancelar cualquier guardado debounced pendiente para evitar duplicación
    if (debouncedSave && typeof debouncedSave.cancel === 'function') {
      debouncedSave.cancel();
      console.log('Guardado debounced cancelado para evitar duplicación');
    }
    
    setIsSaving(true);
    
    // Forzar guardado inmediato con feedback visual
    setTimeout(() => {
      saveExamProgressLocal(false)
        .then(result => {
          if (result && result.error) {
            console.warn('Error al guardar manualmente:', result.error);
            alert(`Error al guardar: ${result.error}`);
          } else {
            console.log('Guardado manual completado con éxito');
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
    }, 100); // Pequeño timeout para asegurar que el estado se ha actualizado
  };

  // Handler for navigation
  const handleNavigate = (index) => {
    setCurrentQuestion(index);
    const newPage = Math.floor(index / questionsPerPage);
    if (newPage !== currentPage) {
      setCurrentPage(newPage);
    }
    addToBatch('question', { newQuestion: index });
  };

  // Helper function to generate status object for Pagination
  const generateItemStatus = useCallback(() => {
    const status = {};
    if (!questions || questions.length === 0) return status;

    for (let i = 0; i < questions.length; i++) {
      if (markedAsDoubt[i]) {
        status[i] = 'doubt';
      } else if (selectedAnswers[i]) {
        status[i] = 'answered';
      }
    }
    return status;
  }, [selectedAnswers, markedAsDoubt, questions]);

  // Re-add handlePause function
  const handlePause = () => {
    // Simply toggle the pause state without saving
    setPaused(!isPaused);
  };

  if (isLoading) {
    return <div className="loading">Cargando preguntas para el Quizz...</div>;
  }

  if (error) {
    return (
      <div className="exam-error">
        <h2>Error al cargar las preguntas</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/dashboard')} className="control-btn">
          Volver al Dashboard
        </button>
      </div>
    );
  }

  // Si no hay preguntas aún, no renderizar nada
  if (!questions || questions.length === 0) {
    return null;
  }

  // Renderizar popup de inicio si es necesario
  if (showStartPopup) {
    return (
      <div className="popup-overlay">
        <div className="popup">
          <h2>¿Listo para el desafío?</h2>
          <p>
            Responde <strong>50 preguntas</strong> en <strong>65 minutos</strong>. 
            Este modo de examen no incluye <strong>imágenes</strong>, todas son preguntas de texto
            extraídas de la base oficial. Podrás revisar y ajustar tus respuestas antes de finalizar.
          </p>
          <button onClick={handleStartExam} className="control-btn">Comenzar</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <ExamView
        questions={questions}
        userAnswers={userAnswers}
        handleAnswerClick={handleAnswerClick}
        markedAsDoubt={markedAsDoubt}
        toggleDoubtMark={toggleDoubtMark}
        onSave={handleManualSave}
        onFinalize={confirmFinalize}
        onPause={handlePause}
        onDownload={() => downloadExamPdfFromData({
          questions: questions,
          title: 'SIMULIA',
          subtitle: 'Examen: QUIZZ',
          logoUrl: '/Logo_oscuro.png',
          examId: examId || '',
          date: new Date().toISOString().slice(0,10),
          durationMin: Math.round(totalTime / 60),
          showAnswerKey: false,
          showBubbleSheet: true,
          fileName: 'examen-quizz.pdf'
        })}
        onExit={() => navigate('/dashboard')}
        timeLeft={timeLeft}
        totalTime={totalTime}
        isPaused={isPaused}
        isSaving={isSaving}
        hasPendingChanges={hasPendingChanges}
        examType="quizz"
        isReviewMode={false}
        disabledButtons={[]}
        isDarkMode={isDarkMode}
        currentQuestion={currentQuestion}
        onNavigate={handleNavigate}
        onImpugnarSubmit={async (questionId, reason) => {
          setDisputeReason(reason);
          await handleDisputeSubmit(questionId);
        }}
      />
      
      {showFinalizePopup && (
        <div className="popup-overlay">
          <div className="popup">
            <h2>¿Finalizar el Quizz?</h2>
            <p>Has respondido {Object.keys(selectedAnswers).length} de {questions.length} preguntas.</p>
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
    </>
  );
};

export default Quizz;