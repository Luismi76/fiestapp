'use client';

import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

const categories = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
    name: 'Explorar',
    color: 'bg-[var(--color-secondary)]',
    features: [
      { name: 'Búsqueda y filtros', href: '/experiences' },
      { name: 'Mapa interactivo', href: '/map' },
      { name: 'Calendario de fiestas', href: '/calendar' },
      { name: 'Favoritos', href: '/favorites' },
    ],
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
      </svg>
    ),
    name: 'Experiencias',
    color: 'bg-[var(--color-accent)]',
    features: [
      { name: 'Crear experiencia', href: '/experiences/create' },
      { name: 'Mis experiencias', href: '/experiences/my' },
      { name: 'Detalle y fotos', href: '/experiences' },
      { name: 'Precios y disponibilidad', href: '/experiences/create' },
    ],
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    ),
    name: 'Chat',
    color: 'bg-[var(--color-emerald)]',
    features: [
      { name: 'Mensajes en tiempo real', href: '/messages' },
      { name: 'Notas de voz', href: '/messages' },
      { name: 'Compartir ubicación', href: '/messages' },
      { name: 'Traducción automática', href: '/messages' },
    ],
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    name: 'Pagos',
    color: 'bg-[var(--color-terracotta)]',
    features: [
      { name: 'Wallet / monedero', href: '/wallet' },
      { name: 'Stripe y PayPal', href: '/wallet' },
      { name: 'Historial de pagos', href: '/wallet' },
      { name: 'Disputas', href: '/disputes' },
    ],
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
    name: 'Social',
    color: 'bg-purple-600',
    features: [
      { name: 'Perfil público', href: '/dashboard' },
      { name: 'Reseñas y badges', href: '/dashboard' },
      { name: 'Estadísticas', href: '/stats' },
      { name: 'Referidos', href: '/dashboard' },
    ],
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
    name: 'Notificaciones',
    color: 'bg-rose-500',
    features: [
      { name: 'Push y en app', href: '/notifications' },
      { name: 'Preferencias', href: '/profile/edit' },
      { name: 'Recordatorios', href: '/notifications' },
    ],
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    name: 'Seguridad',
    color: 'bg-slate-700',
    features: [
      { name: 'Verificación identidad', href: '/profile/verify' },
      { name: 'Datos GDPR', href: '/profile/data' },
      { name: 'Reportes', href: '/dashboard' },
    ],
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
      </svg>
    ),
    name: 'Admin',
    color: 'bg-[var(--color-primary)]',
    features: [
      { name: 'Dashboard', href: '/admin' },
      { name: 'Gestión usuarios', href: '/admin/users' },
      { name: 'Gestión experiencias', href: '/admin/experiences' },
      { name: 'Disputas y reportes', href: '/admin/disputes' },
    ],
  },
];

const feedbackCategories = [
  { value: 'diseño', label: 'Diseño' },
  { value: 'funcionalidad', label: 'Funcionalidad' },
  { value: 'rendimiento', label: 'Rendimiento' },
  { value: 'otro', label: 'Otro' },
];

