'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminApi, AdminExperience, AdminExperiencesResponse } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { AdminHeader } from '@/components/admin';
import MainLayout from '@/components/MainLayout';

export default function AdminExperiencesPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [data, setData] = useState<AdminExperiencesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedExperiences, setSelectedExperiences] = useState<Set<string>>(new Set());
  const [showDetails, setShowDetails] = useState<AdminExperience | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchExperiences = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminApi.getExperiences(page, 20, filter);
      // Filter by search locally (backend doesn't support search for experiences)
      if (search) {
        const searchLower = search.toLowerCase();
        result.experiences = result.experiences.filter(exp =>
          exp.title.toLowerCase().includes(searchLower) ||
          exp.city.toLowerCase().includes(searchLower) ||
          exp.host.name.toLowerCase().includes(searchLower) ||
          exp.host.email.toLowerCase().includes(searchLower) ||
          exp.festival.name.toLowerCase().includes(searchLower)
        );
      }
      setData(result);
      setError('');
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } };
      if (error.response?.status === 403) {
        setError('No tienes permisos de administrador');
      } else {
        setError('Error al cargar experiencias');
      }
    } finally {
      setLoading(false);
    }
  }, [page, filter, search]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchExperiences();
    }
  }, [isAuthenticated, page, filter, fetchExperiences]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchExperiences();
  };

  const handleTogglePublished = async (exp: AdminExperience) => {
    const confirmMsg = exp.published
      ? `Despublicar "${exp.title}"?`
      : `Publicar "${exp.title}"?`;

    if (!confirm(confirmMsg)) return;

    setActionLoading(exp.id);
    try {
      await adminApi.toggleExperiencePublished(exp.id);
      fetchExperiences();
    } catch {
      alert('Error al cambiar estado');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (exp: AdminExperience) => {
    if (!confirm(`Eliminar permanentemente "${exp.title}"? Esta acción no se puede deshacer.`)) return;

    setActionLoading(exp.id);
    try {
      await adminApi.deleteExperience(exp.id);
      fetchExperiences();
    } catch {
      alert('Error al eliminar experiencia');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkPublish = async () => {
    if (selectedExperiences.size === 0) return;
    if (!confirm(`Publicar ${selectedExperiences.size} experiencias seleccionadas?`)) return;

    for (const expId of selectedExperiences) {
      try {
        await adminApi.toggleExperiencePublished(expId);
      } catch {
        // Continue with next
      }
    }
    setSelectedExperiences(new Set());
    fetchExperiences();
  };

  const handleBulkDelete = async () => {
    if (selectedExperiences.size === 0) return;
    if (!confirm(`Eliminar ${selectedExperiences.size} experiencias seleccionadas? Esta acción no se puede deshacer.`)) return;

    for (const expId of selectedExperiences) {
      try {
        await adminApi.deleteExperience(expId);
      } catch {
        // Continue with next
      }
    }
    setSelectedExperiences(new Set());
    fetchExperiences();
  };

  const toggleSelectExperience = (expId: string) => {
    setSelectedExperiences(prev => {
      const newSet = new Set(prev);
      if (newSet.has(expId)) {
        newSet.delete(expId);
      } else {
        newSet.add(expId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (!data) return;
    if (selectedExperiences.size === data.experiences.length) {
      setSelectedExperiences(new Set());
    } else {
      setSelectedExperiences(new Set(data.experiences.map(e => e.id)));
    }
  };

  const getTypeLabel = (type: string, price: number | null) => {
    if (type === 'pago' && price) return `${price} EUR`;
    if (type === 'intercambio') return 'Intercambio';
    return 'Flexible';
  };

  const getTypeColor = (type: string) => {
    if (type === 'pago') return 'bg-emerald/10 text-emerald';
    if (type === 'intercambio') return 'bg-blue-100 text-blue-700';
    return 'bg-purple-100 text-purple-700';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md text-center">
          <div className="text-5xl mb-4">&#128683;</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
          <p className="text-gray-500 mb-6">{error}</p>
          <Link href="/admin" className="text-secondary font-medium">
            Volver al panel
          </Link>
        </div>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 pb-8">
        <AdminHeader title="Gestión de Experiencias" />

        {/* Filter tabs */}
        <div className="flex gap-2 px-4 py-3 bg-white border-b border-gray-100">
          {(['all', 'published', 'draft'] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-secondary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' && 'Todas'}
              {f === 'published' && 'Publicadas'}
              {f === 'draft' && 'Borradores'}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, ciudad, host o festival..."
            className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/50"
          />
          <button type="submit" className="px-4 py-2 bg-secondary text-white rounded-xl font-medium">
            Buscar
          </button>
        </form>

        {/* Bulk Actions */}
        {selectedExperiences.size > 0 && (
          <div className="bg-purple-50 rounded-xl p-3 flex items-center justify-between">
            <span className="text-sm text-purple-700">{selectedExperiences.size} experiencias seleccionadas</span>
            <div className="flex gap-2">
              <button
                onClick={handleBulkPublish}
                className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg font-medium"
              >
                Publicar/Despublicar
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg font-medium"
              >
                Eliminar
              </button>
              <button
                onClick={() => setSelectedExperiences(new Set())}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        {data && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {data.pagination.total} experiencias encontradas
            </div>
            <button
              onClick={toggleSelectAll}
              className="text-sm text-purple-600 font-medium"
            >
              {selectedExperiences.size === data.experiences.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="spinner spinner-lg" />
          </div>
        )}

        {/* Experiences List */}
        {!loading && data && (
          <div className="space-y-3">
            {data.experiences.map((exp) => (
              <div
                key={exp.id}
                className={`bg-white rounded-xl p-4 shadow-sm ${selectedExperiences.has(exp.id) ? 'ring-2 ring-purple-500' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelectExperience(exp.id)}
                    className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedExperiences.has(exp.id) ? 'bg-primary border-primary' : 'border-gray-300'
                    }`}
                  >
                    {selectedExperiences.has(exp.id) && (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="white" className="w-3 h-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
                  </button>

                  {/* Experience Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{exp.title}</span>
                      {exp.published ? (
                        <span className="px-2 py-0.5 bg-emerald/10 text-emerald text-xs rounded-full">Publicada</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-accent/10 text-accent-dark text-xs rounded-full">Borrador</span>
                      )}
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getTypeColor(exp.type)}`}>
                        {getTypeLabel(exp.type, exp.price)}
                      </span>
                    </div>

                    <div className="text-sm text-gray-500 mt-1">
                      <span className="font-medium">{exp.city}</span> - {exp.festival.name}
                    </div>

                    <div className="text-sm text-gray-400">
                      Host: {exp.host.name} ({exp.host.email})
                    </div>

                    {/* Stats Row */}
                    <div className="flex gap-4 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                        </svg>
                        {exp._count.matches} reservas
                      </span>
                      <span className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                        </svg>
                        {exp._count.reviews} reseñas
                      </span>
                    </div>

                    <div className="text-xs text-gray-400 mt-1">
                      Creada: {new Date(exp.createdAt).toLocaleDateString('es-ES')}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 ml-2">
                    {/* View Details */}
                    <button
                      onClick={() => setShowDetails(exp)}
                      className="p-2 text-gray-500 hover:text-secondary hover:bg-blue-50 rounded-lg transition-colors"
                      title="Ver detalles"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                      </svg>
                    </button>

                    {/* View in app */}
                    <Link
                      href={`/experiences/${exp.id}`}
                      className="p-2 text-gray-500 hover:text-secondary hover:bg-blue-50 rounded-lg transition-colors"
                      title="Ver experiencia"
                      target="_blank"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    </Link>

                    {/* Toggle Publish */}
                    <button
                      onClick={() => handleTogglePublished(exp)}
                      disabled={actionLoading === exp.id}
                      className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                        exp.published
                          ? 'text-gray-500 hover:text-amber-600 hover:bg-amber-50'
                          : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                      }`}
                      title={exp.published ? 'Despublicar' : 'Publicar'}
                    >
                      {exp.published ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                      )}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(exp)}
                      disabled={actionLoading === exp.id}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Eliminar experiencia"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && data && data.experiences.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">&#128269;</div>
            <p className="text-gray-500">No hay experiencias con este filtro</p>
          </div>
        )}

        {/* Pagination */}
        {data && data.pagination.pages > 1 && (
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="px-4 py-2 text-gray-600">
              Página {page} de {data.pagination.pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data.pagination.pages, p + 1))}
              disabled={page === data.pagination.pages}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-semibold text-gray-900 text-lg">{showDetails.title}</h3>
                <button
                  onClick={() => setShowDetails(null)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Status badges */}
                <div className="flex gap-2 flex-wrap">
                  {showDetails.published ? (
                    <span className="px-3 py-1 bg-emerald/10 text-emerald text-sm rounded-full">Publicada</span>
                  ) : (
                    <span className="px-3 py-1 bg-accent/10 text-accent-dark text-sm rounded-full">Borrador</span>
                  )}
                  <span className={`px-3 py-1 text-sm rounded-full ${getTypeColor(showDetails.type)}`}>
                    {getTypeLabel(showDetails.type, showDetails.price)}
                  </span>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Ciudad</span>
                    <p className="font-medium text-gray-900">{showDetails.city}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Festival</span>
                    <p className="font-medium text-gray-900">{showDetails.festival.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Reservas</span>
                    <p className="font-medium text-gray-900">{showDetails._count.matches}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Reseñas</span>
                    <p className="font-medium text-gray-900">{showDetails._count.reviews}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Creada</span>
                    <p className="font-medium text-gray-900">
                      {new Date(showDetails.createdAt).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">ID</span>
                    <p className="font-mono text-xs text-gray-600 break-all">{showDetails.id}</p>
                  </div>
                </div>

                {/* Host Info */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Información del Host</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-500">Nombre:</span> {showDetails.host.name}</p>
                    <p><span className="text-gray-500">Email:</span> {showDetails.host.email}</p>
                    <p><span className="text-gray-500">ID:</span> <span className="font-mono text-xs">{showDetails.host.id}</span></p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Link
                    href={`/experiences/${showDetails.id}`}
                    target="_blank"
                    className="flex-1 py-3 bg-secondary text-white text-center font-medium rounded-xl hover:bg-blue-600 transition-colors"
                  >
                    Ver en la app
                  </Link>
                  <button
                    onClick={() => {
                      handleTogglePublished(showDetails);
                      setShowDetails(null);
                    }}
                    className={`flex-1 py-3 font-medium rounded-xl transition-colors ${
                      showDetails.published
                        ? 'bg-accent/10 text-accent-dark hover:bg-accent/20'
                        : 'bg-emerald/10 text-emerald hover:bg-emerald/20'
                    }`}
                  >
                    {showDetails.published ? 'Despublicar' : 'Publicar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </MainLayout>
  );
}
