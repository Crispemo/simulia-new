import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { API_URL } from './config';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const ProgressChart = () => {
  const [subjectProgress, setSubjectProgress] = useState([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const userId = localStorage.getItem('userId');
        const response = await fetch(`${API_URL}/user-progress/${userId}`);
        if (!response.ok) throw new Error('Error fetching progress');
        const data = await response.json();
        setSubjectProgress(data);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchProgress();
  }, []);

  const subjects = [
    'Anatomía',
    'Fisiología',
    'Farmacología',
    'Nutrición',
    'Pediatría',
    'Geriatría',
    'Salud Mental',
    'Fundamentos',
    'Médico-Quirúrgica',
    'Administración',
    'Investigación',
    'Comunitaria',
    'Materno-Infantil',
    'Ética',
    'Legislación'
  ];

  const sortedData = [...subjectProgress]
    .sort((a, b) => b.progress - a.progress);

  const displayData = showAll ? sortedData : sortedData.slice(0, 10);

  const chartData = {
    labels: displayData.map(item => item.subject),
    datasets: [
      {
        label: 'Progreso por Asignatura (%)',
        data: displayData.map(item => item.progress),
        backgroundColor: displayData.map(
          (_, index) => `hsla(${index * (360 / displayData.length)}, 70%, 60%, 0.8)`
        ),
        borderColor: displayData.map(
          (_, index) => `hsla(${index * (360 / displayData.length)}, 70%, 50%, 1)`
        ),
        borderWidth: 1,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const item = displayData[context.dataIndex];
            return [
              `Progreso: ${item.progress.toFixed(1)}%`,
              `Aciertos: ${item.correct}`,
              `Total intentos: ${item.totalAttempts}`
            ];
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: (value) => `${value}%`
        }
      },
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 45
        }
      }
    }
  };

  return (
    <div className="w-full p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold dark:text-white">
          {showAll ? 'Progreso Completo por Asignaturas' : 'Top 10 Asignaturas'}
        </h2>
        <button
          onClick={() => setShowAll(!showAll)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          {showAll ? 'Mostrar Top 10' : 'Ver Todas'}
        </button>
      </div>
      
      <div className="h-96">
        <Bar data={chartData} options={options} />
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {displayData.map((subject, index) => (
          <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="font-semibold text-sm mb-1">{subject.subject}</h3>
            <div className="text-xs space-y-1">
              <p>Progreso: {subject.progress.toFixed(1)}%</p>
              <p>Aciertos: {subject.correct}</p>
              <p>Total intentos: {subject.totalAttempts}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgressChart;