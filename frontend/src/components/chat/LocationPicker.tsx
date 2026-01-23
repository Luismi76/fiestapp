'use client';

import { useState, useEffect } from 'react';

interface LocationPickerProps {
  onSelect: (location: { latitude: number; longitude: number; name?: string }) => void;
  onCancel: () => void;
}

export default function LocationPicker({ onSelect, onCancel }: LocationPickerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    name?: string;
  } | null>(null);

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setError('La geolocalización no está disponible en tu navegador');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        });
      });

      const { latitude, longitude } = position.coords;

      // Try to get location name via reverse geocoding
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18`,
          {
            headers: {
              'User-Agent': 'FiestApp/1.0',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const name = formatLocationName(data);
          setLocation({ latitude, longitude, name });
        } else {
          setLocation({ latitude, longitude });
        }
      } catch {
        // If geocoding fails, just use coordinates
        setLocation({ latitude, longitude });
      }
    } catch (err) {
      if (err instanceof GeolocationPositionError) {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Permiso de ubicación denegado. Habilítalo en la configuración del navegador.');
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Información de ubicación no disponible.');
            break;
          case err.TIMEOUT:
            setError('Tiempo de espera agotado. Inténtalo de nuevo.');
            break;
          default:
            setError('Error al obtener la ubicación.');
        }
      } else {
        setError('Error al obtener la ubicación.');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatLocationName = (data: {
    display_name: string;
    address?: {
      road?: string;
      suburb?: string;
      city?: string;
      town?: string;
      village?: string;
    };
  }): string => {
    const parts: string[] = [];
    const address = data.address;

    if (address) {
      if (address.road) parts.push(address.road);
      if (address.suburb) parts.push(address.suburb);
      const city = address.city || address.town || address.village;
      if (city) parts.push(city);
    }

    if (parts.length === 0 && data.display_name) {
      return data.display_name.split(',').slice(0, 2).join(', ');
    }

    return parts.join(', ');
  };

  const handleConfirm = () => {
    if (location) {
      onSelect(location);
    }
  };

  // Auto-get location on mount
  useEffect(() => {
    getCurrentLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:w-[400px] sm:rounded-2xl rounded-t-2xl overflow-hidden max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold">Compartir ubicación</h2>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-500">Obteniendo tu ubicación...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-red-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
              </div>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={getCurrentLocation}
                className="text-primary font-medium hover:underline"
              >
                Intentar de nuevo
              </button>
            </div>
          )}

          {location && !loading && (
            <div className="space-y-4">
              {/* Map preview */}
              <div className="relative h-48 bg-gray-100 rounded-xl overflow-hidden">
                <iframe
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.longitude - 0.005},${location.latitude - 0.003},${location.longitude + 0.005},${location.latitude + 0.003}&layer=mapnik&marker=${location.latitude},${location.longitude}`}
                  className="w-full h-full border-0"
                  title="Tu ubicación"
                />
              </div>

              {/* Location info */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-red-500 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900">
                    {location.name || 'Tu ubicación actual'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </p>
                </div>
              </div>

              {/* Refresh button */}
              <button
                onClick={getCurrentLocation}
                className="w-full text-sm text-primary hover:underline"
              >
                Actualizar ubicación
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {location && !loading && (
          <div className="p-4 border-t border-gray-100">
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-full hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-3 bg-primary text-white font-medium rounded-full hover:bg-primary/90 transition-colors"
              >
                Compartir
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
