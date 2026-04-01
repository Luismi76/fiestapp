'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { adminApi, AdminUserAdvanced, AdminUsersAdvancedResponse, UserFilters, AdminExperience, AdminExperiencesResponse, categoriesApi } from '@/lib/api';
import { Category } from '@/types/experience';
import AdminLayout from '@/components/admin/AdminLayout';
import api from '@/lib/api';

/* ================================================================== */
/*  UsersContent                                                       */
/* ================================================================== */

function UsersContent() {
  const { loginWithToken } = useAuth();
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
    fetchUsers();
  }, [page, fetchUsers]);

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

  const handleImpersonate = async (user: AdminUserAdvanced) => {
    if (!confirm(`Iniciar sesion como ${user.name}? Seras redirigido al dashboard.`)) return;

    setActionLoading(user.id);
    try {
      await adminApi.impersonateUser(user.id);
      await loginWithToken();
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
        alert(`Usuario baneado automaticamente por alcanzar 3 strikes`);
      } else {
        alert(`Strike anadido. Total: ${result.strikes}/3`);
      }
      setShowStrikeModal(null);
      setStrikeReason('');
      fetchUsers();
    } catch {
      alert('Error al anadir strike');
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

  if (error && !data) {
    return (
      <div className="bg-gray-50 flex items-center justify-center p-4">
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
    <div className="pb-8">
      {/* Filter toggle button */}
      <div className="flex justify-end px-4 pt-3">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            showFilters ? 'bg-secondary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
          </svg>
          Filtros
        </button>
      </div>

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
                <label className="block text-sm text-gray-600 mb-1">Verificacion</label>
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
                <label className="block text-sm text-gray-600 mb-1">Direccion</label>
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
                      <span>{user._count.reviewsGiven} resenas</span>
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
                      title="Iniciar sesion como este usuario"
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
                          title="Anadir strike"
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

      {/* Strike Modal */}
      {showStrikeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Anadir Strike</h3>
            <p className="text-sm text-gray-500 mb-4">
              Estas a punto de anadir un strike a <strong>{showStrikeModal.name}</strong>.
              Actualmente tiene {showStrikeModal.strikes}/3 strikes.
              {showStrikeModal.strikes === 2 && (
                <span className="block text-primary mt-1">
                  Atencion: Al anadir este strike, el usuario sera baneado automaticamente.
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
                {actionLoading === showStrikeModal.id ? 'Anadiendo...' : 'Anadir Strike'}
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
              Estas a punto de banear a <strong>{showBanModal.name}</strong>.
              Esta accion impedira que el usuario acceda a la plataforma.
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
  );
}

/* ================================================================== */
/*  ExperiencesContent                                                 */
/* ================================================================== */

function ExperiencesContent() {
  const [data, setData] = useState<AdminExperiencesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedExperiences, setSelectedExperiences] = useState<Set<string>>(new Set());
  const [showDetails, setShowDetails] = useState<AdminExperience | null>(null);

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
          (exp.host?.name ?? '').toLowerCase().includes(searchLower) ||
          (exp.host?.email ?? '').toLowerCase().includes(searchLower) ||
          (exp.festival?.name ?? '').toLowerCase().includes(searchLower)
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
    fetchExperiences();
  }, [page, filter, fetchExperiences]);

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
    if (!confirm(`Eliminar permanentemente "${exp.title}"? Esta accion no se puede deshacer.`)) return;

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
    if (!confirm(`Eliminar ${selectedExperiences.size} experiencias seleccionadas? Esta accion no se puede deshacer.`)) return;

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

  if (error && !data) {
    return (
      <div className="bg-gray-50 flex items-center justify-center p-4">
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
    <div className="pb-8">
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
            placeholder="Buscar por titulo, ciudad, host o festividad..."
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
                      <span className="font-medium">{exp.city}</span> - {exp.festival?.name ?? ''}
                    </div>

                    <div className="text-sm text-gray-400">
                      Host: {exp.host?.name ?? ''} ({exp.host?.email ?? ''})
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
                        {exp._count.reviews} resenas
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
                    <span className="text-gray-500">Festividad</span>
                    <p className="font-medium text-gray-900">{showDetails.festival?.name ?? ''}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Reservas</span>
                    <p className="font-medium text-gray-900">{showDetails._count.matches}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Resenas</span>
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
                  <h4 className="font-medium text-gray-900 mb-2">Informacion del Host</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-500">Nombre:</span> {showDetails.host?.name ?? ''}</p>
                    <p><span className="text-gray-500">Email:</span> {showDetails.host?.email ?? ''}</p>
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
  );
}

/* ================================================================== */
/*  CategoriesContent                                                  */
/* ================================================================== */

interface CategoryWithCount extends Category {
  _count: { experiences: number };
}

function CategoriesContent() {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formGroup, setFormGroup] = useState<'fiesta' | 'local'>('local');
  const [formIcon, setFormIcon] = useState('');
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchCategories = useCallback(async () => {
    try {
      const data = await categoriesApi.getAllAdmin();
      setCategories(data as CategoryWithCount[]);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const resetForm = () => {
    setEditingId(null);
    setFormName('');
    setFormSlug('');
    setFormGroup('local');
    setFormIcon('');
    setFormSortOrder(0);
    setShowForm(false);
    setFormError('');
  };

  const startEdit = (cat: CategoryWithCount) => {
    setEditingId(cat.id);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormGroup(cat.group as 'fiesta' | 'local');
    setFormIcon(cat.icon);
    setFormSortOrder(cat.sortOrder);
    setShowForm(true);
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSlug.trim() || !formIcon.trim()) {
      setFormError('Nombre, slug e icono son obligatorios');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      const data = {
        name: formName.trim(),
        slug: formSlug.trim().toLowerCase(),
        group: formGroup,
        icon: formIcon.trim(),
        sortOrder: formSortOrder,
      };

      if (editingId) {
        await categoriesApi.update(editingId, data);
      } else {
        await categoriesApi.create(data);
      }

      resetForm();
      await fetchCategories();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await categoriesApi.toggleActive(id);
      await fetchCategories();
    } catch {
      // ignore
    }
  };

  const fiestaCategories = categories.filter((c) => c.group === 'fiesta');
  const localCategories = categories.filter((c) => c.group === 'local');

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const renderGroup = (title: string, items: CategoryWithCount[]) => (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</h3>
      <div className="space-y-2">
        {items.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
          >
            <span className="text-2xl flex-shrink-0">{cat.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 text-sm">{cat.name}</span>
                <span className="text-xs text-gray-400 font-mono">{cat.slug}</span>
              </div>
              <span className="text-xs text-gray-400">{cat._count.experiences} experiencias</span>
            </div>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: cat.active ? '#E8F5F0' : '#FEE2E2',
                color: cat.active ? '#0D7355' : '#C41E3A',
              }}
            >
              {cat.active ? 'Activa' : 'Inactiva'}
            </span>
            <button
              onClick={() => handleToggle(cat.id)}
              className="text-xs px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
              title={cat.active ? 'Desactivar' : 'Activar'}
            >
              {cat.active ? 'Desactivar' : 'Activar'}
            </button>
            <button
              onClick={() => startEdit(cat)}
              className="text-xs px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Editar
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-gray-400 py-4 text-center">No hay categorias en este grupo</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex justify-end mb-6">
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
          style={{ backgroundColor: '#8B5CF6' }}
        >
          + Nueva categoria
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">
            {editingId ? 'Editar categoria' : 'Nueva categoria'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Gastronomia / Tapas"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Slug</label>
                <input
                  type="text"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  placeholder="gastronomia"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Grupo</label>
                <select
                  value={formGroup}
                  onChange={(e) => setFormGroup(e.target.value as 'fiesta' | 'local')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                >
                  <option value="fiesta">Fiesta popular</option>
                  <option value="local">Experiencia local</option>
                </select>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Icono (emoji)</label>
                  <input
                    type="text"
                    value={formIcon}
                    onChange={(e) => setFormIcon(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 text-center text-xl"
                  />
                </div>
                <div className="w-24">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Orden</label>
                  <input
                    type="number"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                  />
                </div>
              </div>
            </div>

            {formError && (
              <p className="text-red-500 text-sm">{formError}</p>
            )}

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-colors"
                style={{ backgroundColor: '#8B5CF6' }}
              >
                {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear categoria'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lists */}
      {renderGroup('Fiestas populares', fiestaCategories)}
      {renderGroup('Experiencias locales', localCategories)}
    </div>
  );
}

/* ================================================================== */
/*  GestionPageInner                                                    */
/* ================================================================== */

function GestionPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [alerts, setAlerts] = useState<{ disputes?: number; reports?: number; verifications?: number }>({});

  const activeTab = searchParams.get('tab') || 'usuarios';

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (!authLoading && user?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
  }, [authLoading, isAuthenticated, user, router]);

  // Fetch alerts for AdminLayout badge
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') return;
    let cancelled = false;
    api.get('/admin/dashboard/alerts')
      .then((res) => { if (!cancelled) setAlerts(res.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isAuthenticated, user]);

  const getTitle = () => {
    switch (activeTab) {
      case 'usuarios': return 'Usuarios';
      case 'experiencias': return 'Experiencias';
      case 'categorias': return 'Categorias';
      default: return 'Gestion';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <AdminLayout section="gestion" title={getTitle()} alerts={alerts}>
      {activeTab === 'usuarios' && <UsersContent />}
      {activeTab === 'experiencias' && <ExperiencesContent />}
      {activeTab === 'categorias' && <CategoriesContent />}
    </AdminLayout>
  );
}

/* ================================================================== */
/*  Default Export                                                     */
/* ================================================================== */

export default function GestionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="spinner spinner-lg" />
        </div>
      }
    >
      <GestionPageInner />
    </Suspense>
  );
}
