import React, { useState, useEffect, useCallback } from 'react';
import { debounce } from 'lodash';
import './Exam.css';
import { useNavigate } from 'react-router-dom';
import { useLogo } from './context/LogoContext';
import SuccessNotification from './components/SuccessNotification';
import { API_URL } from './config';
import { finalizeExam, saveExamProgress } from './lib/examUtils';
import { downloadExamPdfFromData } from './lib/pdfUtils';
import ExamView from './views/exam/exam';

const Personalizado = ({ toggleDarkMode, isDarkMode, userId }) => {
  const navigate = useNavigate();
  const { logoSrc } = useLogo();
  
  const [questions, setQuestions] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0); 
  const [paused, setPaused] = useState(true); // Siempre iniciar pausado
  const [hasStarted, setHasStarted] = useState(false); // Nuevo estado para controlar si el examen ha comenzado
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [userAnswers, setUserAnswers] = useState([]);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [showStartPopup, setShowStartPopup] = useState(true);
  const [showFinalizePopup, setShowFinalizePopup] = useState(false);
  const [isDisputing, setIsDisputing] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [examId, setExamId] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markedAsDoubt, setMarkedAsDoubt] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
 
  // Cargar datos del examen personalizado
  useEffect(() => {
    try {
      const savedState = sessionStorage.getItem('personalizadoState');
      if (!savedState) {
        navigate('/dashboard');
        return;
      }
      
      const examState = JSON.parse(savedState);
      setQuestions(examState.questions);
      setSelectedAnswers(examState.selectedAnswers || {});
      setUserAnswers(examState.userAnswers || new Array(examState.questions.length).fill(null));
      setTimeLeft(examState.timeLeft);
      setTotalTime(examState.totalTime);
      setCurrentQuestion(examState.currentQuestion || 0);
      setExamId(examState.examId);
      setIsLoading(false);
      
    } catch (err) {
      console.error("Error al cargar el estado del examen:", err);
      setError("Error al cargar el examen personalizado");
      setIsLoading(false);
    }
  }, [navigate]);
  
  // Asegurarse de que el examen esté pausado al inicio
  useEffect(() => {
    setPaused(true);
  }, []);

  // Pausar el cronómetro mientras el popup está visible
  useEffect(() => {
    if (showStartPopup) {
      setPaused(true);
    }
  }, [showStartPopup]);

  const handleStartExam = () => {
    console.log('Iniciando examen personalizado...');
    
    // Primero cerrar el popup
    setShowStartPopup(false);
    
    // Usar setTimeout para asegurarse de que el popup se ha cerrado antes de iniciar el cronómetro
    setTimeout(() => {
      setHasStarted(true); // Marcar que el examen ha comenzado
      setPaused(false); // Quitar la pausa
      console.log('Examen personalizado iniciado - Cronómetro activado');
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
    
    return () => {
      if (timer) {
        console.log('Limpiando cronómetro');
        clearInterval(timer);
      }
    };
  }, [paused, hasStarted, timeLeft]);
  
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
          markedAsDoubt: markedAsDoubt[i] || false,
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
        'personalizado',
        questions,
        formattedUserAnswers,
        selectedAnswers,
        timeLeft,
        currentQuestion,
        markedAsDoubt,
        totalTime - timeLeft,
        totalTime,
        false,
        paused ? 'paused' : 'in_progress'
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
    [hasPendingChanges, isSaving, hasStarted, handleManualSave]
  );

  useEffect(() => {
    if (hasPendingChanges && hasStarted) {
      debouncedSave();
    }
    return () => {
      debouncedSave.cancel();
    };
  }, [hasPendingChanges, hasStarted, debouncedSave]);

  // Función para pausar/reanudar
  const handlePause = () => {
    setPaused(!paused);
    setHasPendingChanges(true);
  };

  const handleAnswerClick = (questionId, selectedOption) => {
    setSelectedAnswers((prevAnswers) => {
      const currentAnswer = prevAnswers[questionId];
      if (currentAnswer === selectedOption) {
        const updatedAnswers = { ...prevAnswers };
        delete updatedAnswers[questionId];
        return updatedAnswers;
      }
      return { ...prevAnswers, [questionId]: selectedOption };
    });
    
    setUserAnswers(prev => {
      const newAnswers = [...prev];
      const question = questions[questionId];
      newAnswers[questionId] = {
        questionId: question?._id || `question_${questionId}`,
        selectedAnswer: selectedOption,
        isCorrect: null,
        markedAsDoubt: markedAsDoubt[questionId] || false,
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
      return newAnswers;
    });

    setHasPendingChanges(true);
  };

  // Navegación de preguntas
  const handleNavigate = (index) => {
    setCurrentQuestion(index);
    const newPage = Math.floor(index / 25);
    if (newPage !== currentPage) {
      setCurrentPage(newPage);
    }
    setHasPendingChanges(true);
  };

  // Marcar pregunta como duda
  const toggleDoubtMark = (questionIndex) => {
    setMarkedAsDoubt(prev => {
      const newState = { ...prev };
      const isDubious = !newState[questionIndex];
      newState[questionIndex] = isDubious;
      
      // Actualizar también markedAsDoubt en userAnswers
      setUserAnswers(prevUserAnswers => {
        const newUserAnswers = [...prevUserAnswers];
        if (questionIndex < newUserAnswers.length) {
          if (newUserAnswers[questionIndex]) {
            if (typeof newUserAnswers[questionIndex] === 'object') {
              newUserAnswers[questionIndex] = {
                ...newUserAnswers[questionIndex],
                markedAsDoubt: isDubious
              };
            } else {
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
                  image: question.image || null,
                  _id: question._id || `question_${questionIndex}`
                }
              };
            }
          } else {
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
                image: question.image || null,
                _id: question._id || `question_${questionIndex}`
              }
            };
          }
        }
        return newUserAnswers;
      });
      
      return newState;
    });

    setHasPendingChanges(true);
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
      
      // Guardar cambios pendientes primero
      if (hasPendingChanges) {
        try {
          await handleManualSave();
        } catch (prevSaveError) {
          console.warn('Error al guardar cambios previos:', prevSaveError);
        }
      }

      const timeUsed = totalTime - timeLeft;

      // Formatear userAnswers correctamente
      const formattedUserAnswers = questions.map((q, i) => {
        const userAnswer = userAnswers[i];
        return {
          questionId: q._id || `question_${i}`,
          selectedAnswer: userAnswer?.selectedAnswer || selectedAnswers[i] || null,
          isCorrect: userAnswer?.isCorrect || null,
          markedAsDoubt: markedAsDoubt[i] || false,
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

      const result = await finalizeExam(
        userId || 'test_user_1',
        'personalizado',
        questions,
        formattedUserAnswers,
        selectedAnswers,
        timeUsed,
        totalTime,
        markedAsDoubt,
        examId
      );

      if (result.error) {
        throw new Error(result.error);
      }

      // Limpiar sessionStorage
      sessionStorage.removeItem('personalizadoState');

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
      alert(`Error al finalizar el examen: ${error.message || 'Inténtalo de nuevo más tarde'}`);
      setIsFinishing(false);
    }
  };

  const handleCancelFinish = () => {
    setShowFinalizePopup(false);
  };

  // Formato de tiempo
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (isLoading) {
    return <div className="loading">Cargando tu examen personalizado...</div>;
  }

  if (error) {
    return (
      <div className="exam-error">
        <h2>Error al cargar tu examen personalizado</h2>
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
          <h2><strong>¡Comienza tu examen personalizado!</strong></h2>
          <p>
            Este examen consta de <strong>{questions.length} preguntas</strong> y dispones de 
            <strong> {formatTime(totalTime)}</strong> para completarlo.
            Administra bien tu tiempo y recuerda que puedes revisar y ajustar 
            tus respuestas antes de finalizar.
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
        markedAsDoubt={markedAsDoubt}
        toggleDoubtMark={toggleDoubtMark}
        onSave={handleManualSave}
        onFinalize={confirmFinalize}
        onPause={handlePause}
        onDownload={() => downloadExamPdfFromData({
          questions: questions,
          title: 'SIMULIA',
          subtitle: 'Examen: PERSONALIZADO',
          logoUrl: '/Logo_oscuro.png',
          examId: examId || '',
          date: new Date().toISOString().slice(0,10),
          durationMin: Math.round(totalTime / 60),
          showAnswerKey: false,
          showBubbleSheet: true,
          fileName: 'examen-personalizado.pdf'
        })}
        onExit={() => navigate('/dashboard')}
        timeLeft={timeLeft}
        totalTime={totalTime}
        isPaused={paused}
        isSaving={isSaving}
        hasPendingChanges={hasPendingChanges}
        examType="personalizado"
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

export default Personalizado; 