'use client';

interface LocationMessageProps {
  latitude: number;
  longitude: number;
  locationName?: string;
  isOwn?: boolean;
}

export default function LocationMessage({
  latitude,
  longitude,
  locationName,
  isOwn = false,
}: LocationMessageProps) {
  // OpenStreetMap embed URL
  const osmMapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.005},${latitude - 0.003},${longitude + 0.005},${latitude + 0.003}&layer=mapnik&marker=${latitude},${longitude}`;

  const openInMaps = () => {
    // Use geo: URI scheme which works on mobile devices
    // Falls back to Google Maps on desktop browsers
    const geoUrl = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(locationName || 'Ubicación')})`;
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

    // Try geo: first (works on mobile), fallback to Google Maps
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      // On mobile, geo: URI will open the default maps app
      window.location.href = geoUrl;
    } else {
      // On desktop, open Google Maps in new tab
      window.open(googleMapsUrl, '_blank');
    }
  };

  return (
    <div
      className={`rounded-2xl overflow-hidden ${
        isOwn ? 'bg-primary/10' : 'bg-gray-100'
      }`}
    >
      {/* Map preview */}
      <div
        className="relative h-32 bg-gray-200 cursor-pointer"
        onClick={openInMaps}
      >
        <iframe
          src={osmMapUrl}
          className="w-full h-full border-0 pointer-events-none"
          title="Ubicación"
          loading="lazy"
        />
      </div>

      {/* Location info */}
      <div className="p-3">
        <div className="flex items-start gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {locationName || 'Ubicación compartida'}
            </p>
            <p className="text-xs text-gray-500">
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </p>
          </div>
        </div>

        {/* Single action button */}
        <button
          onClick={openInMaps}
          className="w-full mt-3 text-sm text-center py-2.5 px-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
          </svg>
          Abrir en Mapas
        </button>
      </div>
    </div>
  );
}
