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
import HeroShowcase from './components/HeroShowcase';


function HomePage() {
  const [data, setData] = useState('');
  const [preguntas, setPreguntas] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showHeroVideo, setShowHeroVideo] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showHeroVideoHint, setShowHeroVideoHint] = useState(false);
  const navigate = useNavigate();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const { logoSrc } = useLogo();
  const { currentUser, login, checkSubscription } = useAuth();
  
  // Estado para evitar verificar múltiples veces después del login
  const [checkedAfterLogin, setCheckedAfterLogin] = useState(false);

  useEffect(() => {
    AOS.init({
      duration: 600,
      easing: 'ease-out-cubic',
      once: true,
      offset: 40,
      disable: window.innerWidth <= 480,
    });
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

  const HERO_VIDEO_YT_ID = 'mq2DUm4h7r4';
  const HERO_VIDEO_THUMB_URL = `https://img.youtube.com/vi/${HERO_VIDEO_YT_ID}/hqdefault.jpg`;

  useEffect(() => {
    if (!showHeroVideo) return;
    // Mostrar un "hint" corto para que se entienda que el video ya está reproduciéndose.
    setShowHeroVideoHint(true);
    const t = setTimeout(() => setShowHeroVideoHint(false), 2600);
    return () => clearTimeout(t);
  }, [showHeroVideo]);
  
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
        <title>Simulia – Simulacros EIR con IA | Prepara tu plaza</title>
        <meta name="description" content="Prepara el EIR con simulacros reales, análisis de errores por IA y +15.000 preguntas. Practica sin límite desde cualquier dispositivo." />
        <meta name="robots" content="index, follow" />
        <meta name="keywords" content="EIR, examen EIR, preparación EIR, simulacros EIR, protocolos EIR, enfermería, oposiciones enfermería, Simulia, análisis errores EIR" />
        <meta name="author" content="Simulia" />

        <meta property="og:type" content="website" />
        <meta property="og:title" content="Simulia - Plataforma de Preparación EIR" />
        <meta property="og:description" content="Plataforma especializada en preparación para el examen EIR. Simulacros, exámenes, protocolos y análisis de errores para enfermeros. Prepárate de forma eficaz." />
        <meta property="og:image" content="https://www.simulia.es/Dashboard-EIR-Simulia.png" />
        <meta property="og:url" content="https://www.simulia.es" />
        <meta property="og:site_name" content="Simulia" />

        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content="Simulia - Plataforma de Preparación EIR" />
        <meta property="twitter:description" content="Plataforma especializada en preparación para el examen EIR. Simulacros, exámenes, protocolos y análisis de errores para enfermeros." />
        <meta property="twitter:image" content="https://www.simulia.es/Dashboard-EIR-Simulia.png" />
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
        "screenshot": "https://www.simulia.es/Dashboard-EIR-Simulia.png",
        "offers": {
          "@type": "Offer",
          "price": "4.99",
          "priceCurrency": "EUR",
          "description": "Plan anual (59,99 €/año, equivalente a 4,99 €/mes)"
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
                  "name": "¿Puedo cancelar Simulia si no me convence en los primeros días?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Sí. Tienes 7 días de prueba gratuita y puedes cancelar en cualquier momento sin dar explicaciones. Sin permanencia, sin letra pequeña."
                  }
                },
                {
                  "@type": "Question",
                  "name": "¿Sirve Simulia si todavía no he visto todo el temario del EIR?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Totalmente. Puedes practicar por asignaturas y temas concretos, así que no necesitas haber estudiado todo para empezar. Practicar desde el principio te ayuda a asentar lo que vas aprendiendo."
                  }
                },
                {
                  "@type": "Question",
                  "name": "¿Qué diferencia hay entre Simulia y una academia EIR?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Una academia te da clases y temario (desde 1.500 €). Estudiar sola es gratis pero sin estructura. Simulia es el punto intermedio: práctica guiada con simulacros reales, análisis de errores con IA y estadísticas de progreso, desde 4,99 €/mes."
                  }
                },
                {
                  "@type": "Question",
                  "name": "¿Las preguntas de Simulia son como las del examen real del EIR?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Sí. Todas las preguntas están basadas en exámenes oficiales del Ministerio de Sanidad y protocolos actualizados. Los simulacros replican el formato exacto: 200 preguntas + 10 de reserva en 4 horas, con imágenes clínicas."
                  }
                },
                {
                  "@type": "Question",
                  "name": "¿Puedo usar Simulia desde el móvil?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Sí, funciona en móvil, tablet y ordenador. Tu progreso se sincroniza entre dispositivos, así que puedes hacer un test rápido en el bus y un simulacro completo en casa."
                  }
                },
                {
                  "@type": "Question",
                  "name": "¿Cuántas preguntas tiene Simulia y se actualizan?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Más de 15.000 preguntas clasificadas por asignatura y año, con nuevas incorporaciones cada semana. Suficiente para hacer un simulacro completo cada semana durante todo el año sin repetir."
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
              <a href="/simulacro" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
                Simulacro EIR
              </a>
              <a href="/precios" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
                Precios
              </a>
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
                  href="/simulacro"
                  className="block text-sm font-medium text-white/80 hover:text-white transition-colors py-2"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Simulacro EIR
                </a>
                <a
                  href="/precios"
                  className="block text-sm font-medium text-white/80 hover:text-white transition-colors py-2"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Precios
                </a>
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
      <section data-aos="fade-up" className="bg-primary/10 border-y border-primary/20 py-3">
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

      <section data-aos="fade-up" className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="space-y-6 text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight text-balance text-secondary">
              Practica el EIR exactamente como lo vas a vivir, hasta que dejar de sorprenderte sea la norma.
            </h1>
            <div className="inline-flex items-center justify-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-5 py-2 text-sm font-medium text-secondary shadow-soft">
              <span className="text-lg">⏳</span>
              <span>
                Quedan <span className="text-primary font-bold">{eirTimeLeft.days || 0}</span> días para el EIR 2027
              </span>
            </div>
            <p className="text-lg sm:text-xl text-foreground leading-relaxed">
              Más de 15.000 preguntas para que puedas hacer exámenes completos cada semana hasta el EIR, sin repetir y con exámanes basados en los errores cometidos.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-start">
                <div className="flex-1 sm:flex-initial max-w-md w-full">
                  <button
                    className="w-full bg-primary hover:bg-primary/90 hover:scale-[1.02] text-white px-8 py-4 rounded-full font-bold shadow-soft hover:shadow-soft-lg transition-all duration-300 text-base flex items-center justify-center gap-2"
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

            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-md relative">
                <HeroShowcase />
                {!showHeroVideo ? (
                  <button
                    type="button"
                    onClick={() => setShowHeroVideo(true)}
                      className="relative w-full overflow-hidden rounded-3xl bg-card shadow-soft hover:shadow-soft-lg transition-all duration-300"
                    aria-label="Ver video de Simulia en acción"
                  >
                      <div className="p-[2px] rounded-3xl bg-gradient-to-r from-primary via-accent to-primary">
                        <div className="rounded-[1.15rem] overflow-hidden">
                          <div className="aspect-video relative">
                            <img
                              src={HERO_VIDEO_THUMB_URL}
                              alt="Video de Simulia"
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                              <div className="flex flex-col items-center gap-2">
                                <div className="h-14 w-14 rounded-full bg-white/90 flex items-center justify-center animate-pulse-subtle">
                                  <span className="text-2xl">▶</span>
                                </div>
                                <span className="text-white text-sm font-semibold px-4 text-center">
                                  Toca para ver
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                  </button>
                ) : (
                    <div className="relative w-full overflow-hidden rounded-3xl bg-card shadow-soft">
                      <div className="p-[2px] rounded-3xl bg-gradient-to-r from-primary via-accent to-primary">
                        <div className="rounded-[1.15rem] overflow-hidden">
                          <div className="aspect-video relative">
                            <iframe
                              className="absolute inset-0 w-full h-full"
                              src={`https://www.youtube.com/embed/${HERO_VIDEO_YT_ID}?autoplay=1&mute=1&rel=0`}
                              title="Simulia - Video"
                              frameBorder="0"
                              allow="autoplay; encrypted-media"
                              allowFullScreen
                            />
                            {showHeroVideoHint && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="backdrop-blur-sm bg-black/40 border border-white/20 px-5 py-3 rounded-full">
                                  <div className="flex items-center gap-2">
                                    <span className="text-white text-lg">▶</span>
                                    <span className="text-white/95 text-sm font-semibold">
                                      Video en marcha (sin sonido)
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section data-aos="fade-up" className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
              <div className="text-4xl lg:text-5xl font-bold text-primary">Sin límite</div>
              <div className="text-base text-foreground font-medium">repeticiones de tus fallos</div>
              <div className="text-sm text-muted-foreground">Practica tus errores sin límite gracias al banco de errores</div>
            </div>
          </div>
        </div>
      </section>

      <section data-aos="fade-up" className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
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

      <section data-aos="fade-up" className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
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

      <section data-aos="fade-up" id="modalidades" className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-10">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-balance text-secondary">
            7 modos de entrenamiento para cada momento
          </h2>
          <p className="text-lg text-muted-foreground">
            Elige cómo quieres practicar según el tiempo que tengas y lo que necesites reforzar
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {[
            { icon: "📝", title: "Simulacro oficial EIR", desc: "Réplica exacta del examen real incluyendo preguntas con imágenes", highlight: true },
            { icon: "🔄", title: "Repetición de errores", desc: "Repite todos los errores que cometiste hasta dominarlos" },
            { icon: "⏱️", title: "Contrarreloj", desc: "Entrena bajo presión y mejora tu velocidad de respuesta" },
            { icon: "🔍", title: "Quiz 50 preguntas", desc: "Sesiones rápidas de práctica adaptadas a ti" },
            { icon: "✏️", title: "Examen personalizado", desc: "Tu examen, tu manera de estudiar. Practica solo lo que necesites" },
            { icon: "📋", title: "Protocolos clínicos", desc: "Guías clínicas y novedades del ministerio susceptibles de ser preguntas EIR" },
            { icon: "⚖️", title: "Escalas clínicas", desc: "Practica con las principales escalas de valoración enfermera" },
          ].map((item, idx) => (
            <div
              key={idx}
              className={`flex flex-col items-center text-center gap-2 p-5 rounded-xl border-2 transition-all cursor-pointer group shadow-sm hover:shadow-md ${
                item.highlight
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border bg-card hover:border-primary/50'
              }`}
              title={item.desc}
            >
              <span className="text-3xl group-hover:scale-110 transition-transform">{item.icon}</span>
              <span className="text-sm font-semibold text-secondary">{item.title}</span>
              {item.highlight && (
                <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full font-medium">Empieza aquí</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section data-aos="fade-up" className="py-16 lg:py-20 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center space-y-4 mb-10">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-secondary">
                ¿Esto realmente ayuda a aprobar?
              </h2>
              <p className="text-lg text-muted-foreground">
                Lo que marca la diferencia no es solo el contenido, sino cómo practicas
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-card border-2 border-border rounded-xl p-6 text-center space-y-3">
                <div className="text-4xl font-bold text-primary">+15.000</div>
                <p className="text-secondary font-semibold">preguntas basadas en exámenes oficiales</p>
                <p className="text-sm text-muted-foreground">Todas inspiradas en convocatorias reales del Ministerio de Sanidad y protocolos actualizados</p>
              </div>
              <div className="bg-card border-2 border-border rounded-xl p-6 text-center space-y-3">
                <div className="text-4xl font-bold text-primary">7 modos</div>
                <p className="text-secondary font-semibold">de práctica para cada momento</p>
                <p className="text-sm text-muted-foreground">Desde simulacros completos de 4h hasta quiz rápidos de 50 preguntas en el bus</p>
              </div>
              <div className="bg-card border-2 border-border rounded-xl p-6 text-center space-y-3">
                <div className="text-4xl font-bold text-primary">IA</div>
                <p className="text-secondary font-semibold">que analiza tus errores por ti</p>
                <p className="text-sm text-muted-foreground">Feedback personalizado después de cada simulacro para que sepas exactamente qué reforzar</p>
              </div>
            </div>
            <div className="mt-8 bg-card border-2 border-primary/20 rounded-xl p-6">
              <p className="text-center text-secondary leading-relaxed">
                Según datos del Ministerio de Sanidad, el EIR tiene una tasa de aprobados del ~85%. Los estudiantes que practican con simulacros desde el inicio desarrollan mejor gestión del tiempo, resistencia mental y estrategia de examen, los tres factores que más influyen en el resultado final.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section data-aos="fade-up" className="py-16 lg:py-24 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 max-w-5xl mx-auto mb-12">
            <div className="text-center sm:text-left">
              <p className="text-xs font-bold uppercase tracking-wide text-primary mb-2">Testimonios</p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-secondary">
                Así lo viven
              </h2>
              <p className="text-lg text-muted-foreground mt-2">
                Descubre las experiencias de quienes ya están preparando su plaza con Simulia
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden">
            <div className="flex gap-6 animate-scroll">
              {[
                { name: "María G.", context: "Convocatoria 2025", text: "Llevo 3 meses usando Simulia y he notado un cambio brutal. Antes me costaba mantener el ritmo, ahora hasta me divierto estudiando.", color: "bg-rose-200 text-rose-700" },
                { name: "Carlos R.", context: "Convocatoria 2025", text: "Me encanta que puedo estudiar en cualquier momento. Hacer test rápidos en el bus es ya mi rutina. El tiempo vuela.", color: "bg-amber-200 text-amber-700" },
                { name: "Ana M.", context: "Convocatoria 2024", text: "Las estadísticas me ayudaron a saber dónde fallaba y cómo mejorar cada día. Ahora estudio con más intención y seguridad.", color: "bg-sky-200 text-sky-700" },
                { name: "David L.", context: "Convocatoria 2025", text: "Lo que más me gusta es practicar por temas. Cuando flojeo en uno, le meto caña hasta que lo domino.", color: "bg-emerald-200 text-emerald-700" },
                { name: "Sofía P.", context: "Convocatoria 2024", text: "Me ha ayudado a organizarme mejor. Sé exactamente qué repasar y llegué súper tranquila al examen.", color: "bg-violet-200 text-violet-700" },
                { name: "Javier T.", context: "Convocatoria 2025", text: "Las preguntas son muy parecidas a las del examen real. Me da mucha seguridad saber que estoy practicando con algo que se parece tanto.", color: "bg-cyan-200 text-cyan-700" },
              ].concat([
                { name: "María G.", context: "Convocatoria 2025", text: "Llevo 3 meses usando Simulia y he notado un cambio brutal. Antes me costaba mantener el ritmo, ahora hasta me divierto estudiando.", color: "bg-rose-200 text-rose-700" },
                { name: "Carlos R.", context: "Convocatoria 2025", text: "Me encanta que puedo estudiar en cualquier momento. Hacer test rápidos en el bus es ya mi rutina. El tiempo vuela.", color: "bg-amber-200 text-amber-700" },
                { name: "Ana M.", context: "Convocatoria 2024", text: "Las estadísticas me ayudaron a saber dónde fallaba y cómo mejorar cada día. Ahora estudio con más intención y seguridad.", color: "bg-sky-200 text-sky-700" },
                { name: "David L.", context: "Convocatoria 2025", text: "Lo que más me gusta es practicar por temas. Cuando flojeo en uno, le meto caña hasta que lo domino.", color: "bg-emerald-200 text-emerald-700" },
                { name: "Sofía P.", context: "Convocatoria 2024", text: "Me ha ayudado a organizarme mejor. Sé exactamente qué repasar y llegué súper tranquila al examen.", color: "bg-violet-200 text-violet-700" },
                { name: "Javier T.", context: "Convocatoria 2025", text: "Las preguntas son muy parecidas a las del examen real. Me da mucha seguridad saber que estoy practicando con algo que se parece tanto.", color: "bg-cyan-200 text-cyan-700" },
              ]).map((testimonial, idx) => (
                <div key={idx} className="flex-shrink-0 w-80 border border-border hover:border-primary/50 transition-all shadow-md hover:shadow-lg bg-card rounded-xl">
                  <div className="p-6 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${testimonial.color}`}>
                        {testimonial.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-secondary leading-tight">{testimonial.name}</p>
                        <p className="text-xs text-muted-foreground">{testimonial.context}</p>
                      </div>
                    </div>
                    <div className="text-amber-400 text-sm tracking-tight" aria-label="5 de 5 estrellas">★★★★★</div>
                    <p className="text-muted-foreground leading-relaxed text-sm">{testimonial.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section data-aos="fade-up" id="quien-hay-detras" className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="max-w-3xl mx-auto bg-card border-2 border-border rounded-2xl p-8 sm:p-10 flex flex-col sm:flex-row items-center gap-8 text-center sm:text-left">
          <img
            src="/foto_cris_peris.JPG"
            alt="Cristina Peris, fundadora de Simulia"
            className="w-32 h-32 rounded-full object-cover object-top shadow-md flex-shrink-0"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-2">Quién hay detrás de Simulia</p>
            <h2 className="text-2xl font-bold text-secondary mb-3">Cristina Peris, enfermera y fundadora</h2>
            <p className="text-muted-foreground leading-relaxed">
              Simulia no lo ha hecho una empresa genérica de oposiciones: lo he construido yo, enfermera,
              porque quería la herramienta que a mí me habría gustado tener al preparar el EIR. Cada
              simulacro, cada pregunta y cada mejora sale de entender de primera mano por lo que estás pasando.
            </p>
          </div>
        </div>
      </section>

      <section data-aos="fade-up" id="planes" className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
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
                <span className="text-secondary">Flexibilidad total: cancela cuando quieras</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-success text-xl mt-0.5">✓</span>
                <span className="text-secondary">7 días gratis para probar sin compromiso</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-success text-xl mt-0.5">✓</span>
                <span className="text-secondary">Simulacros y modos de práctica (con tiempo e imágenes)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-success text-xl mt-0.5">✓</span>
                <span className="text-secondary">Actualizaciones de preguntas y contenido de práctica</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-destructive text-xl mt-0.5">✗</span>
                <span className="text-secondary">Biblioteca de Recursos (guías/plantillas)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-destructive text-xl mt-0.5">✗</span>
                <span className="text-secondary">Comunidad completa </span>
              </li>
            </ul>

            <button
              onClick={() => handlePlanSelection('mensual', 1199)}
              className="w-full bg-primary/10 border-2 border-primary text-primary hover:bg-primary hover:text-white transition-all py-3 rounded-full font-bold shadow-md hover:shadow-lg"
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
                  <span className="text-secondary">Biblioteca de Recursos (guías/plantillas) y materiales</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-success text-xl mt-0.5">✓</span>
                  <span className="text-secondary">Comunidad completa (dudas, presentaciones y recursos)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-success text-xl mt-0.5">✓</span>
                  <span className="text-secondary">Ahorra 84 € al año (vs 11,99 € × 12)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-success text-xl mt-0.5">✓</span>
                  <span className="text-secondary">Actualizaciones de preguntas y contenido de práctica durante todo el año</span>
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

      <section data-aos="fade-up" id="faq" className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center mb-12 text-secondary">
            Preguntas Frecuentes
          </h2>

          <div className="space-y-4">
            <div className="border-2 border-border hover:border-primary/50 rounded-xl px-6 transition-all shadow-sm hover:shadow-md bg-card">
              <details className="py-4" open>
                <summary className="text-left hover:no-underline text-secondary font-semibold cursor-pointer">
                  ¿Puedo cancelar si no me convence en los primeros días?
                </summary>
                <p className="text-muted-foreground leading-relaxed text-base mt-4 pb-4">
                  Sí. Tienes 7 días de prueba gratuita y puedes cancelar en cualquier momento sin dar explicaciones. Sin permanencia, sin letra pequeña.
                </p>
              </details>
            </div>

            <div className="border-2 border-border hover:border-primary/50 rounded-xl px-6 transition-all shadow-sm hover:shadow-md bg-card">
              <details className="py-4">
                <summary className="text-left hover:no-underline text-secondary font-semibold cursor-pointer">
                  ¿Sirve si todavía no he visto todo el temario?
                </summary>
                <p className="text-muted-foreground leading-relaxed text-base mt-4 pb-4">
                  Totalmente. Puedes practicar por asignaturas y temas concretos, así que no necesitas haber estudiado todo para empezar. De hecho, practicar desde el principio te ayuda a asentar lo que vas aprendiendo.
                </p>
              </details>
            </div>

            <div className="border-2 border-border hover:border-primary/50 rounded-xl px-6 transition-all shadow-sm hover:shadow-md bg-card">
              <details className="py-4">
                <summary className="text-left hover:no-underline text-secondary font-semibold cursor-pointer">
                  ¿Qué diferencia hay con una academia o estudiar por mi cuenta?
                </summary>
                <p className="text-muted-foreground leading-relaxed text-base mt-4 pb-4">
                  Una academia te da clases y temario (desde 1.500 €). Estudiar sola es gratis pero sin estructura. Simulia es el punto intermedio: práctica guiada con simulacros reales, análisis de errores con IA y estadísticas de progreso, desde 4,99 €/mes.
                </p>
              </details>
            </div>

            <div className="border-2 border-border hover:border-primary/50 rounded-xl px-6 transition-all shadow-sm hover:shadow-md bg-card">
              <details className="py-4">
                <summary className="text-left hover:no-underline text-secondary font-semibold cursor-pointer">
                  ¿Las preguntas son como las del examen real?
                </summary>
                <p className="text-muted-foreground leading-relaxed text-base mt-4 pb-4">
                  Sí. Todas las preguntas están basadas en exámenes oficiales del Ministerio de Sanidad y protocolos actualizados. Los simulacros replican el formato exacto: 200 preguntas + 10 de reserva en 4 horas, con imágenes clínicas.
                </p>
              </details>
            </div>

            <div className="border-2 border-border hover:border-primary/50 rounded-xl px-6 transition-all shadow-sm hover:shadow-md bg-card">
              <details className="py-4">
                <summary className="text-left hover:no-underline text-secondary font-semibold cursor-pointer">
                  ¿Puedo usarla desde el móvil?
                </summary>
                <p className="text-muted-foreground leading-relaxed text-base mt-4 pb-4">
                  Sí, funciona en móvil, tablet y ordenador. Tu progreso se sincroniza entre dispositivos, así que puedes hacer un test rápido en el bus y un simulacro completo en casa.
                </p>
              </details>
            </div>

            <div className="border-2 border-border hover:border-primary/50 rounded-xl px-6 transition-all shadow-sm hover:shadow-md bg-card">
              <details className="py-4">
                <summary className="text-left hover:no-underline text-secondary font-semibold cursor-pointer">
                  ¿Cuántas preguntas hay y se actualizan?
                </summary>
                <p className="text-muted-foreground leading-relaxed text-base mt-4 pb-4">
                  Más de 15.000 preguntas clasificadas por asignatura y año, con nuevas incorporaciones cada semana. Suficiente para hacer un simulacro completo cada semana durante todo el año sin repetir.
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
                <a href="/simulacro" className="text-secondary-foreground/70 hover:text-primary transition-colors">
                  Simulacro EIR
                </a>
                <a href="/precios" className="text-secondary-foreground/70 hover:text-primary transition-colors">
                  Precios
                </a>
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
                <a
                  href="/cookies"
                  className="text-secondary-foreground/70 hover:text-primary transition-colors"
                >
                  Política de cookies
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