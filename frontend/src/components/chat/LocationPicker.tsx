'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface LocationPickerProps {
  onSelect: (location: { latitude: number; longitude: number; name?: string }) => void;
  onCancel: () => void;
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
  };
}

export default function LocationPicker({ onSelect, onCancel }: LocationPickerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    name?: string;
  } | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [mode, setMode] = useState<'auto' | 'search'>('auto');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const reverseGeocode = useCallback(async (latitude: number, longitude: number): Promise<string | undefined> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18`,
        { headers: { 'User-Agent': 'FiestApp/1.0' } }
      );
      if (response.ok) {
        const data = await response.json();
        return formatLocationName(data);
      }
    } catch {
      // Ignore geocoding errors
    }
    return undefined;
  }, []);

  const getCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('La geolocalizacion no esta disponible en tu navegador');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude, accuracy } = position.coords;

      // If accuracy is worse than 50km, the position is likely IP-based and unreliable
      if (accuracy > 50000) {
        setMode('search');
        setError('No se pudo obtener una ubicacion precisa. Busca tu ubicacion manualmente.');
        setLoading(false);
        return;
      }

      const name = await reverseGeocode(latitude, longitude);
      setLocation({ latitude, longitude, name });
    } catch (err) {
      if (err instanceof GeolocationPositionError) {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Permiso de ubicacion denegado.');
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Ubicacion no disponible.');
            break;
          case err.TIMEOUT:
            setError('Tiempo agotado.');
            break;
          default:
            setError('Error al obtener la ubicacion.');
        }
      } else {
        setError('Error al obtener la ubicacion.');
      }
      setMode('search');
    } finally {
      setLoading(false);
    }
  }, [reverseGeocode]);

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
      return data.display_name.split(',').slice(0, 3).join(', ');
    }

    return parts.join(', ');
  };

  const searchLocation = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=es`,
        { headers: { 'User-Agent': 'FiestApp/1.0' } }
      );
      if (response.ok) {
        const results: SearchResult[] = await response.json();
        setSearchResults(results);
      }
    } catch {
      // Ignore search errors
    } finally {
      setSearching(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => searchLocation(value), 400);
  };

  const handleSelectResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    const name = formatLocationName(result);
    setLocation({ latitude: lat, longitude: lon, name });
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleConfirm = () => {
    if (location) {
      onSelect(location);
    }
  };

  // Auto-get location on mount
  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white w-full sm:w-[400px] sm:rounded-2xl rounded-t-2xl overflow-hidden max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold">Compartir ubicacion</h2>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search bar */}
        <div className="p-4 pb-0">
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar dirección o ciudad..."
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
              {searchResults.map((result) => (
                <button
                  key={result.place_id}
                  onClick={() => handleSelectResult(result)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                >
                  <p className="text-sm font-medium text-gray-900 line-clamp-1">
                    {result.address?.road || result.address?.city || result.address?.town || result.display_name.split(',')[0]}
                  </p>
                  <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                    {result.display_name}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {loading && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-500 text-sm">Obteniendo tu ubicacion...</p>
            </div>
          )}

          {error && !location && (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-amber-500">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm text-gray-600 mb-3">{error}</p>
              {mode === 'search' && (
                <p className="text-xs text-gray-400">Usa el buscador de arriba para encontrar tu ubicacion</p>
              )}
              {mode === 'auto' && (
                <button onClick={getCurrentLocation} className="text-sm text-primary font-medium hover:underline">
                  Intentar de nuevo
                </button>
              )}
            </div>
          )}

          {location && !loading && (
            <div className="space-y-3">
              {/* Map preview */}
              <div className="relative h-44 bg-gray-100 rounded-xl overflow-hidden">
                <iframe
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.longitude - 0.005},${location.latitude - 0.003},${location.longitude + 0.005},${location.latitude + 0.003}&layer=mapnik&marker=${location.latitude},${location.longitude}`}
                  className="w-full h-full border-0"
                  title="Tu ubicacion"
                />
              </div>

              {/* Location info */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                <div className="min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">
                    {location.name || 'Ubicacion seleccionada'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </p>
                </div>
              </div>

              {/* Use GPS button */}
              <button
                onClick={() => { setMode('auto'); getCurrentLocation(); }}
                className="w-full flex items-center justify-center gap-2 text-xs text-primary hover:text-primary/80 font-medium py-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0ZM10 11.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" clipRule="evenodd" />
                </svg>
                Usar mi ubicacion GPS
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
