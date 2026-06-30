import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../modules/auth/store';

interface PublicRouteProps {
  children: React.ReactNode;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();

  if (isAuthenticated) {
    // Redireciona para o destino salvo (from) ou para o dashboard caso não exista
    const origin = (location.state as any)?.from?.pathname || '/dashboard';
    return <Navigate to={origin} replace />;
  }

  return <>{children}</>;
};
export default PublicRoute;
