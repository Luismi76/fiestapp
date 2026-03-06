'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AdminNavProps {
  alerts?: {
    disputes?: number;
    reports?: number;
    verifications?: number;
  };
}

const NAV_ITEMS = [
  { href: '/admin', label: 'Inicio', alertKey: null },
  { href: '/admin/users', label: 'Usuarios', alertKey: null },
  { href: '/admin/experiences', label: 'Experiencias', alertKey: null },
  { href: '/admin/disputes', label: 'Disputas', alertKey: 'disputes' as const },
  { href: '/admin/reports', label: 'Reportes', alertKey: 'reports' as const },
  { href: '/admin/verifications', label: 'Verif.', alertKey: 'verifications' as const },
  { href: '/admin/evaluaciones', label: 'Eval.', alertKey: null },
];

export default function AdminNav({ alerts }: AdminNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 overflow-x-auto">
      <div className="flex min-w-max px-3 h-11 gap-1 items-center">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap"
          style={{ color: '#EF4444' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Salir
        </Link>
        <div className="w-px h-5 bg-gray-200 flex-shrink-0" />
        {NAV_ITEMS.map((item) => {
          const badge = item.alertKey ? alerts?.[item.alertKey] : undefined;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex items-center px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors"
              style={{
                backgroundColor: active ? 'rgba(139,92,246,0.1)' : 'transparent',
                color: active ? '#8B5CF6' : '#6B7280',
              }}
            >
              {item.label}
              {badge !== undefined && badge > 0 && (
                <span
                  className="ml-1 inline-flex items-center justify-center text-white font-bold rounded-full"
                  style={{
                    backgroundColor: '#EF4444',
                    fontSize: '9px',
                    minWidth: '16px',
                    height: '16px',
                    padding: '0 4px',
                  }}
                >
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
