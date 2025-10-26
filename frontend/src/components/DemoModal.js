import React, { useState, useEffect } from 'react';
import './DemoModal.css';
import QuestionBox from './QuestionBox';
import { API_URL } from '../config';

const DemoModal = ({ isOpen, onClose }) => {
  const [selectedMode, setSelectedMode] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutos para ambos modos
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Timer para ambos modos (5 minutos)
  useEffect(() => {
    let timer;
    if (isStarted && timeLeft > 0 && !isFinished) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleFinishExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isStarted, timeLeft, isFinished]);

  const handleModeSelection = async (mode) => {
    setSelectedMode(mode);
    setIsLoading(true);
    setError(null);
    
    try {
      let questions = [];
      
      if (mode === 'contrarreloj') {
        // Usar la ruta de contrarreloj
        const response = await fetch(`${API_URL}/random-question-completos`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            count: 10, // 10 preguntas para la demo
            examType: 'contrarreloj',
            userId: 'demo_user' // Usuario demo
          })
        });

        if (!response.ok) {
          throw new Error(`Error del servidor: ${response.status}`);
        }

        const data = await response.json();
        console.log('Datos recibidos de contrarreloj:', data);
        console.log('Número de preguntas recibidas:', data.length);
        questions = data.slice(0, 10); // Tomar solo 10 preguntas
        console.log('Preguntas seleccionadas:', questions.length);
      } else if (mode === 'protocolos') {
        // Usar la ruta de protocolos
        const response = await fetch(`${API_URL}/random-questions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            examType: 'protocolos',
            count: 10,
            userId: 'demo_user' // Usuario demo
          })
        });

        if (!response.ok) {
          throw new Error(`Error del servidor: ${response.status}`);
        }

        const data = await response.json();
        console.log('Datos recibidos de protocolos:', data);
        console.log('Número de preguntas recibidas:', data.length);
        questions = data.slice(0, 10); // Tomar solo 10 preguntas
        console.log('Preguntas seleccionadas:', questions.length);
      }

      // Procesar las preguntas para el formato esperado
      const processedQuestions = questions.map((q, index) => {
        // Validar que la pregunta tenga el formato correcto
        if (!q || typeof q !== 'object') {
          console.warn(`Pregunta inválida en índice ${index}:`, q);
          return null;
        }

        // Obtener opciones originales
        const originalOptions = [
          q.option_1,
          q.option_2,
          q.option_3,
          q.option_4,
          q.option_5
        ];
        
        // Filtrar opciones válidas
        const validOptions = originalOptions.filter(isValidOption).map(o => String(o).trim());
        
        const correctAnswerIndex = getCorrectAnswerIndex(q.answer || q.correct_answer, originalOptions);
        
        // Debug: Verificar que la respuesta correcta sea válida
        if (correctAnswerIndex >= validOptions.length) {
          console.warn(`Pregunta ${index + 1}: Respuesta correcta fuera de rango. Original: ${q.answer || q.correct_answer}, Calculado: ${correctAnswerIndex}, Opciones válidas: ${validOptions.length}`);
        }
        
        return {
          id: q._id || index + 1,
          question: q.question || '',
          options: validOptions,
          correctAnswer: correctAnswerIndex,
          explanation: q.long_answer || 'Explicación no disponible',
          subject: q.subject || 'General',
          image: q.image || null
        };
      }).filter(q => q !== null); // Filtrar preguntas nulas

      // Validar que tenemos suficientes preguntas
      if (processedQuestions.length < 5) {
        throw new Error(`Solo se obtuvieron ${processedQuestions.length} preguntas válidas. Se necesitan al menos 5.`);
      }

      setQuestions(processedQuestions);
      setTimeLeft(300); // 5 minutos
      setCurrentQuestion(0);
      setUserAnswers({});
      setIsStarted(false);
      setIsFinished(false);
      setShowResults(false);
      setIsLoading(false);
    } catch (err) {
      console.error('Error al cargar preguntas:', err);
      setError(err.message);
      setIsLoading(false);
    }
  };

  // Función para convertir la respuesta correcta a índice
  const getCorrectAnswerIndex = (answer, originalOptions) => {
    if (answer === null || answer === undefined) return 0;

    // Normalizar valor de respuesta: puede venir como 'A'..'E', '1'..'5' o número 1..5
    let originalIndex = 0;
    if (typeof answer === 'number') {
      originalIndex = Math.max(0, Math.min(4, Number(answer) - 1));
    } else if (typeof answer === 'string') {
      const trimmed = answer.trim();
      // Si es dígito '1'..'5'
      if (/^[1-5]$/.test(trimmed)) {
        originalIndex = Number(trimmed) - 1;
      } else {
        const answerMap = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4 };
        originalIndex = answerMap[trimmed.toUpperCase()] ?? 0;
      }
    }

    // Si no hay opciones originales, devolver el índice calculado tal cual
    if (!originalOptions || !Array.isArray(originalOptions)) return originalIndex;

    // Ajustar índice después del filtrado de opciones inválidas
    let validIndex = 0;
    for (let i = 0; i < originalOptions.length; i++) {
      const option = originalOptions[i];
      const isValid = isValidOption(option);
      if (isValid) {
        if (i === originalIndex) {
          return validIndex;
        }
        validIndex++;
      }
    }

    // Fallback: si la opción correcta fue filtrada (p.ej. era '-')
    return 0;
  };

  // Validador seguro de opciones (soporta no-cadenas)
  const isValidOption = (option) => {
    if (option === null || option === undefined) return false;
    const text = String(option).trim();
    if (text === '' || text === '-') return false;
    if (text.toUpperCase() === 'N/A') return false;
    if (text.toLowerCase() === 'null') return false;
    return true;
  };

  const handleStartExam = () => {
    setIsStarted(true);
  };

  const handleAnswerClick = (answerIndex) => {
    if (isFinished) return;

    setUserAnswers(prev => {
      const currentlySelected = prev[currentQuestion];
      // Si se hace clic de nuevo en la misma opción, desmarcar
      if (currentlySelected === answerIndex) {
        const updated = { ...prev };
        delete updated[currentQuestion];
        return updated;
      }
      // En caso contrario, marcar la nueva opción
      return {
        ...prev,
        [currentQuestion]: answerIndex
      };
    });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      handleFinishExam();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleFinishExam = () => {
    setIsFinished(true);
    calculateScore();
    setShowResults(true);
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((question, index) => {
      if (userAnswers[index] === question.correctAnswer) {
        correct++;
      }
    });
    setScore(correct);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const resetDemo = () => {
    setSelectedMode(null);
    setQuestions([]);
    setCurrentQuestion(0);
    setUserAnswers({});
    setTimeLeft(300);
    setIsStarted(false);
    setIsFinished(false);
    setShowResults(false);
    setScore(0);
    setError(null);
    setIsLoading(false);
  };

  const closeModal = () => {
    resetDemo();
    onClose();
  };

  const scrollToPricing = () => {
    closeModal();
    setTimeout(() => {
      const pricingSection = document.querySelector('.pricing-section');
      if (pricingSection) {
        pricingSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div className="demo-modal-overlay">
      <div className="demo-modal">
        {!selectedMode && (
          <div className="demo-mode-selection">
            <div className="demo-header">
              <h2>Prueba Simulia</h2>
              <p>Elige una modalidad para experimentar cómo funciona nuestra plataforma</p>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>
            
            <div className="demo-modes">
              <div 
                className="demo-mode-card"
                onClick={() => handleModeSelection('contrarreloj')}
              >
                <div className="mode-icon">⏱️</div>
                <h3>Contrarreloj</h3>
                <p>10 preguntas en 5 minutos</p>
                <p className="mode-description">Ponte a prueba con límite de tiempo</p>
              </div>
              
              <div 
                className="demo-mode-card"
                onClick={() => handleModeSelection('protocolos')}
              >
                <div className="mode-icon">📋</div>
                <h3>Protocolos Clínicos</h3>
                <p>10 preguntas en 5 minutos</p>
                <p className="mode-description">Preguntas basadas en protocolos actualizados</p>
              </div>
            </div>
          </div>
        )}

        {selectedMode && !isStarted && !isLoading && !error && (
          <div className="demo-start-screen">
            <div className="demo-header">
              <h2>Demo: {selectedMode === 'contrarreloj' ? 'Contrarreloj' : 'Protocolos Clínicos'}</h2>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>
            
            <div className="demo-instructions">
              <h3>Instrucciones:</h3>
              <ul>
                <li>Tienes 5 minutos para completar 10 preguntas</li>
                <li>Selecciona la respuesta que consideres correcta</li>
                <li>El tiempo se agotará automáticamente</li>
                <li>Al final verás tu puntuación y las explicaciones detalladas</li>
                <li>Esta es una experiencia real de lo que encontrarás en Simulia</li>
              </ul>
              
              <div className="demo-stats">
                <div className="stat">
                  <span className="stat-number">{questions.length}</span>
                  <span className="stat-label">Preguntas</span>
                </div>
                <div className="stat">
                  <span className="stat-number">5 min</span>
                  <span className="stat-label">Tiempo</span>
                </div>
              </div>
            </div>
            
            <div className="demo-actions">
              <button className="demo-btn-secondary" onClick={() => setSelectedMode(null)}>
                Volver
              </button>
              <button className="demo-btn-primary" onClick={handleStartExam}>
                Comenzar Demo
              </button>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="demo-loading">
            <div className="loading-spinner"></div>
            <h3>Cargando preguntas...</h3>
            <p>Preparando tu experiencia de demo</p>
            <button className="demo-btn-secondary" onClick={closeModal}>
              Cancelar
            </button>
          </div>
        )}

        {error && (
          <div className="demo-error">
            <h3>Error al cargar las preguntas</h3>
            <p>{error}</p>
            <div className="demo-actions">
              <button className="demo-btn-secondary" onClick={() => setSelectedMode(null)}>
                Volver
              </button>
              <button className="demo-btn-primary" onClick={() => handleModeSelection(selectedMode)}>
                Reintentar
              </button>
            </div>
          </div>
        )}

        {isStarted && !showResults && (
          <div className="demo-exam-screen">
            <div className="demo-exam-header">
              <div className="demo-exam-info">
                <h3>Demo: {selectedMode === 'contrarreloj' ? 'Contrarreloj' : 'Protocolos'}</h3>
                <span className="question-counter">
                  {currentQuestion + 1} de {questions.length}
                </span>
              </div>
              
              <div className="demo-timer">
                <span className="timer-text">Tiempo restante:</span>
                <span className={`timer-value ${timeLeft < 60 ? 'warning' : ''}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>

            <div className="demo-question-container">
              <div className="demo-question">
                <h3>Pregunta {currentQuestion + 1} de {questions.length}</h3>
                <p className="question-text">{questions[currentQuestion]?.question}</p>
                
                <div className="demo-options">
                  {questions[currentQuestion]?.options.map((option, index) => (
                    <button
                      key={index}
                      className={`demo-option ${
                        userAnswers[currentQuestion] === index ? 'selected' : ''
                      }`}
                      onClick={() => handleAnswerClick(index)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="demo-navigation">
              <button 
                className="demo-nav-btn"
                onClick={handlePrevious}
                disabled={currentQuestion === 0}
              >
                ← Anterior
              </button>
              
              <div className="demo-progress">
                {questions.map((_, index) => (
                  <div 
                    key={index}
                    className={`progress-dot ${index === currentQuestion ? 'active' : ''} ${userAnswers[index] !== undefined ? 'answered' : ''}`}
                  />
                ))}
              </div>
              
              <button 
                className="demo-nav-btn"
                onClick={currentQuestion === questions.length - 1 ? handleFinishExam : handleNext}
              >
                {currentQuestion === questions.length - 1 ? 'Finalizar' : 'Siguiente →'}
              </button>
            </div>
          </div>
        )}

        {showResults && (
          <div className="demo-results-screen">
            <div className="demo-header">
              <h2>¡Demo Completada!</h2>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>
            
            <div className="demo-results">
              <div className="score-display">
                <div className="score-circle">
                  <span className="score-number">{score}</span>
                  <span className="score-total">/ {questions.length}</span>
                </div>
                <h3>Puntuación: {Math.round((score / questions.length) * 100)}%</h3>
                <p className="score-description">
                  {score === questions.length ? '¡Perfecto! 🎉' : 
                   score >= questions.length * 0.8 ? '¡Muy bien! 👏' : 
                   score >= questions.length * 0.6 ? 'Bien hecho 👍' : 
                   'Sigue practicando 💪'}
                </p>
              </div>
              
              <div className="results-breakdown">
                <h4>Revisión de respuestas:</h4>
                {questions.map((question, index) => {
                  const userAnswer = userAnswers[index];
                  const isCorrect = userAnswer === question.correctAnswer;
                  
                  return (
                    <div key={question.id} className="result-item">
                      <div className="result-question">
                        <span className="question-number">{index + 1}.</span>
                        <span className="question-text">{question.question}</span>
                        <span className={`result-status ${isCorrect ? 'correct' : 'incorrect'}`}>
                          {isCorrect ? '✓' : '✗'}
                        </span>
                      </div>
                      
                      <div className="result-options">
                        {question.options.map((option, optionIndex) => (
                          <div 
                            key={optionIndex}
                            className={`result-option ${
                              optionIndex === question.correctAnswer ? 'correct-answer' : ''
                            } ${
                              userAnswer === optionIndex ? 'user-answer' : ''
                            }`}
                          >
                            {option}
                          </div>
                        ))}
                      </div>
                      
                      <div className="result-explanation">
                        <strong>Explicación:</strong> {question.explanation}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="demo-actions">
              <button className="demo-btn-secondary" onClick={resetDemo}>
                Probar otra modalidad
              </button>
              <button className="demo-btn-primary" onClick={scrollToPricing}>
                Quiero formar parte de Simulia
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DemoModal;