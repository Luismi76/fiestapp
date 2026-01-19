'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminApi, AdminUser, AdminUsersResponse } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminUsersPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, loginWithToken } = useAuth();
  const [data, setData] = useState<AdminUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const result = await adminApi.getUsers(page, 20, search || undefined);
      setData(result);
      setError('');
    } catch (err: unknown) {
      const error = err as { response?: { status?: number } };
      if (error.response?.status === 403) {
        setError('No tienes permisos de administrador');
      } else {
        setError('Error al cargar usuarios');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers();
    }
  }, [isAuthenticated, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleToggleRole = async (user: AdminUser) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const confirmMsg = user.role === 'admin'
      ? `Quitar permisos de admin a ${user.name}?`
      : `Dar permisos de admin a ${user.name}?`;

    if (!confirm(confirmMsg)) return;

    setActionLoading(user.id);
    try {
      await adminApi.setUserRole(user.id, newRole);
      fetchUsers();
    } catch {
      alert('Error al cambiar rol');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (user: AdminUser) => {
    if (!confirm(`Eliminar permanentemente a ${user.name}? Esta accion no se puede deshacer.`)) return;

    setActionLoading(user.id);
    try {
      await adminApi.deleteUser(user.id);
      fetchUsers();
    } catch {
      alert('Error al eliminar usuario');
    } finally {
      setActionLoading(null);
    }
  };

  const handleImpersonate = async (user: AdminUser) => {
    if (!confirm(`Iniciar sesion como ${user.name}? Seras redirigido al dashboard.`)) return;

    setActionLoading(user.id);
    try {
      const response = await adminApi.impersonateUser(user.id);
      loginWithToken(response.access_token, response.user);
    } catch {
      alert('Error al impersonar usuario');
      setActionLoading(null);
    }
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
          <div className="text-5xl mb-4">🚫</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
          <p className="text-gray-500 mb-6">{error}</p>
          <Link href="/admin" className="text-blue-600 font-medium">
            Volver al panel
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="flex items-center px-4 h-14">
          <Link href="/admin" className="w-10 h-10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <span className="flex-1 text-center font-semibold text-gray-900">Gestion de Usuarios</span>
          <div className="w-10" />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-xl font-medium">
            Buscar
          </button>
        </form>

        {/* Stats */}
        {data && (
          <div className="text-sm text-gray-500">
            {data.pagination.total} usuarios encontrados
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="spinner spinner-lg" />
          </div>
        )}

        {/* Users List */}
        {!loading && data && (
          <div className="space-y-3">
            {data.users.map((user) => (
              <div key={user.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{user.name}</span>
                      {user.role === 'admin' && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">Admin</span>
                      )}
                      {user.verified && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Verificado</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                    {user.city && <div className="text-sm text-gray-400">{user.city}</div>}
                    <div className="flex gap-4 mt-2 text-xs text-gray-400">
                      <span>{user._count.experiences} experiencias</span>
                      <span>{user._count.matchesAsHost + user._count.matchesAsRequester} matches</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Registrado: {new Date(user.createdAt).toLocaleDateString('es-ES')}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleImpersonate(user)}
                      disabled={actionLoading === user.id}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Iniciar sesion como este usuario"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleToggleRole(user)}
                      disabled={actionLoading === user.id}
                      className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                      title={user.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(user)}
                      disabled={actionLoading === user.id}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Eliminar usuario"
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
              Pagina {page} de {data.pagination.pages}
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
    </div>
  );
}
