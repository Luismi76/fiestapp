'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { searchApi, AutocompleteResult, SearchHistoryItem } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { getUploadUrl } from '@/lib/utils';

interface SearchAutocompleteProps {
  initialValue?: string;
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchAutocomplete({
  initialValue = '',
  onSearch,
  placeholder = 'Buscar experiencias, festivales...',
  className = '',
}: SearchAutocompleteProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [query, setQuery] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AutocompleteResult | null>(null);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Cargar historial al montar
  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadHistory = async () => {
    try {
      const data = await searchApi.getHistory(5);
      setHistory(data);
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  };

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults(null);
      return;
    }

    setLoading(true);
    try {
      const data = await searchApi.autocomplete(searchQuery);
      setResults(data);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(true);

    // Debounce search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      handleSearch(value);
    }, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      // Guardar en historial
      if (user) {
        searchApi.saveSearch(query.trim()).catch(console.error);
      }
      setIsOpen(false);
      if (onSearch) {
        onSearch(query.trim());
      } else {
        router.push(`/experiences?search=${encodeURIComponent(query.trim())}`);
      }
    }
  };

  const handleSelectExperience = (id: string) => {
    setIsOpen(false);
    router.push(`/experiences/${id}`);
  };

  const handleSelectFestival = (id: string) => {
    setIsOpen(false);
    router.push(`/experiences?festival=${id}`);
  };

  const handleSelectCity = (city: string) => {
    setIsOpen(false);
    router.push(`/experiences?city=${encodeURIComponent(city)}`);
  };

  const handleSelectHistory = (item: SearchHistoryItem) => {
    setQuery(item.query);
    setIsOpen(false);
    if (onSearch) {
      onSearch(item.query);
    } else {
      router.push(`/experiences?search=${encodeURIComponent(item.query)}`);
    }
  };

  const handleClearHistory = async () => {
    try {
      await searchApi.clearHistory();
      setHistory([]);
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  const hasResults = results && (
    results.experiences.length > 0 ||
    results.festivals.length > 0 ||
    results.cities.length > 0
  );

  const showDropdown = isOpen && (hasResults || (history.length > 0 && !query));

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </form>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-lg border border-gray-100 max-h-96 overflow-y-auto">
          {/* Historial (solo si no hay query) */}
          {!query && history.length > 0 && (
            <div className="p-2">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-xs font-medium text-gray-500">Busquedas recientes</span>
                <button
                  onClick={handleClearHistory}
                  className="text-xs text-primary hover:underline"
                >
                  Limpiar
                </button>
              </div>
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectHistory(item)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg text-left"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  <span className="text-sm text-gray-700">{item.query}</span>
                </button>
              ))}
            </div>
          )}

          {/* Resultados de busqueda */}
          {hasResults && (
            <>
              {/* Experiencias */}
              {results.experiences.length > 0 && (
                <div className="p-2 border-t border-gray-100 first:border-t-0">
                  <span className="text-xs font-medium text-gray-500 px-2">Experiencias</span>
                  {results.experiences.map((exp) => (
                    <button
                      key={exp.id}
                      onClick={() => handleSelectExperience(exp.id)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg text-left"
                    >
                      <img
                        src={getUploadUrl(exp.photo || '/images/feria_abril.png')}
                        alt={exp.title}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{exp.title}</p>
                        <p className="text-xs text-gray-500">{exp.city}</p>
                      </div>
                      {exp.avgRating > 0 && (
                        <div className="flex items-center gap-0.5">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-yellow-500">
                            <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs text-gray-600">{exp.avgRating.toFixed(1)}</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Festivales */}
              {results.festivals.length > 0 && (
                <div className="p-2 border-t border-gray-100">
                  <span className="text-xs font-medium text-gray-500 px-2">Festivales</span>
                  {results.festivals.map((fest) => (
                    <button
                      key={fest.id}
                      onClick={() => handleSelectFestival(fest.id)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg text-left"
                    >
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-primary">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{fest.name}</p>
                        <p className="text-xs text-gray-500">{fest.city} · {fest.experienceCount} experiencias</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Ciudades */}
              {results.cities.length > 0 && (
                <div className="p-2 border-t border-gray-100">
                  <span className="text-xs font-medium text-gray-500 px-2">Ciudades</span>
                  {results.cities.map((city) => (
                    <button
                      key={city.name}
                      onClick={() => handleSelectCity(city.name)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg text-left"
                    >
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{city.name}</p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Sin resultados */}
          {query && !loading && !hasResults && (
            <div className="p-4 text-center text-sm text-gray-500">
              No se encontraron resultados para "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
