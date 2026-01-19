'use client';

import { useEffect, useState } from 'react';
import { Experience } from '@/types/experience';
import { getUploadUrl } from '@/lib/utils';
import Link from 'next/link';

// Spanish city coordinates
const CITY_COORDINATES: Record<string, [number, number]> = {
  'Sevilla': [37.3891, -5.9845],
  'Madrid': [40.4168, -3.7038],
  'Barcelona': [41.3851, 2.1734],
  'Valencia': [39.4699, -0.3763],
  'Pamplona': [42.8125, -1.6458],
  'Bilbao': [43.263, -2.935],
  'Granada': [37.1773, -3.5986],
  'Malaga': [36.7213, -4.4214],
  'Cádiz': [36.5271, -6.2886],
  'Córdoba': [37.8882, -4.7794],
  'Alicante': [38.3452, -0.4815],
  'Zaragoza': [41.6488, -0.8891],
  'San Sebastián': [43.3183, -1.9812],
  'Salamanca': [40.9701, -5.6635],
  'Toledo': [39.8628, -4.0273],
  'Murcia': [37.9922, -1.1307],
  'Oviedo': [43.3614, -5.8593],
  'Santander': [43.4623, -3.8099],
  'Valladolid': [41.6523, -4.7245],
  'Santiago de Compostela': [42.8782, -8.5448],
  'Burgos': [42.3439, -3.6969],
  'Huelva': [37.2614, -6.9447],
  'Jerez de la Frontera': [36.6869, -6.1359],
  'Las Palmas': [28.1235, -15.4363],
  'Santa Cruz de Tenerife': [28.4636, -16.2518],
  'Palma de Mallorca': [39.5696, 2.6502],
  'Ibiza': [38.9067, 1.4206],
  'Vigo': [42.2406, -8.7207],
  'A Coruña': [43.3713, -8.3960],
  'Lleida': [41.6176, 0.6200],
  'Tarragona': [41.1189, 1.2445],
  'Girona': [41.9794, 2.8214],
  'Logroño': [42.4668, -2.4498],
};

interface ExperienceMapProps {
  experiences: Experience[];
  onExperienceClick?: (experience: Experience) => void;
  height?: string;
}

// Dynamically import Leaflet components (client-side only)
let MapContainer: any, TileLayer: any, Marker: any, Popup: any;
let L: any;
let isLeafletLoaded = false;

export default function ExperienceMap({ experiences, onExperienceClick, height = '400px' }: ExperienceMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  useEffect(() => {
    setIsClient(true);

    // Load Leaflet dynamically
    if (typeof window !== 'undefined' && !isLeafletLoaded) {
      Promise.all([
        import('leaflet'),
        import('react-leaflet'),
      ]).then(([leaflet, reactLeaflet]) => {
        L = leaflet.default;
        MapContainer = reactLeaflet.MapContainer;
        TileLayer = reactLeaflet.TileLayer;
        Marker = reactLeaflet.Marker;
        Popup = reactLeaflet.Popup;
        isLeafletLoaded = true;
        setLeafletLoaded(true);

        // Fix Leaflet icon issue
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });
      });
    } else if (isLeafletLoaded) {
      setLeafletLoaded(true);
    }
  }, []);

  if (!isClient || !leafletLoaded) {
    return (
      <div
        style={{ height }}
        className="bg-gray-100 rounded-2xl flex items-center justify-center"
      >
        <div className="text-center">
          <div className="spinner spinner-lg mx-auto mb-2" />
          <p className="text-sm text-gray-500">Cargando mapa...</p>
        </div>
      </div>
    );
  }

  // Group experiences by city
  const experiencesByCity: Record<string, Experience[]> = {};
  experiences.forEach(exp => {
    const city = exp.city || 'Unknown';
    if (!experiencesByCity[city]) {
      experiencesByCity[city] = [];
    }
    experiencesByCity[city].push(exp);
  });

  // Calculate center based on experiences
  const getCoords = (city: string): [number, number] => {
    // Try exact match
    if (CITY_COORDINATES[city]) return CITY_COORDINATES[city];
    // Try partial match
    const match = Object.keys(CITY_COORDINATES).find(c =>
      city.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(city.toLowerCase())
    );
    if (match) return CITY_COORDINATES[match];
    // Default to Madrid
    return CITY_COORDINATES['Madrid'];
  };

  const citiesWithCoords = Object.keys(experiencesByCity)
    .map(city => ({ city, coords: getCoords(city), experiences: experiencesByCity[city] }))
    .filter(c => c.coords);

  // Calculate center
  const center: [number, number] = citiesWithCoords.length > 0
    ? [
        citiesWithCoords.reduce((sum, c) => sum + c.coords[0], 0) / citiesWithCoords.length,
        citiesWithCoords.reduce((sum, c) => sum + c.coords[1], 0) / citiesWithCoords.length,
      ]
    : [40.4168, -3.7038]; // Default: Madrid

  return (
    <div style={{ height }} className="rounded-2xl overflow-hidden shadow-lg">
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
      />
      <MapContainer
        center={center}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {citiesWithCoords.map(({ city, coords, experiences: cityExperiences }) => (
          <Marker key={city} position={coords}>
            <Popup>
              <div className="min-w-[200px] max-w-[280px]">
                <h3 className="font-bold text-gray-900 mb-2 text-sm">{city}</h3>
                <p className="text-xs text-gray-500 mb-3">
                  {cityExperiences.length} experiencia{cityExperiences.length !== 1 ? 's' : ''}
                </p>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {cityExperiences.slice(0, 5).map(exp => (
                    <Link
                      key={exp.id}
                      href={`/experiences/${exp.id}`}
                      className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      onClick={() => onExperienceClick?.(exp)}
                    >
                      <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                        <img
                          src={getUploadUrl(exp.photos?.[0] || '/images/feria_abril.png')}
                          alt={exp.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 line-clamp-1">{exp.title}</p>
                        <p className="text-[10px] text-gray-500">{exp.festival?.name}</p>
                        {exp.type === 'intercambio' ? (
                          <span className="text-[10px] text-green-600">Intercambio</span>
                        ) : (
                          <span className="text-[10px] text-primary font-medium">{exp.price}€</span>
                        )}
                      </div>
                    </Link>
                  ))}
                  {cityExperiences.length > 5 && (
                    <p className="text-xs text-gray-400 text-center py-1">
                      +{cityExperiences.length - 5} más
                    </p>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
