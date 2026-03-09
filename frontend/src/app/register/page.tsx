'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL } from '@/lib/api';

const registerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  age: z.coerce.number().min(18, 'Debes ser mayor de 18 años'),
  city: z.string().min(2, 'La ciudad es requerida'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirmPassword: z.string(),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar los términos de servicio y política de privacidad' }),
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setError('');
      setLoading(true);
      const { confirmPassword: _unused, ...registerData } = data;
      void _unused;
      const email = await registerUser(registerData);
      router.push(`/verification-pending?email=${encodeURIComponent(email)}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      const status = (err as Error & { status?: number }).status;
      if (message.includes('already registered') || message.includes('ya registrado')) {
        setError('Este email ya está registrado. ¿Quieres iniciar sesión?');
      } else if (status === 409 || status === 401) {
        setError('Este email ya está en uso. Prueba con otro o inicia sesión.');
      } else if (status === 429) {
        setError('Demasiados intentos. Espera unos minutos antes de volver a intentarlo.');
      } else {
        setError(message || 'Error al crear la cuenta. Inténtalo de nuevo más tarde.');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputBaseClass = "w-full pl-12 pr-4 py-3.5 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all";
  const inputErrorClass = "border-red-300 focus:border-red-500 focus:ring-red-200";
  const inputNormalClass = "border-gray-200";

  return (
    <div className="min-h-screen bg-[var(--surface-warm)] lg:flex">
      {/* Branding panel - desktop only */}
      <div className="hidden lg:flex lg:w-[480px] flex-col items-center justify-center px-12 bg-gradient-to-br from-primary via-terracotta to-accent relative overflow-hidden">
        <div className="absolute top-20 left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-60 h-60 bg-accent/20 rounded-full blur-3xl" />
        <div className="relative text-center text-white max-w-sm">
          <img src="/images/icons/icono.png" alt="FiestApp" className="w-20 h-20 rounded-2xl mx-auto mb-6 shadow-xl" />
          <h1 className="font-display text-4xl mb-4">Únete a la fiesta</h1>
          <p className="text-white/70 text-lg">
            Crea tu cuenta y empieza a vivir experiencias auténticas en las mejores fiestas de España
          </p>
        </div>
      </div>

      {/* Form section */}
      <div className="flex-1">
        {/* Header with gradient - mobile only */}
        <div className="lg:hidden relative bg-gradient-to-br from-primary via-terracotta to-accent pt-10 pb-28">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-accent/20 rounded-full blur-3xl" />

          {/* Back button */}
          <Link
            href="/"
            className="absolute top-4 left-4 w-10 h-10 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-full text-white"
            aria-label="Volver al inicio"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </Link>

          {/* Logo and title */}
          <div className="text-center text-white relative z-10">
            <div className="w-16 h-16 mx-auto mb-3 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                <path d="M6.25 6.375a4.125 4.125 0 1 1 8.25 0 4.125 4.125 0 0 1-8.25 0ZM3.25 19.125a7.125 7.125 0 0 1 14.25 0v.003l-.001.119a.75.75 0 0 1-.363.63 13.067 13.067 0 0 1-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 0 1-.364-.63l-.001-.122ZM19.75 7.5a.75.75 0 0 0-1.5 0v2.25H16a.75.75 0 0 0 0 1.5h2.25v2.25a.75.75 0 0 0 1.5 0v-2.25H22a.75.75 0 0 0 0-1.5h-2.25V7.5Z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-1">Únete a FiestApp</h1>
            <p className="text-white/70 text-sm">Crea tu cuenta en menos de un minuto</p>
          </div>
        </div>

        {/* Desktop back button + header */}
        <div className="hidden lg:block px-6 pt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#8B7355] hover:text-primary transition-colors mb-6"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Volver
          </Link>
          <h1 className="font-display text-3xl text-[#1A1410] mb-1">Crea tu cuenta</h1>
          <p className="text-[#8B7355]">Completa el formulario para empezar</p>
        </div>

        {/* Form Card */}
        <div className="px-4 lg:px-6 -mt-20 lg:mt-6 pb-8 relative z-10">
          <div className="bg-white rounded-3xl p-6 shadow-xl lg:shadow-lg lg:border lg:border-gray-100 max-w-lg lg:max-w-xl">
            {/* Error */}
            {error && (
              <div className="bg-[var(--color-error-bg)] text-[var(--color-error)] px-4 py-3 rounded-xl mb-4 text-sm flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5">
                  <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                </svg>
                <div>
                  {error}
                  {error.includes('iniciar sesión') && (
                    <Link href="/login" className="block mt-1 font-semibold text-primary hover:underline">
                      Ir a iniciar sesión
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Google Register */}
            <a
              href={`${API_URL}/auth/google`}
              className="w-full py-3.5 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continuar con Google
            </a>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-4 text-gray-400">o</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Name field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre completo <span className="text-red-400">*</span></label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
                    </svg>
                  </div>
                  <input
                    {...register('name')}
                    type="text"
                    className={`${inputBaseClass} ${errors.name ? inputErrorClass : inputNormalClass}`}
                    placeholder="Tu nombre"
                    aria-invalid={errors.name ? true : undefined}
                    aria-describedby={errors.name ? 'register-name-error' : undefined}
                  />
                </div>
                {errors.name && (
                  <p id="register-name-error" className="text-red-500 text-sm mt-1.5 flex items-center gap-1" role="alert">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                      <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm2.78-4.22a.75.75 0 0 1-1.06 0L8 9.06l-1.72 1.72a.75.75 0 1 1-1.06-1.06L6.94 8 5.22 6.28a.75.75 0 0 1 1.06-1.06L8 6.94l1.72-1.72a.75.75 0 1 1 1.06 1.06L9.06 8l1.72 1.72a.75.75 0 0 1 0 1.06Z" clipRule="evenodd" />
                    </svg>
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Email field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email <span className="text-red-400">*</span></label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" />
                      <path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" />
                    </svg>
                  </div>
                  <input
                    {...register('email')}
                    type="email"
                    className={`${inputBaseClass} ${errors.email ? inputErrorClass : inputNormalClass}`}
                    placeholder="tu@email.com"
                    aria-invalid={errors.email ? true : undefined}
                    aria-describedby={errors.email ? 'register-email-error' : undefined}
                  />
                </div>
                {errors.email && (
                  <p id="register-email-error" className="text-red-500 text-sm mt-1.5 flex items-center gap-1" role="alert">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                      <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm2.78-4.22a.75.75 0 0 1-1.06 0L8 9.06l-1.72 1.72a.75.75 0 1 1-1.06-1.06L6.94 8 5.22 6.28a.75.75 0 0 1 1.06-1.06L8 6.94l1.72-1.72a.75.75 0 1 1 1.06 1.06L9.06 8l1.72 1.72a.75.75 0 0 1 0 1.06Z" clipRule="evenodd" />
                    </svg>
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Age and City in grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Edad <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" />
                      </svg>
                    </div>
                    <input
                      {...register('age')}
                      type="number"
                      className={`w-full pl-12 pr-4 py-3.5 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all ${errors.age ? inputErrorClass : inputNormalClass}`}
                      placeholder="25"
                      aria-invalid={errors.age ? true : undefined}
                      aria-describedby={errors.age ? 'register-age-error' : undefined}
                    />
                  </div>
                  {errors.age && (
                    <p id="register-age-error" className="text-red-500 text-xs mt-1" role="alert">{errors.age.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ciudad <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="m9.69 18.933.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      {...register('city')}
                      type="text"
                      className={`w-full pl-12 pr-4 py-3.5 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all ${errors.city ? inputErrorClass : inputNormalClass}`}
                      placeholder="Madrid"
                      aria-invalid={errors.city ? true : undefined}
                      aria-describedby={errors.city ? 'register-city-error' : undefined}
                    />
                  </div>
                  {errors.city && (
                    <p id="register-city-error" className="text-red-500 text-xs mt-1" role="alert">{errors.city.message}</p>
                  )}
                </div>
              </div>

              {/* Password field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña <span className="text-red-400">*</span></label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    className={`w-full pl-12 pr-12 py-3.5 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all ${errors.password ? inputErrorClass : inputNormalClass}`}
                    placeholder="Mínimo 8 caracteres"
                    aria-invalid={errors.password ? true : undefined}
                    aria-describedby={errors.password ? 'register-password-error' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clipRule="evenodd" />
                        <path d="m10.748 13.93 2.523 2.523a9.987 9.987 0 0 1-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 0 1 0-1.186A10.007 10.007 0 0 1 2.839 6.02L6.07 9.252a4 4 0 0 0 4.678 4.678Z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                        <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p id="register-password-error" className="text-red-500 text-sm mt-1.5 flex items-center gap-1" role="alert">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                      <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm2.78-4.22a.75.75 0 0 1-1.06 0L8 9.06l-1.72 1.72a.75.75 0 1 1-1.06-1.06L6.94 8 5.22 6.28a.75.75 0 0 1 1.06-1.06L8 6.94l1.72-1.72a.75.75 0 1 1 1.06 1.06L9.06 8l1.72 1.72a.75.75 0 0 1 0 1.06Z" clipRule="evenodd" />
                    </svg>
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Confirm Password field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar contraseña <span className="text-red-400">*</span></label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    {...register('confirmPassword')}
                    type={showConfirmPassword ? 'text' : 'password'}
                    className={`w-full pl-12 pr-12 py-3.5 bg-gray-50 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all ${errors.confirmPassword ? inputErrorClass : inputNormalClass}`}
                    placeholder="Repite tu contraseña"
                    aria-invalid={errors.confirmPassword ? true : undefined}
                    aria-describedby={errors.confirmPassword ? 'register-confirmpassword-error' : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showConfirmPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clipRule="evenodd" />
                        <path d="m10.748 13.93 2.523 2.523a9.987 9.987 0 0 1-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 0 1 0-1.186A10.007 10.007 0 0 1 2.839 6.02L6.07 9.252a4 4 0 0 0 4.678 4.678Z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                        <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p id="register-confirmpassword-error" className="text-red-500 text-sm mt-1.5 flex items-center gap-1" role="alert">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                      <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm2.78-4.22a.75.75 0 0 1-1.06 0L8 9.06l-1.72 1.72a.75.75 0 1 1-1.06-1.06L6.94 8 5.22 6.28a.75.75 0 0 1 1.06-1.06L8 6.94l1.72-1.72a.75.75 0 1 1 1.06 1.06L9.06 8l1.72 1.72a.75.75 0 0 1 0 1.06Z" clipRule="evenodd" />
                    </svg>
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Terms Acceptance */}
              <div className="space-y-2">
                <label className="flex items-start gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl border border-gray-200 hover:border-primary/30 transition-colors">
                  <input
                    {...register('termsAccepted')}
                    type="checkbox"
                    className="w-5 h-5 mt-0.5 text-primary border-gray-300 rounded focus:ring-primary flex-shrink-0"
                    aria-invalid={errors.termsAccepted ? true : undefined}
                    aria-describedby={errors.termsAccepted ? 'register-terms-error' : undefined}
                  />
                  <span className="text-sm text-gray-700">
                    He leído y acepto los{' '}
                    <Link href="/terms" className="text-primary hover:underline font-medium" target="_blank">
                      Términos de servicio
                    </Link>
                    {' '}y la{' '}
                    <Link href="/privacy" className="text-primary hover:underline font-medium" target="_blank">
                      Política de privacidad
                    </Link>
                  </span>
                </label>
                {errors.termsAccepted && (
                  <p id="register-terms-error" className="text-red-500 text-sm flex items-center gap-1" role="alert">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                      <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm2.78-4.22a.75.75 0 0 1-1.06 0L8 9.06l-1.72 1.72a.75.75 0 1 1-1.06-1.06L6.94 8 5.22 6.28a.75.75 0 0 1 1.06-1.06L8 6.94l1.72-1.72a.75.75 0 1 1 1.06 1.06L9.06 8l1.72 1.72a.75.75 0 0 1 0 1.06Z" clipRule="evenodd" />
                    </svg>
                    {errors.termsAccepted.message}
                  </p>
                )}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-primary text-white font-semibold rounded-xl shadow-lg shadow-primary/30 hover:bg-primary-dark hover:shadow-xl hover:shadow-primary/40 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="spinner spinner-sm border-white/30 border-t-white" />
                    Creando cuenta...
                  </>
                ) : (
                  <>
                    Crear cuenta
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path d="M10 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM9.17 14.75a7.007 7.007 0 0 0-5.659 2.456.75.75 0 0 0 1.078 1.044A5.507 5.507 0 0 1 10 16a5.507 5.507 0 0 1 5.41 2.25.75.75 0 1 0 1.079-1.044 7.007 7.007 0 0 0-5.66-2.456h-.659ZM15.75 6a.75.75 0 0 0-1.5 0v1.5H12.75a.75.75 0 0 0 0 1.5h1.5V10.5a.75.75 0 0 0 1.5 0V9h1.5a.75.75 0 0 0 0-1.5h-1.5V6Z" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Login Link */}
            <div className="text-center mt-5 pt-5 border-t border-gray-100">
              <p className="text-gray-600">
                ¿Ya tienes cuenta?{' '}
                <Link href="/login" className="text-primary font-semibold hover:text-primary-dark">
                  Inicia sesión
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
