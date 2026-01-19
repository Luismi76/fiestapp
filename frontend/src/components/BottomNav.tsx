'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useCallback } from 'react';
import { matchesApi } from '@/lib/api';

export default function BottomNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (isAuthenticated) {
      try {
        const count = await matchesApi.getUnreadCount();
        setUnreadCount(count);
      } catch {
        setUnreadCount(0);
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchUnreadCount();

    // Poll every 30 seconds for new messages
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Refresh when pathname changes (e.g., coming back from chat)
  useEffect(() => {
    fetchUnreadCount();
  }, [pathname, fetchUnreadCount]);

  const isActive = (href: string, id?: string) => {
    if (id === 'home') return pathname === '/dashboard' || pathname === '/';
    if (id === 'explore') return pathname === '/experiences' || pathname.startsWith('/experiences/') && !pathname.includes('/create') && !pathname.includes('/my');
    if (id === 'my') return pathname === '/experiences/my';
    return pathname.startsWith(href);
  };

  const navItems = [
    {
      id: 'home',
      label: 'Inicio',
      href: '/dashboard',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 2} className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
    },
    {
      id: 'explore',
      label: 'Explorar',
      href: '/experiences',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 2} className="w-6 h-6">
          <path fillRule="evenodd" d="m11.54 22.351.07.04.028.016a.76.76 0 0 0 .723 0l.028-.015.071-.041a16.975 16.975 0 0 0 1.144-.742 19.58 19.58 0 0 0 2.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 0 0-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 0 0 2.682 2.282 16.975 16.975 0 0 0 1.145.742ZM12 13.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      id: 'create',
      label: 'Crear',
      href: '/experiences/create',
      isFab: true,
      icon: (_active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-7 h-7">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      ),
    },
    {
      id: 'notifications',
      label: 'Mensajes',
      href: '/matches/received',
      badge: unreadCount,
      authRequired: true,
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 2} className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
      ),
    },
    {
      id: 'profile',
      label: 'Perfil',
      href: '/profile/me',
      authRequired: true,
      guestHref: '/login',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 2} className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const active = isActive(item.href, item.id);
        const finalHref = item.authRequired && !isAuthenticated
          ? (item.guestHref || '/login')
          : item.href;

        // FAB (Floating Action Button) central
        if (item.isFab) {
          return (
            <Link
              key={item.label}
              href={finalHref}
              className="bottom-nav-fab"
            >
              {item.icon(false)}
            </Link>
          );
        }

        return (
          <Link
            key={item.label}
            href={finalHref}
            className={`bottom-nav-item ${active ? 'active' : ''}`}
          >
            <span className="bottom-nav-icon">
              {item.icon(active)}
            </span>
            <span>{item.label}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span className="bottom-nav-badge">{item.badge > 99 ? '99+' : item.badge}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
