'use client';

import { useState } from 'react';
import Link from 'next/link';
import { OptimizedImage } from '@/components/OptimizedImage';
import { getUploadUrl } from '@/lib/utils';

interface OfferExperienceInfo {
  id: string;
  title: string;
  city: string;
  photos?: string[];
  type?: string;
  festival?: { name: string } | null;
}

interface MatchSummaryCardProps {
  experience: {
    id: string;
    title: string;
    photos?: string[];
    festival?: { name: string } | null;
    city?: string;
    type?: string;
  };
  startDate?: string;
  participants?: number;
  totalPrice?: number;
  offerDescription?: string;
  offerExperience?: OfferExperienceInfo | null;
  status: string;
}

export default function MatchSummaryCard({
  experience,
  startDate,
  participants,
  totalPrice,
  offerDescription,
  offerExperience,
  status,
}: MatchSummaryCardProps) {
  const [expanded, setExpanded] = useState(!!offerExperience || !!offerDescription);

  const photoUrl = experience.photos && experience.photos[0]
    ? getUploadUrl(experience.photos[0]) || '/images/feria_abril.png'
    : null;

  const formattedDate = startDate
    ? new Date(startDate).toLocaleDateString('es-ES', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : null;

  const isExchange = experience.type === 'intercambio';

  const offerPhotoUrl = offerExperience?.photos?.[0]
    ? getUploadUrl(offerExperience.photos[0])
    : null;

  return (
    <div className="mx-4 mt-3 bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
      {/* Clickable header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50/50 transition-colors"
      >
        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 relative">
          {photoUrl ? (
            <OptimizedImage
              src={photoUrl}
              alt={experience.title}
              fill
              preset="cardThumbnail"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <span className="text-xl">🎭</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <h3 className="font-semibold text-sm text-gray-900 truncate">{experience.title}</h3>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
            {formattedDate && <span>{formattedDate}</span>}
            {formattedDate && (participants || totalPrice) && <span>·</span>}
            {participants && participants > 1 && <span>{participants} pers.</span>}
            {participants && participants > 1 && totalPrice && <span>·</span>}
            {totalPrice ? (
              <span className="font-semibold text-gray-700">{totalPrice.toFixed(0)}€</span>
            ) : isExchange ? (
              <span className="font-semibold text-emerald-600">Intercambio</span>
            ) : null}
          </div>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
        >
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-gray-50 animate-fade-in">
          <div className="grid grid-cols-2 gap-3 pt-3">
            <div>
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Festividad</div>
              <div className="text-sm font-medium text-gray-800 mt-0.5">{experience.festival?.name || '—'}</div>
            </div>
            {experience.city && (
              <div>
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Ciudad</div>
                <div className="text-sm font-medium text-gray-800 mt-0.5">{experience.city}</div>
              </div>
            )}
            {formattedDate && (
              <div>
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Fecha</div>
                <div className="text-sm font-medium text-gray-800 mt-0.5">{formattedDate}</div>
              </div>
            )}
            {participants && participants > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Participantes</div>
                <div className="text-sm font-medium text-gray-800 mt-0.5">{participants} persona{participants !== 1 ? 's' : ''}</div>
              </div>
            )}
            {totalPrice != null && totalPrice > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Precio total</div>
                <div className="text-sm font-bold text-gray-900 mt-0.5">{totalPrice.toFixed(2)}€</div>
              </div>
            )}
            <div>
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Tipo</div>
              <div className="text-sm font-medium text-gray-800 mt-0.5 capitalize">{experience.type || 'pago'}</div>
            </div>
          </div>

          {/* Experiencia ofrecida a cambio */}
          {offerExperience && (
            <div className="mt-3 p-3 bg-secondary/5 border border-secondary/20 rounded-xl">
              <div className="text-[10px] font-semibold text-secondary uppercase tracking-wider mb-2">Experiencia ofrecida a cambio</div>
              <Link
                href={`/experiences/${offerExperience.id}`}
                className="flex items-center gap-3 hover:bg-secondary/5 rounded-lg transition-colors"
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative">
                  {offerPhotoUrl ? (
                    <OptimizedImage
                      src={offerPhotoUrl}
                      alt={offerExperience.title}
                      fill
                      preset="cardThumbnail"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-secondary/20 to-primary/20 flex items-center justify-center">
                      <span className="text-sm">🔄</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{offerExperience.title}</p>
                  <p className="text-xs text-gray-500">{offerExperience.city}</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-secondary flex-shrink-0">
                  <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                </svg>
              </Link>
              {offerDescription && (
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">{offerDescription}</p>
              )}
            </div>
          )}

          {/* Legacy: solo texto si no hay experiencia vinculada */}
          {!offerExperience && offerDescription && (
            <div className="mt-3 p-3 bg-secondary/5 border border-secondary/20 rounded-xl">
              <div className="text-[10px] font-semibold text-secondary uppercase tracking-wider mb-1">Propuesta de intercambio</div>
              <div className="text-sm text-gray-700 leading-relaxed">{offerDescription}</div>
            </div>
          )}

          <Link
            href={`/experiences/${experience.id}`}
            className="block mt-3 text-center text-xs font-semibold text-primary hover:text-primary/80 transition-colors py-2 bg-primary/5 rounded-xl"
          >
            Ver experiencia completa
          </Link>
        </div>
      )}
    </div>
  );
}
