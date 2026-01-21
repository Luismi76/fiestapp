'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200 dark:bg-gray-700',
        className
      )}
    />
  );
}

// Skeleton para una card de experiencia
export function ExperienceCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Image */}
      <Skeleton className="h-48 w-full rounded-none" />

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <Skeleton className="h-6 w-3/4" />

        {/* Location */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>

        {/* Host info */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>

        {/* Price/type */}
        <div className="flex justify-between items-center pt-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// Grid de experiencias skeleton
export function ExperienceGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ExperienceCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Skeleton para un match
export function MatchCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-md p-4 space-y-4">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <Skeleton className="h-12 w-12 rounded-full" />

        {/* Info */}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>

        {/* Status badge */}
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      {/* Experience preview */}
      <div className="flex gap-3">
        <Skeleton className="h-16 w-16 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 flex-1 rounded-lg" />
      </div>
    </div>
  );
}

// Lista de matches skeleton
export function MatchListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <MatchCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Skeleton para perfil de usuario
export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <Skeleton className="h-24 w-24 sm:h-32 sm:w-32 rounded-full" />
        <div className="flex-1 space-y-3 text-center sm:text-left">
          <Skeleton className="h-8 w-48 mx-auto sm:mx-0" />
          <Skeleton className="h-4 w-32 mx-auto sm:mx-0" />
          <div className="flex gap-4 justify-center sm:justify-start">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="text-center space-y-2">
            <Skeleton className="h-8 w-12 mx-auto" />
            <Skeleton className="h-4 w-16 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Skeleton para chat/mensajes
export function ChatSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 space-y-4">
        {/* Received message */}
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-16 w-48 rounded-2xl rounded-tl-none" />
        </div>

        {/* Sent message */}
        <div className="flex justify-end">
          <Skeleton className="h-12 w-40 rounded-2xl rounded-tr-none" />
        </div>

        {/* Received message */}
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-20 w-56 rounded-2xl rounded-tl-none" />
        </div>

        {/* Sent message */}
        <div className="flex justify-end">
          <Skeleton className="h-10 w-32 rounded-2xl rounded-tr-none" />
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </div>
  );
}

// Skeleton para detalle de experiencia
export function ExperienceDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Image gallery */}
      <Skeleton className="h-64 sm:h-96 w-full rounded-2xl" />

      {/* Title & location */}
      <div className="space-y-3">
        <Skeleton className="h-8 w-3/4" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-5 w-40" />
        </div>
      </div>

      {/* Host info */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>

      {/* Highlights */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
      </div>

      {/* CTA */}
      <Skeleton className="h-14 w-full rounded-xl" />
    </div>
  );
}

// Loading spinner simple
export function Spinner({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-primary border-t-transparent',
        sizeClasses[size],
        className
      )}
    />
  );
}

// Full page loading
export function PageLoader({ message }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
      <Spinner size="lg" />
      {message && (
        <p className="mt-4 text-gray-600 animate-pulse">{message}</p>
      )}
    </div>
  );
}
