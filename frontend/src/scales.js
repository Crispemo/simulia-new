import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const Scales = ({ userId }) => {
  const navigate = useNavigate();
  const [numQuestions, setNumQuestions] = useState(10);

  const tiempoAsignado = numQuestions * 60;
  const minutos = Math.floor(tiempoAsignado / 60);

  const handleStartExam = () => {
    if (numQuestions < 1 || numQuestions > 30) {
      toast.error('El número de preguntas debe estar entre 1 y 30');
      return;
    }

    navigate('/escalas', {
      state: {
        examType: 'escalas',
        numQuestions: numQuestions
      }
    });
  };

  return (
    <div className="scales-container">
      <h2>Examen de Escalas</h2>
      <div className="scales-form">
        <div className="form-group">
          <label>Número de preguntas (1-30):</label>
          <input
            type="number"
            min="1"
            max="30"
            value={numQuestions}
            onChange={(e) => setNumQuestions(parseInt(e.target.value) || 1)}
            className="num-questions-input"
          />
        </div>

        <div className="form-group">
          <label>Tiempo asignado:</label>
          <p style={{ margin: 0, fontWeight: '600', color: '#3f5056', fontSize: '1rem' }}>
            {minutos} minuto{minutos !== 1 ? 's' : ''} (1 min por pregunta)
          </p>
        </div>

        <button
          className="start-exam-btn"
          onClick={handleStartExam}
          disabled={numQuestions < 1 || numQuestions > 30}
        >
          Comenzar Examen
        </button>
      </div>
    </div>
  );
};

export default Scales;
