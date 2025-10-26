// Utilidades para detectar el tipo de dispositivo

export const isMobileDevice = () => {
  try {
    // Detectar por User Agent (método más confiable)
    const userAgent = navigator.userAgent || navigator.vendor || window.opera || '';
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    
    // Detectar por tamaño de pantalla
    const isSmallScreen = window.innerWidth <= 768;
    
    // Detectar por capacidades táctiles
    const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Detectar iPads específicamente (incluyendo iPad Pro)
    const isIPad = /iPad/.test(userAgent) || 
                   (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
                   /iPad/.test(navigator.platform);
    
    // Detectar por orientación (solo si está disponible)
    const isPortrait = window.orientation !== undefined ? 
                       Math.abs(window.orientation) === 90 : 
                       window.innerHeight > window.innerWidth;
    
    // Combinar múltiples indicadores para mayor precisión
    const mobileIndicators = [
      mobileRegex.test(userAgent),
      isSmallScreen,
      hasTouchScreen,
      isIPad
    ];
    
    // Si al menos 2 indicadores sugieren móvil, considerarlo móvil
    const mobileScore = mobileIndicators.filter(Boolean).length;
    
    console.log('🔍 Detección de dispositivo:', {
      userAgent: userAgent,
      isSmallScreen,
      hasTouchScreen,
      isIPad,
      isPortrait,
      mobileScore,
      mobileIndicators,
      platform: navigator.platform,
      maxTouchPoints: navigator.maxTouchPoints
    });
    
    return mobileScore >= 2 || isIPad;
  } catch (error) {
    console.error('❌ Error en isMobileDevice:', error);
    // Fallback: solo User Agent
    const userAgent = navigator.userAgent || '';
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  }
};

export const getDeviceInfo = () => {
  try {
    const isMobile = isMobileDevice();
    const isIPad = /iPad/.test(navigator.userAgent) || 
                   (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
                   /iPad/.test(navigator.platform);
    
    return {
      isMobile,
      isIPad,
      userAgent: navigator.userAgent,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      platform: navigator.platform,
      language: navigator.language,
      deviceType: isIPad ? 'iPad' : (isMobile ? 'Mobile' : 'Desktop'),
      orientation: window.orientation !== undefined ? window.orientation : 'unknown'
    };
  } catch (error) {
    console.error('❌ Error en getDeviceInfo:', error);
    return {
      isMobile: false,
      isIPad: false,
      userAgent: navigator.userAgent,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      hasTouch: false,
      platform: navigator.platform,
      language: navigator.language,
      deviceType: 'Unknown',
      error: error.message
    };
  }
};

export const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

export const isAndroid = () => {
  return /Android/.test(navigator.userAgent);
};

// Función para determinar el método de autenticación
export const getAuthMethod = () => {
  try {
    const isMobile = isMobileDevice();
    const isIPad = /iPad/.test(navigator.userAgent) || 
                   (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
                   /iPad/.test(navigator.platform);
    
    // En móviles e iPads, usar redirección
    // En desktop, usar popup
    const authMethod = (isMobile || isIPad) ? 'redirect' : 'popup';
    
    console.log('🔍 getAuthMethod:', {
      isMobile,
      isIPad,
      authMethod,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      maxTouchPoints: navigator.maxTouchPoints
    });
    
    return authMethod;
  } catch (error) {
    console.error('❌ Error en getAuthMethod:', error);
    // Fallback: solo User Agent
    const userAgent = navigator.userAgent || '';
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    return isMobile ? 'redirect' : 'popup';
  }
};

export const isIPad = () => {
  return /iPad/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
         /iPad/.test(navigator.platform);
};

export const isSafari = () => {
  return /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
};

export const isChrome = () => {
  return /Chrome/.test(navigator.userAgent);
};

// Función específica para determinar el método de autenticación
export const getAuthMethod = () => {
  try {
    const deviceInfo = getDeviceInfo();
    
    if (deviceInfo.isIPad) {
      console.log('🔐 Auth Method: iPad detectado, usando redirección');
      return 'redirect'; // iPads siempre usan redirección
    } else if (deviceInfo.isMobile) {
      console.log('🔐 Auth Method: Móvil detectado, usando redirección');
      return 'redirect'; // Móviles usan redirección
    } else {
      console.log('🔐 Auth Method: Desktop detectado, usando popup');
      return 'popup'; // Desktop usa popup
    }
  } catch (error) {
    console.error('❌ Error en getAuthMethod:', error);
    // Fallback: detectar por User Agent
    const userAgent = navigator.userAgent || '';
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    return isMobile ? 'redirect' : 'popup';
  }
};
