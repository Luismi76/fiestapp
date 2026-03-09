'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { evaluationsApi } from '@/lib/api';

export default function EvaluarPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState<'code' | 'name'>('code');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError('');

    try {
      const { valid } = await evaluationsApi.verifyCode(code.trim());
      if (valid) {
        setStep('name');
      } else {
        setError('Codigo de acceso incorrecto');
      }
    } catch {
      setError('Error al verificar el codigo. Intentalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      setError('Introduce tu nombre (minimo 2 caracteres)');
      return;
    }

    localStorage.setItem('eval_code', code.trim());
    localStorage.setItem('eval_name', name.trim());
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-blue-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Evaluación del prototipo</h1>
          <p className="text-gray-500 mt-2">
            {step === 'code'
              ? 'Introduce el codigo de acceso proporcionado'
              : 'Indica tu nombre para identificar tu feedback'}
          </p>
        </div>

        {step === 'code' ? (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <label htmlFor="eval-code" className="block text-sm font-medium text-gray-700 mb-1">
                Codigo de acceso
              </label>
              <input
                id="eval-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ej: FIESTAPP-EVAL-2026"
                className="input w-full text-center text-lg tracking-wider"
                autoFocus
                autoComplete="off"
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="btn btn-primary w-full py-3"
            >
              {loading ? 'Verificando...' : 'Verificar codigo'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleActivate} className="space-y-4">
            <div>
              <label htmlFor="eval-name" className="block text-sm font-medium text-gray-700 mb-1">
                Tu nombre
              </label>
              <input
                id="eval-name"
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                placeholder="Nombre y apellido"
                className="input w-full"
                autoFocus
                autoComplete="name"
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={!name.trim()}
              className="btn btn-primary w-full py-3"
            >
              Activar modo evaluación
            </button>

            <button
              type="button"
              onClick={() => { setStep('code'); setError(''); }}
              className="btn btn-ghost w-full"
            >
              Volver
            </button>
          </form>
        )}

        <p className="text-xs text-gray-400 text-center mt-6">
          Podras enviar feedback desde cualquier pagina de la aplicacion
        </p>
      </div>
    </div>
  );
}
