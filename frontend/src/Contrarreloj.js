import React, { useState, useEffect, useCallback } from 'react';
import { debounce } from 'lodash';
import './Contrarreloj.css';
import { useNavigate } from 'react-router-dom';
import { API_URL } from './config';
import Dashboard from './Dashboard';
import { finalizeExam, saveExamProgress, resumeExam as resumeExamUtil } from './lib/examUtils';
import SuccessNotification from './components/SuccessNotification';
import { downloadCurrentExamPdf, downloadExamPdfFromData } from './lib/pdfUtils';
import ExamView from './views/exam/exam';

const Contrarreloj = ({ userId }) => {
  const [questions, setQuestions] = useState([]);
  const [timeLeft, setTimeLeft] = useState(840); // 14 minutos (global)
  const [paused, setPaused] = useState(true); // Siempre iniciar pausado
  const [hasStarted, setHasStarted] = useState(false); // Nuevo estado para controlar si el examen ha comenzado
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [showStartPopup, setShowStartPopup] = useState(true);
  const [showFinalizePopup, setShowFinalizePopup] = useState(false); // Estado del pop-up
  const [isDisputing, setIsDisputing] = useState(false); // Controla si se está escribiendo una impugnación
  const [disputeReason, setDisputeReason] = useState(''); // Almacena la razón de la impugnación
  const [showExitPopup, setShowExitPopup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [examId, setExamId] = useState(null);
  const [lastSaveTime, setLastSaveTime] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [userAnswers, setUserAnswers] = useState([]);
  const [doubtMarkedQuestions, setDoubtMarkedQuestions] = useState({}); // Estado para preguntas marcadas como duda
  const [markedAsDoubt, setMarkedAsDoubt] = useState({});
  const [isDarkMode, setIsDarkMode] = useState(document.body.classList.contains('dark'));
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [totalTime] = useState(840); // 14 minutos
  const [currentPage, setCurrentPage] = useState(0);
  const [timePerQuestion] = useState(40); // 40 segundos por pregunta

  // Detectar cambios en el modo oscuro
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' && mutation.target === document.body) {
          setIsDarkMode(document.body.classList.contains('dark'));
        }
      });
    });
    
    observer.observe(document.body, { attributes: true });
    
    return () => observer.disconnect();
  }, []);

  console.log("Cargando componente Contrarreloj");
 
  // Mover fetchQuestions fuera del useEffect para que sea accesible en todo el componente
  const fetchQuestions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Iniciando fetchQuestions para Contrarreloj');

      const response = await fetch(`${API_URL}/random-question-completos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          count: 20,
          examType: 'contrarreloj'
        })
      });

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const data = await response.json();
      console.log(`Recibidas ${data.length} preguntas para Contrarreloj`);

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No se recibieron preguntas del servidor');
      }

      console.log('Preguntas recibidas:', data.length);
      setQuestions(data);
      // Inicializar userAnswers como un array vacío del tamaño de las preguntas
      setUserAnswers(new Array(data.length).fill(null));
      
      // Inicializar markedAsDoubt como objeto vacío para un examen nuevo
      // Esto asegura que las marcas de duda de exámenes anteriores no se apliquen
      setMarkedAsDoubt({});
      
      setIsLoading(false);

    } catch (err) {
      console.error("Error en fetchQuestions:", err);
      setError(err.message || 'Error al cargar las preguntas');
      setIsLoading(false);
    }
  };

  // Función para limpiar todos los datos locales de exámenes
  const clearAllExamData = () => {
    console.log('Limpiando todos los datos locales de exámenes');
    
    // Limpiar localStorage
    localStorage.removeItem('contrarrelojAnswers');
    localStorage.removeItem('contrarrelojDoubts');
    
    // Reiniciar estados importantes
    setSelectedAnswers({});
    setDoubtMarkedQuestions({});
    setExamId(null);
    
    // Reiniciar respuestas
    if (questions.length > 0) {
      setUserAnswers(new Array(questions.length).fill(null));
    } else {
      setUserAnswers([]);
    }
    
    console.log('Datos locales de exámenes limpiados');
  };

  // Modificar el useEffect para usar resumeExam
  useEffect(() => {
    let isMounted = true;

    // Limpiar datos al principio para empezar fresco
    clearAllExamData();

    // Intentar restaurar progreso antes de cargar nuevas preguntas
    const effectiveUserId = userId || 'test_user_1';
    if (effectiveUserId) {
      resumeExam()
        .then(progressRestored => {
          if (isMounted) {
            // Si no se restauró progreso anterior o no hubo preguntas, cargar nuevas preguntas
            if (!progressRestored || !questions || questions.length === 0) {
              console.log('No se restauró progreso, cargando nuevas preguntas');
              fetchQuestions();
            } else {
              // Si se restauró correctamente, desactivar la pantalla de inicio
              console.log('Progreso restaurado correctamente, omitiendo pantalla de inicio');
              setShowStartPopup(false);
            }
          }
        })
        .catch(error => {
          if (isMounted) {
            console.error('Error al intentar restaurar el examen:', error);
            console.log('Cargando nuevas preguntas después del error');
            clearAllExamData();
            fetchQuestions();
          }
        });
    } else {
      // Si no hay userId, simplemente cargar nuevas preguntas
      console.log('No hay userId, cargando nuevas preguntas directamente');
      fetchQuestions();
    }

    return () => {
      isMounted = false;
    };
  }, [userId]);

  // Pausar el cronómetro hasta que el usuario esté listo
  // Asegurarse de que el examen esté pausado al inicio y cuando se muestra el popup
  useEffect(() => {
    setPaused(true);
  }, []);

  useEffect(() => {
    if (showStartPopup) {
      setPaused(true);
      setTimeLeft(840); // Reiniciar el tiempo cuando se muestra el popup
    }
  }, [showStartPopup]);

  const handleStartExam = () => {
    console.log('==== INICIALIZANDO NUEVO EXAMEN CONTRARRELOJ ====');
    
    // Limpiar localStorage al iniciar nuevo examen
    localStorage.removeItem('contrarrelojAnswers');
    localStorage.removeItem('contrarrelojDoubts');
    console.log('LocalStorage limpiado');
    
    // Reiniciar estados importantes
    setSelectedAnswers({});
    setDoubtMarkedQuestions({});
    setExamId(null); // Asegurarse de que el examId sea null para un nuevo examen
    
    if (questions.length > 0) {
      console.log(`Inicializando array de respuestas para ${questions.length} preguntas`);
      setUserAnswers(new Array(questions.length).fill(null));
    }
    
    // Primero cerrar la pantalla de inicio
    setShowStartPopup(false);
    
    // Usar setTimeout para asegurarse de que el popup se ha cerrado antes de iniciar el cronómetro
    setTimeout(() => {
      setHasStarted(true); // Marcar que el examen ha comenzado
      setPaused(false); // Quitar la pausa
      console.log('Examen iniciado - Cronómetro activado');
    }, 100);
    
    console.log('Estado reiniciado, comenzando examen nuevo');
    
    // Guardar estado inicial del examen
    setTimeout(() => {
      console.log('Guardando estado inicial del examen');
      queueProgressSave(false);
    }, 200);
    
    console.log('==== EXAMEN CONTRARRELOJ INICIADO ====');
  };

  useEffect(() => {
    let globalTimer;
    console.log('Cronómetro useEffect - paused:', paused, 'hasStarted:', hasStarted, 'timeLeft:', timeLeft);

    // Solo iniciar el cronómetro si el examen ha comenzado y no está pausado
    if (hasStarted && !paused && timeLeft > 0) {
      console.log('Iniciando cronómetro - condiciones cumplidas');
      globalTimer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else {
      console.log('Cronómetro no iniciado:', {
        hasStarted,
        paused,
        timeLeft,
        reason: !hasStarted ? 'no iniciado' : paused ? 'pausado' : 'tiempo agotado'
      });
    }

    // Finalizar examen al agotarse el tiempo global
    if (timeLeft === 0) {
      clearInterval(globalTimer);
      setShowFinalizePopup(true); // Mostrar pop-up al agotarse el tiempo
    }

    return () => {
      if (globalTimer) {
        console.log('Limpiando cronómetro');
        clearInterval(globalTimer);
      }
    };
  }, [paused, hasStarted, timeLeft]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Normaliza cualquier estructura de respuesta a un valor plano
  const extractSelectedAnswer = (answer) => {
    if (answer && typeof answer === 'object' && answer.selectedAnswer !== undefined) {
      return answer.selectedAnswer;
    }
    return answer ?? null;
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      // No auto-save when changing questions
      // queueProgressSave();
    } else {
      setShowFinalizePopup(true); // Si es la última pregunta, finaliza
    }
  };

  // Callback cuando se acaba el tiempo de una pregunta
  const handleTimeUp = () => {
    console.log('Tiempo agotado para la pregunta', currentQuestion);
    // Saltar automáticamente a la siguiente pregunta
    handleNextQuestion();
  };

  // Función para guardar progreso en el backend usando examUtils
  const saveProgressToDB = async (isCompleted = false) => {
    if (!userId) {
      console.log('No se encontró userId, usando test_user_1');
    }
    
    try {
      setIsSaving(true);
      console.log('==== INICIO GUARDADO DE PROGRESO CONTRARRELOJ ====');
      console.log(`UserID: ${userId || 'test_user_1'}, ExamID: ${examId || 'NUEVO'}`);
      console.log(`Preguntas: ${questions.length}, Respuestas registradas: ${Object.keys(selectedAnswers).length}`);
      
      // Verificar que las preguntas estén cargadas
      if (!questions || questions.length === 0) {
        console.error('No hay preguntas cargadas para guardar');
        return { success: false, error: 'No hay preguntas para guardar' };
      }
      
      // Obtener copias actuales del estado para evitar inconsistencias por actualizaciones asíncronas
      const currentSelectedAnswers = {...selectedAnswers};
      const currentUserAnswers = [...userAnswers];
      const currentDoubtMarkedQuestions = {...doubtMarkedQuestions};
      
      // DEPURACIÓN: Listar respuestas para verificar lo que se está enviando
      console.log('Respuestas seleccionadas a enviar:', currentSelectedAnswers);
      console.log('Total de respuestas seleccionadas:', Object.keys(currentSelectedAnswers).length);
      
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
          image: questions[i].image || null
        };
        
        formattedUserAnswers.push({
          questionId: questions[i]._id || `question_${i}`,
          selectedAnswer: extractSelectedAnswer(currentUserAnswers[i]),
          isCorrect: null,
          questionData: questionData
        });
      }
      
      // Calcular tiempo usado (tiempo total - tiempo restante)
      const timeUsed = 840 - timeLeft;
      
      console.log(`Guardando examen con estado: ${isCompleted ? 'completed' : 'in_progress'}`);
      console.log(`Tiempo usado: ${timeUsed}s, Tiempo restante: ${timeLeft}s`);
      
      // Usar la función centralizada de examUtils - Usar test_user_1 como userId por defecto
      const result = await saveExamProgress(
        userId || 'test_user_1',
        examId,
        'contrarreloj',
        questions,
        formattedUserAnswers,
        currentSelectedAnswers,
        timeLeft,
        currentQuestion,
        currentDoubtMarkedQuestions,
        timeUsed,
        840, // Tiempo total en segundos
        isCompleted,
        isCompleted ? 'completed' : 'in_progress'
      );
      
      console.log('Respuesta del servidor:', result);
      
      // Si es la primera vez que guardamos, guardar el ID del examen
      if (result.examId && !examId) {
        setExamId(result.examId);
        console.log('ID del examen guardado:', result.examId);
      }
      
      setIsSaving(false);
      setLastSaveTime(Date.now());
      
      console.log('==== FIN GUARDADO DE PROGRESO CONTRARRELOJ ====');
      return { success: true, data: result };
    } catch (error) {
      console.error('Error al guardar progreso:', error);
      setIsSaving(false);
      return { success: false, error: error.message };
    }
  };
  
  // Guardar respuestas en localStorage
  const saveToLocalStorage = (answers) => {
    console.log("Guardando respuestas en localStorage:", answers);
    localStorage.setItem('contrarrelojAnswers', JSON.stringify(answers));
  };

  // Función para optimizar el guardado
  const queueProgressSave = (isForceComplete = false) => {
    console.log(`===== INICIANDO PROCESO DE GUARDADO =====`);
    console.log(`Guardado forzado: ${isForceComplete}, Estado de guardado en progreso: ${isSaving}`);
    console.log(`Tiempo desde último guardado: ${Date.now() - lastSaveTime}ms`);
    
    // Si es forzado (completado), guardar inmediatamente
    if (isForceComplete) {
      console.log('Ejecutando guardado forzado como completado');
      saveProgressToDB(true);
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
    setLastSaveTime(now);
    
    // Si llegamos aquí, podemos guardar
    console.log('Condiciones cumplidas para guardar, procediendo...');
    saveProgressToDB(false);
  };

  // Cargar respuestas del localStorage cuando se carga la página
  const getFromLocalStorage = () => {
    const storedAnswers = localStorage.getItem('contrarrelojAnswers');
    return storedAnswers ? JSON.parse(storedAnswers) : {};
  };

  // Modificado para cargar localStorage solo cuando no está en el inicio o cuando restaura un examen existente
  useEffect(() => {
    // Solo cargar de localStorage si no es un nuevo examen (showStartPopup = false)
    // o si se está restaurando un examen (examId !== null)
    if (!showStartPopup || examId !== null) {
      const storedAnswers = getFromLocalStorage();
      
      // Solo actualizar si hay respuestas almacenadas
      if (Object.keys(storedAnswers).length > 0) {
        setSelectedAnswers(storedAnswers);
        
        // Sincronizar userAnswers con las respuestas almacenadas
        if (questions.length > 0) {
          const newUserAnswers = new Array(questions.length).fill(null);
          Object.entries(storedAnswers).forEach(([index, answer]) => {
            newUserAnswers[parseInt(index)] = answer;
          });
          setUserAnswers(newUserAnswers);
        }
      }
    }
  }, [questions.length, showStartPopup, examId]);

  const handleAnswerClick = (questionId, selectedOption) => {
    console.log(`Respuesta seleccionada: pregunta ${questionId}, opción ${selectedOption}`);
    
    setSelectedAnswers((prevAnswers) => {
      const currentAnswer = prevAnswers[questionId];
      // Si ya está seleccionada, la quitamos
      if (currentAnswer === selectedOption) {
        const updatedAnswers = { ...prevAnswers };
        delete updatedAnswers[questionId];
        
        // También actualizar userAnswers para quitar la selección
        const newUserAnswers = [...userAnswers];
        newUserAnswers[questionId] = null;
        setUserAnswers(newUserAnswers);
        
        return updatedAnswers;
      }
      // Si no está seleccionada, la añadimos
      
      // Actualizar userAnswers con la nueva selección, incluyendo markedAsDoubt
      const newUserAnswers = [...userAnswers];
      const question = questions[questionId];
      newUserAnswers[questionId] = {
        questionId: question?._id || `question_${questionId}`,
        selectedAnswer: selectedOption,
        isCorrect: null,
        markedAsDoubt: doubtMarkedQuestions[questionId] || false,
        questionData: {
          question: question?.question || "",
          option_1: question?.option_1 || question?.options?.[0] || "",
          option_2: question?.option_2 || question?.options?.[1] || "",
          option_3: question?.option_3 || question?.options?.[2] || "",
          option_4: question?.option_4 || question?.options?.[3] || "",
          option_5: question?.option_5 || question?.options?.[4] || "-",
          answer: question?.answer || "",
          subject: question?.subject || question?.categoria || "General",
          image: question?.image || null,
          _id: question?._id || `question_${questionId}`
        }
      };
      setUserAnswers(newUserAnswers);
      
      // Devolver las respuestas actualizadas para la UI
      return { ...prevAnswers, [questionId]: selectedOption };
    });
    
    // Guardar la selección en localStorage
    saveToLocalStorage({ ...selectedAnswers, [questionId]: selectedOption });
    
    setHasPendingChanges(true);
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleExitClick = () => {
    setShowExitPopup(true);
  };

  // Función para manejar el botón "Finalizar"
  const handleFinalizeClick = () => {
    setShowFinalizePopup(true);
  };

  const handleDisputeSubmit = async (questionId) => {
    if (!disputeReason.trim()) {
      return;
    }
    
    const disputeData = {
      question: questions[questionId]?.question || "Pregunta no disponible",
      reason: disputeReason,
      userAnswer: selectedAnswers[questionId] || "Sin respuesta",
      userId: userId || 'test_user_1'
    };

    try {
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

  const confirmFinalize = async () => {
    try {
      setIsFinishing(true);
      setShowFinalizePopup(false);
      
      const timeUsed = 840 - timeLeft;
      
      // Formatear userAnswers con questionData para el backend
      const formattedUserAnswers = [];
      
      for (let i = 0; i < questions.length; i++) {
        const questionData = {
          question: questions[i].question || "",
          option_1: questions[i].option_1 || questions[i].options?.[0] || "",
          option_2: questions[i].option_2 || questions[i].options?.[1] || "",
          option_3: questions[i].option_3 || questions[i].options?.[2] || "",
          option_4: questions[i].option_4 || questions[i].options?.[3] || "",
          option_5: questions[i].option_5 || questions[i].options?.[4] || "-",
          answer: questions[i].answer || "",
          subject: questions[i].subject || questions[i].categoria || "General",
          image: questions[i].image || null
        };
        
        formattedUserAnswers.push({
          questionId: questions[i]._id || `question_${i}`,
          selectedAnswer: extractSelectedAnswer(userAnswers[i]),
          isCorrect: null,
          questionData: questionData
        });
      }
      
      const effectiveUserId = userId || 'test_user_1';
      const result = await finalizeExam(
        effectiveUserId,
        'contrarreloj',
        questions,
        formattedUserAnswers,
        selectedAnswers,
        timeUsed,
        840,
        doubtMarkedQuestions,
        examId
      );
      
      if (result.error) {
        throw new Error(result.error);
      }

      // Marcar diagnóstico inicial como completado al finalizar cualquier examen contrarreloj
      // Esto asegura que el usuario perciba valor desde el principio
      try {
        const diagnosticKey = `diagnosticInitialCompleted_${effectiveUserId}`;
        const alreadyCompleted = localStorage.getItem(diagnosticKey);
        
        // Solo marcar como completado si no estaba ya completado (evitar sobrescribir)
        if (alreadyCompleted !== 'true') {
          localStorage.setItem(diagnosticKey, 'true');
          console.log('Diagnóstico inicial marcado como completado');
        }
      } catch (e) {
        console.warn('No se pudo guardar el estado del diagnóstico:', e);
      }

      // Mostrar notificación de éxito
      setSuccessMessage('¡Examen contrarreloj finalizado con éxito!');
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
      console.error('Error general al finalizar contrarreloj:', error);
      alert(`Error al finalizar el examen: ${error.message || 'Error desconocido'}`);
      setIsFinishing(false);
    }
  };

  const handleCancelFinish = () => {
    setShowFinalizePopup(false);
  };

  const handleClosePopup = () => {
    setShowFinalizePopup(false); // Cierra el pop-up
  };
  
  const currentOptions = questions[currentQuestion]
    ? [questions[currentQuestion].option_1, questions[currentQuestion].option_2, questions[currentQuestion].option_3, questions[currentQuestion].option_4, questions[currentQuestion].option_5]
        .filter(option => option && option !== '-')
    : [];

  const examName = questions[currentQuestion]?.exam_name 
    ? `(${questions[currentQuestion].exam_name})`
    : '';

  const handleRedirect = () => {
    console.log('Redirigiendo...');
    // Guardar progreso antes de redirigir
    saveProgressToDB(false);
    window.location.href = '/dashboard';
  };

  // El contrarreloj es especial porque no se puede pausar, solo finalizar
  const handlePause = () => {
    alert('El modo contrarreloj no permite pausas. Puedes finalizar el examen si necesitas salir.');
  };

  // Navegación de preguntas
  const handleNavigate = (index) => {
    setCurrentQuestion(index);
    setHasPendingChanges(true);
  };

  // Guardar manualmente
  const handleManualSave = async () => {
    if (isSaving || !hasPendingChanges) return;
    
    setIsSaving(true);
    try {
      const formattedUserAnswers = questions.map((q, i) => {
        const userAnswer = userAnswers[i];
        return {
          questionId: q._id || `question_${i}`,
          selectedAnswer: userAnswer?.selectedAnswer || selectedAnswers[i] || null,
          isCorrect: userAnswer?.isCorrect || null,
          markedAsDoubt: doubtMarkedQuestions[i] || false,
          questionData: {
            question: q.question || "",
            option_1: q.option_1 || q.options?.[0] || "",
            option_2: q.option_2 || q.options?.[1] || "",
            option_3: q.option_3 || q.options?.[2] || "",
            option_4: q.option_4 || q.options?.[3] || "",
            option_5: q.option_5 || q.options?.[4] || "-",
            answer: q.answer || "",
            subject: q.subject || q.categoria || "General",
            image: q.image || null,
            _id: q._id || `question_${i}`
          }
        };
      });

      const result = await saveExamProgress(
        userId || 'test_user_1',
        examId,
        'contrarreloj',
        questions,
        formattedUserAnswers,
        selectedAnswers,
        timeLeft,
        currentQuestion,
        doubtMarkedQuestions,
        totalTime - timeLeft,
        totalTime,
        false,
        'in_progress'
      );

      if (result && result.examId) {
        setExamId(result.examId);
      }
      setHasPendingChanges(false);
    } catch (error) {
      console.error('Error al guardar:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Debounced save
  const debouncedSave = useCallback(
    debounce(() => {
      if (hasPendingChanges && !isSaving && hasStarted) {
        handleManualSave();
      }
    }, 3000),
    [hasPendingChanges, isSaving, hasStarted]
  );

  useEffect(() => {
    if (hasPendingChanges && hasStarted) {
      debouncedSave();
    }
    return () => {
      debouncedSave.cancel();
    };
  }, [hasPendingChanges, hasStarted, debouncedSave]);

  useEffect(() => {
    console.log('Estado actual de questions:', questions);
  }, [questions]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Guardar progreso antes de salir de la página
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!isFinishing) {
        e.preventDefault();
        e.returnValue = '¿Seguro que quieres salir? Tu progreso actual se guardará.';
        
        // Realizar guardado síncrono antes de salir usando la API centralizada
        try {
          // Calcular tiempo usado
          const timeUsed = 840 - timeLeft;
          
          // Formatear userAnswers con questionData para el backend
          const formattedUserAnswers = userAnswers.map((answer, index) => {
            if (answer === null || answer === undefined) return null;
            
            // Crear el objeto questionData con toda la información de la pregunta
            const questionData = {
              question: questions[index].question || "",
              option_1: questions[index].option_1 || questions[index].options?.[0] || "",
              option_2: questions[index].option_2 || questions[index].options?.[1] || "",
              option_3: questions[index].option_3 || questions[index].options?.[2] || "",
              option_4: questions[index].option_4 || questions[index].options?.[3] || "",
              option_5: questions[index].option_5 || questions[index].options?.[4] || "-",
              answer: questions[index].answer || "",
              subject: questions[index].subject || questions[index].categoria || "General",
              image: questions[index].image || null,
              _id: questions[index]._id || `question_${index}`
            };
            
            return {
              questionId: questions[index]._id || `question_${index}`,
              selectedAnswer: extractSelectedAnswer(answer),
              isCorrect: null,
              questionData: questionData
            };
          });
          
          // Preparar los datos del examen para enviar
          const examData = {
            examType: 'contrarreloj',
            questions: questions.map(q => ({
              _id: q._id,
              question: q.question || '',
              option_1: q.option_1 || q.options?.[0] || '',
              option_2: q.option_2 || q.options?.[1] || '',
              option_3: q.option_3 || q.options?.[2] || '',
              option_4: q.option_4 || q.options?.[3] || '',
              option_5: q.option_5 || q.options?.[4] || '',
              answer: q.answer || '',
              subject: q.subject || ''
            })),
            userAnswers: formattedUserAnswers,
            selectedAnswers: selectedAnswers,
            timeLeft: timeLeft,
            currentQuestion: currentQuestion,
            markedAsDoubt: doubtMarkedQuestions,
            timeUsed: timeUsed,
            totalTime: 840,
            status: 'paused'
          };
          
          // Enviar la petición
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `${API_URL}/save-exam-progress`, false); // false = síncrono
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.send(JSON.stringify({
            userId: userId || 'test_user_1',
            examId: examId,
            examData
          }));
          
          console.log('Estado guardado antes de salir');
        } catch (err) {
          console.error('Error al guardar estado antes de salir:', err);
        }
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [userId, examId, questions, selectedAnswers, timeLeft, currentQuestion, isFinishing, doubtMarkedQuestions, userAnswers]);

  useEffect(() => {
    // Eliminar el estilo inline ya que ahora está en el CSS
    return () => {
      const styleElement = document.head.querySelector('style');
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, []);

  // Actualizar toggleDoubtMark para guardar inmediatamente
  const toggleDoubtMark = (questionIndex) => {
    setDoubtMarkedQuestions(prevState => {
      const newState = { ...prevState };
      // Si ya está marcada, la desmarcamos; si no, la marcamos
      if (newState[questionIndex]) {
        delete newState[questionIndex];
      } else {
        newState[questionIndex] = true;
      }
      
      // Actualizar también userAnswers para incluir markedAsDoubt
      setUserAnswers(prevUserAnswers => {
        const newUserAnswers = [...prevUserAnswers];
        if (newUserAnswers[questionIndex] !== null) {
          // Si ya existe un valor, actualizar markedAsDoubt
          const existingAnswer = newUserAnswers[questionIndex];
          newUserAnswers[questionIndex] = {
            questionId: questions[questionIndex]?._id || `question_${questionIndex}`,
            selectedAnswer: typeof existingAnswer === 'object' ? 
                           existingAnswer.selectedAnswer : 
                           existingAnswer,
            isCorrect: null,
            markedAsDoubt: newState[questionIndex] || false,
            questionData: {
              question: questions[questionIndex]?.question || "",
              option_1: questions[questionIndex]?.option_1 || questions[questionIndex]?.options?.[0] || "",
              option_2: questions[questionIndex]?.option_2 || questions[questionIndex]?.options?.[1] || "",
              option_3: questions[questionIndex]?.option_3 || questions[questionIndex]?.options?.[2] || "",
              option_4: questions[questionIndex]?.option_4 || questions[questionIndex]?.options?.[3] || "",
              option_5: questions[questionIndex]?.option_5 || questions[questionIndex]?.options?.[4] || "-",
              answer: questions[questionIndex]?.answer || "",
              subject: questions[questionIndex]?.subject || questions[questionIndex]?.categoria || "General",
              image: questions[questionIndex]?.image || null,
              _id: questions[questionIndex]?._id || `question_${questionIndex}`
            }
          };
        }
        return newUserAnswers;
      });
      
      // Guardar en localStorage
      localStorage.setItem('contrarrelojDoubts', JSON.stringify(newState));
      return newState;
    });
    
    setHasPendingChanges(true);
  };

  // Cargar dudas del localStorage cuando se carga la página
  useEffect(() => {
    // Solo cargar dudas si no está en pantalla de inicio o está restaurando un examen
    if (!showStartPopup || examId !== null) {
      const storedDoubts = localStorage.getItem('contrarrelojDoubts');
      if (storedDoubts) {
        setDoubtMarkedQuestions(JSON.parse(storedDoubts));
      }
    }
  }, [showStartPopup, examId]);

  // Helper function to normalize correct answer to text (same logic as QuestionBox)
  const normalizeCorrectAnswerToText = useCallback((question, value) => {
    if (value === null || value === undefined) return null;
    const maybeNumber = Number(value);
    if (!Number.isNaN(maybeNumber) && maybeNumber >= 1 && maybeNumber <= 5) {
      const optionKey = `option_${maybeNumber}`;
      return question[optionKey] || null;
    }
    // Si ya viene como texto, devolver tal cual
    return String(value);
  }, []);

  // Helper function to generate status object for Pagination
  const generateItemStatus = useCallback(() => {
    const status = {};
    if (!questions || questions.length === 0) return status;

    // Si estamos en la pantalla de inicio, no mostrar nada como respondido
    if (showStartPopup) {
      return {};
    }

    // Asegurarse de que selectedAnswers sea consistente con userAnswers para evitar estados falsos
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const userAnswerData = userAnswers[i];
      
      // Extraer la respuesta seleccionada del objeto, o usar el valor directo en formatos antiguos
      const userAnswer = userAnswerData && typeof userAnswerData === 'object' && userAnswerData.selectedAnswer !== undefined
        ? userAnswerData.selectedAnswer  // Nuevo formato
        : userAnswerData;                // Formato antiguo (valor directo)
      
      // Si hay una respuesta del usuario, calcular si es correcta
      if (userAnswer !== null && userAnswer !== undefined && userAnswer !== '') {
        // Obtener la respuesta correcta de la pregunta
        const rawCorrectAnswer = question.correctAnswer !== undefined
          ? question.correctAnswer
          : question.answer;
        
        // Normalizar la respuesta correcta a texto
        const correctAnswerText = normalizeCorrectAnswerToText(question, rawCorrectAnswer);
        
        // Comparar la respuesta del usuario con la correcta
        // Solo considerar correcta si tenemos una respuesta correcta válida
        let isCorrect = false;
        if (correctAnswerText !== null && correctAnswerText !== undefined) {
          isCorrect = String(userAnswer).trim() === String(correctAnswerText).trim();
        }
        
        // Si también está marcada como duda, usar un objeto con ambos estados
        if (doubtMarkedQuestions[i]) {
          status[i] = {
            isCorrect: isCorrect,
            doubt: true,
            answered: true
          };
        } else {
          // Marcar como correcta o incorrecta según corresponda
          status[i] = isCorrect ? 'correct' : 'incorrect';
        }
      } 
      // Si no hay respuesta pero está marcada como duda
      else if (doubtMarkedQuestions[i]) {
        status[i] = 'doubt';
      }
      // Si no, no asignar estado (pregunta no respondida ni marcada)
    }
    return status;
  }, [selectedAnswers, doubtMarkedQuestions, questions, userAnswers, showStartPopup, normalizeCorrectAnswerToText]);

  const renderFinalizePopup = () => {
    return showFinalizePopup && (
      <div className="popup-overlay">
        <div className="popup">
          <h2>¿Estás seguro de que deseas finalizar el examen?</h2>
          <p>Has respondido {Object.keys(selectedAnswers).length} de {questions.length} preguntas.</p>
          <div className="popup-buttons">
            <button onClick={handleCancelFinish} className="control-btn" disabled={isFinishing}>
              Continuar examen
            </button>
            <button onClick={confirmFinalize} className="control-btn" disabled={isFinishing}>
              {isFinishing ? 'Procesando...' : 'Finalizar examen'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Función para restaurar un examen en progreso
  const resumeExam = async () => {
    try {
      const effectiveUserId = userId || 'test_user_1';
      console.log(`Intentando restaurar examen para usuario: ${effectiveUserId}`);
      
      const data = await resumeExamUtil(effectiveUserId);
      
      if (!data || data === false) {
        console.log('No se encontró progreso anterior para restaurar');
        
        // Limpiar localStorage si no hay progreso para restaurar
        localStorage.removeItem('contrarrelojAnswers');
        localStorage.removeItem('contrarrelojDoubts');
        
        return false;
      }
      
      // Verificar que el tipo de examen sea contrarreloj
      const { progress } = data;
      if (!progress || progress.type !== 'contrarreloj') {
        console.log('El progreso guardado no corresponde a un examen contrarreloj');
        
        // Limpiar localStorage si el progreso no es de contrarreloj
        localStorage.removeItem('contrarrelojAnswers');
        localStorage.removeItem('contrarrelojDoubts');
        
        return false;
      }
      
      console.log('Restaurando progreso del examen contrarreloj:', progress);
      
      // Limpiar localStorage antes de restaurar para evitar datos antiguos
      localStorage.removeItem('contrarrelojAnswers');
      localStorage.removeItem('contrarrelojDoubts');
      
      // Establecer el ID del examen para futuras actualizaciones
      if (progress.examId || progress._id) {
        setExamId(progress.examId || progress._id);
        console.log('ID del examen establecido:', progress.examId || progress._id);
      }
      
      // Restaurar las preguntas
      if (progress.questions && Array.isArray(progress.questions) && progress.questions.length > 0) {
        setQuestions(progress.questions);
        console.log(`Restauradas ${progress.questions.length} preguntas`);
      } else {
        console.log('No hay preguntas para restaurar, se cargarán nuevas preguntas');
        return false; // Necesitamos cargar nuevas preguntas
      }
      
      // Inicializar array de userAnswers
      const newUserAnswers = new Array(progress.questions.length).fill(null);
      
      // Restaurar las respuestas del usuario
      if (progress.userAnswers && Array.isArray(progress.userAnswers)) {
        // Recorrer userAnswers para extraer las respuestas
        progress.userAnswers.forEach((answerObj, index) => {
          if (answerObj) {
            if (typeof answerObj === 'object' && answerObj.selectedAnswer !== undefined) {
              // Si es un objeto con selectedAnswer
              newUserAnswers[index] = answerObj.selectedAnswer;
            } else if (typeof answerObj === 'string' || typeof answerObj === 'number') {
              // Si es directamente la respuesta
              newUserAnswers[index] = answerObj;
            }
          }
        });
        setUserAnswers(newUserAnswers);
        console.log(`Restauradas ${newUserAnswers.filter(a => a !== null).length} respuestas de usuario`);
      }
      
      // Restaurar selectedAnswers para la UI (convertir de array a objeto para la UI)
      const newSelectedAnswers = {};
      newUserAnswers.forEach((answer, index) => {
        if (answer !== null) {
          newSelectedAnswers[index] = answer;
        }
      });
      
      // Si también hay un objeto selectedAnswers, usarlo como respaldo
      if (progress.selectedAnswers && typeof progress.selectedAnswers === 'object') {
        // Combinar con las respuestas ya procesadas
        setSelectedAnswers({...newSelectedAnswers, ...progress.selectedAnswers});
        console.log('Respuestas seleccionadas restauradas desde selectedAnswers');
        
        // Actualizar localStorage con las respuestas restauradas
        saveToLocalStorage({...newSelectedAnswers, ...progress.selectedAnswers});
      } else {
        // Si no hay selectedAnswers, usar el objeto que construimos
        setSelectedAnswers(newSelectedAnswers);
        console.log('Respuestas seleccionadas restauradas desde userAnswers');
        
        // Actualizar localStorage con las respuestas restauradas
        saveToLocalStorage(newSelectedAnswers);
      }
      
      // Restaurar el tiempo restante
      if (typeof progress.timeLeft === 'number' && progress.timeLeft > 0) {
        setTimeLeft(progress.timeLeft);
        console.log(`Tiempo restante restaurado: ${formatTime(progress.timeLeft)}`);
      } else {
        console.log('No se pudo restaurar el tiempo, usando tiempo predeterminado');
        setTimeLeft(840); // Usar tiempo predeterminado
      }
      
      // Restaurar pregunta actual
      if (typeof progress.currentQuestion === 'number') {
        setCurrentQuestion(progress.currentQuestion);
        console.log(`Pregunta actual restaurada: ${progress.currentQuestion + 1}`);
      }
      
      // Restaurar marcas de duda
      if (progress.markedAsDoubt || progress.doubtMarkedQuestions) {
        const doubtMarks = progress.markedAsDoubt || progress.doubtMarkedQuestions || {};
        setDoubtMarkedQuestions(doubtMarks);
        console.log(`Restauradas marcas de duda`);
        
        // Actualizar localStorage con las marcas de duda
        localStorage.setItem('contrarrelojDoubts', JSON.stringify(doubtMarks));
      }
      
      console.log('Progreso del examen restaurado correctamente');
      return true;
    } catch (error) {
      console.error('Error al recuperar progreso:', error);
      return false;
    }
  };

  // Asegurar que localStorage se limpie al montar el componente para empezar fresco
  useEffect(() => {
    // Solo limpiar si es un nuevo examen (no hay examId) y estamos en la pantalla de inicio
    if (!examId && showStartPopup) {
      localStorage.removeItem('contrarrelojAnswers');
      localStorage.removeItem('contrarrelojDoubts');
      
      // Reiniciar estados
      setSelectedAnswers({});
      setDoubtMarkedQuestions({});
    }
  }, []);

  if (isLoading) {
    return (
      <div className="contrarreloj-container">
        <div className="loading-message">Cargando preguntas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="contrarreloj-container">
        <div className="error-message">
          <h3>Error al cargar las preguntas</h3>
          <p>{error}</p>
          <button 
            onClick={() => {
              setError(null);
              setIsLoading(true);
              fetchQuestions(); // Ahora fetchQuestions está disponible aquí
            }} 
            className="control-btn"
          >
            Intentar de nuevo
          </button>
          <button 
            onClick={() => navigate('/dashboard')} 
            className="control-btn"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="contrarreloj-container">
        <div className="error-message">
          <h3>Sin conexión a Internet</h3>
          <p>Por favor, verifica tu conexión e intenta de nuevo.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="control-btn"
          >
            Reintentar
          </button>
        </div>
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
          <h2>¡Tic-tac, tic-tac! Que comience el reto contrarreloj!</h2>
          <p>
            Este examen consiste en responder <strong>20 preguntas</strong> en un límite de <strong>14 minutos</strong>.  
            Cada pregunta tiene un tiempo máximo de <strong>40 segundos</strong>.
          </p>
          <p>
            Ten en cuenta que esta modalidad <strong>no contiene imágenes</strong>;  
            solo encontrarás preguntas de texto.
          </p>
          <button onClick={handleStartExam} className="control-btn">Estoy list@</button>
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
        markedAsDoubt={doubtMarkedQuestions}
        toggleDoubtMark={toggleDoubtMark}
        onSave={handleManualSave}
        onFinalize={confirmFinalize}
        onPause={handlePause}
        onDownload={() => downloadExamPdfFromData({
          questions: questions,
          title: 'SIMULIA',
          subtitle: 'Examen: CONTRARRELOJ',
          logoUrl: '/Logo_oscuro.png',
          examId: examId || '',
          date: new Date().toISOString().slice(0,10),
          durationMin: Math.round(totalTime / 60),
          showAnswerKey: false,
          showBubbleSheet: true,
          fileName: 'examen-contrarreloj.pdf'
        })}
        onExit={() => navigate('/dashboard')}
        timeLeft={timeLeft}
        totalTime={totalTime}
        isPaused={paused}
        isSaving={isSaving}
        hasPendingChanges={hasPendingChanges}
        examType="contrarreloj"
        isReviewMode={false}
        disabledButtons={['pause']}
        isDarkMode={isDarkMode}
        currentQuestion={currentQuestion}
        onNavigate={handleNavigate}
        showTimeBar={true}
        timePerQuestion={timePerQuestion}
        onTimeUp={handleTimeUp}
        onImpugnarSubmit={async (questionId, reason) => {
          setDisputeReason(reason);
          await handleDisputeSubmit(questionId);
        }}
      />

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

export default Contrarreloj;