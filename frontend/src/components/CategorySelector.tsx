'use client';

import { useEffect, useState } from 'react';
import { Category } from '@/types/experience';
import { categoriesApi } from '@/lib/api';

interface CategorySelectorProps {
  value: string; // categoryId
  onChange: (categoryId: string) => void;
  error?: string;
}

export default function CategorySelector({ value, onChange, error }: CategorySelectorProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    categoriesApi.getAll().then((data) => {
      setCategories(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const fiestaCategories = categories.filter((c) => c.group === 'fiesta');
  const localCategories = categories.filter((c) => c.group === 'local');

  if (loading) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Categoría <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-4 rounded-xl border-2 border-gray-100 bg-gray-50 animate-pulse h-20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Categoría <span className="text-red-500">*</span>
      </label>

      {fiestaCategories.length > 0 && (
        <>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Fiestas populares</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            {fiestaCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onChange(cat.id)}
                className={`p-4 rounded-xl border-2 transition-all text-center ${
                  value === cat.id
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="text-2xl mb-1">{cat.icon}</div>
                <div className={`text-sm font-medium ${
                  value === cat.id ? 'text-primary' : 'text-gray-700'
                }`}>
                  {cat.name}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {localCategories.length > 0 && (
        <>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Experiencias locales</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {localCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onChange(cat.id)}
                className={`p-4 rounded-xl border-2 transition-all text-center ${
                  value === cat.id
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="text-2xl mb-1">{cat.icon}</div>
                <div className={`text-sm font-medium ${
                  value === cat.id ? 'text-primary' : 'text-gray-700'
                }`}>
                  {cat.name}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {error && (
        <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
          <span>⚠️</span> {error}
        </p>
      )}
    </div>
  );
}
