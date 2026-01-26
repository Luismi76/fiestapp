/**
 * Mock data para matches - Solo usar en desarrollo
 * Estos datos se cargan como fallback cuando la API no esta disponible
 */

import { Match, MatchStatus } from '@/types/match';

// Configuracion de estados para UI
export const statusConfig: Record<MatchStatus, { label: string; bg: string; text: string; dot: string }> = {
  pending: { label: 'Pendiente', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  accepted: { label: 'Aceptada', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  rejected: { label: 'Rechazada', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  cancelled: { label: 'Cancelada', bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' },
  completed: { label: 'Completada', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
};

// Helper para crear fechas relativas para mock data
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

// Mock experience base (tipado parcial para evitar any)
interface MockExperience {
  id: string;
  title: string;
  city: string;
  type: 'pago' | 'intercambio' | 'ambos';
  price?: number;
  photos: string[];
  festival: { id: string; name: string; city: string };
}

// Mock data para solicitudes enviadas
export const mockSentMatches: Match[] = [
  {
    id: '10',
    status: 'accepted',
    createdAt: daysAgo(3),
    updatedAt: new Date().toISOString(),
    experienceId: '1',
    requesterId: 'me',
    hostId: '1',
    experience: {
      id: '1',
      title: 'Vive la Feria como un sevillano',
      city: 'Sevilla',
      type: 'pago',
      price: 45,
      photos: ['/images/feria_abril.png'],
      festival: { id: '1', name: 'Feria de Abril', city: 'Sevilla' },
    } as MockExperience & Match['experience'],
    requester: {
      id: 'me',
      name: 'Yo',
      verified: false,
    },
    host: {
      id: '1',
      name: 'Maria Garcia',
      avatar: '/images/user_maria.png',
      verified: true,
      city: 'Sevilla',
    },
    _count: { messages: 8 },
    unreadCount: 1,
    lastMessage: {
      content: 'Hola! Me alegra que te interese. Para que fechas vienes a Sevilla?',
      createdAt: daysAgo(2),
      senderId: '1',
    },
  },
  {
    id: '11',
    status: 'pending',
    createdAt: hoursAgo(12),
    updatedAt: new Date().toISOString(),
    experienceId: '2',
    requesterId: 'me',
    hostId: '2',
    experience: {
      id: '2',
      title: 'Encierro y tapas tradicionales',
      city: 'Pamplona',
      type: 'intercambio',
      photos: ['/images/san_fermin.png'],
      festival: { id: '2', name: 'San Fermin', city: 'Pamplona' },
    } as MockExperience & Match['experience'],
    requester: {
      id: 'me',
      name: 'Yo',
      verified: false,
    },
    host: {
      id: '2',
      name: 'Carlos Martinez',
      avatar: '/images/user_carlos.png',
      verified: true,
      city: 'Pamplona',
    },
    _count: { messages: 1 },
    unreadCount: 0,
    lastMessage: {
      content: 'Hola Carlos! Me interesa mucho tu experiencia.',
      createdAt: hoursAgo(12),
      senderId: 'me',
    },
  },
  {
    id: '12',
    status: 'completed',
    createdAt: daysAgo(14),
    updatedAt: new Date().toISOString(),
    experienceId: '6',
    requesterId: 'me',
    hostId: '6',
    experience: {
      id: '6',
      title: 'Carnaval gaditano autentico',
      city: 'Cadiz',
      type: 'intercambio',
      photos: ['/images/carnaval.png'],
      festival: { id: '6', name: 'Carnaval de Cadiz', city: 'Cadiz' },
    } as MockExperience & Match['experience'],
    requester: {
      id: 'me',
      name: 'Yo',
      verified: false,
    },
    host: {
      id: '6',
      name: 'Ana Lopez',
      avatar: '/images/user_ana.png',
      verified: true,
      city: 'Cadiz',
    },
    _count: { messages: 15 },
    unreadCount: 0,
    lastMessage: {
      content: 'Fue increible! Muchas gracias por todo!',
      createdAt: daysAgo(13),
      senderId: 'me',
    },
  },
];

// Mock data para solicitudes recibidas
export const mockReceivedMatches: Match[] = [
  {
    id: '1',
    status: 'pending',
    createdAt: hoursAgo(2),
    updatedAt: new Date().toISOString(),
    experienceId: '1',
    requesterId: '3',
    hostId: 'me',
    experience: {
      id: '1',
      title: 'Vive la Feria como un sevillano',
      city: 'Sevilla',
      type: 'pago',
      price: 45,
      photos: ['/images/feria_abril.png'],
      festival: { id: '1', name: 'Feria de Abril', city: 'Sevilla' },
    } as MockExperience & Match['experience'],
    requester: {
      id: '3',
      name: 'Laura Martinez',
      avatar: '/images/user_laura.png',
      verified: true,
      city: 'Madrid',
    },
    host: {
      id: 'me',
      name: 'Yo',
      verified: true,
    },
    _count: { messages: 3 },
    unreadCount: 2,
    lastMessage: {
      content: 'Me encantaria vivir la Feria con un local!',
      createdAt: hoursAgo(1),
      senderId: '3',
    },
  },
  {
    id: '2',
    status: 'accepted',
    createdAt: daysAgo(5),
    updatedAt: new Date().toISOString(),
    experienceId: '1',
    requesterId: '4',
    hostId: 'me',
    experience: {
      id: '1',
      title: 'Vive la Feria como un sevillano',
      city: 'Sevilla',
      type: 'pago',
      price: 45,
      photos: ['/images/feria_abril.png'],
      festival: { id: '1', name: 'Feria de Abril', city: 'Sevilla' },
    } as MockExperience & Match['experience'],
    requester: {
      id: '4',
      name: 'Pedro Sanchez',
      avatar: '/images/user_pedro.png',
      verified: false,
      city: 'Barcelona',
    },
    host: {
      id: 'me',
      name: 'Yo',
      verified: true,
    },
    _count: { messages: 12 },
    unreadCount: 0,
    lastMessage: {
      content: 'Perfecto, nos vemos el sabado entonces!',
      createdAt: daysAgo(1),
      senderId: 'me',
    },
  },
];
