'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminApi, AdminUserAdvanced, AdminUsersAdvancedResponse, UserFilters } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/MainLayout';
import { AdminHeader } from '@/components/admin';

export default function AdminUsersPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, loginWithToken } = useAuth();
  const [data, setData] = useState<AdminUsersAdvancedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showStrikeModal, setShowStrikeModal] = useState<AdminUserAdvanced | null>(null);
  const [showBanModal, setShowBanModal] = useState<AdminUserAdvanced | null>(null);
  const [strikeReason, setStrikeReason] = useState('');
  const [banReason, setBanReason] = useState('');

  // Filters state
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    verified: undefined,
    banned: undefined,
    hasStrikes: false,
    role: undefined,
    orderBy: 'createdAt',
    orderDir: 'desc',
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminApi.getUsersAdvanced(page, 20, filters);
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
  }, [page, filters]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers();
    }
  }, [isAuthenticated, page, fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleFilterChange = (key: keyof UserFilters, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleToggleRole = async (user: AdminUserAdvanced) => {
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

  const handleDelete = async (user: AdminUserAdvanced) => {
    if (!confirm(`Eliminar permanentemente a ${user.name}? Esta acción no se puede deshacer.`)) return;

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

  const handleImpersonate = async (user: AdminUserAdvanced) => {
    if (!confirm(`Iniciar sesión como ${user.name}? Serás redirigido al dashboard.`)) return;

    setActionLoading(user.id);
    try {
      const response = await adminApi.impersonateUser(user.id);
      loginWithToken(response.access_token, response.user);
    } catch {
      alert('Error al impersonar usuario');
      setActionLoading(null);
    }
  };

  const handleAddStrike = async () => {
    if (!showStrikeModal || !strikeReason.trim()) return;

    setActionLoading(showStrikeModal.id);
    try {
      const result = await adminApi.addStrike(showStrikeModal.id, strikeReason);
      if (result.banned) {
        alert(`Usuario baneado automáticamente por alcanzar 3 strikes`);
      } else {
        alert(`Strike añadido. Total: ${result.strikes}/3`);
      }
      setShowStrikeModal(null);
      setStrikeReason('');
      fetchUsers();
    } catch {
      alert('Error al añadir strike');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveStrike = async (user: AdminUserAdvanced) => {
    if (!confirm(`Eliminar un strike de ${user.name}?`)) return;

    setActionLoading(user.id);
    try {
      const result = await adminApi.removeStrike(user.id);
      alert(`Strike eliminado. Total: ${result.strikes}/3`);
      fetchUsers();
    } catch {
      alert('Error al eliminar strike');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBan = async () => {
    if (!showBanModal || !banReason.trim()) return;

    setActionLoading(showBanModal.id);
    try {
      await adminApi.banUser(showBanModal.id, banReason);
      alert('Usuario baneado correctamente');
      setShowBanModal(null);
      setBanReason('');
      fetchUsers();
    } catch {
      alert('Error al banear usuario');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnban = async (user: AdminUserAdvanced) => {
    if (!confirm(`Desbanear a ${user.name}?`)) return;

    setActionLoading(user.id);
    try {
      await adminApi.unbanUser(user.id);
      alert('Usuario desbaneado correctamente');
      fetchUsers();
    } catch {
      alert('Error al desbanear usuario');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkVerify = async () => {
    if (selectedUsers.size === 0) return;
    if (!confirm(`Verificar ${selectedUsers.size} usuarios seleccionados?`)) return;

    try {
      const count = await adminApi.bulkVerifyUsers(Array.from(selectedUsers));
      alert(`${count} usuarios verificados`);
      setSelectedUsers(new Set());
      fetchUsers();
    } catch {
      alert('Error al verificar usuarios');
    }
  };

  const handleBulkBan = async () => {
    if (selectedUsers.size === 0) return;
    const reason = prompt('Motivo del baneo:');
    if (!reason) return;

    try {
      const count = await adminApi.bulkBanUsers(Array.from(selectedUsers), reason);
      alert(`${count} usuarios baneados`);
      setSelectedUsers(new Set());
      fetchUsers();
    } catch {
      alert('Error al banear usuarios');
    }
  };

  const toggleSelectUser = (userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (!data) return;
    if (selectedUsers.size === data.users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(data.users.map(u => u.id)));
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
        <AdminHeader
          title="Gestión de Usuarios"
          showFilterButton
          filterActive={showFilters}
          onFilterToggle={() => setShowFilters(!showFilters)}
        />

      <div className="p-4 space-y-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            placeholder="Buscar por nombre o email..."
            className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/50"
          />
          <button type="submit" className="px-4 py-2 bg-secondary text-white rounded-xl font-medium">
            Buscar
          </button>
        </form>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900">Filtros Avanzados</h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Verified Filter */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">Verificación</label>
                <select
                  value={filters.verified === undefined ? '' : String(filters.verified)}
                  onChange={(e) => handleFilterChange('verified', e.target.value === '' ? undefined : e.target.value === 'true')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="">Todos</option>
                  <option value="true">Verificados</option>
                  <option value="false">Sin verificar</option>
                </select>
              </div>

              {/* Banned Filter */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">Estado</label>
                <select
                  value={filters.banned === undefined ? '' : String(filters.banned)}
                  onChange={(e) => handleFilterChange('banned', e.target.value === '' ? undefined : e.target.value === 'true')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="">Todos</option>
                  <option value="true">Baneados</option>
                  <option value="false">Activos</option>
                </select>
              </div>

              {/* Role Filter */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">Rol</label>
                <select
                  value={filters.role || ''}
                  onChange={(e) => handleFilterChange('role', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="">Todos</option>
                  <option value="user">Usuario</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Has Strikes */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">Strikes</label>
                <select
                  value={filters.hasStrikes ? 'true' : ''}
                  onChange={(e) => handleFilterChange('hasStrikes', e.target.value === 'true')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="">Todos</option>
                  <option value="true">Con strikes</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Order By */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">Ordenar por</label>
                <select
                  value={filters.orderBy || 'createdAt'}
                  onChange={(e) => handleFilterChange('orderBy', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="createdAt">Fecha registro</option>
                  <option value="name">Nombre</option>
                  <option value="email">Email</option>
                </select>
              </div>

              {/* Order Direction */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">Dirección</label>
                <select
                  value={filters.orderDir || 'desc'}
                  onChange={(e) => handleFilterChange('orderDir', e.target.value as 'asc' | 'desc')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="desc">Descendente</option>
                  <option value="asc">Ascendente</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => {
                setFilters({
                  search: '',
                  verified: undefined,
                  banned: undefined,
                  hasStrikes: false,
                  role: undefined,
                  orderBy: 'createdAt',
                  orderDir: 'desc',
                });
                setPage(1);
              }}
              className="text-sm text-secondary font-medium"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {/* Bulk Actions */}
        {selectedUsers.size > 0 && (
          <div className="bg-blue-50 rounded-xl p-3 flex items-center justify-between">
            <span className="text-sm text-blue-700">{selectedUsers.size} usuarios seleccionados</span>
            <div className="flex gap-2">
              <button
                onClick={handleBulkVerify}
                className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg font-medium"
              >
                Verificar
              </button>
              <button
                onClick={handleBulkBan}
                className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg font-medium"
              >
                Banear
              </button>
              <button
                onClick={() => setSelectedUsers(new Set())}
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
              {data.pagination.total} usuarios encontrados
            </div>
            <button
              onClick={toggleSelectAll}
              className="text-sm text-secondary font-medium"
            >
              {selectedUsers.size === data.users.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
            </button>
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
              <div
                key={user.id}
                className={`bg-white rounded-xl p-4 shadow-sm ${user.bannedAt ? 'border-l-4 border-red-500' : ''} ${selectedUsers.has(user.id) ? 'ring-2 ring-blue-500' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelectUser(user.id)}
                    className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedUsers.has(user.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                    }`}
                  >
                    {selectedUsers.has(user.id) && (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="white" className="w-3 h-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
                  </button>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{user.name}</span>
                      {user.role === 'admin' && (
                        <span className="px-2 py-0.5 bg-secondary/10 text-secondary text-xs rounded-full">Admin</span>
                      )}
                      {user.verified && (
                        <span className="px-2 py-0.5 bg-emerald/10 text-emerald text-xs rounded-full">Verificado</span>
                      )}
                      {user.bannedAt && (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">Baneado</span>
                      )}
                      {user.strikes > 0 && !user.bannedAt && (
                        <span className="px-2 py-0.5 bg-accent/10 text-accent-dark text-xs rounded-full">
                          {user.strikes}/3 strikes
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                    {user.city && <div className="text-sm text-gray-400">{user.city}</div>}

                    {/* Stats Row */}
                    <div className="flex gap-4 mt-2 text-xs text-gray-400">
                      <span>{user._count.experiences} experiencias</span>
                      <span>{user.totalMatches} matches</span>
                      <span>{user._count.reviewsGiven} reseñas</span>
                      <span>{user.walletBalance.toFixed(2)} EUR</span>
                    </div>

                    {/* Ban reason if applicable */}
                    {user.bannedAt && user.banReason && (
                      <div className="mt-2 text-xs text-primary bg-red-50 p-2 rounded">
                        <strong>Motivo ban:</strong> {user.banReason}
                      </div>
                    )}

                    <div className="text-xs text-gray-400 mt-1">
                      Registrado: {new Date(user.createdAt).toLocaleDateString('es-ES')}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-1 ml-2">
                    {/* Impersonate */}
                    <button
                      onClick={() => handleImpersonate(user)}
                      disabled={actionLoading === user.id}
                      className="p-2 text-gray-500 hover:text-secondary hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Iniciar sesión como este usuario"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                      </svg>
                    </button>

                    {/* Toggle Admin */}
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

                    {/* Strikes - only if not banned */}
                    {!user.bannedAt && (
                      <>
                        <button
                          onClick={() => setShowStrikeModal(user)}
                          disabled={actionLoading === user.id}
                          className="p-2 text-gray-500 hover:text-accent hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Añadir strike"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                          </svg>
                        </button>
                        {user.strikes > 0 && (
                          <button
                            onClick={() => handleRemoveStrike(user)}
                            disabled={actionLoading === user.id}
                            className="p-2 text-gray-500 hover:text-emerald hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Eliminar strike"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m9 12.75 3 3m0 0 3-3m-3 3v-7.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                          </button>
                        )}
                      </>
                    )}

                    {/* Ban/Unban */}
                    {user.bannedAt ? (
                      <button
                        onClick={() => handleUnban(user)}
                        disabled={actionLoading === user.id}
                        className="p-2 text-gray-500 hover:text-emerald hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Desbanear usuario"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowBanModal(user)}
                        disabled={actionLoading === user.id}
                        className="p-2 text-gray-500 hover:text-primary hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Banear usuario"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      </button>
                    )}

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(user)}
                      disabled={actionLoading === user.id}
                      className="p-2 text-gray-500 hover:text-primary hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
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

        {/* Empty State */}
        {!loading && data && data.users.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">&#128269;</div>
            <p className="text-gray-500">No hay usuarios con estos filtros</p>
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

      {/* Strike Modal */}
      {showStrikeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Añadir Strike</h3>
            <p className="text-sm text-gray-500 mb-4">
              Estás a punto de añadir un strike a <strong>{showStrikeModal.name}</strong>.
              Actualmente tiene {showStrikeModal.strikes}/3 strikes.
              {showStrikeModal.strikes === 2 && (
                <span className="block text-primary mt-1">
                  Atención: Al añadir este strike, el usuario será baneado automáticamente.
                </span>
              )}
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo del strike *
              </label>
              <textarea
                value={strikeReason}
                onChange={(e) => setStrikeReason(e.target.value)}
                placeholder="Describe el motivo del strike..."
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowStrikeModal(null); setStrikeReason(''); }}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddStrike}
                disabled={!strikeReason.trim() || actionLoading === showStrikeModal.id}
                className="flex-1 py-3 bg-amber-500 text-white font-medium rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                {actionLoading === showStrikeModal.id ? 'Añadiendo...' : 'Añadir Strike'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban Modal */}
      {showBanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Banear Usuario</h3>
            <p className="text-sm text-gray-500 mb-4">
              Estás a punto de banear a <strong>{showBanModal.name}</strong>.
              Esta acción impedirá que el usuario acceda a la plataforma.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo del ban *
              </label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Describe el motivo del ban..."
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowBanModal(null); setBanReason(''); }}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleBan}
                disabled={!banReason.trim() || actionLoading === showBanModal.id}
                className="flex-1 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {actionLoading === showBanModal.id ? 'Baneando...' : 'Banear Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </MainLayout>
  );
}
