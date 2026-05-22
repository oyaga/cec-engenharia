import React from 'react';
import { Navigate } from 'react-router-dom';
import { useEdit } from '../../context/EditContext';

const ProtectedRoute = ({ children, requireMaster = false }) => {
  const { user, isMaster, loading } = useEdit();

  if (loading) return <div>Carregando...</div>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireMaster && !isMaster) {
    alert('Apenas o Master Admin (webdesigner) tem acesso a esta funcionalidade.');
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
