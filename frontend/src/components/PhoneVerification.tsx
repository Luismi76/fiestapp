'use client';

import { useState } from 'react';
import { authApi } from '@/lib/api';

interface PhoneVerificationProps {
  phone?: string;
  phoneVerified?: boolean;
  onVerified?: () => void;
}

export default function PhoneVerification({
  phone: initialPhone,
  phoneVerified,
  onVerified,
}: PhoneVerificationProps) {
  const [phone, setPhone] = useState(initialPhone || '');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'input' | 'verify'>('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);

  const formatPhone = (value: string) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, '');
    // Format as Spanish phone if starts with 6, 7, or 9
    if (digits.length <= 9) {
      return digits;
    }
    return digits.slice(0, 12);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
    setError('');
  };

  const handleSendCode = async () => {
    if (!phone || phone.length < 9) {
      setError('Introduce un número de teléfono válido');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Format phone with country code if needed
      const formattedPhone = phone.startsWith('+') ? phone : `+34${phone}`;
      const response = await authApi.sendPhoneVerification(formattedPhone);
      setSuccess(response.message);
      setStep('verify');
      // Start countdown for resend
      setCountdown(60);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al enviar el código';
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response
          ?.data?.message === 'string'
      ) {
        setError(
          (err as { response: { data: { message: string } } }).response.data
            .message
        );
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code || code.length < 6) {
      setError('Introduce el código de 6 dígitos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authApi.verifyPhone(code);
      setSuccess(response.message);
      onVerified?.();
    } catch (err) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response
          ?.data?.message === 'string'
      ) {
        setError(
          (err as { response: { data: { message: string } } }).response.data
            .message
        );
      } else {
        setError('Código incorrecto');
      }
    } finally {
      setLoading(false);
    }
  };

  if (phoneVerified) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <span className="text-green-600 text-xl">✓</span>
          <div>
            <p className="font-medium text-green-800">Teléfono verificado</p>
            {initialPhone && (
              <p className="text-sm text-green-600">{initialPhone}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="font-medium text-gray-900 mb-3">Verificar teléfono</h3>
      <p className="text-sm text-gray-600 mb-4">
        Verifica tu número de teléfono para aumentar la confianza en tu perfil.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-3 text-sm">
          {error}
        </div>
      )}

      {success && step === 'verify' && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded mb-3 text-sm">
          {success}
        </div>
      )}

      {step === 'input' ? (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de teléfono
            </label>
            <div className="flex gap-2">
              <span className="inline-flex items-center px-3 text-gray-500 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md text-sm">
                +34
              </span>
              <input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="612345678"
                className="flex-1 border border-gray-300 rounded-r-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                maxLength={9}
              />
            </div>
          </div>
          <button
            onClick={handleSendCode}
            disabled={loading || phone.length < 9}
            className="w-full btn-primary py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Enviando...' : 'Enviar código SMS'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Hemos enviado un código a <strong>+34{phone}</strong>
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código de verificación
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                setError('');
              }}
              placeholder="123456"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-center tracking-widest font-mono focus:ring-2 focus:ring-primary focus:border-transparent"
              maxLength={6}
            />
          </div>
          <button
            onClick={handleVerifyCode}
            disabled={loading || code.length < 6}
            className="w-full btn-primary py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verificando...' : 'Verificar código'}
          </button>
          <div className="flex items-center justify-between text-sm">
            <button
              onClick={() => {
                setStep('input');
                setCode('');
                setError('');
                setSuccess('');
              }}
              className="text-gray-600 hover:text-gray-800"
            >
              Cambiar número
            </button>
            <button
              onClick={handleSendCode}
              disabled={countdown > 0 || loading}
              className="text-primary hover:text-primary/80 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              {countdown > 0 ? `Reenviar en ${countdown}s` : 'Reenviar código'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
