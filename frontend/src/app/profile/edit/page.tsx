'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { usersApi, uploadsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { UpdateProfileData } from '@/types/user';
import { getAvatarUrl } from '@/lib/utils';
import MainLayout from '@/components/MainLayout';

interface FormData {
  name: string;
  age: string;
  bio: string;
  city: string;
  hasPartner: boolean;
  hasChildren: boolean;
  childrenAges: string;
}

export default function EditProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading, refreshUser, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormData>();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await usersApi.getMyProfile();
        reset({
          name: profile.name,
          age: profile.age?.toString() || '',
          bio: profile.bio || '',
          city: profile.city || '',
          hasPartner: profile.hasPartner || false,
          hasChildren: profile.hasChildren || false,
          childrenAges: profile.childrenAges || '',
        });
      } catch {
        setError('No se pudo cargar el perfil');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchProfile();
    }
  }, [isAuthenticated, reset]);

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const updateData: UpdateProfileData = {
        name: data.name,
        bio: data.bio || undefined,
        city: data.city || undefined,
        age: data.age ? parseInt(data.age, 10) : undefined,
        hasPartner: data.hasPartner,
        hasChildren: data.hasChildren,
        childrenAges: data.childrenAges || undefined,
      };

      await usersApi.updateProfile(updateData);
      setSuccess(true);

      await refreshUser();

      setTimeout(() => {
        router.push('/profile/me');
      }, 1500);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'No se pudo actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Tipo de archivo no permitido. Use JPG, PNG, WebP o GIF');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen es demasiado grande. Máximo 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setUploadingAvatar(true);
    setError('');

    try {
      await uploadsApi.uploadAvatar(file);
      await refreshUser();
      setAvatarPreview(null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Error al subir la imagen');
      setAvatarPreview(null);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAvatar = async () => {
    if (!user?.avatar) return;

    setUploadingAvatar(true);
    setError('');

    try {
      await uploadsApi.deleteAvatar();
      await refreshUser();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Error al eliminar la imagen');
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
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
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="font-semibold text-gray-900">Editar perfil</span>
          <div className="w-10" />
        </div>
      </div>

      {/* Content container */}
      <div className="max-w-2xl mx-auto">
        {/* Avatar Section */}
        <div className="bg-white px-6 py-8">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleAvatarChange}
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
        />

        <div className="text-center">
          <div
            onClick={!uploadingAvatar ? handleAvatarClick : undefined}
            className={`relative inline-block cursor-pointer group ${uploadingAvatar ? 'pointer-events-none' : ''}`}
          >
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden ring-4 ring-white shadow-lg mx-auto">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : user?.avatar ? (
                <img
                  src={getAvatarUrl(user.avatar)}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16 text-gray-400">
                    <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>

            {/* Overlay */}
            {uploadingAvatar ? (
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                <div className="spinner border-white border-t-transparent" />
              </div>
            ) : (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-full transition-colors flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <path d="M12 9a3.75 3.75 0 1 0 0 7.5A3.75 3.75 0 0 0 12 9Z" />
                  <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 0 1 5.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 0 1-3 3H4.5a3 3 0 0 1-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 0 0 1.11-.71l.822-1.315a2.942 2.942 0 0 1 2.332-1.39ZM6.75 12.75a5.25 5.25 0 1 1 10.5 0 5.25 5.25 0 0 1-10.5 0Zm12-1.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                </svg>
              </div>
            )}

            {/* Camera badge */}
            <div className="absolute -bottom-1 -right-1 w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg border-3 border-white">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M1 8a2 2 0 0 1 2-2h.93a2 2 0 0 0 1.664-.89l.812-1.22A2 2 0 0 1 8.07 3h3.86a2 2 0 0 1 1.664.89l.812 1.22A2 2 0 0 0 16.07 6H17a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8Zm13.5 3a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM10 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
              </svg>
            </div>
          </div>

          <div className="flex justify-center gap-3 mt-4">
            <button
              type="button"
              onClick={handleAvatarClick}
              disabled={uploadingAvatar}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-xl transition-colors disabled:opacity-50"
            >
              {user?.avatar ? 'Cambiar foto' : 'Subir foto'}
            </button>
            {user?.avatar && (
              <button
                type="button"
                onClick={handleDeleteAvatar}
                disabled={uploadingAvatar}
                className="px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
              >
                Eliminar
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            JPG, PNG, WebP o GIF. Máximo 5MB
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="px-4 py-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-sm flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0">
              <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-4 rounded-2xl text-sm flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0">
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
            </svg>
            Perfil actualizado correctamente
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Nombre */}
          <div className="p-4 border-b border-gray-100">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Nombre
            </label>
            <input
              type="text"
              className="w-full text-gray-900 font-medium focus:outline-none placeholder:text-gray-300"
              placeholder="Tu nombre"
              {...register('name', {
                required: 'El nombre es obligatorio',
                minLength: { value: 2, message: 'Mínimo 2 caracteres' },
                maxLength: { value: 50, message: 'Máximo 50 caracteres' },
              })}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Edad */}
          <div className="p-4 border-b border-gray-100">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Edad
            </label>
            <input
              type="number"
              className="w-full text-gray-900 font-medium focus:outline-none placeholder:text-gray-300"
              placeholder="Tu edad"
              min="18"
              max="120"
              {...register('age', {
                min: { value: 18, message: 'Debes ser mayor de 18 años' },
              })}
            />
            {errors.age && (
              <p className="text-red-500 text-xs mt-1">{errors.age.message}</p>
            )}
          </div>

          {/* Ciudad */}
          <div className="p-4 border-b border-gray-100">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Ciudad
            </label>
            <input
              type="text"
              className="w-full text-gray-900 font-medium focus:outline-none placeholder:text-gray-300"
              placeholder="¿Dónde vives?"
              {...register('city', {
                maxLength: { value: 100, message: 'Máximo 100 caracteres' },
              })}
            />
            {errors.city && (
              <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>
            )}
          </div>

          {/* Bio */}
          <div className="p-4">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Sobre mí
            </label>
            <textarea
              className="w-full text-gray-900 font-medium focus:outline-none placeholder:text-gray-300 min-h-[100px] resize-none"
              placeholder="Cuéntanos sobre ti, tus intereses, qué festividades te gustan..."
              {...register('bio', {
                maxLength: { value: 500, message: 'Máximo 500 caracteres' },
              })}
            />
            {errors.bio && (
              <p className="text-red-500 text-xs mt-1">{errors.bio.message}</p>
            )}
            <p className="text-xs text-gray-400 text-right mt-1">
              Máximo 500 caracteres
            </p>
          </div>
        </div>

        {/* Situación familiar */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <label className="block text-xs font-medium text-gray-500 mb-3">
              Situación familiar
            </label>
            <p className="text-xs text-gray-400 mb-4">
              Esta información ayuda a encontrar experiencias compatibles
            </p>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                  {...register('hasPartner')}
                />
                <div>
                  <span className="text-gray-900 font-medium">Tengo pareja</span>
                  <p className="text-xs text-gray-400">Viajo o asisto a fiestas con mi pareja</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                  {...register('hasChildren')}
                />
                <div>
                  <span className="text-gray-900 font-medium">Tengo hijos</span>
                  <p className="text-xs text-gray-400">Viajo o asisto a fiestas con mis hijos</p>
                </div>
              </label>
            </div>
          </div>

          <div className="p-4">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Edades de los hijos
            </label>
            <input
              type="text"
              className="w-full text-gray-900 font-medium focus:outline-none placeholder:text-gray-300"
              placeholder="Ej: 5, 8, 12"
              {...register('childrenAges', {
                maxLength: { value: 50, message: 'Máximo 50 caracteres' },
              })}
            />
            {errors.childrenAges && (
              <p className="text-red-500 text-xs mt-1">{errors.childrenAges.message}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              Opcional. Separa las edades con comas
            </p>
          </div>
        </div>

        {/* Email (read-only) */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Email
            </label>
            <input
              type="email"
              className="w-full text-gray-500 focus:outline-none bg-transparent"
              value={user?.email || ''}
              disabled
            />
            <p className="text-xs text-gray-400 mt-1">
              El email no se puede cambiar
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <button
            type="submit"
            className="w-full py-4 bg-blue-500 text-white font-semibold rounded-2xl hover:bg-blue-600 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={saving || !isDirty}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <div className="spinner spinner-sm border-white border-t-transparent" />
                Guardando...
              </span>
            ) : (
              'Guardar cambios'
            )}
          </button>

          <Link
            href="/profile/me"
            className="block w-full py-4 text-center text-gray-600 font-medium rounded-2xl hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>

      {/* Logout */}
      <div className="px-4 mt-4">
        <button
          onClick={() => {
            logout();
          }}
          className="w-full bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-600">
                <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M19 10a.75.75 0 0 0-.75-.75H8.704l1.048-.943a.75.75 0 1 0-1.004-1.114l-2.5 2.25a.75.75 0 0 0 0 1.114l2.5 2.25a.75.75 0 1 0 1.004-1.114l-1.048-.943h9.546A.75.75 0 0 0 19 10Z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-medium text-gray-900">Cerrar sesión</span>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-400">
            <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Danger Zone */}
      <div className="px-4 mt-4">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-red-100">
          <div className="p-4">
            <h3 className="font-semibold text-red-600 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
              Zona de peligro
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              Esta acción es irreversible. Se eliminarán todas tus experiencias, matches y reseñas.
            </p>
            <button className="mt-4 px-4 py-2 border border-red-200 text-red-500 font-medium rounded-xl hover:bg-red-50 transition-colors text-sm">
              Eliminar mi cuenta
            </button>
          </div>
        </div>
      </div>
      {/* End content container */}
      </div>
    </div>
    </MainLayout>
  );
}
