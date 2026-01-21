'use client';

import Link from 'next/link';
import { cn, getUploadUrl, getAvatarUrl } from '@/lib/utils';
import { Experience } from '@/types/experience';

interface ExperienceCardProps {
  experience: Experience;
  variant?: 'default' | 'compact' | 'horizontal';
  showHost?: boolean;
  className?: string;
}

/**
 * Card de experiencia responsive y optimizada para movil.
 *
 * Variantes:
 * - default: Card vertical con imagen grande (ideal para grids)
 * - compact: Card compacta para grids de 2 columnas
 * - horizontal: Card horizontal para listas
 */
export default function ExperienceCard({
  experience,
  variant = 'default',
  showHost = true,
  className,
}: ExperienceCardProps) {
  const getImageUrl = () => {
    if (experience.photos && experience.photos.length > 0) {
      const photo = experience.photos[0];
      if (photo.startsWith('/images/')) return photo;
      return getUploadUrl(photo);
    }
    return '/images/placeholder.png';
  };

  const getHostAvatarUrl = () => {
    if (experience.host?.avatar) {
      if (experience.host.avatar.startsWith('/images/')) return experience.host.avatar;
      return getAvatarUrl(experience.host.avatar);
    }
    return null;
  };

  const TypeBadge = () => {
    if (experience.type === 'intercambio') {
      return (
        <span className="px-2 py-1 bg-teal-500 text-white text-xs font-medium rounded-full shadow-sm">
          Intercambio
        </span>
      );
    }
    if (experience.type === 'pago') {
      return (
        <span className="px-2 py-1 bg-white/95 text-gray-900 text-xs font-bold rounded-full shadow">
          {experience.price}€
        </span>
      );
    }
    if (experience.type === 'ambos') {
      return (
        <span className="px-2 py-1 bg-purple-500 text-white text-xs font-medium rounded-full shadow-sm">
          Flexible
        </span>
      );
    }
    return null;
  };

  const HostInfo = () => {
    if (!showHost || !experience.host) return null;
    const avatarUrl = getHostAvatarUrl();

    return (
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={experience.host.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] bg-gradient-to-br from-blue-100 to-pink-100 text-gray-600 font-medium">
              {experience.host.name?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <span className="text-xs text-gray-600 truncate max-w-[80px]">
          {experience.host.name?.split(' ')[0]}
        </span>
        {experience.host.verified && (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-blue-500 flex-shrink-0">
            <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
          </svg>
        )}
      </div>
    );
  };

  const Rating = () => {
    if (!experience.avgRating || experience.avgRating <= 0) return null;
    return (
      <div className="flex items-center gap-0.5 text-xs">
        <span className="text-yellow-500">★</span>
        <span className="font-medium text-gray-700">{experience.avgRating.toFixed(1)}</span>
      </div>
    );
  };

  // Variant: Compact (for 2-column grids on mobile)
  if (variant === 'compact') {
    return (
      <Link
        href={`/experiences/${experience.id}`}
        className={cn(
          'block bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100',
          'hover:shadow-md transition-all duration-200',
          'active:scale-[0.98] touch-manipulation',
          className
        )}
      >
        <div className="aspect-[4/3] relative">
          <img
            src={getImageUrl()}
            alt={experience.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute top-2 right-2">
            <TypeBadge />
          </div>
        </div>
        <div className="p-3">
          {experience.festival && (
            <p className="text-xs text-blue-600 font-medium mb-1 truncate">
              {experience.festival.name}
            </p>
          )}
          <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 leading-tight min-h-[2.5rem]">
            {experience.title}
          </h3>
          <div className="flex items-center justify-between mt-2 gap-2">
            <HostInfo />
            <Rating />
          </div>
        </div>
      </Link>
    );
  }

  // Variant: Horizontal (for lists)
  if (variant === 'horizontal') {
    return (
      <Link
        href={`/experiences/${experience.id}`}
        className={cn(
          'flex bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100',
          'hover:shadow-md transition-all duration-200',
          'active:scale-[0.99] touch-manipulation',
          className
        )}
      >
        <div className="w-28 sm:w-36 flex-shrink-0 relative">
          <img
            src={getImageUrl()}
            alt={experience.title}
            className="w-full h-full object-cover aspect-square"
            loading="lazy"
          />
          <div className="absolute top-2 left-2">
            <TypeBadge />
          </div>
        </div>
        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
          <div>
            {experience.festival && (
              <p className="text-xs text-blue-600 font-medium mb-0.5 truncate">
                {experience.festival.name} · {experience.city}
              </p>
            )}
            <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 leading-snug">
              {experience.title}
            </h3>
          </div>
          <div className="flex items-center justify-between mt-2 gap-2">
            <HostInfo />
            <Rating />
          </div>
        </div>
      </Link>
    );
  }

  // Variant: Default (full card)
  return (
    <Link
      href={`/experiences/${experience.id}`}
      className={cn(
        'block bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100',
        'hover:shadow-lg transition-all duration-200',
        'active:scale-[0.99] touch-manipulation',
        className
      )}
    >
      <div className="aspect-[16/10] sm:aspect-[4/3] relative">
        <img
          src={getImageUrl()}
          alt={experience.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <div className="absolute top-3 right-3">
          <TypeBadge />
        </div>
        {experience.festival && (
          <div className="absolute bottom-3 left-3">
            <span className="px-2.5 py-1 bg-white/90 backdrop-blur-sm text-gray-900 text-xs font-semibold rounded-full">
              {experience.festival.name}
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-gray-900 text-base line-clamp-2 leading-snug mb-2">
          {experience.title}
        </h3>
        {experience.city && (
          <div className="flex items-center gap-1.5 text-gray-500 text-sm mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-red-400">
              <path fillRule="evenodd" d="m11.54 22.351.07.04.028.016a.76.76 0 0 0 .723 0l.028-.015.071-.041a16.975 16.975 0 0 0 1.144-.742 19.58 19.58 0 0 0 2.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 0 0-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 0 0 2.682 2.282 16.975 16.975 0 0 0 1.145.742ZM12 13.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
            </svg>
            <span>{experience.city}, Espana</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <HostInfo />
          <div className="flex items-center gap-3">
            <Rating />
            {experience._count?.reviews !== undefined && experience._count.reviews > 0 && (
              <span className="text-xs text-gray-400">
                ({experience._count.reviews})
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// Grid component for responsive experience cards
interface ExperienceGridProps {
  experiences: Experience[];
  variant?: 'default' | 'compact';
  className?: string;
}

export function ExperienceGrid({ experiences, variant = 'compact', className }: ExperienceGridProps) {
  if (experiences.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🔍</span>
        </div>
        <p className="text-gray-500 mb-2">No hay experiencias disponibles</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid gap-3 sm:gap-4',
        variant === 'compact'
          ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        className
      )}
    >
      {experiences.map((exp) => (
        <ExperienceCard
          key={exp.id}
          experience={exp}
          variant={variant}
        />
      ))}
    </div>
  );
}
