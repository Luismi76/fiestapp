'use client';

interface ReputationBadgesProps {
  verified: boolean;
  phoneVerified?: boolean;
  createdAt: string;
  experiencesCount: number;
  reviewsCount: number;
  avgRating: number;
  size?: 'sm' | 'md' | 'lg';
  showAll?: boolean;
}

interface Badge {
  id: string;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

export function calculateBadges({
  verified,
  phoneVerified,
  createdAt,
  experiencesCount,
  reviewsCount,
  avgRating,
}: Omit<ReputationBadgesProps, 'size' | 'showAll'>): Badge[] {
  const badges: Badge[] = [];
  const accountAgeDays = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Email verificado
  if (verified) {
    badges.push({
      id: 'verified',
      label: 'Email verificado',
      icon: '✓',
      color: 'text-green-700',
      bgColor: 'bg-green-100',
    });
  }

  // Teléfono verificado
  if (phoneVerified) {
    badges.push({
      id: 'phone-verified',
      label: 'Teléfono verificado',
      icon: '📱',
      color: 'text-teal-700',
      bgColor: 'bg-teal-100',
    });
  }

  // Nuevo usuario (menos de 30 días)
  if (accountAgeDays < 30) {
    badges.push({
      id: 'new',
      label: 'Nuevo',
      icon: '🌟',
      color: 'text-blue-700',
      bgColor: 'bg-blue-100',
    });
  }

  // Usuario veterano (más de 1 año)
  if (accountAgeDays >= 365) {
    badges.push({
      id: 'veteran',
      label: 'Veterano',
      icon: '🏆',
      color: 'text-amber-700',
      bgColor: 'bg-amber-100',
    });
  }

  // Anfitrión (tiene experiencias publicadas)
  if (experiencesCount > 0) {
    badges.push({
      id: 'host',
      label: 'Anfitrión',
      icon: '🏠',
      color: 'text-purple-700',
      bgColor: 'bg-purple-100',
    });
  }

  // Anfitrión experimentado (3+ experiencias)
  if (experiencesCount >= 3) {
    badges.push({
      id: 'experienced-host',
      label: 'Experimentado',
      icon: '⭐',
      color: 'text-purple-700',
      bgColor: 'bg-purple-100',
    });
  }

  // Superanfitrión (5+ experiencias con 4.5+ rating y 10+ reseñas)
  if (experiencesCount >= 5 && avgRating >= 4.5 && reviewsCount >= 10) {
    badges.push({
      id: 'superhost',
      label: 'Superanfitrión',
      icon: '👑',
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-100',
    });
  }

  // Muy valorado (4.5+ rating con al menos 3 reseñas)
  if (avgRating >= 4.5 && reviewsCount >= 3) {
    badges.push({
      id: 'highly-rated',
      label: 'Muy valorado',
      icon: '💫',
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-100',
    });
  }

  // Popular (10+ reseñas)
  if (reviewsCount >= 10) {
    badges.push({
      id: 'popular',
      label: 'Popular',
      icon: '🔥',
      color: 'text-orange-700',
      bgColor: 'bg-orange-100',
    });
  }

  return badges;
}

export default function ReputationBadges({
  verified,
  phoneVerified,
  createdAt,
  experiencesCount,
  reviewsCount,
  avgRating,
  size = 'md',
  showAll = false,
}: ReputationBadgesProps) {
  const badges = calculateBadges({
    verified,
    phoneVerified,
    createdAt,
    experiencesCount,
    reviewsCount,
    avgRating,
  });

  if (badges.length === 0) return null;

  const displayBadges = showAll ? badges : badges.slice(0, 3);
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
          className={`inline-flex items-center rounded-full font-medium ${badge.bgColor} ${badge.color} ${sizeClasses[size]}`}
          title={badge.label}
        >
          <span>{badge.icon}</span>
          <span>{badge.label}</span>
        </span>
      ))}
      {remainingCount > 0 && (
        <span
          className={`inline-flex items-center rounded-full font-medium bg-gray-100 text-gray-600 ${sizeClasses[size]}`}
        >
          +{remainingCount} más
        </span>
      )}
    </div>
  );
}

// Componente simplificado que solo muestra iconos
export function ReputationBadgesCompact({
  verified,
  phoneVerified,
  createdAt,
  experiencesCount,
  reviewsCount,
  avgRating,
}: Omit<ReputationBadgesProps, 'size' | 'showAll'>) {
  const badges = calculateBadges({
    verified,
    phoneVerified,
    createdAt,
    experiencesCount,
    reviewsCount,
    avgRating,
  });

  if (badges.length === 0) return null;

  // Mostrar solo los 3 más importantes
  const topBadges = badges.slice(0, 3);

  return (
    <div className="flex items-center gap-1">
      {topBadges.map((badge) => (
        <span
          key={badge.id}
          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm ${badge.bgColor}`}
          title={badge.label}
        >
          {badge.icon}
        </span>
      ))}
    </div>
  );
}
