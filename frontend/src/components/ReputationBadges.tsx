'use client';

import { useState, useEffect } from 'react';
import { badgesApi } from '@/lib/api';
import logger from '@/lib/logger';

// Colores por categoria de badge
const BADGE_COLORS: Record<string, { color: string; bgColor: string }> = {
  verification: { color: 'text-green-700', bgColor: 'bg-green-100' },
  achievement: { color: 'text-purple-700', bgColor: 'bg-purple-100' },
  milestone: { color: 'text-blue-700', bgColor: 'bg-blue-100' },
};

// Colores especificos por codigo de badge
const BADGE_SPECIFIC_COLORS: Record<string, { color: string; bgColor: string }> = {
  verificado: { color: 'text-green-700', bgColor: 'bg-green-100' },
  primer_acuerdo: { color: 'text-teal-700', bgColor: 'bg-teal-100' },
  primera_fiesta: { color: 'text-pink-700', bgColor: 'bg-pink-100' },
  anfitrion_activo: { color: 'text-purple-700', bgColor: 'bg-purple-100' },
  perfil_completo: { color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  viajero_frecuente: { color: 'text-blue-700', bgColor: 'bg-blue-100' },
  anfitrion_estrella: { color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  muy_valorado: { color: 'text-amber-700', bgColor: 'bg-amber-100' },
  popular: { color: 'text-orange-700', bgColor: 'bg-orange-100' },
  anfitrion_experimentado: { color: 'text-violet-700', bgColor: 'bg-violet-100' },
  super_anfitrion: { color: 'text-yellow-800', bgColor: 'bg-yellow-200' },
  veterano: { color: 'text-amber-800', bgColor: 'bg-amber-200' },
};

interface ReputationBadge {
  code: string;
  name: string;
  description: string;
  icon: string;
  earnedAt?: string;
}

interface ReputationBadgesFromAPIProps {
  userId: string;
  size?: 'sm' | 'md' | 'lg';
  showAll?: boolean;
}

// Componente que carga badges desde la API
export function ReputationBadgesFromAPI({
  userId,
  size = 'md',
  showAll = false,
}: ReputationBadgesFromAPIProps) {
  const [badges, setBadges] = useState<ReputationBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const reputation = await badgesApi.getUserReputation(userId);
        setBadges(reputation.badges);
      } catch (error) {
        logger.error('Error fetching badges:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchBadges();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-7 w-20 bg-gray-200 rounded-full animate-pulse" />
        ))}
      </div>
    );
  }

  if (badges.length === 0) return null;

  const displayBadges = showAll ? badges : badges.slice(0, 4);
  const remainingCount = badges.length - displayBadges.length;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-base px-3 py-1.5 gap-2',
  };

  return (
    <div className="flex flex-wrap gap-2">
      {displayBadges.map((badge) => {
        const colors = BADGE_SPECIFIC_COLORS[badge.code] || BADGE_COLORS.achievement;
        return (
          <span
            key={badge.code}
            className={`inline-flex items-center rounded-full font-medium ${colors.bgColor} ${colors.color} ${sizeClasses[size]} transition-transform hover:scale-105`}
            title={`${badge.name}: ${badge.description}`}
          >
            <span className="text-base">{badge.icon}</span>
            <span>{badge.name}</span>
          </span>
        );
      })}
      {remainingCount > 0 && (
        <span
          className={`inline-flex items-center rounded-full font-medium bg-gray-100 text-gray-600 ${sizeClasses[size]}`}
        >
          +{remainingCount} mas
        </span>
      )}
    </div>
  );
}

// Props para el componente legacy que calcula badges localmente
interface ReputationBadgesProps {
  verified: boolean;
  createdAt: string;
  experiencesCount: number;
  reviewsCount: number;
  avgRating: number;
  size?: 'sm' | 'md' | 'lg';
  showAll?: boolean;
}

