import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './Exam.css';
import { useNavigate, useParams } from 'react-router-dom';
import { debounce } from 'lodash';
import axios from 'axios';
import { finalizeExam, saveExamProgress } from './lib/examUtils';
import { downloadExamPdfFromData } from './lib/pdfUtils';
import { API_URL } from './config';
import ExamView from './views/exam/exam';


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

const ExamInProgress = ({ toggleDarkMode, isDarkMode, userId }) => {
  const navigate = useNavigate();
  const { examId } = useParams();
  // Use test_user_1 for testing if no userId is provided
  const effectiveUserId = userId || 'test_user_1';
  
  const [questions, setQuestions] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [isPaused, setPaused] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [userAnswers, setUserAnswers] = useState([]);
  const [examType, setExamType] = useState('simulacro');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [examState, setExamState] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [markedAsDoubt, setMarkedAsDoubt] = useState({});
  // Flag to prevent handleTimeUp from triggering during initial load
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showTimeExpiredModal, setShowTimeExpiredModal] = useState(false);
  
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

  // Cargar el examen en progreso desde el backend
  useEffect(() => {
    const loadExamInProgress = async () => {
      try {
        setIsLoading(true);
        setIsError(false);
        // Reset initial load flag
        setIsInitialLoad(true);
        
        console.log(`Cargando examen en progreso con ID: ${examId}`);
        
        // Llamar al endpoint de revisión de examen para obtener las preguntas y respuestas
        const response = await axios.get(`${API_URL}/exam-review/${examId}`);
        console.log("Datos recibidos del servidor:", response.data);
        
        if (!response.data || !response.data.exam) {
          throw new Error('No se recibieron datos válidos del servidor');
        }
        
        const examData = response.data.exam;
        const questionsData = response.data.questions || [];
        
        // Establecer el tipo de examen
        setExamType(examData.type || 'simulacro');
        
        // Establecer el tiempo restante si está disponible
        if (examData.timeLeft !== undefined && examData.timeLeft !== null && !isNaN(examData.timeLeft)) {
          console.log(`Usando tiempo restante del servidor: ${examData.timeLeft} segundos`);
          setTimeLeft(parseInt(examData.timeLeft));
          // Si también hay tiempo total, usarlo; de lo contrario usar timeLeft como tiempo total
          if (examData.totalTime !== undefined && examData.totalTime !== null && !isNaN(examData.totalTime)) {
            console.log(`Usando tiempo total del servidor: ${examData.totalTime} segundos`);
            setTotalTime(parseInt(examData.totalTime));
          } else {
            console.log(`No hay tiempo total válido, usando timeLeft como total: ${examData.timeLeft} segundos`);
            setTotalTime(parseInt(examData.timeLeft));
          }
          
          // Establecer el estado de pausa basado en el estado del examen
          if (examData.status) {
            const isPausedFromServer = examData.status === 'paused';
            console.log(`Estado del examen del servidor: ${examData.status}, estableciendo isPaused=${isPausedFromServer}`);
            setPaused(isPausedFromServer);
          } else {
            // Por defecto, no pausar cuando se carga el examen para que el tiempo siga corriendo
            console.log('No se encontró estado del examen, iniciando sin pausa');
            setPaused(false);
          }
        } else {
          console.log(`No hay tiempo válido del servidor, usando valores por defecto según tipo: ${examData.type}`);
          // Establecer tiempo por defecto según el tipo de examen
          switch (examData.type) {
            case 'protocolos':
              setTimeLeft(1800); // 30 minutos
              setTotalTime(1800);
              break;
            case 'contrarreloj':
              setTimeLeft(840); // 14 minutos
              setTotalTime(840);
              break;
            case 'quizz':
              setTimeLeft(3900); // 65 minutos
              setTotalTime(3900);
              break;
            default:
              setTimeLeft(16200); // 4h 30min para simulacro
              setTotalTime(16200);
          }
          // Por defecto, no pausar
          setPaused(false);
        }
        
        // Establecer las preguntas
        setQuestions(questionsData);
        
        // Procesar las respuestas del usuario
        if (examData.userAnswers && Array.isArray(examData.userAnswers)) {
          console.log('Respuestas del usuario recibidas:', examData.userAnswers);
          
          // Guardar las respuestas completas tal como vienen del servidor
          setUserAnswers(examData.userAnswers);
          
          // Crear un mapa de respuestas seleccionadas para la UI
          const selectedMap = {};
          
          // Mapear las respuestas a los índices de las preguntas
          questionsData.forEach((question, index) => {
            const answer = examData.userAnswers.find(a => 
              a && a.questionId && question._id && 
              a.questionId.toString() === question._id.toString()
            );
            
            if (answer && answer.selectedAnswer) {
              selectedMap[index] = answer.selectedAnswer;
              console.log(`Pregunta ${index + 1}: Respuesta seleccionada: ${answer.selectedAnswer}`);
            }
          });
          
          setSelectedAnswers(selectedMap);
        }
        
        // Establecer la pregunta actual
        if (examData.currentQuestion !== undefined) {
          setCurrentQuestion(examData.currentQuestion);
        } else {
          setCurrentQuestion(0);
        }
        
        // Establecer marcas de duda si existen
        // IMPORTANTE: Solo cargar las marcas de duda de este examen específico
        if (examData.markedAsDoubt) {
          if (typeof examData.markedAsDoubt === 'object') {
            const doubtMarks = {};
            
            // Si es un MongoDB Map (formato { dataType: 'Map', value: {...} })
            if (examData.markedAsDoubt.dataType === 'Map' && examData.markedAsDoubt.value) {
              Object.entries(examData.markedAsDoubt.value).forEach(([key, value]) => {
                if (value === true) {
                  doubtMarks[key] = true;
                }
              });
            } else {
              // Si es un objeto regular
              Object.entries(examData.markedAsDoubt).forEach(([key, value]) => {
                if (value === true) {
                  doubtMarks[key] = true;
                }
              });
            }
            
            setMarkedAsDoubt(doubtMarks);
          }
        } else {
          // Si no hay marcas de duda en el examen, inicializar como objeto vacío
          // Esto asegura que no se carguen marcas de duda de otros exámenes
          setMarkedAsDoubt({});
        }
        
        setIsLoading(false);
        
        // Set isInitialLoad to false after a short delay to prevent immediate popup
        setTimeout(() => {
          setIsInitialLoad(false);
          console.log('Carga inicial completada, habilitando el temporizador');
        }, 1000);
        
      } catch (error) {
        console.error('Error al cargar el examen en progreso:', error);
        setIsError(true);
        setIsLoading(false);
        setIsInitialLoad(false);
      }
    };
    
    loadExamInProgress();
  }, [examId]);

  // Manejar el temporizador
  useEffect(() => {
    let timer;
    if (timeLeft > 0 && !isPaused && !isSubmitted) {
      console.log(`Temporizador activo: ${timeLeft} segundos restantes`);
      timer = setInterval(() => {
        setTimeLeft(prevTime => {
          const newTime = prevTime - 1;
          if (newTime <= 0) {
            console.log('Tiempo agotado');
            clearInterval(timer);
            handleTimeUp();
            return 0;
          }
          return newTime;
        });
      }, 1000);
    } else if (timeLeft <= 0 && !isSubmitted && !isPaused && !isInitialLoad) {
      // Solo mostrar el popup de tiempo agotado si realmente se agotó el tiempo,
      // no es solo porque estamos cargando el examen inicialmente, y la carga inicial ya terminó
      console.log('Tiempo agotado al iniciar');
      handleTimeUp();
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [timeLeft, isPaused, isSubmitted, isInitialLoad]);

  // Manejar cuando se acaba el tiempo
  const handleTimeUp = () => {
    console.log('Ejecutando handleTimeUp - Tiempo agotado');
    setPaused(true);
  setShowTimeExpiredModal(true);
  };

  // Manejar clic en respuesta
  const handleAnswerClick = (questionIndex, selectedOption) => {
    if (isSubmitted) return;
    
    // Actualizar selectedAnswers para la UI
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: selectedOption
    }));
    
    // Check if this question was marked as doubt
    const wasMarkedAsDoubt = markedAsDoubt[questionIndex] || 
                            (userAnswers[questionIndex] && 
                             typeof userAnswers[questionIndex] === 'object' && 
                             userAnswers[questionIndex].markedAsDoubt);
    
    // If it was marked as doubt, remove the doubt mark
    if (wasMarkedAsDoubt) {
      setMarkedAsDoubt(prev => {
        const updated = { ...prev };
        delete updated[questionIndex];
        return updated;
      });
    }
    
    // Actualizar userAnswers con el formato completo
    setUserAnswers(prev => {
      const updatedAnswers = [...prev];
      const question = questions[questionIndex];
      
      // Buscar si ya existe una respuesta para esta pregunta
      const existingIndex = updatedAnswers.findIndex(a => 
        a && a.questionId && question._id && 
        a.questionId.toString() === question._id.toString()
      );
      
      // Determinar si la respuesta es correcta
      // Primero verificar si el answer es un número (índice) o un texto
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
      
      // Reset the markedAsDoubt flag when answering the question
      const isMarkedAsDoubt = false;
      
      // Crear el objeto de respuesta con el formato completo
      const updatedAnswer = {
        questionId: question._id,
        selectedAnswer: selectedOption,
        isCorrect: isCorrect,
        markedAsDoubt: isMarkedAsDoubt, // Reset markedAsDoubt when answering
        questionData: {
          question: question.question || '',
          option_1: question.option_1 || question.options?.[0] || '',
          option_2: question.option_2 || question.options?.[1] || '',
          option_3: question.option_3 || question.options?.[2] || '',
          option_4: question.option_4 || question.options?.[3] || '',
          option_5: question.option_5 || question.options?.[4] || '',
          answer: correctAnswer || '',
          subject: question.subject || question.categoria || 'General',
          image: question.image || null
        }
      };
      
      console.log(`Guardando respuesta para pregunta ${questionIndex + 1}:`, updatedAnswer);
      
      if (existingIndex !== -1) {
        updatedAnswers[existingIndex] = updatedAnswer;
      } else {
        updatedAnswers.push(updatedAnswer);
      }
      
      return updatedAnswers;
    });
    
    // Marcar que hay cambios pendientes para guardar
    setHasPendingChanges(true);
    
    // Actualizar el batch de cambios
    setChangesBatch(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionIndex]: selectedOption
      }
    }));

    // MEJORA: Si el examen ya tiene ID, forzar guardado inmediato de la última respuesta
    // para asegurar que se registra correctamente
    if (examId) {
      console.log(`Examen ya existente con ID ${examId}, guardando respuesta inmediatamente`);
      // Usar un pequeño timeout para asegurar que el estado se ha actualizado antes de guardar
      setTimeout(() => {
        if (!isSubmitted && !isSaving) {
          console.log('Guardando respuesta inmediatamente para prevenir pérdida de datos');
          queueProgressSave();
        }
      }, 100);
    } else {
      console.log('Examen nuevo, la respuesta se guardará en el próximo batch');
      // Activar el guardado debounced para exámenes sin ID
      debouncedSave();
    }
  };

  // Manejar marcar como duda
  const toggleDoubtMark = (questionIndex) => {
    if (isSubmitted) return;
    
    // Update markedAsDoubt state
    setMarkedAsDoubt(prev => {
      const isDubious = !prev[questionIndex];
      const updated = { ...prev };
      updated[questionIndex] = isDubious;
      
      // Also update the markedAsDoubt property in the corresponding userAnswers object
      setUserAnswers(prevUserAnswers => {
        const updatedAnswers = [...prevUserAnswers];
        
        // Find the answer object for this question
        const question = questions[questionIndex];
        const existingIndex = updatedAnswers.findIndex(a => 
          a && a.questionId && question._id && 
          a.questionId.toString() === question._id.toString()
        );
        
        if (existingIndex !== -1) {
          // Update existing answer object
          updatedAnswers[existingIndex] = {
            ...updatedAnswers[existingIndex],
            markedAsDoubt: isDubious
          };
        } else {
          // Create new answer object with just markedAsDoubt if it doesn't exist
          updatedAnswers.push({
            questionId: question._id,
            selectedAnswer: null,
            isCorrect: null,
            markedAsDoubt: isDubious,
            questionData: {
              question: question.question || '',
              option_1: question.option_1 || question.options?.[0] || '',
              option_2: question.option_2 || question.options?.[1] || '',
              option_3: question.option_3 || question.options?.[2] || '',
              option_4: question.option_4 || question.options?.[3] || '',
              option_5: question.option_5 || question.options?.[4] || '',
              answer: question.answer || question.correctAnswer || '',
              subject: question.subject || question.categoria || 'General',
              image: question.image || null
            }
          });
        }
        
        return updatedAnswers;
      });
      
      return updated;
    });
    
    // Marcar que hay cambios pendientes para guardar
    setHasPendingChanges(true);
    
    // Actualizar el batch de cambios
    setChangesBatch(prev => ({
      ...prev,
      doubtMarks: {
        ...prev.doubtMarks,
        [questionIndex]: !markedAsDoubt[questionIndex]
      }
    }));
    
    // MEJORA: Si el examen ya tiene ID, forzar guardado inmediato de la marca de duda
    // para asegurar que se registra correctamente
    if (examId) {
      console.log(`Examen ya existente con ID ${examId}, guardando marca de duda inmediatamente`);
      // Usar un pequeño timeout para asegurar que el estado se ha actualizado antes de guardar
      setTimeout(() => {
        if (!isSubmitted && !isSaving) {
          console.log('Guardando marca de duda inmediatamente para prevenir pérdida de datos');
          queueProgressSave();
        }
      }, 100);
    } else {
      console.log('Examen nuevo, la marca de duda se guardará en el próximo batch');
      // Activar el guardado debounced para exámenes sin ID
      debouncedSave();
    }
  };

  // Manejar navegación entre preguntas
  const handleNavigate = (index) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestion(index);

      // Actualizar el batch de cambios
      setChangesBatch(prev => ({
        ...prev,
        currentQuestion: index
      }));

      // Marcar que hay cambios pendientes para guardar
      setHasPendingChanges(true);

      // Activar el guardado debounced
      debouncedSave();
    }
  };

  // Añadir una función saveExamProgressLocal similar a la de Exam.js
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
        examType,
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
          // Actualizar el ID en la URL sin recargar la página
          window.history.replaceState(null, '', `/exam-in-progress/${result.examId}`);
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

  // Reemplazar queueProgressSave para que use saveExamProgressLocal
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
    
    // ELIMINADA LIMITACIÓN DE FRECUENCIA DE GUARDADO
    // Ahora permitimos guardar en cualquier momento sin importar cuándo fue el último guardado
    const now = Date.now();
    const timeSinceLastSave = now - lastSaveTime;
    console.log(`Tiempo desde último guardado: ${timeSinceLastSave}ms - Procediendo con el guardado`);
    
    // Si llegamos aquí, podemos guardar
    console.log('Condiciones cumplidas para guardar, procediendo...');
    setIsSaving(true);
    setLastSaveTime(now);
    
    // Guardar y resetear estado - IMPORTANTE: siempre usar isCompleted=false para guardados manuales
    saveExamProgressLocal(false, null, "in_progress")
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

  // Manejar pausa del examen
  const handlePause = () => {
    setPaused(true);
    // Usar estado explícito al pausar
    queueProgressSave();
  };

  // Manejar reanudación del examen
  const handleResume = () => {
    // Si el tiempo es 0 o negativo pero el usuario quiere continuar, dar un poco de tiempo
    if (timeLeft <= 0) {
      console.log('Tiempo agotado, pero añadiendo 5 segundos para continuar');
      setTimeLeft(5); // Dar 5 segundos para que el usuario pueda finalizar manualmente
    }
    
    setPaused(false);
  setShowTimeExpiredModal(false);
  };

  // Actualizar handleFinalize para añadir mecanismo de respaldo
  const handleFinalize = async () => {
    try {
      setShowTimeExpiredModal(false);
      
      if (!effectiveUserId) {
        alert('No se identificó al usuario');
        return;
      }

      // Prevenir guardados automáticos durante la finalización
      setIsSubmitted(true);
      setIsSaving(true);

      // Mostrar indicador de carga
      console.log('Finalizando examen...');
      // Nota: El popup de finalización ya se cierra en ExamView antes de llamar a onFinalize()

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

      // IMPORTANTE: Usar directamente finalizeExam en lugar de saveExamProgress
      // Esto asegura que el examen se marque como completado correctamente
      console.log(`Usando finalizeExam para tipo: ${examType}`);
      
      const result = await finalizeExam(
        effectiveUserId,
        examType,
        questions,
        userAnswers,
        selectedAnswers,
        timeUsedValue,
        totalTime,
        markedAsDoubt,
        examId // Pasar el ID del examen actual para actualizar en lugar de crear nuevo
      );
      
      // Si hay error en finalizeExam, intentar guardar como respaldo
      if (result.error) {
        console.error('Error al finalizar el examen:', result.error);
        
        // Intentar guardar como completado como último recurso
        try {
          console.log('Intentando guardar como completado tras error en finalizeExam...');
          const saveResult = await saveExamProgressLocal(true, false, 'completed');
          
          if (saveResult?.error) {
            console.warn('Error al guardar progreso final:', saveResult.error);
            alert(`Error al finalizar el examen: ${result.error}`);
          } else {
            console.log('Progreso guardado como completado tras error en finalizeExam');
            // Si tenemos un ID, navegar a la revisión
            if (saveResult.examId) {
              navigate(`/review/${saveResult.examId}`);
              return;
            } else {
              alert(`Error al finalizar el examen: ${result.error}`);
            }
          }
        } catch (saveError) {
          console.error('Error al intentar guardar como respaldo:', saveError);
          alert(`Error al finalizar el examen: ${result.error}`);
        } finally {
          setIsSaving(false);
          setIsSubmitted(false);
        }
        
        return;
      }

      // Si llegamos aquí, el resultado de finalizeExam fue exitoso
      console.log('Examen finalizado correctamente');
      
      // Mostrar notificación de éxito

      // Esperar 2 segundos antes de redirigir
      setTimeout(() => {
        if (result.examId) {
          navigate(`/review/${result.examId}`);
        } else {
          console.error('Examen finalizado pero no se recibió ID');
          navigate('/dashboard');
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error en handleFinalize:', error);
      alert(`Error al finalizar el examen: ${error.message || 'Error desconocido'}`);
      setIsSaving(false);
      setIsSubmitted(false);
    }
  };

  const handleImpugnarSubmit = async (questionIndex, reason) => {
    try {
      if (!reason || !reason.trim()) {
        alert('Por favor, ingresa un motivo para la impugnación.');
        return;
      }
      
      const currentQuestionData = questions[questionIndex];
      
      // Enviar la impugnación al backend
      const disputeData = {
        question: currentQuestionData?.question || "Pregunta no disponible",
        reason: reason,
        userId: effectiveUserId,
        userEmail: null
      };

      console.log('🔧 IMPUGNACIÓN DEBUG - Enviando impugnación...');
      console.log('🔧 IMPUGNACIÓN DEBUG - API_URL:', API_URL);
      console.log('🔧 IMPUGNACIÓN DEBUG - disputeData:', disputeData);
      
      await axios.post(`${API_URL}/send-dispute`, disputeData);
      
      console.log('🔧 IMPUGNACIÓN DEBUG - Impugnación enviada correctamente');
      alert('Impugnación enviada correctamente.');
    } catch (error) {
      console.error('🔧 IMPUGNACIÓN DEBUG - Error al enviar impugnación:', error);
      console.error('🔧 IMPUGNACIÓN DEBUG - Error response:', error.response?.data);
      console.error('🔧 IMPUGNACIÓN DEBUG - Error status:', error.response?.status);
      alert('Error al enviar la impugnación. Inténtalo de nuevo.');
    }
  };

  const userAnswersForView = useMemo(() => {
    if (!questions || questions.length === 0) return [];

    return questions.map((question, index) => {
      if (!question) return null;

      const existingAnswer = userAnswers.find(answer =>
        answer && answer.questionId && question._id &&
        answer.questionId.toString() === question._id.toString()
      );

      if (existingAnswer) {
        return {
          ...existingAnswer,
          markedAsDoubt: existingAnswer.markedAsDoubt || markedAsDoubt[index] || false
        };
      }

      const selectedAnswer = selectedAnswers[index];

      if (selectedAnswer !== undefined && selectedAnswer !== null) {
        return {
          questionId: question._id,
          selectedAnswer,
          isCorrect: null,
          markedAsDoubt: markedAsDoubt[index] || false,
          questionData: {
            question: question.question || '',
            option_1: question.option_1 || question.options?.[0] || '',
            option_2: question.option_2 || question.options?.[1] || '',
            option_3: question.option_3 || question.options?.[2] || '',
            option_4: question.option_4 || question.options?.[3] || '',
            option_5: question.option_5 || question.options?.[4] || '',
            answer: question.answer || question.correctAnswer || '',
            subject: question.subject || question.categoria || 'General',
            image: question.image || null
          }
        };
      }

      if (markedAsDoubt[index]) {
        return {
          questionId: question._id,
          selectedAnswer: null,
          isCorrect: null,
          markedAsDoubt: true,
          questionData: {
            question: question.question || '',
            option_1: question.option_1 || question.options?.[0] || '',
            option_2: question.option_2 || question.options?.[1] || '',
            option_3: question.option_3 || question.options?.[2] || '',
            option_4: question.option_4 || question.options?.[3] || '',
            option_5: question.option_5 || question.options?.[4] || '',
            answer: question.answer || question.correctAnswer || '',
            subject: question.subject || question.categoria || 'General',
            image: question.image || null
          }
        };
      }

      return null;
    });
  }, [questions, userAnswers, selectedAnswers, markedAsDoubt]);

  const handleTogglePause = () => {
    if (isPaused) {
      handleResume();
    } else {
      handlePause();
    }
  };

  const handleExitExam = () => {
    if (!isSubmitted && hasPendingChanges) {
      const shouldExit = window.confirm('Tienes cambios sin guardar. ¿Seguro que quieres salir?');
      if (!shouldExit) {
        return;
      }
    }
    navigate('/dashboard');
  };

  const handleCloseTimeExpiredModal = () => {
    setShowTimeExpiredModal(false);
  };

  // Renderizar pantalla de carga
  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Cargando examen en progreso...</p>
      </div>
    );
  }

  // Renderizar pantalla de error
  if (isError) {
    return (
      <ErrorDisplay
        onRetry={() => window.location.reload()}
        onReturn={() => navigate('/dashboard')}
      />
    );
  }

  // Renderizar examen
  return (
    <div id="exam-root" className={`exam-container ${isDarkMode ? 'dark' : ''}`}>
      <ExamView
        questions={questions}
        userAnswers={userAnswersForView}
        handleAnswerClick={handleAnswerClick}
        markedAsDoubt={markedAsDoubt}
        toggleDoubtMark={toggleDoubtMark}
        onSave={() => queueProgressSave(false)}
        onFinalize={handleFinalize}
        onPause={handleTogglePause}
        onDownload={() => downloadExamPdfFromData({
          questions: questions,
          title: 'SIMULIA',
          subtitle: `Examen en progreso: ${examType.toUpperCase()}`,
          logoUrl: '/Logo_oscuro.png',
          examId: examId || '',
          date: new Date().toISOString().slice(0,10),
          durationMin: Math.round(totalTime / 60),
          showAnswerKey: false,
          showBubbleSheet: true,
          fileName: `examen-${examId || 'en-curso'}.pdf`
        })}
        onExit={handleExitExam}
        timeLeft={timeLeft}
        totalTime={totalTime}
        isPaused={isPaused}
        isSaving={isSaving}
        hasPendingChanges={hasPendingChanges}
        examType={examType}
        isDarkMode={isDarkMode}
        currentQuestion={currentQuestion}
        onNavigate={handleNavigate}
        onTimeUp={handleTimeUp}
        disabledButtons={[]}
        onImpugnarSubmit={handleImpugnarSubmit}
      />

      {showTimeExpiredModal && (
        <div className="popup-overlay">
          <div className="popup">
            <h2>Tiempo agotado</h2>
            <p>El tiempo del examen ha finalizado. Puedes revisarlo rápidamente o finalizar ahora.</p>
            <div className="popup-buttons">
              <button onClick={handleCloseTimeExpiredModal} className="control-btn">
                Revisar antes de finalizar
              </button>
              <button onClick={handleFinalize} className="control-btn">
                Finalizar examen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamInProgress;
