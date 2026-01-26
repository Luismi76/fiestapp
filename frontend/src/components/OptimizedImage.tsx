'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  optimizeImage,
  IMAGE_PRESETS,
  ImageOptions,
  ImageFit,
  ImageGravity,
  isCloudinaryUrl,
} from '@/lib/image';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  preset?: keyof typeof IMAGE_PRESETS;
  priority?: boolean;
  quality?: number | 'auto';
  fit?: ImageFit;
  gravity?: ImageGravity;
  sizes?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Componente de imagen optimizada con:
 * - Transformaciones Cloudinary automáticas
 * - Lazy loading nativo
 * - Soporte para presets
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className = '',
  preset,
  priority = false,
  quality = 'auto',
  fit = 'fill',
  gravity = 'auto',
  sizes,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [hasError, setHasError] = useState(false);

  // Aplicar preset si existe
  const presetOptions = preset ? IMAGE_PRESETS[preset] : null;
  const finalWidth = width || presetOptions?.width;
  const finalHeight = height || presetOptions?.height;
  const finalFit = presetOptions?.fit || fit;
  const presetGravity = presetOptions && 'gravity' in presetOptions
    ? (presetOptions as { gravity: ImageGravity }).gravity
    : undefined;
  const finalGravity: ImageGravity = presetGravity || gravity;

  // Para URLs de Cloudinary, aplicar transformaciones
  // Para otras URLs, usar tal cual
  let finalSrc = src;
  if (isCloudinaryUrl(src)) {
    const options: ImageOptions = {
      width: finalWidth,
      height: finalHeight,
      quality,
      fit: finalFit,
      gravity: finalGravity,
    };
    finalSrc = optimizeImage(src, options);
  }

  // Usar unoptimized para URLs externas (Next.js no las procesa bien)
  const shouldSkipOptimization = finalSrc.startsWith('http://') || finalSrc.startsWith('https://');

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Fallback si hay error
  if (hasError) {
    return (
      <div
        className={`bg-gray-200 flex items-center justify-center ${className}`}
        style={!fill ? { width: finalWidth, height: finalHeight } : undefined}
      >
        <svg
          className="w-12 h-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  if (fill) {
    return (
      <Image
        src={finalSrc}
        alt={alt}
        fill
        className={className}
        style={{ objectFit: 'cover' }}
        sizes={sizes || '100vw'}
        priority={priority}
        unoptimized={shouldSkipOptimization}
        onLoad={onLoad}
        onError={handleError}
      />
    );
  }

  return (
    <Image
      src={finalSrc}
      alt={alt}
      width={finalWidth || 400}
      height={finalHeight || 300}
      className={className}
      style={{ objectFit: 'cover' }}
      priority={priority}
      unoptimized={shouldSkipOptimization}
      onLoad={onLoad}
      onError={handleError}
    />
  );
}

/**
 * Componente de avatar optimizado
 */
interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const AVATAR_SIZES = {
  sm: { dimension: 32, fontSize: 'text-xs' },
  md: { dimension: 48, fontSize: 'text-sm' },
  lg: { dimension: 80, fontSize: 'text-xl' },
  xl: { dimension: 120, fontSize: 'text-3xl' },
};

export function OptimizedAvatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const { dimension, fontSize } = AVATAR_SIZES[size];
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (!src) {
    return (
      <div
        className={`rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold ${fontSize} ${className}`}
        style={{ width: dimension, height: dimension }}
      >
        {initials}
      </div>
    );
  }

  const presetKey = size === 'sm' ? 'avatarSmall' : size === 'lg' || size === 'xl' ? 'avatarLarge' : 'avatarMedium';

  return (
    <div
      className={`relative rounded-full overflow-hidden ${className}`}
      style={{ width: dimension, height: dimension }}
    >
      <OptimizedImage
        src={src}
        alt={name}
        preset={presetKey}
        fill
        className="object-cover"
      />
    </div>
  );
}

/**
 * Componente de galería con lazy loading
 */
interface GalleryImageProps {
  images: string[];
  className?: string;
}

export function LazyGallery({ images, className = '' }: GalleryImageProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [visibleImages, setVisibleImages] = useState<Set<number>>(new Set([0]));

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0', 10);
            setVisibleImages((prev) => new Set([...prev, index]));
          }
        });
      },
      { rootMargin: '100px' }
    );

    return () => observerRef.current?.disconnect();
  }, []);

  if (images.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Imagen principal */}
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
        <OptimizedImage
          src={images[selectedIndex]}
          alt={`Imagen ${selectedIndex + 1}`}
          fill
          preset="galleryMain"
          priority={selectedIndex === 0}
        />
      </div>

      {/* Miniaturas */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={index}
              data-index={index}
              onClick={() => setSelectedIndex(index)}
              className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden transition-all ${
                selectedIndex === index
                  ? 'ring-2 ring-primary ring-offset-2'
                  : 'opacity-70 hover:opacity-100'
              }`}
              ref={(el) => {
                if (el && observerRef.current) {
                  observerRef.current.observe(el);
                }
              }}
            >
              {visibleImages.has(index) ? (
                <OptimizedImage
                  src={image}
                  alt={`Miniatura ${index + 1}`}
                  fill
                  preset="galleryThumbnail"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 animate-pulse" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default OptimizedImage;
