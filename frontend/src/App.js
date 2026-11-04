import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import HomePage from './HomePage';
// Estilos de todas las páginas, cargados desde el principio y en el mismo orden que antes
// del code splitting, para que el aspecto de la web no cambie. Solo se trocea el JavaScript.
import 'aos/dist/aos.css';
import './components/DemoModal.css';
import './components/QuestionBox.module.css';
import './Dashboard.css';
import './Aeleccion.css';
import './components/SuccessNotification.css';
import './views/exam/exam.module.css';
import './components/Pagination.module.css';
import './Contrarreloj.css';
import './components/Community.css';
import './components/TimelineProgress.css';
import './components/TicketModal.css';
import './components/FlashcardModal.css';
import './checkout.css';
import './index.css';
import './Quizz.css';
import './views/exam/review.module.css';
import './errores.css';
import './Exam.css';
import './Protocolos.css';
import './components/Blog.css';
import './components/BlogPost.css';
import './scales.css';
import AOS from 'aos';
import { LogoProvider } from './context/LogoContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import CookieConsent from "react-cookie-consent";
import { META_PIXEL_ID, track, captureAttribution, trackPricingView } from './lib/metaPixel';

// Si tras un despliegue nuevo el navegador pide un trozo de código antiguo que ya no existe,
// recarga la página una vez para coger la versión nueva (evita pantallas rotas).
function lazyWithRetry(factory) {
  return React.lazy(() =>
    factory().catch((err) => {
      const key = 'simulia_chunk_reload';
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
        return new Promise(() => {});
      }
      throw err;
    }).then((mod) => {
      sessionStorage.removeItem('simulia_chunk_reload');
      return mod;
    })
  );
}

// Cada página se descarga solo cuando se visita (la portada va en el archivo principal).
const Dashboard = lazyWithRetry(() => import('./Dashboard'));
const Exam = lazyWithRetry(() => import('./Exam'));
const Quizz = lazyWithRetry(() => import('./Quizz'));
const Contrarreloj = lazyWithRetry(() => import('./Contrarreloj'));
const ReviewExam = lazyWithRetry(() => import('./ReviewExam'));
const Errores = lazyWithRetry(() => import('./errores'));
const Protocolos = lazyWithRetry(() => import('./Protocolos'));
const AEleccion = lazyWithRetry(() => import('./Aeleccion'));
const AvisoLegal = lazyWithRetry(() => import('./pages/AvisoLegal'));
const Precios = lazyWithRetry(() => import('./pages/Precios'));
const Simulacro = lazyWithRetry(() => import('./pages/Simulacro'));
const PoliticaPrivacidad = lazyWithRetry(() => import('./pages/PoliticaPrivacidad'));
const TerminosCondiciones = lazyWithRetry(() => import('./pages/TerminosCondiciones'));
const PoliticaCookies = lazyWithRetry(() => import('./pages/PoliticaCookies'));
const Blog = lazyWithRetry(() => import('./components/Blog'));
const BlogPost = lazyWithRetry(() => import('./components/BlogPost'));
const ExamInProgress = lazyWithRetry(() => import('./ExamInProgress'));
const SuccessPage = lazyWithRetry(() => import('./Success'));
const CancelPage = lazyWithRetry(() => import('./Cancel'));
const Scales = lazyWithRetry(() => import('./scales'));

// Guardar UTMs / fbclid en cuanto se carga la app (antes de que la navegación los borre)
captureAttribution();

// PageView en cada cambio de ruta (SPA) + ViewContent en la página de planes
function MetaRouteTracker() {
  const location = useLocation();
  const first = React.useRef(true);
  useEffect(() => {
    // El primer PageView lo lanza loadAnalytics al inicializar el píxel
    if (first.current) {
      first.current = false;
    } else {
      track('PageView');
    }
    window.__simuliaRouteKey = location.key;
    if (location.pathname === '/precios') {
      trackPricingView(location.key);
    }
  }, [location.pathname, location.key]);
  return null;
}


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
<Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7da0a7', fontFamily: 'Inter, sans-serif' }}>
        Cargando…
      </div>
    }>
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
    </Suspense>
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

  // Meta Pixel: el código base vive en public/index.html (<head>) y ya habrá lanzado
  // init + PageView si la usuaria tenía el consentimiento. Aquí solo lo activamos
  // si acaba de aceptar (simuliaLoadPixel no hace nada si ya estaba iniciado).
  if (typeof window.simuliaLoadPixel === 'function') {
    window.simuliaLoadPixel();
  } else if (typeof window.fbq !== 'function') {
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', META_PIXEL_ID);
    window.fbq('track', 'PageView');
  }
  // Si se acepta cookies estando ya en /precios, registrar también ViewContent
  // (si se aceptan cookies estando ya en /precios; si el router aún no montó, lo hará MetaRouteTracker)
  if (window.location.pathname === '/precios') {
    trackPricingView(window.__simuliaRouteKey);
  }
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
            <MetaRouteTracker />
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