interface LocalBadge {
  id: string;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

export function calculateBadges({
  verified,
  createdAt,
  experiencesCount,
  reviewsCount,
  avgRating,
}: Omit<ReputationBadgesProps, 'size' | 'showAll'>): LocalBadge[] {
  const badges: LocalBadge[] = [];
  const accountAgeDays = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Email verificado
  if (verified) {
    badges.push({
      id: 'verified',
      label: 'Verificado',
      icon: '✓',
      color: 'text-green-700',
      bgColor: 'bg-green-100',
    });
  }

  // Anfitrion Activo (tiene experiencias publicadas)
  if (experiencesCount > 0) {
    badges.push({
      id: 'host',
      label: 'Anfitrion Activo',
      icon: '🏠',
      color: 'text-purple-700',
      bgColor: 'bg-purple-100',
    });
  }

  // Anfitrion Experimentado (3+ experiencias)
  if (experiencesCount >= 3) {
    badges.push({
      id: 'experienced-host',
      label: 'Experimentado',
      icon: '🌟',
      color: 'text-violet-700',
      bgColor: 'bg-violet-100',
    });
  }

  // Superanfitrion (5+ experiencias con 4.5+ rating y 10+ resenas)
  if (experiencesCount >= 5 && avgRating >= 4.5 && reviewsCount >= 10) {
    badges.push({
      id: 'superhost',
      label: 'Super Anfitrion',
      icon: '🏆',
      color: 'text-yellow-800',
      bgColor: 'bg-yellow-200',
    });
  }

  // Muy valorado (4.5+ rating con al menos 3 resenas)
  if (avgRating >= 4.5 && reviewsCount >= 3) {
    badges.push({
      id: 'highly-rated',
      label: 'Muy Valorado',
      icon: '💫',
      color: 'text-amber-700',
      bgColor: 'bg-amber-100',
    });
  }

  // Popular (10+ resenas)
  if (reviewsCount >= 10) {
    badges.push({
      id: 'popular',
      label: 'Popular',
      icon: '🔥',
      color: 'text-orange-700',
      bgColor: 'bg-orange-100',
    });
  }

  // Usuario veterano (mas de 1 ano)
  if (accountAgeDays >= 365) {
    badges.push({
      id: 'veteran',
      label: 'Veterano',
      icon: '👑',
      color: 'text-amber-800',
      bgColor: 'bg-amber-200',
    });
  }

  return badges;
}

// Componente legacy que calcula badges localmente (para compatibilidad)
export default function ReputationBadges({
  verified,
  createdAt,
  experiencesCount,
  reviewsCount,
  avgRating,
  size = 'md',
  showAll = false,
}: ReputationBadgesProps) {
  const badges = calculateBadges({
    verified,
    createdAt,
    experiencesCount,
    reviewsCount,
    avgRating,
  });

  if (badges.length === 0) return null;

  const displayBadges = showAll ? badges : badges.slice(0, 4);
  const remainingCount = badges.length - displayBadges.length;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-base px-3 py-1.5 gap-2',
  };

  return (
    <div className="flex flex-wrap gap-2">
      {displayBadges.map((badge) => (
        <span
          key={badge.id}
          className={`inline-flex items-center rounded-full font-medium ${badge.bgColor} ${badge.color} ${sizeClasses[size]} transition-transform hover:scale-105`}
          title={badge.label}
        >
          <span className="text-base">{badge.icon}</span>
          <span>{badge.label}</span>
        </span>
      ))}
      {remainingCount > 0 && (
        <span
          className={`inline-flex items-center rounded-full font-medium bg-gray-100 text-gray-600 ${sizeClasses[size]}`}
        >
          +{remainingCount} mas
        </span>
      )}
    </div>
  );
}

// Componente compacto que solo muestra iconos
export function ReputationBadgesCompact({
  verified,
  createdAt,
  experiencesCount,
  reviewsCount,
  avgRating,
}: Omit<ReputationBadgesProps, 'size' | 'showAll'>) {
  const badges = calculateBadges({
    verified,
    createdAt,
    experiencesCount,
    reviewsCount,
    avgRating,
  });

  if (badges.length === 0) return null;

  // Mostrar solo los 4 mas importantes
  const topBadges = badges.slice(0, 4);

  return (
    <div className="flex items-center gap-1">
      {topBadges.map((badge) => (
        <span
          key={badge.id}
          className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm ${badge.bgColor} transition-transform hover:scale-110`}
          title={badge.label}
        >
          {badge.icon}
        </span>
      ))}
    </div>
  );
}

// Componente de lista expandida de badges
interface BadgesListProps {
  badges: ReputationBadge[];
  showDates?: boolean;
}

export function BadgesList({ badges, showDates = false }: BadgesListProps) {
  if (badges.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl">🏅</span>
        </div>
        <p className="font-medium">Sin badges todavia</p>
        <p className="text-sm">Completa acciones para ganar badges</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {badges.map((badge) => {
        const colors = BADGE_SPECIFIC_COLORS[badge.code] || BADGE_COLORS.achievement;
        return (
          <div
            key={badge.code}
            className={`flex items-center gap-4 p-4 rounded-xl ${colors.bgColor} transition-transform hover:scale-[1.02]`}
          >
            <div className="w-12 h-12 bg-white/50 rounded-full flex items-center justify-center text-2xl">
              {badge.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold ${colors.color}`}>{badge.name}</h3>
              <p className="text-sm text-gray-600">{badge.description}</p>
              {showDates && badge.earnedAt && (
                <p className="text-xs text-gray-500 mt-1">
                  Obtenido el {new Date(badge.earnedAt).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
