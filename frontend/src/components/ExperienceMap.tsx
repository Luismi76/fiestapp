'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Experience } from '@/types/experience';
import { getUploadUrl } from '@/lib/utils';

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
  'Málaga': [36.7213, -4.4214],
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
  'Buñol': [39.4167, -0.7833],
};

export type MapFilter = 'all' | 'intercambio' | 'pago' | 'mixto';

interface ExperienceMapProps {
  experiences: Experience[];
  onExperienceClick?: (experience: Experience) => void;
  height?: string;
  filter?: MapFilter;
}

// Get marker color based on type
const getMarkerColor = (type: string | undefined | null): string => {
  if (type === 'intercambio') return '#10B981'; // green
  if (type === 'pago') return '#FF6B35'; // orange
  return '#8B5CF6'; // purple for mixto/ambos/unknown
};

// Dynamically import Leaflet components (client-side only)
let MapContainer: any, TileLayer: any, Marker: any, Popup: any;
let L: any;
let leafletReady = false;

export default function ExperienceMap({
  experiences,
  onExperienceClick,
  height = '400px',
  filter = 'all',
}: ExperienceMapProps) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (leafletReady) {
      setReady(true);
      return;
    }

    Promise.all([
      import('leaflet'),
      import('react-leaflet'),
    ]).then(([leaflet, reactLeaflet]) => {
      L = leaflet.default;
      MapContainer = reactLeaflet.MapContainer;
      TileLayer = reactLeaflet.TileLayer;
      Marker = reactLeaflet.Marker;
      Popup = reactLeaflet.Popup;
      leafletReady = true;
      setReady(true);
    });
  }, []);

  // Filter experiences
  const filteredExperiences = experiences.filter(exp => {
    if (filter === 'all') return true;
    if (filter === 'mixto') return exp.type === 'mixto' || exp.type === 'ambos';
    return exp.type === filter;
  });

  // Get coordinates for a city
  const getCoords = useCallback((city: string): [number, number] | null => {
    if (!city) return null;
    if (CITY_COORDINATES[city]) return CITY_COORDINATES[city];
    const match = Object.keys(CITY_COORDINATES).find(c =>
      city.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(city.toLowerCase())
    );
    return match ? CITY_COORDINATES[match] : null;
  }, []);

  // Create icon
  const createIcon = useCallback((type: string | undefined | null) => {
    if (!L) return null;
    const color = getMarkerColor(type);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36"><path d="M14 0C6.268 0 0 6.268 0 14c0 7.732 14 22 14 22s14-14.268 14-22C28 6.268 21.732 0 14 0z" fill="${color}" stroke="#fff" stroke-width="2"/><circle cx="14" cy="12" r="5" fill="#fff"/></svg>`;
    return L.icon({
      iconUrl: `data:image/svg+xml,${encodeURIComponent(svg)}`,
      iconSize: [28, 36],
      iconAnchor: [14, 36],
      popupAnchor: [0, -36],
    });
  }, []);

  if (!ready) {
    return (
      <div style={{ height }} className="bg-gray-100 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-500">Cargando mapa...</p>
        </div>
      </div>
    );
  }

  // Group experiences by location
  const byLocation: Record<string, Experience[]> = {};
  filteredExperiences.forEach(exp => {
    const coords = getCoords(exp.city);
    if (coords) {
      const key = `${coords[0]},${coords[1]}`;
      if (!byLocation[key]) byLocation[key] = [];
      byLocation[key].push(exp);
    }
  });

  // Calculate center
  const locations = Object.keys(byLocation);
  const center: [number, number] = locations.length > 0
    ? [
        locations.reduce((sum, k) => sum + parseFloat(k.split(',')[0]), 0) / locations.length,
        locations.reduce((sum, k) => sum + parseFloat(k.split(',')[1]), 0) / locations.length,
      ]
    : [40.4168, -3.7038];

  return (
    <>
      <style>{`
        .leaflet-container { z-index: 1 !important; }
        .leaflet-pane { z-index: 1 !important; }
        .leaflet-tile-pane { z-index: 1 !important; }
        .leaflet-overlay-pane { z-index: 2 !important; }
        .leaflet-marker-pane { z-index: 3 !important; }
        .leaflet-tooltip-pane { z-index: 4 !important; }
        .leaflet-popup-pane { z-index: 5 !important; }
        .leaflet-control { z-index: 10 !important; }
        .leaflet-top, .leaflet-bottom { z-index: 10 !important; }
        .leaflet-popup-content-wrapper { border-radius: 12px !important; padding: 0 !important; }
        .leaflet-popup-content { margin: 8px !important; }
        .leaflet-popup-close-button { display: none !important; }
      `}</style>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
      <div style={{ height }} className="rounded-xl overflow-hidden">
        <MapContainer
          center={center}
          zoom={6}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          {Object.entries(byLocation).map(([key, exps]) => {
            const [lat, lng] = key.split(',').map(Number);
            const mainType = exps.length > 1
              ? (exps.some(e => e.type === 'intercambio') && exps.some(e => e.type === 'pago') ? 'mixto' : exps[0]?.type)
              : exps[0]?.type;

            return (
              <Marker key={key} position={[lat, lng]} icon={createIcon(mainType)}>
                <Popup>
                  <div style={{ minWidth: 200, maxWidth: 260 }}>
                    <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 14 }}>
                      {exps[0].city} ({exps.length})
                    </div>
                    <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                      {exps.slice(0, 5).map(exp => (
                        <div
                          key={exp.id}
                          onClick={() => {
                            onExperienceClick?.(exp);
                            router.push(`/experiences/${exp.id}`);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: 8,
                            marginBottom: 4,
                            background: '#f5f5f5',
                            borderRadius: 8,
                            cursor: 'pointer',
                          }}
                        >
                          <img
                            src={getUploadUrl(exp.photos?.[0] || '/images/placeholder.jpg')}
                            alt={exp.title}
                            style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {exp.title}
                            </div>
                            <div style={{ fontSize: 11, color: exp.type === 'intercambio' ? '#10B981' : '#FF6B35' }}>
                              {exp.type === 'intercambio' ? 'Intercambio' : `${exp.price}€`}
                            </div>
                          </div>
                        </div>
                      ))}
                      {exps.length > 5 && (
                        <div style={{ textAlign: 'center', fontSize: 11, color: '#888', padding: 4 }}>
                          +{exps.length - 5} más
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </>
  );
}
