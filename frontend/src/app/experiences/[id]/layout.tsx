import { Metadata } from 'next';
import { ReactNode } from 'react';

interface Props {
  params: Promise<{ id: string }>;
  children: ReactNode;
}

// Fetch experience data for metadata
async function getExperience(id: string) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    const response = await fetch(`${apiUrl}/experiences/${id}`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const experience = await getExperience(id);

  if (!experience) {
    return {
      title: 'Experiencia no encontrada',
      description: 'La experiencia que buscas no está disponible',
    };
  }

  const title = experience.festival
    ? `${experience.festival.name} en ${experience.city} con ${experience.host?.name || 'anfitrión local'}`
    : experience.title;

  const description = experience.description?.substring(0, 160) ||
    `Vive ${experience.title} en ${experience.city} con un anfitrión local. Experiencia auténtica en FiestApp.`;

  const imageUrl = experience.photos?.[0]
    ? experience.photos[0].startsWith('http')
      ? experience.photos[0]
      : `${process.env.NEXT_PUBLIC_CLOUDINARY_URL || ''}/${experience.photos[0]}`
    : '/images/og-image.jpg';

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://fiestapp.es';
  const url = `${baseUrl}/experiences/${id}`;

  return {
    title,
    description,
    openGraph: {
      type: 'article',
      locale: 'es_ES',
      url,
      siteName: 'FiestApp',
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: url,
    },
    other: {
      'og:price:amount': experience.price?.toString() || '',
      'og:price:currency': 'EUR',
      'product:availability': 'in stock',
    },
  };
}

export default function ExperienceLayout({ children }: Props) {
  return <>{children}</>;
}
