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

// Tags rápidos organizados por categoría
const QUICK_TAGS = [
  { id: 'amable',      label: 'Amable',          emoji: '😊' },
  { id: 'puntual',     label: 'Puntual',          emoji: '⏰' },
  { id: 'autentico',   label: 'Auténtico',        emoji: '🌟' },
  { id: 'hospitalario',label: 'Hospitalario',     emoji: '🏠' },
  { id: 'conocedor',   label: 'Gran conocedor',   emoji: '🎉' },
  { id: 'comunicativo',label: 'Comunicativo',     emoji: '💬' },
  { id: 'flexible',    label: 'Flexible',         emoji: '🤝' },
  { id: 'recomendable',label: 'Lo recomiendo',    emoji: '👍' },
];

// Etiquetas de nivel por puntuación
const RATING_META: Record<number, { label: string; emoji: string; color: string }> = {
  1: { label: 'Muy mala',  emoji: '😞', color: '#C41E3A' },
  2: { label: 'Mala',      emoji: '😕', color: '#C45C26' },
  3: { label: 'Normal',    emoji: '😐', color: '#E6A817' },
  4: { label: 'Buena',     emoji: '😊', color: '#0D7355' },
  5: { label: 'Excelente', emoji: '🤩', color: '#1E5F8C' },
};

// Estado de la pantalla del modal
type FormScreen = 'rating' | 'details' | 'success';

