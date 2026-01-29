import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CancelPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Volver al inicio tras cancelar el checkout
    const t = setTimeout(() => navigate('/'), 1500);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <h2>Pago cancelado</h2>
      <p>Has cancelado el proceso de pago. Te devolvemos al inicio…</p>
    </div>
  );
};

export default CancelPage;

