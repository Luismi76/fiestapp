'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

function AuthCallbackContent() {
  const { loginWithToken } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get('error');

  useEffect(() => {
    if (error) {
      const message =
        error === 'auth_cancelled'
          ? 'Has cancelado el inicio de sesión con Google.'
          : 'No se pudo iniciar sesión con Google. Inténtalo de nuevo.';
      // Store error message for the login page to display
      sessionStorage.setItem('auth_error', message);
      router.replace('/login');
      return;
    }
    loginWithToken();
  }, [error, loginWithToken, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#8B7355]">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="spinner spinner-lg mx-auto mb-4" />
        <p className="text-[#8B7355]">Iniciando sesión...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner spinner-lg" />
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
