import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://fiestapp.es';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Páginas estáticas
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/register`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/experiences`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/festivals`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  // Obtener experiencias dinámicas del API
  let experiencePages: MetadataRoute.Sitemap = [];
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    const response = await fetch(`${apiUrl}/experiences?published=true&limit=100`, {
      next: { revalidate: 3600 }, // Revalidar cada hora
    });

    if (response.ok) {
      const data = await response.json();
      const experiences = data.data || data;

      experiencePages = experiences.map((exp: { id: string; updatedAt?: string }) => ({
        url: `${BASE_URL}/experiences/${exp.id}`,
        lastModified: exp.updatedAt ? new Date(exp.updatedAt) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
    }
  } catch (error) {
    console.error('Error fetching experiences for sitemap:', error);
  }

  // Obtener festivales dinámicos del API
  let festivalPages: MetadataRoute.Sitemap = [];
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    const response = await fetch(`${apiUrl}/festivals`, {
      next: { revalidate: 86400 }, // Revalidar cada día
    });

    if (response.ok) {
      const data = await response.json();
      const festivals = data.data || data;

      festivalPages = festivals.map((fest: { id: string; updatedAt?: string }) => ({
        url: `${BASE_URL}/festivals/${fest.id}`,
        lastModified: fest.updatedAt ? new Date(fest.updatedAt) : new Date(),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }));
    }
  } catch (error) {
    console.error('Error fetching festivals for sitemap:', error);
  }

  return [...staticPages, ...experiencePages, ...festivalPages];
}
