'use client';

import { useEffect, RefObject } from 'react';
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
  const isRecording = voiceRecorder.state === 'recording';

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

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="flex-shrink-0">
      {/* Errors — compact inline banners */}
      {walletError && (
        <div className="mx-2 mb-1 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-500 flex-shrink-0" aria-hidden="true">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          <span className="text-amber-800 flex-1 truncate">{walletError}</span>
          <Link href="/wallet" className="text-amber-600 font-semibold hover:text-amber-700 flex-shrink-0">Monedero</Link>
          <button onClick={onClearWalletError} className="cursor-pointer text-amber-400 hover:text-amber-600 p-0.5" aria-label="Cerrar aviso">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
      )}
      {error && !walletError && (
        <div className="mx-2 mb-1 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-500 flex-shrink-0" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          <span className="text-red-800 flex-1 truncate">{error}</span>
          <button onClick={onClearError} className="cursor-pointer text-red-400 hover:text-red-600 p-0.5" aria-label="Cerrar error">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
      )}
      {voiceError && !isRecording && (
        <div className="text-[11px] text-red-500 text-center py-1" role="alert">{voiceError}</div>
      )}

      {/* WhatsApp-style: [pill with icons inside] [circle button] */}
      <form onSubmit={onSendMessage} className="flex items-end gap-2 px-4 py-1.5 pb-[max(6px,env(safe-area-inset-bottom))]">
        {/* Input pill */}
        <div className="flex-1 flex items-end bg-white rounded-[25px] border border-gray-200 overflow-hidden">
          {isRecording ? (
            /* Recording state inside pill */
            <div className="flex-1 flex items-center gap-2 px-3 py-2" style={{ minHeight: '42px' }}>
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse motion-reduce:animate-none flex-shrink-0" aria-hidden="true" />
              <span className="text-[15px] font-medium text-red-600 tabular-nums">
                {formatDuration(voiceRecorder.duration)}
              </span>
              <div className="flex-1 flex items-center gap-[2px] h-5 overflow-hidden" aria-hidden="true">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-[2px] bg-red-400/50 rounded-full animate-pulse motion-reduce:animate-none"
                    style={{
                      height: `${4 + Math.sin(i * 0.8 + voiceRecorder.duration * 3) * 7}px`,
                      animationDelay: `${i * 50}ms`,
                    }}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onVoiceCancel(); }}
                className="cursor-pointer text-gray-400 hover:text-red-500 transition-colors p-0.5"
                aria-label="Cancelar grabacion"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
            </div>
          ) : (
            /* Normal state: [emoji] [textarea] [quick-replies] [location] */
            <>
              {/* Left icon — emoji/sticker */}
              <button
                type="button"
                className="cursor-pointer flex items-center justify-center w-10 h-[42px] text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
                aria-label="Emojis"
              >
                {/* Smiley face icon */}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-[22px] h-[22px]" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
                </svg>
              </button>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={newMessage}
                onChange={onMessageChange}
                onKeyDown={onKeyDown}
                placeholder="Mensaje"
                rows={1}
                className="flex-1 bg-transparent text-[15px] resize-none focus:outline-none py-[10px] max-h-[120px] placeholder-gray-400 leading-snug"
                style={{ minHeight: '42px' }}
                disabled={sending}
              />

              {/* Right icons inside pill */}
              <button
                type="button"
                onClick={onShowQuickReplies}
                className="cursor-pointer flex items-center justify-center w-9 h-[42px] text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
                aria-label="Respuestas rapidas"
              >
                {/* Chat bubble icon */}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-[22px] h-[22px]" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={onShowLocationPicker}
                className="cursor-pointer flex items-center justify-center w-9 h-[42px] text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0 pr-1"
                aria-label="Compartir ubicacion"
              >
                {/* Map pin icon */}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-[22px] h-[22px]" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Circle button outside pill — mic or send */}
        {newMessage.trim() && !isRecording ? (
          <button
            type="submit"
            className={`cursor-pointer w-[42px] h-[42px] rounded-full flex items-center justify-center transition-all duration-150 flex-shrink-0 ${
              !sending
                ? 'bg-primary text-white active:scale-95'
                : 'bg-gray-300 text-gray-500'
            }`}
            disabled={sending}
            aria-label={sending ? 'Enviando mensaje' : 'Enviar mensaje'}
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.288Z" />
              </svg>
            )}
          </button>
        ) : (
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              if (!isRecording && !sending) onVoiceStart();
            }}
            onPointerUp={() => {
              if (isRecording) onVoiceEnd();
            }}
            onContextMenu={(e) => e.preventDefault()}
            disabled={sending || !voiceRecorder.isSupported}
            className={`cursor-pointer w-[42px] h-[42px] rounded-full flex items-center justify-center transition-all duration-150 flex-shrink-0 select-none touch-none ${
              isRecording
                ? 'bg-red-500 text-white scale-110'
                : sending || !voiceRecorder.isSupported
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-primary text-white active:scale-95'
            }`}
            aria-label={
              isRecording
                ? 'Suelta para enviar audio'
                : voiceRecorder.isSupported
                  ? 'Manten pulsado para grabar audio'
                  : 'Grabacion no disponible'
            }
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
            ) : isRecording ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.288Z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
              </svg>
            )}
          </button>
        )}
      </form>

      {/* Connection indicator — only when disconnected */}
      {!useMockData && !isConnected && (
        <div className="flex items-center justify-center gap-1 pb-1 text-[10px] text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
          Conectando...
        </div>
      )}
    </div>
  );
}
