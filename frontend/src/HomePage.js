import React, { useEffect, useState } from 'react';
import './HomePage.css';
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
      console.log("🔄 Usuario autenticado detectado, verificando suscripción...");
      setCheckedAfterLogin(true);
      // En móvil, tras volver del redirect, esto decide adónde ir
      verifyUser();
    }
  }, [currentUser, checkedAfterLogin]);

  const verifyUser = async () => {
    try {
      console.log('Usuario actual:', currentUser?.uid);
      console.log('API_URL configurada:', API_URL);

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
      console.log('Datos recibidos:', data);

      if(data.error === 'Usuario no encontrado.') {
        scrollToPayments();
        setShowPopup(true);
        return;
      }

      if(data.subscriptionActive === true) {
        navigate('/dashboard');
        return;
      }

      // Si el usuario existe pero no tiene suscripción activa
      scrollToPayments();
      setShowPopup(true);

    } catch (error) {
      console.error('Error al verificar el usuario:', error.message);
      // En caso de error, mostrar opciones de pago
      scrollToPayments();
      setShowPopup(true);
    }
  };
  
  const handleLoginClick = async () => {
    try {
      console.log('🚀 INICIANDO PROCESO DE LOGIN...');
      console.log('📱 Dispositivo actual:', window.innerWidth, 'x', window.innerHeight);
      console.log('🔍 User Agent:', navigator.userAgent);
      console.log('🔍 Touch support:', 'ontouchstart' in window);
      console.log('🔍 Max touch points:', navigator.maxTouchPoints);
      console.log('🔍 Platform:', navigator.platform);
      
      setIsSigningIn(true);
      
      // NO forzar signOut antes de login (especialmente en móvil)
      // Esto puede interferir con la hidratación de Firebase
      console.log('🔐 Iniciando autenticación...');
      
      console.log('🔐 Llamando a signInWithGoogle...');
      
      // 1. Iniciar autenticación con Google (popup en desktop, redirección en móvil)
      const result = await signInWithGoogle();
      
      console.log('📊 Resultado de signInWithGoogle:', result);
      
      // En móviles, result puede ser null (redirección iniciada)
      if (!result) {
        console.log("✅ Autenticación iniciada por redirección (móvil)");
        console.log("ℹ️ El usuario será redirigido a Google y volverá automáticamente");
        
        // Nota: La redirección se manejará automáticamente en AuthContext
        
        // En móviles, no hacer nada más aquí, el resultado se manejará en el AuthContext
        return;
      }
      
      if (!result.uid) {
        console.error("Error en la autenticación con Google: no se obtuvo información del usuario");
        toast.error('Error al iniciar sesión con Google');
        return;
      }
      
      console.log("Firebase login exitoso:", result.uid);
      
      // 2. Verificar suscripción después de login exitoso (solo desktop)
      try {
        const response = await axios.post(`${API_URL}/users/check-subscription`, { 
          userId: result.uid,
          email: result.email
        });
        
        console.log("Verificación de suscripción:", response.data);
        const hasSubscription = response.data && response.data.hasSubscription === true;
        
        // 3. Redireccionar según corresponda
        if (hasSubscription) {
          console.log("Usuario con suscripción activa, redirigiendo al dashboard");
          navigate('/dashboard');
        } else {
          console.log("Usuario sin suscripción, mostrando planes");
          setShowPopup(true);
          scrollToPayments();
        }
      } catch (error) {
        console.error("Error en verificación de suscripción:", error);
        // Sin fallbacks automáticos: si no existe o 404, no se crea nada
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
    const paymentSection = document.querySelector('.pricing-section');
    if (paymentSection) {
      paymentSection.scrollIntoView({ behavior: 'smooth' });
    }
    // Cerrar el pop-up tras desplazarse
    setTimeout(() => setShowPopup(false), 8000);
  };

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
    const pricingSection = document.querySelector('.pricing-section');
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
        <div className="buttons-container">
          <button 
            onClick={handleLoginClick}
            className="main-action-btn"
            aria-label="Comenzar simulacro"
          >
            <span>Haz tu simulacro EIR</span>
            <i className="fa fa-arrow-right"></i>
          </button>
        </div>
      );
    } else {
      return (
        <div className="buttons-container">
                      <button
              onClick={handleLoginClick} 
              className="main-action-btn"
              disabled={isSigningIn}
              aria-label="Comenzar simulacro"
            >
              <span>{isSigningIn ? 'Iniciando sesión...' : 'Haz tu simulacro EIR'}</span>
              {!isSigningIn && <i className="fa fa-arrow-right"></i>}
            </button>
        </div>
      );
    }
  };

  return (
    <div className="App">
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
    <nav className="navbar">
      <div className="logo">
        <img
          src={logoSrc}
          alt="Logo"
          width="37"
          height="39"
        />
        <h1>SIMULIA</h1>
      </div>
      <div className="auth-buttons">
        <a href="/blog" className="nav-link">Blog</a>
        <button 
          onClick={() => setShowDemoModal(true)}
          className="demo-btn"
          aria-label="Probar demo"
        >
          Demo
        </button>
        {renderActionButtons()}
      </div>
    </nav>
      {showPopup && (
        <div className="subscription-popup" data-aos="fade-up" data-aos-duration="1000">
          <p>Para acceder a los simulacros, necesitas una suscripción activa.</p>
          <p style={{ marginTop: '10px', fontSize: '14px' }}>Selecciona un plan para comenzar tu preparación.</p>
        </div>
      )}
      <div className="columns">
        <div className="column-left" data-aos="fade-up" data-aos-duration="1500">
          <h1>Simula el EIR, asegura tu plaza</h1>
          <p style={{ marginBottom: '1rem' }}>
          La plataforma que te entrena con simulacros reales, análisis inteligente y flexibilidad total.
          </p>
          <p style={{ color: "#3e5055", fontWeight: "500" }}>
          Prepárate como si estuvieras en el examen. Practica, corrige, mejora y llega segura al gran día.
          </p>

          <div className="exam-types-container">
            <div className="exam-types-grid">
              <div className="exam-type-item" data-tooltip="Simula exactamente el examen oficial con 210 preguntas y tiempo limitado">
                <span className="exam-check">📝</span>
                <span>Simulacro oficial EIR</span>
              </div>
              <div className="exam-type-item" data-tooltip="Practica con preguntas que has fallado hasta dominarlas">
                <span className="exam-check">🔄</span>
                <span>Repetición errores</span>
              </div>
              <div className="exam-type-item" data-tooltip="Ponte a prueba con límite de tiempo para mejorar tu velocidad">
                <span className="exam-check">⏱️</span>
                <span>Contrarreloj</span>
              </div>
              <div className="exam-type-item" data-tooltip="Sesiones rápidas de 50 preguntas ideales para estudio ágil">
                <span className="exam-check">🔍</span>
                <span>Quiz 50 preguntas</span>
              </div>
              <div className="exam-type-item" data-tooltip="Crea tu propio examen eligiendo asignaturas y número de preguntas">
                <span className="exam-check">✏️</span>
                <span>Examen personalizado</span>
              </div>
              <div className="exam-type-item" data-tooltip="Preguntas basadas en los últimos protocolos clínicos">
                <span className="exam-check">📋</span>
                <span>Protocolos clínicos</span>
              </div>
            </div>
          </div>

          <button 
            className="main-action-btn mobile-full-width"
            onClick={() => {
              const pricingSection = document.querySelector('.pricing-section');
              pricingSection?.scrollIntoView({ behavior: 'smooth' });
            }}
            aria-label="Ver planes"
          >
            <span>Empieza gratis hoy</span>
            <i className="fa fa-arrow-right"></i>
          </button>
        </div>
        <div className="column-right" data-aos="fade-left" data-aos-duration="1500" style={{ background: 'transparent' }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <picture style={{ background: 'transparent' }}>
              <img
                src="/Dashboard-EIR-Simulia.png"
                alt="Dashboard EIR Simulia - Estadísticas detalladas de rendimiento en exámenes de enfermería, simulacros realistas y análisis de progreso"
                loading="lazy"
                style={{ background: 'transparent', position: 'relative', zIndex: 2, border: 'none', outline: 'none' }}
              />
            </picture>
            <div style={{
              position: 'absolute',
              bottom: -20,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '75%',
              height: '40px',
              background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 30%, rgba(0,0,0,0) 70%)',
              borderRadius: '50%',
              zIndex: 1,
              filter: 'blur(10px)'
            }}></div>
          </div>
        </div>
      </div>
      {/* Hero Section */}
      <section className="hero-section">
        <h2>Entrena como en el examen real, sin sorpresas</h2>
        <p style={{ color: "#3e5055", fontWeight: "500" }}>Simulacros oficiales EIR, condiciones auténticas y formatos adaptados a tu ritmo.</p>
      </section>

      {/* Features Grid */}
      <div className="features-grid">
        <div className="feature-card" data-aos="fade-up" data-aos-delay="100">
          <img 
            src={process.env.PUBLIC_URL + '/opciones-entrenamiento-personalizado-eir.png'} 
            alt="Opciones de entrenamiento personalizado EIR - Diferentes modalidades de simulacros para preparar tu examen de enfermería"
            loading="lazy"
          />
          <h3>Elige tu camino</h3>
          <p>
          Test rápidos de 50 preguntas, entrenamientos contrarreloj, exámenes personalizados y protocolos clínicos.          
          </p>
        </div>

        <div className="feature-card" data-aos="fade-up" data-aos-delay="200">
          <img 
            src={process.env.PUBLIC_URL + '/aprende-errores-practica-eir.png'} 
            alt="Convierte cada error en oportunidad de mejora - Selección de respuestas correctas para EIR"
            loading="lazy"
          />
          <h3>Avanza con feedback inteligente</h3>
          <p>
            Te mostramos en qué destacas y qué necesitas reforzar. Cada fallo se convierte en oportunidad de mejora.
          </p>
        </div>

        <div className="feature-card" data-aos="fade-up" data-aos-delay="300">
          <img 
            src={process.env.PUBLIC_URL + '/estadisticas-eir.png'} 
            alt="Estadísticas personalizadas"
            loading="lazy"
          />
          <h3>Sin distracciones, sin clases interminables</h3>
          <p>
          Solo práctica, solo resultados. Tú decides cómo avanzar. Nosotros solo guiamos el camino.          
          </p>
        </div>

        <div className="feature-card" data-aos="fade-up" data-aos-delay="400">
          <img 
            src={process.env.PUBLIC_URL + '/simulacro-condiciones-reales-eir.png'} 
            alt="Enfermero preparándose con simulacros EIR en condiciones reales del examen - Simulacros cronometrados"
            loading="lazy"
          />
          <h3>Simula el examen real, sin sorpresas</h3>
          <p>
          Entrena con condiciones reales: sin pausas, con tiempo, imágenes y textos con el mismo formato y número de preguntas del EIR. Llega al examen sabiendo exactamente a lo que te enfrentas.
          </p>
        </div>
      </div>

      {/* Sección de Modalidades de Estudio */}
      <section className="modalidades-section" style={{ padding: "60px 20px", textAlign: "center", backgroundColor: "#f8f9fa" }}>
        <h2 style={{ fontSize: "2rem", marginBottom: "1rem", color: "#3e5055" }}>Entrena como nunca</h2>
        <p style={{ color: "#3e5055", fontWeight: "500", maxWidth: "800px", margin: "0 auto 2rem", fontSize: "1.1rem" }}>
          Simulacros completos de 210 preguntas, minitests exprés o entrenamientos contrarreloj. Elige tu estilo, repite las veces que necesites.
        </p>
        <h2 style={{ fontSize: "2rem", marginTop: "3rem", marginBottom: "1rem", color: "#3e5055" }}>Convierte errores en oportunidades</h2>
        <p style={{ color: "#3e5055", fontWeight: "500", maxWidth: "800px", margin: "0 auto", fontSize: "1.1rem" }}>
          Nuestro sistema detecta y guarda tus fallos, los analiza y te los sirve de nuevo hasta que los superas. Cada error te acerca un paso más a tu plaza.
        </p>
      </section>

      {/* Sección de Testimonios */}
      <section className="testimonials-section">
        <h2>Lo que dicen nuestros estudiantes</h2>
        <p style={{ color: "#3e5055", fontWeight: "500", textAlign: "center", marginBottom: "3rem" }}>
          Descubre las experiencias de quienes ya están preparando su plaza con Simulia
        </p>
        <div className="testimonials-slider">
          <div className="testimonials-track">
            {/* Primer conjunto de testimonios */}
            <div className="testimonial-card" data-aos="fade-up">
              <div className="testimonial-content">
                <p>"Llevo 3 meses usando Simulia y he notado un cambio brutal. Antes me costaba mantener el ritmo, ahora hasta me divierto estudiando 😅"</p>
                <div className="testimonial-author">
                  <h4>María</h4>
                </div>
              </div>
            </div>
            <div className="testimonial-card" data-aos="fade-up" data-aos-delay="100">
              <div className="testimonial-content">
              <p>"Me encanta que puedo estudiar en cualquier momento. Hacer test rápidos en el bus es ya mi rutina. ¡El tiempo vuela!"</p>
              <div className="testimonial-author">
                  <h4>Carlos</h4>
                </div>
              </div>
            </div>
            <div className="testimonial-card" data-aos="fade-up" data-aos-delay="200">
              <div className="testimonial-content">
                <p>"Las estadísticas me ayudaron a saber dónde fallaba y cómo mejorar cada día. Ahora estudio con más intención y seguridad."</p>
                <div className="testimonial-author">
                  <h4>Ana</h4>
                </div>
              </div>
            </div>
            <div className="testimonial-card" data-aos="fade-up" data-aos-delay="300">
              <div className="testimonial-content">
                <p>"Lo que más me gusta es practicar por temas. Cuando flojeo en uno, le meto caña hasta que lo domino."</p>
                <div className="testimonial-author">
                  <h4>David</h4>
                </div>
              </div>
            </div>
            <div className="testimonial-card" data-aos="fade-up" data-aos-delay="400">
              <div className="testimonial-content">
                <p>"Me ha ayudado a organizarme mejor. Sé exactamente qué repasar y llegué súper tranquila al examen."</p>
                <div className="testimonial-author">
                  <h4>Sofía</h4>
                </div>
              </div>
            </div>
            <div className="testimonial-card" data-aos="fade-up" data-aos-delay="500">
              <div className="testimonial-content">
                <p>"Las preguntas son muy parecidas a las del examen real. Me da mucha seguridad saber que estoy practicando con algo que se parece tanto"</p>
                <div className="testimonial-author">
                  <h4>Javier</h4>
                </div>
              </div>
            </div>
            {/* Duplicado de testimonios para el efecto infinito */}
            <div className="testimonial-card">
              <div className="testimonial-content">
                <p>"Llevo 3 meses usando Simulia y he notado un cambio brutal. Antes me costaba mantener el ritmo, ahora hasta me divierto estudiando 😅"</p>
                <div className="testimonial-author">
                  <h4>María</h4>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-content">
                <p>"Me encanta que puedo estudiar en cualquier momento. Hacer test rápidos en el bus es ya mi rutina. ¡El tiempo vuela!"</p>
                <div className="testimonial-author">
                  <h4>Carlos</h4>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-content">
                <p>"Las estadísticas me ayudaron a saber dónde fallaba y cómo mejorar cada día. Ahora estudio con más intención y seguridad."</p>
                <div className="testimonial-author">
                  <h4>Ana</h4>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-content">
                <p>"Lo que más me gusta es practicar por temas. Cuando flojeo en uno, le meto caña hasta que lo domino."</p>
                <div className="testimonial-author">
                  <h4>David</h4>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-content">
                <p>"Me ha ayudado a organizarme mejor. Sé exactamente qué repasar y llegué súper tranquila al examen."</p>
                <div className="testimonial-author">
                  <h4>Sofía</h4>
                </div>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-content">
                <p>"Las preguntas son muy parecidas a las del examen real. Me da mucha seguridad saber que estoy practicando con algo que se parece tanto"</p>
                <div className="testimonial-author">
                  <h4>Javier</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="planes" className="pricing-section">
        <h2>Planes y Precios</h2>
        <p style={{ color: "#3e5055", fontWeight: "500" }}>Elige el plan que se ajusta a ti. Empieza hoy, sin compromiso.</p>
        <div className="pricing-container">
          <div className="pricing-block" data-aos="fade-up">
            <h3>Explora sin presión</h3>
                          <p className="price">9.99 €/mes</p>
            <ul>
              <li>Flexibilidad total, cancela cuando quieras</li>
              <li>7 días gratis</li>
            </ul>
            <button
                              onClick={() => window.location.href = 'https://buy.stripe.com/28E14n2ck6LC1lvbmC6Zy0e'}
              className="pricing-btn"
            > 
              Flexibilidad a tu medida
            </button>
          </div>
          <div className="pricing-block" data-aos="fade-up" style={{ 
            border: "2px solid #7da0a7", 
            boxShadow: "0 8px 20px rgba(125, 160, 167, 0.2)"
          }}>
          <div className="popular-badge" style={{ backgroundColor: "#7da0a7", color: "white" }}> Mejor valorado</div>
            <h3>Prepara tu plaza (Pro)</h3>
                          <p className="price">39.99 €/año</p>
            <ul className="bg-indigo-100" style={{ 
              backgroundColor: "rgba(125, 160, 167, 0.1)", 
              padding: "20px",
              borderRadius: "10px",
              marginBottom: "20px"
            }}>
              <li>Acceso ilimitado, paga una vez, despreocúpate</li>
              <li>7 días gratis</li>
            </ul>
            <button
                              onClick={() => window.location.href = 'https://buy.stripe.com/8x214neZ69XO6FPfCS6Zy0d'}
              className="pricing-btn"
              style={{ backgroundColor: "#7da0a7", fontWeight: "600" }}
            >
              Preparate sin límites
            </button>
          </div>
        </div>
      </section>

      {/* Sección "Quién está detrás de Simulia" */}
      <section className="about-founder-section">
        <div className="about-founder-container">
          <div className="about-founder-content">
            <div className="founder-image-container" data-aos="fade-right">
              <img 
                src="/founder-cristina-peris.jpg" 
                alt="Cristina Peris - Fundadora de Simulia, enfermera graduada en 2022"
                className="founder-image"
                loading="lazy"
              />
            </div>
            <div className="founder-text" data-aos="fade-left">
              <h2>Sobre Simulia (Autenticidad)</h2>
              <div className="founder-intro">
                <p><strong>¿Quién está detrás?</strong></p>
              </div>
              
              <p>
                Soy <strong>Cristina Peris</strong>, enfermera.
              </p>
              
              <p>
                Cuando acabé la carrera vi lo difícil que era prepararse bien el EIR, por eso creé Simulia: una herramienta pensada para enfermeras como yo, que buscan una forma práctica, moderna y eficaz de estudiar y ganar tranquilidad.
              </p>
              
              <div className="founder-intro">
                <p><strong>Misión:</strong></p>
              </div>
              
              <p>
                Que el día del examen sientas que ya lo has vivido muchas veces, llegues segura, organizada y con la confianza de que has entrenado como nunca.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="faq-section">
        <h2>Preguntas Frecuentes</h2>
        
        <div className="faq-grid">
          {/* Columna izquierda - Preguntas sobre entrenamiento */}
          <div className="faq-column">
            <div className="faq-item" data-aos="fade-up">
              <details>
                <summary>¿Me ayudará a mejorar mis resultados reales?</summary>
                <p>Sí. Practicar con simulacros EIR te prepara para el examen de verdad, eliminando sorpresas y miedos.</p>
              </details>
            </div>

            <div className="faq-item" data-aos="fade-up">
              <details>
                <summary>¿Puedo enfocarme en los temas que más me cuestan?</summary>
                <p>Sí. El sistema te permite entrenar por asignaturas y repetir tus errores hasta que los domines.</p>
              </details>
            </div>

            <div className="faq-item" data-aos="fade-up">
              <details>
                <summary>¿Está actualizado con las preguntas oficiales EIR?</summary>
                <p>Sí. Simulia se alinea y actualiza continuamente para ofrecerte las preguntas más relevantes y recientes.</p>
              </details>
            </div>
          </div>

          {/* Columna derecha - Preguntas sobre la plataforma */}
          <div className="faq-column">
            <div className="faq-item" data-aos="fade-up">
              <details>
                <summary>¿Qué tipo de análisis obtengo?</summary>
                <p>Obtienes estadísticas sobre tus aciertos, fallos, progreso por asignatura y recomendaciones personalizadas.</p>
              </details>
            </div>

            <div className="faq-item" data-aos="fade-up">
              <details>
                <summary>¿Puedo usar la plataforma desde cualquier dispositivo?</summary>
                <p>Sí, puedes acceder desde móvil, ordenador o tablet, sin límites.</p>
              </details>
            </div>
          </div>
        </div>
      </section>
      <div style={{ backgroundColor: "#3f5056", color: "white", padding: "40px 0 20px 0", marginTop: "50px" }}>
        <section id="contacto" style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px" }}>
          <h2 style={{ textAlign: "center", marginBottom: "20px", color: "white" }}>Contacto</h2>
          <p style={{ textAlign: "center", marginBottom: "20px", color: "#e0e0e0" }}>
            ¿Tienes dudas o necesitas ayuda? Estamos aquí para ti. Escríbenos y te responderemos lo antes posible.
          </p>
          <div style={{ textAlign: "center", marginBottom: "50px" }}>
            <a href="mailto:simuliaproject@simulia.es" style={{ 
              backgroundColor: "rgba(255,255,255,0.2)", 
              padding: "12px 25px", 
              borderRadius: "50px", 
              color: "white", 
              textDecoration: "none",
              display: "inline-block"
            }}>
              simuliaproject@simulia.es
            </a>
          </div>
          
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "30px", textAlign: "center" }}>
            <p style={{ fontSize: "14px", marginBottom: "15px" }}>© {new Date().getFullYear()} Simulia – Todos los derechos reservados</p>
            <div style={{ display: "flex", justifyContent: "center", gap: "20px" }}>
              <a href="/aviso-legal" style={{ color: "#e0e0e0", textDecoration: "none", fontSize: "14px" }}>Aviso legal</a>
              <a href="/politica-privacidad" style={{ color: "#e0e0e0", textDecoration: "none", fontSize: "14px" }}>Política de privacidad</a>
              <a href="/terminos-condiciones" style={{ color: "#e0e0e0", textDecoration: "none", fontSize: "14px" }}>Términos y condiciones</a>
            </div>
          </div>
        </section>
      </div>
      
      {/* Demo Modal */}
      <DemoModal 
        isOpen={showDemoModal} 
        onClose={() => setShowDemoModal(false)} 
      />

    </div>
  );
}

export default HomePage;