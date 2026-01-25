'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Festival } from '@/types/experience';
import { festivalsApi } from '@/lib/api';

interface FestivalSelectorProps {
  value: string;
  onChange: (festivalId: string, festival?: Festival | NewFestival) => void;
  error?: string;
}

interface NewFestival {
  id: string;
  name: string;
  city: string;
  province?: string;
  isNew: true;
}

// Provincias de España agrupadas por comunidad autónoma
const PROVINCES: Record<string, string[]> = {
  'Andalucía': ['Almería', 'Cádiz', 'Córdoba', 'Granada', 'Huelva', 'Jaén', 'Málaga', 'Sevilla'],
  'Aragón': ['Huesca', 'Teruel', 'Zaragoza'],
  'Asturias': ['Asturias'],
  'Islas Baleares': ['Islas Baleares'],
  'Canarias': ['Las Palmas', 'Santa Cruz de Tenerife'],
  'Cantabria': ['Cantabria'],
  'Castilla-La Mancha': ['Albacete', 'Ciudad Real', 'Cuenca', 'Guadalajara', 'Toledo'],
  'Castilla y León': ['Ávila', 'Burgos', 'León', 'Palencia', 'Salamanca', 'Segovia', 'Soria', 'Valladolid', 'Zamora'],
  'Cataluña': ['Barcelona', 'Girona', 'Lleida', 'Tarragona'],
  'Extremadura': ['Badajoz', 'Cáceres'],
  'Galicia': ['A Coruña', 'Lugo', 'Ourense', 'Pontevedra'],
  'Madrid': ['Madrid'],
  'Murcia': ['Murcia'],
  'Navarra': ['Navarra'],
  'País Vasco': ['Álava', 'Guipúzcoa', 'Vizcaya'],
  'La Rioja': ['La Rioja'],
  'Comunidad Valenciana': ['Alicante', 'Castellón', 'Valencia'],
};

const ALL_PROVINCES = Object.values(PROVINCES).flat().sort();

// Mock festivals con más datos
const mockFestivals: Festival[] = [
  { id: 'fest-feria', name: 'Feria de Abril', city: 'Sevilla' },
  { id: 'fest-sanfermin', name: 'San Fermín', city: 'Pamplona' },
  { id: 'fest-fallas', name: 'Las Fallas', city: 'Valencia' },
  { id: 'fest-tomatina', name: 'La Tomatina', city: 'Buñol' },
  { id: 'fest-semanasanta', name: 'Semana Santa', city: 'Sevilla' },
  { id: 'fest-carnaval', name: 'Carnaval de Cádiz', city: 'Cádiz' },
  { id: 'fest-morosycristianos', name: 'Moros y Cristianos', city: 'Alcoy' },
  { id: 'fest-merce', name: 'La Mercè', city: 'Barcelona' },
  { id: 'fest-pilar', name: 'Fiestas del Pilar', city: 'Zaragoza' },
  { id: 'fest-sanisidro', name: 'San Isidro', city: 'Madrid' },
  { id: 'fest-arde-lucus', name: 'Arde Lucus', city: 'Lugo' },
  { id: 'fest-batalla-vino', name: 'Batalla del Vino', city: 'Haro' },
  { id: 'fest-tamborrada', name: 'Tamborrada', city: 'San Sebastián' },
  { id: 'fest-semana-grande', name: 'Semana Grande', city: 'Bilbao' },
  { id: 'fest-corpus', name: 'Corpus Christi', city: 'Toledo' },
  { id: 'fest-bienal', name: 'Bienal de Flamenco', city: 'Sevilla' },
];

