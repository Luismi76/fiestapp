'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import FavoriteButton from '@/components/FavoriteButton';
import { favoritesApi, FavoriteExperience, FavoriteFestival } from '@/lib/api';
import { getUploadUrl, getAvatarUrl } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

type TabType = 'experiences' | 'festivals';

export default function FavoritesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('experiences');
  const [experiences, setExperiences] = useState<FavoriteExperience[]>([]);
  const [festivals, setFestivals] = useState<FavoriteFestival[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState<string>('');
  const [festivalFilter, setFestivalFilter] = useState<string>('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      loadFavorites();
    }
  }, [user, authLoading, router]);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const data = await favoritesApi.getAllFavorites();
      setExperiences(data.experiences);
      setFestivals(data.festivals);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveExperience = async (experienceId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await favoritesApi.removeFavorite(experienceId);
      setExperiences(experiences.filter((f) => f.id !== experienceId));
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  const handleRemoveFestival = async (festivalId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await favoritesApi.removeFestivalFavorite(festivalId);
      setFestivals(festivals.filter((f) => f.id !== festivalId));
    } catch (error) {
      console.error('Error removing festival favorite:', error);
    }
  };

  const handleToggleAlert = async (experienceId: string, hasAlert: boolean) => {
    try {
      await favoritesApi.toggleAlert(experienceId, hasAlert);
      setExperiences(
        experiences.map((exp) =>
          exp.id === experienceId ? { ...exp, hasAlert: !hasAlert } : exp
        )
      );
    } catch (error) {
      console.error('Error toggling alert:', error);
    }
  };

  // Filtrar experiencias
  const filteredExperiences = experiences.filter((exp) => {
    if (cityFilter && exp.city !== cityFilter) return false;
    if (festivalFilter && exp.festival?.id !== festivalFilter) return false;
    return true;
  });

  // Obtener ciudades y festivales unicos para filtros
  const cities = [...new Set(experiences.map((exp) => exp.city))];
  const experienceFestivals = [...new Set(experiences.map((exp) => exp.festival).filter(Boolean))];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">Mis favoritos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Experiencias y festivales que has guardado
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('experiences')}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'experiences'
                ? 'text-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Experiencias ({experiences.length})
            {activeTab === 'experiences' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('festivals')}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === 'festivals'
                ? 'text-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Festivales ({festivals.length})
            {activeTab === 'festivals' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeTab === 'experiences' ? (
          // Experiencias Tab
          <>
            {experiences.length > 0 && (
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {/* Filtro por ciudad */}
                <select
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
                >
                  <option value="">Todas las ciudades</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>

                {/* Filtro por festival */}
                <select
                  value={festivalFilter}
                  onChange={(e) => setFestivalFilter(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
                >
                  <option value="">Todos los festivales</option>
                  {experienceFestivals.map((fest) => fest && (
                    <option key={fest.id} value={fest.id}>{fest.name}</option>
                  ))}
                </select>
              </div>
            )}

            {filteredExperiences.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-gray-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  {experiences.length === 0 ? 'Sin experiencias favoritas' : 'Sin resultados'}
                </h2>
                <p className="text-gray-500 mb-6">
                  {experiences.length === 0
                    ? 'Guarda experiencias que te interesen para verlas mas tarde'
                    : 'Prueba a cambiar los filtros'
                  }
                </p>
                {experiences.length === 0 && (
                  <Link
                    href="/experiences"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors"
                  >
                    Explorar experiencias
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                    </svg>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">{filteredExperiences.length} experiencias guardadas</p>

                {filteredExperiences.map((exp) => (
                  <Link
                    key={exp.id}
                    href={`/experiences/${exp.id}`}
                    className="block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex">
                      {/* Imagen */}
                      <div className="w-32 h-32 flex-shrink-0 relative">
                        <img
                          src={getUploadUrl(exp.photos?.[0] || '/images/feria_abril.png')}
                          alt={exp.title}
                          className="w-full h-full object-cover"
                        />
                        {/* Rating badge */}
                        {exp.avgRating && exp.avgRating > 0 && (
                          <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-yellow-500">
                              <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
                            </svg>
                            <span className="text-xs font-medium text-gray-700">{exp.avgRating.toFixed(1)}</span>
                          </div>
                        )}
                        {/* Alert badge */}
                        {exp.hasAlert && (
                          <div className="absolute top-2 right-2 bg-yellow-100 p-1 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-yellow-600">
                              <path fillRule="evenodd" d="M4 8a6 6 0 1 1 12 0c0 1.887.454 3.665 1.257 5.234a.75.75 0 0 1-.515 1.076 32.903 32.903 0 0 1-3.278.446.75.75 0 0 0-.627.596 2.998 2.998 0 0 1-5.674 0 .75.75 0 0 0-.627-.596 32.82 32.82 0 0 1-3.278-.446.75.75 0 0 1-.515-1.076A11.448 11.448 0 0 0 4 8Z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 p-3 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                              <path fillRule="evenodd" d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
                            </svg>
                            {exp.city}
                            {exp.festival && (
                              <>
                                <span className="text-gray-300">|</span>
                                <span className="text-primary">{exp.festival.name}</span>
                              </>
                            )}
                          </div>
                          <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm">{exp.title}</h3>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <img
                              src={getAvatarUrl(exp.host?.avatar)}
                              alt={exp.host?.name}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                            <span className="text-xs text-gray-500">{exp.host?.name}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {exp.type === 'intercambio' ? (
                              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Intercambio</span>
                            ) : (
                              <span className="font-semibold text-primary text-sm">{exp.price}EUR</span>
                            )}

                            {/* Boton de alerta */}
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleToggleAlert(exp.id, exp.hasAlert);
                              }}
                              className={`p-1.5 rounded-full transition-colors ${
                                exp.hasAlert
                                  ? 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100'
                                  : 'text-gray-400 hover:bg-gray-100 hover:text-yellow-500'
                              }`}
                              title={exp.hasAlert ? 'Desactivar alerta' : 'Activar alerta de disponibilidad'}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M4 8a6 6 0 1 1 12 0c0 1.887.454 3.665 1.257 5.234a.75.75 0 0 1-.515 1.076 32.903 32.903 0 0 1-3.278.446.75.75 0 0 0-.627.596 2.998 2.998 0 0 1-5.674 0 .75.75 0 0 0-.627-.596 32.82 32.82 0 0 1-3.278-.446.75.75 0 0 1-.515-1.076A11.448 11.448 0 0 0 4 8Z" clipRule="evenodd" />
                              </svg>
                            </button>

                            {/* Boton eliminar favorito */}
                            <button
                              onClick={(e) => handleRemoveExperience(exp.id, e)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                              title="Eliminar de favoritos"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                <path d="m9.653 16.915-.005-.003-.019-.01a20.759 20.759 0 0 1-1.162-.682 22.045 22.045 0 0 1-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 0 1 8-2.828A4.5 4.5 0 0 1 18 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 0 1-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 0 1-.69.001l-.002-.001Z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : (
          // Festivales Tab
          <>
            {festivals.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-gray-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Sin festivales favoritos</h2>
                <p className="text-gray-500 mb-6">
                  Guarda festivales que te interesen para recibir notificaciones
                </p>
                <Link
                  href="/experiences"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors"
                >
                  Explorar festivales
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">{festivals.length} festivales guardados</p>

                {festivals.map((festival) => (
                  <Link
                    key={festival.id}
                    href={`/experiences?festival=${festival.id}`}
                    className="block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex">
                      {/* Imagen */}
                      <div className="w-32 h-28 flex-shrink-0 relative">
                        <img
                          src={getUploadUrl(festival.imageUrl || '/images/feria_abril.png')}
                          alt={festival.name}
                          className="w-full h-full object-cover"
                        />
                        {/* Badge de experiencias */}
                        <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-md">
                          <span className="text-xs font-medium text-gray-700">
                            {festival.experienceCount} experiencias
                          </span>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 p-3 flex flex-col justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900 line-clamp-1">{festival.name}</h3>
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                              <path fillRule="evenodd" d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
                            </svg>
                            {festival.city}
                          </div>
                          {festival.startDate && (
                            <div className="flex items-center gap-1 text-xs text-primary mt-1">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Z" clipRule="evenodd" />
                              </svg>
                              {new Date(festival.startDate).toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'short',
                              })}
                              {festival.endDate && (
                                <> - {new Date(festival.endDate).toLocaleDateString('es-ES', {
                                  day: 'numeric',
                                  month: 'short',
                                })}</>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-end mt-2">
                          {/* Boton eliminar favorito */}
                          <button
                            onClick={(e) => handleRemoveFestival(festival.id, e)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                            title="Eliminar de favoritos"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                              <path d="m9.653 16.915-.005-.003-.019-.01a20.759 20.759 0 0 1-1.162-.682 22.045 22.045 0 0 1-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 0 1 8-2.828A4.5 4.5 0 0 1 18 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 0 1-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 0 1-.69.001l-.002-.001Z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
