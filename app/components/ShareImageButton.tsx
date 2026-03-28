'use client';

import { useState } from 'react';

export default function ShareImageButton() {
  const [loading, setLoading] = useState(false);

  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const downloadBlob = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'haiti-tps-update.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    setLoading(true);
    try {
      const res = await fetch('/instagram-image-218.png');
      if (!res.ok) throw new Error('Image generation failed');
      const blob = await res.blob();

      if (isMobile) {
        const file = new File([blob], 'haiti-tps-update.png', { type: 'image/png' });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Haiti TPS Update',
            text: 'The clock is ticking. Visit haitiTPS.org to take action.',
          });
        } else {
          downloadBlob(blob);
        }
      } else {
        downloadBlob(blob);
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        const a = document.createElement('a');
        a.href = '/instagram-image-218.png';
        a.download = 'haiti-tps-update.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={handleShare}
        disabled={loading}
        className="inline-flex items-center gap-2.5 bg-white text-brand hover:bg-brand-tint font-bold text-base px-6 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-wait"
      >
        {loading ? (
          <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="16,6 12,2 8,6" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="12" y1="2" x2="12" y2="15" strokeLinecap="round" />
          </svg>
        )}
        {loading ? 'Preparing image...' : isMobile ? 'Share this update' : 'Download shareable image'}
      </button>
      <p className="text-brand-light/60 text-xs mt-2">
        {isMobile
          ? 'Opens your share sheet — post to Instagram, Stories, WhatsApp, or text'
          : 'Download the image to share on social media'}
      </p>
    </div>
  );
}