export default function FestivalSelector({ value, onChange, error }: FestivalSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [showNewFestivalForm, setShowNewFestivalForm] = useState(false);
  const [newFestivalName, setNewFestivalName] = useState('');
  const [newFestivalCity, setNewFestivalCity] = useState('');
  const [newFestivalDate, setNewFestivalDate] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [editingFestival, setEditingFestival] = useState<Festival | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cargar festividades
  useEffect(() => {
    const fetchFestivals = async () => {
      try {
        const data = await festivalsApi.getAll();
        if (data && data.length > 0) {
          setFestivals(data);
        } else {
          setFestivals(mockFestivals);
        }
      } catch {
        setFestivals(mockFestivals);
      }
    };
    fetchFestivals();
  }, []);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowNewFestivalForm(false);
        setEditingFestival(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrar festividades
  const filteredFestivals = useMemo(() => {
    let result = festivals;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(f =>
        f.name.toLowerCase().includes(query) ||
        f.city.toLowerCase().includes(query)
      );
    }

    if (selectedProvince) {
      result = result.filter(f =>
        f.city.toLowerCase().includes(selectedProvince.toLowerCase()) ||
        selectedProvince.toLowerCase().includes(f.city.toLowerCase())
      );
    }

    return result;
  }, [festivals, searchQuery, selectedProvince]);

  // Agrupar por ciudad
  const groupedFestivals = useMemo(() => {
    const groups: Record<string, Festival[]> = {};
    filteredFestivals.forEach(f => {
      if (!groups[f.city]) {
        groups[f.city] = [];
      }
      groups[f.city].push(f);
    });
    return groups;
  }, [filteredFestivals]);

  // Ciudades populares (las que más festividades tienen)
  const popularCities = useMemo(() => {
    const cityCount: Record<string, number> = {};
    festivals.forEach(f => {
      cityCount[f.city] = (cityCount[f.city] || 0) + 1;
    });
    return Object.entries(cityCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([city]) => city);
  }, [festivals]);

  // Sugerencias de ciudades para nueva festividad
  const citySuggestions = useMemo(() => {
    if (!citySearch) return [];
    const query = citySearch.toLowerCase();
    const allCities = [...new Set([...ALL_PROVINCES, ...festivals.map(f => f.city)])];
    return allCities
      .filter(city => city.toLowerCase().includes(query))
      .slice(0, 5);
  }, [citySearch, festivals]);

  const selectedFestival = festivals.find(f => f.id === value);

  const handleSelect = (festival: Festival) => {
    onChange(festival.id, festival);
    setIsOpen(false);
    setSearchQuery('');
    setSelectedProvince('');
  };

  const handleCreateFestival = async () => {
    if (!newFestivalName.trim() || !newFestivalCity.trim() || !newFestivalDate) return;

    setIsCreating(true);
    setCreateError('');

    try {
      // Crear la festividad en el backend
      const createdFestival = await festivalsApi.create({
        name: newFestivalName.trim(),
        city: newFestivalCity.trim(),
        startDate: newFestivalDate || undefined,
      });

      // Añadir a la lista local
      setFestivals(prev => [...prev, createdFestival].sort((a, b) => a.name.localeCompare(b.name)));

      // Seleccionar la nueva festividad
      onChange(createdFestival.id, createdFestival);

      // Limpiar y cerrar
      setShowNewFestivalForm(false);
      setNewFestivalName('');
      setNewFestivalCity('');
      setNewFestivalDate('');
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error creating festival:', error);
      if (error.response?.status === 409) {
        setCreateError('Ya existe una festividad con este nombre');
      } else {
        setCreateError('Error al crear la festividad. Inténtalo de nuevo.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const openEditForm = (festival: Festival, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFestival(festival);
    setNewFestivalName(festival.name);
    setNewFestivalCity(festival.city);
    setNewFestivalDate(festival.startDate ? festival.startDate.split('T')[0] : '');
    setEditError('');
  };

  const handleEditFestival = async () => {
    if (!editingFestival || !newFestivalName.trim() || !newFestivalCity.trim()) return;

    setIsEditing(true);
    setEditError('');

    try {
      const updatedFestival = await festivalsApi.update(editingFestival.id, {
        name: newFestivalName.trim(),
        city: newFestivalCity.trim(),
        startDate: newFestivalDate || undefined,
      });

      // Actualizar la lista local
      setFestivals(prev => prev.map(f => f.id === updatedFestival.id ? updatedFestival : f));

      // Si el festival editado es el seleccionado, actualizar
      if (value === updatedFestival.id) {
        onChange(updatedFestival.id, updatedFestival);
      }

      // Limpiar y cerrar
      setEditingFestival(null);
      setNewFestivalName('');
      setNewFestivalCity('');
      setNewFestivalDate('');
    } catch (error: any) {
      console.error('Error updating festival:', error);
      if (error.response?.status === 409) {
        setEditError('Ya existe una festividad con este nombre');
      } else {
        setEditError('Error al actualizar la festividad. Inténtalo de nuevo.');
      }
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Input principal */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
          }
        }}
        className={`w-full px-4 py-3.5 bg-white border-2 rounded-xl text-left transition-all ${
          error ? 'border-red-300' : isOpen ? 'border-primary ring-4 ring-primary/10' : 'border-gray-200'
        }`}
      >
        {selectedFestival ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-pink-100 rounded-xl flex items-center justify-center text-xl">
              🎪
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 truncate">{selectedFestival.name}</div>
              <div className="text-sm text-gray-500 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                {selectedFestival.city}
              </div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
            </svg>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-xl text-gray-400">
              🎪
            </div>
            <div className="flex-1">
              <div className="text-gray-400">Selecciona o añade una festividad</div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        )}
      </button>

      {error && (
        <p className="text-red-500 text-sm mt-1.5 flex items-center gap-1">
          <span>⚠️</span> {error}
        </p>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 max-h-[70vh] flex flex-col">
          {editingFestival ? (
            /* Formulario editar festividad */
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-900 text-lg">Editar festividad</h3>
                <button
                  type="button"
                  onClick={() => {
                    setEditingFestival(null);
                    setNewFestivalName('');
                    setNewFestivalCity('');
                    setNewFestivalDate('');
                    setEditError('');
                  }}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                  Nombre de la festividad
                </label>
                <input
                  type="text"
                  value={newFestivalName}
                  onChange={(e) => setNewFestivalName(e.target.value)}
                  placeholder="Ej: Fiestas de San Juan"
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition-colors"
                  autoFocus
                />
              </div>

              {/* Ciudad */}
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                  Ciudad o localidad
                </label>
                <input
                  type="text"
                  value={newFestivalCity}
                  onChange={(e) => {
                    setNewFestivalCity(e.target.value);
                    setCitySearch(e.target.value);
                    setShowCitySuggestions(true);
                  }}
                  onFocus={() => setShowCitySuggestions(true)}
                  placeholder="Ej: Alicante"
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition-colors"
                />

                {showCitySuggestions && citySuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-10">
                    {citySuggestions.map(city => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => {
                          setNewFestivalCity(city);
                          setShowCitySuggestions(false);
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                        {city}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                  Fecha de inicio
                </label>
                <input
                  type="date"
                  value={newFestivalDate}
                  onChange={(e) => setNewFestivalDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Error */}
              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  {editError}
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingFestival(null);
                    setEditError('');
                  }}
                  disabled={isEditing}
                  className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:border-gray-300 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleEditFestival}
                  disabled={!newFestivalName.trim() || !newFestivalCity.trim() || isEditing}
                  className="flex-1 py-3 bg-gradient-to-r from-primary to-pink-500 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                  {isEditing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar cambios'
                  )}
                </button>
              </div>
            </div>
          ) : !showNewFestivalForm ? (
            <>
              {/* Buscador */}
              <div className="p-3 border-b border-gray-100">
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar festividad o ciudad..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-colors"
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                </div>
              </div>

              {/* Filtro por ciudades populares */}
              {!searchQuery && !selectedProvince && (
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-2">Ciudades populares</p>
                  <div className="flex flex-wrap gap-1.5">
                    {popularCities.map(city => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => setSelectedProvince(city)}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-primary/10 hover:text-primary rounded-full text-sm text-gray-700 transition-colors"
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Filtro activo */}
              {selectedProvince && (
                <div className="px-3 py-2 bg-primary/5 border-b border-primary/10 flex items-center justify-between">
                  <span className="text-sm text-primary font-medium">
                    Filtrando por: {selectedProvince}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedProvince('')}
                    className="text-primary hover:text-primary/80 text-sm font-medium"
                  >
                    Quitar filtro
                  </button>
                </div>
              )}

              {/* Lista de festividades */}
              <div className="flex-1 overflow-y-auto">
                {Object.keys(groupedFestivals).length > 0 ? (
                  Object.entries(groupedFestivals).map(([city, cityFestivals]) => (
                    <div key={city}>
                      <div className="px-4 py-2 bg-gray-50 sticky top-0">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                          </svg>
                          {city}
                        </span>
                      </div>
                      {cityFestivals.map(festival => (
                        <div
                          key={festival.id}
                          className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                            value === festival.id ? 'bg-primary/5' : ''
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleSelect(festival)}
                            className="flex-1 flex items-center gap-3"
                          >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                              value === festival.id
                                ? 'bg-primary text-white'
                                : 'bg-gradient-to-br from-gray-100 to-gray-200'
                            }`}>
                              🎪
                            </div>
                            <div className="flex-1 text-left">
                              <div className={`font-medium ${value === festival.id ? 'text-primary' : 'text-gray-900'}`}>
                                {festival.name}
                              </div>
                              {festival.startDate && (
                                <div className="text-xs text-gray-400">
                                  {new Date(festival.startDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                </div>
                              )}
                            </div>
                            {value === festival.id && (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-primary">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            )}
                          </button>
                          {/* Botón editar */}
                          <button
                            type="button"
                            onClick={(e) => openEditForm(festival, e)}
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            title="Editar festividad"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl mx-auto mb-3">
                      🔍
                    </div>
                    <p className="text-gray-500 mb-1">No encontramos esa festividad</p>
                    <p className="text-sm text-gray-400">¿Por qué no la añades?</p>
                  </div>
                )}
              </div>

              {/* Botón añadir nueva */}
              <div className="p-3 border-t border-gray-100 bg-gray-50">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewFestivalForm(true);
                    setNewFestivalName(searchQuery);
                  }}
                  className="w-full py-3 bg-gradient-to-r from-primary to-pink-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:shadow-xl transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Añadir nueva festividad
                </button>
              </div>
            </>
          ) : (
            /* Formulario nueva festividad */
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-900 text-lg">Nueva festividad</h3>
                <button
                  type="button"
                  onClick={() => setShowNewFestivalForm(false)}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="text-sm text-gray-500">
                ¿No encuentras tu festividad? Añádela para que otros usuarios también puedan usarla.
              </p>

              {/* Nombre */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                  Nombre de la festividad
                </label>
                <input
                  type="text"
                  value={newFestivalName}
                  onChange={(e) => setNewFestivalName(e.target.value)}
                  placeholder="Ej: Fiestas de San Juan"
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition-colors"
                  autoFocus
                />
              </div>

              {/* Ciudad con autocompletado */}
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                  Ciudad o localidad
                </label>
                <input
                  type="text"
                  value={newFestivalCity}
                  onChange={(e) => {
                    setNewFestivalCity(e.target.value);
                    setCitySearch(e.target.value);
                    setShowCitySuggestions(true);
                  }}
                  onFocus={() => setShowCitySuggestions(true)}
                  placeholder="Ej: Alicante"
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition-colors"
                />

                {/* Sugerencias de ciudades */}
                {showCitySuggestions && citySuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-10">
                    {citySuggestions.map(city => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => {
                          setNewFestivalCity(city);
                          setShowCitySuggestions(false);
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                        {city}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Provincias rápidas */}
              <div>
                <p className="text-xs text-gray-500 mb-2">O selecciona una provincia:</p>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {ALL_PROVINCES.slice(0, 12).map(province => (
                    <button
                      key={province}
                      type="button"
                      onClick={() => {
                        setNewFestivalCity(province);
                        setShowCitySuggestions(false);
                      }}
                      className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                        newFestivalCity === province
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {province}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                  Fecha de inicio <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={newFestivalDate}
                  onChange={(e) => setNewFestivalDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-primary transition-colors"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  Necesario para que aparezca correctamente en el calendario
                </p>
              </div>

              {/* Error */}
              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  {createError}
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewFestivalForm(false);
                    setCreateError('');
                  }}
                  disabled={isCreating}
                  className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:border-gray-300 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateFestival}
                  disabled={!newFestivalName.trim() || !newFestivalCity.trim() || !newFestivalDate || isCreating}
                  className="flex-1 py-3 bg-gradient-to-r from-primary to-pink-500 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creando...
                    </>
                  ) : (
                    'Añadir'
                  )}
                </button>
              </div>

              {/* Info */}
              <p className="text-xs text-gray-400 text-center">
                Tu festividad quedará guardada para que otros usuarios puedan encontrarla
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
