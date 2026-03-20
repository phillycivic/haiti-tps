'use client';

interface ProgressBarProps {
  current: number;
  needed: number;
}

export default function ProgressBar({ current, needed }: ProgressBarProps) {
  const percentage = Math.min((current / needed) * 100, 100);

  return (
    <div className="w-full">
      <div className="flex justify-between text-sm mb-1">
        <span className="font-semibold text-white">
          {current} of {needed} signatures
        </span>
        <span className="text-blue-200">
          {needed - current} more needed
        </span>
      </div>
      <div className="w-full bg-blue-900/40 rounded-full h-4 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-green-400 to-green-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
