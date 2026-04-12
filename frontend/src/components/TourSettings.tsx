'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTour } from '@/contexts/TourContext';
import { allTours } from '@/lib/tours';
import type { TourId } from '@/lib/api';

/**
 * Sección de "Tutoriales interactivos" para la página de edición de perfil.
 * Muestra todos los tours definidos, indica cuáles ha completado el usuario
 * y permite re-lanzarlos manualmente.
 */
export default function TourSettings() {
  const router = useRouter();
  const { completed, loaded, startTour, resetTour, resetAll } = useTour();
  const [resettingAll, setResettingAll] = useState(false);

  const handleReplay = async (tourId: TourId, startPath: string) => {
    // Resetear el estado en backend para que se considere "pendiente" otra vez
    await resetTour(tourId);
    // Navegar a la página donde tiene sentido el tour y lanzarlo
    router.push(startPath);
    // Pequeño delay para asegurar que el DOM esté listo
    setTimeout(() => startTour(tourId, { force: true }), 800);
  };

  const handleResetAll = async () => {
    setResettingAll(true);
    try {
      await resetAll();
    } finally {
      setResettingAll(false);
    }
  };

  return (
    <div className="px-4 mt-4">
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-5 h-5 text-primary"
              >
                <path d="M10 2a.75.75 0 0 1 .75.75v.41a8.5 8.5 0 1 1-1.5 0v-.41A.75.75 0 0 1 10 2Zm0 4a.75.75 0 0 1 .75.75V10a.75.75 0 0 1-1.5 0V6.75A.75.75 0 0 1 10 6Zm0 7a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                Tutoriales interactivos
              </h3>
              <p className="text-xs text-gray-500">
                Vuelve a ver los recorridos guiados de la aplicación
              </p>
            </div>
          </div>
          {loaded && completed.length > 0 && (
            <button
              type="button"
              onClick={handleResetAll}
              disabled={resettingAll}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              {resettingAll ? 'Reseteando…' : 'Resetear todos'}
            </button>
          )}
        </div>

        <ul className="divide-y divide-gray-100">
          {allTours.map((tour) => {
            const isDone = completed.includes(tour.id);
            return (
              <li
                key={tour.id}
                className="p-4 flex items-start justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{tour.title}</p>
                    {isDone && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="w-3 h-3"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Completado
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {tour.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleReplay(tour.id, tour.startPath)}
                  className="text-sm font-semibold text-primary hover:text-primary-dark whitespace-nowrap"
                >
                  {isDone ? 'Repetir' : 'Ver ahora'}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