export default function ReviewForm({
  experienceId,
  targetId,
  targetName,
  onSuccess,
  onCancel,
}: ReviewFormProps) {
  const [screen, setScreen] = useState<FormScreen>('rating');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activeRating = hoverRating || rating;
  const meta = activeRating > 0 ? RATING_META[activeRating] : null;

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  };

  const handleRatingConfirm = () => {
    if (rating === 0) return;
    setScreen('details');
  };

  const handleSubmit = async () => {
    if (rating === 0) return;

    setLoading(true);
    setError('');

    // Construir comentario con tags si el usuario no escribió nada
    const tagLabels = QUICK_TAGS
      .filter(t => selectedTags.has(t.id))
      .map(t => t.label);

    let finalComment = comment.trim();
    if (!finalComment && tagLabels.length > 0) {
      finalComment = tagLabels.join(', ');
    }

    try {
      const review = await reviewsApi.create({
        experienceId,
        targetId,
        rating,
        comment: finalComment || undefined,
      });

      setScreen('success');

      // Notificar al padre después de mostrar la pantalla de éxito
      setTimeout(() => {
        onSuccess(review);
      }, 2200);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'No se pudo enviar la reseña');
    } finally {
      setLoading(false);
    }
  };

  // ─── Pantalla 3: Éxito ──────────────────────────────────────────────────────
  if (screen === 'success') {
    return (
      <div className="review-success-screen">
        <div className="review-success-burst" aria-hidden="true">
          {['🎉', '⭐', '🌟', '✨', '🎊', '💫'].map((icon, i) => (
            <span
              key={i}
              className="review-burst-particle"
              style={{ '--i': i } as React.CSSProperties}
              aria-hidden="true"
            >
              {icon}
            </span>
          ))}
        </div>
        <div className="review-success-icon animate-bounce-in">
          <span style={{ fontSize: 56 }} aria-hidden="true">🎉</span>
        </div>
        <h3 className="review-success-title font-display">
          ¡Gracias por tu reseña!
        </h3>
        <p className="review-success-subtitle">
          Tu opinión ayuda a otros viajeros a descubrir experiencias auténticas
        </p>
        <div className="review-success-stars" aria-label={`Puntuación: ${rating} de 5`}>
          {[1, 2, 3, 4, 5].map(s => (
            <span
              key={s}
              className="review-success-star"
              style={{ '--delay': `${s * 0.08}s` } as React.CSSProperties}
              aria-hidden="true"
            >
              {s <= rating ? '★' : '☆'}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // ─── Pantalla 2: Detalles (tags + comentario) ───────────────────────────────
  if (screen === 'details') {
    return (
      <div className="review-details-screen animate-fade-in-up">
        {/* Resumen de puntuación elegida */}
        <div className="review-rating-summary">
          <span className="review-summary-emoji" aria-hidden="true">
            {meta?.emoji}
          </span>
          <div>
            <p className="review-summary-label" style={{ color: meta?.color }}>
              {meta?.label}
            </p>
            <div className="review-summary-stars" aria-label={`${rating} estrellas`}>
              {[1, 2, 3, 4, 5].map(s => (
                <span
                  key={s}
                  className="review-summary-star"
                  aria-hidden="true"
                  style={{ color: s <= rating ? '#E6A817' : '#D4C4A0' }}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setScreen('rating')}
            className="review-change-rating-btn"
            aria-label="Cambiar puntuación"
          >
            Cambiar
          </button>
        </div>

        {/* Tags rápidos */}
        <div className="review-tags-section">
          <p className="review-tags-label">
            ¿Qué destacarías? <span className="review-tags-optional">(opcional)</span>
          </p>
          <div className="review-tags-grid" role="group" aria-label="Etiquetas de valoración">
            {QUICK_TAGS.map(tag => {
              const active = selectedTags.has(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`review-tag ${active ? 'review-tag--active' : ''}`}
                  aria-pressed={active}
                >
                  <span aria-hidden="true">{tag.emoji}</span>
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Comentario libre */}
        <div className="review-comment-section">
          <label htmlFor="review-comment" className="review-comment-label">
            Cuéntanos tu experiencia <span className="review-tags-optional">(opcional)</span>
          </label>
          <textarea
            id="review-comment"
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder={`¿Algo especial sobre ${targetName} o la experiencia?`}
            className="input review-comment-textarea"
            maxLength={500}
            rows={3}
          />
          <p className="review-char-count" aria-live="polite">
            {comment.length}/500
          </p>
        </div>

        {error && (
          <div className="review-error" role="alert">
            {error}
          </div>
        )}

        {/* Acciones */}
        <div className="review-actions">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="btn btn-primary btn-full ripple"
            aria-busy={loading}
          >
            {loading ? (
              <>
                <span className="spinner spinner-sm" aria-hidden="true" />
                Enviando...
              </>
            ) : (
              'Enviar reseña'
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="btn btn-ghost btn-full"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  // ─── Pantalla 1: Puntuación con emojis ─────────────────────────────────────
  return (
    <div className="review-rating-screen animate-fade-in-up">
      <div className="review-header">
        <p className="review-header-question">
          ¿Cómo fue tu experiencia con
        </p>
        <p className="review-header-name font-display">{targetName}?</p>
      </div>

      {/* Selector de estrellas emoji */}
      <div
        className="review-stars-row"
        role="radiogroup"
        aria-label="Selecciona una puntuación del 1 al 5"
      >
        {[1, 2, 3, 4, 5].map(star => {
          const filled = star <= activeRating;
          const isMeta = RATING_META[star];
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={rating === star}
              aria-label={`${star} ${star === 1 ? 'estrella' : 'estrellas'}: ${RATING_META[star].label}`}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className={`review-star-btn ${filled ? 'review-star-btn--filled' : ''} ${rating === star ? 'review-star-btn--selected' : ''}`}
            >
              <span className="review-star-icon" aria-hidden="true">
                {filled ? '★' : '☆'}
              </span>
              <span className="review-star-emoji" aria-hidden="true">
                {isMeta.emoji}
              </span>
            </button>
          );
        })}
      </div>

      {/* Etiqueta animada de nivel */}
      <div className="review-level-label" aria-live="polite" aria-atomic="true">
        {meta ? (
          <span
            key={activeRating}
            className="review-level-text animate-scale-in"
            style={{ color: meta.color }}
          >
            {meta.label}
          </span>
        ) : (
          <span className="review-level-placeholder">
            Toca una estrella para valorar
          </span>
        )}
      </div>

      {/* CTA de continuar */}
      <button
        type="button"
        onClick={handleRatingConfirm}
        disabled={rating === 0}
        className="btn btn-primary btn-full ripple"
      >
        Continuar
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="btn btn-ghost btn-full"
      >
        Ahora no
      </button>
    </div>
  );
}
