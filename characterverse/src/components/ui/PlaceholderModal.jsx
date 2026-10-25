import React from 'react';
import { X, Clock, ArrowRight } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';

export default function PlaceholderModal() {
  const { placeholderModal, closePlaceholderModal } = useStudio();
  const { isOpen, title, description, targetPhase } = placeholderModal;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={closePlaceholderModal}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#261b35]/40 backdrop-blur-sm" />

      {/* Dialog */}
      <div
        className="modal-enter relative z-10 w-full max-w-md bg-white border border-[#dbcee2] rounded-2xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Close */}
        <button
          onClick={closePlaceholderModal}
          className="absolute top-4 right-4 w-7 h-7 rounded-lg hover:bg-[#f3edf7] flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-[#766c83]" />
        </button>

        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-[#f4edf8] border border-[#dbcee2] flex items-center justify-center mb-4">
          <Clock className="w-6 h-6 text-[#7544ae]" />
        </div>

        {/* Content */}
        <h2 id="modal-title" className="text-lg font-black text-[#261b35] mb-1">
          {title}
        </h2>
        <p className="text-xs font-semibold text-[#7544ae] mb-3 uppercase tracking-wider">
          {targetPhase}
        </p>
        <p className="text-sm text-[#766c83] leading-relaxed mb-6">{description}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['In Development', 'CharacterVerse Phase Plan', 'Coming Soon'].map((tag) => (
            <span
              key={tag}
              className="text-[11px] font-medium bg-[#f4edf8] text-[#7544ae] border border-[#dbcee2] px-2 py-1 rounded-lg"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={closePlaceholderModal}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#7544ae] to-[#542b82] text-white text-sm font-bold hover:brightness-105 transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-purple-900/15"
        >
          Back to Studio
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
