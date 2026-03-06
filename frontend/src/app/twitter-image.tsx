import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'FiestApp - Vive las Fiestas desde Dentro';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f4c4a 0%, #134e4a 30%, #1a6b5c 60%, #0f4c4a 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: 'absolute',
            top: -80,
            right: -80,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'rgba(255, 107, 53, 0.15)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -120,
            left: -60,
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'rgba(139, 92, 246, 0.1)',
            display: 'flex',
          }}
        />

        {/* Logo icon */}
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 28,
            background: 'rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
            border: '2px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <svg
            width="70"
            height="70"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
            <path d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            fontSize: 72,
            fontWeight: 800,
            color: 'white',
            letterSpacing: '-2px',
            marginBottom: 16,
          }}
        >
          FiestApp
        </div>

        {/* Tagline */}
        <div
          style={{
            display: 'flex',
            fontSize: 28,
            color: 'rgba(255, 255, 255, 0.8)',
            fontWeight: 400,
            marginBottom: 48,
          }}
        >
          Vive las fiestas como un local
        </div>

        {/* Feature pills */}
        <div
          style={{
            display: 'flex',
            gap: 16,
          }}
        >
          {['Feria de Abril', 'San Fermin', 'Las Fallas', 'La Tomatina'].map(
            (fest) => (
              <div
                key={fest}
                style={{
                  padding: '10px 24px',
                  borderRadius: 50,
                  background: 'rgba(255, 255, 255, 0.12)',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: 18,
                  fontWeight: 500,
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                }}
              >
                {fest}
              </div>
            ),
          )}
        </div>

        {/* Bottom accent line */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 6,
            background: 'linear-gradient(90deg, #FF6B35 0%, #8B5CF6 50%, #FF6B35 100%)',
            display: 'flex',
          }}
        />
      </div>
    ),
    {
      ...size,
    },
  );
}
