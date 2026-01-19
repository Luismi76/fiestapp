'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { experiencesApi, walletApi, WalletInfo } from '@/lib/api';
import { Experience } from '@/types/experience';
import { getUploadUrl, getAvatarUrl } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

// Mock data como fallback
const mockExperiences = [
  {
    id: 'exp-1',
    title: 'Vive la Feria como un sevillano',
    description: 'Sumérgete en la magia de la Feria de Abril de la mano de una familia sevillana.',
    festival: { id: 'fest-feria', name: 'Feria de Abril', city: 'Sevilla' },
    city: 'Sevilla',
    price: 45,
    type: 'pago' as const,
    photos: ['/images/feria_abril.png'],
    host: { id: 'user-maria', name: 'María García', avatar: '/images/user_maria.png', verified: true },
    avgRating: 4.9,
    _count: { reviews: 127, matches: 3800 },
    hashtags: ['#FeriaDeAbril', '#Sevilla'],
  },
  {
    id: 'exp-2',
    title: 'Encierro y tapas tradicionales',
    description: 'Vive San Fermín como un pamplonés de verdad con acceso a balcón privilegiado.',
    festival: { id: 'fest-sanfermin', name: 'San Fermín', city: 'Pamplona' },
    city: 'Pamplona',
    price: undefined,
    type: 'intercambio' as const,
    photos: ['/images/san_fermin.png'],
    host: { id: 'user-carlos', name: 'Carlos Martínez', avatar: '/images/user_carlos.png', verified: true },
    avgRating: 4.8,
    _count: { reviews: 89, matches: 2100 },
    hashtags: ['#SanFermín', '#Encierros'],
  },
  {
    id: 'exp-3',
    title: 'Mascletà y paella valenciana',
    description: 'Siente el estruendo de la mascletà y disfruta de paella casera.',
    festival: { id: 'fest-fallas', name: 'Las Fallas', city: 'Valencia' },
    city: 'Valencia',
    price: 35,
    type: 'pago' as const,
    photos: ['/images/las_fallas.png'],
    host: { id: 'user-laura', name: 'Laura Vidal', avatar: '/images/user_laura.png', verified: true },
    avgRating: 5.0,
    _count: { reviews: 64, matches: 1500 },
    hashtags: ['#Fallas', '#Valencia'],
  },
  {
    id: 'exp-4',
    title: 'La batalla del tomate',
    description: 'Prepárate para la guerra más divertida del mundo con un veterano.',
    festival: { id: 'fest-tomatina', name: 'La Tomatina', city: 'Buñol' },
    city: 'Buñol',
    price: 25,
    type: 'ambos' as const,
    photos: ['/images/la_tomatina.png'],
    host: { id: 'user-pedro', name: 'Pedro Ruiz', avatar: '/images/user_pedro.png', verified: false },
    avgRating: 4.7,
    _count: { reviews: 203, matches: 4200 },
    hashtags: ['#Tomatina', '#Buñol'],
  },
  {
    id: 'exp-5',
    title: 'Procesiones y saetas',
    description: 'La Semana Santa de Sevilla es única. Vívela con un cofrade.',
    festival: { id: 'fest-semanasanta', name: 'Semana Santa', city: 'Sevilla' },
    city: 'Sevilla',
    price: 30,
    type: 'pago' as const,
    photos: ['/images/semana_santa.png'],
    host: { id: 'user-juan', name: 'Juan y Carmen', avatar: '/images/user_juan.png', verified: true },
    avgRating: 4.9,
    _count: { reviews: 156, matches: 3800 },
    hashtags: ['#SemanaSanta', '#Tradición'],
  },
  {
    id: 'exp-6',
    title: 'Carnaval gaditano auténtico',
    description: 'Ingenio, humor y fiesta sin parar con chirigotas y comparsas.',
    festival: { id: 'fest-carnaval', name: 'Carnaval de Cádiz', city: 'Cádiz' },
    city: 'Cádiz',
    price: undefined,
    type: 'intercambio' as const,
    photos: ['/images/carnaval.png'],
    host: { id: 'user-ana', name: 'Ana López', avatar: '/images/user_ana.png', verified: true },
    avgRating: 4.8,
    _count: { reviews: 92, matches: 2800 },
    hashtags: ['#Carnaval', '#Cádiz'],
  },
];

