'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { categoriesApi } from '@/lib/api';
import { Category } from '@/types/experience';
import MainLayout from '@/components/MainLayout';
import { AdminHeader } from '@/components/admin';
import AdminNav from '@/components/admin/AdminNav';

interface CategoryWithCount extends Category {
  _count: { experiences: number };
}

export default function AdminCategoriesPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formGroup, setFormGroup] = useState<'fiesta' | 'local'>('local');
  const [formIcon, setFormIcon] = useState('');
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchCategories = useCallback(async () => {
    try {
      const data = await categoriesApi.getAllAdmin();
      setCategories(data as CategoryWithCount[]);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (!authLoading && user?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    if (isAuthenticated) {
      fetchCategories();
    }
  }, [authLoading, isAuthenticated, user, router, fetchCategories]);

  const resetForm = () => {
    setEditingId(null);
    setFormName('');
    setFormSlug('');
    setFormGroup('local');
    setFormIcon('');
    setFormSortOrder(0);
    setShowForm(false);
    setFormError('');
  };

  const startEdit = (cat: CategoryWithCount) => {
    setEditingId(cat.id);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormGroup(cat.group as 'fiesta' | 'local');
    setFormIcon(cat.icon);
    setFormSortOrder(cat.sortOrder);
    setShowForm(true);
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSlug.trim() || !formIcon.trim()) {
      setFormError('Nombre, slug e icono son obligatorios');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      const data = {
        name: formName.trim(),
        slug: formSlug.trim().toLowerCase(),
        group: formGroup,
        icon: formIcon.trim(),
        sortOrder: formSortOrder,
      };

      if (editingId) {
        await categoriesApi.update(editingId, data);
      } else {
        await categoriesApi.create(data);
      }

      resetForm();
      await fetchCategories();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(msg || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await categoriesApi.toggleActive(id);
      await fetchCategories();
    } catch {
      // ignore
    }
  };

  const fiestaCategories = categories.filter((c) => c.group === 'fiesta');
  const localCategories = categories.filter((c) => c.group === 'local');

  if (authLoading || loading) {
    return (
      <MainLayout>
        <AdminNav />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  const renderGroup = (title: string, items: CategoryWithCount[]) => (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</h3>
      <div className="space-y-2">
        {items.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
          >
            <span className="text-2xl flex-shrink-0">{cat.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 text-sm">{cat.name}</span>
                <span className="text-xs text-gray-400 font-mono">{cat.slug}</span>
              </div>
              <span className="text-xs text-gray-400">{cat._count.experiences} experiencias</span>
            </div>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: cat.active ? '#E8F5F0' : '#FEE2E2',
                color: cat.active ? '#0D7355' : '#C41E3A',
              }}
            >
              {cat.active ? 'Activa' : 'Inactiva'}
            </span>
            <button
              onClick={() => handleToggle(cat.id)}
              className="text-xs px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
              title={cat.active ? 'Desactivar' : 'Activar'}
            >
              {cat.active ? 'Desactivar' : 'Activar'}
            </button>
            <button
              onClick={() => startEdit(cat)}
              className="text-xs px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Editar
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-gray-400 py-4 text-center">No hay categorías en este grupo</p>
        )}
      </div>
    </div>
  );

  return (
    <MainLayout>
      <AdminNav />
      <div className="max-w-4xl mx-auto px-4 py-6">
        <AdminHeader title="Categorías" />

        <div className="flex justify-end mb-6">
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
            style={{ backgroundColor: '#8B5CF6' }}
          >
            + Nueva categoría
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="mb-6 bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">
              {editingId ? 'Editar categoría' : 'Nueva categoría'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Gastronomía / Tapas"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Slug</label>
                  <input
                    type="text"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    placeholder="gastronomia"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Grupo</label>
                  <select
                    value={formGroup}
                    onChange={(e) => setFormGroup(e.target.value as 'fiesta' | 'local')}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                  >
                    <option value="fiesta">Fiesta popular</option>
                    <option value="local">Experiencia local</option>
                  </select>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Icono (emoji)</label>
                    <input
                      type="text"
                      value={formIcon}
                      onChange={(e) => setFormIcon(e.target.value)}
                      placeholder="🎪"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 text-center text-xl"
                    />
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Orden</label>
                    <input
                      type="number"
                      value={formSortOrder}
                      onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                    />
                  </div>
                </div>
              </div>

              {formError && (
                <p className="text-red-500 text-sm">{formError}</p>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-colors"
                  style={{ backgroundColor: '#8B5CF6' }}
                >
                  {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear categoría'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lists */}
        {renderGroup('Fiestas populares', fiestaCategories)}
        {renderGroup('Experiencias locales', localCategories)}
      </div>
    </MainLayout>
  );
}
