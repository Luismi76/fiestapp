'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
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
  showClustering?: boolean;
}

// Helper to encode SVG for data URI (handles Unicode)
const encodeSvgForDataUri = (svg: string): string => {
  return `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;
};

// Custom marker icons as SVG data URIs
const createMarkerIcon = (type: string | undefined | null, count?: number) => {
  const defaultColor = { bg: '#8B5CF6', border: '#7C3AED' }; // purple as default
  const colors: Record<string, { bg: string; border: string }> = {
    intercambio: { bg: '#10B981', border: '#059669' }, // green
    pago: { bg: '#FF6B35', border: '#E55A2B' }, // primary orange
    mixto: defaultColor, // purple
    ambos: defaultColor, // purple (same as mixto)
    cluster: { bg: '#3B82F6', border: '#2563EB' }, // blue
  };

  // Fallback to default color if type not found or undefined/null
  const { bg, border } = (type && colors[type]) ? colors[type] : defaultColor;

  if (type === 'cluster' && count) {
    // Cluster icon with count
    const size = count > 99 ? 50 : count > 9 ? 44 : 38;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${bg}" stroke="${border}" stroke-width="3"/><text x="50%" y="50%" text-anchor="middle" dy=".35em" fill="white" font-family="system-ui, sans-serif" font-size="${count > 99 ? 12 : 14}" font-weight="bold">${count}</text></svg>`;
    return encodeSvgForDataUri(svg);
  }

  // Regular marker icon - use E character instead of € symbol to avoid encoding issues
  const innerIcon = type === 'intercambio'
    ? `<path d="M13 14h6M16 11v6" stroke="${bg}" stroke-width="2" stroke-linecap="round"/>`
    : type === 'pago'
    ? `<text x="16" y="17" text-anchor="middle" fill="${bg}" font-family="system-ui" font-size="10" font-weight="bold">E</text>`
    : `<path d="M13 12l3 4 3-4M13 16l3-4 3 4" stroke="${bg}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40"><defs><filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/></filter></defs><path filter="url(#shadow)" d="M16 0C7.163 0 0 7.163 0 16c0 8.837 16 24 16 24s16-15.163 16-24C32 7.163 24.837 0 16 0z" fill="${bg}" stroke="${border}" stroke-width="2"/><circle cx="16" cy="14" r="6" fill="white"/>${innerIcon}</svg>`;

  return encodeSvgForDataUri(svg);
};

// Map tile styles
const MAP_STYLES = {
  cartodb_voyager: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  cartodb_light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  stadia_alidade: {
    url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
  },
};

// Dynamically import Leaflet components (client-side only)
let MapContainer: any, TileLayer: any, Marker: any, Popup: any, useMap: any;
let MarkerClusterGroup: any;
let L: any;
let isLeafletLoaded = false;

// Component to handle map animations
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    if (map && center) {
      map.flyTo(center, zoom, {
        duration: 1.5,
        easeLinearity: 0.25,
      });
    }
  }, [map, center, zoom]);

  return null;
}

