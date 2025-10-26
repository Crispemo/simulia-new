"use client"

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin, googleLogout, GoogleOAuthProvider } from '@react-oauth/google'; 
import { FaMoon, FaSun, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa'; 
import './Dashboard.css';
import AEleccion from './Aeleccion';
import Contrarreloj from './Contrarreloj';
import { PanelLeft, Menu, X, MessageSquare, Bot, Moon, Sun } from 'lucide-react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import jwtDecode from "jwt-decode"
import ChatBot from "./components/ChatBot"
import Community from "./components/Community"
import TimelineProgress from "./components/TimelineProgress"
import { FiX, FiMenu, FiUsers, FiMessageSquare, FiSun, FiMoon, FiChevronRight, FiChevronLeft } from 'react-icons/fi';
import { API_URL } from './config';
import { useAuth } from './context/AuthContext';
import { toast } from 'react-hot-toast';

function Dashboard({ toggleDarkMode: propToggleDarkMode, isDarkMode, currentUser }) {
  // Feature flags
  const RECURRENCE_ENABLED = false; // Desactiva la funcionalidad de racha/recurrencia
  const navigate = useNavigate();
  const [examData, setExamData] = useState([]);
  const [filteredExams, setFilteredExams] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [profileImage, setProfileImage] = useState('/muñeco_enfermera.png');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [showEleccionPopup, setShowEleccionPopup] = useState(false);
  const [showContrarrelojPopup, setShowContrarrelojPopup] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth <= 768);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const examsPerPage = 6;
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const sidebarRef = useRef(null);
  const { currentUser: authUser, logout } = useAuth();
  const userId = currentUser?.uid || authUser?.uid;
  const [errorsBySubject, setErrorsBySubject] = useState([]);
  const [unansweredQuestions, setUnansweredQuestions] = useState([]);
  // Estado para guardar datos de preguntas sin responder
  const [unansweredStats, setUnansweredStats] = useState({
    totalQuestions: 0,
    bySubject: [],
    markedAsDoubt: 0,
    withLongAnswer: 0
  });

  // Estado para controlar la visibilidad de los componentes de comunidad y chatbot
  const [showChatBot, setShowChatBot] = useState(false)
  const [showCommunity, setShowCommunity] = useState(false);
  // Estado para el popup de avatar
  const [showAvatarPopup, setShowAvatarPopup] = useState(false);
  // Estado para gestionar recurrencia de práctica (desactivado)
  const [showRecurrencePopup, setShowRecurrencePopup] = useState(false);
  const [practicePreferences, setPracticePreferences] = useState({ 
    cadenceDays: 3, 
    emailReminders: true,
    channel: 'email',
    emailOverride: '',
    phoneE164: ''
  });
  const [loadingPracticePrefs, setLoadingPracticePrefs] = useState(false);
  const [savingPracticePrefs, setSavingPracticePrefs] = useState(false);
  // Tutorial modal (primera visita)
  const [showTutorialModal, setShowTutorialModal] = useState(false);

  // Estado para el filtrado y ordenamiento
  const [sortConfig, setSortConfig] = useState({
    key: 'date',
    direction: 'descending'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('summary');
  
  // Configuración de tipos de exámenes
  const examTypes = {
    'simulacro': { questions: 175, timeInSeconds: 4 * 3600, name: 'Simulacro EIR' },
    'quizz': { questions: 50, timeInSeconds: 1800, name: 'Quizz Rápido' },
    'errores': { questions: 30, timeInSeconds: 1800, name: 'Repaso de Errores' },
    'contrarreloj': { questions: 30, timeInSeconds: 900, name: 'Contrarreloj' },
    'protocolos': { questions: 30, timeInSeconds: 1800, name: 'Protocolos' },
    'aeleccion': { questions: 'variable', timeInSeconds: 'variable', name: 'Examen Personalizado' }
  };

  // Después de otras declaraciones de estado, agregar el estado de asignaturas
  const [allSubjects, setAllSubjects] = useState([]);
  
  // Efecto para cargar todas las asignaturas disponibles (después de otros useEffect)
  useEffect(() => {
    const fetchAllSubjects = async () => {
      try {
        const response = await fetch(`${API_URL}/subjects`);
        if (response.ok) {
          const data = await response.json();
          setAllSubjects(data.map(subject => subject.id || subject.nombre));
        }
      } catch (error) {
        console.error("Error al cargar asignaturas:", error);
      }
    };
    
    fetchAllSubjects();
  }, []);

  // Mostrar modal de tutorial la primera vez que el usuario entra al dashboard
  useEffect(() => {
    try {
      if (!userId) return;
      const key = `tutorialSeen_${userId}`;
      const seen = localStorage.getItem(key);
      if (!seen) {
        setShowTutorialModal(true);
      }
    } catch (e) {
      // Si localStorage falla, no bloquear la UI
      console.warn('No se pudo acceder a localStorage para tutorial:', e);
    }
  }, [userId]);

  const closeTutorialModal = () => {
    try {
      if (userId) {
        localStorage.setItem(`tutorialSeen_${userId}`, 'true');
      }
    } catch (e) {
      console.warn('No se pudo guardar el estado del tutorial en localStorage:', e);
    }
    setShowTutorialModal(false);
  };

  const openTutorialModal = () => {
    setShowTutorialModal(true);
  };

  // Cargar preferencias de práctica del usuario (desactivado)
  useEffect(() => {
    if (!RECURRENCE_ENABLED) return;
    const fetchPracticePreferences = async () => {
      if (!userId) return;
      try {
        setLoadingPracticePrefs(true);
        const response = await fetch(`${API_URL}/practice-preferences/${userId}`);
        if (response.ok) {
          const data = await response.json();
          const cadence = parseInt(data?.cadenceDays);
          setPracticePreferences({
            cadenceDays: Number.isFinite(cadence) && cadence > 0 ? cadence : 3,
            emailReminders: Boolean(data?.emailReminders ?? true),
            channel: data?.channel || 'email',
            emailOverride: data?.emailOverride || '',
            phoneE164: data?.phoneE164 || ''
          });
        }
      } catch (err) {
        console.error('Error al cargar preferencias de práctica:', err);
      } finally {
        setLoadingPracticePrefs(false);
      }
    };
    fetchPracticePreferences();
  }, [userId, RECURRENCE_ENABLED]);

  // Fetch failed questions data for the errors chart
  useEffect(() => {
    const fetchErrorData = async () => {
      if (!userId) {
        console.log('No userId disponible para fetchErrorData');
        return;
      }
      
      try {
        console.log(`Obteniendo preguntas falladas para userId: ${userId}`);
        const response = await fetch(`${API_URL}/failed-questions/${userId}`);
        if (!response.ok) {
          console.error('Error al obtener preguntas falladas:', response.status);
          return;
        }
        
        const failedData = await response.json();
        console.log('Datos de preguntas falladas recibidos:', failedData);
        
        // Process the failed questions
        const processedFailedQuestions = failedData.questions ? failedData.questions.map(q => ({
          ...q,
          options: q.options ? q.options.filter(opt => opt && opt !== '-') : 
            [q.option_1, q.option_2, q.option_3, q.option_4, q.option_5]
              .filter(option => option && option !== '-')
        })) : [];
        
        console.log('Preguntas falladas procesadas:', processedFailedQuestions.length);
        
        // Group and count failed questions by subject
        const subjectGroups = {};
        processedFailedQuestions.forEach(question => {
          const subject = question.subject || 'General';
          if (!subjectGroups[subject]) {
            subjectGroups[subject] = 0;
          }
          subjectGroups[subject]++;
        });
        
        console.log('Grupos de asignaturas:', subjectGroups);
        
        // Convert to array format for chart display
        const errorsArray = Object.entries(subjectGroups)
          .map(([name, count]) => ({
            name,
            count
          }))
          .sort((a, b) => b.count - a.count);
        
        console.log('Array de errores por asignatura:', errorsArray);
        setErrorsBySubject(errorsArray);
      } catch (error) {
        console.error('Error al procesar preguntas falladas:', error);
      }
    };
    
    fetchErrorData();

    // Fetch unanswered questions stats and the actual unanswered questions
    const fetchUnansweredStats = async () => {
      if (!userId) return;
      
      try {
        // First fetch the stats
        const statsResponse = await fetch(`${API_URL}/unanswered-stats/${userId}`);
        if (!statsResponse.ok) {
          console.error('Error al obtener estadísticas de preguntas sin responder:', statsResponse.status);
          return;
        }
        
        const stats = await statsResponse.json();
        console.log('Estadísticas de preguntas sin responder:', stats);
        
        setUnansweredStats(stats);
        
        // Then fetch the actual unanswered questions using the same endpoint as in errores.js
        const questionsResponse = await fetch(`${API_URL}/unanswered-questions/${userId}`);
        if (!questionsResponse.ok) {
          console.error('Error al obtener preguntas sin contestar:', questionsResponse.status);
          return;
        }
        
        const questionsData = await questionsResponse.json();
        console.log('Preguntas sin contestar:', questionsData);
        
        // Process questions to ensure they have valid options, similar to errores.js
        const processedUnansweredQuestions = questionsData.questions ? questionsData.questions.map(q => ({
          ...q,
          options: q.options ? q.options.filter(opt => opt && opt !== '-') : 
            [q.option_1, q.option_2, q.option_3, q.option_4, q.option_5]
              .filter(option => option && option !== '-')
        })) : [];
        
        setUnansweredQuestions(processedUnansweredQuestions);
        
        // If there are more questions available than what we received in the first page, fetch more
        const totalAvailable = questionsData.totalAvailable || 0;
        const limit = questionsData.pagination?.limit || 100;
        const totalPages = questionsData.pagination?.totalPages || 1;
        
        if (totalAvailable > processedUnansweredQuestions.length && totalPages > 1) {
          console.log(`Obteniendo ${totalPages - 1} páginas adicionales de preguntas sin contestar...`);
          
          let allUnansweredQuestions = [...processedUnansweredQuestions];
          
          // Start from page 1 (we already have page 0)
          for (let page = 1; page < totalPages; page++) {
            try {
              const nextPageResponse = await fetch(
                `${API_URL}/unanswered-questions/${userId}?page=${page}&limit=${limit}`
              );
              
              if (!nextPageResponse.ok) {
                console.warn(`Error al obtener página ${page} de preguntas no contestadas: ${nextPageResponse.status}`);
                continue;
              }
              
              const nextPageData = await nextPageResponse.json();
              const nextPageQuestions = nextPageData.questions ? nextPageData.questions.map(q => ({
                ...q,
                options: q.options ? q.options.filter(opt => opt && opt !== '-') : 
                  [q.option_1, q.option_2, q.option_3, q.option_4, q.option_5]
                    .filter(option => option && option !== '-')
              })) : [];
              
              allUnansweredQuestions = [...allUnansweredQuestions, ...nextPageQuestions];
              console.log(`Obtenida página ${page}: ${nextPageQuestions.length} preguntas adicionales`);
            } catch (pageError) {
              console.error(`Error al obtener página ${page}:`, pageError);
            }
          }
          
          console.log(`Total de preguntas sin contestar cargadas: ${allUnansweredQuestions.length}/${totalAvailable}`);
          setUnansweredQuestions(allUnansweredQuestions);
        }
      } catch (error) {
        console.error('Error al procesar datos de preguntas sin responder:', error);
      }
    };
    
    fetchUnansweredStats();
  }, [userId]);

  // Track window size for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth <= 768) {
        // On mobile, ensure sidebar is collapsed by default
        setIsCollapsed(true);
        // Also close mobile menu when resizing
        setIsMobileMenuOpen(false);
      } else {
        // On desktop, ensure sidebar is expanded by default
        setIsCollapsed(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle clicks outside sidebar to close mobile menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target) && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  const handleErrorsClick = () => {
    // Check if there are failed questions
    if (!userId) {
      setErrorMessage('Debes iniciar sesión para acceder a esta funcionalidad.');
      setShowErrorPopup(true);
      return;
    }
    
    // Fetch failed questions to check if there are any
    fetch(`${API_URL}/failed-questions/${userId}`)
      .then(response => response.json())
      .then(data => {
        if (!data.questions || data.questions.length === 0) {
          setErrorMessage('¡Aún no hay preguntas para repasar! Para utilizar este modo, necesitas: \n\n• Haber completado al menos un examen\n• Tener preguntas falladas o sin contestar en tu historial\n\nRealiza algunos exámenes y vuelve cuando tengas preguntas para repasar.');
          setShowErrorPopup(true);
        } else {
          // If there are failed questions, navigate to the errors page
          navigate('/errores');
        }
      })
      .catch(error => {
        console.error('Error:', error);
        setErrorMessage('Error al comprobar preguntas falladas. Inténtalo de nuevo más tarde.');
        setShowErrorPopup(true);
      });
  };

  function calculateTimeLeft() {
    const targetDate = new Date('2026-01-25T00:00:00');
    const now = new Date();
    const difference = targetDate - now;

    let timeLeft = {};
    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }
    return timeLeft;
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Actualizar exámenes filtrados cuando cambian los datos o los criterios de filtrado
  useEffect(() => {
    let result = [...examData];
    
    // Filtrar por término de búsqueda (si existe)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(exam => 
        (examTypes[exam.type]?.name || exam.type).toLowerCase().includes(term) ||
        new Date(exam.date).toLocaleDateString().includes(term)
      );
    }
    
    // Ordenar según la configuración
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aValue, bValue;
        
        // Manejar diferentes tipos de campos
        switch(sortConfig.key) {
          case 'date':
            aValue = new Date(a.date).getTime();
            bValue = new Date(b.date).getTime();
            break;
          case 'type':
            aValue = examTypes[a.type]?.name || a.type;
            bValue = examTypes[b.type]?.name || b.type;
            break;
          case 'score':
            aValue = a.score !== undefined ? a.score : (a.correct - (a.incorrect * 0.33));
            bValue = b.score !== undefined ? b.score : (b.correct - (b.incorrect * 0.33));
            break;
          case 'questions':
            aValue = a.totalQuestions || 
              (examTypes[a.type]?.questions === 'variable' ? 
                (a.questions?.length || 0) : examTypes[a.type]?.questions || 0);
            bValue = b.totalQuestions || 
              (examTypes[b.type]?.questions === 'variable' ? 
                (b.questions?.length || 0) : examTypes[b.type]?.questions || 0);
            break;
          case 'correct':
            aValue = a.correct || 0;
            bValue = b.correct || 0;
            break;
          case 'incorrect':
            aValue = a.incorrect || 0;
            bValue = b.incorrect || 0;
            break;
          case 'timeUsed':
            aValue = a.timeUsed || 0;
            bValue = b.timeUsed || 0;
            break;
          default:
            aValue = a[sortConfig.key];
            bValue = b[sortConfig.key];
        }
        
        // Comparar valores para ordenamiento
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    
    setFilteredExams(result);
    // Reiniciar la paginación cuando cambian los filtros
    setCurrentPage(0);
  }, [examData, sortConfig, searchTerm]);

  // Calcular puntuación con penalización por respuestas incorrectas
  const calculateScore = (correct, incorrect) => {
    // Convertir a números y validar
    const aciertos = parseInt(correct) || 0;
    const fallos = parseInt(incorrect) || 0;
    
    // Aplicar la fórmula: (A × 3) - (E × 1)
    const puntuacion = (aciertos * 3) - (fallos * 1);
    
    // Devolver el número tal cual, permitiendo valores negativos
    return Number(puntuacion);
  };

  // Función para cambiar el ordenamiento
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Función para obtener icono de ordenamiento
  const getSortIcon = (columnName) => {
    if (sortConfig.key !== columnName) {
      return <FaSort className="sort-icon" />;
    }
    
    return sortConfig.direction === 'ascending' 
      ? <FaSortUp className="sort-icon active" /> 
      : <FaSortDown className="sort-icon active" />;
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleSettingsMenu = () => {
    setShowSettingsMenu(!showSettingsMenu);
  };
  
  // Abrir/cerrar popup de recurrencia (desactivado)
  const openRecurrencePopup = () => {
    if (!RECURRENCE_ENABLED) return;
    setShowRecurrencePopup(true);
  };
  const closeRecurrencePopup = () => setShowRecurrencePopup(false);

  const openExamenEleccionPopup = () => {
    setShowEleccionPopup(true);
  };

  const openExamenContrarrelojPopup = () => {
    setShowContrarrelojPopup(true);
  };

  const closePopup = () => {
    setShowEleccionPopup(false);
    setShowContrarrelojPopup(false);
  };

  const handleSimulacroClick = () => {
    localStorage.removeItem('userAnswers');
    localStorage.removeItem('progresoExamen');
    navigate('/exam');
  };

  const handleQuizzClick = () => {
    localStorage.removeItem('userAnswers');
    localStorage.removeItem('progresoExamen');
    navigate('/Quizz');
  };

  const handleExamenEleccionClick = () => {
    localStorage.removeItem('userAnswers');
    localStorage.removeItem('progresoExamen');
    navigate('/ExamenEleccion');
  };

  const handleContrarrelojClick = () => {
    localStorage.removeItem('userAnswers');
    localStorage.removeItem('progresoExamen');
    navigate('/Contrarreloj');
  };

  useEffect(() => {
    const fetchExamHistory = async () => {
      try {
        if (!userId) return;

        console.log('Fetching exam history for user:', userId);
        
        // Usar directamente el endpoint proporcionado
        const response = await fetch(`${API_URL}/all-exams/${userId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`Error al obtener exámenes: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Exámenes obtenidos:', data.length);
        
        // NUEVO: Mostrar la respuesta completa para depuración
        console.log('======= RESPUESTA COMPLETA DE EXÁMENES =======');
        console.log('Datos raw:', data);
        
        // Asegurarse de que cada examen tiene la información correcta
        const examsWithStats = data.map(exam => {
          // Usar la puntuación guardada si existe, si no, calcularla
          const score = exam.score || (() => {
            switch(exam.type) {
              case 'simulacro':
                return (exam.correct * 3) - exam.incorrect;
              case 'contrarreloj':
                const baseScore = exam.correct - (exam.incorrect * 0.33);
                const timeBonus = Math.max(0, (840 - exam.timeUsed) / 60);
                return baseScore + timeBonus;
              case 'protocolos':
              case 'aeleccion':
                return exam.correct - (exam.incorrect * 0.33);
              default:
                return exam.correct - (exam.incorrect * 0.33);
            }
          })();

          return {
            ...exam,
            timeUsed: exam.timeUsed || 0,
            score: Number(score.toFixed(2)),
            totalQuestions: exam.totalQuestions || exam.questions?.length || 0,
            status: exam.status || 'completed'
          };
        });

        // NUEVO: Mostrar resumen detallado de cada examen
        console.log('======= RESUMEN DE EXÁMENES PROCESADOS =======');
        examsWithStats.forEach((exam, index) => {
          console.log(`Examen #${index + 1}:`, {
            id: exam._id,
            tipo: exam.type,
            fecha: new Date(exam.date).toLocaleString(),
            estado: exam.status,
            puntuación: exam.score,
            correctas: exam.correct,
            incorrectas: exam.incorrect,
            totalPreguntas: exam.totalQuestions,
            tiempoUsado: exam.timeUsed ? `${Math.floor(exam.timeUsed / 60)} min ${exam.timeUsed % 60} seg` : 'No disponible',
            tieneQuestions: !!exam.questions,
            questionsLength: exam.questions?.length || 0,
            tieneUserAnswers: !!exam.userAnswers,
            userAnswersLength: exam.userAnswers?.length || 0,
            estructuraCompleta: exam
          });
        });
        console.log('=======================================');

        console.log('Exámenes procesados:', examsWithStats.length);
        setExamData(examsWithStats);
      } catch (error) {
        console.error('Error al cargar historial:', error);
      }
    };
  
    fetchExamHistory();
  }, [userId]);
  
  const handleReviewExam = (examId) => {
    if (!examId) {
      console.error('El examId no está definido.');
      return;
    }
    
    localStorage.setItem('currentReviewExamId', examId);
    navigate(`/review/${examId}`);
  };

  const formatTime = (seconds) => {
    if (!seconds || seconds === 0) return '0h 0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

const fetchFailedQuestions = async () => {
  if (!userId) {
    console.error('No se encontró userId');
    return [];
  }
  
  try {
    const response = await fetch(`${API_URL}/failed-questions/${userId}`);
    if (!response.ok) {
      throw new Error('Error fetching failed questions');
    }
    
    const questions = await response.json();
    return questions;
  } catch (error) {
    console.error('Error al obtener preguntas falladas:', error);
    return [];
  }
};

const handleErroresClick = () => {
  // Clear any previous exam data
  localStorage.removeItem('userAnswers');
  localStorage.removeItem('progresoExamen');
  localStorage.removeItem('errorQuestions');
  
  // We should clear the current exam related data
  localStorage.removeItem('currentExamId');
  localStorage.removeItem('currentQuestions');
  
  // Navigate to the errors configuration page
  navigate('/errores');
};

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const startIndex = currentPage * examsPerPage;
  const endIndex = startIndex + examsPerPage;
  const displayedExams = filteredExams.slice(startIndex, endIndex);
  
  const handleNextPage = () => {
    if (currentPage < Math.ceil(filteredExams.length / examsPerPage) - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleSettingsClick = () => {
    window.location.href = "https://billing.stripe.com/p/login/28o3fr7yb4GQ5sk288";
  };

  const onSuccess = (credentialResponse) => {
    const decoded = jwtDecode(credentialResponse.credential);
    setProfileImage(decoded.picture);
    setIsLoggedIn(true);
    setShowLogout(false);
  };

  const onFailure = () => {
    setIsLoggedIn(false);
    setProfileImage('/muñeco_enfermera.png');
  };

  const handlePaymentsClick = () => {
    navigate('/payments');
  };

  // Verificar estado del usuario en la base de datos (desactivado)
  const handleCheckUserStatus = async () => {
    if (!RECURRENCE_ENABLED) return;
    if (!userId) {
      toast.error('Debes iniciar sesión.');
      return;
    }
    try {
      console.log('🔍 Verificando estado del usuario en la base de datos...');
      const response = await fetch(`${API_URL}/user-status/${userId}`);
      if (!response.ok) throw new Error('Error al verificar estado');
      
      const status = await response.json();
      console.log('📊 Estado actual del usuario:', status);
      
      // Mostrar información detallada
      const message = `
📊 Estado en Base de Datos:
• Email: ${status.email}
• Días objetivo: ${status.practicePreferences.cadenceDays || 'No configurado'}
• Canal: ${status.practicePreferences.channel || 'No configurado'}
• Recordatorios: ${status.practicePreferences.emailReminders ? 'Activados' : 'Desactivados'}
• Última actividad: ${status.lastActivityAt ? new Date(status.lastActivityAt).toLocaleString() : 'Nunca'}
• Días sin actividad: ${status.daysSinceActivity}
• Racha actual: ${status.streak.current}
• Racha mejor: ${status.streak.best}
• Recordatorios enviados: ${status.remindersCount}
• Debería recibir recordatorio: ${status.shouldReceiveReminder ? 'SÍ' : 'NO'}
      `;
      
      alert(message);
      toast.success('Estado verificado. Revisa la consola para más detalles.');
    } catch (err) {
      console.error('❌ Error al verificar estado:', err);
      toast.error(`Error: ${err.message}`);
    }
  };

  // Guardar preferencias de práctica (desactivado)
  const handleSavePracticePreferences = async () => {
    if (!RECURRENCE_ENABLED) return;
    if (!userId) {
      toast.error('Debes iniciar sesión.');
      return;
    }
    try {
      setSavingPracticePrefs(true);
      console.log('🔄 Iniciando guardado de preferencias de práctica...', practicePreferences);
      
      // Validaciones básicas con mensajes más claros
      if (practicePreferences.channel === 'email') {
        const email = (practicePreferences.emailOverride || '').trim() || (authUser?.email || '');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          toast.error('❌ Email inválido. Introduce un email válido o deja el campo vacío para usar tu email de cuenta.');
          setSavingPracticePrefs(false);
          return;
        }
      }
      if (practicePreferences.channel === 'sms') {
        const phone = (practicePreferences.phoneE164 || '').trim();
        const e164 = /^\+[1-9]\d{7,14}$/; // + y 8-15 dígitos
        if (!e164.test(phone)) {
          toast.error('❌ Teléfono inválido. Debe incluir el prefijo internacional (+34 para España). Ejemplo: +34674957972');
          setSavingPracticePrefs(false);
          return;
        }
      }
      
      console.log('✅ Validaciones pasadas, enviando datos al backend...');
      const response = await fetch(`${API_URL}/practice-preferences/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cadenceDays: practicePreferences.cadenceDays,
          emailReminders: practicePreferences.emailReminders,
          channel: practicePreferences.channel,
          emailOverride: practicePreferences.emailOverride,
          phoneE164: practicePreferences.phoneE164
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error del servidor: ${errorData.message || response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ Preferencias guardadas exitosamente en la base de datos:', result);
      toast.success('✅ Preferencias guardadas correctamente en la base de datos');
      closeRecurrencePopup();
    } catch (err) {
      console.error('❌ Error al guardar preferencias:', err);
      toast.error(`❌ Error: ${err.message}`);
    } finally {
      setSavingPracticePrefs(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // Statistics for dashboard metrics
  const stats = useMemo(() => {
    if (!examData || examData.length === 0) {
      return {
        totalExams: 0,
        averageScore: 0,
        bestScore: { score: 0, date: null, type: '' },
        worstScore: { score: 0, date: null },
        completedExams: 0,
        totalCorrect: 0,
        totalIncorrect: 0,
        totalBlank: 0,
        averageTimeUsed: 0
      };
    }
    
    const completedExams = examData.filter(exam => exam.status === 'completed');
    
    if (completedExams.length === 0) {
      return {
        totalExams: examData.length,
        averageScore: 0,
        bestScore: { score: 0, date: null, type: '' },
        worstScore: { score: 0, date: null },
        completedExams: 0,
        totalCorrect: 0,
        totalIncorrect: 0,
        totalBlank: 0,
        averageTimeUsed: 0
      };
    }
    
    let totalCorrect = 0;
    let totalIncorrect = 0;
    let totalBlank = 0;
    let totalTimeUsed = 0;
    let totalScore = 0;
    let bestScore = { score: -Infinity, date: null, type: '' };
    let worstScore = { score: Infinity, date: null, type: '' };
    
    completedExams.forEach(exam => {
      // Asegurarse de que los valores son números
      const correct = parseInt(exam.correct) || 0;
      const incorrect = parseInt(exam.incorrect) || 0;
      const timeUsed = parseInt(exam.timeUsed) || 0;
      const totalQuestions = parseInt(exam.totalQuestions) || (correct + incorrect) || 0;
      
      // Calcular score usando la función
      const score = Number(exam.score) || calculateScore(correct, incorrect);
      totalScore += score;
      
      // Acumular valores
      totalCorrect += correct;
      totalIncorrect += incorrect;
      totalBlank += totalQuestions - (correct + incorrect);
      totalTimeUsed += timeUsed;
      
      if (score > bestScore.score) {
        bestScore = { 
          score: score,
          date: new Date(exam.date), 
          type: exam.type 
        };
      }
      
      // Considerar todos los puntajes para el peor puntaje, incluyendo negativos
      if (score < worstScore.score) {
        worstScore = { 
          score: score, 
          date: new Date(exam.date), 
          type: exam.type 
        };
      }
    });
    
    // Si no se encontró un peor puntaje válido, usar el mejor puntaje
    if (worstScore.score === Infinity && bestScore.score > -Infinity) {
      worstScore = { ...bestScore };
    }
    
    // Calcular promedio de puntuación
    const averageScore = completedExams.length > 0 ? 
      totalScore / completedExams.length : 0;
    
    return {
      totalExams: examData.length,
      averageScore: Number(averageScore.toFixed(2)),
      bestScore,
      worstScore: worstScore.score === Infinity ? 
        { score: 0, date: null, type: '' } : worstScore,
      completedExams: completedExams.length,
      totalCorrect,
      totalIncorrect,
      totalBlank,
      averageTimeUsed: completedExams.length > 0 ? 
        Math.round(totalTimeUsed / completedExams.length) : 0
    };
  }, [examData]);
  
  // Data for score progress chart
  const scoreProgressData = useMemo(() => {
    if (!examData || examData.length === 0) {
      // Devolver un array vacío en lugar de datos ficticios
      return [];
    }
    
    // Filter only completed exams and sort by date
    return examData
      .filter(exam => exam.status === 'completed')
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((exam, index) => {
        const score = exam.score || (exam.correct - (exam.incorrect * 0.33));
        return {
          index: index + 1,
          date: new Date(exam.date).toLocaleDateString(),
          score: parseFloat(score.toFixed(2)),
          type: exam.type
        };
      });
  }, [examData]);
  
  // Data for answer distribution chart
  const answersDistributionData = useMemo(() => {
    // Get the total number of unanswered questions from our fetched data
    const totalUnanswered = unansweredQuestions.length;
    
    if (stats.totalCorrect === 0 && stats.totalIncorrect === 0 && totalUnanswered === 0) {
      return [
        { name: 'Correctas', value: 0, color: '#4CAF50' },
        { name: 'Incorrectas', value: 0, color: '#F44336' },
        { name: 'Sin contestar', value: 0, color: '#9E9E9E' }
      ];
    }
    
    return [
      { name: 'Correctas', value: stats.totalCorrect, color: '#4CAF50' },
      { name: 'Incorrectas', value: stats.totalIncorrect, color: '#F44336' },
      { name: 'Sin contestar', value: totalUnanswered, color: '#9E9E9E' }
    ];
  }, [stats, unansweredQuestions]);
  
  // Get exam type name
    const getExamTypeName = (type) => {
      const typeMap = {
        'simulacro': 'Simulacro EIR',
        'quizz': 'Quizz',
        'contrarreloj': 'Contrarreloj',
        'errores': 'Repite tus errores',
        'aeleccion': 'Diseña tu examen',
        'protocolos': 'Protocolario',
        'personalizado': 'Personalizado'
      };
      return typeMap[type] || type;
    };

  // Calcular todos los fallos por asignatura usando examData como fuente principal
  const subjectsPerformanceData = useMemo(() => {
    if (!userId) {
      console.log('No userId en subjectsPerformanceData');
      return { bloque1: [], bloque2: [] };
    }
    
    console.log('Calculando subjectsPerformanceData desde examData:', examData.length, 'exámenes');
    
    // Usar examData como fuente principal para calcular errores por asignatura
    const subjectGroups = {};
    
    if (examData && examData.length > 0) {
      console.log('Procesando exámenes completados para calcular errores por asignatura');
      
      examData
        .filter(exam => exam.status === 'completed')
        .forEach(exam => {
          console.log(`Procesando examen ${exam.type} con ${exam.userAnswers?.length || 0} respuestas`);
          
          // Los exámenes en ExamenResultado tienen userAnswers con questionData, no questions separadas
          if (exam.userAnswers && Array.isArray(exam.userAnswers)) {
            console.log(`Examen tiene userAnswers: ${exam.userAnswers.length} respuestas`);
            
            exam.userAnswers.forEach((userAnswer) => {
              // Obtener la asignatura desde questionData dentro de userAnswer
              const subject = userAnswer.questionData?.subject || 'General';
              
              // Filtrar asignaturas inválidas
              if (!subject || subject === 'undefined' || subject === 'test' || subject === 'Test' || subject === 'ERROR' || subject === 'Error' || subject === 'null') {
                return;
              }
              
              // Verificar si la respuesta es incorrecta
              const isCorrect = userAnswer.isCorrect === true;
              const hasAnswered = userAnswer.selectedAnswer !== undefined && userAnswer.selectedAnswer !== null && userAnswer.selectedAnswer !== '';
              
              // Si la pregunta fue respondida pero incorrectamente, contarla
              if (hasAnswered && !isCorrect) {
                if (!subjectGroups[subject]) {
                  subjectGroups[subject] = 0;
                }
                subjectGroups[subject]++;
                console.log(`Error en asignatura "${subject}": ${subjectGroups[subject]}`);
              }
            });
          }
        });
    }
    
    console.log('SubjectGroups calculados desde examData:', subjectGroups);
    
    // Si no hay datos desde examData, usar errorsBySubject como fallback
    if (Object.keys(subjectGroups).length === 0 && errorsBySubject.length > 0) {
      console.log('Usando errorsBySubject como fallback');
      errorsBySubject.forEach(({ name, count }) => {
        subjectGroups[name] = count;
      });
    }
    
    // Convertir a array de { name, count } y ordenar por cantidad de errores (ranking)
    const subjectsArray = Object.entries(subjectGroups)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count); // Orden descendente por cantidad de errores
    
    console.log('SubjectsArray final (ranking de errores):', subjectsArray);
    
    // Dividir en dos bloques para la visualización
    const mitad = Math.ceil(subjectsArray.length / 2);
    const result = {
      bloque1: subjectsArray.slice(0, mitad),
      bloque2: subjectsArray.slice(mitad)
    };
    
    console.log('Resultado subjectsPerformanceData:', result);
    
    return result;
  }, [examData, errorsBySubject, userId]);

  const renderDashboardMetrics = () => {
    // Render different content based on active tab
    switch (activeTab) {
      case 'summary':
        return (
          <div className="metrics-summary">
            <div className="metrics-cards">
              <div className="metric-card">
                <h3>Exámenes completados</h3>
                <div className="metric-value">{stats.completedExams || 0}</div>
                <div className="metric-description">de {stats.totalExams || 0} totales</div>
              </div>
              
              <div className="metric-card">
                <h3>Puntuación media</h3>
                <div className="metric-value">
                  {typeof stats.averageScore === 'number' ? stats.averageScore.toFixed(2) : '0.00'}
                </div>
                <div className="metric-description">puntos promedio</div>
              </div>
              
              <div className="metric-card">
                <h3>Mejor puntuación</h3>
                <div className="metric-value">
                  {stats.bestScore && typeof stats.bestScore.score === 'number' 
                    ? stats.bestScore.score.toFixed(2) 
                    : '0.00'}
                </div>
                <div className="metric-description">
                  {stats.bestScore && stats.bestScore.date 
                    ? `${new Date(stats.bestScore.date).toLocaleDateString()} - ${getExamTypeName(stats.bestScore.type)}`
                    : 'No hay datos'}
                </div>
              </div>
              
              <div className="metric-card">
                <h3>Tiempo medio</h3>
                <div className="metric-value">{formatTime(stats.averageTimeUsed || 0)}</div>
                <div className="metric-description">por examen</div>
              </div>
            </div>
            
            <div className="charts-wrapper">
              <div className="chart-container" style={{ overflow: 'visible' }}>
                <h3>Distribución de respuestas</h3>
                <ResponsiveContainer width="100%" height={windowWidth < 576 ? 200 : 250}>
                  <PieChart>
                    <Pie
                      data={answersDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={windowWidth >= 576}
                      outerRadius={windowWidth < 576 ? 60 : 80}
                      innerRadius={windowWidth < 576 ? 20 : 0}
                      fill="#8884d8"
                      dataKey="value"
                      label={windowWidth < 576 ? 
                        // Simplified labels for mobile
                        ({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : '' 
                        : 
                        // Detailed labels for larger screens
                        ({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {answersDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => value}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className={`custom-tooltip ${isDarkMode ? 'dark-mode' : ''}`}>
                              <p className="tooltip-label">{payload[0].name}</p>
                              <p className="tooltip-value">{payload[0].value} ({((payload[0].value / answersDistributionData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(0)}%)</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    {windowWidth < 576 && <Legend layout="horizontal" verticalAlign="bottom" align="center" />}
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="chart-container" style={{ overflow: 'visible', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h3>Temas con más errores frecuentes</h3>
                {subjectsPerformanceData.bloque1.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={[...subjectsPerformanceData.bloque1, ...subjectsPerformanceData.bloque2].slice(0, 8)}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" label={{ value: 'Número de fallos', position: 'insideBottom', offset: -5 }} />
                      <YAxis 
                        dataKey="name" 
                        type="category"
                        width={120}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(value, name, props) => [
                          `${value} preguntas falladas`,
                          'Fallos'
                        ]}
                      />
                      <Bar 
                        dataKey="count" 
                        name="Fallos"
                        fill="#ff7c7c"
                        background={{ fill: '#eee' }}
                      >
                        {[...subjectsPerformanceData.bloque1, ...subjectsPerformanceData.bloque2].slice(0, 8).map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={`rgba(255, ${68 + (index * 12)}, ${68 + (index * 12)}, 0.8)`}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="no-data-message">
                    <p>No hay datos de errores disponibles.</p>
                    <p>Completa algunos exámenes para ver tus temas con más errores.</p>
                  </div>
                )}
                <div className="chart-action" style={{ display: 'flex', justifyContent: 'center', marginTop: '15px' }}>
                  <button 
                    onClick={handleErroresClick}
                    className="practice-button"
                  >
                    Practica ahora tus errores frecuentes →
                  </button>
                </div>
              </div>
            </div>
            
            {/* Removed: Sección mejorada para preguntas sin responder */}
          </div>
        );
        
      case 'progress':
        return (
          <div className="progress-chart-section">
            <h3>Progreso de puntuación</h3>
            <ResponsiveContainer width="100%" height={300} style={{ overflow: 'visible' }}>
              <LineChart data={scoreProgressData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => value} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#8884d8" 
                  activeDot={{ r: 8 }} 
                  name="Puntuación"
                />
              </LineChart>
            </ResponsiveContainer>
            
            {scoreProgressData.length > 0 ? (
              <div className="trend-analysis">
                <h3>Análisis de tendencia</h3>
                <p>
                  {scoreProgressData.length >= 2 && 
                  scoreProgressData[scoreProgressData.length - 1].score > 
                  scoreProgressData[0].score
                    ? "Tendencia positiva: ¡Estás mejorando! Sigue así."
                    : scoreProgressData.length >= 2
                      ? "Tendencia a mejorar: Con más práctica verás mejores resultados."
                      : "Realiza más exámenes para ver tu progreso a lo largo del tiempo."}
                </p>
              </div>
            ) : (
              <div className="no-data-message">
                <p>No hay suficientes datos para mostrar el progreso.</p>
                <p>Completa más exámenes para ver tu evolución aquí.</p>
              </div>
            )}
          </div>
        );
        
      case 'subjects':
        return (
          <div className="subjects-performance">
            <h3>Rendimiento por asignaturas</h3>
            {subjectsPerformanceData.bloque1.length > 0 ? (
              <div className="subjects-scroll-container">
                <div className="subjects-chart">
                  <ResponsiveContainer width="100%" height={500} style={{ overflow: 'visible' }}>
                    <BarChart
                      data={[...subjectsPerformanceData.bloque1, ...subjectsPerformanceData.bloque2]}
                      layout="horizontal"
                      margin={{ top: 5, right: 30, left: 150, bottom: 80 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name"
                        type="category"
                        tick={{ fontSize: 11 }}
                        height={120}
                        angle={-45}
                        textAnchor="end"
                      />
                      <YAxis 
                        type="number"
                        domain={[0, 'dataMax + 1']}
                        label={{ value: 'Número de fallos', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        formatter={(value, name, props) => [`${value} fallos`, 'Fallos']} 
                      />
                      <Bar dataKey="count" name="Fallos" fill="#ff7c7c">
                        {[...subjectsPerformanceData.bloque1, ...subjectsPerformanceData.bloque2].map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={`rgba(255, ${68 + (index * 8)}, ${68 + (index * 8)}, 0.8)`}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="subjects-chart">
                  <div className="legend-container">
                    <div className="legend-item">
                      <div className="legend-color" style={{ backgroundColor: '#ff7c7c' }}></div>
                      <span>Fallos por asignatura</span>
                    </div>
                  </div>
                  <div className="ranking-info">
                    <p><strong>Ranking de errores:</strong> Las asignaturas están ordenadas por número de fallos (de mayor a menor)</p>
                    <p><strong>Total de asignaturas con errores:</strong> {[...subjectsPerformanceData.bloque1, ...subjectsPerformanceData.bloque2].length}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-data-message">
                <p>No hay datos suficientes para mostrar el rendimiento por asignaturas.</p>
                <p>Esto puede deberse a que:</p>
                <ul>
                  <li>No has completado ningún examen todavía</li>
                  <li>Las preguntas de tus exámenes no tienen asignaturas asignadas</li>
                  <li>La estructura de datos de respuestas no permite analizar las estadísticas</li>
                </ul>
                <p>Completa más exámenes para ver tu rendimiento por asignatura aquí.</p>
              </div>
            )}
          </div>
        );
        
      default:
        return <div>Selecciona una pestaña para ver estadísticas</div>;
    }
  };

  const renderExamHistoryTable = () => {
    return (
             <div className="exam-history-container">
      <div className="exam-history-header">
        <h2>Historial de Exámenes</h2>
          
          <div className="filter-controls">
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            
        <div className="pagination-controls">
          <button 
            onClick={handlePreviousPage} 
            disabled={currentPage === 0}
            className="pagination-btn"
          >
            &lt;
          </button>
          <span className="page-indicator">
                {currentPage + 1} de {Math.ceil(filteredExams.length / examsPerPage) || 1}
          </span>
          <button
            onClick={handleNextPage}
                disabled={endIndex >= filteredExams.length}
            className="pagination-btn"
          >
            &gt;
          </button>
            </div>
        </div>
      </div>
      
      <div className="table-container">
        <table className="exam-history-table">
          <thead>
            <tr>
                <th onClick={() => requestSort('date')} className="sortable-header">
                  Fecha {getSortIcon('date')}
                </th>
                <th onClick={() => requestSort('type')} className="sortable-header">
                  Tipo de Examen {getSortIcon('type')}
                </th>
                <th onClick={() => requestSort('questions')} className="sortable-header text-center">
                  Preguntas {getSortIcon('questions')}
                </th>
                <th onClick={() => requestSort('correct')} className="sortable-header text-center">
                  Aciertos {getSortIcon('correct')}
                </th>
                <th onClick={() => requestSort('incorrect')} className="sortable-header text-center">
                  Fallos {getSortIcon('incorrect')}
                </th>
              <th className="text-center">En Blanco</th>
                <th onClick={() => requestSort('score')} className="sortable-header text-center">
                  Puntuación {getSortIcon('score')}
                </th>
                <th onClick={() => requestSort('timeUsed')} className="sortable-header text-center">
                  Tiempo {getSortIcon('timeUsed')}
                </th>
              <th className="text-center">Estado</th>
              <th className="text-center">Revisar</th>
            </tr>
          </thead>
          <tbody>
              {filteredExams.length === 0 ? (
              <tr>
                <td colSpan="10" className="no-data-message">
                    {searchTerm ? 
                      "No se encontraron exámenes con los criterios de búsqueda." : 
                      "No hay exámenes registrados. ¡Completa tu primer examen para ver resultados!"}
                </td>
              </tr>
            ) : (
              displayedExams.map((exam, index) => {
                // Obtener la información del tipo de examen
                const examType = examTypes[exam.type] || { 
                  name: getExamTypeName(exam.type), 
                  questions: 0, 
                  time: 0 
                };
                
                // Calcular total de preguntas (maneja "variable")
                const totalQuestions = exam.totalQuestions || 
                  (examType.questions === 'variable' ? 
                    (exam.questions?.length || 0) : examType.questions);
                
                // Calcular preguntas en blanco
                const blankQuestions = totalQuestions - (exam.correct + exam.incorrect);
                
                // Función para calcular estadísticas del examen
                const calculateExamStats = (exam) => {
                  const totalQuestions = exam.totalQuestions || 0;
                  const correct = exam.correct || 0;
                  const incorrect = exam.incorrect || 0;
                  const blank = totalQuestions - (correct + incorrect);
                  
                  // Convertir segundos a formato "X minutos"
                  const timeInMinutes = Math.floor((exam.timeUsed || 0) / 60);
                  const timeFormatted = `${timeInMinutes} minutos`;
                  
                  return {
                    correct,
                    incorrect,
                    blank,
                    timeFormatted
                  };
                };

                const stats = calculateExamStats(exam);
                
                // Calcular el score de manera segura
                const examScore = calculateScore(exam.correct, exam.incorrect);
                
                return (
                  <tr key={index} className="exam-row">
                    <td>{new Date(exam.date).toLocaleDateString()}</td>
                    <td>{examType.name}</td>
                    <td className="text-center">{totalQuestions}</td>
                    <td className="text-center success-text">{stats.correct}</td>
                    <td className="text-center error-text">{stats.incorrect}</td>
                    <td className="text-center">{stats.blank}</td>
                    <td className={`text-center score-cell ${examScore < 0 ? 'negative-score' : ''}`}>{examScore.toFixed(2)}</td>
                    <td className="text-center">{stats.timeFormatted}</td>
                    <td className="text-center">
                      <span className={`status-badge ${exam.status === 'completed' ? 'completed' : 'in-progress'}`}>
                        {exam.status === 'completed' ? 'Completado' : 'En proceso'}
                      </span>
                    </td>
                    <td className="text-center">
                      {exam.status === 'completed' && (
                        <button
                          onClick={() => handleReviewExam(exam._id)}
                          className="review-btn"
                          title="Revisar examen"
                          aria-label="Revisar examen"
                        >
                          <i className="review-icon">👁️</i>
                        </button>
                      )}
                      {exam.status !== 'completed' && (
                        <button
                          onClick={() => handleResumeExam(exam._id)}
                          className="resume-btn"
                          title="Continuar examen"
                          aria-label="Continuar examen"
                        >
                          <i className="resume-icon">▶️</i>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
            </div>
          </div>
        );
      };

  // Verificar si hay un usuario logueado, y si no, redirigir a login en producción
  useEffect(() => {
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction && !userId) {
      // En producción, redirigir a la página de inicio para que se autentique
      console.log('Redirigiendo a login: no hay usuario autenticado');
      navigate('/');
      return;
    }
  }, [userId, navigate]);

  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true
    });
  }, []);

  // Manejar el cierre del menú al cambiar el tamaño de la ventana
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Función para manejar el menú móvil
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Cerrar el menú móvil cuando se selecciona una opción
  const handleMobileMenuClick = (callback) => {
    setIsMobileMenuOpen(false);
    if (callback) callback();
  };

  // Función para actualizar el tiempo y puntuación al completar un examen
  const updateExamStats = async (examId, timeUsed, score) => {
    try {
      const response = await fetch(`${API_URL}/update-exam/${examId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          timeUsed,
          score,
          status: 'completed'
        })
      });

      if (!response.ok) {
        throw new Error('Error al actualizar estadísticas del examen');
      }

      // Actualizar los datos localmente
      setExamData(prevData => 
        prevData.map(exam => 
          exam._id === examId 
            ? { ...exam, timeUsed, score, status: 'completed' }
            : exam
        )
      );
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Función para reanudar examen en progreso
  const handleResumeExam = (examId) => {
    // Navegar directamente a la nueva vista de examen en progreso con el ID del examen
    console.log(`Reanudando examen con ID: ${examId}`);
    navigate(`/exam-in-progress/${examId}`);
  };

  // Cuando muestres el score
  const formatScore = (score) => {
    // Asegurarse de que score sea un número
    const numScore = Number(score);
    return isNaN(numScore) ? '0.00' : numScore.toFixed(2);
  };

  // Renderizar el componente de error popup
  const renderErrorPopup = () => {
    if (!showErrorPopup) return null;

    return (
      <div className="error-popup-overlay">
        <div className="error-popup">
          <h3>Información</h3>
          <p>{errorMessage}</p>
          <button onClick={() => setShowErrorPopup(false)}>Entendido</button>
        </div>
      </div>
    );
  };

  // Función para alternar la visibilidad del ChatBot (desactivada)
  const toggleChatBot = () => {
    // Función desactivada temporalmente
    console.log("Función de chatbot desactivada");
    return false;
  }

  // Función para alternar la visibilidad de la Comunidad (desactivada)
  const toggleCommunity = () => {
    // Función desactivada temporalmente
    console.log("Función de comunidad desactivada");
    return false;
  };
  
  // Función para cerrar ChatBot (desactivada)
  const closeChatBot = () => {
    // Función desactivada temporalmente
    return false;
  }

  const [selectedAvatar, setSelectedAvatar] = useState(currentUser?.avatar || '/muñeco_enfermera.png');

  // Actualizar lista a 9 avatares específicos + default
  const availableAvatars = [
    '/profile/Captura de pantalla 2025-04-19 a las 13.43.13.png',
    '/profile/Captura de pantalla 2025-04-19 a las 13.21.39.png',
    '/profile/Captura de pantalla 2025-04-19 a las 13.42.57.png',
    '/profile/Captura de pantalla 2025-04-19 a las 13.21.34.png',
    '/profile/Captura de pantalla 2025-04-19 a las 13.21.28.png',
    '/profile/Captura de pantalla 2025-04-19 a las 13.21.22.png',
    '/profile/Captura de pantalla 2025-04-19 a las 13.43.51.png',
    '/profile/Captura de pantalla 2025-04-19 a las 14.03.37.png',
    '/profile/Captura de pantalla 2025-04-19 a las 14.03.44.png',
    // '/muñeco_enfermera.png' // Mantener o quitar el default según preferencia
  ];
  
  // Asignar uno aleatorio si el usuario no tiene uno
  useEffect(() => {
    if (currentUser && !currentUser.avatar) {
      const randomIndex = Math.floor(Math.random() * availableAvatars.length);
      setSelectedAvatar(availableAvatars[randomIndex]);
      // Idealmente, aquí también se guardaría este avatar aleatorio en el backend
      // y se actualizaría el estado global currentUser si existe.
    }
  }, [currentUser]); // Ejecutar cuando currentUser cambie

  const handleAvatarSelect = (avatarUrl) => {
    setSelectedAvatar(avatarUrl);
    // AQUÍ: Lógica para guardar en backend y actualizar estado global currentUser
    console.log("Avatar seleccionado (falta guardar):", avatarUrl);
    setShowAvatarPopup(false); 
  };

  // Función para renderizar el popup de selección de avatar
  const renderAvatarPopup = () => {
    if (!showAvatarPopup) return null;
    return (
      <div className="avatar-popup-overlay" onClick={() => setShowAvatarPopup(false)}>
        <div className="avatar-popup" onClick={(e) => e.stopPropagation()}> 
          <h3>Elige tu avatar</h3>
          <div className="avatar-grid">
            {availableAvatars.map((avatar, index) => (
              <img 
                key={index} 
                src={avatar}
                alt={`Avatar ${index + 1}`}
                className={`avatar-option ${selectedAvatar === avatar ? 'selected' : ''}`}
                onClick={() => handleAvatarSelect(avatar)}
              />
            ))}
          </div>
          <button onClick={() => setShowAvatarPopup(false)}>Cerrar</button>
        </div>
      </div>
    );
  };

  // Popup para gestionar recurrencia de práctica (desactivado)
  const renderRecurrencePopup = () => {
    if (!RECURRENCE_ENABLED || !showRecurrencePopup) return null;
    return (
      <div className="error-popup-overlay" onClick={closeRecurrencePopup}>
        <div className="recurrence-popup" onClick={(e) => e.stopPropagation()}>
          <h3>🎯 Gestionar recurrencia de práctica</h3>
          <div className="recurrence-form">
            <div className="form-group">
              <label>Días objetivo de racha</label>
              <input
                type="number"
                min={1}
                max={30}
                value={practicePreferences.cadenceDays}
                onChange={(e) => setPracticePreferences(p => ({ ...p, cadenceDays: Math.max(1, Math.min(30, parseInt(e.target.value) || 1)) }))}
                className="form-input"
                placeholder="3"
              />
              <div className="form-help">¿Cada cuántos días quieres que te recordemos practicar?</div>
            </div>

            <div className="form-group">
              <label>Método de notificación</label>
              <select
                value={practicePreferences.channel}
                onChange={(e) => setPracticePreferences(p => ({ ...p, channel: e.target.value }))}
                className="form-select"
              >
                <option value="email">📧 Email</option>
                <option value="sms">📱 SMS</option>
              </select>
            </div>

            {practicePreferences.channel === 'email' && (
              <div className="form-group">
                <label>Email de notificación (opcional)</label>
                <input
                  type="email"
                  placeholder={authUser?.email || 'tu@email.com'}
                  value={practicePreferences.emailOverride}
                  onChange={(e) => setPracticePreferences(p => ({ ...p, emailOverride: e.target.value }))}
                  className="form-input"
                />
                <div className="form-help">Si lo dejas vacío, usaremos tu email de cuenta</div>
              </div>
            )}

            {practicePreferences.channel === 'sms' && (
              <div className="form-group">
                <label>Teléfono con prefijo internacional</label>
                <input
                  type="tel"
                  placeholder="+34600111222"
                  value={practicePreferences.phoneE164}
                  onChange={(e) => setPracticePreferences(p => ({ ...p, phoneE164: e.target.value }))}
                  className="form-input"
                />
                <div className="form-help">Formato E.164. Ejemplo España: +34XXXXXXXXX</div>
              </div>
            )}

            <div className="checkbox-group">
              <input
                type="checkbox"
                id="emailReminders"
                checked={practicePreferences.emailReminders}
                onChange={(e) => setPracticePreferences(p => ({ ...p, emailReminders: e.target.checked }))}
              />
              <label htmlFor="emailReminders">Recibir recordatorios automáticos</label>
            </div>
            
            <div className="form-group">
              <button 
                type="button"
                onClick={handleCheckUserStatus}
                className="btn btn-info"
                style={{ marginTop: '10px', fontSize: '14px' }}
              >
                🔍 Verificar estado en base de datos
              </button>
            </div>
          </div>
          
          <div className="form-actions">
            <button 
              onClick={closeRecurrencePopup} 
              disabled={savingPracticePrefs}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSavePracticePreferences} 
              disabled={savingPracticePrefs}
              className="btn btn-primary"
            >
              {savingPracticePrefs ? 'Guardando...' : 'Guardar configuración'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Modal de Tutorial (video YouTube)
  const renderTutorialModal = () => {
    if (!showTutorialModal) return null;
    return (
      <div className="error-popup-overlay" onClick={closeTutorialModal}>
        <div className="error-popup tutorial-modal" onClick={(e) => e.stopPropagation()}>
          <h3>Cómo funciona Simulia (Tutorial rápido)</h3>
          <div className="tutorial-video-container">
            <iframe
              src="https://www.youtube.com/embed/4x5YkhD5TJU"
              title="Tutorial Simulia"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          <div className="tutorial-buttons">
            <a
              href="https://youtu.be/4x5YkhD5TJU"
              target="_blank"
              rel="noreferrer"
            >
              Ver en YouTube
            </a>
            <button onClick={closeTutorialModal}>Entendido</button>
          </div>
        </div>
      </div>
    );
  };

  // Función mejorada para alternar el modo oscuro
  const handleToggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    // Llamar a la función prop si existe
    if (propToggleDarkMode) {
      propToggleDarkMode();
    }
    
    // Guardar preferencia en localStorage
    localStorage.setItem('darkMode', newDarkMode ? 'true' : 'false');
    
    // Aplicar clase al elemento document
    if (newDarkMode) {
      document.documentElement.classList.add('dark-mode');
      document.body.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
      document.body.classList.remove('dark-mode');
    }
  };
  
  // Cargar preferencia de modo oscuro al iniciar
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    
    // Asegurar que la clase se aplique correctamente
    if (isDarkMode) {
      document.documentElement.classList.add('dark-mode');
      document.body.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
      document.body.classList.remove('dark-mode');
    }
    
    // Sincronizar con la preferencia guardada si es necesario
    if (savedDarkMode !== isDarkMode && propToggleDarkMode) {
      propToggleDarkMode();
    }
    
    // Aplicar listener para cambios de color de sistema
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemColorChange = (e) => {
      const systemDarkMode = e.matches;
      const userPreference = localStorage.getItem('darkMode');
      
      // Solo aplicar cambio de sistema si no hay preferencia guardada
      if (userPreference === null) {
        if (systemDarkMode !== isDarkMode && propToggleDarkMode) {
          propToggleDarkMode();
        }
      }
    };
    
    // Escuchar cambios en preferencia de color del sistema
    darkModeMediaQuery.addEventListener('change', handleSystemColorChange);
    
    return () => {
      darkModeMediaQuery.removeEventListener('change', handleSystemColorChange);
    };
  }, [isDarkMode, propToggleDarkMode]);

  // Función para cerrar la comunidad
  const closeCommunity = () => {
    const communityOverlay = document.querySelector('.community-overlay');
    if (communityOverlay) {
      communityOverlay.classList.add('closing');
      setTimeout(() => {
        setShowCommunity(false);
      }, 300);
    } else {
      setShowCommunity(false);
    }
  };

  // Set initial sidebar state based on screen size
  useEffect(() => {
    // Check screen size once on component mount
    const isMobile = window.innerWidth <= 768;
    setIsCollapsed(isMobile);
  }, []);

  // Función para manejar el botón de practicar preguntas sin responder
  const handlePracticeUnansweredClick = () => {
    // Limpiar datos previos
    localStorage.removeItem('userAnswers');
    localStorage.removeItem('progresoExamen');
    localStorage.removeItem('currentExamId');
    localStorage.removeItem('currentQuestions');
    
    // Navegar a la página de práctica de preguntas sin responder
    navigate('/practice-unanswered');
  };

  return (
    <GoogleOAuthProvider clientId="465394843030-lvkbmmj7h4rv8h67lo4h9aqpi6h0v1cs.apps.googleusercontent.com">
      <div className="dashboard">
        {/* Barra de navegación */}
        <div className={`navbar ${isDarkMode ? 'dark' : ''}`}>
          <div className="navbar-container">
            <div className="navbar-left">
              <button 
                className="toggle-sidebar-btn mobile-only" 
                onClick={toggleMobileMenu}
                aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
              >
                {isMobileMenuOpen ? 
                  <FiX size={20} /> : 
                  <FiMenu size={20} />
                }
              </button>
            </div>
            

            
            <div className="navbar-right">
              <button 
                className="feature-btn disabled"
                aria-label="Comunidad (desactivado)"
              >
                <span className="feature-icon">
                  <FiUsers size={18} />
                </span>
                <span className="feature-btn-text">Comunidad</span>
                <span className="feature-tooltip">Función no disponible</span>
              </button>
              
              <button 
                className="feature-btn disabled"
                aria-label="Chatbot (desactivado)"
              >
                <span className="feature-icon">
                  <FiMessageSquare size={18} />
                </span>
                <span className="feature-btn-text">Chatbot</span>
                <span className="feature-tooltip">Función no disponible</span>
              </button>
              
              <button 
                className="navbar-switch" 
                onClick={handleToggleDarkMode}
                aria-label={isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              >
                <span className="mode-icon">
                  {isDarkMode ? 
                    <FiSun size={18} /> : 
                    <FiMoon size={18} />
                  }
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Contenedor para sidebar y main content */} 
        <div className="dashboard-body"> 
          {/* Sidebar */} 
          <div ref={sidebarRef} className={`sidebar ${isMobileMenuOpen ? 'mobile-active' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
              <div className="sidebar-header">
                  <img src="/Logo_oscuro.png" alt="Logo" className="sidebar-logo" />
                  <h1>Simulia</h1>
              </div>
              <ul className="sidebar-menu">
                  <li className="menu-item">
                      <button onClick={() => handleMobileMenuClick(handleSimulacroClick)}>
                          <img src="/icono7.png" alt="" className="menu-icon" />
                          <span>Simulacro EIR</span>
                      </button>
                  </li>
                  <li className="menu-item">
                      <button onClick={() => handleMobileMenuClick(handleQuizzClick)}>
                          <img src="/icono5.png" alt="" className="menu-icon" />
                          <span>Quizz</span>
                      </button>
                  </li>
                  <li className="menu-item">
                      <button onClick={() => handleMobileMenuClick(handleErroresClick)}>
                          <img src="/icono2.png" alt="" className="menu-icon" />
                          <span>Repite tus errores</span>
                      </button>
                  </li>
                  <li className="menu-item">
                      <button onClick={() => handleMobileMenuClick(handleExamenEleccionClick)}>
                          <img src="/icono8.png" alt="" className="menu-icon" />
                          <span>Diseña tu examen</span>
                      </button>
                  </li>
                  <li className="menu-item">
                      <button onClick={() => handleMobileMenuClick(handleContrarrelojClick)}>
                          <img src="/icono6.png" alt="" className="menu-icon" />
                          <span>Contrarreloj</span>
                      </button>
                  </li>
                  <li className="menu-item">
                      <button
                          onClick={() =>
                              handleMobileMenuClick(() => {
                                  localStorage.removeItem("userAnswers");
                                  localStorage.removeItem("progresoExamen");
                                  navigate("/protocolos");
                              })
                          }
                      >
                          <img src="/icono11.png" alt="" className="menu-icon" />
                          <span>Protocolario</span>
                      </button>
                  </li>
                  <li className="menu-item" style={{ position: 'relative' }}>
                    <button
                      className="disabled"
                      tabIndex={-1}
                      style={{ pointerEvents: 'none', opacity: 0.5, position: 'relative' }}
                    >
                      <img src="/evaluacion-de-salud.png" alt="" className="menu-icon" />
                      <span>Escalas</span>
                      <span className="disabled-tooltip">Función no disponible</span>
                    </button>
                  </li> 
              </ul>
              <div className="sidebar-collapse">
                  <button 
                    className="collapse-button"
                    onClick={toggleSidebar}
                    aria-label={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
                  >
                    {isCollapsed ? <FiChevronRight size={16} /> : <FiChevronLeft size={16} />}
                  </button>
              </div>
                  <div className="sidebar-footer">
                  <div className="sidebar-footer-row">
                    {RECURRENCE_ENABLED && (
                      <button onClick={openRecurrencePopup} className="billing-button">
                          <span>Racha</span>
                      </button>
                    )}
                    <button onClick={openTutorialModal} className="billing-button">
                        <span>Tutorial</span>
                    </button>
                  </div>
                  <button onClick={handleSettingsClick} className="billing-button">
                      <span>Gestionar suscripción</span>
                  </button>
              </div>
          </div>

          {/* Contenido Principal */} 
          <div className={`main-content ${isCollapsed ? 'collapsed' : 'expanded'}`}>
              <TimelineProgress />
              <div className="dashboard-metrics">
                  <div className="metrics-tabs">
                      <button
                          className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`}
                          onClick={() => setActiveTab('summary')}
                      >
                          Resumen
                      </button>
                      <button
                          className={`tab-button ${activeTab === 'progress' ? 'active' : ''}`}
                          onClick={() => setActiveTab('progress')}
                      >
                          Progreso
                      </button>
                      <button
                          className={`tab-button ${activeTab === 'subjects' ? 'active' : ''}`}
                          onClick={() => setActiveTab('subjects')}
                      >
                          Asignaturas
                      </button>
                  </div>
                  <div className="metrics-content">
                      {renderDashboardMetrics()}
                  </div>
              </div>
              {renderExamHistoryTable()}
          </div>
        </div>

        

        {/* Popups, Overlays, ChatBot, Community */} 
        {showEleccionPopup && <AEleccion onClose={closePopup} />}
        {showContrarrelojPopup && <Contrarreloj onClose={closePopup} />}
        {renderErrorPopup()}
        {/* Componentes de Community y ChatBot desactivados temporalmente
        {showCommunity && (
          <div className={`community-overlay ${isDarkMode ? 'dark-mode' : ''}`}>
            <div className="community-content">
              <div className="community-header-container">
                <h2>Comunidad de Simulia</h2>
                <button 
                  className="close-community-overlay" 
                  onClick={closeCommunity} 
                  aria-label="Cerrar comunidad"
                >
                  <FiX size={18} />
                </button>
              </div>
              <Community 
                currentUser={currentUser || {id: 'guest', name: 'Invitado'}} 
                setShowAvatarPopup={setShowAvatarPopup}
                hideTitle={true}
              /> 
            </div>
          </div>
        )}
        {showChatBot && <ChatBot onClose={closeChatBot} />}
        */}
        {renderAvatarPopup()}
        {RECURRENCE_ENABLED && renderRecurrencePopup()}
        {renderTutorialModal()}

      </div>
    </GoogleOAuthProvider>
  );
}

export default Dashboard;