'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { experiencesApi, uploadsApi } from '@/lib/api';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { Festival, ExperienceType, ExperienceCategory, CreateExperienceData, CATEGORY_LABELS, CATEGORY_ICONS } from '@/types/experience';
import PhotoUploader from '@/components/PhotoUploader';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';
import FestivalSelector from '@/components/FestivalSelector';
import CategorySelector from '@/components/CategorySelector';
import MainLayout from '@/components/MainLayout';

interface FormData {
  title: string;
  description: string;
  festivalId: string;
  city: string;
  price: string;
  type: ExperienceType;
}

// Interfaz para festividad nueva creada por el usuario
interface NewFestival {
  id: string;
  name: string;
  city: string;
  isNew: true;
}

const STEPS = [
  { id: 1, title: 'Básicos', icon: 'sparkles' },
  { id: 2, title: 'Detalles', icon: 'document' },
  { id: 3, title: 'Fotos', icon: 'camera' },
  { id: 4, title: 'Disponibilidad', icon: 'calendar' },
  { id: 5, title: 'Publicar', icon: 'rocket' },
];

const TYPE_OPTIONS = [
  {
    value: 'pago' as ExperienceType,
    label: 'Pago',
    description: 'Cobras por tu experiencia',
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    iconColor: 'text-amber-600',
  },
  {
    value: 'intercambio' as ExperienceType,
    label: 'Intercambio',
    description: 'A cambio de otra experiencia',
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
    iconColor: 'text-emerald-600',
  },
  {
    value: 'ambos' as ExperienceType,
    label: 'Flexible',
    description: 'Pago o intercambio',
    color: 'from-violet-500 to-purple-500',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    textColor: 'text-violet-700',
    iconColor: 'text-violet-600',
  },
];

// Step icons component
const StepIcon = ({ name, className }: { name: string; className?: string }) => {
  const icons: Record<string, React.ReactNode> = {
    sparkles: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5Z" clipRule="evenodd" />
      </svg>
    ),
    document: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625ZM7.5 15a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 15Zm.75 2.25a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H8.25Z" clipRule="evenodd" />
        <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
      </svg>
    ),
    camera: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 9a3.75 3.75 0 1 0 0 7.5A3.75 3.75 0 0 0 12 9Z" />
        <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 0 1 5.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 0 1-3 3H4.5a3 3 0 0 1-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 0 0 1.11-.71l.822-1.315a2.942 2.942 0 0 1 2.332-1.39ZM6.75 12.75a5.25 5.25 0 1 1 10.5 0 5.25 5.25 0 0 1-10.5 0Zm12-1.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
      </svg>
    ),
    calendar: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12.75 12.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM7.5 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM8.25 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM9.75 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM10.5 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM12.75 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM14.25 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM15 17.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM16.5 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM15 12.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM16.5 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" />
        <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 0 1 7.5 3v1.5h9V3A.75.75 0 0 1 18 3v1.5h.75a3 3 0 0 1 3 3v11.25a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3V7.5a3 3 0 0 1 3-3H6V3a.75.75 0 0 1 .75-.75Zm13.5 9a1.5 1.5 0 0 0-1.5-1.5H5.25a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5v-7.5Z" clipRule="evenodd" />
      </svg>
    ),
    rocket: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M9.315 7.584C12.195 3.883 16.695 1.5 21.75 1.5a.75.75 0 0 1 .75.75c0 5.056-2.383 9.555-6.084 12.436A6.75 6.75 0 0 1 9.75 22.5a.75.75 0 0 1-.75-.75v-4.131A15.838 15.838 0 0 1 6.382 15H2.25a.75.75 0 0 1-.75-.75 6.75 6.75 0 0 1 7.815-6.666ZM15 6.75a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Z" clipRule="evenodd" />
        <path d="M5.26 17.242a.75.75 0 1 0-.897-1.203 5.243 5.243 0 0 0-2.05 5.022.75.75 0 0 0 .625.627 5.243 5.243 0 0 0 5.022-2.051.75.75 0 1 0-1.202-.897 3.744 3.744 0 0 1-3.008 1.51c0-1.23.592-2.323 1.51-3.008Z" />
      </svg>
    ),
    check: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
      </svg>
    ),
  };
  return icons[name] || null;
};

