'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ReactNode, Suspense, useMemo } from 'react';

interface AdminLayoutProps {
  children: ReactNode;
  section: 'inicio' | 'gestion' | 'moderacion' | 'finanzas';
  title: string;
  alerts?: { disputes?: number; reports?: number; verifications?: number };
}

/* ── Heroicon SVGs (outline, 24×24 viewBox) ─────────────────────────── */

function HomeIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function UsersIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
    </svg>
  );
}

function ShieldIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  );
}

function BanknotesIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
    </svg>
  );
}

function ArrowLeftIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
  );
}

/* ── Small sidebar sub-item icons (w-4 h-4) ──────────────────────────── */

function UserSmallIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );
}

function SparklesIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  );
}

function TagIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
    </svg>
  );
}

function FireIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
    </svg>
  );
}

function FlagIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
    </svg>
  );
}

function CheckBadgeIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
    </svg>
  );
}

function ChartIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  );
}

function CreditCardIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
    </svg>
  );
}

function DocumentIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

function CalculatorIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V13.5Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V18Zm2.498-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V18Zm2.504-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V18Zm2.498-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5ZM8.25 6h7.5v2.25h-7.5V6ZM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0 0 12 2.25Z" />
    </svg>
  );
}

function CogIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

/* ── Badge component ──────────────────────────────────────────────────── */

function Badge({ count, className = '' }: { count: number; className?: string }) {
  if (!count || count <= 0) return null;
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-red-500 text-white font-bold ${className}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

/* ── Sidebar navigation data ──────────────────────────────────────────── */

interface SidebarItem {
  href: string;
  tab?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  alertKey?: 'disputes' | 'reports' | 'verifications';
}

interface SidebarGroup {
  header?: string;
  items: SidebarItem[];
}

const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    items: [
      { href: '/admin', label: 'Inicio', icon: HomeIcon },
    ],
  },
  {
    header: 'GESTION',
    items: [
      { href: '/admin/gestion', tab: 'usuarios', label: 'Usuarios', icon: UserSmallIcon },
      { href: '/admin/gestion', tab: 'experiencias', label: 'Experiencias', icon: SparklesIcon },
      { href: '/admin/gestion', tab: 'categorias', label: 'Categorias', icon: TagIcon },
    ],
  },
  {
    header: 'MODERACION',
    items: [
      { href: '/admin/moderacion', tab: 'disputas', label: 'Disputas', icon: FireIcon, alertKey: 'disputes' },
      { href: '/admin/moderacion', tab: 'reportes', label: 'Denuncias', icon: FlagIcon, alertKey: 'reports' },
      { href: '/admin/moderacion', tab: 'verificaciones', label: 'Verificaciones', icon: CheckBadgeIcon, alertKey: 'verifications' },
    ],
  },
  {
    header: 'FINANZAS',
    items: [
      { href: '/admin/finanzas', tab: 'resumen', label: 'Resumen', icon: ChartIcon },
      { href: '/admin/finanzas', tab: 'transacciones', label: 'Transacciones', icon: CreditCardIcon },
      { href: '/admin/finanzas', tab: 'dac7', label: 'DAC7', icon: DocumentIcon },
      { href: '/admin/finanzas', tab: 'fiscal', label: 'Fiscal', icon: CalculatorIcon },
      { href: '/admin/finanzas', tab: 'comisiones', label: 'Comisiones', icon: CogIcon },
    ],
  },
];

/* ── Bottom bar items ─────────────────────────────────────────────────── */

