'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import { experiencesApi, matchesApi } from '@/lib/api';
import { Experience } from '@/types/experience';
import { Match } from '@/types/match';
import { getUploadUrl, getAvatarUrl, formatTimeAgo } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import logger from '@/lib/logger';
import {
  MessageIcon,
  CalendarIcon,
  SparklesIcon,
  PlusIcon,
  ChevronRightIcon,
  VerifiedIcon,
  MapPinIcon,
} from '@/components/icons';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [myExperiences, setMyExperiences] = useState<Experience[]>([]);
  const [receivedMatches, setReceivedMatches] = useState<Match[]>([]);
  const [sentMatches, setSentMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const [expRes, receivedRes, sentRes] = await Promise.all([
          experiencesApi.getMy().catch(() => []),
          matchesApi.getReceived().catch(() => []),
          matchesApi.getSent().catch(() => []),
        ]);
        setMyExperiences(expRes || []);
        setReceivedMatches(receivedRes || []);
        setSentMatches(sentRes || []);
      } catch (err) {
        logger.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated, authLoading, router]);

  // Stats
  const pendingReceived = receivedMatches.filter(m => m.status === 'pending').length;
  const acceptedMatches = [...receivedMatches, ...sentMatches].filter(m => m.status === 'accepted');
  const unreadMessages = [...receivedMatches, ...sentMatches].reduce((acc, m) => acc + (m.unreadCount || 0), 0);

  // Helpers
  const getImageUrl = (photos?: string[]) => {
    if (!photos || photos.length === 0) return '/images/placeholder.jpg';
    const photo = photos[0];
    if (photo.startsWith('/images/')) return photo;
    return getUploadUrl(photo);
  };

  const getAvatarSrc = (avatar?: string) => {
    if (!avatar) return '/images/user_demo.png';
    if (avatar.startsWith('/images/')) return avatar;
    return getAvatarUrl(avatar);
  };

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center pattern-festive">
          <div className="text-center">
            <div className="spinner spinner-lg mx-auto mb-4" />
            <p className="text-[#8B7355]">Cargando tu espacio...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen pb-24 md:pb-8 md:px-6 lg:px-8">
        {/* Hero Header */}
        <header className="relative overflow-hidden pattern-festive">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-4 left-4 w-24 h-24 bg-accent/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
          </div>

          <div className="relative px-4 pt-6 pb-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-[#8B7355] text-sm font-medium mb-1">Buenos días,</p>
                <h1 className="font-display text-2xl text-[#1A1410]">
                  {user?.name?.split(' ')[0] || 'Viajero'}
                </h1>
              </div>
              <Link
                href="/profile/me"
                className="relative w-14 h-14 rounded-full overflow-hidden ring-4 ring-white shadow-lg"
              >
                {user?.avatar ? (
                  <img src={getAvatarSrc(user.avatar)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full gradient-sunset flex items-center justify-center text-white font-bold text-xl">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </Link>
            </div>

            {/* Welcome banner for new users or quick action */}
            <div className="card card-festive p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl gradient-sunset flex items-center justify-center text-white">
                  <SparklesIcon />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[#1A1410]">Descubre experiencias únicas</p>
                  <p className="text-sm text-[#8B7355]">Vive las fiestas como un local</p>
                </div>
                <Link
                  href="/experiences"
                  className="btn btn-primary btn-sm"
                >
                  Explorar
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Quick Stats */}
        <div className="px-4 -mt-2">
          <div className="grid grid-cols-3 gap-3">
            <Link href="/messages" className="card p-4 text-center group">
              <div className="relative inline-block mb-2">
                <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center mx-auto text-secondary group-hover:scale-110 transition-transform">
                  <MessageIcon />
                </div>
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-[#1A1410]">{receivedMatches.length + sentMatches.length}</p>
              <p className="text-xs text-[#8B7355]">Conversaciones</p>
            </Link>

            <Link href="/messages?tab=received" className="card p-4 text-center group">
              <div className="relative inline-block mb-2">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mx-auto text-accent group-hover:scale-110 transition-transform">
                  <CalendarIcon />
                </div>
                {pendingReceived > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-[#1A1410] text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                    {pendingReceived}
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-[#1A1410]">{pendingReceived}</p>
              <p className="text-xs text-[#8B7355]">Pendientes</p>
            </Link>

            <Link href="/experiences/my" className="card p-4 text-center group">
              <div className="w-12 h-12 bg-emerald/10 rounded-xl flex items-center justify-center mx-auto text-emerald group-hover:scale-110 transition-transform mb-2">
                <SparklesIcon />
              </div>
              <p className="text-2xl font-bold text-[#1A1410]">{myExperiences.length}</p>
              <p className="text-xs text-[#8B7355]">Mis experiencias</p>
            </Link>
          </div>
        </div>

        {/* Desktop multi-column layout */}
        <div className="lg:grid lg:grid-cols-3 lg:gap-6 lg:px-4 lg:mt-6">
          {/* Main content - col-span-2 */}
          <div className="lg:col-span-2">
            {/* Pending Requests */}
            {pendingReceived > 0 && (
              <section className="px-4 lg:px-0 mt-6 lg:mt-0">
                <div className="section-header">
                  <h2 className="section-title">Solicitudes pendientes</h2>
                  <Link href="/messages" className="section-link">
                    Ver todas <ChevronRightIcon />
                  </Link>
                </div>
                <div className="space-y-3 stagger-children">
                  {receivedMatches
                    .filter(m => m.status === 'pending')
                    .slice(0, 3)
                    .map(match => (
                      <Link
                        key={match.id}
                        href={`/matches/${match.id}`}
                        className="card card-highlight flex items-center gap-3 p-4 group"
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-accent/30">
                          <img
                            src={getAvatarSrc(match.requester.avatar)}
                            alt={match.requester.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-[#1A1410] truncate">{match.requester.name}</p>
                            {match.requester.verified && <VerifiedIcon />}
                          </div>
                          <p className="text-sm text-[#8B7355] truncate">{match.experience.title}</p>
                        </div>
                        <span className="badge badge-accent">
                          Pendiente
                        </span>
                      </Link>
                    ))}
                </div>
              </section>
            )}

            {/* Active Conversations */}
            {acceptedMatches.length > 0 && (
              <section className="px-4 lg:px-0 mt-6">
                <div className="section-header">
                  <h2 className="section-title">Conversaciones activas</h2>
                  <Link href="/messages" className="section-link">
                    Ver todas <ChevronRightIcon />
                  </Link>
                </div>
                <div className="space-y-3 stagger-children">
                  {acceptedMatches.slice(0, 3).map(match => {
                    const otherPerson = match.requesterId === user?.id ? match.host : match.requester;
                    return (
                      <Link
                        key={match.id}
                        href={`/matches/${match.id}`}
                        className="card flex items-center gap-3 p-4 group"
                      >
                        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                          <img
                            src={getAvatarSrc(otherPerson.avatar)}
                            alt={otherPerson.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-[#1A1410] truncate">{otherPerson.name}</p>
                            {otherPerson.verified && <VerifiedIcon />}
                          </div>
                          <p className="text-sm text-[#8B7355] truncate">
                            {match.lastMessage?.content || match.experience.title}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs text-[#A89880]">
                            {formatTimeAgo(match.lastMessage?.createdAt || match.updatedAt)}
                          </span>
                          {match.unreadCount && match.unreadCount > 0 && (
                            <span className="w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                              {match.unreadCount > 9 ? '9+' : match.unreadCount}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Empty State for new users */}
            {receivedMatches.length === 0 && sentMatches.length === 0 && myExperiences.length === 0 && (
              <section className="px-4 lg:px-0 mt-6">
                <div className="card gradient-warm p-6 text-center relative overflow-hidden">
                  <div className="flourish flourish-tl" />
                  <div className="flourish flourish-br" />

                  <div className="relative">
                    <div className="empty-state-icon">🎉</div>
                    <h3 className="empty-state-title">¡Bienvenido a FiestApp!</h3>
                    <p className="empty-state-text">
                      Explora experiencias únicas en fiestas populares o crea la tuya propia para recibir viajeros.
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Link href="/experiences" className="btn btn-primary">
                        Explorar
                      </Link>
                      <Link href="/experiences/create" className="btn btn-secondary">
                        Crear experiencia
                      </Link>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Sidebar - col-span-1 */}
          <div className="lg:col-span-1">
            {/* My Experiences */}
            <section className="px-4 lg:px-0 mt-6 lg:mt-0">
              <div className="section-header">
                <h2 className="section-title">Mis experiencias</h2>
                <Link href="/experiences/my" className="section-link">
                  Ver todas <ChevronRightIcon />
                </Link>
              </div>

              {myExperiences.length === 0 ? (
                <Link
                  href="/experiences/create"
                  className="card p-5 flex items-center gap-4 border-2 border-dashed border-primary/30 hover:border-primary hover:shadow-lg transition-all group"
                >
                  <div className="w-14 h-14 rounded-xl gradient-sunset flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                    <PlusIcon />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1A1410]">Crea tu primera experiencia</p>
                    <p className="text-sm text-[#8B7355]">Comparte tu conocimiento local con viajeros</p>
                  </div>
                </Link>
              ) : (
                <div className="space-y-3 stagger-children">
                  {myExperiences.slice(0, 3).map(exp => (
                    <Link
                      key={exp.id}
                      href={`/experiences/${exp.id}`}
                      className="card flex items-center gap-3 p-3 group"
                    >
                      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                        <img
                          src={getImageUrl(exp.photos)}
                          alt={exp.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#1A1410] truncate">{exp.title}</p>
                        <p className="text-sm text-[#8B7355] flex items-center gap-1">
                          <MapPinIcon />
                          {exp.city}
                        </p>
                      </div>
                      <span className={`badge ${
                        exp.type === 'intercambio'
                          ? 'badge-intercambio'
                          : exp.type === 'ambos'
                            ? 'badge-flexible'
                            : 'badge-pago'
                      }`}>
                        {exp.type === 'intercambio' ? 'Intercambio' : exp.type === 'ambos' ? 'Flexible' : `${exp.price}€`}
                      </span>
                    </Link>
                  ))}
                  <Link
                    href="/experiences/create"
                    className="flex items-center justify-center gap-2 py-4 text-primary font-semibold text-sm hover:bg-primary/5 rounded-xl transition-colors"
                  >
                    <PlusIcon />
                    Crear nueva experiencia
                  </Link>
                </div>
              )}
            </section>

            {/* Quick Actions - desktop sidebar */}
            <section className="hidden lg:block mt-6">
              <h3 className="section-title mb-3">Acciones rápidas</h3>
              <div className="space-y-2">
                <Link href="/experiences" className="card flex items-center gap-3 p-4 group">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                  </div>
                  <span className="font-medium text-[#1A1410] text-sm">Explorar experiencias</span>
                </Link>
                <Link href="/stats" className="card flex items-center gap-3 p-4 group">
                  <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                    </svg>
                  </div>
                  <span className="font-medium text-[#1A1410] text-sm">Ver estadísticas</span>
                </Link>
                <Link href="/profile/me" className="card flex items-center gap-3 p-4 group">
                  <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                  </div>
                  <span className="font-medium text-[#1A1410] text-sm">Mi perfil</span>
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
