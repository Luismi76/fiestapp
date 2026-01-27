'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MainLayout from '@/components/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { notificationsApi, Notification, NotificationType } from '@/lib/api';

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string; label: string }> = {
  system: {
    icon: '🔔',
    color: 'text-secondary',
    bg: 'bg-secondary/10',
    label: 'Sistema',
  },
  warning: {
    icon: '⚠️',
    color: 'text-accent',
    bg: 'bg-accent/10',
    label: 'Advertencia',
  },
  strike: {
    icon: '🚨',
    color: 'text-primary',
    bg: 'bg-primary/10',
    label: 'Strike',
  },
  match_request: {
    icon: '📩',
    color: 'text-secondary',
    bg: 'bg-secondary/10',
    label: 'Solicitud',
  },
  match_accepted: {
    icon: '✅',
    color: 'text-emerald',
    bg: 'bg-emerald/10',
    label: 'Aceptada',
  },
  match_rejected: {
    icon: '❌',
    color: 'text-primary',
    bg: 'bg-primary/10',
    label: 'Rechazada',
  },
  match_completed: {
    icon: '🎉',
    color: 'text-emerald',
    bg: 'bg-emerald/10',
    label: 'Completada',
  },
  match_cancelled: {
    icon: '🚫',
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    label: 'Cancelada',
  },
  new_message: {
    icon: '💬',
    color: 'text-secondary',
    bg: 'bg-secondary/10',
    label: 'Mensaje',
  },
  new_review: {
    icon: '⭐',
    color: 'text-accent',
    bg: 'bg-accent/10',
    label: 'Reseña',
  },
};

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'system', label: 'Sistema' },
  { value: 'warning', label: 'Advertencias' },
  { value: 'match_request', label: 'Solicitudes' },
  { value: 'match_accepted', label: 'Aceptadas' },
  { value: 'new_message', label: 'Mensajes' },
  { value: 'new_review', label: 'Reseñas' },
];

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<NotificationType | ''>('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchNotifications = useCallback(async (reset = false) => {
    try {
      const currentPage = reset ? 1 : page;
      const response = await notificationsApi.getAll(currentPage, 20, {
        unreadOnly,
        type: filter || undefined,
      });

      if (reset) {
        setNotifications(response.notifications);
        setPage(1);
      } else {
        setNotifications(prev => [...prev, ...response.notifications]);
      }

      setTotal(response.pagination.total);
      setHasMore(currentPage < response.pagination.pages);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [page, filter, unreadOnly]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await notificationsApi.getUnreadCount();
      setUnreadCount(response.unreadCount);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      fetchNotifications(true);
      fetchUnreadCount();
    }
  }, [user, filter, unreadOnly, fetchNotifications, fetchUnreadCount]);

  const handleMarkAsRead = async (notificationId: string) => {
    setActionLoading(notificationId);
    try {
      await notificationsApi.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    setActionLoading('all');
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (notificationId: string) => {
    if (!confirm('¿Eliminar esta notificación?')) return;

    setActionLoading(notificationId);
    try {
      await notificationsApi.delete(notificationId);
      const notification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setTotal(prev => prev - 1);
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
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
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;

    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getNotificationLink = (notification: Notification): string | null => {
    const data = notification.data as Record<string, string> | undefined;

    if (notification.type.startsWith('match_') && data?.matchId) {
      return `/matches/${data.matchId}`;
    }
    if (notification.type === 'new_message' && data?.matchId) {
      return `/matches/${data.matchId}`;
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
            <span className="flex-1 text-center font-semibold text-gray-900">Notificaciones</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={actionLoading === 'all'}
                className="text-sm text-secondary font-medium disabled:opacity-50"
              >
                {actionLoading === 'all' ? 'Marcando...' : 'Leer todas'}
              </button>
            )}
            {unreadCount === 0 && <div className="w-10" />}
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Quick access to messages */}
          <Link
            href="/messages"
            className="flex items-center gap-3 bg-white rounded-xl p-4 border border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Ir a Mensajes</p>
              <p className="text-xs text-gray-500">Conversaciones con anfitriones y viajeros</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </Link>

          {/* Stats */}
          <div className="flex gap-3">
            <div className="flex-1 bg-white rounded-xl p-3 text-center border border-gray-100">
              <p className="text-2xl font-bold text-secondary">{unreadCount}</p>
              <p className="text-xs text-gray-500">Sin leer</p>
            </div>
            <div className="flex-1 bg-white rounded-xl p-3 text-center border border-gray-100">
              <p className="text-2xl font-bold text-gray-900">{total}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {FILTER_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value as NotificationType | '')}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === option.value
                    ? 'bg-primary text-white'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Toggle unread only */}
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
            />
            Solo mostrar no leídas
          </label>

          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-8">
              <div className="spinner spinner-lg" />
            </div>
          )}

          {/* Notifications List */}
          {!loading && (
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
                  <div className="text-4xl mb-3">🔔</div>
                  <p className="text-gray-500 font-medium">No hay notificaciones</p>
                  <p className="text-gray-400 text-sm mt-1">
                    {filter ? 'Prueba cambiando el filtro' : 'Las notificaciones aparecerán aquí'}
                  </p>
                </div>
              ) : (
                notifications.map(notification => {
                  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.system;
                  const link = getNotificationLink(notification);
                  const isWarningOrStrike = ['system', 'warning', 'strike'].includes(notification.type);

                  // Check if it's a warning from report
                  const data = notification.data as Record<string, string> | undefined;
                  const isReportWarning = data?.reason === 'report';

                  return (
                    <div
                      key={notification.id}
                      className={`bg-white rounded-xl border overflow-hidden transition-all ${
                        !notification.read
                          ? 'border-l-4 border-l-primary border-gray-100'
                          : 'border-gray-100'
                      } ${isWarningOrStrike && isReportWarning ? 'ring-2 ring-accent/20' : ''}`}
                    >
                      <div className="p-4">
                        {/* Header */}
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${config.bg}`}>
                            {config.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color} font-medium`}>
                                {config.label}
                              </span>
                              {!notification.read && (
                                <span className="w-2 h-2 bg-primary rounded-full" />
                              )}
                              <span className="text-xs text-gray-400 ml-auto">
                                {formatDate(notification.createdAt)}
                              </span>
                            </div>
                            <h3 className="font-semibold text-gray-900 mt-1">
                              {notification.title}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message}
                            </p>
                          </div>
                        </div>

                        {/* Warning/Strike highlight */}
                        {isWarningOrStrike && isReportWarning && (
                          <div className="mt-3 p-3 bg-accent/5 rounded-lg border border-accent/20">
                            <p className="text-xs text-accent-dark flex items-center gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                              </svg>
                              Esta advertencia proviene de un reporte de la comunidad
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                          {link && (
                            <Link
                              href={link}
                              className="flex-1 py-2 text-center text-sm font-medium text-secondary bg-secondary/10 rounded-lg hover:bg-secondary/20 transition-colors"
                            >
                              Ver detalles
                            </Link>
                          )}
                          {!notification.read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              disabled={actionLoading === notification.id}
                              className="flex-1 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                            >
                              {actionLoading === notification.id ? 'Marcando...' : 'Marcar leída'}
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notification.id)}
                            disabled={actionLoading === notification.id}
                            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
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
              onClick={() => {
                setPage(p => p + 1);
                fetchNotifications();
              }}
              className="w-full py-3 bg-white border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition-colors"
            >
              Cargar más
            </button>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
