'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { OptimizedAvatar } from '@/components/OptimizedImage';
import { MatchStatus } from '@/types/match';

interface ChatHeaderProps {
  otherUser: {
    id?: string;
    name?: string;
    avatar?: string;
    verified?: boolean;
    city?: string;
  } | undefined;
  status: MatchStatus;
  getAvatarSrc: (avatar?: string) => string;
}

const statusConfig: Record<MatchStatus, { label: string; bg: string; text: string }> = {
  pending: { label: 'Pendiente', bg: 'bg-amber-100', text: 'text-amber-700' },
  accepted: { label: 'Aceptada', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  rejected: { label: 'Rechazada', bg: 'bg-red-100', text: 'text-red-700' },
  cancelled: { label: 'Cancelada', bg: 'bg-gray-100', text: 'text-gray-600' },
  completed: { label: 'Completada', bg: 'bg-blue-100', text: 'text-blue-700' },
};

export default function ChatHeader({ otherUser, status, getAvatarSrc }: ChatHeaderProps) {
  const router = useRouter();
  const config = statusConfig[status];

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="flex items-center gap-3 px-4 h-16">
        <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>

        {/* User info */}
        <Link href={`/profile/${otherUser?.id}`} className="flex items-center gap-3 flex-1 min-w-0">
          <div className="ring-2 ring-gray-100 rounded-full flex-shrink-0">
            <OptimizedAvatar
              src={getAvatarSrc(otherUser?.avatar)}
              name={otherUser?.name || 'Usuario'}
              size="md"
              className="w-10 h-10"
            />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 flex items-center gap-1.5">
              <span className="truncate">{otherUser?.name}</span>
              {otherUser?.verified && (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-500 flex-shrink-0">
                  <path fillRule="evenodd" d="M16.403 12.652a3 3 0 0 0 0-5.304 3 3 0 0 0-3.75-3.751 3 3 0 0 0-5.305 0 3 3 0 0 0-3.751 3.75 3 3 0 0 0 0 5.305 3 3 0 0 0 3.75 3.751 3 3 0 0 0 5.305 0 3 3 0 0 0 3.751-3.75Zm-2.546-4.46a.75.75 0 0 0-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <p className="text-xs text-gray-500 truncate">{otherUser?.city}</p>
          </div>
        </Link>

        {/* Status badge */}
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text} flex-shrink-0`}>
          {config.label}
        </span>
      </div>
    </header>
  );
}
