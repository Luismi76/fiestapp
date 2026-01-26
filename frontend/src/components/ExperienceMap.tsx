'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Experience } from '@/types/experience';
import { getUploadUrl } from '@/lib/utils';

// Spanish city coordinates - Extended dictionary
const CITY_COORDINATES: Record<string, [number, number]> = {
  // Andalucía
  'Sevilla': [37.3891, -5.9845],
  'Málaga': [36.7213, -4.4214],
  'Malaga': [36.7213, -4.4214],
  'Cádiz': [36.5271, -6.2886],
  'Cadiz': [36.5271, -6.2886],
  'Córdoba': [37.8882, -4.7794],
  'Cordoba': [37.8882, -4.7794],
  'Granada': [37.1773, -3.5986],
  'Huelva': [37.2614, -6.9447],
  'Jaén': [37.7796, -3.7849],
  'Jaen': [37.7796, -3.7849],
  'Almería': [36.8340, -2.4637],
  'Almeria': [36.8340, -2.4637],
  'Jerez de la Frontera': [36.6869, -6.1359],
  'Jerez': [36.6869, -6.1359],
  'Marbella': [36.5099, -4.8862],
  'Ronda': [36.7462, -5.1611],
  'Nerja': [36.7580, -3.8760],
  'Antequera': [37.0193, -4.5617],
  'Ubeda': [38.0133, -3.3705],
  'Baeza': [37.9936, -3.4711],

  // Aragón
  'Zaragoza': [41.6488, -0.8891],
  'Huesca': [42.1401, -0.4089],
  'Teruel': [40.3456, -1.1065],

  // Asturias
  'Oviedo': [43.3614, -5.8593],
  'Gijón': [43.5322, -5.6611],
  'Gijon': [43.5322, -5.6611],
  'Avilés': [43.5547, -5.9248],
  'Aviles': [43.5547, -5.9248],

  // Islas Baleares
  'Palma de Mallorca': [39.5696, 2.6502],
  'Palma': [39.5696, 2.6502],
  'Ibiza': [38.9067, 1.4206],
  'Eivissa': [38.9067, 1.4206],
  'Mahón': [39.8886, 4.2658],
  'Mahon': [39.8886, 4.2658],
  'Menorca': [39.9496, 4.1104],

  // Islas Canarias
  'Las Palmas': [28.1235, -15.4363],
  'Las Palmas de Gran Canaria': [28.1235, -15.4363],
  'Santa Cruz de Tenerife': [28.4636, -16.2518],
  'Tenerife': [28.4636, -16.2518],

  // Cantabria
  'Santander': [43.4623, -3.8099],
  'Torrelavega': [43.3493, -4.0478],

  // Castilla-La Mancha
  'Toledo': [39.8628, -4.0273],
  'Albacete': [38.9943, -1.8585],
  'Ciudad Real': [38.9848, -3.9274],
  'Cuenca': [40.0704, -2.1374],
  'Guadalajara': [40.6337, -3.1669],
  'Talavera de la Reina': [39.9635, -4.8307],

  // Castilla y León
  'Valladolid': [41.6523, -4.7245],
  'Salamanca': [40.9701, -5.6635],
  'Burgos': [42.3439, -3.6969],
  'León': [42.5987, -5.5671],
  'Leon': [42.5987, -5.5671],
  'Palencia': [42.0096, -4.5289],
  'Zamora': [41.5034, -5.7467],
  'Ávila': [40.6564, -4.6816],
  'Avila': [40.6564, -4.6816],
  'Segovia': [40.9429, -4.1088],
  'Soria': [41.7636, -2.4649],

  // Cataluña
  'Barcelona': [41.3851, 2.1734],
  'Tarragona': [41.1189, 1.2445],
  'Lleida': [41.6176, 0.6200],
  'Girona': [41.9794, 2.8214],
  'Sitges': [41.2372, 1.8058],
  'Figueres': [42.2666, 2.9617],
  'Reus': [41.1558, 1.1066],

  // Comunidad Valenciana
  'Valencia': [39.4699, -0.3763],
  'Alicante': [38.3452, -0.4815],
  'Castellón': [39.9864, -0.0513],
  'Castellon': [39.9864, -0.0513],
  'Elche': [38.2669, -0.6983],
  'Benidorm': [38.5382, -0.1308],
  'Buñol': [39.4167, -0.7833],
  'Bunol': [39.4167, -0.7833],
  'Alcoy': [38.6988, -0.4735],

  // Extremadura
  'Badajoz': [38.8794, -6.9707],
  'Cáceres': [39.4753, -6.3724],
  'Caceres': [39.4753, -6.3724],
  'Mérida': [38.9160, -6.3436],
  'Merida': [38.9160, -6.3436],
  'Plasencia': [40.0303, -6.0906],

  // Galicia
  'Santiago de Compostela': [42.8782, -8.5448],
  'Santiago': [42.8782, -8.5448],
  'A Coruña': [43.3713, -8.3960],
  'La Coruña': [43.3713, -8.3960],
  'Vigo': [42.2406, -8.7207],
  'Ourense': [42.3364, -7.8636],
  'Lugo': [43.0097, -7.5568],
  'Pontevedra': [42.4310, -8.6444],

  // Madrid
  'Madrid': [40.4168, -3.7038],
  'Alcalá de Henares': [40.4819, -3.3635],
  'Getafe': [40.3086, -3.7330],
  'Móstoles': [40.3223, -3.8649],
  'Alcorcón': [40.3453, -3.8240],

  // Murcia
  'Murcia': [37.9922, -1.1307],
  'Cartagena': [37.6057, -0.9913],
  'Lorca': [37.6770, -1.7008],

  // Navarra
  'Pamplona': [42.8125, -1.6458],
  'Tudela': [42.0617, -1.6066],
  'Estella': [42.6712, -2.0317],

  // País Vasco
  'Bilbao': [43.263, -2.935],
  'San Sebastián': [43.3183, -1.9812],
  'San Sebastian': [43.3183, -1.9812],
  'Donostia': [43.3183, -1.9812],
  'Vitoria': [42.8467, -2.6726],
  'Vitoria-Gasteiz': [42.8467, -2.6726],

  // La Rioja
  'Logroño': [42.4668, -2.4498],
  'Logrono': [42.4668, -2.4498],
  'Haro': [42.5761, -2.8444],

  // Ceuta y Melilla
  'Ceuta': [35.8894, -5.3213],
  'Melilla': [35.2923, -2.9381],
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let MapContainer: React.ComponentType<any>, TileLayer: React.ComponentType<any>, Marker: React.ComponentType<any>, Popup: React.ComponentType<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let L: any;
let leafletReady = false;

export default function ExperienceMap({
  experiences,
  onExperienceClick,
  height = 'h-[50vh] sm:h-[400px] md:h-[500px]',
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
    if (filter === 'mixto') return exp.type === 'ambos';
    return exp.type === filter;
  });

  // Get coordinates for an experience (priority: experience coords > festival coords > dictionary)
  const getCoords = useCallback((exp: Experience): [number, number] | null => {
    // First try to use experience's own coordinates (from geocoding)
    if (exp.latitude && exp.longitude) {
      return [exp.latitude, exp.longitude];
    }

    // Then try festival coordinates if available
    if (exp.festival?.latitude && exp.festival?.longitude) {
      return [exp.festival.latitude, exp.festival.longitude];
    }

    // Then try the city from the experience in our dictionary
    const city = exp.city;
    if (!city) return null;

    if (CITY_COORDINATES[city]) return CITY_COORDINATES[city];

    // Try partial match
    const match = Object.keys(CITY_COORDINATES).find(c =>
      city.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(city.toLowerCase())
    );
    if (match) return CITY_COORDINATES[match];

    // Finally try the festival city
    const festivalCity = exp.festival?.city;
    if (festivalCity) {
      if (CITY_COORDINATES[festivalCity]) return CITY_COORDINATES[festivalCity];
      const festivalMatch = Object.keys(CITY_COORDINATES).find(c =>
        festivalCity.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(festivalCity.toLowerCase())
      );
      if (festivalMatch) return CITY_COORDINATES[festivalMatch];
    }

    return null;
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
      <div className={`${height} bg-gray-100 rounded-xl flex items-center justify-center`}>
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
    const coords = getCoords(exp);
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
      <div className={`${height} rounded-xl overflow-hidden`}>
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
                  <div className="min-w-[180px] max-w-[calc(100vw-4rem)] sm:max-w-[260px]">
                    <div className="font-bold mb-2 text-sm">
                      {exps[0].city} ({exps.length})
                    </div>
                    <div className="max-h-[200px] overflow-y-auto">
                      {exps.slice(0, 5).map(exp => (
                        <div
                          key={exp.id}
                          onClick={() => {
                            onExperienceClick?.(exp);
                            router.push(`/experiences/${exp.id}`);
                          }}
                          className="flex items-center gap-2 p-2 mb-1 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors"
                        >
                          <img
                            src={getUploadUrl(exp.photos?.[0] || '/images/placeholder.jpg')}
                            alt={exp.title}
                            className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold truncate">
                              {exp.title}
                            </div>
                            <div className={`text-[11px] ${exp.type === 'intercambio' ? 'text-emerald-500' : 'text-primary'}`}>
                              {exp.type === 'intercambio' ? 'Intercambio' : `${exp.price}€`}
                            </div>
                          </div>
                        </div>
                      ))}
                      {exps.length > 5 && (
                        <div className="text-center text-[11px] text-gray-500 p-1">
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
