'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

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
  const [isSupported, setIsSupported] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Check browser support
  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof MediaRecorder !== 'undefined';
    setIsSupported(supported);
  }, []);

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

      // Determinar el formato de audio soportado
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/ogg';

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const recordedDuration = Math.round(
          (Date.now() - startTimeRef.current) / 1000
        );

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
      mediaRecorder.start(1000); // Guardar chunks cada segundo

      startTimeRef.current = Date.now();
      setState('recording');

      // Timer para actualizar duración y límite máximo
      timerRef.current = setInterval(() => {
        const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
        setDuration(elapsed);

        if (elapsed >= maxDuration) {
          stop();
        }
      }, 100);
    } catch (error) {
      console.error('Error starting recording:', error);
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

    mediaRecorderRef.current.stop();
  }, [state]);

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
