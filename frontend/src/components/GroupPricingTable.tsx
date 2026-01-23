'use client';

import { useState } from 'react';
import { GroupPricingTier } from '@/types/experience';

interface GroupPricingTableProps {
  basePrice: number;
  initialTiers?: GroupPricingTier[];
  onChange?: (tiers: GroupPricingTier[]) => void;
  readOnly?: boolean;
}

export default function GroupPricingTable({
  basePrice,
  initialTiers = [],
  onChange,
  readOnly = false,
}: GroupPricingTableProps) {
  const [tiers, setTiers] = useState<GroupPricingTier[]>(initialTiers);
  const [error, setError] = useState<string | null>(null);

  const addTier = () => {
    const lastTier = tiers[tiers.length - 1];
    const newMinPeople = lastTier ? (lastTier.maxPeople || lastTier.minPeople) + 1 : 2;

    const newTier: GroupPricingTier = {
      minPeople: newMinPeople,
      maxPeople: newMinPeople + 2,
      pricePerPerson: basePrice * 0.9, // 10% descuento por defecto
    };

    const newTiers = [...tiers, newTier];
    setTiers(newTiers);
    onChange?.(newTiers);
    setError(null);
  };

  const removeTier = (index: number) => {
    const newTiers = tiers.filter((_, i) => i !== index);
    setTiers(newTiers);
    onChange?.(newTiers);
    setError(null);
  };

  const updateTier = (index: number, field: keyof GroupPricingTier, value: number | null) => {
    const newTiers = [...tiers];
    newTiers[index] = { ...newTiers[index], [field]: value };

    // Validación
    const tier = newTiers[index];
    if (tier.maxPeople !== null && tier.maxPeople < tier.minPeople) {
      setError('El máximo debe ser mayor o igual al mínimo');
      return;
    }

    // Verificar solapamiento con otros tiers
    for (let i = 0; i < newTiers.length; i++) {
      if (i === index) continue;
      const other = newTiers[i];
      const tierMax = tier.maxPeople ?? Infinity;
      const otherMax = other.maxPeople ?? Infinity;

      if (tier.minPeople <= otherMax && tierMax >= other.minPeople) {
        setError('Los rangos no pueden solaparse');
        return;
      }
    }

    setError(null);
    setTiers(newTiers);
    onChange?.(newTiers);
  };

  const calculateDiscount = (pricePerPerson: number) => {
    if (basePrice <= 0) return 0;
    return Math.round(((basePrice - pricePerPerson) / basePrice) * 100);
  };

  if (readOnly && tiers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-700">Precios por grupo</h3>
          <p className="text-xs text-gray-500">
            Define descuentos para grupos más grandes
          </p>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={addTier}
            className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Añadir rango
          </button>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">
          {error}
        </div>
      )}

      {tiers.length > 0 ? (
        <div className="space-y-3">
          {/* Precio base (siempre mostrar) */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex-1 grid grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-gray-500 text-xs">Personas</span>
                <p className="font-medium">1 persona</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">Precio</span>
                <p className="font-medium">{basePrice.toFixed(2)}€</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs">Descuento</span>
                <p className="font-medium text-gray-400">-</p>
              </div>
            </div>
          </div>

          {/* Tiers configurados */}
          {tiers.map((tier, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg"
            >
              {readOnly ? (
                <div className="flex-1 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500 text-xs">Personas</span>
                    <p className="font-medium">
                      {tier.minPeople}
                      {tier.maxPeople ? `-${tier.maxPeople}` : '+'} personas
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs">Precio</span>
                    <p className="font-medium">{tier.pricePerPerson.toFixed(2)}€</p>
                  </div>
                  <div>
                    <span className="text-gray-500 text-xs">Descuento</span>
                    <p className="font-medium text-green-600">
                      -{calculateDiscount(tier.pricePerPerson)}%
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-xs text-gray-500">Desde</label>
                      <input
                        type="number"
                        min={2}
                        value={tier.minPeople}
                        onChange={(e) =>
                          updateTier(index, 'minPeople', parseInt(e.target.value) || 2)
                        }
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Hasta</label>
                      <input
                        type="number"
                        min={tier.minPeople}
                        value={tier.maxPeople || ''}
                        placeholder="Sin límite"
                        onChange={(e) =>
                          updateTier(
                            index,
                            'maxPeople',
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Precio/persona</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={tier.pricePerPerson}
                        onChange={(e) =>
                          updateTier(index, 'pricePerPerson', parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div className="flex items-end">
                      <span className="text-sm text-green-600 font-medium pb-1.5">
                        -{calculateDiscount(tier.pricePerPerson)}%
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTier(index)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        !readOnly && (
          <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mx-auto text-gray-400 mb-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
            <p className="text-sm text-gray-500 mb-2">
              Sin descuentos por grupo configurados
            </p>
            <button
              type="button"
              onClick={addTier}
              className="text-sm text-primary hover:underline"
            >
              Añadir descuento para grupos
            </button>
          </div>
        )
      )}

      {!readOnly && tiers.length > 0 && (
        <p className="text-xs text-gray-500">
          Deja &quot;Hasta&quot; vacío para indicar sin límite
        </p>
      )}
    </div>
  );
}
