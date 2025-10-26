import React, { useState, useEffect } from 'react';
import { getDeviceInfo } from '../utils/deviceDetection';

const MobileDebug = () => {
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setDeviceInfo(getDeviceInfo());
  }, []);

  // Solo mostrar en desarrollo o si se activa manualmente
  if (process.env.NODE_ENV === 'production' && !isVisible) {
    return null;
  }

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  if (!deviceInfo) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 9999,
      backgroundColor: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '8px',
      fontSize: '12px',
      maxWidth: '300px',
      fontFamily: 'monospace'
    }}>
      <button 
        onClick={toggleVisibility}
        style={{
          background: 'none',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          fontSize: '16px',
          marginBottom: '10px'
        }}
      >
        {isVisible ? '🔽' : '🔼'} Debug Móvil
      </button>
      
                {isVisible && (
            <div>
              <div><strong>📱 Dispositivo:</strong> {deviceInfo.deviceType}</div>
              <div><strong>🖥️ Pantalla:</strong> {deviceInfo.screenWidth}x{deviceInfo.screenHeight}</div>
              <div><strong>👆 Táctil:</strong> {deviceInfo.hasTouch ? 'SÍ' : 'NO'}</div>
              <div><strong>🌐 Plataforma:</strong> {deviceInfo.platform}</div>
              <div><strong>🌍 Idioma:</strong> {deviceInfo.language}</div>
              <div><strong>🔍 User Agent:</strong> {deviceInfo.userAgent.substring(0, 50)}...</div>
              
              <div style={{ marginTop: '10px', fontSize: '10px' }}>
                <strong>Detalles:</strong>
                <div>• iPad: {deviceInfo.isIPad ? 'SÍ' : 'NO'}</div>
                <div>• iOS: {deviceInfo.isMobile && /iPad|iPhone|iPod/.test(deviceInfo.userAgent) ? 'SÍ' : 'NO'}</div>
                <div>• Android: {deviceInfo.isMobile && /Android/.test(deviceInfo.userAgent) ? 'SÍ' : 'NO'}</div>
                <div>• Safari: {/Safari/.test(deviceInfo.userAgent) && !/Chrome/.test(deviceInfo.userAgent) ? 'SÍ' : 'NO'}</div>
                <div>• Chrome: {/Chrome/.test(deviceInfo.userAgent) ? 'SÍ' : 'NO'}</div>
                <div>• Método Auth: {deviceInfo.isIPad || deviceInfo.isMobile ? 'REDIRECCIÓN' : 'POPUP'}</div>
              </div>
            </div>
          )}
    </div>
  );
};

export default MobileDebug;
