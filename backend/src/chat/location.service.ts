import { Injectable } from '@nestjs/common';

interface NominatimResponse {
  display_name: string;
  address: {
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    country?: string;
  };
}

@Injectable()
export class LocationService {
  private readonly nominatimUrl = 'https://nominatim.openstreetmap.org';
  private readonly userAgent = 'FiestApp/1.0';

  async reverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<string> {
    try {
      const response = await fetch(
        `${this.nominatimUrl}/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': this.userAgent,
          },
        },
      );

      if (!response.ok) {
        throw new Error('Nominatim API error');
      }

      const data: NominatimResponse = await response.json();

      // Construir nombre legible
      return this.formatLocationName(data);
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      // Devolver coordenadas formateadas como fallback
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
  }

  private formatLocationName(data: NominatimResponse): string {
    const parts: string[] = [];
    const address = data.address;

    // Añadir calle si existe
    if (address.road) {
      parts.push(address.road);
    }

    // Añadir barrio si existe
    if (address.suburb) {
      parts.push(address.suburb);
    }

    // Añadir ciudad/pueblo
    const city = address.city || address.town || address.village || address.municipality;
    if (city) {
      parts.push(city);
    }

    // Si no tenemos mucha info, usar el nombre completo
    if (parts.length === 0) {
      // Limpiar el display_name para hacerlo más legible
      const displayParts = data.display_name.split(',').slice(0, 3);
      return displayParts.join(', ').trim();
    }

    return parts.join(', ');
  }

  // Generar URL para abrir en app de mapas
  getMapUrl(latitude: number, longitude: number, name?: string): {
    googleMaps: string;
    appleMaps: string;
  } {
    const encodedName = name ? encodeURIComponent(name) : '';

    return {
      googleMaps: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}${encodedName ? `&query_place_id=${encodedName}` : ''}`,
      appleMaps: `https://maps.apple.com/?ll=${latitude},${longitude}&q=${encodedName || 'Ubicación'}`,
    };
  }
}
