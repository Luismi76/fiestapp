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
    if (!avatar) return '/images/placeholder-user.jpg';
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

        {/* Pending Requests */}
        {pendingReceived > 0 && (
          <section className="px-4 mt-6">
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
          <section className="px-4 mt-6">
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

        {/* My Experiences */}
        <section className="px-4 mt-6">
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

        {/* Empty State for new users */}
        {receivedMatches.length === 0 && sentMatches.length === 0 && myExperiences.length === 0 && (
          <section className="px-4 mt-6">
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
    </MainLayout>
  );
}
