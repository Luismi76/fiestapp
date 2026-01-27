'use client';

import { useState, useRef, useEffect, RefObject } from 'react';
import Link from 'next/link';
import { MatchStatus } from '@/types/match';

interface VoiceRecorderState {
  state: 'idle' | 'recording' | 'processing';
  duration: number;
  isSupported: boolean;
}

interface ChatInputProps {
  status: MatchStatus;
  newMessage: string;
  sending: boolean;
  isConnected: boolean;
  useMockData: boolean;
  walletError: string;
  error: string;
  voiceRecorder: VoiceRecorderState;
  voiceError: string | null;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onMessageChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSendMessage: (e: React.FormEvent) => void;
  onVoiceStart: () => void;
  onVoiceEnd: () => void;
  onVoiceCancel: () => void;
  onShowLocationPicker: () => void;
  onShowQuickReplies: () => void;
  onClearWalletError: () => void;
  onClearError: () => void;
}

export default function ChatInput({
  status,
  newMessage,
  sending,
  isConnected,
  useMockData,
  walletError,
  error,
  voiceRecorder,
  voiceError,
  textareaRef,
  onMessageChange,
  onKeyDown,
  onSendMessage,
  onVoiceStart,
  onVoiceEnd,
  onVoiceCancel,
  onShowLocationPicker,
  onShowQuickReplies,
  onClearWalletError,
  onClearError,
}: ChatInputProps) {
  const canSendMessages = status !== 'rejected' && status !== 'cancelled';

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [newMessage, textareaRef]);

  if (!canSendMessages) {
    return (
      <div className="p-4 bg-gray-50 border-t border-gray-200 text-center">
        <p className="text-sm text-gray-500">
          {status === 'rejected' && 'Esta solicitud fue rechazada'}
          {status === 'cancelled' && 'Esta solicitud fue cancelada'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border-t border-gray-100 shadow-lg">
      {/* Connection status */}
      {!useMockData && (
        <div className={`px-4 pt-2 flex items-center gap-1.5 text-[11px] ${isConnected ? 'text-emerald-600' : 'text-gray-400'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
          {isConnected ? 'Conectado' : 'Conectando...'}
        </div>
      )}

      {/* Wallet error message */}
      {walletError && (
        <div className="mx-4 mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-amber-800">{walletError}</p>
              <Link href="/wallet" className="text-sm text-amber-600 underline hover:text-amber-700">
                Ir al monedero
              </Link>
            </div>
            <button onClick={onClearWalletError} className="text-amber-600 hover:text-amber-700">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* General error message */}
      {error && !walletError && (
        <div className="mx-4 mt-2 p-3 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-red-600 flex-shrink-0">
              <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-800 flex-1">{error}</p>
            <button onClick={onClearError} className="text-red-600 hover:text-red-700">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <form onSubmit={onSendMessage} className="p-3">
        {/* Action buttons row */}
        <div className="flex items-center gap-1 mb-2 px-1">
          <button
            type="button"
            onClick={onShowQuickReplies}
            className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
            title="Respuestas rápidas"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onShowLocationPicker}
            className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
            title="Compartir ubicación"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
          </button>
        </div>

        {/* Recording indicator */}
        {voiceRecorder.state === 'recording' && (
          <div className="flex items-center gap-3 bg-red-50 rounded-2xl p-3 mb-2">
            <button
              type="button"
              onClick={onVoiceCancel}
              className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-red-600">
              {Math.floor(voiceRecorder.duration / 60)}:{(voiceRecorder.duration % 60).toString().padStart(2, '0')}
            </span>
            <div className="flex-1 h-1 bg-red-200 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 transition-all" style={{ width: `${(voiceRecorder.duration / 60) * 100}%` }} />
            </div>
            <span className="text-xs text-gray-500">Suelta para enviar</span>
          </div>
        )}

        {/* Voice error message */}
        {voiceError && (
          <div className="text-xs text-red-500 text-center mb-2">{voiceError}</div>
        )}

        <div className="flex items-end gap-2 bg-gray-100 rounded-2xl p-1.5 pl-4">
          <textarea
            ref={textareaRef}
            value={newMessage}
            onChange={onMessageChange}
            onKeyDown={onKeyDown}
            placeholder="Escribe un mensaje..."
            rows={1}
            className="flex-1 bg-transparent text-sm resize-none focus:outline-none py-2.5 max-h-[120px] placeholder-gray-400"
            style={{ minHeight: '40px' }}
            disabled={sending || voiceRecorder.state === 'recording'}
          />

          {/* Send button (when text) or Mic button (when empty) */}
          {newMessage.trim() ? (
            <button
              type="submit"
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                !sending
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md hover:shadow-lg hover:scale-105'
                  : 'bg-gray-300 text-gray-500'
              }`}
              disabled={sending}
            >
              {sending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.288Z" />
                </svg>
              )}
            </button>
          ) : (
            <button
              type="button"
              onMouseDown={onVoiceStart}
              onMouseUp={onVoiceEnd}
              onMouseLeave={onVoiceEnd}
              onTouchStart={onVoiceStart}
              onTouchEnd={onVoiceEnd}
              disabled={sending || !voiceRecorder.isSupported}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                voiceRecorder.state === 'recording'
                  ? 'bg-red-500 text-white scale-110'
                  : sending
                    ? 'bg-gray-300 text-gray-500'
                    : 'bg-gradient-to-br from-primary to-primary/80 text-white shadow-md hover:shadow-lg hover:scale-105'
              }`}
              title={voiceRecorder.isSupported ? 'Mantén pulsado para grabar' : 'Tu navegador no soporta grabación'}
            >
              {sending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                </svg>
              )}
            </button>
          )}
        </div>
        <p className="text-[10px] text-gray-400 text-center mt-1.5">
          {newMessage.trim() ? 'Enter enviar, Shift+Enter nueva línea' : 'Mantén el mic para grabar voz'}
        </p>
      </form>
    </div>
  );
}