export default function ExperienceMap({
  experiences,
  onExperienceClick,
  height = '400px',
  filter = 'all',
  showClustering = true,
}: ExperienceMapProps) {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.4168, -3.7038]);
  const [mapZoom, setMapZoom] = useState(6);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    setIsClient(true);

    // Load Leaflet dynamically
    if (typeof window !== 'undefined' && !isLeafletLoaded) {
      Promise.all([
        import('leaflet'),
        import('react-leaflet'),
        import('react-leaflet-cluster'),
      ]).then(([leaflet, reactLeaflet, cluster]) => {
        L = leaflet.default;
        MapContainer = reactLeaflet.MapContainer;
        TileLayer = reactLeaflet.TileLayer;
        Marker = reactLeaflet.Marker;
        Popup = reactLeaflet.Popup;
        useMap = reactLeaflet.useMap;
        MarkerClusterGroup = cluster.default;
        isLeafletLoaded = true;
        setLeafletLoaded(true);
      });
    } else if (isLeafletLoaded) {
      setLeafletLoaded(true);
    }
  }, []);

  // Filter experiences
  const filteredExperiences = experiences.filter(exp => {
    if (filter === 'all') return true;
    return exp.type === filter;
  });

  // Get coordinates for a city
  const getCoords = useCallback((city: string): [number, number] | null => {
    if (!city) return null;
    // Try exact match
    if (CITY_COORDINATES[city]) return CITY_COORDINATES[city];
    // Try partial match
    const match = Object.keys(CITY_COORDINATES).find(c =>
      city.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(city.toLowerCase())
    );
    if (match) return CITY_COORDINATES[match];
    return null;
  }, []);

  // Calculate center based on experiences
  useEffect(() => {
    if (filteredExperiences.length > 0) {
      const validCoords = filteredExperiences
        .map(exp => getCoords(exp.city))
        .filter((c): c is [number, number] => c !== null);

      if (validCoords.length > 0) {
        const newCenter: [number, number] = [
          validCoords.reduce((sum, c) => sum + c[0], 0) / validCoords.length,
          validCoords.reduce((sum, c) => sum + c[1], 0) / validCoords.length,
        ];
        setMapCenter(newCenter);
      }
    }
  }, [filteredExperiences, getCoords]);

  // Create custom icon for a marker
  const createIcon = useCallback((type: string) => {
    if (!L) return null;
    return L.icon({
      iconUrl: createMarkerIcon(type),
      iconSize: [32, 40],
      iconAnchor: [16, 40],
      popupAnchor: [0, -40],
    });
  }, []);

  // Create cluster icon
  const createClusterIcon = useCallback((cluster: any) => {
    if (!L) return null;
    const count = cluster.getChildCount();
    const size = count > 99 ? 50 : count > 9 ? 44 : 38;
    return L.divIcon({
      html: `<div class="cluster-marker" style="
        width: ${size}px;
        height: ${size}px;
        background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
        border: 3px solid #1D4ED8;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${count > 99 ? 12 : 14}px;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        transition: transform 0.2s ease;
      ">${count}</div>`,
      className: 'custom-cluster-icon',
      iconSize: L.point(size, size),
    });
  }, []);

  if (!isClient || !leafletLoaded) {
    return (
      <div
        style={{ height }}
        className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center"
      >
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-sm text-gray-500 font-medium">Cargando mapa...</p>
        </div>
      </div>
    );
  }

  // Group experiences by exact location for popup
  const experiencesByLocation: Record<string, Experience[]> = {};
  filteredExperiences.forEach(exp => {
    const coords = getCoords(exp.city);
    if (coords) {
      const key = `${coords[0]},${coords[1]}`;
      if (!experiencesByLocation[key]) {
        experiencesByLocation[key] = [];
      }
      experiencesByLocation[key].push(exp);
    }
  });

  const tileStyle = MAP_STYLES.cartodb_voyager;

  // Render individual markers (for when clustering is disabled or for popup content)
  const renderMarkers = () => {
    return Object.entries(experiencesByLocation).map(([key, exps]) => {
      const [lat, lng] = key.split(',').map(Number);
      // Determine marker type - normalize 'ambos' to 'mixto', handle multiple experiences
      const getMarkerType = (): string => {
        if (exps.length > 1) {
          const hasIntercambio = exps.some(e => e.type === 'intercambio');
          const hasPago = exps.some(e => e.type === 'pago' || e.type === 'ambos');
          if (hasIntercambio && hasPago) return 'mixto';
        }
        const type = exps[0]?.type;
        if (!type) return 'mixto'; // Default fallback
        // Normalize 'ambos' to 'mixto'
        return type === 'ambos' ? 'mixto' : type;
      };
      const mainType = getMarkerType();
      const icon = createIcon(mainType);

      return (
        <Marker
          key={key}
          position={[lat, lng]}
          icon={icon}
          eventHandlers={{
            click: () => {
              if (exps.length === 1) {
                onExperienceClick?.(exps[0]);
              }
            },
          }}
        >
          <Popup className="custom-popup">
            <div className="min-w-[240px] max-w-[300px] p-1">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 text-base">{exps[0].city}</h3>
                <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600">
                  {exps.length} {exps.length === 1 ? 'experiencia' : 'experiencias'}
                </span>
              </div>
              <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar">
                {exps.slice(0, 6).map(exp => (
                  <div
                    key={exp.id}
                    className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-200 group cursor-pointer"
                    onClick={() => {
                      onExperienceClick?.(exp);
                      router.push(`/experiences/${exp.id}`);
                    }}
                  >
                    <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 ring-2 ring-white shadow-sm">
                      <img
                        src={getUploadUrl(exp.photos?.[0] || '/images/feria_abril.png')}
                        alt={exp.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 line-clamp-1 group-hover:text-primary transition-colors">
                        {exp.title}
                      </p>
                      <p className="text-xs text-gray-500 line-clamp-1">{exp.festival?.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {exp.type === 'intercambio' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            Intercambio
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-primary">{exp.price}€</span>
                        )}
                        {exp.avgRating && exp.avgRating > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-gray-500">
                            <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            {exp.avgRating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                ))}
                {exps.length > 6 && (
                  <div className="text-center py-2">
                    <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                      +{exps.length - 6} más
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      );
    });
  };

  return (
    <div style={{ height }} className="rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/5">
      <style jsx global>{`
        .leaflet-popup-content-wrapper {
          border-radius: 16px !important;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15) !important;
          padding: 0 !important;
        }
        .leaflet-popup-content {
          margin: 12px !important;
        }
        .leaflet-popup-tip {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
        .custom-cluster-icon:hover .cluster-marker {
          transform: scale(1.1);
        }
        .leaflet-marker-icon {
          transition: transform 0.2s ease !important;
        }
        .leaflet-marker-icon:hover {
          transform: scale(1.1) !important;
          z-index: 500 !important;
        }
      `}</style>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
      />
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        ref={mapRef}
        zoomControl={true}
        className="z-0"
      >
        <TileLayer
          attribution={tileStyle.attribution}
          url={tileStyle.url}
        />
        {showClustering && MarkerClusterGroup ? (
          <MarkerClusterGroup
            chunkedLoading
            iconCreateFunction={createClusterIcon}
            maxClusterRadius={60}
            spiderfyOnMaxZoom={true}
            showCoverageOnHover={false}
            animate={true}
            animateAddingMarkers={true}
          >
            {renderMarkers()}
          </MarkerClusterGroup>
        ) : (
          renderMarkers()
        )}
      </MapContainer>
    </div>
  );
}
