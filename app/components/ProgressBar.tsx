'use client';

interface ProgressBarProps {
  current: number;
  needed: number;
}

export default function ProgressBar({ current, needed }: ProgressBarProps) {
  const percentage = Math.min((current / needed) * 100, 100);

  return (
    <div className="w-full">
      <div className="flex justify-between text-sm mb-2">
        <span className="font-bold text-white">
          {current} of {needed} signatures
        </span>
        <span className="text-brand-muted font-medium">
          {needed - current} more needed
        </span>
      </div>
      <div className="w-full bg-white/20 rounded-full h-5 overflow-hidden backdrop-blur-sm">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-bar-from via-bar-via to-bar-to shadow-[0_0_12px_rgba(251,191,36,0.4)]"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
