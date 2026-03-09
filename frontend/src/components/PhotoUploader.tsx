'use client';

import { useState, useRef } from 'react';
import { getUploadUrl } from '@/lib/utils';
import { OptimizedImage } from '@/components/OptimizedImage';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalCount = photos.length + pendingFiles.length;
  const canAddMore = totalCount < maxPhotos;

  const handleFiles = (files: FileList | null) => {
    if (!files || disabled) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    const remainingSlots = maxPhotos - totalCount;

    const validFiles: File[] = [];

    for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
      const file = files[i];

      if (!allowedTypes.includes(file.type)) {
        alert(`${file.name}: Tipo no permitido. Use JPG, PNG o WebP`);
        continue;
      }

      if (file.size > maxSize) {
        alert(`${file.name}: Archivo muy grande. Máximo 10MB`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
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

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      {canAddMore && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-gray-300 hover:border-gray-400'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={handleInputChange}
            className="hidden"
            disabled={disabled}
          />
          <div className="mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-gray-400 mx-auto">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">
            Arrastra fotos aquí o haz clic para seleccionar
          </p>
          <p className="text-gray-400 text-sm mt-1">
            JPG, PNG o WebP. Máximo 10MB por foto. {totalCount}/{maxPhotos} fotos
          </p>
        </div>
      )}

      {/* Photo Grid */}
      {(photos.length > 0 || pendingFiles.length > 0) && (
        <div className="grid grid-cols-3 gap-3">
          {/* Existing Photos */}
          {photos.map((photo, index) => (
            <div
              key={`photo-${index}`}
              className="relative aspect-square rounded-lg overflow-hidden bg-gray-100"
            >
              <OptimizedImage
                src={getUploadUrl(photo) || '/images/placeholder.png'}
                alt={`Foto ${index + 1}`}
                fill
                preset="galleryThumbnail"
              />
              {index === 0 && (
                <div className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded">
                  Principal
                </div>
              )}
              {/* Botón eliminar siempre visible */}
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600 shadow-md"
                disabled={disabled}
              >
                ✕
              </button>
              {/* Botones de reordenar en la parte inferior */}
              {photos.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => movePhoto(index, 'left')}
                      className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center text-sm hover:bg-white shadow-md"
                      disabled={disabled}
                    >
                      ←
                    </button>
                  )}
                  {index < photos.length - 1 && (
                    <button
                      type="button"
                      onClick={() => movePhoto(index, 'right')}
                      className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center text-sm hover:bg-white shadow-md"
                      disabled={disabled}
                    >
                      →
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Pending Files (Preview) */}
          {pendingFiles.map((file, index) => (
            <div
              key={`pending-${index}`}
              className="relative aspect-square rounded-lg overflow-hidden bg-gray-100"
            >
              <img
                src={URL.createObjectURL(file)}
                alt={`Nueva foto ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                Pendiente
              </div>
              {/* Botón eliminar siempre visible */}
              <button
                type="button"
                onClick={() => removePendingFile(index)}
                className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600 shadow-md"
                disabled={disabled}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      {photos.length === 0 && pendingFiles.length === 0 && (
        <p className="text-center text-gray-400 text-sm">
          Las fotos ayudan a conseguir más reservas
        </p>
      )}
    </div>
  );
}
