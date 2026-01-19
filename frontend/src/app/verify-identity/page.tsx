'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { identityApi, IdentityStatus } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function VerifyIdentityPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<IdentityStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);

  const documentInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      loadStatus();
    }
  }, [user, authLoading, router]);

  const loadStatus = async () => {
    try {
      const data = await identityApi.getStatus();
      setStatus(data);
    } catch (err) {
      console.error('Error loading status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'document' | 'selfie'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Por favor, sube una imagen válida');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('La imagen no puede superar los 10MB');
      return;
    }

    setError('');

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'document') {
        setDocumentFile(file);
        setDocumentPreview(reader.result as string);
      } else {
        setSelfieFile(file);
        setSelfiePreview(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!documentFile || !selfieFile) {
      setError('Debes subir ambos archivos: documento de identidad y selfie');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await identityApi.submit(documentFile, selfieFile);
      setSuccess(true);
      // Reload status after submission
      await loadStatus();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al enviar la verificación';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Already verified
  if (status?.identityVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-purple-50 py-12 px-4">
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Identidad Verificada</h1>
            <p className="text-gray-600 mb-6">
              Tu identidad ha sido verificada correctamente. Ahora tienes acceso a todas las funcionalidades de FiestApp.
            </p>
            <Link href="/profile" className="btn-primary inline-block">
              Ir a mi perfil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Pending verification
  if (status?.identityStatus === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-purple-50 py-12 px-4">
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verificación en Proceso</h1>
            <p className="text-gray-600 mb-4">
              Tu solicitud de verificación está siendo revisada por nuestro equipo.
            </p>
            {status.identitySubmittedAt && (
              <p className="text-sm text-gray-500 mb-6">
                Enviado el {new Date(status.identitySubmittedAt).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            )}
            <Link href="/" className="btn-secondary inline-block">
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Rejected - can resubmit
  if (status?.identityStatus === 'rejected') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-purple-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Verificación Rechazada</h1>
              <p className="text-gray-600 mb-2">
                Tu solicitud de verificación ha sido rechazada.
              </p>
              {status.identityRejectReason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                  <p className="text-sm font-medium text-red-800">Motivo:</p>
                  <p className="text-red-700">{status.identityRejectReason}</p>
                </div>
              )}
            </div>

            <div className="border-t pt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">
                Volver a enviar verificación
              </h2>
              <VerificationForm
                documentFile={documentFile}
                selfieFile={selfieFile}
                documentPreview={documentPreview}
                selfiePreview={selfiePreview}
                documentInputRef={documentInputRef}
                selfieInputRef={selfieInputRef}
                handleFileChange={handleFileChange}
                handleSubmit={handleSubmit}
                submitting={submitting}
                error={error}
                success={success}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No verification submitted yet
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-purple-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verifica tu Identidad</h1>
            <p className="text-gray-600">
              La verificación de identidad aumenta la confianza entre usuarios y te da acceso a más funcionalidades.
            </p>
          </div>

          {/* Benefits */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8">
            <h3 className="font-semibold text-gray-900 mb-4">Beneficios de verificar tu identidad:</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700">Badge de verificado visible en tu perfil</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700">Mayor confianza de otros usuarios</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700">Prioridad en las búsquedas</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700">Acceso a funcionalidades exclusivas</span>
              </li>
            </ul>
          </div>

          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">¡Documentos enviados!</h3>
              <p className="text-gray-600 mb-6">
                Revisaremos tu solicitud y te notificaremos cuando esté lista.
              </p>
              <Link href="/" className="btn-primary inline-block">
                Volver al inicio
              </Link>
            </div>
          ) : (
            <VerificationForm
              documentFile={documentFile}
              selfieFile={selfieFile}
              documentPreview={documentPreview}
              selfiePreview={selfiePreview}
              documentInputRef={documentInputRef}
              selfieInputRef={selfieInputRef}
              handleFileChange={handleFileChange}
              handleSubmit={handleSubmit}
              submitting={submitting}
              error={error}
              success={success}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Extracted form component for reuse
interface VerificationFormProps {
  documentFile: File | null;
  selfieFile: File | null;
  documentPreview: string | null;
  selfiePreview: string | null;
  documentInputRef: React.RefObject<HTMLInputElement | null>;
  selfieInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>, type: 'document' | 'selfie') => void;
  handleSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  error: string;
  success: boolean;
}

function VerificationForm({
  documentFile,
  selfieFile,
  documentPreview,
  selfiePreview,
  documentInputRef,
  selfieInputRef,
  handleFileChange,
  handleSubmit,
  submitting,
  error,
}: VerificationFormProps) {
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Document Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Documento de identidad (DNI, pasaporte, carnet de conducir)
        </label>
        <input
          type="file"
          ref={documentInputRef}
          onChange={(e) => handleFileChange(e, 'document')}
          accept="image/*"
          className="hidden"
        />
        {documentPreview ? (
          <div className="relative">
            <img
              src={documentPreview}
              alt="Preview documento"
              className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
            />
            <button
              type="button"
              onClick={() => documentInputRef.current?.click()}
              className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center text-white font-medium"
            >
              Cambiar imagen
            </button>
            <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
              {documentFile?.name}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => documentInputRef.current?.click()}
            className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:border-primary hover:text-primary transition-colors"
          >
            <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="font-medium">Subir documento</span>
            <span className="text-sm">Haz clic o arrastra la imagen</span>
          </button>
        )}
      </div>

      {/* Selfie Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Selfie sosteniendo el documento
        </label>
        <input
          type="file"
          ref={selfieInputRef}
          onChange={(e) => handleFileChange(e, 'selfie')}
          accept="image/*"
          className="hidden"
        />
        {selfiePreview ? (
          <div className="relative">
            <img
              src={selfiePreview}
              alt="Preview selfie"
              className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
            />
            <button
              type="button"
              onClick={() => selfieInputRef.current?.click()}
              className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center text-white font-medium"
            >
              Cambiar imagen
            </button>
            <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
              {selfieFile?.name}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => selfieInputRef.current?.click()}
            className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:border-primary hover:text-primary transition-colors"
          >
            <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="font-medium">Subir selfie</span>
            <span className="text-sm">Foto tuya sosteniendo el documento</span>
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Instrucciones:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• El documento debe ser legible y mostrar tu foto claramente</li>
          <li>• En el selfie, sostén el documento junto a tu cara</li>
          <li>• Asegúrate de que haya buena iluminación</li>
          <li>• Las imágenes deben ser menores de 10MB</li>
        </ul>
      </div>

      <button
        type="submit"
        disabled={submitting || !documentFile || !selfieFile}
        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Enviando...
          </span>
        ) : (
          'Enviar verificación'
        )}
      </button>
    </form>
  );
}
