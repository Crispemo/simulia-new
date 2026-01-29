import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import HomePage from './HomePage';
import Dashboard from './Dashboard';
import CheckoutForm from './CheckoutForm';
import Exam from './Exam';
import AOS from 'aos';
import 'aos/dist/aos.css';
import './index.css';
import Quizz from './Quizz';
import Contrarreloj from './Contrarreloj';
import ReviewExam from './ReviewExam';
import Errores from './errores';
import Protocolos from './Protocolos';
import AEleccion from './Aeleccion';
import { LogoProvider } from './context/LogoContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import AvisoLegal from './pages/AvisoLegal';
import PoliticaPrivacidad from './pages/PoliticaPrivacidad';
import TerminosCondiciones from './pages/TerminosCondiciones';
import Blog from './components/Blog';
import BlogPost from './components/BlogPost';
import ExamInProgress from './ExamInProgress';
import SuccessPage from './Success';
import CancelPage from './Cancel';
import CookieConsent from "react-cookie-consent";
import Scales from './scales';
import './scales.css';


function AppRoutes() {
  const location = useLocation();
  const { currentUser } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleDarkMode = () => {
    const body = document.body;
    if (isDarkMode) {
      body.classList.remove('dark');
    } else {
      body.classList.add('dark');
    }
    setIsDarkMode(!isDarkMode);
  };

  useEffect(() => {
    AOS.init({ duration: 1200, once: true });

    if (location.pathname !== '/dashboard') {
      setIsDarkMode(false);
      document.body.classList.remove('dark');
    }
  }, [location]);

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/success" element={<SuccessPage />} />
      <Route path="/cancel" element={<CancelPage />} />
      <Route path="/dashboard" element={<Dashboard toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} currentUser={currentUser}/>} />
      <Route path="/review/:examId" element={<ReviewExam userId={currentUser?.uid}/>} />
      <Route path="/exam-in-progress/:examId" element={<ExamInProgress toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} userId={currentUser?.uid}/>} />
      <Route path="/quizz" element={<Quizz toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} userId={currentUser?.uid}/>} />
      <Route path="/contrarreloj" element={<Contrarreloj userId={currentUser?.uid}/>} />
      <Route path="/errores" element={<Errores userId={currentUser?.uid}/>} />
      <Route path="/exam" element={<Exam toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} userId={currentUser?.uid}/>} />
      <Route path="/protocolos" element={<Protocolos userId={currentUser?.uid} />} />
      <Route path="/examenEleccion" element={<AEleccion userId={currentUser?.uid} />} />
      <Route path="/examInProgress" element={<ExamInProgress userId={currentUser?.uid} />} />
      <Route path="/aviso-legal" element={<AvisoLegal />} />
      <Route path="/politica-privacidad" element={<PoliticaPrivacidad />} />
      <Route path="/terminos-condiciones" element={<TerminosCondiciones />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:postId" element={<BlogPost />} />
      <Route path="/scales" element={<Scales userId={currentUser?.id} />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <LogoProvider>
        <Router>
          <div className="App">
            <AppRoutes />
            <CookieConsent
              location="bottom"
              buttonText="Aceptar"
              style={{ background: "#3f5056", color: "#fff" }}
              buttonStyle={{ background: "#7da0a7", color: "#fff", fontWeight: "bold" }}
              expires={365}
            >
              Esta web usa cookies propias y de terceros para mejorar tu experiencia. Al continuar, aceptas su uso.
            </CookieConsent>
          </div>
        </Router>
      </LogoProvider>
    </AuthProvider>
  );
}

export default App;