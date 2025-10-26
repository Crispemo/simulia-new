import React, { useState, useEffect } from 'react';
import './Exam.css';
import { useNavigate } from 'react-router-dom';
import { useLogo } from './context/LogoContext';
import SuccessNotification from './components/SuccessNotification';
import { API_URL } from './config';

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
  
  // Función para guardar progreso en la base de datos
  const saveProgressToDB = async (isCompleted = false) => {
    if (!userId) {
      console.error('No se encontró userId');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/save-exam-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          examId: examId,
          type: 'personalizado', 
          questions: questions,
          userAnswers: userAnswers,
          timeUsed: totalTime - timeLeft,
          completed: isCompleted
        }),
      });
      
      const data = await response.json();
      
      if (isCompleted && data.examId) {
        navigate(`/review/${data.examId}`);
      }
      
      return data;
    } catch (error) {
      console.error('Error al guardar progreso:', error);
    }
  };

  // Uso en useEffect para guardar periódicamente
  useEffect(() => {
    const interval = setInterval(() => {
      if (timeLeft > 0 && !isSubmitted) {
        saveProgressToDB(false);
      }
    }, 30000); // Guardar cada 30 segundos

    return () => clearInterval(interval);
  }, [timeLeft, userAnswers, isSubmitted]);

  // Uso al terminar el examen
  const handleFinishExam = async () => {
    setIsSubmitted(true);
    await saveProgressToDB(true);
  };

  // Uso al salir de la página
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!isSubmitted) {
        saveProgressToDB(false);
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSubmitted, userAnswers]);

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
      newAnswers[questionId] = selectedOption;
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
        
  const handleDisputeSubmit = async (questionId) => {
    const disputeData = {
      question: questions[questionId]?.question || "Pregunta no disponible",
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
      // Calcular tiempo usado
      const timeUsed = totalTime - timeLeft;

      // 1. Validar respuestas
      const answersToValidate = {
        answers: Object.entries(selectedAnswers).map(([questionIndex, answer]) => ({
          questionId: questions[questionIndex]._id,
          answer
        })),
        questions: questions
      };

      const validationResponse = await fetch(`${API_URL}/validate-answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answersToValidate)
      });

      if (!validationResponse.ok) throw new Error('Error al validar respuestas');
      const results = await validationResponse.json();

      // 2. Guardar en MongoDB
      const examHistoryResponse = await fetch(`${API_URL}/save-exam-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          examData: {
            type: 'personalizado',
            questions: questions,
            userAnswers: selectedAnswers,
            correct: results.correct,
            incorrect: results.incorrect,
            totalQuestions: questions.length,
            timeUsed: timeUsed,
            score: results.score,
            status: 'completed',
            date: new Date()
          }
        })
      });

      if (!examHistoryResponse.ok) throw new Error('Error al guardar el historial');

      // 3. Limpiar sessionStorage
      sessionStorage.removeItem('personalizadoState');
      
      setShowFinalizePopup(false);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error:', error);
      alert('Error al finalizar el examen. Por favor, inténtalo de nuevo.');
    }
  };

  const handleCancelFinish = () => {
    setShowConfirmPopup(false);
    navigate('/dashboard');
  };

  const handleClosePopup = () => {
    setShowFinalizePopup(false);
  };
  
  const getCurrentOptions = () => {
    if (!questions[currentQuestion]) return [];
    
    if (questions[currentQuestion].options && Array.isArray(questions[currentQuestion].options)) {
      return questions[currentQuestion].options;
    }
    
    return [
      questions[currentQuestion].option_1, 
      questions[currentQuestion].option_2,
      questions[currentQuestion].option_3, 
      questions[currentQuestion].option_4,
      questions[currentQuestion].option_5
    ].filter(Boolean);
  };
  
  const currentOptions = getCurrentOptions();
  const examName = questions[currentQuestion]?.exam_name || '';

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

  return (
    <div className="exam-container">
      {showStartPopup && (
        <div className="popup-overlay">
          <div className="popup">
            <h2><strong>¡Comienza tu examen personalizado!</strong></h2>
            <p>
              Este examen consta de <strong>{questions.length} preguntas</strong> y dispones de 
              <strong> {formatTime(timeLeft)}</strong> para completarlo.
              Administra bien tu tiempo y recuerda que puedes revisar y ajustar 
              tus respuestas antes de finalizar.
            </p>
            <button onClick={handleStartExam} className="control-btn">Estoy list@</button>
          </div>
        </div>
      )}

      <div className="exam-header">
        <div className="logo">
          <img src={logoSrc} alt="Logo" width="37" height="39" />
          <h2>SIMULIA - Examen Personalizado</h2>
        </div>
        <div className="time-display">{formatTime(timeLeft)}</div>
        <div className="right-buttons">
          <button onClick={() => setPaused(!paused)} className="control-btn icon-only" aria-label={paused ? 'Reanudar' : 'Pausar'}>
            {paused ? (
              <svg width="18" height="18" viewBox="0 0 24 24" style={{margin: '0'}}>
                <path fill="currentColor" d="M8 5V19L19 12L8 5Z"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" style={{margin: '0'}}>
                <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            )}
          </button>
          <button onClick={handleFinalizeClick} className="control-btn icon-only" aria-label="Salir">
            <svg width="18" height="18" viewBox="0 0 24 24" style={{margin: '0'}}>
              <path fill="currentColor" d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
          </button>
        </div>
      </div>

      {questions.length > 0 && (
        <div className="question-box">
          <h3>
            {examName ? `(${examName}) ` : ''}
            {questions[currentQuestion]?.question || 'Pregunta no disponible'}
          </h3>
          
          <div className="question-content">
            <div className="options-container">
              {currentOptions.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerClick(currentQuestion, option)}
                  className={selectedAnswers[currentQuestion] === option ? 'selected' : ''}
                >
                  {option}
                </button>
              ))}
              <button onClick={() => setIsDisputing(true)} className="control-btn impugnar">
                Impugnar
              </button>
            </div>
          </div>
          
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
          
          <div className="navigation-buttons">
            {currentQuestion > 0 && (
              <button
                onClick={handlePreviousQuestion}
                className="control-btn"
              >
                Anterior
              </button>
            )}
            {currentQuestion < questions.length - 1 ? (
              <button
                onClick={handleNextQuestion}
                className="control-btn"
              >
                Siguiente
              </button>
            ) : (
              <button onClick={handleFinalizeClick} className="control-btn">
                Finalizar
              </button>
            )}
          </div>
        </div>
      )}
      
      <div className="exam-question-index">
        {Array.from({ length: questions.length }, (_, index) => (
          <button
            key={index}
            className={`exam-question-number ${currentQuestion === index ? 'active' : (selectedAnswers[index] ? 'answered' : '')}`}
            onClick={() => setCurrentQuestion(index)}
          >
            {index + 1}
          </button>
        ))}
      </div>

      {showConfirmPopup && (
        <div className="popup-overlay">
          <div className="popup">
            <h2>¿Estás seguro de que deseas salir del examen? Se guardará el progreso.</h2>
            <div className="popup-buttons">
              <button onClick={handleCancelFinish} className="control-btn">No salir del examen</button>
              <button onClick={handleFinishExam} className="control-btn">Salir del examen</button>
            </div>
          </div>
        </div>
      )}

      {showFinalizePopup && (
        <div className="popup-overlay">
          <div className="popup">
            <p>¿Quieres finalizar el examen o revisarlo antes?</p>
            <div className="popup-buttons">
              <button onClick={confirmFinalize} className="control-btn">Finalizar y salir</button>
              <button onClick={handleClosePopup} className="control-btn">Continuar revisando</button>
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

      {showSuccessNotification && (
        <SuccessNotification
          message={successMessage}
          onClose={() => setShowSuccessNotification(false)}
          autoCloseTime={successMessage.includes('Impugnación') ? 1500 : 1000}
        />
      )}
    </div>
  );
};

export default Personalizado; 