import React, { useEffect, useState } from 'react';
import { useStudio } from '../../context/StudioContext';

export default function Toast() {
  const { toast } = useStudio();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (toast.show) {
      setVisible(true);
    } else {
      const t = setTimeout(() => setVisible(false), 350);
      return () => clearTimeout(t);
    }
  }, [toast.show]);

  if (!visible && !toast.show) return null;

  const typeStyles = {
    success: 'bg-emerald-900/90 border-emerald-500/40 text-emerald-200',
    error: 'bg-red-900/90 border-red-500/40 text-red-200',
    info: 'bg-indigo-900/90 border-indigo-500/40 text-indigo-200',
  };

  return (
    <div
      className={[
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl border backdrop-blur-sm text-sm font-semibold shadow-2xl',
        'transition-all duration-300',
        toast.show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
        typeStyles[toast.type] || typeStyles.info,
      ].join(' ')}
      role="status"
      aria-live="polite"
    >
      {toast.message}
    </div>
  );
}
