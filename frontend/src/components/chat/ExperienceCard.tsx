'use client';

import Link from 'next/link';
import { OptimizedImage } from '@/components/OptimizedImage';
import { getUploadUrl } from '@/lib/utils';

interface ExperienceCardProps {
  experience: {
    id: string;
    title: string;
    photos?: string[];
    festival?: { name: string } | null;
  };
}

export default function ExperienceCard({ experience }: ExperienceCardProps) {
  const photoUrl = experience.photos && experience.photos[0]
    ? getUploadUrl(experience.photos[0]) || '/images/feria_abril.png'
    : null;

  return (
    <Link
      href={`/experiences/${experience.id}`}
      className="mx-4 mt-4 bg-white rounded-2xl shadow-sm overflow-hidden flex items-center gap-3 hover:shadow-md transition-shadow"
    >
      <div className="w-16 h-16 flex-shrink-0 relative">
        {photoUrl ? (
          <OptimizedImage
            src={photoUrl}
            alt={experience.title}
            fill
            preset="cardThumbnail"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
            <span className="text-2xl text-white/50">🎭</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 py-2">
        <h3 className="font-medium text-sm text-gray-900 truncate">{experience.title}</h3>
        <p className="text-xs text-blue-600">{experience.festival?.name || 'Festividad'}</p>
      </div>
      <div className="pr-3">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-300">
          <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </div>
    </Link>
  );
}