export default function DemoPage() {
  const [openCategory, setOpenCategory] = useState<number | null>(null);
  const [feedbackForm, setFeedbackForm] = useState({
    name: '',
    email: '',
    category: 'funcionalidad',
    message: '',
    rating: 0,
  });
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [hoverRating, setHoverRating] = useState(0);

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (feedbackForm.rating === 0) return;

    setFeedbackStatus('sending');
    try {
      await api.post('/feedback', feedbackForm);
      setFeedbackStatus('sent');
      setFeedbackForm({ name: '', email: '', category: 'funcionalidad', message: '', rating: 0 });
      setTimeout(() => setFeedbackStatus('idle'), 4000);
    } catch {
      setFeedbackStatus('error');
      setTimeout(() => setFeedbackStatus('idle'), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-warm)]">
      {/* Hero */}
      <section className="relative overflow-hidden gradient-festive text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-48 h-48 bg-white rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 py-16 md:py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6 text-sm font-medium">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Beta privada
          </div>

          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
              </svg>
            </div>
          </div>

          <h1 className="font-display text-4xl md:text-6xl font-bold mb-4 tracking-tight">
            FiestApp
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-8 leading-relaxed">
            Marketplace de experiencias en fiestas populares españolas.
            Conecta viajeros con anfitriones locales.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="btn bg-white text-[var(--color-primary)] hover:bg-white/90 font-semibold px-8 py-3 rounded-xl text-center"
            >
              Acceder a la app
            </Link>
            <a
              href="#funcionalidades"
              className="btn bg-white/15 backdrop-blur-sm text-white border border-white/20 hover:bg-white/25 font-semibold px-8 py-3 rounded-xl text-center"
            >
              Ver funcionalidades
            </a>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-12 space-y-16">
        {/* Instalar como PWA */}
        <section className="animate-fade-in-up">
          <h2 className="font-display text-2xl md:text-3xl text-[var(--color-text-primary)] mb-6 text-center">
            Instalar como aplicación
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24c-2.86-1.21-6.08-1.21-8.94 0L5.65 5.67c-.19-.29-.58-.38-.87-.2-.28.18-.37.56-.19.86l1.84 3.18C2.86 11.58.5 15.27.5 19.5h23c0-4.23-2.36-7.92-5.9-10.02zM7 15.25c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25zm10 0c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Android</h3>
              </div>
              <ol className="space-y-3 text-[var(--color-text-secondary)]">
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span>Abre <strong className="text-[var(--color-text-primary)]">fiestapp.lmsc.es</strong> en Chrome</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span>Toca el menú <strong className="text-[var(--color-text-primary)]">⋮</strong> (tres puntos)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span>Selecciona <strong className="text-[var(--color-text-primary)]">&quot;Instalar aplicación&quot;</strong></span>
                </li>
              </ol>
            </div>

            <div className="card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-[var(--color-text-primary)]">iOS / Safari</h3>
              </div>
              <ol className="space-y-3 text-[var(--color-text-secondary)]">
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span>Abre <strong className="text-[var(--color-text-primary)]">fiestapp.lmsc.es</strong> en Safari</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span>Toca el botón <strong className="text-[var(--color-text-primary)]">Compartir</strong> (cuadrado con flecha)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span>Selecciona <strong className="text-[var(--color-text-primary)]">&quot;Añadir a pantalla de inicio&quot;</strong></span>
                </li>
              </ol>
            </div>
          </div>
        </section>

        {/* Funcionalidades */}
        <section id="funcionalidades" className="animate-fade-in-up">
          <h2 className="font-display text-2xl md:text-3xl text-[var(--color-text-primary)] mb-2 text-center">
            Funcionalidades
          </h2>
          <p className="text-[var(--color-text-secondary)] text-center mb-8">
            Toca cada categoría para ver las funcionalidades disponibles
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {categories.map((cat, idx) => (
              <div key={cat.name} className="card overflow-hidden">
                <button
                  onClick={() => setOpenCategory(openCategory === idx ? null : idx)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-10 h-10 ${cat.color} text-white rounded-xl flex items-center justify-center flex-shrink-0`}>
                    {cat.icon}
                  </div>
                  <span className="font-semibold text-[var(--color-text-primary)] flex-1">{cat.name}</span>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${openCategory === idx ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {openCategory === idx && (
                  <div className="px-4 pb-4 space-y-2 animate-fade-in">
                    {cat.features.map((f) => (
                      <Link
                        key={f.name}
                        href={f.href}
                        className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-warm)] hover:bg-gray-100 transition-colors group"
                      >
                        <span className="text-sm text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]">{f.name}</span>
                        <span className="text-xs font-medium text-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity">
                          Probar →
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Cuentas de prueba */}
        <section className="animate-fade-in-up">
          <h2 className="font-display text-2xl md:text-3xl text-[var(--color-text-primary)] mb-6 text-center">
            Cuentas de prueba
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            <div className="card p-6 border-l-4 border-l-[var(--color-secondary)]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-[var(--color-secondary)] text-white rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
                <h3 className="font-bold text-[var(--color-text-primary)]">Viajero</h3>
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-[var(--color-text-secondary)]">
                  Email: <code className="bg-gray-100 px-2 py-0.5 rounded text-[var(--color-text-primary)] font-mono text-xs">demo@test.com</code>
                </p>
                <p className="text-[var(--color-text-secondary)]">
                  Contraseña: <code className="bg-gray-100 px-2 py-0.5 rounded text-[var(--color-text-primary)] font-mono text-xs">password123</code>
                </p>
              </div>
            </div>

            <div className="card p-6 border-l-4 border-l-[var(--color-accent)]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-[var(--color-accent)] text-white rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                  </svg>
                </div>
                <h3 className="font-bold text-[var(--color-text-primary)]">Anfitriona</h3>
              </div>
              <div className="space-y-1 text-sm">
                <p className="text-[var(--color-text-secondary)]">
                  Email: <code className="bg-gray-100 px-2 py-0.5 rounded text-[var(--color-text-primary)] font-mono text-xs">maria@test.com</code>
                </p>
                <p className="text-[var(--color-text-secondary)]">
                  Contraseña: <code className="bg-gray-100 px-2 py-0.5 rounded text-[var(--color-text-primary)] font-mono text-xs">password123</code>
                </p>
              </div>
            </div>
          </div>

          <div className="text-center mt-6 space-y-3">
            <Link href="/login" className="btn btn-primary inline-flex items-center gap-2 px-8">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              Iniciar sesión
            </Link>
            <p className="text-xs text-[var(--color-text-muted)]">
              Entorno de pruebas — los datos se reinician periódicamente
            </p>
          </div>
        </section>

        {/* Formulario de Feedback */}
        <section className="animate-fade-in-up">
          <h2 className="font-display text-2xl md:text-3xl text-[var(--color-text-primary)] mb-2 text-center">
            Tu opinión nos importa
          </h2>
          <p className="text-[var(--color-text-secondary)] text-center mb-8">
            Cuéntanos qué te parece y cómo podemos mejorar
          </p>

          <form onSubmit={handleSubmitFeedback} className="card p-6 md:p-8 max-w-2xl mx-auto space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Nombre</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={feedbackForm.name}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, name: e.target.value })}
                  className="input w-full"
                  placeholder="Tu nombre"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={feedbackForm.email}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, email: e.target.value })}
                  className="input w-full"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Categoría</label>
              <select
                value={feedbackForm.category}
                onChange={(e) => setFeedbackForm({ ...feedbackForm, category: e.target.value })}
                className="input w-full"
              >
                {feedbackCategories.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Valoración</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFeedbackForm({ ...feedbackForm, rating: star })}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <svg
                      className={`w-8 h-8 ${
                        star <= (hoverRating || feedbackForm.rating)
                          ? 'text-[var(--color-accent)] fill-[var(--color-accent)]'
                          : 'text-gray-300'
                      } transition-colors`}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1.5">Mensaje</label>
              <textarea
                required
                minLength={10}
                maxLength={2000}
                rows={4}
                value={feedbackForm.message}
                onChange={(e) => setFeedbackForm({ ...feedbackForm, message: e.target.value })}
                className="input w-full resize-none"
                placeholder="Cuéntanos tu experiencia, sugerencias o problemas encontrados..."
              />
              <p className="text-xs text-[var(--color-text-muted)] mt-1 text-right">
                {feedbackForm.message.length}/2000
              </p>
            </div>

            <button
              type="submit"
              disabled={feedbackStatus === 'sending' || feedbackForm.rating === 0}
              className="btn btn-primary btn-full flex items-center justify-center gap-2"
            >
              {feedbackStatus === 'sending' ? (
                <>
                  <div className="spinner spinner-sm" />
                  Enviando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                  Enviar feedback
                </>
              )}
            </button>

            {feedbackStatus === 'sent' && (
              <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-xl text-sm animate-fade-in">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                ¡Gracias por tu feedback! Lo revisaremos pronto.
              </div>
            )}

            {feedbackStatus === 'error' && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm animate-fade-in">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                Error al enviar. Inténtalo de nuevo.
              </div>
            )}
          </form>
        </section>

        {/* Footer */}
        <footer className="text-center py-8 border-t border-gray-200">
          <p className="text-sm text-[var(--color-text-muted)]">
            FiestApp &copy; {new Date().getFullYear()} &mdash; Marketplace de experiencias en fiestas populares
          </p>
        </footer>
      </div>
    </div>
  );
}
