'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import logger from '@/lib/logger';

type RecorderState = 'idle' | 'recording' | 'processing';

interface UseVoiceRecorderOptions {
  maxDuration?: number; // en segundos, default 60
  onRecordingComplete?: (blob: Blob, duration: number) => void;
  onError?: (error: string) => void;
}

interface UseVoiceRecorderReturn {
  state: RecorderState;
  duration: number;
  isSupported: boolean;
  start: () => Promise<void>;
  stop: () => void;
  cancel: () => void;
}

export function useVoiceRecorder({
  maxDuration = 60,
  onRecordingComplete,
  onError,
}: UseVoiceRecorderOptions = {}): UseVoiceRecorderReturn {
  const [state, setState] = useState<RecorderState>('idle');
  const [duration, setDuration] = useState(0);
  const [isSupported] = useState(() =>
    typeof window !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined'
  );

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const stopRef = useRef<() => void>(() => {});
  const startTimeRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setDuration(0);
  }, []);

  const start = useCallback(async () => {
    if (state !== 'idle') return;
    if (!isSupported) {
      onError?.('Tu navegador no soporta grabación de audio');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;
      chunksRef.current = [];

      // Determinar el mejor formato soportado por el navegador. Orden por
      // compatibilidad y calidad: opus en webm (Chrome/Firefox), mp4/aac
      // (Safari), ogg/opus (Firefox antiguo), fallback sin codec.
      const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/ogg',
      ];
      const mimeType =
        candidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Usamos el mimeType real del MediaRecorder (puede diferir del pedido)
        const finalMime =
          mediaRecorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: finalMime });
        const recordedDuration = Math.max(
          1,
          Math.round((Date.now() - startTimeRef.current) / 1000),
        );

        if (blob.size === 0) {
          onError?.(
            'No se capturó audio. Comprueba los permisos del micrófono e intenta de nuevo.',
          );
          cleanup();
          setState('idle');
          return;
        }

        setState('processing');
        onRecordingComplete?.(blob, recordedDuration);
        cleanup();
        setState('idle');
      };

      mediaRecorder.onerror = () => {
        onError?.('Error durante la grabación');
        cleanup();
        setState('idle');
      };

      mediaRecorderRef.current = mediaRecorder;
      // Sin timeslice: los chunks se acumulan en un solo buffer y se emiten
      // al llamar a stop(). Más simple y fiable para grabaciones cortas.
      mediaRecorder.start();

      startTimeRef.current = Date.now();
      setState('recording');

      // Timer para actualizar duración y límite máximo
      timerRef.current = setInterval(() => {
        const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);

        if (elapsed >= maxDuration) {
          stopRef.current();
        }
      }, 1000);
    } catch (error) {
      logger.error('Error starting recording:', error);
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          onError?.(
            'Permiso de micrófono denegado. Habilita el acceso en la configuración del navegador.'
          );
        } else if (error.name === 'NotFoundError') {
          onError?.(
            'No se encontró un micrófono. Conecta un micrófono e intenta de nuevo.'
          );
        } else {
          onError?.('Error al acceder al micrófono');
        }
      } else {
        onError?.('Error al iniciar la grabación');
      }
      cleanup();
    }
  }, [state, isSupported, maxDuration, onRecordingComplete, onError, cleanup]);

  const stop = useCallback(() => {
    if (
      state !== 'recording' ||
      !mediaRecorderRef.current ||
      mediaRecorderRef.current.state === 'inactive'
    ) {
      return;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // stop() emite automáticamente el chunk final antes del evento 'stop'.
    // No hace falta requestData() previo (de hecho puede causar problemas).
    mediaRecorderRef.current.stop();
  }, [state]);

  // Keep stopRef updated so start callback can access latest stop
  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  const cancel = useCallback(() => {
    if (state !== 'recording') return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      // Remove the onstop handler to prevent calling onRecordingComplete
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }

    cleanup();
    setState('idle');
  }, [state, cleanup]);

  return {
    state,
    duration,
    isSupported,
    start,
    stop,
    cancel,
  };
}
