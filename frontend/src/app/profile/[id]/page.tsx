'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { usersApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { UserPublicProfile } from '@/types/user';
import { getAvatarUrl, getUploadUrl } from '@/lib/utils';
import BottomNav from '@/components/BottomNav';
import ReputationBadges from '@/components/ReputationBadges';

// Mock profiles para fallback
const mockProfiles: Record<string, any> = {
  'user-maria': {
    id: 'user-maria',
    name: 'María García',
    bio: 'Sevillana de toda la vida. Me encanta compartir nuestras tradiciones con visitantes de todo el mundo. La Feria de Abril es mi pasión y quiero que todo el mundo pueda vivirla como un auténtico sevillano.',
    city: 'Sevilla',
    avatar: '/images/user_maria.png',
    verified: true,
    createdAt: '2024-01-15',
    avgRating: 4.9,
    _count: { experiences: 1, reviewsReceived: 127 },
    experiences: [
      { id: 'exp-1', title: 'Vive la Feria como un sevillano', type: 'pago', price: 45, avgRating: 4.9, photos: ['/images/feria_abril.png'], festival: { id: 'fest-feria', name: 'Feria de Abril', city: 'Sevilla' } },
    ],
    reviews: [
      { id: 'r1', rating: 5, comment: '¡Increíble experiencia! María fue muy amable y la caseta estaba genial.', createdAt: '2024-04-20', author: { id: 'user-carlos', name: 'Carlos M.', avatar: '/images/user_carlos.png', verified: true }, experience: { id: 'exp-1', title: 'Vive la Feria como un sevillano' } },
      { id: 'r2', rating: 5, comment: 'La mejor forma de vivir la Feria. María y su familia son encantadores.', createdAt: '2024-04-18', author: { id: 'user-ana', name: 'Ana L.', avatar: '/images/user_ana.png', verified: true }, experience: { id: 'exp-1', title: 'Vive la Feria como un sevillano' } },
    ],
  },
  'user-carlos': {
    id: 'user-carlos',
    name: 'Carlos Martínez',
    bio: 'Pamplonés de nacimiento. Llevo corriendo encierros desde los 18 años. Si quieres vivir San Fermín de verdad, ¡yo te llevo!',
    city: 'Pamplona',
    avatar: '/images/user_carlos.png',
    verified: true,
    createdAt: '2024-02-20',
    avgRating: 4.8,
    _count: { experiences: 1, reviewsReceived: 89 },
    experiences: [
      { id: 'exp-2', title: 'Encierro y tapas tradicionales', type: 'intercambio', price: undefined, avgRating: 4.8, photos: ['/images/san_fermin.png'], festival: { id: 'fest-sanfermin', name: 'San Fermín', city: 'Pamplona' } },
    ],
    reviews: [
      { id: 'r3', rating: 5, comment: 'Carlos conoce todos los rincones de Pamplona. Una experiencia auténtica.', createdAt: '2024-07-10', author: { id: 'user-laura', name: 'Laura P.', avatar: '/images/user_laura.png', verified: true }, experience: { id: 'exp-2', title: 'Encierro y tapas tradicionales' } },
    ],
  },
  'user-laura': {
    id: 'user-laura',
    name: 'Laura Pérez',
    bio: 'Valenciana apasionada por las Fallas. Mi familia lleva 4 generaciones siendo falleros. ¡Ven a vivir la mascletà y la paella!',
    city: 'Valencia',
    avatar: '/images/user_laura.png',
    verified: true,
    createdAt: '2024-03-10',
    avgRating: 5.0,
    _count: { experiences: 1, reviewsReceived: 64 },
    experiences: [
      { id: 'exp-3', title: 'Mascletà y paella valenciana', type: 'pago', price: 35, avgRating: 5.0, photos: ['/images/las_fallas.png'], festival: { id: 'fest-fallas', name: 'Las Fallas', city: 'Valencia' } },
    ],
    reviews: [
      { id: 'r4', rating: 5, comment: 'La paella de Laura es la mejor que he probado. Las Fallas desde dentro, una pasada.', createdAt: '2024-03-18', author: { id: 'user-maria', name: 'María G.', avatar: '/images/user_maria.png', verified: true }, experience: { id: 'exp-3', title: 'Mascletà y paella valenciana' } },
    ],
  },
  'user-ana': {
    id: 'user-ana',
    name: 'Ana López',
    bio: 'Gaditana de corazón. El Carnaval corre por mis venas. Chirigotas, comparsas y mucho pescaíto frito.',
    city: 'Cádiz',
    avatar: '/images/user_ana.png',
    verified: true,
    createdAt: '2024-01-20',
    avgRating: 4.8,
    _count: { experiences: 1, reviewsReceived: 92 },
    experiences: [
      { id: 'exp-6', title: 'Carnaval gaditano auténtico', type: 'intercambio', price: undefined, avgRating: 4.8, photos: ['/images/carnaval.png'], festival: { id: 'fest-carnaval', name: 'Carnaval de Cádiz', city: 'Cádiz' } },
    ],
    reviews: [
      { id: 'r5', rating: 5, comment: 'El Carnaval de Cádiz con Ana fue espectacular. Las chirigotas, el pescaíto, la fiesta... ¡Volveré!', createdAt: '2024-02-18', author: { id: 'user-demo', name: 'Usuario D.', avatar: undefined, verified: false }, experience: { id: 'exp-6', title: 'Carnaval gaditano auténtico' } },
    ],
  },
  'user-demo': {
    id: 'user-demo',
    name: 'Usuario Demo',
    bio: 'Viajero entusiasta buscando experiencias auténticas en las festividades españolas.',
    city: 'Madrid',
    avatar: undefined,
    verified: false,
    createdAt: '2024-06-01',
    avgRating: 0,
    _count: { experiences: 0, reviewsReceived: 0 },
    experiences: [],
    reviews: [],
  },
};

