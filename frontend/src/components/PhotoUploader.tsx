'use client';

import { useState, useRef, useMemo } from 'react';
import { getUploadUrl } from '@/lib/utils';
import { OptimizedImage } from '@/components/OptimizedImage';
import Image from 'next/image';

interface PhotoUploaderProps {
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  pendingFiles: File[];
  onPendingFilesChange: (files: File[]) => void;
  maxPhotos?: number;
  disabled?: boolean;
}

export default function PhotoUploader({
  photos,
  onPhotosChange,
  pendingFiles,
  onPendingFilesChange,
  maxPhotos = 10,
  disabled = false,
}: PhotoUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [recentlyAdded, setRecentlyAdded] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalCount = photos.length + pendingFiles.length;
  const canAddMore = totalCount < maxPhotos;

  // Preview URLs for pending files - derived state, no effect needed
  const previewUrls = useMemo(
    () => pendingFiles.map(file => URL.createObjectURL(file)),
    [pendingFiles],
  );

  const handleFiles = (files: FileList | null) => {
    if (!files || disabled) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const remainingSlots = maxPhotos - totalCount;

    const validFiles: File[] = [];
    const errors: string[] = [];

    for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
      const file = files[i];

      if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: Tipo no permitido. Use JPG, PNG o WebP`);
        continue;
      }

      if (file.size > maxSize) {
        errors.push(`${file.name}: Archivo muy grande. Máximo 10MB`);
        continue;
      }

      validFiles.push(file);
    }

    if (errors.length > 0) {
      alert(errors.join('\n'));
    }

    if (validFiles.length > 0) {
      // Mark new items for animation
      const startIndex = photos.length + pendingFiles.length;
      const newIndices = validFiles.map((_, i) => startIndex + i);
      setRecentlyAdded(newIndices);
      setTimeout(() => setRecentlyAdded([]), 1500);

      onPendingFilesChange([...pendingFiles, ...validFiles]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    onPhotosChange(newPhotos);
  };

  const removePendingFile = (index: number) => {
    const newFiles = [...pendingFiles];
    newFiles.splice(index, 1);
    onPendingFilesChange(newFiles);
  };

  const movePhoto = (index: number, direction: 'left' | 'right') => {
    const newIndex = direction === 'left' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= photos.length) return;

    const newPhotos = [...photos];
    [newPhotos[index], newPhotos[newIndex]] = [newPhotos[newIndex], newPhotos[index]];
    onPhotosChange(newPhotos);
  };

  const hasAnyPhotos = photos.length > 0 || pendingFiles.length > 0;

  return (
    <div className="space-y-3">
      {/* Photo Grid - combined existing + pending */}
      {hasAnyPhotos && (
        <div className="grid grid-cols-3 gap-2">
          {/* Existing Photos */}
          {photos.map((photo, index) => {
            const globalIndex = index;
            return (
              <div
                key={`photo-${index}`}
                className={`relative rounded-xl overflow-hidden bg-gray-100 ${
                  index === 0 && totalCount > 1 ? 'col-span-2 row-span-2' : ''
                } ${recentlyAdded.includes(globalIndex) ? 'animate-photo-added' : ''}`}
                style={{ aspectRatio: index === 0 && totalCount > 1 ? 'auto' : '1' }}
              >
                <OptimizedImage
                  src={getUploadUrl(photo) || '/images/placeholder.png'}
                  alt={`Foto ${index + 1}`}
                  fill
                  preset="galleryThumbnail"
                />
                {index === 0 && (
                  <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-lg text-white text-xs font-medium">
                    Principal
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  disabled={disabled}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                {photos.length > 1 && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => movePhoto(index, 'left')}
                        className="w-7 h-7 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                        disabled={disabled}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                      </button>
                    )}
                    {index < photos.length - 1 && (
                      <button
                        type="button"
                        onClick={() => movePhoto(index, 'right')}
                        className="w-7 h-7 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                        disabled={disabled}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Pending Files (Preview) */}
          {pendingFiles.map((file, index) => {
            const globalIndex = photos.length + index;
            const isFirst = photos.length === 0 && index === 0;
            return (
              <div
                key={`pending-${index}`}
                className={`relative rounded-xl overflow-hidden bg-gray-100 ${
                  isFirst && totalCount > 1 ? 'col-span-2 row-span-2' : ''
                } ${recentlyAdded.includes(globalIndex) ? 'animate-photo-added' : ''}`}
                style={{ aspectRatio: isFirst && totalCount > 1 ? 'auto' : '1' }}
              >
                {previewUrls[index] && (
                  <Image
                    src={previewUrls[index]}
                    alt={`Nueva foto ${index + 1}`}
                    className="w-full h-full object-cover"
                    fill unoptimized
                  />
                )}
                {/* Success indicator */}
                <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-green-500/90 backdrop-blur-sm rounded-lg text-white text-xs font-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                  {isFirst ? 'Principal' : 'Lista'}
                </div>
                <button
                  type="button"
                  onClick={() => removePendingFile(index)}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                  disabled={disabled}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}

          {/* Add More Button - inline in the grid */}
          {canAddMore && (
            <button
              type="button"
              onClick={() => !disabled && fileInputRef.current?.click()}
              className={`rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 transition-colors hover:border-primary hover:bg-primary/5 ${
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
              style={{ aspectRatio: '1' }}
              disabled={disabled}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="text-xs text-gray-400">{totalCount}/{maxPhotos}</span>
            </button>
          )}
        </div>
      )}

      {/* Upload Zone - only when no photos yet */}
      {!hasAnyPhotos && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-primary bg-primary/5 scale-[1.02]'
              : 'border-gray-300 hover:border-primary/50 hover:bg-gray-50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-primary">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
            </svg>
          </div>
          <p className="text-gray-700 font-medium text-sm">
            Toca para añadir fotos
          </p>
          <p className="text-gray-400 text-xs mt-1 hidden sm:block">
            o arrastra y suelta aquí
          </p>
          <p className="text-gray-400 text-xs mt-1">
            JPG, PNG o WebP · Máx. 10MB
          </p>
        </div>
      )}

      {/* Hidden file input - always present */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Success message after adding photos */}
      {hasAnyPhotos && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-600 flex-shrink-0">
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-green-700">
            {totalCount} {totalCount === 1 ? 'foto añadida' : 'fotos añadidas'} correctamente
          </p>
        </div>
      )}

    </div>
  );
}
