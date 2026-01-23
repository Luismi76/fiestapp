'use client';

import { useState, useEffect } from 'react';

interface QuickReply {
  id: string;
  text: string;
  emoji: string | null;
  isDefault?: boolean;
}

interface QuickRepliesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (text: string) => void;
  userReplies?: QuickReply[];
  defaultReplies?: QuickReply[];
  onAddReply?: (text: string, emoji?: string) => Promise<void>;
  onDeleteReply?: (id: string) => Promise<void>;
}

// Default replies if none provided
const DEFAULT_QUICK_REPLIES: QuickReply[] = [
  { id: 'default-0', text: '¡Hola!', emoji: '👋', isDefault: true },
  { id: 'default-1', text: 'Perfecto', emoji: '👍', isDefault: true },
  { id: 'default-2', text: 'De acuerdo', emoji: '✅', isDefault: true },
  { id: 'default-3', text: '¿Dónde quedamos?', emoji: '📍', isDefault: true },
  { id: 'default-4', text: 'Llego en 5 minutos', emoji: '🏃', isDefault: true },
  { id: 'default-5', text: '¿A qué hora?', emoji: '🕐', isDefault: true },
  { id: 'default-6', text: '¡Genial!', emoji: '🎉', isDefault: true },
  { id: 'default-7', text: 'Un momento', emoji: '⏳', isDefault: true },
  { id: 'default-8', text: 'Gracias', emoji: '🙏', isDefault: true },
  { id: 'default-9', text: '¡Nos vemos!', emoji: '👋', isDefault: true },
];

export default function QuickRepliesDrawer({
  isOpen,
  onClose,
  onSelect,
  userReplies = [],
  defaultReplies = DEFAULT_QUICK_REPLIES,
  onAddReply,
  onDeleteReply,
}: QuickRepliesDrawerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newReplyText, setNewReplyText] = useState('');
  const [newReplyEmoji, setNewReplyEmoji] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Close add form when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setShowAddForm(false);
      setNewReplyText('');
      setNewReplyEmoji('');
    }
  }, [isOpen]);

  const handleSelect = (text: string) => {
    onSelect(text);
    onClose();
  };

  const handleAddReply = async () => {
    if (!newReplyText.trim() || !onAddReply) return;

    setAdding(true);
    try {
      await onAddReply(newReplyText.trim(), newReplyEmoji || undefined);
      setNewReplyText('');
      setNewReplyEmoji('');
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding reply:', error);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteReply = async (id: string) => {
    if (!onDeleteReply) return;

    setDeletingId(id);
    try {
      await onDeleteReply(id);
    } catch (error) {
      console.error('Error deleting reply:', error);
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 max-h-[70vh] flex flex-col animate-slide-up">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Respuestas rápidas</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* User replies */}
          {userReplies.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-2">
                Mis respuestas
              </p>
              <div className="flex flex-wrap gap-2">
                {userReplies.map((reply) => (
                  <div key={reply.id} className="relative group">
                    <button
                      onClick={() => handleSelect(reply.text)}
                      className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium hover:bg-primary/20 transition-colors"
                    >
                      {reply.emoji && <span className="mr-1">{reply.emoji}</span>}
                      {reply.text}
                    </button>
                    {onDeleteReply && (
                      <button
                        onClick={() => handleDeleteReply(reply.id)}
                        disabled={deletingId === reply.id}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {deletingId === reply.id ? (
                          <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add new reply form */}
          {showAddForm && onAddReply ? (
            <div className="mb-4 p-3 bg-gray-50 rounded-xl">
              <p className="text-xs font-medium text-gray-500 mb-2">
                Nueva respuesta rápida
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newReplyEmoji}
                  onChange={(e) => setNewReplyEmoji(e.target.value.slice(0, 2))}
                  placeholder="Emoji"
                  className="w-14 px-2 py-2 border border-gray-200 rounded-lg text-center text-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <input
                  type="text"
                  value={newReplyText}
                  onChange={(e) => setNewReplyText(e.target.value.slice(0, 50))}
                  placeholder="Texto de la respuesta"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddReply}
                  disabled={!newReplyText.trim() || adding}
                  className="flex-1 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50"
                >
                  {adding ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          ) : onAddReply ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full mb-4 py-2 border-2 border-dashed border-gray-300 text-gray-500 rounded-xl text-sm hover:border-primary hover:text-primary transition-colors"
            >
              + Añadir respuesta personalizada
            </button>
          ) : null}

          {/* Default replies */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">
              Respuestas comunes
            </p>
            <div className="flex flex-wrap gap-2">
              {defaultReplies.map((reply) => (
                <button
                  key={reply.id}
                  onClick={() => handleSelect(reply.text)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  {reply.emoji && <span className="mr-1">{reply.emoji}</span>}
                  {reply.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
