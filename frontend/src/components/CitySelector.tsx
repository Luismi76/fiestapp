'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
  };
}

export interface CityLocation {
  city: string;
  latitude: number;
  longitude: number;
}

interface CitySelectorProps {
  value: string;
  onChange: (location: CityLocation) => void;
  error?: string;
}

export default function CitySelector({ value, onChange, error }: CitySelectorProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const searchCity = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const encoded = encodeURIComponent(q);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&countrycodes=es&limit=5&addressdetails=1&accept-language=es`,
        { headers: { 'User-Agent': 'FiestApp/1.0' } }
      );
      const data: NominatimResult[] = await res.json();
      setResults(data);
      setShowDropdown(data.length > 0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (val: string) => {
    setQuery(val);
    setGeoError('');

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchCity(val), 400);
  };

  const extractCityName = (result: NominatimResult): string => {
    const addr = result.address;
    if (addr) {
      return addr.city || addr.town || addr.village || addr.municipality || result.display_name.split(',')[0];
    }
    return result.display_name.split(',')[0];
  };

  const handleSelect = (result: NominatimResult) => {
    const cityName = extractCityName(result);
    setQuery(cityName);
    setShowDropdown(false);
    setResults([]);
    onChange({
      city: cityName,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
    });
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setGeoError('Tu navegador no soporta geolocalización');
      return;
    }

    setGeoLoading(true);
    setGeoError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&accept-language=es`,
            { headers: { 'User-Agent': 'FiestApp/1.0' } }
          );
          const data: NominatimResult = await res.json();
          const cityName = extractCityName(data);
          setQuery(cityName);
          onChange({ city: cityName, latitude, longitude });
        } catch {
          setGeoError('No se pudo obtener tu ciudad');
        } finally {
          setGeoLoading(false);
        }
      },
      () => {
        setGeoError('Permiso de ubicación denegado');
        setGeoLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  const formatDisplayName = (result: NominatimResult): string => {
    const parts = result.display_name.split(',').map(p => p.trim());
    // Show max 3 parts: city, region, country
    return parts.slice(0, 3).join(', ');
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-semibold text-gray-900 mb-2">
        Ubicación <span className="text-red-400">*</span>
      </label>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            placeholder="Busca tu ciudad..."
            className={`w-full px-4 py-3.5 bg-white border-2 rounded-xl text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:border-primary ${
              error ? 'border-red-300' : 'border-gray-200'
            }`}
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleGeolocate}
          disabled={geoLoading}
          className="flex items-center gap-1.5 px-3 py-3 border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 flex-shrink-0"
          title="Usar mi ubicación"
        >
          {geoLoading ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
          )}
        </button>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {results.map((result, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(result)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
            >
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-400 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                <span className="text-sm text-gray-900">{formatDisplayName(result)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Errors */}
      {error && (
        <p className="text-red-500 text-sm mt-1.5 flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm2.78-4.22a.75.75 0 0 1-1.06 0L8 9.06l-1.72 1.72a.75.75 0 1 1-1.06-1.06L6.94 8 5.22 6.28a.75.75 0 0 1 1.06-1.06L8 6.94l1.72-1.72a.75.75 0 1 1 1.06 1.06L9.06 8l1.72 1.72a.75.75 0 0 1 0 1.06Z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      {geoError && (
        <p className="text-amber-600 text-sm mt-1.5">{geoError}</p>
      )}
    </div>
  );
}
