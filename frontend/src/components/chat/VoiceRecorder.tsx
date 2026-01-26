'use client';

import { useState } from 'react';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import logger from '@/lib/logger';

interface VoiceRecorderProps {
  onSend: (blob: Blob, duration: number) => Promise<void>;
  onCancel?: () => void;
  maxDuration?: number;
  disabled?: boolean;
}

export default function VoiceRecorder({
  onSend,
  onCancel,
  maxDuration = 60,
  disabled = false,
}: VoiceRecorderProps) {
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const { state, duration, isSupported, start, stop, cancel } = useVoiceRecorder({
    maxDuration,
    onRecordingComplete: async (blob, recordedDuration) => {
      setSending(true);
      try {
        await onSend(blob, recordedDuration);
      } catch (err) {
        logger.error('Error sending voice:', err);
        setError('Error al enviar el mensaje de voz');
      } finally {
        setSending(false);
      }
    },
    onError: (err) => {
      setError(err);
      setTimeout(() => setError(null), 5000);
    },
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCancel = () => {
    cancel();
    onCancel?.();
  };

  if (!isSupported) {
    return (
      <div className="text-sm text-gray-500 text-center p-2">
        Tu navegador no soporta grabación de audio
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-500 text-center p-2">
        {error}
      </div>
    );
  }

  // Estado idle - mostrar botón de micrófono
  if (state === 'idle' && !sending) {
    return (
      <button
        onClick={start}
        disabled={disabled}
        className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Mantén presionado para grabar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
        </svg>
      </button>
    );
  }

  // Estado recording - mostrar controles de grabación
  if (state === 'recording') {
    return (
      <div className="flex items-center gap-3 bg-red-50 rounded-full px-4 py-2">
        {/* Cancelar */}
        <button
          onClick={handleCancel}
          className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Indicador de grabación */}
        <div className="flex items-center gap-2 flex-1">
          <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-red-600">
            {formatDuration(duration)}
          </span>
          <div className="flex-1 h-1 bg-red-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 transition-all"
              style={{ width: `${(duration / maxDuration) * 100}%` }}
            />
          </div>
        </div>

        {/* Enviar */}
        <button
          onClick={stop}
          className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary/90 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
          </svg>
        </button>
      </div>
    );
  }

  // Estado processing o sending
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-gray-500">Enviando...</span>
    </div>
  );
}
