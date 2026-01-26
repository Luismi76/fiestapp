'use client';

import { useState, useEffect, useCallback } from 'react';
import { favoritesApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import logger from '@/lib/logger';

interface FavoriteButtonProps {
  entityType: 'experience' | 'festival';
  entityId: string;
  size?: 'sm' | 'md' | 'lg';
  showAlert?: boolean;
  className?: string;
  onToggle?: (isFavorite: boolean) => void;
}

export default function FavoriteButton({
  entityType,
  entityId,
  size = 'md',
  showAlert = false,
  className = '',
  onToggle,
}: FavoriteButtonProps) {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [hasAlert, setHasAlert] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const sizeClasses = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-10 h-10 text-xl',
    lg: 'w-12 h-12 text-2xl',
  };

  // Verificar estado inicial
  useEffect(() => {
    if (!user || !entityId) {
      setChecking(false);
      return;
    }

    const checkFavorite = async () => {
      try {
        if (entityType === 'experience') {
          const result = await favoritesApi.isFavorite(entityId);
          setIsFavorite(result.isFavorite);
          setHasAlert(result.hasAlert);
        } else {
          const result = await favoritesApi.isFestivalFavorite(entityId);
          setIsFavorite(result.isFavorite);
        }
      } catch (error) {
        logger.error('Error checking favorite status:', error);
      } finally {
        setChecking(false);
      }
    };

    checkFavorite();
  }, [user, entityId, entityType]);

  const handleToggleFavorite = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user || loading) return;

    setLoading(true);
    const previousState = isFavorite;

    // Optimistic update
    setIsFavorite(!isFavorite);

    try {
      if (entityType === 'experience') {
        await favoritesApi.toggleFavorite(entityId, previousState);
      } else {
        await favoritesApi.toggleFestivalFavorite(entityId, previousState);
      }

      onToggle?.(!previousState);
    } catch (error) {
      // Revert on error
      setIsFavorite(previousState);
      logger.error('Error toggling favorite:', error);
    } finally {
      setLoading(false);
    }
  }, [user, loading, isFavorite, entityType, entityId, onToggle]);

  const handleToggleAlert = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user || loading || entityType !== 'experience') return;

    setLoading(true);
    const previousState = hasAlert;

    // Optimistic update
    setHasAlert(!hasAlert);

    try {
      await favoritesApi.toggleAlert(entityId, previousState);
    } catch (error) {
      // Revert on error
      setHasAlert(previousState);
      logger.error('Error toggling alert:', error);
    } finally {
      setLoading(false);
    }
  }, [user, loading, hasAlert, entityType, entityId]);

  if (!user) {
    return null;
  }

  if (checking) {
    return (
      <div className={`${sizeClasses[size]} flex items-center justify-center ${className}`}>
        <div className="w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Boton de favorito */}
      <button
        onClick={handleToggleFavorite}
        disabled={loading}
        className={`
          ${sizeClasses[size]}
          flex items-center justify-center
          rounded-full
          transition-all duration-200
          ${isFavorite
            ? 'bg-red-100 text-red-500 hover:bg-red-200'
            : 'bg-white/80 text-gray-400 hover:bg-gray-100 hover:text-red-400'
          }
          ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          shadow-sm backdrop-blur-sm
        `}
        title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
        aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      >
        {isFavorite ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        )}
      </button>

      {/* Boton de alerta (solo para experiencias y si showAlert es true) */}
      {showAlert && entityType === 'experience' && isFavorite && (
        <button
          onClick={handleToggleAlert}
          disabled={loading}
          className={`
            ${sizeClasses[size]}
            flex items-center justify-center
            rounded-full
            transition-all duration-200
            ${hasAlert
              ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
              : 'bg-white/80 text-gray-400 hover:bg-gray-100 hover:text-yellow-500'
            }
            ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            shadow-sm backdrop-blur-sm
          `}
          title={hasAlert ? 'Desactivar alerta de disponibilidad' : 'Activar alerta de disponibilidad'}
          aria-label={hasAlert ? 'Desactivar alerta' : 'Activar alerta'}
        >
          {hasAlert ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9zm4.502 8.9a2.25 2.25 0 104.496 0 25.057 25.057 0 01-4.496 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
