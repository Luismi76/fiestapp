'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { experiencesApi, festivalsApi, uploadsApi } from '@/lib/api';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { Festival, ExperienceType, ExperienceCategory, ExperienceDetail, CATEGORY_LABELS, CATEGORY_ICONS } from '@/types/experience';
import PhotoUploader from '@/components/PhotoUploader';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';
import CategorySelector from '@/components/CategorySelector';
import MainLayout from '@/components/MainLayout';
import logger from '@/lib/logger';

interface FormData {
  title: string;
  description: string;
  festivalId: string;
  city: string;
  price: string;
  type: ExperienceType;
}

const TypeIcon = ({ type, className = "w-6 h-6" }: { type: string; className?: string }) => {
  const icons: Record<string, React.ReactNode> = {
    pago: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    intercambio: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
    ambos: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
      </svg>
    ),
  };
  return icons[type] || null;
};

export default function EditExperiencePage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [experience, setExperience] = useState<ExperienceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [highlights, setHighlights] = useState<string[]>(['']);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [capacity, setCapacity] = useState(1);
  const [category, setCategory] = useState<ExperienceCategory | ''>('');
  const [noFestival, setNoFestival] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>();

  const selectedType = watch('type');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [experienceData, festivalsData] = await Promise.all([
          experiencesApi.getById(params.id as string),
          festivalsApi.getAll(),
        ]);

        if (experienceData.hostId !== user?.id) {
          router.push(`/experiences/${params.id}`);
          return;
        }

        setExperience(experienceData);
        setFestivals(festivalsData);
        setPhotos(experienceData.photos || []);
        setHighlights(experienceData.highlights?.length ? experienceData.highlights : ['']);
        setCapacity(experienceData.capacity || 1);
        setCategory(experienceData.category || '');
        setNoFestival(!experienceData.festivalId);

        // Convert availability dates to Date objects
        if (experienceData.availability && experienceData.availability.length > 0) {
          const dates = experienceData.availability.map(dateStr => {
            const date = new Date(dateStr);
            // Adjust for timezone to get the correct local date
            return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
          });
          setSelectedDates(dates);
        }

        reset({
          title: experienceData.title,
          description: experienceData.description,
          festivalId: experienceData.festivalId,
          city: experienceData.city,
          price: experienceData.price?.toString() || '',
          type: experienceData.type,
        });
      } catch {
        setError('No se pudo cargar la experiencia');
      } finally {
        setLoading(false);
      }
    };

    if (params.id && user) {
      fetchData();
    }
  }, [params.id, user, reset, router]);

  const handlePhotosChange = async (newPhotos: string[]) => {
    // Check if photos were removed
    const removedPhotos = photos.filter((p) => !newPhotos.includes(p));

    for (const photoUrl of removedPhotos) {
      try {
        await uploadsApi.deleteExperiencePhoto(params.id as string, photoUrl);
      } catch (err) {
        logger.error('Error deleting photo:', err);
      }
    }

    // Check if photos were reordered
    if (removedPhotos.length === 0 && newPhotos.length === photos.length) {
      try {
        await uploadsApi.reorderExperiencePhotos(params.id as string, newPhotos);
      } catch (err) {
        logger.error('Error reordering photos:', err);
      }
    }

    setPhotos(newPhotos);
  };

  const addHighlight = () => {
    if (highlights.length < 8) {
      setHighlights([...highlights, '']);
    }
  };

  const updateHighlight = (index: number, value: string) => {
    const newHighlights = [...highlights];
    newHighlights[index] = value;
    setHighlights(newHighlights);
  };

  const removeHighlight = (index: number) => {
    if (highlights.length > 1) {
      setHighlights(highlights.filter((_, i) => i !== index));
    }
  };

  const handleUploadPendingPhotos = async () => {
    if (pendingPhotos.length === 0) return;

    setUploadingPhotos(true);
    try {
      const result = await uploadsApi.uploadExperiencePhotos(
        params.id as string,
        pendingPhotos
      );
      setPhotos([...photos, ...result.photos]);
      setPendingPhotos([]);
    } catch (err) {
      logger.error('Error uploading photos:', err);
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
          router.push('/login');
          return;
        } else if (err.response?.status === 403) {
          setError('No tienes permisos para subir fotos a esta experiencia. Verifica que hayas iniciado sesión con la cuenta correcta.');
        } else if (err.response?.data?.message) {
          setError(err.response.data.message);
        } else {
          setError('Error al subir las fotos. Inténtalo de nuevo.');
        }
      } else {
        setError('Error al subir las fotos. Inténtalo de nuevo.');
      }
    } finally {
      setUploadingPhotos(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    setError('');

    try {
      // First upload any pending photos
      if (pendingPhotos.length > 0) {
        await handleUploadPendingPhotos();
      }

      const validHighlightsList = highlights.filter(h => h.trim() !== '');
      // Convert dates to YYYY-MM-DD format
      const availabilityDates = selectedDates.map(date => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      });

      await experiencesApi.update(params.id as string, {
        title: data.title,
        description: data.description,
        festivalId: noFestival ? undefined : data.festivalId,
        category: category as ExperienceCategory,
        city: data.city,
        type: data.type,
        price: data.type !== 'intercambio' && data.price ? parseFloat(data.price) : undefined,
        highlights: validHighlightsList.length > 0 ? validHighlightsList : [],
        capacity: capacity,
        availability: availabilityDates.length > 0 ? availabilityDates : [],
      });

      router.push(`/experiences/${params.id}`);
    } catch (err) {
      logger.error('Error saving experience:', err);
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
          router.push('/login');
          return;
        } else if (err.response?.status === 403) {
          setError('No tienes permisos para editar esta experiencia.');
        } else if (err.response?.data?.message) {
          setError(err.response.data.message);
        } else {
          setError('No se pudo guardar los cambios. Inténtalo de nuevo.');
        }
      } else {
        setError('No se pudo guardar los cambios. Inténtalo de nuevo.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublished = async () => {
    if (!experience) return;

    try {
      const updated = await experiencesApi.togglePublished(params.id as string);
      setExperience({ ...experience, published: updated.published });
    } catch (err) {
      logger.error('Error toggling published:', err);
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
          router.push('/login');
          return;
        } else if (err.response?.status === 403) {
          setError('No tienes permisos para cambiar el estado de esta experiencia.');
        } else {
          setError('No se pudo cambiar el estado de publicación.');
        }
      } else {
        setError('No se pudo cambiar el estado de publicación.');
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta experiencia? Esta acción no se puede deshacer.')) {
      return;
    }

    setDeleting(true);
    try {
      await experiencesApi.delete(params.id as string);
      router.push('/dashboard');
    } catch (err) {
      logger.error('Error deleting experience:', err);
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
          router.push('/login');
          return;
        } else if (err.response?.status === 403) {
          setError('No tienes permisos para eliminar esta experiencia.');
        } else {
          setError('No se pudo eliminar la experiencia.');
        }
      } else {
        setError('No se pudo eliminar la experiencia.');
      }
      setDeleting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
              </svg>
            </div>
            <div className="text-gray-500">Cargando...</div>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!experience) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white border-b border-gray-100">
            <div className="flex items-center justify-between px-4 h-14">
              <Link href="/dashboard" className="w-10 h-10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </Link>
              <span className="font-semibold text-gray-900">Error</span>
              <div className="w-10" />
            </div>
          </header>
          <div className="flex flex-col items-center justify-center px-6 py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0 0 12.016 15a4.486 4.486 0 0 0-3.198 1.318M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
              </svg>
            </div>
            <h2 className="font-bold text-xl text-gray-900 mb-2">Experiencia no encontrada</h2>
            <Link href="/dashboard" className="mt-4 px-6 py-3 bg-blue-600 text-white font-semibold rounded-full hover:bg-blue-700 transition-colors">
              Volver al dashboard
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
          <Link href={`/experiences/${params.id}`} className="w-10 h-10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <span className="font-semibold text-gray-900">Editar experiencia</span>
          <div className="w-10" />
        </div>
      </header>

      {/* Publication Status */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Estado:</span>
            {experience.published ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                </svg>
                Publicada
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                </svg>
                Borrador
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleTogglePublished}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            {experience.published ? 'Despublicar' : 'Publicar'}
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-6 max-w-2xl mx-auto">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Fotos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fotos de la experiencia
          </label>
          <PhotoUploader
            photos={photos}
            onPhotosChange={handlePhotosChange}
            pendingFiles={pendingPhotos}
            onPendingFilesChange={setPendingPhotos}
            maxPhotos={10}
            disabled={saving || uploadingPhotos}
          />
          {pendingPhotos.length > 0 && (
            <button
              type="button"
              onClick={handleUploadPendingPhotos}
              disabled={uploadingPhotos}
              className="w-full mt-3 py-3 px-4 border border-blue-200 text-blue-600 font-medium rounded-xl hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              {uploadingPhotos
                ? 'Subiendo...'
                : `Subir ${pendingPhotos.length} foto(s) pendiente(s)`}
            </button>
          )}
        </div>

        {/* Título */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Título de la experiencia
          </label>
          <input
            type="text"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            placeholder="Ej: Clases de sevillanas en la Feria"
            {...register('title', {
              required: 'El título es obligatorio',
              minLength: { value: 5, message: 'Mínimo 5 caracteres' },
            })}
          />
          {errors.title && (
            <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
          )}
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descripción
          </label>
          <textarea
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors min-h-[120px] resize-none"
            placeholder="Describe tu experiencia..."
            {...register('description', {
              required: 'La descripción es obligatoria',
              minLength: { value: 20, message: 'Mínimo 20 caracteres' },
            })}
          />
          {errors.description && (
            <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
          )}
        </div>

        {/* Highlights */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ¿Qué incluye? <span className="font-normal text-gray-400">(opcional)</span>
          </label>
          <p className="text-sm text-gray-500 mb-3">Añade los puntos destacados de tu experiencia</p>

          <div className="space-y-2">
            {highlights.map((highlight, index) => (
              <div key={index} className="flex gap-2">
                <div className="w-8 h-12 flex items-center justify-center text-green-500">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={highlight}
                  onChange={(e) => updateHighlight(index, e.target.value)}
                  className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                  placeholder="Ej: Traje de flamenca incluido"
                />
                {highlights.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeHighlight(index)}
                    className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          {highlights.length < 8 && (
            <button
              type="button"
              onClick={addHighlight}
              className="mt-3 w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Añadir otro
            </button>
          )}
        </div>

        {/* Categoría */}
        <CategorySelector
          value={category}
          onChange={(cat) => setCategory(cat)}
        />

        {/* Festividad */}
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={noFestival}
              onChange={(e) => {
                setNoFestival(e.target.checked);
                if (e.target.checked) {
                  setValue('festivalId', '');
                }
              }}
              className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">Sin festividad asociada</span>
              <p className="text-xs text-gray-500">Experiencia disponible todo el año</p>
            </div>
          </label>

          {!noFestival && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Festividad
              </label>
              <select
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors bg-white"
                {...register('festivalId')}
              >
                <option value="">Selecciona una festividad</option>
                {festivals.map((festival) => (
                  <option key={festival.id} value={festival.id}>
                    {festival.name} - {festival.city}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Ciudad */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ciudad
          </label>
          <input
            type="text"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            placeholder="¿Dónde se realiza la experiencia?"
            {...register('city', {
              required: 'La ciudad es obligatoria',
            })}
          />
          {errors.city && (
            <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
          )}
        </div>

        {/* Tipo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Tipo de experiencia
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label
              className={`relative p-4 text-center cursor-pointer rounded-xl border-2 transition-all ${
                selectedType === 'pago'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                value="pago"
                className="sr-only"
                {...register('type')}
              />
              <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2 ${
                selectedType === 'pago' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                <TypeIcon type="pago" className="w-5 h-5" />
              </div>
              <span className={`text-sm font-medium ${selectedType === 'pago' ? 'text-blue-700' : 'text-gray-700'}`}>
                Pago
              </span>
            </label>
            <label
              className={`relative p-4 text-center cursor-pointer rounded-xl border-2 transition-all ${
                selectedType === 'intercambio'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                value="intercambio"
                className="sr-only"
                {...register('type')}
              />
              <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2 ${
                selectedType === 'intercambio' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                <TypeIcon type="intercambio" className="w-5 h-5" />
              </div>
              <span className={`text-sm font-medium ${selectedType === 'intercambio' ? 'text-blue-700' : 'text-gray-700'}`}>
                Intercambio
              </span>
            </label>
            <label
              className={`relative p-4 text-center cursor-pointer rounded-xl border-2 transition-all ${
                selectedType === 'ambos'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                value="ambos"
                className="sr-only"
                {...register('type')}
              />
              <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2 ${
                selectedType === 'ambos' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                <TypeIcon type="ambos" className="w-5 h-5" />
              </div>
              <span className={`text-sm font-medium ${selectedType === 'ambos' ? 'text-blue-700' : 'text-gray-700'}`}>
                Ambos
              </span>
            </label>
          </div>
        </div>

        {/* Precio */}
        {selectedType !== 'intercambio' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Precio por persona (€)
            </label>
            <input
              type="number"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              placeholder="0"
              min="0"
              step="0.01"
              {...register('price')}
            />
          </div>
        )}

        {/* Capacidad */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Capacidad máxima
          </label>
          <p className="text-sm text-gray-500 mb-3">
            ¿Cuántas personas puedes atender por día?
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setCapacity(Math.max(1, capacity - 1))}
              className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-600 transition-colors"
            >
              −
            </button>
            <div className="flex-1 text-center">
              <span className="text-4xl font-bold text-gray-900">{capacity}</span>
              <p className="text-sm text-gray-500">{capacity === 1 ? 'persona' : 'personas'}</p>
            </div>
            <button
              type="button"
              onClick={() => setCapacity(capacity + 1)}
              className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-600 transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Disponibilidad */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fechas disponibles
          </label>
          <p className="text-sm text-gray-500 mb-3">
            Selecciona los días en que ofreces esta experiencia
          </p>

          {selectedDates.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {selectedDates.map((date, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium border border-green-200"
                >
                  {date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  <button
                    type="button"
                    onClick={() => setSelectedDates(selectedDates.filter((_, idx) => idx !== i))}
                    className="hover:text-green-900"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <AvailabilityCalendar
              selectedDates={selectedDates}
              onDatesChange={setSelectedDates}
              mode="select"
            />
          </div>

          {selectedDates.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedDates([])}
              className="mt-3 text-sm text-red-500 hover:text-red-600 font-medium"
            >
              Limpiar todas las fechas
            </button>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={saving}
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Guardando...
            </span>
          ) : (
            'Guardar cambios'
          )}
        </button>

        {/* Delete */}
        <div className="pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleDelete}
            className="w-full py-4 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            disabled={deleting}
          >
            {deleting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Eliminando...
              </span>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
                Eliminar experiencia
              </>
            )}
          </button>
        </div>
      </form>
    </div>
    </MainLayout>
  );
}
