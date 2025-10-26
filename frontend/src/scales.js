import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const Scales = ({ userId }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scales, setScales] = useState([]);
  const [selectedScale, setSelectedScale] = useState(null);
  const [numQuestions, setNumQuestions] = useState(10);

  useEffect(() => {
    fetchScales();
  }, []);

  const fetchScales = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/scales`);
      setScales(response.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching scales:', error);
      setError('Error al cargar las escalas');
      setIsLoading(false);
    }
  };

  const handleStartExam = () => {
    if (!selectedScale) {
      toast.error('Por favor, selecciona una escala');
      return;
    }

    if (numQuestions < 1 || numQuestions > 30) {
      toast.error('El número de preguntas debe estar entre 1 y 30');
      return;
    }

    // Guardar configuración en localStorage
    const examConfig = {
      type: 'escalas',
      scaleId: selectedScale,
      numQuestions: numQuestions,
      tiempoAsignado: numQuestions * 60 // 1 minuto por pregunta
    };

    localStorage.setItem('scalesConfig', JSON.stringify(examConfig));

    // Navegar al examen
    navigate('/exam', {
      state: {
        examType: 'scales',
        config: examConfig
      }
    });
  };

  if (isLoading) {
    return <div className="loading">Cargando escalas...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="scales-container">
      <h2>Examen de Escalas</h2>
      <div className="scales-form">
        <div className="form-group">
          <label>Selecciona una escala:</label>
          <select
            value={selectedScale || ''}
            onChange={(e) => setSelectedScale(e.target.value)}
            className="scale-select"
          >
            <option value="">Selecciona una escala</option>
            {scales.map((scale) => (
              <option key={scale._id} value={scale._id}>
                {scale.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Número de preguntas:</label>
          <input
            type="number"
            min="1"
            max="30"
            value={numQuestions}
            onChange={(e) => setNumQuestions(parseInt(e.target.value))}
            className="num-questions-input"
          />
        </div>

        <button
          className="start-exam-btn"
          onClick={handleStartExam}
          disabled={!selectedScale}
        >
          Comenzar Examen
        </button>
      </div>
    </div>
  );
};

export default Scales; 