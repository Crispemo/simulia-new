import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { Helmet } from "react-helmet";
import { useLogo } from './context/LogoContext';
import { auth, signInWithGoogle, signOutUser } from './firebase';
import { useAuth } from './context/AuthContext';
import { API_URL } from './config';
import { toast } from 'react-toastify';
import DemoModal from './components/DemoModal'; // Demo component


function HomePage() {
  const [data, setData] = useState('');
  const [preguntas, setPreguntas] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const navigate = useNavigate();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const { logoSrc } = useLogo();
  const { currentUser, login, checkSubscription } = useAuth();
  
  // Estado para evitar verificar múltiples veces después del login
  const [checkedAfterLogin, setCheckedAfterLogin] = useState(false);

  useEffect(() => {
    if (window.innerWidth > 768) {
      AOS.init({ duration: 1200, once: true });
    }
  }, []);

  // useEffect para manejar la navegación post-login (móvil y desktop)
  useEffect(() => {
    if (!checkedAfterLogin && currentUser) {
      setCheckedAfterLogin(true);
      setTimeout(() => {
        verifyUser();
      }, 1000);
    }
  }, [currentUser, checkedAfterLogin]);

  const verifyUser = async () => {
    try {
      const response = await fetch(`${API_URL}/users/check-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: currentUser?.uid || null,
          email: currentUser?.email || null
        }),
      });

      const data = await response.json();

      if(data.error === 'Usuario no encontrado.') {
        scrollToPayments();
        setShowPopup(true);
        return;
      }

      if(data.subscriptionActive === true) {
        navigate('/dashboard');
        return;
      }

      scrollToPayments();
      setShowPopup(true);

    } catch (error) {
      console.error('Error al verificar el usuario:', error.message);
      scrollToPayments();
      setShowPopup(true);
    }
  };
  
  const handleLoginClick = async () => {
    try {
      setIsSigningIn(true);
      
      const result = await signInWithGoogle();
      
      // En móviles, result puede ser null (redirección iniciada)
      if (!result) {
        return;
      }
      
      if (!result.uid) {
        toast.error('Error al iniciar sesión con Google');
        return;
      }
      
      // Verificar suscripción después de login exitoso
      try {
        const response = await fetch(`${API_URL}/users/check-subscription`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            userId: result.uid,
            email: result.email,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (data && data.subscriptionActive === true) {
          navigate('/dashboard');
        } else {
          setShowPopup(true);
          scrollToPayments();
        }
      } catch (error) {
        setShowPopup(true);
        scrollToPayments();
      }
    } catch (error) {
      console.error('Error en el proceso de login:', error);
      toast.error('Error al iniciar sesión con Google. Inténtalo de nuevo.');
    } finally {
      setIsSigningIn(false);
    }
  };
  
  const scrollToPayments = () => {
    const paymentSection = document.querySelector('#planes');
    if (paymentSection) {
      paymentSection.scrollIntoView({ behavior: 'smooth' });
    }
    // Cerrar el pop-up tras desplazarse
    setTimeout(() => setShowPopup(false), 8000);
  };

  function calculateTimeLeft() {
    const targetDate = new Date('2027-01-23T00:00:00');
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

  const [eirTimeLeft, setEirTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setEirTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handlePlanSelection = async (plan, amount) => {
    try {
      // Verificar si el usuario está autenticado
      if (!currentUser) {
        console.log("Usuario no autenticado, iniciando proceso de login antes de seleccionar plan");
        toast.info('Primero debes iniciar sesión para seleccionar un plan');
        
        // Guardar el plan seleccionado para usarlo después del login
        localStorage.setItem('selectedPlan', JSON.stringify({ plan, amount }));
        
        // Iniciar el proceso de login
        await handleLoginClick();
        return;
      }
      
      // VERIFICACIÓN ADICIONAL: Comprobar que tenemos los datos mínimos
      if (!currentUser.uid || !currentUser.email) {
        console.error('❌ DATOS DE USUARIO INCOMPLETOS:', currentUser);
        toast.error('Error: Datos de usuario incompletos. Inténtalo de nuevo.');
        return;
      }
      
      console.log(`Usuario autenticado (${currentUser.uid}), procesando plan ${plan} por €${amount/100}`);
      
      // DEBUG: Mostrar todos los datos del usuario
      console.log('🔍 DATOS DEL USUARIO:', {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        currentUser: currentUser
      });
      
      const paymentData = {
        userId: currentUser.uid,
        email: currentUser.email,
        userName: currentUser.displayName || currentUser.uid,
        plan,
        amount,
      };
      
      console.log('💳 DATOS ENVIADOS AL BACKEND:', paymentData);
      
      // Crear sesión de checkout en Stripe
      const response = await axios.post(`${API_URL}/create-payment-intent`, paymentData);
  
      if (response.data && response.data.checkoutUrl) {
        console.log("URL de checkout recibida:", response.data.checkoutUrl);
        // Redirigir a la página de pago de Stripe
        window.location.href = response.data.checkoutUrl;
      } else {
        console.error("Respuesta inesperada:", response.data);
        toast.error('Error al procesar el pago. Inténtalo de nuevo.');
        throw new Error('No se recibió una URL de Stripe válida.');
      }
    } catch (error) {
      console.error('Error en el flujo de selección de plan:', error);
      toast.error('Hubo un problema al procesar el plan. Inténtalo de nuevo.');
    }
  };

  // Inicializar AOS (sin llamadas a API que interfieren)
  useEffect(() => {
    AOS.init({ duration: 1200, once: true });
  }, []);

  const scrollToPricing = () => {
    const pricingSection = document.querySelector('#planes');
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Efecto para verificar si hay un plan pendiente después del login
  useEffect(() => {
    // Si el usuario acaba de autenticarse y hay un plan guardado en localStorage
    if (currentUser && !isSigningIn) {
      try {
        const savedPlan = localStorage.getItem('selectedPlan');
        if (savedPlan) {
          const { plan, amount } = JSON.parse(savedPlan);
          console.log(`Usuario autenticado con plan pendiente: ${plan}`);
          
          // Limpiar el localStorage
          localStorage.removeItem('selectedPlan');
          
          // Ejecutar la selección de plan
          handlePlanSelection(plan, amount);
        }
      } catch (error) {
        console.error('Error al procesar plan guardado:', error);
      }
    }
  }, [currentUser, isSigningIn]);

  const renderActionButtons = () => {
    if (currentUser) {
      return (
          <button 
            onClick={handleLoginClick}
          className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-full font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            aria-label="Comenzar simulacro"
          >
          Entrar en Simulia
          <span>→</span>
          </button>
      );
    } else {
      return (
                      <button
              onClick={handleLoginClick} 
          className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-full font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
              disabled={isSigningIn}
              aria-label="Comenzar simulacro"
            >
          {isSigningIn ? 'Iniciando sesión...' : 'Haz tu simulacro EIR'}
          {!isSigningIn && <span>→</span>}
            </button>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/20 to-background">
      <Helmet>
        <title>Simulia - Plataforma de Preparación EIR | Simulacros y Exámenes</title>
        <meta name="description" content="Plataforma especializada en preparación para el examen EIR. Simulacros, exámenes, protocolos y análisis de errores para enfermeros. Prepárate de forma eficaz con nuestra plataforma especializada." />
        <meta name="robots" content="index, follow" />
        <meta name="keywords" content="EIR, examen EIR, preparación EIR, simulacros EIR, protocolos EIR, enfermería, oposiciones enfermería, Simulia, análisis errores EIR" />
        <meta name="author" content="Simulia" />
        
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Simulia - Plataforma de Preparación EIR" />
        <meta property="og:description" content="Plataforma especializada en preparación para el examen EIR. Simulacros, exámenes, protocolos y análisis de errores para enfermeros. Prepárate de forma eficaz." />
        <meta property="og:image" content="https://www.simulia.es/Logo_oscuro.png" />
        <meta property="og:url" content="https://www.simulia.es" />
        <meta property="og:site_name" content="Simulia" />
        
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content="Simulia - Plataforma de Preparación EIR" />
        <meta property="twitter:description" content="Plataforma especializada en preparación para el examen EIR. Simulacros, exámenes, protocolos y análisis de errores para enfermeros." />
        <meta property="twitter:image" content="https://www.simulia.es/Logo_oscuro.png" />
        <meta property="twitter:url" content="https://www.simulia.es" />
        <html lang="es" />
        <script type="application/ld+json">
    {`
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "Simulia",
        "applicationCategory": "EducationApplication",
        "operatingSystem": "All",
        "url": "https://www.simulia.es",
        "description": "Simulacros EIR en línea para enfermería con análisis por IA",
        "screenshot": "https://www.simulia.es/img/dashboard.png",
        "offers": {
          "@type": "Offer",
          "price": "7.99",
          "priceCurrency": "EUR"
        }
      }
    `}
  </script>
        <script type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "¿Por qué practicar con simulacros EIR mejora tus resultados reales?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Practicar con simulacros realistas te entrena bajo presión, mejora tu memoria y te prepara para enfrentarte al examen EIR con seguridad y estrategia."
                  }
                },
                {
                  "@type": "Question",
                  "name": "¿Cuántas preguntas incluye Simulia y con qué frecuencia se actualizan?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Dispones de más de 5000 preguntas EIR y cada semana se incorporan nuevas. Así estudias con material actualizado, útil y alineado con los exámenes reales."
                  }
                },
                {
                  "@type": "Question",
                  "name": "¿Qué tipo de análisis obtengo después de cada simulacro?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Recibirás estadísticas detalladas de tu rendimiento, podrás revisar cada error y entender por qué fallaste. Así conviertes tus errores en tus mejores aliados."
                  }
                },
                {
                  "@type": "Question",
                  "name": "¿Puedo centrarme en las asignaturas que más me cuestan?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Sí, puedes practicar por asignaturas específicas para reforzar justo donde lo necesitas. Tú eliges el enfoque de estudio según tu evolución."
                  }
                },
                {
                  "@type": "Question",
                  "name": "¿Simulia es compatible con móviles, tablets y ordenadores?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Totalmente. Accede desde cualquier dispositivo y estudia donde quieras, cuando quieras, sin perder tu progreso."
                  }
                },
                {
                  "@type": "Question",
                  "name": "¿En qué se diferencia Simulia de otras plataformas EIR?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Aquí no hay clases ni profesores: la diferencia está en que entrenas de forma constante y autónoma con simulacros realistas, sin distracciones."
                  }
                },
                {
                  "@type": "Question",
                  "name": "¿Cómo me ayuda Simulia a conseguir mi plaza en el EIR?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Te prepara con la misma presión y estructura del examen real. Cuanto más practicas, más confianza y dominio tienes el día clave."
                  }
                },
                {
                  "@type": "Question",
                  "name": "¿Las preguntas están alineadas con los exámenes oficiales del EIR?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Sí. Todas las preguntas están inspiradas en exámenes anteriores y protocolos actualizados del Ministerio de Sanidad."
                  }
                }
              ]
            }
          `}
        </script>
      </Helmet>
    <nav className="sticky top-0 z-50 border-b bg-secondary/95 backdrop-blur supports-[backdrop-filter]:bg-secondary/80 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/Logo_oscuro.png" alt="Logo Simulia" className="h-12 w-12 object-contain" />
              <span className="text-xl font-bold text-primary">SIMULIA</span>
            </div>

            <div className="hidden md:flex items-center gap-6">
              <a href="/blog" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
                Blog
              </a>
              {renderActionButtons()}
            </div>

            <button 
              className="md:hidden text-white text-2xl focus:outline-none" 
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              aria-label="Menú móvil"
            >
              {showMobileMenu ? '✕' : '☰'}
            </button>
          </div>
          
          {/* Menú móvil desplegable */}
          {showMobileMenu && (
            <div className="md:hidden border-t border-white/20 bg-secondary/98 backdrop-blur">
              <div className="px-4 py-4 space-y-4">
                <a 
                  href="/blog" 
                  className="block text-sm font-medium text-white/80 hover:text-white transition-colors py-2"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Blog
                </a>
                <div onClick={() => setShowMobileMenu(false)}>
                  {currentUser ? (
                    <button 
                      onClick={handleLoginClick}
                      className="w-full bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-full font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                      aria-label="Comenzar simulacro"
                    >
                      Entrar en Simulia
                      <span>→</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleLoginClick} 
                      className="w-full bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-full font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      disabled={isSigningIn}
                      aria-label="Comenzar simulacro"
                    >
                      {isSigningIn ? 'Iniciando sesión...' : 'Haz tu simulacro EIR'}
                      {!isSigningIn && <span>→</span>}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
    </nav>
      {showPopup && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 max-w-md mx-4 p-6 bg-card border border-primary shadow-xl rounded-lg">
          <p className="text-center font-medium text-foreground">
            Para acceder a los simulacros, necesitas una suscripción activa.
          </p>
          <p className="text-center text-sm text-muted-foreground mt-2">
            Selecciona un plan para comenzar tu preparación.
          </p>
        </div>
      )}
      <section className="bg-primary/10 border-y border-primary/20 py-3">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-medium text-secondary">
            <div className="flex items-center gap-2">
              <span className="text-lg">✓</span>
              <span>Creado por y para enfermeras que preparan el EIR</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">✓</span>
              <span>Basado en exámenes oficiales del EIR y fuentes fiables</span>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-8">
        <div className="max-w-5xl mx-auto space-y-8 text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-balance text-secondary">
            Entrena el EIR como si ya estuvieras dentro del examen.
            </h1>
            <div className="inline-flex items-center justify-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-5 py-2 text-sm font-medium text-secondary">
              <span className="text-lg">⏳</span>
              <span>
                Quedan <span className="text-primary font-bold">{eirTimeLeft.days || 0}</span> días para el EIR 2027
              </span>
            </div>
            <p className="text-lg sm:text-xl text-foreground leading-relaxed">
            Más de 15.000 preguntas para que puedas hacer exámenes completos cada semana hasta el EIR, sin repetir y con exámanes basados en los errores cometidos.            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { icon: "📝", title: "Simulacro oficial EIR", desc: "Réplica exacta del examen real incluyendo preguntas con imágenes" },
                { icon: "🔄", title: "Repetición errores", desc: "Repite todos los errores que cometiste en el simulacro hasta dominarlos" },
                { icon: "⏱️", title: "Contrarreloj", desc: "Entrena bajo presión y mejora tu velocidad de respuesta de cara al EIR" },
                { icon: "🔍", title: "Quiz 50 preguntas", desc: "Sesiones rápidas de práctica que se adaptan a lo que necesitas" },
                { icon: "✏️", title: "Examen personalizado", desc: "Tu examen, tu manera de estudiar. Practica solo lo que necesites" },
                { icon: "📋", title: "Protocolos clínicos", desc: "Protocolos, guías clínicas y novedades emtidas por el ministerio que son susceptibles de ser preguntas en el EIR" },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-4 rounded-xl border-2 border-border bg-card hover:bg-accent/5 hover:border-primary/50 transition-all cursor-pointer group shadow-sm hover:shadow-md relative"
                  title={item.desc}
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">{item.icon}</span>
                  <span className="text-sm font-semibold text-secondary">{item.title}</span>
                  <span className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-secondary text-white text-xs rounded-lg opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 whitespace-nowrap z-10">
                    {item.desc}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-start">
              <div className="flex-1 sm:flex-initial max-w-md w-full">
                <button
                  className="w-full bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-full font-bold shadow-lg hover:shadow-xl transition-all text-base flex items-center justify-center gap-2 animate-pulse-subtle"
                  onClick={() => {
                    const pricingSection = document.querySelector('#planes');
                    pricingSection?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  aria-label="Comenzar prueba gratuita"
                >
                  Haz tu primer simulacro gratis
                  <span className="text-xl">→</span>
                </button>
              </div>
              <div className="flex-1 sm:flex-initial max-w-md w-full flex flex-col items-center gap-2">
                <button
                  onClick={() => setShowDemoModal(true)}
                  className="w-full border-2 border-primary text-primary hover:bg-primary/5 px-8 py-4 rounded-full font-semibold shadow-md hover:shadow-lg transition-all text-base"
                  aria-label="Ver Simulia en acción"
                >
                  Ver Simulia en acción
                </button>
                <p className="text-xs text-muted-foreground text-center">
                  Haz un mini simulacro de prueba antes de registrarte
                </p>
              </div>
            </div>
        </div>
      </section>
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-gradient-to-br from-primary/10 to-accent/5 rounded-2xl border-2 border-primary/20 p-8 lg:p-12">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-4xl lg:text-5xl font-bold text-primary">+15.000</div>
              <div className="text-base text-foreground font-medium">preguntas EIR</div>
              <div className="text-sm text-muted-foreground">Clasificadas por asignaturas y años de examen</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl lg:text-5xl font-bold text-primary">+70</div>
              <div className="text-base text-foreground font-medium">simulacros distintos</div>
              <div className="text-sm text-muted-foreground">Podrás practicar sin repetir preguntas</div>
            </div>
            <div className="space-y-2">
              <div className="text-4xl lg:text-5xl font-bold text-primary">∞</div>
              <div className="text-base text-foreground font-medium">repeticiones de tus fallos</div>
              <div className="text-sm text-muted-foreground">Practica tus errores sin límite gracias al banco de errores</div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-balance text-secondary">
            Elige tu modalidad de entrenamiento, mejora justo donde lo necesitas
          </h2>
          <p className="text-lg sm:text-xl text-foreground leading-relaxed">
            Cada estudiante es diferente. Por eso, Simulia te ofrece varios modos de examen: desde simulacros oficiales
            hasta entrenamientos contrarreloj, test rápidos o prácticas con protocolos clínicos actualizados.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <div className="rounded-xl border border-border hover:border-primary/50 transition-all shadow-md hover:shadow-xl bg-card p-6">
            <div className="flex items-start gap-4">
              <svg className="w-12 h-12 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="#3e5156">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <div className="space-y-2 flex-1">
                <h3 className="text-xl font-bold text-secondary">Entrena como quieras, mejora como nunca</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Test rápidos de 50 preguntas, entrenamientos contrarreloj, exámenes personalizados y protocolos clínicos.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border hover:border-primary/50 transition-all shadow-md hover:shadow-xl bg-card p-6">
            <div className="flex items-start gap-4">
              <svg className="w-12 h-12 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="#3e5156">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <div className="space-y-2 flex-1">
                <h3 className="text-xl font-bold text-secondary">Convierte cada error en una oportunidad</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Te mostramos en qué destacas y qué necesitas reforzar. Cada fallo se convierte en oportunidad de mejora.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border hover:border-primary/50 transition-all shadow-md hover:shadow-xl bg-card p-6">
            <div className="flex items-start gap-4">
              <svg className="w-12 h-12 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="#3e5156">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="space-y-2 flex-1">
                <h3 className="text-xl font-bold text-secondary">Estadísticas que te hacen avanzar</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Sin distracciones, sin clases interminables. Solo práctica, solo resultados. Tú decides cómo avanzar.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border hover:border-primary/50 transition-all shadow-md hover:shadow-xl bg-card p-6">
            <div className="flex items-start gap-4">
              <svg className="w-12 h-12 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="#3e5156">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <div className="space-y-2 flex-1">
                <h3 className="text-xl font-bold text-secondary">Simula el examen real, sin sorpresas</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Entrena con condiciones reales: sin pausas, con tiempo, imágenes y textos con el mismo formato del EIR.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border hover:border-primary/50 transition-all shadow-md hover:shadow-xl bg-card p-6">
            <div className="flex items-start gap-4">
              <svg className="w-12 h-12 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="#3e5156">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <div className="space-y-2 flex-1">
                <h3 className="text-xl font-bold text-secondary">Descarga en PDF para practicar en papel</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Descarga tus exámenes en PDF para practicar como si fuera el examen real, sin conexión y donde quieras.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border hover:border-primary/50 transition-all shadow-md hover:shadow-xl bg-card p-6">
            <div className="flex items-start gap-4">
              <svg className="w-12 h-12 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="#3e5156">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <div className="space-y-2 flex-1">
                <h3 className="text-xl font-bold text-secondary">Tu profesor IA personalizado</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Recibe feedback inteligente, análisis de tus métricas y consejos personalizados para mejorar tu preparación.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>


      <section className="py-16 lg:py-24 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-4 mb-12">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-secondary">
              Lo que dicen nuestros estudiantes
            </h2>
            <p className="text-lg text-muted-foreground">
              Descubre las experiencias de quienes ya están preparando su plaza con Simulia
            </p>
          </div>

          <div className="relative overflow-hidden">
            <div className="flex gap-6 animate-scroll">
              {[
                { label: "Estadísticas que te orientan", text: "Detecta en qué fallas y prioriza lo que más te frena. Más claridad, menos dudas.", image: "/estadisticas-eir.png" },
                { label: "Analiza tus errores", text: "Revisa tus fallos y conviértelos en un plan de mejora concreto para la siguiente semana.", image: "/analisis-errores-eir.png" },
                { label: "Práctica realista", text: "Entrena con simulacros con tiempo, imágenes y formato similar al examen EIR.", image: "/simulacro-condiciones-reales-eir.png" },
                { label: "Exámenes sin repetición", text: "Practica con una ruta de estudio que evita el \"aprender de memoria\" y te obliga a dominar.", image: "/practica-ilimitada-eir.png" },
                { label: "Protocolos clínicos útiles", text: "Accede a guías y protocolos en línea para reforzar justo donde aparecen preguntas.", image: "/examen-protocolos-eir.png" },
                { label: "Dashboard completo", text: "Ten todo tu progreso a mano: exámenes, errores, rachas y decisiones de estudio.", image: "/Dashboard-EIR-Simulia.png" },
              ].concat([
                { label: "Estadísticas que te orientan", text: "Detecta en qué fallas y prioriza lo que más te frena. Más claridad, menos dudas.", image: "/estadisticas-eir.png" },
                { label: "Analiza tus errores", text: "Revisa tus fallos y conviértelos en un plan de mejora concreto para la siguiente semana.", image: "/analisis-errores-eir.png" },
                { label: "Práctica realista", text: "Entrena con simulacros con tiempo, imágenes y formato similar al examen EIR.", image: "/simulacro-condiciones-reales-eir.png" },
                { label: "Exámenes sin repetición", text: "Practica con una ruta de estudio que evita el \"aprender de memoria\" y te obliga a dominar.", image: "/practica-ilimitada-eir.png" },
                { label: "Protocolos clínicos útiles", text: "Accede a guías y protocolos en línea para reforzar justo donde aparecen preguntas.", image: "/examen-protocolos-eir.png" },
                { label: "Dashboard completo", text: "Ten todo tu progreso a mano: exámenes, errores, rachas y decisiones de estudio.", image: "/Dashboard-EIR-Simulia.png" },
              ]).map((testimonial, idx) => (
                <div key={idx} className="flex-shrink-0 w-80 border border-border hover:border-primary/50 transition-all shadow-md hover:shadow-lg bg-card rounded-xl">
                  <div className="p-6 space-y-4">
                    <img
                      src={testimonial.image}
                      alt={testimonial.label}
                      className="w-full h-28 object-cover rounded-lg border border-border"
                      loading="lazy"
                    />
                    <p className="text-muted-foreground italic leading-relaxed">"{testimonial.text}"</p>
                    <p className="font-semibold text-secondary">{testimonial.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="planes" className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="max-w-3xl mx-auto text-center space-y-6 mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-secondary">
            Elige tu plan, elige tu preparación, elige tu plaza
          </h2>
          <p className="text-lg sm:text-xl text-foreground">
            Selecciona el plan que mejor se adapte a tus necesidades y empieza tu preparación hoy mismo.
          </p>
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-6 py-2 text-sm font-medium text-secondary">
            <span className="text-lg">🔥</span>
            <span>Únete ya a los enfermeros dentro de Simulia</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <div className="bg-card border-2 border-border hover:border-primary/50 transition-all shadow-lg hover:shadow-xl rounded-xl p-8 space-y-6">
            <div>
              <h3 className="text-2xl font-bold mb-2 text-secondary">Explora sin presión</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-primary">11,99 €</span>
                <span className="text-muted-foreground text-lg">/mes</span>
              </div>
            </div>

            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-success text-xl mt-0.5">✓</span>
                <span className="text-secondary">Flexibilidad total, cancela cuando quieras</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-success text-xl mt-0.5">✓</span>
                <span className="text-secondary">7 días gratis para probar</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-success text-xl mt-0.5">✓</span>
                <span className="text-secondary">Acceso a simulacros y modos de práctica</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-success text-xl mt-0.5">✓</span>
                <span className="text-secondary">Actualizaciones de preguntas y contenido de práctica</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-destructive text-xl mt-0.5">✗</span>
                <span className="text-secondary">Biblioteca de Recursos (guías/plantillas) - no incluida en mensual nueva desde hoy</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-destructive text-xl mt-0.5">✗</span>
                <span className="text-secondary">Comunidad completa - no incluida en mensual nueva desde hoy</span>
              </li>
            </ul>

            <p className="text-xs text-muted-foreground mt-1">
              Para suscripciones mensuales nuevas: Recursos y Comunidad quedan incluidos en el plan Anual.
            </p>

            <button
              onClick={() => handlePlanSelection('mensual', 1199)}
              className="w-full border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all bg-transparent py-3 rounded-full font-semibold shadow-md hover:shadow-lg"
            > 
              Comenzar prueba gratuita
            </button>
          </div>

          <div className="bg-card border-2 border-primary relative shadow-xl hover:shadow-2xl transition-all bg-gradient-to-br from-card to-primary/5 rounded-xl p-8 pt-12 md:pt-8 space-y-6">
            <div className="absolute -top-3 md:-top-4 left-1/2 -translate-x-1/2 z-10">
              <div className="flex flex-col items-center gap-1">
                <span className="bg-primary text-primary-foreground px-4 md:px-6 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-semibold shadow-lg whitespace-nowrap">
                  Más popular • Ahorra 84 €
                </span>
              </div>
            </div>
            <div className="mt-2 md:mt-0">
              <h3 className="text-2xl font-bold mb-2 text-secondary">Voy a por la plaza</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-primary">59,99 €</span>
                <span className="text-muted-foreground text-lg">/año</span>
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                <span className="line-through">143,88 €</span> • Equivale a 4,99 €/mes
              </div>
            </div>

            <div className="bg-primary/10 rounded-xl p-6 border border-primary/20">
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-success text-xl mt-0.5">✓</span>
                  <span className="text-secondary">Acceso completo durante todo el año</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-success text-xl mt-0.5">✓</span>
                  <span className="text-secondary">7 días gratis para probar</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-success text-xl mt-0.5">✓</span>
                  <span className="text-secondary">Biblioteca de Recursos (guías/plantillas)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-success text-xl mt-0.5">✓</span>
                  <span className="text-secondary">Comunidad completa</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-success text-xl mt-0.5">✓</span>
                  <span className="text-secondary">Ahorra 84 € al año (vs 11,99 € × 12)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-success text-xl mt-0.5">✓</span>
                  <span className="text-secondary">Actualizaciones de preguntas y contenido de práctica</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handlePlanSelection('anual', 5999)}
              className="w-full bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all text-white py-3 rounded-full font-bold animate-pulse-subtle"
            >
              Comenzar prueba gratuita
            </button>
          </div>
        </div>

      </section>

      <section id="faq" className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center mb-12 text-secondary">
            Preguntas Frecuentes
          </h2>

          <div className="space-y-4">
            <div className="border-2 border-border hover:border-primary/50 rounded-xl px-6 transition-all shadow-sm hover:shadow-md bg-card">
              <details className="py-4">
                <summary className="text-left hover:no-underline text-secondary font-semibold cursor-pointer">
                  ¿Por qué practicar con simulacros EIR mejora tus resultados reales?
                </summary>
                <p className="text-muted-foreground leading-relaxed text-base mt-4 pb-4">
                  Practicar con simulacros realistas te entrena bajo presión, mejora tu memoria y te prepara para enfrentarte al examen EIR con seguridad y estrategia.
                </p>
              </details>
            </div>

            <div className="border-2 border-border hover:border-primary/50 rounded-xl px-6 transition-all shadow-sm hover:shadow-md bg-card">
              <details className="py-4">
                <summary className="text-left hover:no-underline text-secondary font-semibold cursor-pointer">
                  ¿Cuántas preguntas incluye Simulia y con qué frecuencia se actualizan?
                </summary>
                <p className="text-muted-foreground leading-relaxed text-base mt-4 pb-4">
                  Dispones de más de 5000 preguntas EIR y cada semana se incorporan nuevas. Así estudias con material actualizado, útil y alineado con los exámenes reales.
                </p>
              </details>
            </div>

            <div className="border-2 border-border hover:border-primary/50 rounded-xl px-6 transition-all shadow-sm hover:shadow-md bg-card">
              <details className="py-4">
                <summary className="text-left hover:no-underline text-secondary font-semibold cursor-pointer">
                  ¿Qué tipo de análisis obtengo después de cada simulacro?
                </summary>
                <p className="text-muted-foreground leading-relaxed text-base mt-4 pb-4">
                  Recibirás estadísticas detalladas de tu rendimiento, podrás revisar cada error y entender por qué fallaste. Así conviertes tus errores en tus mejores aliados.
                </p>
              </details>
            </div>

            <div className="border-2 border-border hover:border-primary/50 rounded-xl px-6 transition-all shadow-sm hover:shadow-md bg-card">
              <details className="py-4">
                <summary className="text-left hover:no-underline text-secondary font-semibold cursor-pointer">
                  ¿Puedo centrarme en las asignaturas que más me cuestan?
                </summary>
                <p className="text-muted-foreground leading-relaxed text-base mt-4 pb-4">
                  Sí, puedes practicar por asignaturas específicas para reforzar justo donde lo necesitas. Tú eliges el enfoque de estudio según tu evolución.
                </p>
              </details>
            </div>

            <div className="border-2 border-border hover:border-primary/50 rounded-xl px-6 transition-all shadow-sm hover:shadow-md bg-card">
              <details className="py-4">
                <summary className="text-left hover:no-underline text-secondary font-semibold cursor-pointer">
                  ¿Simulia es compatible con móviles, tablets y ordenadores?
                </summary>
                <p className="text-muted-foreground leading-relaxed text-base mt-4 pb-4">
                  Totalmente. Accede desde cualquier dispositivo y estudia donde quieras, cuando quieras, sin perder tu progreso.
                </p>
              </details>
            </div>

            <div className="border-2 border-border hover:border-primary/50 rounded-xl px-6 transition-all shadow-sm hover:shadow-md bg-card">
              <details className="py-4">
                <summary className="text-left hover:no-underline text-secondary font-semibold cursor-pointer">
                  ¿Las preguntas están alineadas con los exámenes oficiales del EIR?
                </summary>
                <p className="text-muted-foreground leading-relaxed text-base mt-4 pb-4">
                  Sí. Todas las preguntas están inspiradas en exámenes anteriores y protocolos actualizados del Ministerio de Sanidad.
                </p>
              </details>
            </div>
          </div>
        </div>
      </section>
      <footer className="bg-secondary text-secondary-foreground">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="text-center space-y-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">Contacto</h2>
              <p className="text-secondary-foreground/80 mb-6 text-base sm:text-lg max-w-2xl mx-auto">
                ¿Tienes dudas o necesitas ayuda? Estamos aquí para ti. Escríbenos y te responderemos lo antes posible.
              </p>
              <a
                href="mailto:simuliaproject@simulia.es"
                className="inline-block bg-primary/20 hover:bg-primary hover:text-white px-8 py-3 rounded-full transition-all font-medium shadow-md hover:shadow-lg"
              >
                simuliaproject@simulia.es
              </a>
            </div>

            <div className="border-t border-secondary-foreground/20 pt-8 space-y-4">
              <p className="text-sm text-secondary-foreground/70">
                © {new Date().getFullYear()} Simulia – Todos los derechos reservados
              </p>
              <div className="flex flex-wrap justify-center gap-6 text-sm">
                <a href="/aviso-legal" className="text-secondary-foreground/70 hover:text-primary transition-colors">
                  Aviso legal
                </a>
                <a
                  href="/politica-privacidad"
                  className="text-secondary-foreground/70 hover:text-primary transition-colors"
                >
                  Política de privacidad
                </a>
                <a
                  href="/terminos-condiciones"
                  className="text-secondary-foreground/70 hover:text-primary transition-colors"
                >
                  Términos y condiciones
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Demo Modal */}
      <DemoModal 
        isOpen={showDemoModal} 
        onClose={() => setShowDemoModal(false)} 
      />

    </div>
  );
}

export default HomePage;