// Type icons
const TypeIcon = ({ type, className }: { type: string; className?: string }) => {
  if (type === 'pago') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M10.464 8.746c.227-.18.497-.311.786-.394v2.795a2.252 2.252 0 0 1-.786-.393c-.394-.313-.546-.681-.546-1.004 0-.323.152-.691.546-1.004ZM12.75 15.662v-2.824c.347.085.664.228.921.421.427.32.579.686.579.991 0 .305-.152.671-.579.991a2.534 2.534 0 0 1-.921.42Z" />
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v.816a3.836 3.836 0 0 0-1.72.756c-.712.566-1.112 1.35-1.112 2.178 0 .829.4 1.612 1.113 2.178.502.4 1.102.647 1.719.756v2.978a2.536 2.536 0 0 1-.921-.421l-.879-.66a.75.75 0 0 0-.9 1.2l.879.66c.533.4 1.169.645 1.821.75V18a.75.75 0 0 0 1.5 0v-.81a4.124 4.124 0 0 0 1.821-.749c.745-.559 1.179-1.344 1.179-2.191 0-.847-.434-1.632-1.179-2.191a4.122 4.122 0 0 0-1.821-.75V8.354c.29.082.559.213.786.393l.415.33a.75.75 0 0 0 .933-1.175l-.415-.33a3.836 3.836 0 0 0-1.719-.755V6Z" clipRule="evenodd" />
      </svg>
    );
  }
  if (type === 'intercambio') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M15.97 2.47a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 1 1-1.06-1.06l3.22-3.22H7.5a.75.75 0 0 1 0-1.5h11.69l-3.22-3.22a.75.75 0 0 1 0-1.06Zm-7.94 9a.75.75 0 0 1 0 1.06l-3.22 3.22H16.5a.75.75 0 0 1 0 1.5H4.81l3.22 3.22a.75.75 0 1 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5Z" clipRule="evenodd" />
    </svg>
  );
};

