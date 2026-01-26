'use client';

import { useState, useEffect } from 'react';
import { experiencesApi, GroupPriceResult } from '@/lib/api';
import logger from '@/lib/logger';

interface ParticipantSelectorProps {
  experienceId: string;
  basePrice: number;
  minParticipants?: number;
  maxParticipants?: number;
  onChange?: (participants: number, priceResult: GroupPriceResult | null) => void;
  showNames?: boolean;
  onNamesChange?: (names: string[]) => void;
}

export default function ParticipantSelector({
  experienceId,
  basePrice,
  minParticipants = 1,
  maxParticipants = 10,
  onChange,
  showNames = false,
  onNamesChange,
}: ParticipantSelectorProps) {
  const [participants, setParticipants] = useState(minParticipants);
  const [priceResult, setPriceResult] = useState<GroupPriceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [names, setNames] = useState<string[]>([]);

  // Calcular precio cuando cambia el número de participantes
  useEffect(() => {
    const calculatePrice = async () => {
      if (basePrice <= 0) {
        // Experiencia gratuita o de intercambio
        setPriceResult(null);
        onChange?.(participants, null);
        return;
      }

      setLoading(true);
      try {
        const result = await experiencesApi.calculatePrice(experienceId, participants);
        setPriceResult(result);
        onChange?.(participants, result);
      } catch (error) {
        logger.error('Error calculating price:', error);
        // Fallback: calcular localmente
        const fallbackResult: GroupPriceResult = {
          pricePerPerson: basePrice,
          totalPrice: basePrice * participants,
          discount: 0,
          tier: 'individual',
          originalPricePerPerson: basePrice,
          savings: 0,
        };
        setPriceResult(fallbackResult);
        onChange?.(participants, fallbackResult);
      } finally {
        setLoading(false);
      }
    };

    calculatePrice();
  }, [experienceId, participants, basePrice, onChange]);

  // Actualizar array de nombres cuando cambia el número de participantes
  useEffect(() => {
    if (showNames) {
      setNames((prev) => {
        const newNames = [...prev];
        // Ajustar tamaño del array
        while (newNames.length < participants) {
          newNames.push('');
        }
        while (newNames.length > participants) {
          newNames.pop();
        }
        return newNames;
      });
    }
  }, [participants, showNames]);

  const handleDecrement = () => {
    if (participants > minParticipants) {
      setParticipants((p) => p - 1);
    }
  };

  const handleIncrement = () => {
    if (participants < maxParticipants) {
      setParticipants((p) => p + 1);
    }
  };

  const handleNameChange = (index: number, name: string) => {
    const newNames = [...names];
    newNames[index] = name;
    setNames(newNames);
    onNamesChange?.(newNames);
  };

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case 'small_group':
        return 'Grupo pequeño';
      case 'large_group':
        return 'Grupo grande';
      default:
        return 'Individual';
    }
  };

  return (
    <div className="space-y-4">
      {/* Selector de número de participantes */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-700">
            Participantes
          </label>
          <p className="text-xs text-gray-500">
            {minParticipants === maxParticipants
              ? `${minParticipants} persona${minParticipants > 1 ? 's' : ''}`
              : `De ${minParticipants} a ${maxParticipants} personas`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDecrement}
            disabled={participants <= minParticipants}
            className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-primary hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
            </svg>
          </button>

          <span className="text-xl font-semibold w-8 text-center">
            {participants}
          </span>

          <button
            type="button"
            onClick={handleIncrement}
            disabled={participants >= maxParticipants}
            className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-primary hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Resumen de precio */}
      {priceResult && basePrice > 0 && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Precio por persona</span>
            <div className="flex items-center gap-2">
              {priceResult.discount > 0 && (
                <span className="text-gray-400 line-through">
                  {priceResult.originalPricePerPerson.toFixed(2)}€
                </span>
              )}
              <span className="font-medium">
                {priceResult.pricePerPerson.toFixed(2)}€
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-900 font-medium">
              Total ({participants} persona{participants > 1 ? 's' : ''})
            </span>
            <span className="text-xl font-bold text-primary">
              {loading ? (
                <span className="inline-block w-16 h-6 bg-gray-200 animate-pulse rounded" />
              ) : (
                `${priceResult.totalPrice.toFixed(2)}€`
              )}
            </span>
          </div>

          {/* Badge de descuento */}
          {priceResult.discount > 0 && (
            <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                -{priceResult.discount}% {getTierLabel(priceResult.tier)}
              </span>
              <span className="text-xs text-green-600">
                Ahorras {priceResult.savings.toFixed(2)}€
              </span>
            </div>
          )}
        </div>
      )}

      {/* Nombres de participantes (opcional) */}
      {showNames && participants > 1 && (
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">
            Nombres de los participantes (opcional)
          </label>
          <div className="space-y-2">
            {names.map((name, index) => (
              <input
                key={index}
                type="text"
                value={name}
                onChange={(e) => handleNameChange(index, e.target.value)}
                placeholder={`Participante ${index + 1}`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            ))}
          </div>
          <p className="text-xs text-gray-500">
            Ayuda al anfitrión a preparar la experiencia
          </p>
        </div>
      )}
    </div>
  );
}