const getExperienceImage = (exp: any) => {
  if (exp.photos && exp.photos.length > 0) {
    const photo = exp.photos[0];
    if (photo.startsWith('/images/')) return photo;
    return getUploadUrl(photo);
  }
  return null;
};

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isOwnProfile = currentUser?.id === params.id || params.id === 'me';

  useEffect(() => {
    const fetchProfile = async () => {
      let userId = params.id as string;

      // Handle "me" route
      if (userId === 'me' && currentUser?.id) {
        userId = currentUser.id;
      }

      try {
        const data = await usersApi.getPublicProfile(userId);
        setProfile(data);
      } catch {
        if (mockProfiles[userId]) {
          setProfile(mockProfiles[userId]);
        } else if (userId === 'me' || params.id === 'me') {
          // Use demo profile for "me" if not authenticated
          setProfile(mockProfiles['user-demo']);
        } else {
          setError('No se pudo cargar el perfil');
        }
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchProfile();
    }
  }, [params.id, currentUser?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner spinner-lg mx-auto mb-4" />
          <p className="text-gray-500">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
          <div className="flex items-center px-4 h-14">
            <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <span className="font-semibold ml-2">Error</span>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center px-6 py-20">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-red-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>
          <h2 className="font-bold text-xl text-gray-900 mb-2">Usuario no encontrado</h2>
          <p className="text-gray-500 text-center mb-6">{error}</p>
          <Link href="/dashboard" className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-full hover:bg-blue-600 transition-colors">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const memberSince = new Date(profile.createdAt).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
  });

  const getAvatarSrc = (avatar?: string) => {
    if (!avatar) return null;
    if (avatar.startsWith('/images/')) return avatar;
    return getAvatarUrl(avatar);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header with gradient */}
      <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <header className="relative z-10 flex items-center justify-between px-4 h-14">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center text-white">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="font-semibold text-white">Perfil</span>
          {isOwnProfile ? (
            <Link href="/profile/edit" className="w-10 h-10 flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
              </svg>
            </Link>
          ) : (
            <div className="w-10" />
          )}
        </header>

        {/* Avatar and name */}
        <div className="relative z-10 px-6 pb-8 pt-4 text-center">
          <div className="relative inline-block">
            <div className="w-28 h-28 mx-auto bg-white rounded-full p-1 shadow-xl">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden flex items-center justify-center">
                {getAvatarSrc(profile.avatar) ? (
                  <img
                    src={getAvatarSrc(profile.avatar)!}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16 text-gray-400">
                    <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </div>
            {profile.verified && (
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg border-3 border-white">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>

          <h1 className="text-2xl font-bold text-white mt-4">{profile.name}</h1>
          <p className="text-white/80 mt-1 flex items-center justify-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="m7.539 14.841.003.003.002.002a.755.755 0 0 0 .912 0l.002-.002.003-.003.012-.009a5.57 5.57 0 0 0 .19-.153 15.588 15.588 0 0 0 2.046-2.082c1.101-1.362 2.291-3.342 2.291-5.597A5 5 0 0 0 3 7c0 2.255 1.19 4.235 2.292 5.597a15.591 15.591 0 0 0 2.046 2.082 8.916 8.916 0 0 0 .189.153l.012.01ZM8 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" clipRule="evenodd" />
            </svg>
            {profile.city}
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="px-4 -mt-6 relative z-20">
        <div className="bg-white rounded-2xl shadow-lg p-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-blue-500">
                  <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-gray-900">{profile._count.experiences}</div>
              <div className="text-xs text-gray-500">Experiencias</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-amber-500">
                  <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {profile.avgRating > 0 ? profile.avgRating.toFixed(1) : '-'}
              </div>
              <div className="text-xs text-gray-500">Valoración</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-emerald-500">
                  <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0 1 12 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 0 1-3.476.383.39.39 0 0 0-.297.17l-2.755 4.133a.75.75 0 0 1-1.248 0l-2.755-4.133a.39.39 0 0 0-.297-.17 48.9 48.9 0 0 1-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97Z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-gray-900">{profile._count.reviewsReceived}</div>
              <div className="text-xs text-gray-500">Reseñas</div>
            </div>
          </div>
        </div>
      </div>

      {/* Reputation Badges */}
      <div className="px-4 mt-4">
        <ReputationBadges
          verified={profile.verified}
          createdAt={profile.createdAt}
          experiencesCount={profile._count.experiences}
          reviewsCount={profile._count.reviewsReceived}
          avgRating={profile.avgRating}
          size="md"
          showAll
        />
      </div>

      {/* Bio */}
      {profile.bio && (
        <div className="px-4 mt-4">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5">
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-blue-500">
                  <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-5.5-2.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM10 12a5.99 5.99 0 0 0-4.793 2.39A6.483 6.483 0 0 0 10 16.5a6.483 6.483 0 0 0 4.793-2.11A5.99 5.99 0 0 0 10 12Z" clipRule="evenodd" />
                </svg>
                Sobre mí
              </h2>
              <p className="text-gray-600 leading-relaxed">{profile.bio}</p>

              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-6">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
                  </svg>
                  Desde {memberSince}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Experiences */}
      {profile.experiences.length > 0 && (
        <div className="px-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Experiencias</h2>
            <span className="text-sm text-gray-400">{profile.experiences.length}</span>
          </div>
          <div className="space-y-3">
            {profile.experiences.map((exp: any) => (
              <Link
                key={exp.id}
                href={`/experiences/${exp.id}`}
                className="bg-white rounded-2xl shadow-sm overflow-hidden block hover:shadow-md transition-all active:scale-[0.98]"
              >
                <div className="flex">
                  <div className="w-28 h-28 flex-shrink-0 relative">
                    {getExperienceImage(exp) ? (
                      <img
                        src={getExperienceImage(exp)!}
                        alt={exp.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                        <span className="text-4xl text-white/50">
                          {exp.type === 'pago' ? '🎭' : '🤝'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 p-4 min-w-0">
                    <p className="text-xs text-blue-600 font-medium mb-1">
                      {exp.festival.name}
                    </p>
                    <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm leading-tight">
                      {exp.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-2">
                      {exp.avgRating > 0 && (
                        <div className="flex items-center gap-1 text-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-500">
                            <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
                          </svg>
                          <span className="font-medium">{exp.avgRating.toFixed(1)}</span>
                        </div>
                      )}
                      {exp.price ? (
                        <span className="text-sm font-bold text-gray-900">{exp.price}€</span>
                      ) : (
                        <span className="text-xs bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full font-medium">
                          Intercambio
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center pr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-300">
                      <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      {profile.reviews && profile.reviews.length > 0 && (
        <div className="px-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Reseñas</h2>
            <span className="text-sm text-gray-400">{profile._count.reviewsReceived}</span>
          </div>
          <div className="space-y-3">
            {profile.reviews.slice(0, 5).map((review: any) => (
              <div key={review.id} className="bg-white rounded-2xl shadow-sm p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {getAvatarSrc(review.author.avatar) ? (
                      <img
                        src={getAvatarSrc(review.author.avatar)!}
                        alt={review.author.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-gray-400">
                        <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-gray-900">{review.author.name}</span>
                        {review.author.verified && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-500">
                            <path fillRule="evenodd" d="M16.403 12.652a3 3 0 0 0 0-5.304 3 3 0 0 0-3.75-3.751 3 3 0 0 0-5.305 0 3 3 0 0 0-3.751 3.75 3 3 0 0 0 0 5.305 3 3 0 0 0 3.75 3.751 3 3 0 0 0 5.305 0 3 3 0 0 0 3.751-3.75Zm-2.546-4.46a.75.75 0 0 0-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className={`w-4 h-4 ${i < review.rating ? 'text-amber-400' : 'text-gray-200'}`}
                          >
                            <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
                          </svg>
                        ))}
                      </div>
                    </div>
                    {review.experience && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {review.experience.title}
                      </p>
                    )}
                    {review.comment && (
                      <p className="text-gray-600 text-sm mt-2 leading-relaxed">{review.comment}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(review.createdAt).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact button (if not own profile) */}
      {!isOwnProfile && profile.experiences.length > 0 && (
        <div className="px-4 mt-6">
          <Link
            href={`/experiences/${profile.experiences[0].id}`}
            className="block w-full py-4 bg-blue-500 text-white font-semibold rounded-2xl text-center hover:bg-blue-600 transition-colors shadow-lg"
          >
            Ver experiencias de {profile.name.split(' ')[0]}
          </Link>
        </div>
      )}

      {/* Empty state */}
      {profile.experiences.length === 0 && !profile.bio && (
        <div className="px-4 mt-6">
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Perfil nuevo</h3>
            <p className="text-gray-500 text-sm">
              {isOwnProfile
                ? 'Completa tu perfil y crea tu primera experiencia'
                : `${profile.name} aún no tiene experiencias publicadas`}
            </p>
            {isOwnProfile && (
              <Link
                href="/experiences/create"
                className="inline-block mt-4 px-6 py-3 bg-blue-500 text-white font-semibold rounded-full hover:bg-blue-600 transition-colors"
              >
                Crear experiencia
              </Link>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