export default function CreateExperiencePage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFestival, setSelectedFestival] = useState<Festival | NewFestival | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState('');
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [highlights, setHighlights] = useState<string[]>(['']);
  const [festivalError, setFestivalError] = useState('');
  const [capacity, setCapacity] = useState(1);
  const [noFestival, setNoFestival] = useState(false);
  const [category, setCategory] = useState<ExperienceCategory | ''>('');
  const [categoryError, setCategoryError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      type: 'pago',
    },
  });

  const watchedValues = watch();
  const selectedType = watchedValues.type as ExperienceType;

  // Auto-fill city when festival is selected
  useEffect(() => {
    if (selectedFestival && !watchedValues.city) {
      setValue('city', selectedFestival.city);
    }
  }, [selectedFestival, setValue, watchedValues.city]);

  // Handle festival selection from the custom selector
  const handleFestivalChange = (festivalId: string, festival?: Festival | NewFestival) => {
    setValue('festivalId', festivalId);
    setSelectedFestival(festival || null);
    setFestivalError('');
    // Auto-fill city
    if (festival) {
      setValue('city', festival.city);
    }
  };

  // Generate preview URLs for photos
  useEffect(() => {
    const urls = pendingPhotos.map(file => URL.createObjectURL(file));
    setPhotoPreviewUrls(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [pendingPhotos]);

  const validateStep = async (step: number): Promise<boolean> => {
    switch (step) {
      case 1:
        const titleCityValid = await trigger(['title', 'city', 'type']);
        // Si no es sin festividad, debe tener una festividad seleccionada
        if (!noFestival && !selectedFestival) {
          setFestivalError('Selecciona una festividad o marca "Sin festividad asociada"');
          return false;
        }
        // Categoría siempre es obligatoria
        if (!category) {
          setCategoryError('Selecciona una categoría');
          return false;
        }
        return titleCityValid;
      case 2:
        return await trigger(['description']);
      case 3:
        return true; // Photos are optional
      case 4:
        if (selectedType !== 'intercambio') {
          return await trigger(['price']);
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
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

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');

    try {
      const validHighlightsList = highlights.filter(h => h.trim() !== '');
      // Convertir fechas a formato YYYY-MM-DD para evitar problemas de zona horaria
      const availabilityDates = selectedDates.map(date => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      });
      const experienceData: CreateExperienceData = {
        title: data.title,
        description: data.description,
        festivalId: noFestival ? undefined : data.festivalId,
        category: category as ExperienceCategory,
        city: data.city,
        type: data.type,
        price: data.type !== 'intercambio' && data.price ? parseFloat(data.price) : undefined,
        highlights: validHighlightsList.length > 0 ? validHighlightsList : undefined,
        capacity: capacity,
        availability: availabilityDates.length > 0 ? availabilityDates : undefined,
      };

      setUploadProgress('Creando experiencia...');
      const experience = await experiencesApi.create(experienceData);

      if (pendingPhotos.length > 0) {
        setUploadProgress(`Subiendo ${pendingPhotos.length} foto(s)...`);
        try {
          await uploadsApi.uploadExperiencePhotos(experience.id, pendingPhotos);
        } catch (uploadErr) {
          console.error('Error uploading photos:', uploadErr);
          // Check if it's a 403 error
          if (axios.isAxiosError(uploadErr) && uploadErr.response?.status === 403) {
            setError('Error de permisos al subir fotos. Tu sesión puede haber expirado. La experiencia se creó correctamente, puedes añadir las fotos desde la página de edición.');
          } else {
            setError('Error al subir las fotos. La experiencia se creó correctamente, puedes añadir las fotos más tarde.');
          }
          // Still redirect to the experience page
          router.push(`/experiences/${experience.id}`);
          return;
        }
      }

      router.push(`/experiences/${experience.id}`);
    } catch (err) {
      console.error('Error creating experience:', err);
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
          router.push('/login');
          return;
        } else if (err.response?.status === 403) {
          setError('No tienes permisos para realizar esta acción.');
        } else if (err.response?.data?.message) {
          setError(err.response.data.message);
        } else {
          setError('No se pudo crear la experiencia. Inténtalo de nuevo.');
        }
      } else {
        setError('No se pudo crear la experiencia. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/dashboard');
  };

  const validHighlights = highlights.filter(h => h.trim() !== '');

  if (authLoading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="spinner spinner-lg mx-auto mb-4" />
            <div className="text-gray-500">Cargando...</div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between px-4 h-14">
            <button onClick={() => currentStep > 1 ? handleBack() : router.push('/dashboard')} className="w-10 h-10 flex items-center justify-center text-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <div className="text-center">
              <h1 className="font-semibold text-gray-900">Nueva experiencia</h1>
              <p className="text-xs text-gray-500">Paso {currentStep} de {STEPS.length}</p>
            </div>
            <button onClick={() => router.push('/dashboard')} className="w-10 h-10 flex items-center justify-center text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Steps */}
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                    disabled={step.id > currentStep}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      step.id === currentStep
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110'
                        : step.id < currentStep
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {step.id < currentStep ? (
                      <StepIcon name="check" className="w-5 h-5" />
                    ) : (
                      <StepIcon name={step.icon} className="w-5 h-5" />
                    )}
                  </button>
                  {index < STEPS.length - 1 && (
                    <div className={`w-8 h-1 mx-1 rounded-full transition-colors ${
                      step.id < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <form onSubmit={isAuthenticated ? handleSubmit(onSubmit) : handleDemoSubmit} className="pb-32 max-w-2xl mx-auto">
        {!isAuthenticated && (
          <div className="mx-4 mt-4 bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-xl text-sm flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
            <span>Modo demo - <Link href="/login" className="underline font-medium">Inicia sesión</Link> para guardar</span>
          </div>
        )}

        {error && (
          <div className="mx-4 mt-4 bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0">
              <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Step 1: Basics */}
        {currentStep === 1 && (
          <div className="p-4 space-y-6 animate-fadeIn">
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/30">
                <StepIcon name="sparkles" className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Empecemos con lo básico</h2>
              <p className="text-gray-500 mt-1">Cuéntanos sobre tu experiencia</p>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Título de tu experiencia
              </label>
              <input
                type="text"
                className={`w-full px-4 py-3.5 bg-white border-2 rounded-xl text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:border-blue-500 ${
                  errors.title ? 'border-red-300' : 'border-gray-200'
                }`}
                placeholder="Ej: Vive la Feria como un sevillano"
                {...register('title', {
                  required: 'El título es obligatorio',
                  minLength: { value: 5, message: 'Mínimo 5 caracteres' },
                })}
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1.5 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm2.78-4.22a.75.75 0 0 1-1.06 0L8 9.06l-1.72 1.72a.75.75 0 1 1-1.06-1.06L6.94 8 5.22 6.28a.75.75 0 0 1 1.06-1.06L8 6.94l1.72-1.72a.75.75 0 1 1 1.06 1.06L9.06 8l1.72 1.72a.75.75 0 0 1 0 1.06Z" clipRule="evenodd" />
                  </svg>
                  {errors.title.message}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1.5">Un buen título es breve y atractivo</p>
            </div>

            {/* Category */}
            <CategorySelector
              value={category}
              onChange={(cat) => {
                setCategory(cat);
                setCategoryError('');
              }}
              error={categoryError}
            />

            {/* Festival toggle */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={noFestival}
                  onChange={(e) => {
                    setNoFestival(e.target.checked);
                    if (e.target.checked) {
                      setValue('festivalId', '');
                      setSelectedFestival(null);
                      setFestivalError('');
                    }
                  }}
                  className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Sin festividad asociada</span>
                  <p className="text-xs text-gray-500">Experiencia disponible todo el año (ej: ruta de tapas)</p>
                </div>
              </label>

              {/* Festival Selector - only show if noFestival is false */}
              {!noFestival && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    ¿En qué festividad?
                  </label>
                  <FestivalSelector
                    value={watchedValues.festivalId || ''}
                    onChange={handleFestivalChange}
                    error={festivalError}
                  />
                </div>
              )}
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Ciudad
              </label>
              <input
                type="text"
                className={`w-full px-4 py-3.5 bg-white border-2 rounded-xl text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:border-blue-500 ${
                  errors.city ? 'border-red-300' : 'border-gray-200'
                }`}
                placeholder="¿Dónde se realiza?"
                {...register('city', {
                  required: 'La ciudad es obligatoria',
                })}
              />
              {errors.city && (
                <p className="text-red-500 text-sm mt-1.5 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm2.78-4.22a.75.75 0 0 1-1.06 0L8 9.06l-1.72 1.72a.75.75 0 1 1-1.06-1.06L6.94 8 5.22 6.28a.75.75 0 0 1 1.06-1.06L8 6.94l1.72-1.72a.75.75 0 1 1 1.06 1.06L9.06 8l1.72 1.72a.75.75 0 0 1 0 1.06Z" clipRule="evenodd" />
                  </svg>
                  {errors.city.message}
                </p>
              )}
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Modalidad
              </label>
              <div className="space-y-3">
                {TYPE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`block p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      selectedType === option.value
                        ? `${option.borderColor} ${option.bgColor} shadow-md`
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      value={option.value}
                      className="sr-only"
                      {...register('type')}
                    />
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${option.color} flex items-center justify-center shadow-lg`}>
                        <TypeIcon type={option.value} className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className={`font-semibold ${selectedType === option.value ? option.textColor : 'text-gray-900'}`}>
                          {option.label}
                        </div>
                        <div className="text-sm text-gray-500">{option.description}</div>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        selectedType === option.value
                          ? `${option.borderColor} ${option.bgColor}`
                          : 'border-gray-300'
                      }`}>
                        {selectedType === option.value && (
                          <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${option.color}`} />
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {currentStep === 2 && (
          <div className="p-4 space-y-6 animate-fadeIn">
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-500/30">
                <StepIcon name="document" className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Describe tu experiencia</h2>
              <p className="text-gray-500 mt-1">Ayuda a los viajeros a entender qué ofreces</p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Descripción
              </label>
              <textarea
                className={`w-full px-4 py-3.5 bg-white border-2 rounded-xl text-gray-900 placeholder-gray-400 resize-none transition-colors focus:outline-none focus:border-blue-500 min-h-[160px] ${
                  errors.description ? 'border-red-300' : 'border-gray-200'
                }`}
                placeholder="Describe tu experiencia de forma atractiva. ¿Qué la hace especial? ¿Qué vivirán los participantes?"
                {...register('description', {
                  required: 'La descripción es obligatoria',
                  minLength: { value: 20, message: 'Mínimo 20 caracteres' },
                })}
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1.5 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm2.78-4.22a.75.75 0 0 1-1.06 0L8 9.06l-1.72 1.72a.75.75 0 1 1-1.06-1.06L6.94 8 5.22 6.28a.75.75 0 0 1 1.06-1.06L8 6.94l1.72-1.72a.75.75 0 1 1 1.06 1.06L9.06 8l1.72 1.72a.75.75 0 0 1 0 1.06Z" clipRule="evenodd" />
                  </svg>
                  {errors.description.message}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1.5">Mínimo 20 caracteres</p>
            </div>

            {/* Highlights */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
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
                      className="flex-1 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
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
          </div>
        )}

        {/* Step 3: Photos */}
        {currentStep === 3 && (
          <div className="p-4 space-y-6 animate-fadeIn">
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-pink-500/30">
                <StepIcon name="camera" className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Añade fotos increíbles</h2>
              <p className="text-gray-500 mt-1">Las experiencias con fotos reciben 3x más solicitudes</p>
            </div>

            {/* Photo Grid Preview */}
            {photoPreviewUrls.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {photoPreviewUrls.map((url, index) => (
                  <div key={index} className={`relative rounded-xl overflow-hidden ${index === 0 ? 'col-span-2 row-span-2' : ''}`}>
                    <img
                      src={url}
                      alt={`Foto ${index + 1}`}
                      className={`w-full object-cover ${index === 0 ? 'h-48' : 'h-24'}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newPhotos = pendingPhotos.filter((_, i) => i !== index);
                        setPendingPhotos(newPhotos);
                      }}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    {index === 0 && (
                      <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-lg text-white text-xs font-medium">
                        Principal
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 text-center border-2 border-dashed border-gray-200">
                <div className="w-16 h-16 bg-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                  </svg>
                </div>
                <p className="text-gray-600 font-medium">Aún no has añadido fotos</p>
                <p className="text-gray-400 text-sm mt-1">Las fotos son clave para atraer viajeros</p>
              </div>
            )}

            {/* Photo Uploader */}
            <PhotoUploader
              photos={[]}
              onPhotosChange={() => {}}
              pendingFiles={pendingPhotos}
              onPendingFilesChange={setPendingPhotos}
              maxPhotos={10}
              disabled={loading}
            />

            {/* Tips */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
                </svg>
                Consejos para fotos
              </h4>
              <ul className="text-sm text-blue-700 space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span>La primera foto será la portada de tu experiencia</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span>Usa fotos con buena iluminación y alta calidad</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span>Muestra momentos reales de la experiencia</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 4: Availability & Price */}
        {currentStep === 4 && (
          <div className="p-4 space-y-6 animate-fadeIn">
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-green-500/30">
                <StepIcon name="calendar" className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Disponibilidad y precio</h2>
              <p className="text-gray-500 mt-1">¿Cuándo y a qué precio ofreces tu experiencia?</p>
            </div>

            {/* Price (if applicable) */}
            {selectedType !== 'intercambio' && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Precio por persona
                </label>
                <div className="relative">
                  <input
                    type="number"
                    className={`w-full px-4 py-3.5 pr-12 bg-white border-2 rounded-xl text-gray-900 placeholder-gray-400 text-2xl font-bold transition-colors focus:outline-none focus:border-blue-500 ${
                      errors.price ? 'border-red-300' : 'border-gray-200'
                    }`}
                    placeholder="0"
                    min="0"
                    step="1"
                    {...register('price', {
                      validate: (value) => {
                        if (!value && watchedValues.type !== 'intercambio') {
                          return 'El precio es obligatorio';
                        }
                        return true;
                      },
                    })}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">
                    €
                  </div>
                </div>
                {errors.price && (
                  <p className="text-red-500 text-sm mt-1.5 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm2.78-4.22a.75.75 0 0 1-1.06 0L8 9.06l-1.72 1.72a.75.75 0 1 1-1.06-1.06L6.94 8 5.22 6.28a.75.75 0 0 1 1.06-1.06L8 6.94l1.72-1.72a.75.75 0 1 1 1.06 1.06L9.06 8l1.72 1.72a.75.75 0 0 1 0 1.06Z" clipRule="evenodd" />
                    </svg>
                    {errors.price.message}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1.5">Precio que pagarán los participantes</p>
              </div>
            )}

            {/* Capacity */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
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
              <p className="text-xs text-gray-400 mt-3 text-center">
                Las fechas se marcarán como completas cuando alcances esta capacidad
              </p>
            </div>

            {/* Calendar */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Fechas disponibles <span className="font-normal text-gray-400">(opcional)</span>
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

              <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
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
          </div>
        )}

        {/* Step 5: Preview */}
        {currentStep === 5 && (
          <div className="p-4 space-y-6 animate-fadeIn">
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-violet-500/30">
                <StepIcon name="rocket" className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">¡Todo listo!</h2>
              <p className="text-gray-500 mt-1">Revisa tu experiencia antes de publicar</p>
            </div>

            {/* Preview Card */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100">
              {/* Preview Image */}
              <div className="relative h-48 bg-gradient-to-br from-gray-200 to-gray-300">
                {photoPreviewUrls[0] ? (
                  <img src={photoPreviewUrls[0]} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 text-gray-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  {selectedType === 'intercambio' ? (
                    <span className="px-3 py-1.5 bg-emerald-500 text-white text-sm font-bold rounded-full shadow-lg">
                      Intercambio
                    </span>
                  ) : (
                    <span className="px-3 py-1.5 bg-white text-gray-900 text-sm font-bold rounded-full shadow-lg">
                      {watchedValues.price || '0'}€
                    </span>
                  )}
                </div>
              </div>

              {/* Preview Content */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-blue-600 font-semibold flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="m7.539 14.841.003.003.002.002a.755.755 0 0 0 .912 0l.002-.002.003-.003.012-.009a5.57 5.57 0 0 0 .19-.153 15.588 15.588 0 0 0 2.046-2.082c1.101-1.362 2.291-3.342 2.291-5.597A5 5 0 0 0 3 7c0 2.255 1.19 4.235 2.292 5.597a15.591 15.591 0 0 0 2.046 2.082 8.916 8.916 0 0 0 .189.153l.012.01ZM8 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" clipRule="evenodd" />
                    </svg>
                    {selectedFestival?.name || 'Festividad'}
                  </span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-500">{watchedValues.city || 'Ciudad'}</span>
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-2">
                  {watchedValues.title || 'Título de tu experiencia'}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {watchedValues.description || 'Descripción de tu experiencia...'}
                </p>

                {validHighlights.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">Incluye:</p>
                    <div className="flex flex-wrap gap-2">
                      {validHighlights.slice(0, 3).map((h, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          {h}
                        </span>
                      ))}
                      {validHighlights.length > 3 && (
                        <span className="text-xs text-gray-400">+{validHighlights.length - 3} más</span>
                      )}
                    </div>
                  </div>
                )}

                {selectedDates.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">Disponible:</p>
                    <p className="text-sm text-gray-700">{selectedDates.length} fecha(s) seleccionada(s)</p>
                  </div>
                )}

                {pendingPhotos.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">{pendingPhotos.length} foto(s) lista(s) para subir</p>
                  </div>
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <h4 className="font-semibold text-gray-900">Resumen</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Festividad</p>
                  <p className="font-medium text-gray-900">{selectedFestival?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Ciudad</p>
                  <p className="font-medium text-gray-900">{watchedValues.city || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Modalidad</p>
                  <p className="font-medium text-gray-900">
                    {TYPE_OPTIONS.find(t => t.value === selectedType)?.label || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Precio</p>
                  <p className="font-medium text-gray-900">
                    {selectedType === 'intercambio' ? 'Intercambio' : `${watchedValues.price || '0'}€`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4 pb-safe md:static md:border-t-0 md:py-6">
        <div className="flex gap-3 max-w-2xl mx-auto">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="px-6 py-3.5 border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:border-gray-300 transition-colors"
            >
              Atrás
            </button>
          )}
          {currentStep < STEPS.length ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all"
            >
              Continuar
            </button>
          ) : (
            <button
              type="submit"
              onClick={isAuthenticated ? handleSubmit(onSubmit) : handleDemoSubmit}
              disabled={loading}
              className="flex-1 py-3.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold shadow-lg shadow-green-500/30 hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="spinner spinner-sm border-white/30 border-t-white" />
                  {uploadProgress || 'Publicando...'}
                </>
              ) : (
                <>
                  <StepIcon name="rocket" className="w-5 h-5" />
                  Publicar experiencia
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .pb-safe {
          padding-bottom: max(1rem, env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
    </MainLayout>
  );
}
