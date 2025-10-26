import React, { createContext, useContext, useEffect, useState } from 'react';

const LogoContext = createContext();

export const LogoProvider = ({ children }) => {
  const [logoSrc, setLogoSrc] = useState('/Logo_oscuro.png');

  useEffect(() => {
    // Siempre usar Logo_oscuro.png independientemente del dominio
    setLogoSrc('/Logo_oscuro.png');
  }, []);

  return (
    <LogoContext.Provider value={{ logoSrc }}>
      {children}
    </LogoContext.Provider>
  );
};

export const useLogo = () => useContext(LogoContext); 