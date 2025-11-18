import React from 'react';
import { useAuth } from '../context/AuthContext';

const AuthDebug = () => {
  const { currentUser, loading, debugInfo, forceAuthRecovery } = useAuth();
  
  // Solo mostrar en desarrollo
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const handleForceRecovery = async () => {
    console.log("🔧 AuthDebug: Iniciando recuperación manual...");
    const success = await forceAuthRecovery();
    console.log("🔧 AuthDebug: Resultado de recuperación manual:", success);
  };

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#4CAF50' }}>🔧 Auth Debug</h4>
      
      <div><strong>Usuario:</strong> {currentUser ? `✅ ${currentUser.uid}` : '❌ null'}</div>
      <div><strong>Loading:</strong> {loading ? '⏳ true' : '✅ false'}</div>
      
      <div style={{ marginTop: '10px' }}>
        <strong>Debug Info:</strong>
        <div>• Redirect Attempted: {debugInfo.redirectAttempted ? '✅' : '❌'}</div>
        <div>• Redirect Success: {debugInfo.redirectSuccess ? '✅' : '❌'}</div>
        <div>• onAuthStateChanged Called: {debugInfo.onAuthStateChangedCalled ? '✅' : '❌'}</div>
        {debugInfo.lastError && (
          <div style={{ color: '#ff6b6b' }}>• Last Error: {debugInfo.lastError}</div>
        )}
      </div>
      
      <div style={{ marginTop: '10px' }}>
        <strong>LocalStorage:</strong>
        <div>• firebase_redirect_start: {localStorage.getItem('firebase_redirect_start') ? '✅' : '❌'}</div>
      </div>
      
      {(!currentUser && !loading) && (
        <button 
          onClick={handleForceRecovery}
          style={{
            marginTop: '10px',
            padding: '5px 10px',
            background: '#ff6b6b',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '11px'
          }}
        >
          🔄 Force Recovery
        </button>
      )}
    </div>
  );
};

export default AuthDebug;
