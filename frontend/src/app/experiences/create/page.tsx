'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { experiencesApi, uploadsApi, cancellationsApi } from '@/lib/api';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { ExperienceType, CreateExperienceData, CancellationPolicy } from '@/types/experience';
import PhotoUploader from '@/components/PhotoUploader';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';
import CategorySelector from '@/components/CategorySelector';
import CitySelector, { CityLocation } from '@/components/CitySelector';
import MainLayout from '@/components/MainLayout';
import logger from '@/lib/logger';
import Image from 'next/image';

interface FormData {
  title: string;
  description: string;
  price: string;
  type: ExperienceType;
}

const DRAFT_KEY = 'fiestapp_experience_draft';

interface DraftData {
  formValues: Partial<FormData>;
  city: string;
  highlights: string[];
  selectedDates: string[]; // ISO strings
  capacity: number;
  categoryId: string;
  currentStep: number;
  savedAt: number;
}

const STEPS = [
  { id: 1, title: 'Qué ofreces', icon: 'sparkles' },
  { id: 2, title: 'Fotos y disponibilidad', icon: 'camera' },
  { id: 3, title: 'Revisar y publicar', icon: 'rocket' },
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState('');
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [highlights, setHighlights] = useState<string[]>(['']);
  const [capacity, setCapacity] = useState(1);
  const [categoryId, setCategoryId] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [city, setCity] = useState('');
  const [cityCoords, setCityCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [cityError, setCityError] = useState('');
  const [hasDraft, setHasDraft] = useState(false);
  const [idealFor, setIdealFor] = useState<string[]>([]);
  const [cancellationPolicy, setCancellationPolicy] = useState<CancellationPolicy>('FLEXIBLE');
  const [policyRestrictions, setPolicyRestrictions] = useState<Record<string, { allowed: boolean; reason?: string }>>({});
  const draftLoaded = useRef(false);

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

  // --- Cargar restricciones de políticas de cancelación ---
  useEffect(() => {
    cancellationsApi.getAvailablePolicies()
      .then(({ data }) => setPolicyRestrictions(data.restrictions))
      .catch(() => {}); // Si falla, todas las opciones quedan habilitadas
  }, []);

  // --- Borrador: cargar al montar ---
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft: DraftData = JSON.parse(raw);

      // Restaurar campos del formulario
      if (draft.formValues) {
        Object.entries(draft.formValues).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            setValue(key as keyof FormData, value as string);
          }
        });
      }

      // Restaurar estados adicionales
      if (draft.city) setCity(draft.city);
      if (draft.highlights && draft.highlights.length > 0) setHighlights(draft.highlights);
      if (draft.selectedDates && draft.selectedDates.length > 0) {
        setSelectedDates(draft.selectedDates.map(d => new Date(d)));
      }
      if (draft.capacity) setCapacity(draft.capacity);
      if (draft.categoryId) setCategoryId(draft.categoryId);
      if (draft.currentStep && draft.currentStep >= 1) {
        // Mapear pasos antiguos (de wizard de 5 pasos) al nuevo de 3
        setCurrentStep(Math.min(draft.currentStep, STEPS.length));
      }

      // Solo marcar como borrador si tiene contenido real
      const hasContent = !!(draft.formValues?.title || draft.formValues?.description || draft.city || (draft.highlights && draft.highlights.length > 0));
      setHasDraft(hasContent);
    } catch {
      // Si el borrador está corrupto, lo eliminamos
      localStorage.removeItem(DRAFT_KEY);
    } finally {
      draftLoaded.current = true;
    }
    // Solo ejecutar al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Borrador: guardar con debounce ---
  useEffect(() => {
    if (!draftLoaded.current) return;

    const timeout = setTimeout(() => {
      const draft: DraftData = {
        formValues: {
          title: watchedValues.title,
          description: watchedValues.description,
          price: watchedValues.price,
          type: watchedValues.type,
        },
        city,
        highlights,
        selectedDates: selectedDates.map(d => d.toISOString()),
        capacity,
        categoryId,
        currentStep,
        savedAt: Date.now(),
      };
      const hasContent = !!(draft.formValues?.title || draft.formValues?.description || draft.city || (draft.highlights && draft.highlights.length > 0));
      if (hasContent) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        setHasDraft(true);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [
    watchedValues.title, watchedValues.description,
    watchedValues.price, watchedValues.type,
    city, highlights, selectedDates, capacity,
    categoryId, currentStep,
  ]);

  // --- Borrador: descartar ---
  const discardDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);

    // Resetear formulario
    setValue('title', '');
    setValue('description', '');
    setValue('price', '');
    setValue('type', 'pago');

    // Resetear estados
    setCity('');
    setCityCoords(null);
    setHighlights(['']);
    setSelectedDates([]);
    setCapacity(1);
    setCategoryId('');
    setCurrentStep(1);
    setPendingPhotos([]);
  }, [setValue]);

  // --- Borrador: limpiar al publicar ---
  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
  }, []);

  // Generate preview URLs for photos
  useEffect(() => {
    const urls = pendingPhotos.map(file => URL.createObjectURL(file));
    setPhotoPreviewUrls(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [pendingPhotos]);

  const validateStep = async (step: number): Promise<boolean> => {
    switch (step) {
      case 1: {
        // Paso 1: "Qué ofreces" - combina básicos + detalles
        const fieldsToValidate: (keyof FormData)[] = ['title', 'type', 'description'];
        if (selectedType !== 'intercambio') {
          fieldsToValidate.push('price');
        }
        const fieldsValid = await trigger(fieldsToValidate);
        // Ciudad obligatoria (gestionada fuera del formulario)
        if (!city) {
          setCityError('La ubicación es obligatoria');
          return false;
        }
        setCityError('');
        // Precio > 0 si modalidad es de pago (#34)
        if (selectedType !== 'intercambio' && (!watchedValues.price || parseFloat(watchedValues.price) <= 0)) {
          setError('El precio debe ser mayor que 0 para experiencias de pago');
          return false;
        }
        // Categoría siempre es obligatoria
        if (!categoryId) {
          setCategoryError('Selecciona una categoría');
          return false;
        }
        return fieldsValid;
      }
      case 2:
        // Paso 2: "Fotos y disponibilidad" - al menos 1 foto
        if (pendingPhotos.length === 0) {
          setError('Añade al menos una foto para continuar');
          return false;
        }
        setError('');
        return true;
      case 3:
        // Paso 3: "Revisar y publicar" - sin validación extra
        return true;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Scroll al primer error visible (#39)
      const errorEl = document.querySelector('[class*="text-red"], [class*="border-red"]');
      if (errorEl) {
        errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const handleCityChange = (location: CityLocation) => {
    setCity(location.city);
    setCityCoords({ latitude: location.latitude, longitude: location.longitude });
    setCityError('');
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
        categoryId,
        city,
        latitude: cityCoords?.latitude,
        longitude: cityCoords?.longitude,
        type: data.type,
        price: data.type !== 'intercambio' && data.price ? parseFloat(data.price) : undefined,
        highlights: validHighlightsList.length > 0 ? validHighlightsList : undefined,
        capacity: capacity,
        availability: availabilityDates.length > 0 ? availabilityDates : undefined,
        idealFor: idealFor.length > 0 ? idealFor : undefined,
        cancellationPolicy,
      };

      setUploadProgress('Creando experiencia...');
      const experience = await experiencesApi.create(experienceData);

      if (pendingPhotos.length > 0) {
        setUploadProgress(`Subiendo ${pendingPhotos.length} ${pendingPhotos.length === 1 ? 'foto' : 'fotos'}...`);
        try {
          await uploadsApi.uploadExperiencePhotos(experience.id, pendingPhotos);
        } catch (uploadErr) {
          logger.error('Error uploading photos:', uploadErr);
          // Check if it's a 403 error
          if (axios.isAxiosError(uploadErr) && uploadErr.response?.status === 403) {
            setError('Error de permisos al subir fotos. Tu sesión puede haber expirado. La experiencia se creó correctamente, puedes añadir las fotos desde la página de edición.');
          } else {
            setError('Error al subir las fotos. La experiencia se creó correctamente, puedes añadir las fotos más tarde.');
          }
          // Still redirect to the experience page
          clearDraft();
          router.push(`/experiences/${experience.id}`);
          return;
        }
      }

      clearDraft();
      router.push(`/experiences/${experience.id}`);
    } catch (err) {
      logger.error('Error creating experience:', err);
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
                        ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110'
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
      <form onSubmit={isAuthenticated ? handleSubmit(onSubmit) : handleDemoSubmit} className="pb-4 max-w-2xl mx-auto">
        {!isAuthenticated && (
          <div className="mx-4 mt-4 bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-xl text-sm flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
            <span><Link href="/login" className="underline font-medium">Inicia sesión</Link> para publicar tu experiencia</span>
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

        {hasDraft && currentStep === 1 && (
          <div className="mx-4 mt-4 bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded-xl text-sm flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0 text-blue-500">
                <path d="M15.988 3.012A2.25 2.25 0 0 1 18 5.25v6.5A2.25 2.25 0 0 1 15.75 14H13.5V7A2.5 2.5 0 0 0 11 4.5H8.128a2.252 2.252 0 0 1 1.884-1.488A2.25 2.25 0 0 1 12.25 1h1.5a2.25 2.25 0 0 1 2.238 2.012ZM11.5 3.25a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 .75.75v.25h-3v-.25Z" />
                <path fillRule="evenodd" d="M2 7a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7Zm2 3.25a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Zm0 3.5a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
              </svg>
              <span>Se ha restaurado tu borrador anterior</span>
            </div>
            <button
              type="button"
              onClick={discardDraft}
              className="flex-shrink-0 px-3 py-1.5 bg-white border border-blue-200 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors"
            >
              Descartar borrador
            </button>
          </div>
        )}

        {/* Step 1: Qué ofreces (básicos + detalles + precio + capacidad) */}
        {currentStep === 1 && (
          <div className="p-4 space-y-6 animate-fadeIn">
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary/30">
                <StepIcon name="sparkles" className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">¿Qué ofreces?</h2>
              <p className="text-gray-500 mt-1">Cuéntanos todos los detalles de tu experiencia</p>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Título de tu experiencia <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                className={`w-full px-4 py-3.5 bg-white border-2 rounded-xl text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:border-primary ${
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
              value={categoryId}
              onChange={(id) => {
                setCategoryId(id);
                setCategoryError('');
              }}
              error={categoryError}
            />

            {/* City */}
            <CitySelector
              value={city}
              onChange={handleCityChange}
              error={cityError}
            />

            {/* Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Modalidad <span className="text-red-400">*</span>
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

            {/* Price (if applicable) */}
            {selectedType !== 'intercambio' && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Precio por persona <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    className={`w-full px-4 py-3.5 pr-12 bg-white border-2 rounded-xl text-gray-900 placeholder-gray-400 text-2xl font-bold transition-colors focus:outline-none focus:border-primary ${
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

            {/* Cancellation Policy */}
            {selectedType !== 'intercambio' && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Política de cancelación
                </label>
                <select
                  value={cancellationPolicy}
                  onChange={(e) => setCancellationPolicy(e.target.value as CancellationPolicy)}
                  className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl text-gray-900 transition-colors focus:outline-none focus:border-primary"
                >
                  <option value="FLEXIBLE">Flexible — 100% hasta 24h, 50% hasta 12h</option>
                  <option value="MODERATE">Moderada — 100% hasta 72h, 50% hasta 24h</option>
                  <option value="STRICT">Estricta — 100% hasta 7 días, 50% hasta 72h</option>
                  <option value="NON_REFUNDABLE" disabled={policyRestrictions['NON_REFUNDABLE'] && !policyRestrictions['NON_REFUNDABLE'].allowed}>
                    Sin reembolso {policyRestrictions['NON_REFUNDABLE'] && !policyRestrictions['NON_REFUNDABLE'].allowed ? '(no disponible)' : ''}
                  </option>
                </select>
                {policyRestrictions['NON_REFUNDABLE'] && !policyRestrictions['NON_REFUNDABLE'].allowed && (
                  <p className="text-xs text-amber-600 mt-1">{policyRestrictions['NON_REFUNDABLE'].reason}</p>
                )}
                <p className="text-xs text-gray-400 mt-1.5">Determina cuánto se devuelve si el viajero cancela</p>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Descripción <span className="text-red-400">*</span>
              </label>
              <textarea
                className={`w-full px-4 py-3.5 bg-white border-2 rounded-xl text-gray-900 placeholder-gray-400 resize-none transition-colors focus:outline-none focus:border-primary min-h-[160px] ${
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
              <p className="text-xs text-gray-400 mt-1.5 flex justify-between">
                <span>Mínimo 20 caracteres</span>
                <span className={watchedValues.description?.length >= 20 ? 'text-green-500' : ''}>{watchedValues.description?.length || 0} / 20+</span>
              </p>
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
                      className="flex-1 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary transition-colors"
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
                  className="mt-3 w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Añadir otro
                </button>
              )}
            </div>

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

            {/* Ideal for */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Ideal para
              </label>
              <p className="text-sm text-gray-500 mb-3">
                ¿A quién va dirigida esta experiencia?
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'solo', label: 'Solo', icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
                    </svg>
                  ), activeClass: 'bg-purple-100 text-purple-700 ring-1 ring-purple-300' },
                  { value: 'pareja', label: 'Pareja', icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="m9.653 16.915-.005-.003-.019-.01a20.759 20.759 0 0 1-1.162-.682 22.045 22.045 0 0 1-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 0 1 8-2.828A4.5 4.5 0 0 1 18 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 0 1-3.744 2.582l-.019.01-.005.003h-.002a.723.723 0 0 1-.692 0h-.002Z" />
                    </svg>
                  ), activeClass: 'bg-pink-100 text-pink-700 ring-1 ring-pink-300' },
                  { value: 'amigos', label: 'Amigos', icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.636.818.818 0 0 1-.36.98A7.465 7.465 0 0 1 14.5 16Z" />
                    </svg>
                  ), activeClass: 'bg-blue-100 text-blue-700 ring-1 ring-blue-300' },
                  { value: 'hijos', label: 'Con hijos', icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" />
                    </svg>
                  ), activeClass: 'bg-green-100 text-green-700 ring-1 ring-green-300' },
                ].map((option) => {
                  const isActive = idealFor.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setIdealFor(prev =>
                        isActive ? prev.filter(v => v !== option.value) : [...prev, option.value]
                      )}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-all ${
                        isActive ? option.activeClass : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      {option.icon}
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Fotos y disponibilidad */}
        {currentStep === 2 && (
          <div className="p-4 space-y-6 animate-fadeIn">
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-pink-500/30">
                <StepIcon name="camera" className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Fotos y disponibilidad</h2>
              <p className="text-gray-500 mt-1">Añade fotos y selecciona cuándo estás disponible</p>
            </div>

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

        {/* Step 3: Revisar y publicar */}
        {currentStep === 3 && (
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
                  <Image src={photoPreviewUrls[0]} alt="Preview" className="w-full h-full object-cover" fill unoptimized />
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
                    {city || 'Ciudad'}
                  </span>
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
                    <p className="text-sm text-gray-700">{selectedDates.length} {selectedDates.length === 1 ? 'fecha seleccionada' : 'fechas seleccionadas'}</p>
                  </div>
                )}

                {pendingPhotos.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">{pendingPhotos.length} {pendingPhotos.length === 1 ? 'foto lista' : 'fotos listas'} para subir</p>
                  </div>
                )}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <h4 className="font-semibold text-gray-900">Resumen</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Ciudad</p>
                  <p className="font-medium text-gray-900">{city || '-'}</p>
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
      <div className="bg-white border-t border-gray-100 px-4 py-4 mb-20 sm:mb-0 md:border-t-0 md:py-6">
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
              className="flex-1 py-3.5 bg-primary text-white rounded-xl font-semibold shadow-lg shadow-primary/30 hover:shadow-xl transition-all"
            >
              Continuar
            </button>
          ) : (
            <button
              type="submit"
              onClick={isAuthenticated ? handleSubmit(onSubmit) : handleDemoSubmit}
              disabled={loading}
              className="flex-1 py-3.5 bg-primary text-white rounded-xl font-semibold shadow-lg shadow-primary/30 hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
