'use client';

import Link from 'next/link';
import { cn, getUploadUrl, getAvatarUrl } from '@/lib/utils';
import { Experience } from '@/types/experience';

interface ExperienceCardProps {
  experience: Experience;
  variant?: 'default' | 'compact' | 'horizontal' | 'horizontal-compact' | 'featured';
  showHost?: boolean;
  className?: string;
}

/**
 * Card de experiencia responsive y optimizada para movil.
 * Diseño "Verbena Digital" - Festivo y vibrante.
 *
 * Variantes:
 * - default: Card vertical con imagen grande (ideal para grids)
 * - compact: Card compacta para grids de 2 columnas
 * - horizontal: Card horizontal para listas
 * - horizontal-compact: Card compacta horizontal para listas móviles
 * - featured: Card destacada para secciones hero
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
        <span className="badge badge-intercambio text-[11px]">
          Intercambio
        </span>
      );
    }
    if (experience.type === 'pago') {
      return (
        <span className="badge badge-pago text-[11px]">
          {experience.price}€
        </span>
      );
    }
    if (experience.type === 'ambos') {
      return (
        <span className="badge badge-flexible text-[11px]">
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
        <div className="w-6 h-6 rounded-full overflow-hidden bg-[var(--surface-tile)] flex-shrink-0 ring-2 ring-white">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={experience.host.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] gradient-sunset text-white font-semibold">
              {experience.host.name?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <span className="text-xs text-[#8B7355] truncate max-w-[80px] font-medium">
          {experience.host.name?.split(' ')[0]}
        </span>
        {experience.host.verified && (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-secondary flex-shrink-0">
            <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
          </svg>
        )}
      </div>
    );
  };

  const Rating = () => {
    if (!experience.avgRating || experience.avgRating <= 0) return null;
    return (
      <div className="rating">
        <span className="rating-star">★</span>
        <span className="text-[#1A1410]">{experience.avgRating.toFixed(1)}</span>
      </div>
    );
  };

  // Variant: Compact (for 2-column grids on mobile)
  if (variant === 'compact') {
    return (
      <Link
        href={`/experiences/${experience.id}`}
        className={cn(
          'card card-festive block overflow-hidden',
          'hover:shadow-lg transition-all duration-300',
          'active:scale-[0.98] touch-manipulation',
          className
        )}
      >
        <div className="aspect-[4/3] relative overflow-hidden">
          <img
            src={getImageUrl()}
            alt={experience.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute top-2.5 right-2.5">
            <TypeBadge />
          </div>
        </div>
        <div className="p-3">
          {experience.festival && (
            <p className="text-xs text-primary font-semibold mb-1 truncate">
              {experience.festival.name}
            </p>
          )}
          <h3 className="font-semibold text-[#1A1410] text-sm line-clamp-2 leading-tight min-h-[2.5rem]">
            {experience.title}
          </h3>
          <div className="flex items-center justify-between mt-2.5 gap-2">
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
          'card card-festive flex overflow-hidden',
          'hover:shadow-lg transition-all duration-300',
          'active:scale-[0.99] touch-manipulation',
          className
        )}
      >
        <div className="w-28 sm:w-36 flex-shrink-0 relative overflow-hidden">
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
              <p className="text-xs text-primary font-semibold mb-0.5 truncate">
                {experience.festival.name} · {experience.city}
              </p>
            )}
            <h3 className="font-semibold text-[#1A1410] text-sm line-clamp-2 leading-snug">
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

  // Variant: Horizontal Compact (for mobile lists - smaller and faster to scroll)
  if (variant === 'horizontal-compact') {
    return (
      <Link
        href={`/experiences/${experience.id}`}
        className={cn(
          'card flex overflow-hidden',
          'hover:shadow-md transition-all duration-200',
          'active:scale-[0.99] touch-manipulation',
          className
        )}
      >
        <div className="w-20 h-20 flex-shrink-0 relative overflow-hidden rounded-l-[var(--radius-lg)]">
          <img
            src={getImageUrl()}
            alt={experience.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute top-1 left-1">
            <TypeBadge />
          </div>
        </div>
        <div className="flex-1 p-2.5 flex flex-col justify-center min-w-0">
          <h3 className="font-semibold text-[#1A1410] text-sm line-clamp-1 leading-tight">
            {experience.title}
          </h3>
          {experience.festival && (
            <p className="text-xs text-[#8B7355] truncate mt-0.5">
              {experience.festival.name}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <Rating />
            {experience.city && (
              <span className="text-xs text-[#A89880] truncate">{experience.city}</span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // Variant: Featured (for horizontal scrollable section)
  if (variant === 'featured') {
    return (
      <Link
        href={`/experiences/${experience.id}`}
        className={cn(
          'flex-shrink-0 w-72 card overflow-hidden snap-start',
          'hover:shadow-xl transition-all duration-300',
          'active:scale-[0.98] touch-manipulation',
          className
        )}
      >
        <div className="aspect-[16/9] relative overflow-hidden">
          <img
            src={getImageUrl()}
            alt={experience.title}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute top-3 right-3">
            <TypeBadge />
          </div>
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="font-display text-white text-lg line-clamp-1 drop-shadow-lg">
              {experience.title}
            </h3>
            {experience.festival && (
              <p className="text-white/90 text-xs mt-0.5 drop-shadow font-medium">
                {experience.festival.name} · {experience.city}
              </p>
            )}
          </div>
        </div>
        <div className="p-3 flex items-center justify-between bg-white">
          <HostInfo />
          <div className="flex items-center gap-2">
            <Rating />
            {experience._count?.reviews !== undefined && experience._count.reviews > 0 && (
              <span className="text-xs text-[#A89880]">
                ({experience._count.reviews})
              </span>
            )}
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
        'card card-festive block overflow-hidden group',
        'hover:shadow-xl transition-all duration-300',
        'active:scale-[0.99] touch-manipulation',
        className
      )}
    >
      <div className="aspect-[16/10] sm:aspect-[4/3] relative overflow-hidden">
        <img
          src={getImageUrl()}
          alt={experience.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute top-3 right-3">
          <TypeBadge />
        </div>
        {experience.festival && (
          <div className="absolute bottom-3 left-3">
            <span className="badge bg-white/95 text-[#1A1410] backdrop-blur-sm text-xs font-semibold shadow-lg">
              {experience.festival.name}
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-display text-[#1A1410] text-lg line-clamp-2 leading-snug mb-2">
          {experience.title}
        </h3>
        {experience.city && (
          <div className="flex items-center gap-1.5 text-[#8B7355] text-sm mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-primary">
              <path fillRule="evenodd" d="m11.54 22.351.07.04.028.016a.76.76 0 0 0 .723 0l.028-.015.071-.041a16.975 16.975 0 0 0 1.144-.742 19.58 19.58 0 0 0 2.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 0 0-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 0 0 2.682 2.282 16.975 16.975 0 0 0 1.145.742ZM12 13.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
            </svg>
            <span>{experience.city}, España</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <HostInfo />
          <div className="flex items-center gap-3">
            <Rating />
            {experience._count?.reviews !== undefined && experience._count.reviews > 0 && (
              <span className="text-xs text-[#A89880]">
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
      <div className="empty-state">
        <div className="empty-state-icon">🔍</div>
        <h3 className="empty-state-title">No hay experiencias</h3>
        <p className="empty-state-text">No se encontraron experiencias disponibles</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid gap-4',
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
