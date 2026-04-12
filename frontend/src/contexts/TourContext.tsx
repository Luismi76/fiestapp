'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import dynamic from 'next/dynamic';
import type { EventData, Step } from 'react-joyride';
import { toursApi, type TourId } from '@/lib/api';
import { useAuth } from './AuthContext';
import { tourRegistry } from '@/lib/tours';

// Joyride v3 expone su componente como export con nombre `Joyride`.
// Se carga sólo en cliente porque toca el DOM directamente.
const Joyride = dynamic(
  () => import('react-joyride').then((mod) => mod.Joyride),
  { ssr: false },
);

interface TourContextValue {
  /** IDs de tours ya completados (vacío hasta que carguemos del backend) */
  completed: TourId[];
  /** ¿Ya se cargó la lista del backend? */
  loaded: boolean;
  /** Lanza un tour. Si `force` es false, no se lanza si ya está completado. */
  startTour: (tourId: TourId, options?: { force?: boolean }) => void;
  /** Devuelve true si el tour aún no se ha completado */
  isPending: (tourId: TourId) => boolean;
  /** Marca un tour como completado en el backend */
  markCompleted: (tourId: TourId) => Promise<void>;
  /** Resetea un tour concreto (vuelve a estar pendiente) */
  resetTour: (tourId: TourId) => Promise<void>;
  /** Resetea todos los tours del usuario */
  resetAll: () => Promise<void>;
  /** Refresca la lista del backend */
  refresh: () => Promise<void>;
  /** El tour actualmente en ejecución, si lo hay */
  activeTourId: TourId | null;
}

const TourContext = createContext<TourContextValue | undefined>(undefined);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [completed, setCompleted] = useState<TourId[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeTourId, setActiveTourId] = useState<TourId | null>(null);
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  // Evita lanzar dos veces el mismo tour por re-renders
  const launchedRef = useRef<Set<TourId>>(new Set());

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setCompleted([]);
      setLoaded(false);
      return;
    }
    try {
      const res = await toursApi.getCompleted();
      setCompleted(res.completed as TourId[]);
    } catch {
      // silencioso: si falla, asumimos lista vacía
    } finally {
      setLoaded(true);
    }
  }, [isAuthenticated]);

  // Cargar la lista cuando el usuario autentica
  useEffect(() => {
    if (isAuthenticated && user) {
      void refresh();
    } else {
      setCompleted([]);
      setLoaded(false);
      setActiveTourId(null);
      setRun(false);
      launchedRef.current.clear();
    }
  }, [isAuthenticated, user, refresh]);

  // Auto-trigger del tour de bienvenida la primera vez que el usuario se loguea.
  // Se lanza desde aquí (no desde una página concreta) porque el login puede
  // redirigir a /experiences, /dashboard, etc., y el tour debe arrancar
  // independientemente de la primera ruta visitada.
  useEffect(() => {
    if (!loaded || !isAuthenticated) return;
    if (completed.includes('welcome')) return;
    if (launchedRef.current.has('welcome')) return;
    // Delay para asegurar que el bottom nav y el resto del DOM están montados
    const timer = setTimeout(() => {
      const definition = tourRegistry.welcome;
      if (!definition) return;
      launchedRef.current.add('welcome');
      setSteps(definition.steps);
      setActiveTourId('welcome');
      setRun(true);
    }, 800);
    return () => clearTimeout(timer);
  }, [loaded, isAuthenticated, completed]);

  const isPending = useCallback(
    (tourId: TourId) => loaded && !completed.includes(tourId),
    [loaded, completed],
  );

  const startTour = useCallback(
    (tourId: TourId, options?: { force?: boolean }) => {
      const force = options?.force ?? false;
      if (!force && completed.includes(tourId)) return;
      if (launchedRef.current.has(tourId) && !force) return;
      const definition = tourRegistry[tourId];
      if (!definition) return;
      launchedRef.current.add(tourId);
      setSteps(definition.steps);
      setActiveTourId(tourId);
      setRun(true);
    },
    [completed],
  );

  const markCompleted = useCallback(async (tourId: TourId) => {
    try {
      const res = await toursApi.markCompleted(tourId);
      setCompleted(res.completed as TourId[]);
    } catch {
      // silencioso
    }
  }, []);

  const resetTour = useCallback(async (tourId: TourId) => {
    try {
      const res = await toursApi.reset(tourId);
      setCompleted(res.completed as TourId[]);
      launchedRef.current.delete(tourId);
    } catch {
      // silencioso
    }
  }, []);

  const resetAll = useCallback(async () => {
    try {
      const res = await toursApi.resetAll();
      setCompleted(res.completed as TourId[]);
      launchedRef.current.clear();
    } catch {
      // silencioso
    }
  }, []);

  // Joyride v3 dispara `tour:end` cuando el tour termina (finished, skipped o stop manual).
  const handleEvent = useCallback(
    (data: EventData) => {
      if (data.type === 'tour:end') {
        setRun(false);
        setSteps([]);
        if (activeTourId) {
          void markCompleted(activeTourId);
        }
        setActiveTourId(null);
      }
    },
    [activeTourId, markCompleted],
  );

  const value = useMemo<TourContextValue>(
    () => ({
      completed,
      loaded,
      startTour,
      isPending,
      markCompleted,
      resetTour,
      resetAll,
      refresh,
      activeTourId,
    }),
    [
      completed,
      loaded,
      startTour,
      isPending,
      markCompleted,
      resetTour,
      resetAll,
      refresh,
      activeTourId,
    ],
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      {run && steps.length > 0 && (
        <Joyride
          steps={steps}
          run={run}
          continuous
          scrollToFirstStep
          onEvent={handleEvent}
          locale={{
            back: 'Atrás',
            close: 'Cerrar',
            last: 'Finalizar',
            next: 'Siguiente',
            open: 'Abrir',
            skip: 'Saltar',
          }}
          options={{
            showProgress: true,
            buttons: ['back', 'skip', 'primary'],
            primaryColor: '#FF6B35',
            textColor: '#1f2937',
            backgroundColor: '#ffffff',
            arrowColor: '#ffffff',
            overlayColor: 'rgba(0, 0, 0, 0.55)',
            zIndex: 10000,
          }}
        />
      )}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour debe usarse dentro de un TourProvider');
  }
  return context;
}
