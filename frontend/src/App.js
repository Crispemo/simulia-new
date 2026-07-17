import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
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
import Precios from './pages/Precios';
import Simulacro from './pages/Simulacro';
import PoliticaPrivacidad from './pages/PoliticaPrivacidad';
import TerminosCondiciones from './pages/TerminosCondiciones';
import PoliticaCookies from './pages/PoliticaCookies';
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
      <Route path="/escalas" element={<Protocolos userId={currentUser?.uid} />} />
      <Route path="/examenEleccion" element={<AEleccion userId={currentUser?.uid} />} />
      <Route path="/examInProgress" element={<ExamInProgress userId={currentUser?.uid} />} />
      <Route path="/precios" element={<Precios />} />
      <Route path="/simulacro" element={<Simulacro />} />
      <Route path="/aviso-legal" element={<AvisoLegal />} />
      <Route path="/politica-privacidad" element={<PoliticaPrivacidad />} />
      <Route path="/terminos-condiciones" element={<TerminosCondiciones />} />
      <Route path="/cookies" element={<PoliticaCookies />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:postId" element={<BlogPost />} />
      <Route path="/scales" element={<Scales userId={currentUser?.id} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function loadAnalytics() {
  if (window._analyticsLoaded) return;
  window._analyticsLoaded = true;

  // Google Analytics 4
  const gtagScript = document.createElement('script');
  gtagScript.async = true;
  gtagScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-111W589W3H';
  document.head.appendChild(gtagScript);
  window.dataLayer = window.dataLayer || [];
  function gtag(){window.dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-111W589W3H');

  // Meta Pixel
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  window.fbq('init', '1582659899396296');
  window.fbq('track', 'PageView');
}

function App() {
  React.useEffect(() => {
    const consent = document.cookie.split('; ').find(row => row.startsWith('CookieConsent='));
    if (consent && consent.split('=')[1] === 'true') {
      loadAnalytics();
    }
  }, []);

  return (
    <AuthProvider>
      <LogoProvider>
        <Router>
          <div className="App">
            <AppRoutes />
            <CookieConsent
              location="bottom"
              buttonText="Aceptar"
              declineButtonText="Rechazar"
              enableDeclineButton
              onAccept={loadAnalytics}
              style={{ background: "#3f5056", color: "#fff", alignItems: "center" }}
              buttonStyle={{ background: "#7da0a7", color: "#fff", fontWeight: "bold", borderRadius: "9999px", padding: "8px 24px" }}
              declineButtonStyle={{ background: "transparent", border: "1px solid #fff", color: "#fff", borderRadius: "9999px", padding: "8px 24px" }}
              expires={365}
            >
              Usamos cookies propias y de terceros para analítica y publicidad.{' '}
              <a href="/cookies" style={{ color: "#7da0a7", textDecoration: "underline" }}>Más información</a>
            </CookieConsent>
          </div>
        </Router>
      </LogoProvider>
    </AuthProvider>
  );
}

export default App;