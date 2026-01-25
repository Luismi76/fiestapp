'use client';

import { ExperienceCategory, CATEGORY_LABELS, CATEGORY_ICONS } from '@/types/experience';

interface CategorySelectorProps {
  value: ExperienceCategory | '';
  onChange: (category: ExperienceCategory) => void;
  error?: string;
}

const CATEGORIES: ExperienceCategory[] = [
  'gastronomia',
  'cultura',
  'naturaleza',
  'aventura',
  'nocturna',
  'familiar',
];

export default function CategorySelector({ value, onChange, error }: CategorySelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Categoría <span className="text-red-500">*</span>
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => onChange(category)}
            className={`p-4 rounded-xl border-2 transition-all text-center ${
              value === category
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="text-2xl mb-1">{CATEGORY_ICONS[category]}</div>
            <div className={`text-sm font-medium ${
              value === category ? 'text-primary' : 'text-gray-700'
            }`}>
              {CATEGORY_LABELS[category]}
            </div>
          </button>
        ))}
      </div>
      {error && (
        <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
          <span>⚠️</span> {error}
        </p>
      )}
    </div>
  );
}
