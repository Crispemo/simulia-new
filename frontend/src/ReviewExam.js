import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ReviewView from './views/exam/review';

function ReviewExam() {
  const { examId } = useParams();
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
  }, []);

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

  return (
    <ReviewView
      examId={examId}
      toggleDarkMode={toggleDarkMode}
      isDarkMode={isDarkMode}
    />
  );
}

export default ReviewExam;