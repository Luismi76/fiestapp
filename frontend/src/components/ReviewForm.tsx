'use client';

import { useState } from 'react';
import { reviewsApi } from '@/lib/api';
import { Review } from '@/types/review';

interface ReviewFormProps {
  experienceId: string;
  targetId: string;
  targetName: string;
  onSuccess: (review: Review) => void;
  onCancel: () => void;
}

export default function ReviewForm({
  experienceId,
  targetId,
  targetName,
  onSuccess,
  onCancel,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      setError('Selecciona una puntuación');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const review = await reviewsApi.create({
        experienceId,
        targetId,
        rating,
        comment: comment.trim() || undefined,
      });

      onSuccess(review);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'No se pudo enviar la reseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Target user */}
      <div className="text-center">
        <p className="text-gray-600 mb-2">¿Cómo fue tu experiencia con</p>
        <p className="text-xl font-bold">{targetName}?</p>
      </div>

      {/* Star rating */}
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="text-4xl transition-transform hover:scale-110"
          >
            {star <= (hoverRating || rating) ? '★' : '☆'}
          </button>
        ))}
      </div>

      {/* Rating labels */}
      <div className="text-center text-sm text-gray-500">
        {rating === 1 && 'Muy mala'}
        {rating === 2 && 'Mala'}
        {rating === 3 && 'Normal'}
        {rating === 4 && 'Buena'}
        {rating === 5 && 'Excelente'}
        {rating === 0 && 'Selecciona una puntuación'}
      </div>

      {/* Comment */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cuéntanos más (opcional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Describe tu experiencia, qué te gustó, qué podría mejorar..."
          className="input min-h-[120px] resize-none"
          maxLength={500}
        />
        <p className="text-xs text-gray-400 text-right mt-1">
          {comment.length}/500
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        <button
          type="submit"
          className="btn btn-primary btn-full"
          disabled={loading || rating === 0}
        >
          {loading ? 'Enviando...' : 'Enviar reseña'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-ghost btn-full"
          disabled={loading}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
