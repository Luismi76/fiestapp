'use client';

import { useCallback } from 'react';

interface PriceRangeSliderProps {
  min?: number;
  max?: number;
  step?: number;
  minValue: string;
  maxValue: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
}

const PRESETS = [
  { label: 'Gratis', min: '0', max: '0' },
  { label: '<25€', min: '0', max: '25' },
  { label: '<50€', min: '0', max: '50' },
  { label: '<100€', min: '0', max: '100' },
];

export default function PriceRangeSlider({
  min = 0,
  max = 200,
  step = 5,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
}: PriceRangeSliderProps) {
  const currentMin = minValue ? Number(minValue) : min;
  const currentMax = maxValue ? Number(maxValue) : max;

  const leftPercent = ((currentMin - min) / (max - min)) * 100;
  const rightPercent = ((currentMax - min) / (max - min)) * 100;

  const handleMinInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Math.min(Number(e.target.value), currentMax - step);
      onMinChange(val <= min ? '' : String(val));
    },
    [currentMax, step, min, onMinChange]
  );

  const handleMaxInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Math.max(Number(e.target.value), currentMin + step);
      onMaxChange(val >= max ? '' : String(val));
    },
    [currentMin, step, max, onMaxChange]
  );

  const isPresetActive = (preset: (typeof PRESETS)[number]) => {
    const pMin = Number(preset.min);
    const pMax = Number(preset.max);
    return currentMin === pMin && currentMax === pMax;
  };

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <label className="block text-sm font-semibold text-gray-900">Rango de precio</label>
        <span className="text-xs text-gray-500">
          {currentMin}€ — {currentMax}€
        </span>
      </div>

      {/* Dual range track */}
      <div className="relative h-6 flex items-center">
        {/* Background track */}
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-gray-200" />
        {/* Active range */}
        <div
          className="absolute h-1.5 rounded-full bg-primary"
          style={{ left: `${leftPercent}%`, right: `${100 - rightPercent}%` }}
        />
        {/* Min thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentMin}
          onChange={handleMinInput}
          className="price-range-thumb absolute inset-x-0"
        />
        {/* Max thumb */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentMax}
          onChange={handleMaxInput}
          className="price-range-thumb absolute inset-x-0"
        />
      </div>

      {/* Presets */}
      <div className="flex gap-1.5 mt-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => {
              onMinChange(preset.min === '0' ? '' : preset.min);
              onMaxChange(preset.max);
            }}
            className={`flex-1 py-1 rounded-lg text-xs font-medium transition-colors ${
              isPresetActive(preset)
                ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Styles for range inputs */}
      <style jsx>{`
        .price-range-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 24px;
          background: transparent;
          pointer-events: none;
          outline: none;
        }
        .price-range-thumb::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          border: 2px solid #FF6B35;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
          cursor: pointer;
          pointer-events: auto;
        }
        .price-range-thumb::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          border: 2px solid #FF6B35;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
          cursor: pointer;
          pointer-events: auto;
        }
      `}</style>
    </div>
  );
}
