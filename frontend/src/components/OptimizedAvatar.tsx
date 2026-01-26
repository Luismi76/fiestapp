'use client';

import Image from 'next/image';
import { useState } from 'react';

interface OptimizedAvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

const sizePx = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getColorFromName(name: string): string {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500',
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

export default function OptimizedAvatar({
  src,
  name,
  size = 'md',
  className = '',
}: OptimizedAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const initials = getInitials(name);
  const bgColor = getColorFromName(name);

  if (!src || imgError) {
    return (
      <div
        className={`${sizeClasses[size]} ${bgColor} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${className}`}
      >
        {initials}
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} relative rounded-full overflow-hidden flex-shrink-0 ${className}`}>
      <Image
        src={src}
        alt={name}
        fill
        sizes={`${sizePx[size]}px`}
        className="object-cover"
        onError={() => setImgError(true)}
      />
    </div>
  );
}
