import React, { useState, useEffect } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { API_URL } from '../config';
import './FlashcardModal.css';

const FlashcardModal = ({ isOpen, onClose, userId, isDarkMode }) => {
  const [question, setQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cargar pregunta cuando se abre el modal
  useEffect(() => {
    if (isOpen && userId) {
      loadQuestion();
    }
  }, [isOpen, userId]);

  const loadQuestion = async () => {
    try {
      setLoading(true);
      setError(null);
      setSelectedAnswer(null);
      setShowAnswer(false);

      const response = await fetch(`${API_URL}/flashcards/daily/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Error al cargar la pregunta');
      }

      const data = await response.json();

      if (data.question) {
        setQuestion(data.question);
      } else {
        setQuestion(null);
        setError(data.message || 'No hay preguntas disponibles');
      }
    } catch (err) {
      console.error('Error al cargar pregunta:', err);
      setError('Error al cargar la pregunta. Inténtalo de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (index) => {
    if (showAnswer) return; // No permitir cambiar respuesta después de mostrar la correcta
    setSelectedAnswer(index);
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  const handleNext = () => {
    loadQuestion();
  };

  const handleClose = () => {
    setQuestion(null);
    setSelectedAnswer(null);
    setShowAnswer(false);
    setError(null);
    onClose();
  };

  const getAnswerLetter = (index) => {
    return String.fromCharCode(65 + index); // A, B, C, D, E
  };

  const isCorrect = (index) => {
    if (!showAnswer || selectedAnswer === null) return false;
    const answerLetter = getAnswerLetter(index);
    const correctAnswer = question.answer;
    return answerLetter === correctAnswer || (index + 1).toString() === correctAnswer;
  };

  const isSelected = (index) => {
    return selectedAnswer === index;
  };

  if (!isOpen) return null;

  return (
    <div className={`flashcard-modal-overlay ${isDarkMode ? 'dark' : ''}`} onClick={handleClose}>
      <div className="flashcard-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flashcard-modal-header">
          <h2>📚 Pregunta de Repaso</h2>
          {question && (
            <span className="flashcard-source-badge">
              {question.source === 'errors' ? '📝 Desde tus errores' : '❓ Sin contestar'}
            </span>
          )}
          <button className="flashcard-close-btn" onClick={handleClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="flashcard-modal-body">
          {loading ? (
            <div className="flashcard-loading">
              <div className="flashcard-spinner"></div>
              <p>Cargando pregunta...</p>
            </div>
          ) : error ? (
            <div className="flashcard-error">
              <p>{error}</p>
            </div>
          ) : question ? (
            <>
              <div className="flashcard-question-container">
                {question.subject && (
                  <div className="flashcard-subject-badge">
                    {question.subject}
                  </div>
                )}
                
                <div className="flashcard-question-text">
                  {question.question}
                </div>

                {question.image && (
                  <div className="flashcard-image-container">
                    <img 
                      src={question.image} 
                      alt="Imagen de la pregunta" 
                      className="flashcard-question-image"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <div className="flashcard-options">
                  {question.options.map((option, index) => {
                    const letter = getAnswerLetter(index);
                    const correct = isCorrect(index);
                    const selected = isSelected(index);
                    const showCorrect = showAnswer && correct;
                    const showIncorrect = showAnswer && selected && !correct;

                    return (
                      <button
                        key={index}
                        className={`flashcard-option ${selected ? 'selected' : ''} ${showCorrect ? 'correct' : ''} ${showIncorrect ? 'incorrect' : ''}`}
                        onClick={() => handleSelectAnswer(index)}
                        disabled={showAnswer}
                      >
                        <span className="flashcard-option-letter">{letter}.</span>
                        <span className="flashcard-option-text">{option}</span>
                        {showCorrect && <span className="flashcard-option-check">✓</span>}
                        {showIncorrect && <span className="flashcard-option-cross">✗</span>}
                      </button>
                    );
                  })}
                </div>

                {showAnswer && question.long_answer && (
                  <div className="flashcard-explanation">
                    <h4>Explicación:</h4>
                    <p>{question.long_answer}</p>
                  </div>
                )}
              </div>

              <div className="flashcard-actions">
                {!showAnswer ? (
                  <button
                    className="flashcard-action-btn flashcard-btn-show"
                    onClick={handleShowAnswer}
                    disabled={selectedAnswer === null}
                  >
                    Ver respuesta
                  </button>
                ) : (
                  <button
                    className="flashcard-action-btn flashcard-btn-next"
                    onClick={handleNext}
                  >
                    <ArrowRight size={18} />
                    <span>Siguiente pregunta</span>
                  </button>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default FlashcardModal;