interface BottomBarItem {
  section: AdminLayoutProps['section'];
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const BOTTOM_BAR_ITEMS: BottomBarItem[] = [
  { section: 'inicio', href: '/admin', label: 'Inicio', icon: HomeIcon },
  { section: 'gestion', href: '/admin/gestion', label: 'Gestion', icon: UsersIcon },
  { section: 'moderacion', href: '/admin/moderacion', label: 'Moderacion', icon: ShieldIcon },
  { section: 'finanzas', href: '/admin/finanzas', label: 'Finanzas', icon: BanknotesIcon },
];

/* ── Hoisted style constants (avoid inline object recreation) ──────────── */

const SHADOW_LIGHT = { boxShadow: '0 -1px 2px rgba(0,0,0,0.05)' } as const;
const SHADOW_MEDIUM = { boxShadow: '0 -1px 3px rgba(0,0,0,0.1)' } as const;
const ACTIVE_TAB_STYLE = { backgroundColor: '#FF6B35' } as const;
const ACTIVE_SIDEBAR_STYLE = { backgroundColor: 'rgba(255,107,53,0.1)', color: '#FF6B35' } as const;
const SPINNER_STYLE = { borderColor: '#FF6B35', borderTopColor: 'transparent' } as const;

/* ── Inner layout (uses useSearchParams, needs Suspense) ──────────────── */

function AdminLayoutInner({ children, section, title, alerts }: AdminLayoutProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab');

  const totalAlerts =
    (alerts?.disputes ?? 0) + (alerts?.reports ?? 0) + (alerts?.verifications ?? 0);

  const isSidebarItemActive = (item: SidebarItem): boolean => {
    if (item.href === '/admin' && !item.tab) {
      return pathname === '/admin';
    }
    if (!pathname.startsWith(item.href)) return false;
    if (item.tab) {
      return currentTab === item.tab;
    }
    return !currentTab;
  };

  const buildHref = (item: SidebarItem): string => {
    if (item.tab) return `${item.href}?tab=${item.tab}`;
    return item.href;
  };

  const sectionGroup = useMemo(
    () => SIDEBAR_GROUPS.find(g => g.items.some(i => i.href === `/admin/${section}`)),
    [section],
  );

  return (
    <>
      {/* ───── MOBILE LAYOUT (< md) ───── */}
      <div className="md:hidden flex flex-col min-h-screen">
        {/* Mobile top header */}
        <header className="sticky top-0 z-40 h-14 bg-white border-b border-gray-200">
          <div className="h-full grid grid-cols-3 items-center px-4">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[11px] font-bold">F</span>
              </div>
              <span className="text-xs font-bold text-gray-600 tracking-wide">ADMIN</span>
            </div>
            <h1 className="text-center font-semibold text-gray-900 text-sm truncate">
              {title}
            </h1>
            <div className="flex justify-end">
              <Link
                href="/dashboard"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <ArrowLeftIcon className="w-3.5 h-3.5" />
                Salir
              </Link>
            </div>
          </div>
        </header>

        {/* Mobile content */}
        <main className={`flex-1 ${section === 'inicio' ? 'pb-20' : 'pb-40'}`}>
          {children}
        </main>

        {/* Mobile sub-nav (above bottom bar, only for sections with tabs) */}
        {section !== 'inicio' && sectionGroup && (
          <nav
            className="fixed bottom-16 inset-x-0 z-40 bg-white border-t border-gray-100"
            style={SHADOW_LIGHT}
          >
            <div className="flex gap-1.5 overflow-x-auto px-3 py-2 scrollbar-hide">
              {sectionGroup.items.map((sub) => {
                const active = pathname.startsWith(sub.href) && currentTab === sub.tab;
                const badge = sub.alertKey ? alerts?.[sub.alertKey] ?? 0 : 0;
                return (
                  <Link
                    key={sub.tab || sub.label}
                    href={buildHref(sub)}
                    className={`relative whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      active ? 'text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                    style={active ? ACTIVE_TAB_STYLE : undefined}
                  >
                    {sub.label}
                    {badge > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}

        {/* Mobile bottom bar */}
        <nav
          className="fixed bottom-0 inset-x-0 z-50 h-16 bg-white border-t border-gray-200"
          style={SHADOW_MEDIUM}
        >
          <div className="flex h-full">
            {BOTTOM_BAR_ITEMS.map((item) => {
              const isActive = item.section === section;
              const Icon = item.icon;
              return (
                <Link
                  key={item.section}
                  href={item.href}
                  className="flex-1 flex flex-col items-center justify-center transition-colors"
                  style={{ minHeight: '44px', color: isActive ? '#FF6B35' : '#9CA3AF' }}
                >
                  <div className="relative">
                    <Icon
                      className="w-6 h-6"
                    />
                    {item.section === 'moderacion' && totalAlerts > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                        {totalAlerts > 99 ? '99+' : totalAlerts}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] mt-0.5">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* ───── DESKTOP LAYOUT (md+) ───── */}
      <div className="hidden md:flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className="fixed left-0 top-0 bottom-0 w-56 bg-white border-r border-gray-200 flex flex-col z-40">
          {/* Sidebar title */}
          <div className="h-14 flex items-center gap-2.5 px-4 border-b border-gray-100">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">F</span>
            </div>
            <div>
              <span className="font-bold text-sm text-gray-900 leading-tight block">FiestApp</span>
              <span className="text-[10px] text-gray-400 font-medium leading-tight block">Panel Admin</span>
            </div>
          </div>

          {/* Sidebar navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-2">
            {SIDEBAR_GROUPS.map((group, gi) => (
              <div key={gi}>
                {group.header && (
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-4 mb-1 px-3">
                    {group.header}
                  </p>
                )}
                {group.items.map((item) => {
                  const active = isSidebarItemActive(item);
                  const Icon = item.icon;
                  const badge = item.alertKey ? alerts?.[item.alertKey] ?? 0 : 0;
                  return (
                    <Link
                      key={buildHref(item)}
                      href={buildHref(item)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                        active
                          ? 'font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                      style={active ? ACTIVE_SIDEBAR_STYLE : undefined}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {badge > 0 && (
                        <Badge
                          count={badge}
                          className="ml-auto min-w-5 h-5 text-xs px-1.5"
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Sidebar bottom: exit link */}
          <div className="border-t border-gray-100 px-3 py-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>Salir</span>
            </Link>
          </div>
        </aside>

        {/* Desktop content area */}
        <div className="ml-56 flex-1 min-h-screen bg-gray-50">
          {/* Desktop top header */}
          <header className="sticky top-0 z-30 h-14 bg-white border-b border-gray-200 flex items-center justify-center px-6">
            <h1 className="font-semibold text-gray-900">{title}</h1>
          </header>

          {/* Desktop content */}
          <main>
            {children}
          </main>
        </div>
      </div>
    </>
  );
}

/* ── Exported component (wrapped in Suspense) ─────────────────────────── */

export default function AdminLayout(props: AdminLayoutProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="w-8 h-8 border-4 rounded-full animate-spin" style={SPINNER_STYLE} />
        </div>
      }
    >
      <AdminLayoutInner {...props} />
    </Suspense>
  );
}
