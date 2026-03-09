'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MainLayout from '@/components/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { notificationsApi, Notification, NotificationType } from '@/lib/api';

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  system: { label: 'Sistema', color: '#8B5CF6', bg: '#F3F0FF' },
  warning: { label: 'Advertencia', color: '#D97706', bg: '#FFFBEB' },
  strike: { label: 'Strike', color: '#DC2626', bg: '#FEF2F2' },
  match_request: { label: 'Solicitud', color: '#8B5CF6', bg: '#F3F0FF' },
  match_accepted: { label: 'Aceptada', color: '#059669', bg: '#ECFDF5' },
  match_rejected: { label: 'Rechazada', color: '#DC2626', bg: '#FEF2F2' },
  match_completed: { label: 'Completada', color: '#059669', bg: '#ECFDF5' },
  match_cancelled: { label: 'Cancelada', color: '#6B7280', bg: '#F3F4F6' },
  new_message: { label: 'Mensaje', color: '#2563EB', bg: '#EFF6FF' },
  new_review: { label: 'Resena', color: '#D97706', bg: '#FFFBEB' },
};

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'system', label: 'Sistema' },
  { value: 'warning', label: 'Advertencias' },
  { value: 'match_request', label: 'Solicitudes' },
  { value: 'match_accepted', label: 'Aceptadas' },
  { value: 'match_completed', label: 'Completadas' },
  { value: 'new_message', label: 'Mensajes' },
  { value: 'new_review', label: 'Resenas' },
];

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    unreadCount,
    markAsRead: contextMarkAsRead,
    markAllAsRead: contextMarkAllAsRead,
    refreshCount,
  } = useNotifications();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const pageRef = useRef(1);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  // Fetch con reset cuando cambian filtros
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      pageRef.current = 1;
      try {
        const response = await notificationsApi.getAll(1, 20, {
          unreadOnly,
          type: (filter || undefined) as NotificationType | undefined,
        });
        if (!cancelled) {
          setNotifications(response.notifications);
          setTotal(response.total);
          setHasMore(response.hasMore);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [user, filter, unreadOnly]);

  const loadMore = async () => {
    const nextPage = pageRef.current + 1;
    setLoadingMore(true);
    try {
      const response = await notificationsApi.getAll(nextPage, 20, {
        unreadOnly,
        type: (filter || undefined) as NotificationType | undefined,
      });
      pageRef.current = nextPage;
      setNotifications(prev => [...prev, ...response.notifications]);
      setHasMore(response.hasMore);
    } catch (error) {
      console.error('Error loading more:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    setActionLoading(notificationId);
    try {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      await contextMarkAsRead(notificationId);
    } catch (error) {
      console.error('Error marking as read:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    setActionLoading('all');
    try {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      await contextMarkAllAsRead();
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (notificationId: string) => {
    setActionLoading(notificationId);
    try {
      const notification = notifications.find(n => n.id === notificationId);
      await notificationsApi.delete(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setTotal(prev => prev - 1);
      if (notification && !notification.read) {
        void refreshCount();
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;

    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  const getNotificationLink = (notification: Notification): string | null => {
    const data = notification.data as Record<string, string> | undefined;

    if (notification.type.startsWith('match_') && data?.matchId) {
      return `/messages/${data.matchId}`;
    }
    if (notification.type === 'new_message' && data?.matchId) {
      return `/messages/${data.matchId}`;
    }
    if (notification.type === 'new_review' && data?.experienceId) {
      return `/experiences/${data.experienceId}/reviews`;
    }

    return null;
  };

  if (authLoading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="spinner spinner-lg" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
          <div className="flex items-center px-4 h-14">
            <Link
              href="/dashboard"
              className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </Link>
            <span className="flex-1 text-center font-semibold text-gray-900">
              Notificaciones
              {unreadCount > 0 && (
                <span className="ml-1.5 text-xs font-normal text-gray-400">({unreadCount} sin leer)</span>
              )}
            </span>
            {unreadCount > 0 ? (
              <button
                onClick={handleMarkAllAsRead}
                disabled={actionLoading === 'all'}
                className="text-sm text-secondary font-medium disabled:opacity-50"
              >
                {actionLoading === 'all' ? '...' : 'Leer todas'}
              </button>
            ) : (
              <div className="w-10" />
            )}
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* Filtro por tipo + solo no leidas */}
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="flex-1 h-10 px-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
            >
              {FILTER_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => setUnreadOnly(!unreadOnly)}
              className="h-10 px-3 rounded-xl text-sm font-medium border transition-colors whitespace-nowrap"
              style={{
                backgroundColor: unreadOnly ? '#FF6B35' : 'white',
                color: unreadOnly ? 'white' : '#6B7280',
                borderColor: unreadOnly ? '#FF6B35' : '#E5E7EB',
              }}
            >
              Sin leer
            </button>
          </div>

          {/* Contador */}
          <p className="text-xs text-gray-400">{total} notificaciones{filter ? ` (${FILTER_OPTIONS.find(o => o.value === filter)?.label})` : ''}</p>

          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-12">
              <div className="spinner spinner-lg" />
            </div>
          )}

          {/* Notifications List */}
          {!loading && (
            <div className="space-y-2">
              {notifications.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-gray-300 mx-auto mb-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                  </svg>
                  <p className="text-gray-500 font-medium">No hay notificaciones</p>
                  <p className="text-gray-400 text-sm mt-1">
                    {filter || unreadOnly ? 'Prueba cambiando los filtros' : 'Las notificaciones apareceran aqui'}
                  </p>
                </div>
              ) : (
                notifications.map(notification => {
                  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.system;
                  const link = getNotificationLink(notification);
                  const data = notification.data as Record<string, string> | undefined;
                  const isReportWarning = data?.reason === 'report';

                  return (
                    <div
                      key={notification.id}
                      className="bg-white rounded-xl border border-gray-100 overflow-hidden"
                      style={!notification.read ? { borderLeftWidth: '3px', borderLeftColor: '#FF6B35' } : undefined}
                    >
                      <div className="p-3">
                        <div className="flex items-start gap-3">
                          {/* Icono tipo */}
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: config.bg }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke={config.color} className="w-4.5 h-4.5">
                              {notification.type === 'system' && (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.431.992a7.723 7.723 0 0 1 0 .255c-.007.378.138.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                              )}
                              {notification.type === 'system' && (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                              )}
                              {(notification.type === 'warning' || notification.type === 'strike') && (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                              )}
                              {notification.type === 'match_request' && (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                              )}
                              {(notification.type === 'match_accepted' || notification.type === 'match_completed') && (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                              )}
                              {(notification.type === 'match_rejected' || notification.type === 'match_cancelled') && (
                                <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                              )}
                              {notification.type === 'new_message' && (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                              )}
                              {notification.type === 'new_review' && (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                              )}
                            </svg>
                          </div>

                          {/* Contenido */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                                style={{ color: config.color, backgroundColor: config.bg }}
                              >
                                {config.label}
                              </span>
                              {!notification.read && (
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#FF6B35' }} />
                              )}
                              <span className="text-[10px] text-gray-400 ml-auto">{formatDate(notification.createdAt)}</span>
                            </div>
                            <h3 className="font-semibold text-gray-900 text-sm mt-1 leading-tight">{notification.title}</h3>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
                          </div>
                        </div>

                        {/* Report warning */}
                        {isReportWarning && (
                          <div className="mt-2 p-2 rounded-lg text-[11px] flex items-center gap-1.5" style={{ backgroundColor: '#FFFBEB', color: '#B45309' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
                              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                            </svg>
                            Advertencia por reporte de la comunidad
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-50">
                          {link && (
                            <Link
                              href={link}
                              className="flex-1 py-1.5 text-center text-xs font-medium rounded-lg transition-colors"
                              style={{ color: '#8B5CF6', backgroundColor: '#F3F0FF' }}
                            >
                              Ver detalles
                            </Link>
                          )}
                          {!notification.read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              disabled={actionLoading === notification.id}
                              className="flex-1 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                            >
                              Marcar leída
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notification.id)}
                            disabled={actionLoading === notification.id}
                            className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Load More */}
          {hasMore && !loading && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-3 bg-white border border-gray-200 rounded-xl text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {loadingMore ? 'Cargando...' : 'Cargar mas'}
            </button>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
