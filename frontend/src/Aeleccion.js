import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './Aeleccion.css';
import './Exam.css'; // Importamos los estilos de Exam
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import ExamHeader from './components/ExamHeader'; // Add this import
import { downloadCurrentExamPdf, downloadExamPdfFromData } from './lib/pdfUtils';
import QuestionBox from './components/QuestionBox';
import Pagination from './components/Pagination';
import { finalizeExam, saveExamProgress, resumeExam as resumeExamUtil } from './lib/examUtils';
import SuccessNotification from './components/SuccessNotification';
import { API_URL } from './config';

const AEleccion = ({ onClose, userId, toggleDarkMode, isDarkMode }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [tipoExamen, setTipoExamen] = useState('');
  const [numPreguntas, setNumPreguntas] = useState(30);
  const [tiempoAsignado, setTiempoAsignado] = useState(39);
  const [numPreguntasImagen, setNumPreguntasImagen] = useState(0);
  const [asignaturasSeleccionadas, setAsignaturasSeleccionadas] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preguntas, setPreguntas] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [showStartPopup, setShowStartPopup] = useState(false);
  const [isDisputing, setIsDisputing] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [showFinalizePopup, setShowFinalizePopup] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [examId, setExamId] = useState(null);
  const [lastSaveTime, setLastSaveTime] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [doubtfulQuestions, setDoubtfulQuestions] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Lista de asignaturas disponibles (ordenadas alfabéticamente según la base de datos)
  const asignaturasDisponibles = [
    { id: 'CARDIOLOGÍA', nombre: 'CARDIOLOGÍA' },
    { id: 'DERMATOLOGÍA-HERIDAS CRÓNICAS', nombre: 'DERMATOLOGÍA-HERIDAS CRÓNICAS' },
    { id: 'DIGESTIVO', nombre: 'DIGESTIVO' },
    { id: 'ENDOCRINO', nombre: 'ENDOCRINO' },
    { id: 'ENFERMERÍA COMUNITARIA', nombre: 'ENFERMERÍA COMUNITARIA' },
    { id: 'ENFERMERIA DEL TRABAJO', nombre: 'ENFERMERIA DEL TRABAJO' },
    { id: 'ENFERMERÍA FAMILIAR Y COMUNITARIA', nombre: 'ENFERMERÍA FAMILIAR Y COMUNITARIA' },
    { id: 'FARMACOLOGÍA', nombre: 'FARMACOLOGÍA' },
    { id: 'GERIATRÍA', nombre: 'GERIATRÍA' },
    { id: 'GESTIÓN-LESGILACIÓN-BIOÉTICA', nombre: 'GESTIÓN-LESGILACIÓN-BIOÉTICA' },
    { id: 'GINECOLOGIA-OBSTETRICIA', nombre: 'GINECOLOGIA-OBSTETRICIA' },
    { id: 'HEMATOLOGÍA', nombre: 'HEMATOLOGÍA' },
    { id: 'HISTORIA Y FUNDAMENTOS DE ENFERMERÍA', nombre: 'HISTORIA Y FUNDAMENTOS DE ENFERMERÍA' },
    { id: 'INVESTIGACIÓN', nombre: 'INVESTIGACIÓN' },
    { id: 'MÉDICO-QUIRÚRGICA', nombre: 'MÉDICO-QUIRÚRGICA' },
    { id: 'NEFROLOGÍA-UROLOGÍA', nombre: 'NEFROLOGÍA-UROLOGÍA' },
    { id: 'NEUROLOGÍA', nombre: 'NEUROLOGÍA' },
    { id: 'NUTRICIÓN Y DIETÉTICA', nombre: 'NUTRICIÓN Y DIETÉTICA' },
    { id: 'ONCOLOGÍA Y PALIATIVOS', nombre: 'ONCOLOGÍA Y PALIATIVOS' },
    { id: 'PEDIATRÍA', nombre: 'PEDIATRÍA' },
    { id: 'RESPIRATORIO', nombre: 'RESPIRATORIO' },
    { id: 'SALUD MENTAL', nombre: 'SALUD MENTAL' },
    { id: 'SALUD PÚBLICA- INFECCIOSOS-VACUNAS', nombre: 'SALUD PÚBLICA- INFECCIOSOS-VACUNAS' },
    { id: 'SEGURIDAD', nombre: 'SEGURIDAD' },
    { id: 'TÉCNICAS DE ENFERMERÍA', nombre: 'TÉCNICAS DE ENFERMERÍA' },
    { id: 'TRAUMATOLOGÍA-REUMATOLOGÍA', nombre: 'TRAUMATOLOGÍA-REUMATOLOGÍA' },
    { id: 'URGENCIAS Y CRÍTICOS', nombre: 'URGENCIAS Y CRÍTICOS' }
  ];

  // Calcular tiempo basado en el número de preguntas (1.29 minutos por pregunta)
  useEffect(() => {
    const calcularTiempo = () => {
      const segundosPorPregunta = 1.29 * 60;
      const tiempoTotal = Math.round(segundosPorPregunta * numPreguntas);
      const tiempoMinutos = Math.ceil(tiempoTotal / 60);
      setTiempoAsignado(tiempoMinutos);
    };
    
    calcularTiempo();
  }, [numPreguntas]);

  // Calculate total pages when preguntas change
  useEffect(() => {
    if (preguntas.length) {
      setTotalPages(Math.ceil(preguntas.length / 30));
    }
  }, [preguntas]);

  // Update current page when current question changes
  useEffect(() => {
    // Calculate which page this question should be on
    const questionPage = Math.floor(currentQuestion / 30);
    if (questionPage !== currentPage) {
      setCurrentPage(questionPage);
    }
  }, [currentQuestion]);

  // Seleccionar tipo de examen
  const handleTipoExamenSelect = (tipo) => {
    setTipoExamen(tipo);
    setStep(1);
  };

  // Seleccionar todas las asignaturas
  const handleSelectAllSubjects = () => {
    setAsignaturasSeleccionadas(asignaturasDisponibles.map(asig => asig.id));
  };

  // Deseleccionar todas las asignaturas
  const handleDeselectAllSubjects = () => {
    setAsignaturasSeleccionadas([]);
  };

  // Manejar selección/deselección de una asignatura
  const handleSubjectToggle = (subjectId) => {
    if (asignaturasSeleccionadas.includes(subjectId)) {
      setAsignaturasSeleccionadas(prev => prev.filter(id => id !== subjectId));
    } else {
      setAsignaturasSeleccionadas(prev => [...prev, subjectId]);
    }
  };

  // Avanzar al paso de confirmación
  const avanzarPaso = () => {
    if (tipoExamen === 'anteriores' && asignaturasSeleccionadas.length === 0) {
      alert('Debes seleccionar al menos una asignatura');
      return;
    }
    
    setStep(2);
  };

  // Formatear tiempo para mostrar
  const formatTiempo = (minutos) => {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    
    if (horas > 0) {
      return `${horas}h ${mins}min`;
    }
    return `${mins} minutos`;
  };

  // Iniciar el examen con los parámetros seleccionados
  const empezarExamen = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`=== INICIANDO EXAMEN ===`);
      console.log(`Tipo examen seleccionado: ${tipoExamen}`);
      console.log(`Número de preguntas: ${numPreguntas}`);
      if (tipoExamen === 'anteriores') {
        console.log(`Preguntas con imagen: ${numPreguntasImagen}`);
        console.log(`Asignaturas seleccionadas: ${asignaturasSeleccionadas.join(', ')}`);
      }

      // Intentar restaurar un examen existente primero
      const effectiveUserId = userId || 'test_user_1';
      const examenRestaurado = await resumeExam();
      
      // Si se restauró correctamente, no necesitamos cargar nuevas preguntas
      if (examenRestaurado) {
        console.log('Examen restaurado con éxito, pasando al paso 3');
        setIsLoading(false);
        setStep(3);
        return;
      }
      
      // Si no se pudo restaurar, seguir con la creación normal del examen
      console.log('No se encontró examen para restaurar, creando uno nuevo');

      let preguntas = [];
      
      if (tipoExamen === 'anteriores') {
        // Obtener preguntas normales
        const preguntasNormales = numPreguntas - numPreguntasImagen;
        if (preguntasNormales > 0) {
          const responseNormales = await fetch(`${API_URL}/random-question-completos`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              count: preguntasNormales,
              examType: 'anteriores',
              asignaturas: asignaturasSeleccionadas
            })
          });

          if (!responseNormales.ok) {
            throw new Error(`Error al obtener preguntas normales: ${responseNormales.status}`);
          }

          const dataNormales = await responseNormales.json();
          if (dataNormales.length < preguntasNormales) {
            console.warn(`Se solicitaron ${preguntasNormales} preguntas normales pero solo hay ${dataNormales.length} disponibles`);
          }
          preguntas = [...preguntas, ...dataNormales];
        }

        // Obtener preguntas con imagen si se solicitan
        if (numPreguntasImagen > 0) {
          const responseImagen = await fetch(`${API_URL}/random-fotos`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              count: numPreguntasImagen,
              asignaturas: asignaturasSeleccionadas
            })
          });

          if (!responseImagen.ok) {
            throw new Error(`Error al obtener preguntas con imagen: ${responseImagen.status}`);
          }

          const dataImagen = await responseImagen.json();
          if (dataImagen.length < numPreguntasImagen) {
            console.warn(`Se solicitaron ${numPreguntasImagen} preguntas con imagen pero solo hay ${dataImagen.length} disponibles`);
          }
          preguntas = [...preguntas, ...dataImagen];
        }
      } else if (tipoExamen === 'protocolos') {
        const response = await fetch(`${API_URL}/random-questions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            numPreguntas: numPreguntas,
            examType: 'protocolos'
          })
        });

        if (!response.ok) {
          throw new Error(`Error al obtener preguntas de protocolos: ${response.status}`);
        }

        const dataProtocolos = await response.json();
        if (dataProtocolos.length < numPreguntas) {
          console.warn(`Se solicitaron ${numPreguntas} preguntas de protocolos pero solo hay ${dataProtocolos.length} disponibles`);
        }
        preguntas = dataProtocolos;
      }

      if (!preguntas || preguntas.length === 0) {
        throw new Error('No se recibieron preguntas del servidor');
      }

      // Mezclar aleatoriamente las preguntas
      const preguntasMezcladas = [...preguntas].sort(() => Math.random() - 0.5);

      // Optimización: Limpiar datos innecesarios para reducir el tamaño del documento
      const preguntasOptimizadas = preguntasMezcladas.map(q => ({
          _id: q._id,
          question: q.question || '',
          option_1: q.option_1 || q.options?.[0] || '',
          option_2: q.option_2 || q.options?.[1] || '',
          option_3: q.option_3 || q.options?.[2] || '',
          option_4: q.option_4 || q.options?.[3] || '',
          option_5: q.option_5 || q.options?.[4] || '',
          answer: q.answer || '',
          subject: q.subject || 'General',
          // Add long_answer field if it exists
          ...(q.long_answer ? { long_answer: q.long_answer } : {}),
          // Solo incluir imagen si existe
          ...(q.image ? { image: q.image } : {})
        }));
        
        // Crear array de respuestas estructurado
      const userAnswersArray = preguntasOptimizadas.map((pregunta, index) => ({
        questionId: pregunta._id || `question_${index}`,
        selectedAnswer: null,  // Inicialmente es null, pero se actualizará al hacer click
        isCorrect: null,
        markedAsDoubt: false,
        questionData: {
          question: pregunta.question || "",
          option_1: pregunta.option_1 || pregunta.options?.[0] || "",
          option_2: pregunta.option_2 || pregunta.options?.[1] || "",
          option_3: pregunta.option_3 || pregunta.options?.[2] || "",
          option_4: pregunta.option_4 || pregunta.options?.[3] || "",
          option_5: pregunta.option_5 || pregunta.options?.[4] || "-",
          answer: pregunta.answer || "",
          subject: pregunta.subject || pregunta.categoria || "General",
          image: pregunta.image || null,
          _id: pregunta._id || `question_${index}`,
          long_answer: pregunta.long_answer || null
        }
      }));
      
      // Guardar estado inicial usando saveExamProgress
      try {
        console.log('Guardando estado inicial con saveExamProgress...');
        
        const result = await saveExamProgress(
          effectiveUserId,
          null, // examId (null para nuevo examen)
          'personalizado',
          preguntasOptimizadas,
          userAnswersArray,
          {}, // No hay respuestas seleccionadas inicialmente
          tiempoAsignado * 60, // tiempo restante en segundos
          0, // pregunta actual
          {}, // No hay preguntas marcadas como duda
          0, // Tiempo usado
          tiempoAsignado * 60, // Tiempo total
          false, // No está completado
          'in_progress' // Estado
        );
        
        if (result.examId) {
          console.log('Examen creado con ID:', result.examId);
          setExamId(result.examId);
        }
      } catch (error) {
        console.error('Error al guardar estado inicial:', error);
        // Continuamos de todos modos si hay error
      }

      // Inicializar el estado del examen
      setPreguntas(preguntasOptimizadas);
      setUserAnswers(userAnswersArray);
      // Inicializar selectedAnswers como objeto vacío (no hay respuestas seleccionadas inicialmente)
      setSelectedAnswers({});
      setCurrentQuestion(0);
      setCurrentPage(0);
      setTimeLeft(tiempoAsignado * 60); // Convertir minutos a segundos
      setShowStartPopup(true);
      setIsLoading(false);
      setStep(3); // Cambiar al paso del examen

    } catch (error) {
      console.error('Error al iniciar el examen:', error);
      setError(`Error al iniciar el examen: ${error.message}`);
      setIsLoading(false);
    }
  };

  // Manejar respuesta del usuario
  const handleAnswerClick = (questionId, selectedOption) => {
    // Actualizar el estado de las respuestas
    setSelectedAnswers(prev => {
      const updated = {...prev};
      if (updated[questionId] === selectedOption) {
        // Si ya está seleccionada, la quitamos
        delete updated[questionId];
      } else {
        // Si no, la establecemos
        updated[questionId] = selectedOption;
      }
      return updated;
    });
    
    // Actualizar userAnswers
    setUserAnswers(prev => {
      const answers = [...prev];
      answers[questionId] = selectedOption;
      return answers;
    });
    
    // Marcar que hay cambios pendientes
    setHasPendingChanges(true);
    
    // Remove automatic saving after answer selection
    // queueSave();
  };

  // Navegación entre preguntas
  const handleNextQuestion = () => {
    if (currentQuestion < preguntas.length - 1) {
      const nextQuestion = currentQuestion + 1;
      setCurrentQuestion(nextQuestion);
      
      // Check if we need to move to the next page
      const nextPage = Math.floor(nextQuestion / 30);
      if (nextPage !== currentPage) {
        setCurrentPage(nextPage);
      }
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      const prevQuestion = currentQuestion - 1;
      setCurrentQuestion(prevQuestion);
      
      // Check if we need to move to the previous page
      const prevPage = Math.floor(prevQuestion / 30);
      if (prevPage !== currentPage) {
        setCurrentPage(prevPage);
      }
    }
  };

  // Manejar el cronómetro
  useEffect(() => {
    let timer;
    if (!isPaused && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prevTime => prevTime - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPaused, timeLeft]);

  // Formatear tiempo
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Añade esta función para manejar el envío de la impugnación
  const handleDisputeSubmit = async (questionId) => {
    const disputeData = {
      question: preguntas[questionId]?.question || "Pregunta no disponible",
      reason: disputeReason,
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
      if (!userId) {
        alert('No se identificó al usuario');
        return;
      }

      setIsFinishing(true);
      setShowFinalizePopup(false);

      // PASO CRUCIAL: Guardar cambios pendientes primero
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

      const timeUsed = tiempoAsignado * 60 - timeLeft;
      
      // Convertir doubtfulQuestions array a objeto con formato adecuado
      const doubtMarksObj = doubtfulQuestions.reduce((obj, index) => {
        obj[index] = true;
        return obj;
      }, {});
      
      const result = await finalizeExam(
        userId || 'test_user_1',
        'personalizado',
        preguntas,
        userAnswers,
        selectedAnswers,
        timeUsed,
        tiempoAsignado * 60,
        doubtMarksObj,
        examId
      );
      
      if (result.error) {
        throw new Error(result.error);
      }

      // Limpiar sessionStorage
      sessionStorage.removeItem('aeleccionState');

      // Mostrar notificación de éxito
      setSuccessMessage('¡Examen personalizado finalizado con éxito!');
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
      // Solo mostrar alerta si es un error real, no si el examen se finalizó correctamente
      if (!error.message?.includes('se finalizó correctamente')) {
        alert(`Error al finalizar el examen: ${error.message || 'Inténtalo de nuevo más tarde'}`);
      }
      setIsFinishing(false);
    }
  };

  const handleFinalizeClick = () => {
    setShowFinalizePopup(true);
  };

  const handleCancelFinish = () => {
    setShowFinalizePopup(false);
  };

  // Add pagination navigation functions
  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Function to get current page indices
  const getCurrentPageIndices = () => {
    const startIndex = currentPage * 30;
    const endIndex = startIndex + 30;
    return Array.from({ length: preguntas.length })
      .map((_, index) => index)
      .slice(startIndex, endIndex);
  };

  // Manejar marcado de pregunta como dudosa, incluyendo markedAsDoubt en userAnswers
  const handleToggleDoubtful = (questionIndex) => {
    setDoubtfulQuestions(prev => {
      const isCurrentlyDoubtful = prev.includes(questionIndex);
      let newDoubtful;
      
      if (isCurrentlyDoubtful) {
        // Si ya estaba marcada como duda, la quitamos
        newDoubtful = prev.filter(i => i !== questionIndex);
      } else {
        // Si no estaba marcada, la añadimos
        newDoubtful = [...prev, questionIndex];
      }
      
      // Marcar que hay cambios pendientes
      setHasPendingChanges(true);
      
      // Remove automatic saving after toggling doubt
      // queueSave();
      
      return newDoubtful;
    });
  };

  // Add a helper function to generate status object for Pagination
  const generateItemStatus = (selectedAnswers, doubtfulQuestions, questions) => {
    const status = {};
    if (!questions || questions.length === 0) return status;

    for (let i = 0; i < questions.length; i++) {
      if (doubtfulQuestions.includes(i)) {
        status[i] = 'doubt';
      } else if (
        selectedAnswers[i] && 
        typeof selectedAnswers[i] === 'object' && 
        selectedAnswers[i].selectedAnswer
      ) {
        status[i] = 'answered';
      }
    }
    return status;
  };

  // Renderizar la pregunta actual
  const renderQuestion = () => {
    if (!preguntas.length) return <div>Cargando preguntas...</div>;
    
    // Verificar si hay respuesta seleccionada para la pregunta actual
    const currentAnswer = selectedAnswers[currentQuestion];
    if (currentAnswer) {
      console.log(`La pregunta ${currentQuestion+1} tiene seleccionada la respuesta: "${currentAnswer}"`);
    } else {
      console.log(`La pregunta ${currentQuestion+1} no tiene respuesta seleccionada.`);
    }
    
    return (
      <QuestionBox
        currentQuestion={currentQuestion}
        questions={preguntas}
        userAnswers={selectedAnswers}  // Usar selectedAnswers en vez de userAnswers
        handleAnswerClick={handleAnswerClick}
        markedAsDoubt={doubtfulQuestions.reduce((map, idx) => ({ ...map, [idx]: true }), {})}
        toggleDoubtMark={handleToggleDoubtful}
        onNavigate={(index) => {
          setCurrentQuestion(index);
          const page = Math.floor(index / 30);
          if (page !== currentPage) {
            setCurrentPage(page);
          }
          
          // Marcar cambios pendientes
          setHasPendingChanges(true);
          
          // Guardar la navegación después de un pequeño tiempo
          setTimeout(() => {
            queueSave();
          }, 100);
        }}
        onImpugnar={() => setIsDisputing(true)}
        isDarkMode={isDarkMode}
      />
    );
  };

  // Renderizar el índice de preguntas
  const renderQuestionIndex = () => {
    const totalPages = Math.ceil(preguntas.length / 30);
    const itemStatusObj = {};
    const doubtMarkedObj = doubtfulQuestions.reduce((map, idx) => ({ ...map, [idx]: true }), {});
    
    // Marcar preguntas respondidas usando selectedAnswers
    Object.keys(selectedAnswers).forEach(index => {
      const idx = parseInt(index);
      if (!isNaN(idx)) {
        // Si tiene respuesta, marcar como answered (incluso si también tiene duda)
        itemStatusObj[idx] = 'answered';
        console.log(`Pregunta ${idx+1} marcada como respondida: ${selectedAnswers[idx]}`);
      }
    });
    
    // Marcar preguntas con duda que no tienen respuesta
    doubtfulQuestions.forEach(idx => {
      if (!itemStatusObj[idx]) {
        itemStatusObj[idx] = 'doubt';
      }
    });
    
    return (
      <Pagination
        totalItems={preguntas.length}
        itemsPerPage={25}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onItemSelect={(index) => {
          setCurrentQuestion(index);
        }}
        activeItemIndex={currentQuestion}
        itemStatus={itemStatusObj}
        doubtMarkedQuestions={doubtMarkedObj}
        isDarkMode={isDarkMode}
      />
    );
  };

  // Renderizar el popup de inicio
  const renderStartPopup = () => {
    if (!showStartPopup) return null;

    return (
      <div className="popup-overlay">
        <div className="popup" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
          <h2>¡Comienza tu examen!</h2>
          <p>
            Este examen consta de <strong>{preguntas.length} preguntas</strong> y dispones de 
            <strong> {formatTime(timeLeft)}</strong> para completarlo.
          </p>
          <button 
            className="control-btn" 
            onClick={() => {
              setShowStartPopup(false);
              setIsPaused(false);
              // Guardar el estado inicialmente
              queueSave();
            }}
          >
            Comenzar
          </button>
        </div>
      </div>
    );
  };

  // Renderizar el popup de confirmación de finalización
  const renderConfirmPopup = () => {
    if (!showConfirmPopup) return null;

    return (
      <div className="popup-overlay">
        <div className="popup" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
          <h2>¿Estás seguro de que deseas finalizar el examen?</h2>
          <p>Una vez finalizado, no podrás modificar tus respuestas.</p>
          <div className="popup-buttons">
            <button 
              className="control-btn" 
              onClick={() => setShowConfirmPopup(false)}
            >
              Volver
            </button>
            <button 
              className="control-btn" 
              onClick={confirmFinalize}
            >
              Finalizar
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Renderizar el modal de impugnación
  const renderDisputeModal = () => {
    if (!isDisputing) return null;

    return (
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
    );
  };

  // Renderizar el popup de finalización
  const renderFinalizePopup = () => {
    if (!showFinalizePopup) return null;

    // Count answered questions correctly in the structured format
    const answeredQuestions = userAnswers.filter(answer => 
      answer && typeof answer === 'object' && answer.selectedAnswer
    ).length;

    return (
      <div className="popup-overlay">
        <div className="popup" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
          <h2>¿Finalizar el examen?</h2>
          <p>Has respondido {answeredQuestions} de {preguntas.length} preguntas.</p>
          <div className="popup-buttons">
            <button onClick={handleCancelFinish} className="control-btn" disabled={isFinishing}>
              Continuar revisando
            </button>
            <button onClick={confirmFinalize} className="control-btn" disabled={isFinishing}>
              {isFinishing ? 'Procesando...' : 'Finalizar examen'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Función para optimizar el guardado - reemplaza queueProgressSave
  const queueSave = (isForceComplete = false) => {
    // Si es forzado (completado), guardar inmediatamente
    if (isForceComplete) {
      console.log('Ejecutando guardado forzado como completado');
      saveProgress(true)
        .then(result => {
          if (result && result.success) {
            console.log('Examen guardado como completado');
            setHasPendingChanges(false);
          }
        })
        .catch(error => {
          console.error('Error al finalizar examen:', error);
        });
      return;
    }
    
    // No guardar si ya hay un guardado en progreso
    if (isSaving) {
      console.log('Ya hay un guardado en progreso, omitiendo...');
      setHasPendingChanges(true); // Mantener el flag de cambios pendientes para intentar después
      return;
    }
    
    console.log('Iniciando proceso de guardado de respuestas...');
    setIsSaving(true);
    setLastSaveTime(Date.now());
    
    // Guardar el estado actual
    saveProgress(false)
      .then(result => {
        if (result && result.success) {
          console.log('Guardado completado exitosamente');
          setHasPendingChanges(false);
        } else {
          console.warn('El guardado no fue exitoso, manteniendo flag de cambios pendientes');
        }
      })
      .catch(error => {
        console.error('Error durante el guardado:', error);
      })
      .finally(() => {
        setIsSaving(false);
        console.log('Proceso de guardado finalizado');
      });
  };
  
  const saveProgress = async (isCompleted = false) => {
    try {
      console.log('==== INICIO GUARDADO DE PROGRESO ====');
      
      // Establecer estado del examen
      const examStatus = isPaused ? 'paused' : (isCompleted ? 'completed' : 'in_progress');
      
      // Calcular tiempo usado
      const timeUsedValue = Math.max(0, tiempoAsignado * 60 - timeLeft);
      
      // IMPORTANTE: Asegurar que estamos trabajando con los datos más actualizados
      // en vez de tomar referencias directas de los estados que podrían no estar actualizados
      const currentSelectedAnswers = {...selectedAnswers};
      
      // Crear una copia profunda de userAnswers y asegurarse que tiene la información actualizada
      // de selectedAnswers para evitar inconsistencias entre ambos estados
      const currentUserAnswers = userAnswers.map((answer, index) => {
        // Si hay una respuesta seleccionada para esta pregunta en selectedAnswers
        if (currentSelectedAnswers[index] !== undefined) {
          return {
            ...answer,
            selectedAnswer: currentSelectedAnswers[index],
            questionData: {
              ...(answer?.questionData || {}),
            }
          };
        }
        return answer;
      });
      
      // DEPURACIÓN: Log de respuestas seleccionadas
      console.log('===== RESPUESTAS SELECCIONADAS =====');
      console.log('selectedAnswers:', currentSelectedAnswers);
      console.log(`Total seleccionadas: ${Object.keys(currentSelectedAnswers).length}`);
      
      // Verificar todas las respuestas
      Object.entries(currentSelectedAnswers).forEach(([idx, answer]) => {
        console.log(`Pregunta ${parseInt(idx)+1}: Respondida con "${answer}"`);
      });
      
      // DEPURACIÓN: Log del array userAnswers
      console.log('===== RESPUESTAS COMPLETAS =====');
      console.log(`Total respuestas: ${currentUserAnswers.length}, Contestadas: ${currentUserAnswers.filter(a => a && a.selectedAnswer).length}`);
      
      // Convertir doubtfulQuestions array a objeto con formato adecuado
      const doubtMarksObj = doubtfulQuestions.reduce((obj, index) => {
        obj[index] = true;
        return obj;
      }, {});
      
      // Usar función centralizada saveExamProgress
      const effectiveUserId = userId || 'test_user_1';
      console.log(`Guardando con UserID: ${effectiveUserId}, ExamID: ${examId || 'NUEVO'}`);
      
      const result = await saveExamProgress(
        effectiveUserId,
        examId,
        'personalizado',
        preguntas,
        currentUserAnswers,
        currentSelectedAnswers,
        timeLeft,
        currentQuestion,
        doubtMarksObj,
        timeUsedValue,
        tiempoAsignado * 60, // Tiempo total en segundos
        isCompleted,
        examStatus
      );
        
      // Actualizar ID del examen si es nuevo
      if (result.examId && !examId) {
        console.log(`ID de examen guardado: ${result.examId}`);
        setExamId(result.examId);
      }
      
      console.log('==== FIN GUARDADO DE PROGRESO ====');
      
      return { success: true, data: result };
    } catch (error) {
      console.error('Error al guardar progreso:', error);
      return { success: false, error: error.message };
    }
  };

  // Guardar progreso automáticamente cada 60 segundos
  // useEffect(() => {
  //   let autoSaveTimer;
  //   
  //   if (!isPaused && !showStartPopup && step === 3) {
  //     autoSaveTimer = setInterval(() => {
  //       saveProgress(false);
  //     }, 60000); // Cada 60 segundos
  //   }
  //   
  //   return () => clearInterval(autoSaveTimer);
  // }, [isPaused, showStartPopup, step]);

  // Guardar progreso antes de salir de la página
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (step === 3 && !isFinishing) {
        e.preventDefault();
        e.returnValue = '¿Seguro que quieres salir? Tu progreso actual se guardará.';
        
        try {
          // Realizar guardado síncrono antes de salir
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `${API_URL}/save-exam-progress`, false); // false = síncrono
          xhr.setRequestHeader('Content-Type', 'application/json');
          
          // Formatear userAnswers correctamente para guardado antes de salir
          const formattedUserAnswers = [];
          
          for (let i = 0; i < preguntas.length; i++) {
            // Crear el objeto questionData con toda la información de la pregunta
            const questionData = {
              question: preguntas[i].question || "",
              option_1: preguntas[i].option_1 || preguntas[i].options?.[0] || "",
              option_2: preguntas[i].option_2 || preguntas[i].options?.[1] || "",
              option_3: preguntas[i].option_3 || preguntas[i].options?.[2] || "",
              option_4: preguntas[i].option_4 || preguntas[i].options?.[3] || "",
              option_5: preguntas[i].option_5 || preguntas[i].options?.[4] || "-",
              answer: preguntas[i].answer || "",
              subject: preguntas[i].subject || preguntas[i].categoria || "General",
              image: preguntas[i].image || null,
              _id: preguntas[i]._id || `question_${i}`
            };
            
            formattedUserAnswers.push({
              questionId: preguntas[i]._id || `question_${i}`,
              selectedAnswer: userAnswers[i]?.selectedAnswer || null,
              isCorrect: null,
              markedAsDoubt: doubtfulQuestions.includes(i) || false,
              questionData: questionData
            });
          }
          
          // Convertir doubtfulQuestions array a objeto con formato adecuado
          const doubtMarksObj = doubtfulQuestions.reduce((obj, index) => {
            obj[index] = true;
            return obj;
          }, {});
          
          // Calcular tiempo usado
          const timeUsed = tiempoAsignado * 60 - timeLeft;
          
          // Preparar los datos del examen para enviar
          const examData = {
            type: 'personalizado',
            questions: preguntas,
            userAnswers: formattedUserAnswers,
            selectedAnswers: userAnswers.reduce((acc, answer, idx) => {
              if (answer) acc[idx] = answer;
              return acc;
            }, {}),
            timeLeft: timeLeft,
            currentQuestion: currentQuestion,
            markedAsDoubt: doubtMarksObj,
            timeUsed: timeUsed,
            totalTime: tiempoAsignado * 60,
            status: 'paused',
            totalQuestions: preguntas.length
          };
          
          // Enviar la petición
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
  }, [userId, examId, preguntas, userAnswers, timeLeft, currentQuestion, isFinishing, step, tiempoAsignado, doubtfulQuestions]);

  // Añadir esta función para la creación del examen
  const handleExamCreation = () => {
    // Validar que se haya seleccionado al menos una asignatura si es de tipo 'anteriores'
    if (tipoExamen === 'anteriores' && asignaturasSeleccionadas.length === 0) {
      alert('Debes seleccionar al menos una asignatura');
      return;
    }
    
    // Validar que el número de preguntas sea mayor que cero
    if (numPreguntas <= 0) {
      alert('El número de preguntas debe ser mayor que cero');
      return;
    }
    
    // Preparar la configuración del examen
    const examConfig = {
      type: 'personalizado',
      tipoExamen: tipoExamen,
      numPreguntas: numPreguntas,
      tiempoAsignado: tiempoAsignado * 60, // Convertir a segundos
      asignaturas: asignaturasSeleccionadas,
      numPreguntasImagen: numPreguntasImagen
    };
    
    // Guardar configuración en localStorage para persistencia
    localStorage.setItem('aeleccionConfig', JSON.stringify(examConfig));
    
    // Redirigir al usuario a la página del examen con los parámetros configurados
    navigate('/exam', { 
      state: { 
        examType: 'personalizado',
        config: examConfig
      }
    });
  };

  // Optimizar la función resumeExam para que sea más eficiente
  const resumeExam = async () => {
    try {
      const effectiveUserId = userId || 'test_user_1';
      const data = await resumeExamUtil(effectiveUserId);
      
      if (!data || data === false) {
        console.log('No se encontró progreso anterior para restaurar');
        return false;
      }
      
      // Verificar que el tipo de examen sea personalizado
      const { progress } = data;
      if (progress.type !== 'personalizado') {
        console.log('El progreso guardado no corresponde a un examen personalizado');
        return false;
      }
      
      console.log('Restaurando progreso del examen personalizado...');
      
      // Establecer el ID del examen para futuras actualizaciones
      if (progress.examId || progress._id) {
        setExamId(progress.examId || progress._id);
        console.log('ID del examen establecido:', progress.examId || progress._id);
      }
      
      // Optimización: Comprobar si las preguntas son válidas
      if (!progress.questions || !Array.isArray(progress.questions) || progress.questions.length === 0) {
        console.error('Las preguntas del progreso guardado no son válidas');
        return false;
      }
      
      // Restaurar las preguntas - verificar y limpiar posibles datos inválidos
      const preguntasLimpias = progress.questions.map(q => ({
        _id: q._id,
        question: q.question || '',
        option_1: q.option_1 || q.options?.[0] || '',
        option_2: q.option_2 || q.options?.[1] || '',
        option_3: q.option_3 || q.options?.[2] || '',
        option_4: q.option_4 || q.options?.[3] || '',
        option_5: q.option_5 || q.options?.[4] || '',
        answer: q.answer || '',
        subject: q.subject || 'General',
        // Add long_answer if it exists
        ...(q.long_answer ? { long_answer: q.long_answer } : {}),
        // Solo incluir imagen si existe
        ...(q.image ? { image: q.image } : {})
      }));
      
      setPreguntas(preguntasLimpias);
      console.log(`Restauradas ${preguntasLimpias.length} preguntas`);
      
      // Inicializar userAnswers con estructura correcta
      const nuevasRespuestas = preguntasLimpias.map((pregunta, index) => ({
        questionId: pregunta._id || `question_${index}`,
        selectedAnswer: null,
        isCorrect: null,
        markedAsDoubt: false,
        questionData: {
          question: pregunta.question || "",
          option_1: pregunta.option_1 || "",
          option_2: pregunta.option_2 || "",
          option_3: pregunta.option_3 || "",
          option_4: pregunta.option_4 || "",
          option_5: pregunta.option_5 || "",
          answer: pregunta.answer || "",
          subject: pregunta.subject || "General",
          image: pregunta.image || null,
          _id: pregunta._id || `question_${index}`,
          long_answer: pregunta.long_answer || null
        }
      }));
      
      // Para almacenar las respuestas seleccionadas en formato simple (índice -> respuesta)
      const respuestasSeleccionadas = {};
      
      // Restaurar las respuestas del usuario
      console.log('Procesando respuestas guardadas...');
      
      // Si hay respuestas almacenadas como objeto selectedAnswers
      if (progress.selectedAnswers && typeof progress.selectedAnswers === 'object') {
        console.log('Encontradas respuestas en formato selectedAnswers');
        
        Object.entries(progress.selectedAnswers).forEach(([index, value]) => {
          const idx = parseInt(index);
          if (!isNaN(idx) && idx >= 0 && idx < nuevasRespuestas.length && value) {
            nuevasRespuestas[idx].selectedAnswer = value;
            respuestasSeleccionadas[idx] = value; // También actualizar formato simple
            console.log(`Restaurada respuesta para pregunta ${idx+1}: "${value}"`);
          }
        });
      }
      // Si hay respuestas en formato array (userAnswers)
      else if (progress.userAnswers && Array.isArray(progress.userAnswers)) {
        console.log('Encontradas respuestas en formato userAnswers array');
        
        progress.userAnswers.forEach((answer, index) => {
          if (answer && index < nuevasRespuestas.length) {
            // Si es un objeto con selectedAnswer
            if (typeof answer === 'object' && answer.selectedAnswer !== undefined) {
              nuevasRespuestas[index].selectedAnswer = answer.selectedAnswer;
              respuestasSeleccionadas[index] = answer.selectedAnswer; // También actualizar formato simple
              console.log(`Restaurada respuesta para pregunta ${index+1}: "${answer.selectedAnswer}"`);
            }
            // Si es directamente un string (formato antiguo)
            else if (typeof answer === 'string' || typeof answer === 'number') {
              nuevasRespuestas[index].selectedAnswer = answer;
              respuestasSeleccionadas[index] = answer; // También actualizar formato simple
              console.log(`Restaurada respuesta para pregunta ${index+1}: "${answer}"`);
            }
          }
        });
      }
      
      // Verificar las respuestas restauradas
      const respuestasRestauradas = nuevasRespuestas.filter(r => r.selectedAnswer !== null).length;
      console.log(`Restauradas ${respuestasRestauradas} respuestas de usuario`);
      
      setUserAnswers(nuevasRespuestas);
      setSelectedAnswers(respuestasSeleccionadas); // ¡Importante! Establecer también selectedAnswers
      
      // Restaurar el tiempo restante
      if (typeof progress.timeLeft === 'number') {
        setTimeLeft(progress.timeLeft);
        console.log(`Tiempo restante restaurado: ${formatTime(progress.timeLeft)}`);
        
        // Establecer también el tiempo asignado basado en el tiempo total
        if (typeof progress.totalTime === 'number') {
          const tiempoAsignadoMinutos = Math.ceil(progress.totalTime / 60);
          setTiempoAsignado(tiempoAsignadoMinutos);
          console.log(`Tiempo asignado restaurado: ${tiempoAsignadoMinutos} minutos`);
        }
      }
      
      // Restaurar pregunta actual
      if (typeof progress.currentQuestion === 'number') {
        const currentQ = Math.min(progress.currentQuestion, preguntasLimpias.length - 1);
        setCurrentQuestion(currentQ);
        
        // Calcular y establecer la página correcta
        const questionPage = Math.floor(currentQ / 30);
        setCurrentPage(questionPage);
        console.log(`Pregunta actual restaurada: ${currentQ + 1}`);
      }
      
      // Restaurar marcas de duda
      if (progress.markedAsDoubt) {
        // Convertir el objeto de dudas a un array para nuestro formato
        const doubtArray = [];
        Object.entries(progress.markedAsDoubt).forEach(([key, value]) => {
          if (value === true) {
            const idx = parseInt(key);
            if (!isNaN(idx) && idx >= 0 && idx < preguntasLimpias.length) {
              doubtArray.push(idx);
            }
          }
        });
        
        setDoubtfulQuestions(doubtArray);
        console.log(`Restauradas ${doubtArray.length} marcas de duda`);
      }
      
      // Establecer paso en examen
      setStep(3);
      setShowStartPopup(false); // No mostrar popup de inicio si se está restaurando
      
      console.log('Progreso del examen restaurado correctamente');
      return true;
    } catch (error) {
      console.error('Error al recuperar progreso:', error);
      return false;
    }
  };

  // Renderizado condicional según el paso actual
  if (step === 0) {
    return (
      <div className="popup-overlay">
        <div className="aeleccion-popup" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
          <h2>Selecciona el tipo de examen</h2>
          
          <div className="tipo-examen-options" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '20px',
            margin: '30px 0'
          }}>
            <button
              className="tipo-examen-btn"
              onClick={() => handleTipoExamenSelect('anteriores')}
              style={{
                padding: '20px',
                borderRadius: '10px',
                backgroundColor: isDarkMode ? '#3E5055' : '#f5f9fa',
                border: '2px solid #7ea0a7',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                textAlign: 'left',
                transform: 'translateY(0)',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 5px 15px rgba(126, 160, 167, 0.4)';
                e.currentTarget.style.backgroundColor = isDarkMode ? '#5A6B72' : '#e6f2f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
                e.currentTarget.style.backgroundColor = isDarkMode ? '#3E5055' : '#f5f9fa';
              }}
            >
              <h3 style={{ 
                color: isDarkMode ? '#7ea0a7' : '#3E5055', 
                marginTop: 0, 
                marginBottom: '10px' 
              }}>
                Exámenes Años Anteriores
              </h3>
              <p style={{ 
                color: isDarkMode ? '#cccccc' : '#666', 
                margin: 0 
              }}>
                Selecciona asignaturas específicas y número de preguntas
              </p>
            </button>
            
            <button
              className="tipo-examen-btn"
              onClick={() => handleTipoExamenSelect('protocolos')}
              style={{
                padding: '20px',
                borderRadius: '10px',
                backgroundColor: isDarkMode ? '#3E5055' : '#f5f9fa',
                border: '2px solid #7ea0a7',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                textAlign: 'left',
                transform: 'translateY(0)',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 5px 15px rgba(126, 160, 167, 0.4)';
                e.currentTarget.style.backgroundColor = isDarkMode ? '#5A6B72' : '#e6f2f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
                e.currentTarget.style.backgroundColor = isDarkMode ? '#3E5055' : '#f5f9fa';
              }}
            >
              <h3 style={{ 
                color: isDarkMode ? '#7ea0a7' : '#3E5055', 
                marginTop: 0, 
                marginBottom: '10px' 
              }}>
                Exámenes de Protocolos
              </h3>
              <p style={{ 
                color: isDarkMode ? '#cccccc' : '#666', 
                margin: 0 
              }}>
                Solo podrás seleccionar el número de preguntas
              </p>
            </button>
          </div>
          
          <div className="popup-buttons">
            <button className="control-btn" onClick={() => navigate('/dashboard')}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="popup-overlay">
        <div className="aeleccion-popup" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
          <h2>Configuración del Examen</h2>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <div className="aeleccion-section">
            <h3>Número de preguntas</h3>
            <div className="slider-container">
              <input
                type="range"
                min="10"
                max="210"
                step="5"
                value={numPreguntas}
                onChange={(e) => setNumPreguntas(parseInt(e.target.value))}
                className="range-slider"
              />
              <div className="range-value">{numPreguntas} preguntas</div>
            </div>
            <p className="time-estimate">Tiempo estimado: {formatTiempo(tiempoAsignado)}</p>
          </div>

          {tipoExamen === 'anteriores' && (
            <>
              <div className="aeleccion-section">
                <h3>Preguntas con Imagen</h3>
                <div className="slider-container">
                  <input
                    type="range"
                    min="0"
                    max={numPreguntas}
                    step="1"
                    value={numPreguntasImagen}
                    onChange={(e) => setNumPreguntasImagen(parseInt(e.target.value))}
                    className="range-slider"
                  />
                  <div className="range-value">{numPreguntasImagen} preguntas con imagen</div>
                </div>
              </div>

              <div className="aeleccion-section">
                <h3>Selección de Asignaturas</h3>
                <div className="subject-actions">
                  <button onClick={handleSelectAllSubjects} className="subject-btn">
                    Seleccionar TODAS
                  </button>
                  <button onClick={handleDeselectAllSubjects} className="subject-btn">
                    Deseleccionar todas
                  </button>
                </div>
                
                <div className="selected-count">
                  Asignaturas seleccionadas: {asignaturasSeleccionadas.length} de {asignaturasDisponibles.length}
                </div>
                
                <div className="subject-grid" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                  {asignaturasDisponibles.map((asignatura) => (
                    <label 
                      key={asignatura.id} 
                      className={`subject-item ${asignaturasSeleccionadas.includes(asignatura.id) ? 'selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={asignaturasSeleccionadas.includes(asignatura.id)}
                        onChange={() => handleSubjectToggle(asignatura.id)}
                      />
                      <span>{asignatura.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
          
          <div className="popup-buttons">
            <button className="control-btn" onClick={() => setStep(0)}>
              Volver
            </button>
            <button 
              className="control-btn next-btn"
              onClick={avanzarPaso}
              disabled={(tipoExamen === 'anteriores' && asignaturasSeleccionadas.length === 0) || isLoading}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="popup-overlay">
        <div className="confirmation-popup" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
          <h2>Confirmación del Examen</h2>
          
          <div className="confirmation-details">
            <p>
              Has configurado un {tipoExamen === 'protocolos' ? 'examen de protocolos' : 'examen personalizado'} con <strong>{numPreguntas} preguntas</strong>.
            </p>
            <p>
              El tiempo asignado será de <strong>{formatTiempo(tiempoAsignado)}</strong>.
            </p>
            {tipoExamen === 'anteriores' && (
              <>
                <p>
                  Preguntas con imagen: <strong>{numPreguntasImagen}</strong>
                </p>
                <p>
                  Asignaturas seleccionadas: <strong>{asignaturasSeleccionadas.length}</strong> de {asignaturasDisponibles.length}
                </p>
              </>
            )}
          </div>
          
          <div className="popup-buttons">
            <button className="control-btn" onClick={() => setStep(1)}>
              Volver
            </button>
            <button 
              className="control-btn start-btn" 
              onClick={empezarExamen}
              disabled={isLoading}
            >
              {isLoading ? 'Preparando examen...' : '¡Comenzar Examen!'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Paso 3: Renderizar el examen
  if (step === 3) {
    return (
      <div id="exam-root" className="exam-container">
        {renderStartPopup()}
        {renderConfirmPopup()}
        
        <ExamHeader
          timeLeft={timeLeft}
          onPause={() => setIsPaused(!isPaused)}
          onSave={() => queueSave()}
          onFinish={() => setShowConfirmPopup(true)}
          isPaused={isPaused}
          isSaving={isSaving}
          hasPendingChanges={hasPendingChanges}
          toggleDarkMode={toggleDarkMode}
          onDownload={() => downloadExamPdfFromData({
            questions: preguntas,
            title: 'SIMULIA',
            subtitle: 'Examen: PERSONALIZADO',
            logoUrl: '/Logo_oscuro.png',
            examId: examId || '',
            date: new Date().toISOString().slice(0,10),
            durationMin: Math.ceil(timeLeft / 60),
            showAnswerKey: false,
            showBubbleSheet: true,
            fileName: 'examen-personalizado.pdf'
          })}
        />

        {renderQuestion()}
        {renderQuestionIndex()}
        {renderDisputeModal()}
        {renderFinalizePopup()}
        
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

  if (step === 4) {
    return (
      <div className="popup-overlay">
        <div className="confirmation-popup" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
          <h2>Confirmación de Finalización</h2>
          
          <div className="confirmation-details">
            <p>
              Tiempo usado: <strong>{formatTime(tiempoAsignado * 60 - timeLeft)}</strong>
            </p>
          </div>
          
          <div className="popup-buttons">
            <button 
              className="control-btn" 
              onClick={() => setShowFinalizePopup(true)}
            >
              Finalizar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 5) {
    return (
      <div className="popup-overlay">
        <div className="confirmation-popup" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
          <h2>¡Examen finalizado!</h2>
          
          <div className="confirmation-details">
            <p>
              Gracias por completar el examen.
            </p>
          </div>
          
          <div className="popup-buttons">
            <button 
              className="control-btn" 
              onClick={() => {
                setShowFinalizePopup(false);
                onClose();
              }}
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Fallback
  return null;
};

export default AEleccion;