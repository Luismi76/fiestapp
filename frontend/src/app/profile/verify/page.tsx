'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';
import api from '@/lib/api';

type DocumentType = 'DNI' | 'PASSPORT' | 'DRIVER_LICENSE';
type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

interface Verification {
  id: string;
  status: VerificationStatus;
  documentType: DocumentType;
  documentFront: string;
  documentBack: string | null;
  selfie: string | null;
  rejectionReason: string | null;
  attempts: number;
  createdAt: string;
}

const documentTypeLabels: Record<DocumentType, string> = {
  DNI: 'DNI / Tarjeta de Identidad',
  PASSPORT: 'Pasaporte',
  DRIVER_LICENSE: 'Carnet de Conducir',
};

const statusConfig: Record<VerificationStatus, { label: string; color: string; bgColor: string }> = {
  PENDING: { label: 'Pendiente de revision', color: 'text-yellow-700', bgColor: 'bg-yellow-50' },
  VERIFIED: { label: 'Verificado', color: 'text-green-700', bgColor: 'bg-green-50' },
  REJECTED: { label: 'Rechazado', color: 'text-red-700', bgColor: 'bg-red-50' },
};

export default function VerifyIdentityPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();

  const [verification, setVerification] = useState<Verification | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [documentType, setDocumentType] = useState<DocumentType>('DNI');
  const [documentFront, setDocumentFront] = useState<File | null>(null);
  const [documentBack, setDocumentBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);

  const fetchVerification = useCallback(async () => {
    try {
      const response = await api.get<Verification | null>('/verification/me');
      setVerification(response.data);
    } catch {
      // User has no verification yet
      setVerification(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      fetchVerification();
    } else if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router, fetchVerification]);

  const handleFileChange = (
    file: File | null,
    setter: (f: File | null) => void,
    previewSetter: (p: string | null) => void
  ) => {
    setter(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        previewSetter(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      previewSetter(null);
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<{ url: string }>('/uploads/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!documentFront) {
      toast.error('Falta documento', 'Debes subir la parte frontal del documento');
      return;
    }

    if (documentType === 'DNI' && !documentBack) {
      toast.error('Falta documento', 'Debes subir la parte trasera del DNI');
      return;
    }

    setSubmitting(true);

    try {
      // Upload files
      const frontUrl = await uploadFile(documentFront);
      const backUrl = documentBack ? await uploadFile(documentBack) : undefined;
      const selfieUrl = selfie ? await uploadFile(selfie) : undefined;

      // Submit verification
      await api.post('/verification', {
        documentType,
        documentFront: frontUrl,
        documentBack: backUrl,
        selfie: selfieUrl,
      });

      toast.success('Solicitud enviada', 'Tu verificacion esta siendo revisada');
      fetchVerification();

      // Reset form
      setDocumentFront(null);
      setDocumentBack(null);
      setSelfie(null);
      setFrontPreview(null);
      setBackPreview(null);
      setSelfiePreview(null);
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error('Error', error.response?.data?.message || 'No se pudo enviar la solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  const canSubmit = !verification || verification.status === 'REJECTED';
  const config = verification ? statusConfig[verification.status] : null;

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
          <div className="flex items-center gap-3 px-4 h-16">
            <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold">Verificar Identidad</h1>
          </div>
        </header>

        <div className="p-4 max-w-lg mx-auto space-y-6">
          {/* Current Status */}
          {verification && config && (
            <div className={`rounded-xl p-4 ${config.bgColor}`}>
              <div className="flex items-center gap-3">
                {verification.status === 'VERIFIED' ? (
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : verification.status === 'PENDING' ? (
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
                <div>
                  <p className={`font-semibold ${config.color}`}>{config.label}</p>
                  <p className="text-sm text-gray-600">
                    Documento: {documentTypeLabels[verification.documentType]}
                  </p>
                </div>
              </div>

              {verification.status === 'REJECTED' && verification.rejectionReason && (
                <div className="mt-3 p-3 bg-white rounded-lg">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Motivo del rechazo:</span> {verification.rejectionReason}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Puedes enviar una nueva solicitud con documentos correctos.
                  </p>
                </div>
              )}

              {verification.status === 'PENDING' && (
                <p className="mt-3 text-sm text-gray-600">
                  Tu solicitud esta siendo revisada. Te notificaremos cuando se complete.
                </p>
              )}
            </div>
          )}

          {/* Benefits */}
          {!verification?.status || verification.status !== 'VERIFIED' ? (
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-3">Beneficios de verificar tu identidad</h2>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Mayor confianza de otros usuarios
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Insignia de verificado en tu perfil
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Acceso a experiencias exclusivas
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Mayor prioridad en el matching
                </li>
              </ul>
            </div>
          ) : null}

          {/* Form */}
          {canSubmit && (
            <form onSubmit={handleSubmit} className="bg-white rounded-xl p-4 border border-gray-100 space-y-4">
              <h2 className="font-semibold text-gray-900">
                {verification?.status === 'REJECTED' ? 'Enviar nueva solicitud' : 'Verificar identidad'}
              </h2>

              {/* Document Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de documento
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value as DocumentType)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="DNI">DNI / Tarjeta de Identidad</option>
                  <option value="PASSPORT">Pasaporte</option>
                  <option value="DRIVER_LICENSE">Carnet de Conducir</option>
                </select>
              </div>

              {/* Document Front */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parte frontal del documento *
                </label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
                  {frontPreview ? (
                    <div className="relative">
                      <img src={frontPreview} alt="Frontal" className="max-h-40 mx-auto rounded-lg" />
                      <button
                        type="button"
                        onClick={() => handleFileChange(null, setDocumentFront, setFrontPreview)}
                        className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <div className="py-6">
                        <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm text-gray-500">Toca para subir imagen</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileChange(e.target.files?.[0] || null, setDocumentFront, setFrontPreview)}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Document Back (for DNI) */}
              {documentType === 'DNI' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parte trasera del documento *
                  </label>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
                    {backPreview ? (
                      <div className="relative">
                        <img src={backPreview} alt="Trasera" className="max-h-40 mx-auto rounded-lg" />
                        <button
                          type="button"
                          onClick={() => handleFileChange(null, setDocumentBack, setBackPreview)}
                          className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <div className="py-6">
                          <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-sm text-gray-500">Toca para subir imagen</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileChange(e.target.files?.[0] || null, setDocumentBack, setBackPreview)}
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

              {/* Selfie (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selfie con el documento (opcional)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Una foto tuya sosteniendo el documento ayuda a acelerar la verificacion
                </p>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
                  {selfiePreview ? (
                    <div className="relative">
                      <img src={selfiePreview} alt="Selfie" className="max-h-40 mx-auto rounded-lg" />
                      <button
                        type="button"
                        onClick={() => handleFileChange(null, setSelfie, setSelfiePreview)}
                        className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <div className="py-6">
                        <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <p className="text-sm text-gray-500">Toca para subir selfie</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileChange(e.target.files?.[0] || null, setSelfie, setSelfiePreview)}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Privacy Notice */}
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500">
                  <svg className="w-4 h-4 inline-block mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Tus documentos se almacenan de forma segura y solo se usan para verificar tu identidad.
                  Nunca compartimos esta informacion con terceros.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  'Enviar verificacion'
                )}
              </button>
            </form>
          )}

          {/* Verified message */}
          {verification?.status === 'VERIFIED' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Tu identidad esta verificada</h2>
              <p className="text-gray-600">
                Ahora tienes acceso completo a todas las funciones de FiestApp
              </p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
