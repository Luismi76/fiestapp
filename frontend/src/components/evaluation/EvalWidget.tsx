'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { evaluationsApi, CreateEvaluationData } from '@/lib/api';

type Category = CreateEvaluationData['category'];
type Priority = CreateEvaluationData['priority'];

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'PROBLEMA', label: 'Problema' },
  { value: 'MEJORA', label: 'Propuesta de mejora' },
  { value: 'OPINION', label: 'Opinión general' },
];

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'BAJA', label: 'Baja', color: '#0D7355' },
  { value: 'MEDIA', label: 'Media', color: '#E6A817' },
  { value: 'ALTA', label: 'Alta', color: '#C41E3A' },
];

const EVAL_CODE = 'FIESTAPP-EVAL-2026';

export default function EvalWidget() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const [category, setCategory] = useState<Category>('MEJORA');
  const [priority, setPriority] = useState<Priority>('MEDIA');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  // Solo mostrar si hay usuario logueado
  if (!user) return null;

  // No mostrar en la propia página de evaluar
  if (pathname === '/evaluar') return null;

  const evaluatorName = user.name || 'Evaluador';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || comment.trim().length < 10) {
      setError('Escribe al menos 10 caracteres');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await evaluationsApi.create(
        {
          evaluatorName,
          page: pathname,
          category,
          priority,
          comment: comment.trim(),
        },
        EVAL_CODE,
      );
      setSent(true);
      setTimeout(() => {
        setIsOpen(false);
        setSent(false);
        setComment('');
        setCategory('MEJORA');
        setPriority('MEDIA');
      }, 2000);
    } catch {
      setError('Error al enviar. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botón flotante */}
      {!isOpen && (
        <div className="fixed bottom-20 right-4 z-50">
          <button
            onClick={() => setIsOpen(true)}
            className="bg-blue-600 text-white px-4 py-2.5 rounded-full shadow-lg hover:bg-blue-700 transition-all hover:shadow-xl flex items-center gap-2 text-sm font-medium"
            aria-label="Enviar feedback"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
            Feedback
          </button>
        </div>
      )}

      {/* Panel de feedback */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => { if (!loading) setIsOpen(false); }}
          />

          <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[70vh] overflow-y-auto shadow-2xl mb-20 sm:mb-0">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">Feedback</h2>
                <p className="text-xs text-gray-500">
                  {evaluatorName} &middot; {pathname}
                </p>
              </div>
              <button
                onClick={() => { if (!loading) setIsOpen(false); }}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                aria-label="Cerrar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-500">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            {sent ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-green-600">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="font-semibold text-gray-900">Feedback enviado</p>
                <p className="text-sm text-gray-500 mt-1">Gracias por tu aportación</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                {/* Categoría */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de feedback
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setCategory(cat.value)}
                        className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                          category === cat.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prioridad */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prioridad
                  </label>
                  <div className="flex gap-2">
                    {PRIORITIES.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setPriority(p.value)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          priority === p.value
                            ? 'text-white'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                        style={
                          priority === p.value
                            ? { backgroundColor: p.color, borderColor: p.color }
                            : undefined
                        }
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comentario */}
                <div>
                  <label htmlFor="eval-comment" className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    id="eval-comment"
                    value={comment}
                    onChange={(e) => { setComment(e.target.value); setError(''); }}
                    placeholder="Describe lo que has observado, qué cambiarías o qué te parece..."
                    className="input w-full min-h-[120px] resize-none"
                    maxLength={2000}
                    autoFocus
                  />
                  <p className="text-xs text-gray-400 text-right mt-1">
                    {comment.length}/2000
                  </p>
                </div>

                {error && (
                  <p className="text-red-600 text-sm">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || comment.trim().length < 10}
                  className="btn btn-primary w-full py-3"
                >
                  {loading ? 'Enviando...' : 'Enviar feedback'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
