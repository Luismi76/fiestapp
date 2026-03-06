'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthCallbackPage() {
  const { loginWithToken } = useAuth();

  useEffect(() => {
    loginWithToken();
  }, [loginWithToken]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="spinner spinner-lg mx-auto mb-4" />
        <p className="text-[#8B7355]">Iniciando sesion...</p>
      </div>
    </div>
  );
}
