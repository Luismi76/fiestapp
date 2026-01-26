'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { OptimizedImage } from '@/components/OptimizedImage';

interface ImageGalleryProps {
  images: string[];
  alt?: string;
  className?: string;
  aspectRatio?: string;
  showDots?: boolean;
  showCounter?: boolean;
}

export default function ImageGallery({
  images,
  alt = 'Image',
  className = '',
  aspectRatio = 'aspect-[4/3]',
  showDots = true,
  showCounter = true,
}: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrevious();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLightboxOpen) return;

      if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'Escape') {
        setIsLightboxOpen(false);
        setScale(1);
        setPosition({ x: 0, y: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, handlePrevious, handleNext]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    if (isLightboxOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isLightboxOpen]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const newScale = Math.max(prev - 0.5, 1);
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newScale;
    });
  };

  const handleDoubleClick = () => {
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2);
    }
  };

  const handleDrag = () => {
    if (scale === 1) return;
    // Simple drag implementation
    const handleMouseMove = (moveEvent: MouseEvent) => {
      setPosition((prev) => ({
        x: prev.x + moveEvent.movementX,
        y: prev.y + moveEvent.movementY,
      }));
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  if (images.length === 0) {
    return (
      <div className={`${aspectRatio} bg-gray-200 flex items-center justify-center ${className}`}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-gray-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
        </svg>
      </div>
    );
  }

  return (
    <>
      {/* Thumbnail Gallery */}
      <div
        ref={containerRef}
        className={`relative overflow-hidden ${aspectRatio} ${className}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Main Image */}
        <div
          className="absolute inset-0 cursor-pointer"
          onClick={() => setIsLightboxOpen(true)}
        >
          <OptimizedImage
            src={images[currentIndex]}
            alt={`${alt} ${currentIndex + 1}`}
            fill
            preset="galleryMain"
            priority
          />
        </div>

        {/* Navigation Arrows (desktop) */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrevious();
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </>
        )}

        {/* Dots Indicator */}
        {showDots && images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? 'bg-white w-4'
                    : 'bg-white/50 hover:bg-white/75'
                }`}
              />
            ))}
          </div>
        )}

        {/* Photo Count Badge */}
        {showCounter && (
          <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5Zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 0 0 .75-.75v-2.69l-2.22-2.219a.75.75 0 0 0-1.06 0l-1.91 1.909.47.47a.75.75 0 1 1-1.06 1.06L6.53 8.091a.75.75 0 0 0-1.06 0l-2.97 2.97ZM12 7a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" clipRule="evenodd" />
            </svg>
            {currentIndex + 1}/{images.length}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black">
          {/* Close Button */}
          <button
            onClick={() => {
              setIsLightboxOpen(false);
              setScale(1);
              setPosition({ x: 0, y: 0 });
            }}
            className="absolute top-4 right-4 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Zoom Controls */}
          <div className="absolute top-4 left-4 z-10 flex gap-2">
            <button
              onClick={handleZoomIn}
              disabled={scale >= 3}
              className="w-12 h-12 bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM10.5 7.5v6m3-3h-6" />
              </svg>
            </button>
            <button
              onClick={handleZoomOut}
              disabled={scale <= 1}
              className="w-12 h-12 bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM13.5 10.5h-6" />
              </svg>
            </button>
          </div>

          {/* Image Container */}
          <div
            className="absolute inset-0 flex items-center justify-center overflow-hidden"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <img
              src={images[currentIndex]}
              alt={`${alt} ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain select-none transition-transform duration-200"
              style={{
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                cursor: scale > 1 ? 'grab' : 'default',
              }}
              onDoubleClick={handleDoubleClick}
              onMouseDown={handleDrag}
              draggable={false}
            />
          </div>

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={handlePrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </>
          )}

          {/* Thumbnails Strip */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-black/50 rounded-xl">
              {images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-14 h-14 rounded-lg overflow-hidden transition-all relative ${
                    index === currentIndex
                      ? 'ring-2 ring-white'
                      : 'opacity-50 hover:opacity-75'
                  }`}
                >
                  <OptimizedImage
                    src={img}
                    alt={`Thumbnail ${index + 1}`}
                    fill
                    preset="galleryThumbnail"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-4 py-2 rounded-full">
            {currentIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
}