const mockHosts = [
  { id: 'user-maria', name: 'María García', location: 'Sevilla', avatar: '/images/user_maria.png', experiences: 1 },
  { id: 'user-carlos', name: 'Carlos Martínez', location: 'Pamplona', avatar: '/images/user_carlos.png', experiences: 1 },
  { id: 'user-ana', name: 'Ana López', location: 'Cádiz', avatar: '/images/user_ana.png', experiences: 1 },
  { id: 'user-laura', name: 'Laura Pérez', location: 'Valencia', avatar: '/images/user_laura.png', experiences: 1 },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user: authUser, isAuthenticated } = useAuth();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [useMockData, setUseMockData] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [wallet, setWallet] = useState<WalletInfo | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const expResponse = await experiencesApi.getAll({ limit: 20 });

        if (expResponse.data && expResponse.data.length > 0) {
          setExperiences(expResponse.data);
          setUseMockData(false);
        } else {
          setUseMockData(true);
        }
      } catch {
        setUseMockData(true);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Load wallet data if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      walletApi.getWallet()
        .then(setWallet)
        .catch(() => setWallet(null));
    }
  }, [isAuthenticated]);

  const displayExperiences = useMockData ? mockExperiences : experiences;

  // Seleccionar experiencia destacada aleatoria
  const featuredExperience = useMemo(() => {
    if (displayExperiences.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * displayExperiences.length);
    return displayExperiences[randomIndex];
  }, [displayExperiences]);

  // Excluir la destacada de las populares
  const popularExperiences = displayExperiences
    .filter(exp => exp.id !== featuredExperience?.id)
    .slice(0, 4);

  const getImageUrl = (exp: typeof mockExperiences[0] | Experience) => {
    if ('photos' in exp && exp.photos && exp.photos.length > 0) {
      const photo = exp.photos[0];
      if (photo.startsWith('/images/')) return photo;
      return getUploadUrl(photo);
    }
    return '/images/feria_abril.png';
  };

  const getHostAvatar = (avatar?: string) => {
    if (avatar) {
      if (avatar.startsWith('/images/')) return avatar;
      return getAvatarUrl(avatar);
    }
    return null;
  };

  const formatParticipants = (count: number) => {
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Por ahora solo log, en el futuro se puede implementar búsqueda
    console.log('Buscando:', searchQuery);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Hero Header con imagen de fondo */}
      <div className="relative">
        {/* Background con imagen de fiesta */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(/images/hero_fiesta.jpg)',
          }}
        >
          {/* Overlay oscuro para legibilidad */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />
        </div>

        {/* Content */}
        <div className="relative px-4 pt-4 pb-6">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-4">
            {/* Logo */}
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold text-white">Vive</span>
              <span className="text-2xl font-bold text-orange-400">Festas</span>
            </div>

            {/* Wallet button */}
            {isAuthenticated ? (
              <Link
                href="/wallet"
                className={`px-3 py-2 rounded-full backdrop-blur-sm flex items-center gap-1.5 border ${
                  wallet && !wallet.canOperate
                    ? 'bg-amber-500/20 border-amber-400/50'
                    : 'bg-white/10 border-white/20'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
                  <path d="M2.273 5.625A4.483 4.483 0 0 1 5.25 4.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0 0 18.75 3H5.25a3 3 0 0 0-2.977 2.625ZM2.273 8.625A4.483 4.483 0 0 1 5.25 7.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0 0 18.75 6H5.25a3 3 0 0 0-2.977 2.625ZM5.25 9a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h13.5a3 3 0 0 0 3-3v-6a3 3 0 0 0-3-3H15a.75.75 0 0 0-.75.75 2.25 2.25 0 0 1-4.5 0A.75.75 0 0 0 9 9H5.25Z" />
                </svg>
                <span className="text-white font-semibold text-sm">
                  {wallet ? `${wallet.balance.toFixed(2)}€` : '...'}
                </span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-3 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm font-medium"
              >
                Entrar
              </Link>
            )}
          </div>

          {/* Tagline */}
          <div className="text-center mb-4">
            <h1 className="text-xl font-bold text-white">Vive Fiestas como un Local</h1>
            <p className="text-white/70 text-sm mt-1">Descubre celebraciones únicas con anfitriones locales</p>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar"
              className="w-full pl-12 pr-12 py-3.5 bg-white rounded-full text-gray-900 placeholder-gray-400 shadow-lg text-base"
            />
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
              </svg>
            </button>
          </form>
        </div>
      </div>

      {/* Mock indicator */}
      {useMockData && (
        <div className="bg-amber-50 text-amber-700 text-xs px-4 py-2 text-center">
          Datos de demostración
        </div>
      )}

      {/* Experiencias Populares - Horizontal scroll */}
      <section className="py-5">
        <h2 className="font-bold text-gray-900 px-4 mb-3">Experiencias Populares</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 px-4 scrollbar-hide">
          {popularExperiences.map((exp: any) => (
            <Link
              key={exp.id}
              href={`/experiences/${exp.id}`}
              className="flex-shrink-0 w-28"
            >
              <div className="w-28 h-20 rounded-xl overflow-hidden mb-2 shadow-md">
                <img
                  src={getImageUrl(exp)}
                  alt={exp.festival?.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-xs font-semibold text-gray-900 leading-tight line-clamp-1">{exp.festival?.name}</p>
              <p className="text-xs text-gray-500">en {exp.city}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Experience - Hero Card */}
      {featuredExperience && (
        <section className="px-4 mb-6">
          <div className="relative rounded-2xl overflow-hidden shadow-lg">
            {/* Image */}
            <div className="aspect-[4/5] relative">
              <img
                src={getImageUrl(featuredExperience)}
                alt={featuredExperience.title}
                className="w-full h-full object-cover"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* Content overlay */}
              <div className="absolute inset-0 flex flex-col justify-between p-4">
                {/* Top info */}
                <div>
                  <h3 className="text-2xl font-bold text-white leading-tight">
                    {(featuredExperience as any).festival?.name} en {featuredExperience.city}
                  </h3>

                  <div className="flex items-center gap-2 mt-2 text-white/90 text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-red-400">
                      <path fillRule="evenodd" d="m11.54 22.351.07.04.028.016a.76.76 0 0 0 .723 0l.028-.015.071-.041a16.975 16.975 0 0 0 1.144-.742 19.58 19.58 0 0 0 2.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 0 0-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 0 0 2.682 2.282 16.975 16.975 0 0 0 1.145.742ZM12 13.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
                    </svg>
                    <span>Con {(featuredExperience as any).host?.name} · {featuredExperience.city}, España</span>
                  </div>

                  {/* Hashtags */}
                  <div className="flex gap-2 mt-2">
                    {((featuredExperience as any).hashtags || ['#' + (featuredExperience as any).festival?.name?.replace(/\s/g, ''), '#Tradición']).map((tag: string, i: number) => (
                      <span key={i} className="text-blue-300 text-sm font-medium">{tag}</span>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mt-3 text-white text-sm">
                    <div className="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
                      </svg>
                      <span>{formatParticipants((featuredExperience as any)._count?.matches || 3800)} Participantes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400">★</span>
                      <span>{((featuredExperience as any).avgRating || 4.9).toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom buttons */}
                <div className="flex gap-3 mt-auto pt-4">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      router.push(`/experiences/${featuredExperience.id}`);
                    }}
                    className="flex-1 py-3 bg-white text-gray-900 font-semibold rounded-full text-center hover:bg-gray-100 transition-colors"
                  >
                    Unirme
                  </button>
                  <Link
                    href={`/experiences/${featuredExperience.id}`}
                    className="flex-1 py-3 bg-blue-500 text-white font-semibold rounded-full text-center hover:bg-blue-600 transition-colors"
                  >
                    Ver Detalles
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Anfitriones Destacados */}
      <section className="py-4">
        <h2 className="font-bold text-gray-900 px-4 mb-3">Anfitriones Destacados</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 px-4 scrollbar-hide">
          {mockHosts.map((host) => (
            <Link
              key={host.id}
              href={`/profile/${host.id}`}
              className="flex-shrink-0 w-40"
            >
              <div className="relative w-40 h-28 rounded-xl overflow-hidden shadow-md">
                <img
                  src={getHostAvatar(host.avatar) || '/images/user_default.png'}
                  alt={host.name}
                  className="w-full h-full object-cover"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                {/* Name */}
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-white font-semibold text-sm">{host.name}, <span className="font-normal text-white/80">{host.location}</span></p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Más Experiencias */}
      <section className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Más Experiencias</h2>
          <span className="text-sm text-gray-500">{displayExperiences.length} disponibles</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="spinner spinner-lg" />
          </div>
        ) : displayExperiences.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {displayExperiences.slice(0, 6).map((exp: any) => (
              <Link
                key={exp.id}
                href={`/experiences/${exp.id}`}
                className="block bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="aspect-[4/3] relative">
                  <img
                    src={getImageUrl(exp)}
                    alt={exp.title}
                    className="w-full h-full object-cover"
                  />
                  {/* Price/Type badge */}
                  <div className="absolute top-2 right-2">
                    {exp.type === 'intercambio' && (
                      <span className="px-2 py-1 bg-teal-500 text-white text-xs font-medium rounded-full">Intercambio</span>
                    )}
                    {exp.type === 'pago' && (
                      <span className="px-2 py-1 bg-white/95 text-gray-900 text-xs font-bold rounded-full shadow">{exp.price}€</span>
                    )}
                    {exp.type === 'ambos' && (
                      <span className="px-2 py-1 bg-purple-500 text-white text-xs font-medium rounded-full">Flexible</span>
                    )}
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-xs text-blue-600 font-medium mb-1">{exp.festival?.name}</p>
                  <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 leading-tight">{exp.title}</h3>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-200">
                        {getHostAvatar(exp.host?.avatar) ? (
                          <img src={getHostAvatar(exp.host.avatar)!} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] bg-gradient-to-br from-blue-100 to-pink-100 text-gray-600">
                            {exp.host?.name?.charAt(0)}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-600">{exp.host?.name?.split(' ')[0]}</span>
                    </div>
                    {exp.avgRating > 0 && (
                      <div className="flex items-center gap-0.5 text-xs">
                        <span className="text-yellow-500">★</span>
                        <span className="font-medium text-gray-700">{exp.avgRating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🔍</span>
            </div>
            <p className="text-gray-500 mb-2">No hay experiencias disponibles</p>
          </div>
        )}
      </section>

      <BottomNav />
    </div>
  );
}
