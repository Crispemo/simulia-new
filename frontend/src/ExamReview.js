import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import './Exam.css';

// Función de utilidad para extraer long_answer de diferentes estructuras
const getLongAnswer = (question) => {
  if (!question) return null;
  
  // Casos posibles: directamente en question, en questionData, o en userAnswers
  if (question.long_answer) return question.long_answer;
  if (question.questionData && question.questionData.long_answer) return question.questionData.long_answer;
  
  // Si hay un array de opciones, verificar si alguna es la justificación
  if (question.options && question.options.length > 0) {
    const lastOption = question.options[question.options.length - 1];
    if (lastOption && lastOption.startsWith('Justificación:')) return lastOption.substring('Justificación:'.length).trim();
  }
  
  return null;
};

function Review() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Comprobar el modo oscuro en localStorage
    const savedMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(savedMode);
    
    // Aplicar modo oscuro al body si es necesario
    if (savedMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    
    async function fetchExamData() {
      try {
        const examDocRef = doc(db, "exams", examId);
        const examDocSnap = await getDoc(examDocRef);
        
        if (examDocSnap.exists()) {
          const examData = examDocSnap.data();
          console.log("Datos del examen recuperados:", examData);
          
          // Verificar si hay long_answer en las preguntas
          if (examData.questions && examData.questions.length > 0) {
            console.log("Primera pregunta ejemplo:", examData.questions[0]);
            
            // Contar cuántas preguntas tienen long_answer
            const withLongAnswer = examData.questions.filter(q => q.long_answer).length;
            console.log(`Preguntas con long_answer: ${withLongAnswer} de ${examData.questions.length}`);

            // Verificar en distintas ubicaciones para el campo long_answer
            const formats = {
              directLongAnswer: 0,
              inQuestionData: 0,
              inText: 0
            };

            examData.questions.forEach(q => {
              if (q.long_answer) formats.directLongAnswer++;
              if (q.questionData && q.questionData.long_answer) formats.inQuestionData++;
              if (q.text && q.text.includes('Justificación:')) formats.inText++;
            });

            console.log("Distribución del campo long_answer:", formats);

            // Revisar si hay long_answer en userAnswers
            if (examData.userAnswers && examData.userAnswers.length > 0) {
              const userAnswersWithLongAnswer = examData.userAnswers.filter(
                ua => ua && typeof ua === 'object' && 
                      ((ua.questionData && ua.questionData.long_answer) || ua.long_answer)
              ).length;
              
              console.log(`Respuestas de usuario con long_answer: ${userAnswersWithLongAnswer} de ${examData.userAnswers.length}`);
            }
          }
          
          setExam(examData);
        } else {
          setError("No se encontró el examen");
        }
      } catch (err) {
        console.error("Error completo al cargar el examen:", err);
        setError("Error al cargar el examen: " + err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchExamData();
  }, [examId]);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('darkMode', newMode);
    
    if (newMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < exam.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const goToQuestion = (index) => {
    setCurrentQuestionIndex(index);
  };

  const goToDashboard = () => {
    navigate('/dashboard');
  };

  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!exam) return <div>No se encontró el examen</div>;

  const currentQuestion = exam.questions[currentQuestionIndex];
  console.log("Pregunta actual en revisión:", currentQuestion);
  
  // Buscar long_answer en diferentes ubicaciones
  const longAnswer = getLongAnswer(currentQuestion);
  console.log("Long answer encontrado:", longAnswer ? "SÍ" : "NO");
  
  const userAnswer = exam.userAnswers?.[currentQuestionIndex] || null;

  return (
    <div className="exam-container">
      <div className="exam-header">
        <div className="logo">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo_oscuro-GAc6PSaMMPn1P0PSLfL6RZ6fukqEGj.png"
            alt="Logo"
            width="37"
            height="39"
          />
          <h1>SIMULIA</h1>
        </div>
        
        <div className="time-display">
          Revisión del Examen
        </div>
        
        <button className="control-btn icon-only" onClick={goToDashboard} aria-label="Volver al Dashboard">
          <svg width="18" height="18" viewBox="0 0 24 24" style={{margin: '0'}}>
            <path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
          </svg>
        </button>
      </div>

      <div className="exam-review-info">
        <p>Tipo:{exam.type || 'contrareloj'}</p>
        <p>Fecha:{exam.date ? new Date(exam.date).toLocaleDateString() : '5/4/2025'}</p>
        <p>Aciertos:{exam.correctAnswers || 0}</p>
        <p>Fallos:{exam.wrongAnswers || 2}</p>
        <p>En blanco:{exam.skippedAnswers || ''}</p>
        <p>Puntuación:{exam.score ? exam.score.toFixed(2) : '-0.66'}</p>
      </div>

      <div className="question-box">
        <div className="question-content">
          <h2 className="question-title">
            Pregunta {currentQuestionIndex + 1}
            {currentQuestion.incorrectAnswer ? ' - Incorrecta' : ''}
          </h2>
          <p>{currentQuestion.text || currentQuestion.question}</p>
          
          <div className="options-container">
            {(currentQuestion.options || []).map((option, index) => {
              let className = '';
              
              // Determinar la clase según si es correcta o fue seleccionada
              if (index === currentQuestion.correctAnswer || index === parseInt(currentQuestion.answer) - 1) {
                className = 'selected';
              } else if (userAnswer === index && userAnswer !== currentQuestion.correctAnswer) {
                className = 'incorrect-selected';
              }
              
              return (
                <button
                  key={index}
                  className={className}
                  disabled
                >
                  {option}
                </button>
              );
            })}
          </div>
          
          {/* Suprimido: la justificación se mostrará solo en el bloque inferior coloreado */}
        </div>
        
        <div className="control-buttons-container">
          <div className="navigation-buttons">
            <button 
              className="control-btn" 
              onClick={handlePrevQuestion} 
              disabled={currentQuestionIndex === 0}
            >
              Anterior
            </button>
            <button 
              className="control-btn" 
              onClick={handleNextQuestion}
              disabled={currentQuestionIndex === exam.questions.length - 1}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
      
      <div className="exam-question-index">
        {exam.questions.map((question, index) => {
          // Check if this question is marked as doubt
          const questionUserAnswer = exam.userAnswers && exam.userAnswers[index];
          const isMarkedAsDoubt = questionUserAnswer && 
                                 typeof questionUserAnswer === 'object' && 
                                 questionUserAnswer.markedAsDoubt === true;
          
          return (
            <button
              key={index}
              className={`exam-question-number ${
                index === currentQuestionIndex ? 'active' : ''
              } ${
                exam.userAnswers && exam.userAnswers[index] !== undefined ? 'answered' : ''
              } ${
                isMarkedAsDoubt ? 'doubt' : ''
              }`}
              onClick={() => goToQuestion(index)}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
      
      <button
        className="dark-mode-toggle"
        onClick={toggleDarkMode}
        aria-label={isDarkMode ? "Activar modo claro" : "Activar modo oscuro"}
      >
        {isDarkMode ? "☀️" : "🌙"}
      </button>
    </div>
  );
}

export default Review; 