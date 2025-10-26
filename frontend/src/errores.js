// Enhanced version of errores.js with better error handling and UI improvements

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './errores.css';
import './Exam.css';
import SuccessNotification from './components/SuccessNotification';
import { API_URL } from './config';

const Errores = ({ userId }) => {
  const navigate = useNavigate();
  const [failedQuestions, setFailedQuestions] = useState([]);
  const [unansweredQuestions, setUnansweredQuestions] = useState([]);
  const [showStartPopup, setShowStartPopup] = useState(true);
  const [selectedQuestionCount, setSelectedQuestionCount] = useState(30);
  const [timeAssigned, setTimeAssigned] = useState(calculateTime(30));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [failedBySubject, setFailedBySubject] = useState({});
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [examMode, setExamMode] = useState('mixed'); // 'mixed', 'failed', 'unanswered'
  const [isDisputing, setIsDisputing] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showFinalizePopup, setShowFinalizePopup] = useState(false);
  const [totalTime, setTotalTime] = useState(calculateTime(30));
  const [timeLeft, setTimeLeft] = useState(calculateTime(30));
  const [paused, setPaused] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [questions, setQuestions] = useState([]);
  const [isFinishing, setIsFinishing] = useState(false);
  
  // Calculate time specifically for errores: 1.29 minutes per question
  function calculateTime(questionCount) {
    // For errors exam, exactly 1.29 minutes per question, with maximum of 30 questions
    const minutesPorPregunta = 1.29;
    const maxPreguntas = Math.min(30, questionCount);
    return Math.ceil(maxPreguntas * minutesPorPregunta * 60); // Time in seconds
  }
  
  // Format time for display
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}min`;
  };

  useEffect(() => {
    const fetchQuestions = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Get userId from props or localStorage
        const currentUserId = userId;
        
        if (!currentUserId) {
          throw new Error('No se encontró el userId');
        }
        
        // Fetch failed questions
        const failedResponse = await fetch(`${API_URL}/failed-questions/${currentUserId}`);
        if (!failedResponse.ok) {
          throw new Error(`Error al obtener preguntas falladas: ${failedResponse.status}`);
        }
        const failedData = await failedResponse.json();
        
        console.log('Preguntas falladassssssss:', failedData);
        // Verify failed questions have valid options and filter out any with option_5 = "-"
        const processedFailedQuestions = failedData.questions.map(q => ({
          ...q,
          options: q.options ? q.options.filter(opt => opt && opt !== '-') : 
            [q.option_1, q.option_2, q.option_3, q.option_4, q.option_5]
              .filter(option => option && option !== '-')
        }));
        
        // Group failed questions by subject
        const subjectGroups = {};
        processedFailedQuestions.forEach(question => {
          const subject = question.subject || 'General';
          if (!subjectGroups[subject]) {
            subjectGroups[subject] = [];
          }
          subjectGroups[subject].push(question);
        });
        
        setFailedBySubject(subjectGroups);
        setFailedQuestions(processedFailedQuestions);
        
        // Get default selected subjects (all)
        setSelectedSubjects(Object.keys(subjectGroups));
        
        // Fetch unanswered questions - first page
        const unansweredResponse = await fetch(`${API_URL}/unanswered-questions/${currentUserId}`);
        if (!unansweredResponse.ok) {
          throw new Error(`Error al obtener preguntas no contestadas: ${unansweredResponse.status}`);
        }
        const unansweredData = await unansweredResponse.json();
        
        let allUnansweredQuestions = [...unansweredData.questions];
        const totalAvailable = unansweredData.totalAvailable || 0;
        const limit = unansweredData.pagination?.limit || 100;
        const totalPages = unansweredData.pagination?.totalPages || 1;
        
        console.log(`Preguntas sin contestar: ${allUnansweredQuestions.length}/${totalAvailable} (Páginas: ${totalPages})`);
        
        // If there are more questions available than what we received, fetch the remaining pages
        if (totalAvailable > allUnansweredQuestions.length && totalPages > 1) {
          console.log(`Obteniendo ${totalPages - 1} páginas adicionales de preguntas sin contestar...`);
          
          // Start from page 1 (we already have page 0)
          for (let page = 1; page < totalPages; page++) {
            try {
              const nextPageResponse = await fetch(
                `${API_URL}/unanswered-questions/${currentUserId}?page=${page}&limit=${limit}`
              );
              
              if (!nextPageResponse.ok) {
                console.warn(`Error al obtener página ${page} de preguntas no contestadas: ${nextPageResponse.status}`);
                continue;
              }
              
              const nextPageData = await nextPageResponse.json();
              allUnansweredQuestions = [...allUnansweredQuestions, ...nextPageData.questions];
              console.log(`Obtenida página ${page}: ${nextPageData.questions.length} preguntas adicionales`);
            } catch (pageError) {
              console.error(`Error al obtener página ${page}:`, pageError);
            }
          }
        }
        
        console.log(`Total de preguntas sin contestar cargadas: ${allUnansweredQuestions.length}/${totalAvailable}`);
        
        // Process unanswered questions options too
        const processedUnansweredQuestions = allUnansweredQuestions.map(q => ({
          ...q,
          options: q.options ? q.options.filter(opt => opt && opt !== '-') : 
            [q.option_1, q.option_2, q.option_3, q.option_4, q.option_5]
              .filter(option => option && option !== '-')
        }));
        
        setUnansweredQuestions(processedUnansweredQuestions);
        console.log(`Preguntas falladas: ${processedFailedQuestions.length}, Preguntas sin contestar: ${processedUnansweredQuestions.length}`);
        
      } catch (error) {
        console.error('Error al cargar preguntas:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchQuestions();
  }, [userId, navigate]);
  
  // Update time when question count changes, but ensure maximum 30 questions and 39 minutes
  useEffect(() => {
    // Ensure selected count is max 30
    const actualQuestionCount = Math.min(30, selectedQuestionCount);
    
    // Calculate time in seconds based on 1.29 min per question
    const timeInSeconds = Math.ceil(actualQuestionCount * 1.29 * 60);
    
    setTimeAssigned(timeInSeconds);
    
    console.log(`Seleccionadas ${actualQuestionCount} preguntas, tiempo asignado: ${formatTime(timeInSeconds)}`);
  }, [selectedQuestionCount]);
  
  const handleQuestionCountChange = (e) => {
    const count = parseInt(e.target.value);
    // Limit to 30 questions maximum
    setSelectedQuestionCount(Math.min(30, count));
  };
  
  const handleSubjectToggle = (subject) => {
    setSelectedSubjects(prev => {
      if (prev.includes(subject)) {
        return prev.filter(s => s !== subject);
      } else {
        return [...prev, subject];
      }
    });
  };
  
  const handleSelectAllSubjects = () => {
    setSelectedSubjects(Object.keys(failedBySubject));
  };
  
  const handleDeselectAllSubjects = () => {
    setSelectedSubjects([]);
  };
  
  const handleModeChange = (mode) => {
    setExamMode(mode);
  };
  
  const handleStartExam = () => {
    // Filtrar preguntas basadas en modo y selección
    let availableQuestions = [];
    
    if (examMode === 'failed' || examMode === 'mixed') {
      // Añadir preguntas falladas
      const filteredFailed = failedQuestions.filter(q => 
        selectedSubjects.includes(q.subject || 'General')
      );
      availableQuestions = [...availableQuestions, ...filteredFailed];
    }
    
    if (examMode === 'unanswered' || examMode === 'mixed') {
      // Añadir preguntas no contestadas
      availableQuestions = [...availableQuestions, ...unansweredQuestions];
    }
    
    // Limitar a máximo 30 preguntas
    const maxQuestions = Math.min(30, selectedQuestionCount);
    
    // Comprobar si hay suficientes preguntas
    if (availableQuestions.length < maxQuestions) {
      alert(`Solo tienes ${availableQuestions.length} preguntas disponibles. Ajusta la selección o elige un número menor.`);
      return;
    }
    
    // Mezclar y seleccionar preguntas
    const shuffled = [...availableQuestions].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, maxQuestions);
    
    // Procesar las preguntas para asegurar que las opciones estén correctamente filtradas
    const processedQuestions = selected.map(q => ({
      ...q,
      options: q.options ? q.options.filter(opt => opt && opt !== '-') : 
        [q.option_1, q.option_2, q.option_3, q.option_4, q.option_5]
          .filter(option => option && option !== '-')
    }));
    
    // Calcular tiempo: 1.29 minutos por pregunta = 39 minutos para 30 preguntas
    const tiempoEnSegundos = Math.ceil(maxQuestions * 1.29 * 60);
    
    console.log(`Examen de errores: ${maxQuestions} preguntas, tiempo: ${formatTime(tiempoEnSegundos)}`);
    
    // Guardar para Exam.js
    localStorage.setItem('errorQuestions', JSON.stringify({
      questions: processedQuestions,
      timeAssigned: tiempoEnSegundos,
      mode: examMode
    }));
    
    // Crear estado inicial para guardarlo en el backend
    const userAnswersArray = new Array(processedQuestions.length).fill(null);
    
    // Guardar el estado inicial en el backend
    const saveInitialProgress = async () => {
      try {
        // Formatear preguntas para el backend
        const formattedQuestions = processedQuestions.map(q => ({
          _id: q._id,
          question: q.question || '',
          option_1: q.option_1 || q.options?.[0] || '',
          option_2: q.option_2 || q.options?.[1] || '',
          option_3: q.option_3 || q.options?.[2] || '',
          option_4: q.option_4 || q.options?.[3] || '',
          answer: q.answer || '',
          subject: q.subject || 'General'
        }));
        
        const initialData = {
          userId,
          type: 'errores',
          questions: formattedQuestions,
          userAnswers: userAnswersArray,
          selectedAnswers: {},
          timeLeft: tiempoEnSegundos,
          currentQuestion: 0,
          timeUsed: 0,
          totalTime: tiempoEnSegundos,
          completed: false,
          status: 'in_progress'
        };
        
        const response = await fetch(`${API_URL}/save-exam-progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(initialData)
        });
        
        if (!response.ok) {
          console.error('Error al guardar estado inicial del examen:', response.status);
        } else {
          console.log('Estado inicial del examen guardado correctamente');
        }
      } catch (error) {
        console.error('Error al guardar estado inicial:', error);
      }
    };
    
    // Guardar estado inicial y navegar
    saveInitialProgress()
      .then(() => {
        // Navegar a la página de examen
        navigate('/exam?mode=errors');
      })
      .catch(error => {
        console.error('Error al iniciar examen:', error);
        // Navegar de todos modos, incluso si hay error al guardar
        navigate('/exam?mode=errors');
      });
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
      if (!userId) {
        alert('No se identificó al usuario');
        return;
      }
      
      setIsFinishing(true);

      // Calcular tiempo usado
      const timeUsed = totalTime - timeLeft;
      
      // Formatear preguntas para el backend
      const formattedQuestions = questions.map(q => ({
        _id: q._id,
        question: q.question || '',
        option_1: q.option_1 || q.options?.[0] || '',
        option_2: q.option_2 || q.options?.[1] || '',
        option_3: q.option_3 || q.options?.[2] || '',
        option_4: q.option_4 || q.options?.[3] || '',
        answer: q.answer || '',
        subject: q.subject || 'General'
      }));
      
      // Convertir selectedAnswers de objeto a array
      const userAnswersArray = new Array(questions.length).fill(null);
      Object.entries(selectedAnswers).forEach(([index, answer]) => {
        userAnswersArray[parseInt(index)] = answer;
      });

      // Validar y guardar el examen
      const response = await fetch(`${API_URL}/validate-and-save-exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          examType: 'errores',
          questions: formattedQuestions,
          userAnswers: userAnswersArray,
          selectedAnswers: selectedAnswers,
          timeUsed,
          totalTime
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al procesar el examen');
      }

      // Limpiar localStorage
      localStorage.removeItem('errorQuestions');
      
      // Limpiar estados
      setShowFinalizePopup(false);
      setIsFinishing(false);
      
      // Navegar al dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Error:', error);
      setIsFinishing(false);
      alert('Error al finalizar el examen. Por favor, inténtalo de nuevo.');
    }
  };
  
  const handleFinalizeClick = () => {
    setShowFinalizePopup(true);
  };
  
  const handleCancelFinish = () => {
    setShowFinalizePopup(false);
  };
  
  const handlePause = async () => {
    try {
      if (!userId) {
        alert('No se identificó al usuario');
        return;
      }

      // Formatear preguntas para el backend
      const formattedQuestions = questions.map(q => ({
        _id: q._id,
        question: q.question || '',
        option_1: q.option_1 || q.options?.[0] || '',
        option_2: q.option_2 || q.options?.[1] || '',
        option_3: q.option_3 || q.options?.[2] || '',
        option_4: q.option_4 || q.options?.[3] || '',
        answer: q.answer || '',
        subject: q.subject || 'General'
      }));
      
      // Convertir selectedAnswers de objeto a array
      const userAnswersArray = new Array(questions.length).fill(null);
      Object.entries(selectedAnswers).forEach(([index, answer]) => {
        userAnswersArray[parseInt(index)] = answer;
      });

        const response = await fetch(`${API_URL}/save-exam-progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          type: 'errores',
          questions: formattedQuestions,
          userAnswers: userAnswersArray,
          selectedAnswers: selectedAnswers,
          timeLeft,
          currentQuestion,
          timeUsed: totalTime - timeLeft,
          totalTime,
          completed: false,
          status: 'paused'
        })
      });

      if (!response.ok) throw new Error('Error al guardar progreso');

      setPaused(true);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error:', error);
      alert('Error al pausar el examen');
    }
  };
  
  if (failedQuestions.length === 0 && unansweredQuestions.length === 0) {
    return (
      <div className="errores-container">
        <div className="popup-overlay">
          <div className="popup popup-no-questions">
            <h2>¡Aún no hay preguntas para repasar!</h2>
            <p>Para utilizar este modo, necesitas:</p>
            <ul>
              <li>Haber completado al menos un examen</li>
              <li>Tener preguntas falladas o sin contestar en tu historial</li>
            </ul>
            <p>Realiza algunos exámenes y vuelve cuando tengas preguntas para repasar.</p>
            <div className="popup-buttons">
              <button onClick={() => navigate('/dashboard')} className="control-btn">
                Volver al Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="error-container">
        <h2>Error al cargar preguntas</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/dashboard')} className="control-btn">
          Volver al Dashboard
        </button>
      </div>
    );
  }
  
  return (
    <div className="errores-container">
      <AnimatePresence>
        {showStartPopup && (
          <motion.div 
            className="popup-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="popup modern-popup"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              style={{ maxHeight: '90vh', overflowY: 'auto' }}
            >
              <div className="popup-header">
                <h2>Examen de Errores</h2>
                <button 
                  className="popup-close-btn" 
                  onClick={() => navigate('/dashboard')}
                  aria-label="Cerrar"
                >
                  ×
                </button>
              </div>
              
              {Object.keys(failedBySubject).length === 0 && unansweredQuestions.length === 0 ? (
                <div className="popup-no-questions">
                  <div className="empty-state-icon">📝</div>
                  <p>No tienes preguntas falladas o sin responder para practicar.</p>
                  <ul>
                    <li>Completa algunos exámenes para generar preguntas falladas.</li>
                    <li>O deja algunas preguntas sin responder para practicarlas después.</li>
                  </ul>
                  <div className="popup-buttons">
                    <motion.button 
                      onClick={() => navigate('/dashboard')} 
                      className="control-btn"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Volver al Dashboard
                    </motion.button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="stats-container">
                    <div className="stat-item">
                      <span className="stat-label">Preguntas falladas:</span>
                      <span className="stat-value">{failedQuestions.length}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Preguntas sin responder:</span>
                      <span className="stat-value">{unansweredQuestions.length}</span>
                    </div>
                  </div>
                  
                  <div className="mode-selector">
                    <h3>Tipo de examen:</h3>
                    <div className="mode-buttons">
                      <motion.button 
                        className={`mode-btn ${examMode === 'mixed' ? 'active' : ''}`}
                        onClick={() => handleModeChange('mixed')}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Mixto
                      </motion.button>
                      <motion.button 
                        className={`mode-btn ${examMode === 'failed' ? 'active' : ''}`}
                        onClick={() => handleModeChange('failed')}
                        disabled={failedQuestions.length === 0}
                        whileHover={failedQuestions.length > 0 ? { scale: 1.05 } : {}}
                        whileTap={failedQuestions.length > 0 ? { scale: 0.95 } : {}}
                      >
                        Solo falladas
                      </motion.button>
                      <motion.button 
                        className={`mode-btn ${examMode === 'unanswered' ? 'active' : ''}`}
                        onClick={() => handleModeChange('unanswered')}
                        disabled={unansweredQuestions.length === 0}
                        whileHover={unansweredQuestions.length > 0 ? { scale: 1.05 } : {}}
                        whileTap={unansweredQuestions.length > 0 ? { scale: 0.95 } : {}}
                      >
                        Solo sin responder
                      </motion.button>
                    </div>
                  </div>
                  
                  {examMode === 'failed' && (
                    <motion.div 
                      className="subject-selector"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <h3>Filtrar por asignaturas:</h3>
                      <div className="subject-selector-buttons">
                        <motion.button 
                          onClick={handleSelectAllSubjects} 
                          className="select-all-btn"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Seleccionar todas
                        </motion.button>
                        <motion.button 
                          onClick={handleDeselectAllSubjects} 
                          className="deselect-all-btn"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Deseleccionar todas
                        </motion.button>
                      </div>
                      <div className="subject-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {Object.keys(failedBySubject).map(subject => (
                          <label key={subject} className="subject-item">
                            <input 
                              type="checkbox"
                              checked={selectedSubjects.includes(subject)}
                              onChange={() => handleSubjectToggle(subject)}
                            />
                            <span className="subject-name">{subject}</span>
                            <span className="subject-count">({failedBySubject[subject].length})</span>
                          </label>
                        ))}
                      </div>
                    </motion.div>
                  )}
                  
                  <div className="question-selector">
                    <label htmlFor="questionCount">Número de preguntas (máx. 30):</label>
                    <select 
                      id="questionCount" 
                      value={selectedQuestionCount} 
                      onChange={handleQuestionCountChange}
                    >
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="30">30</option>
                      {/* Opción dinámica para todas las preguntas disponibles, pero máximo 30 */}
                      <option value={Math.min(30, 
                        examMode === 'failed' ? failedQuestions.length :
                        examMode === 'unanswered' ? unansweredQuestions.length :
                        failedQuestions.length + unansweredQuestions.length
                      )}>
                        Todas disponibles (máx. 30)
                      </option>
                    </select>
                  </div>
                  
                  <div className="time-info">
                    <div className="time-icon">⏱️</div>
                    <div>
                      <p>Tiempo asignado: <strong>{formatTime(timeAssigned)}</strong></p>
                      <small>Basado en 1.29 minutos por pregunta</small>
                    </div>
                  </div>
                  
                  <div className="popup-buttons">
                    <motion.button 
                      onClick={() => navigate('/dashboard')} 
                      className="control-btn cancel-btn"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Cancelar
                    </motion.button>
                    <motion.button 
                      onClick={handleStartExam} 
                      className="control-btn start-btn"
                      disabled={
                        (examMode === 'failed' && failedQuestions.length === 0) ||
                        (examMode === 'unanswered' && unansweredQuestions.length === 0) ||
                        (examMode === 'mixed' && failedQuestions.length + unansweredQuestions.length === 0) ||
                        (examMode === 'failed' && selectedSubjects.length === 0)
                      }
                      whileHover={{
                        scale: 1.05,
                        boxShadow: '0 5px 15px rgba(126, 160, 167, 0.4)'
                      }}
                      whileTap={{ scale: 0.95 }}
                    >
                      ¡Comenzar!
                    </motion.button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isDisputing && (
          <motion.div 
            className="popup-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="modal modern-modal"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              style={{ maxHeight: '90vh', overflowY: 'auto' }}
            >
              <div className="modal-header">
                <h3>Impugnar Pregunta</h3>
                <motion.button 
                  className="modal-close-button"
                  onClick={() => {
                    setIsDisputing(false);
                    setDisputeReason('');
                  }}
                  whileHover={{ scale: 1.1, backgroundColor: '#ff3333' }}
                  whileTap={{ scale: 0.9 }}
                >
                  ×
                </motion.button>
              </div>
              
              <div className="modal-content">
                <p className="modal-description">Por favor, explica detalladamente por qué consideras que esta pregunta debería ser impugnada:</p>
                <textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Escribe tu razón para impugnar"
                  rows="5"
                  className="dispute-textarea"
                ></textarea>
              </div>
              
              <div className="modal-actions">
                <motion.button
                  onClick={() => {
                    setIsDisputing(false);
                    setDisputeReason('');
                  }}
                  className="cancel-dispute-btn"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Cancelar
                </motion.button>
                <motion.button
                  onClick={async () => {
                    await handleDisputeSubmit(currentQuestion);
                    setIsDisputing(false);
                    setDisputeReason("");
                  }}
                  className="submit-dispute-btn"
                  disabled={!disputeReason.trim()}
                  whileHover={disputeReason.trim() ? { scale: 1.05, boxShadow: '0 5px 15px rgba(126, 160, 167, 0.4)' } : {}}
                  whileTap={disputeReason.trim() ? { scale: 0.95 } : {}}
                >
                  Enviar Impugnación
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showFinalizePopup && (
          <motion.div 
            className="popup-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="popup modern-popup finalize-popup"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              style={{ maxHeight: '90vh', overflowY: 'auto' }}
            >
              <div className="popup-header">
                <h2>¿Finalizar el examen?</h2>
              </div>
              
              <div className="finalize-content">
                <div className="progress-indicator">
                  <div 
                    className="progress-bar" 
                    style={{ width: `${(Object.keys(selectedAnswers).length / questions.length) * 100}%` }}
                  ></div>
                </div>
                <p className="questions-status">
                  Has respondido <strong>{Object.keys(selectedAnswers).length}</strong> de <strong>{questions.length}</strong> preguntas
                  {Object.keys(selectedAnswers).length < questions.length && 
                    <span className="warning-text"> (Hay preguntas sin responder)</span>}
                </p>
                
                {Object.keys(selectedAnswers).length < questions.length && (
                  <div className="warning-message">
                    <span className="warning-icon">⚠️</span>
                    <p>Las preguntas sin responder se marcarán como incorrectas.</p>
                  </div>
                )}
              </div>
              
              <div className="popup-buttons">
                <motion.button 
                  onClick={handleCancelFinish} 
                  className="control-btn cancel-btn" 
                  disabled={isFinishing}
                  whileHover={!isFinishing ? { scale: 1.05 } : {}}
                  whileTap={!isFinishing ? { scale: 0.95 } : {}}
                >
                  Continuar revisando
                </motion.button>
                <motion.button 
                  onClick={confirmFinalize} 
                  className="control-btn finalize-btn" 
                  disabled={isFinishing}
                  whileHover={!isFinishing ? { 
                    scale: 1.05,
                    boxShadow: '0 5px 15px rgba(126, 160, 167, 0.4)'
                  } : {}}
                  whileTap={!isFinishing ? { scale: 0.95 } : {}}
                >
                  {isFinishing ? (
                    <>
                      <span className="loading-spinner-small"></span>
                      <span>Procesando...</span>
                    </>
                  ) : (
                    'Finalizar examen'
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

export default Errores;