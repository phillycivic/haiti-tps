'use client';

import { useState } from 'react';
import CallScript from './CallScript';

interface TargetedRepCardProps {
  name: string;
  party: string;
  area: string;
  stateDistrict: string;
  phone: string;
}

export default function TargetedRepCard({ name, party, area, stateDistrict, phone }: TargetedRepCardProps) {
  const [expanded, setExpanded] = useState(false);

  const districtLabel = `${stateDistrict.slice(0, 2)}-${stateDistrict.slice(2)}`;
  const phoneDigits = phone.replace(/[^0-9]/g, '');

  return (
    <div className="border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-brand-tint transition-colors rounded-xl"
      >
        <div className="min-w-0">
          <div className="font-semibold text-gray-900">{name} ({party})</div>
          <div className="text-sm text-gray-500">
            {districtLabel} &mdash; {area}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <a
            href={`tel:${phoneDigits}`}
            onClick={(e) => e.stopPropagation()}
            className="text-link hover:text-link-hover text-sm font-medium hidden sm:block"
          >
            {phone}
          </a>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4">
          <a
            href={`tel:${phoneDigits}`}
            className="text-link hover:text-link-hover text-sm font-medium sm:hidden block mb-2"
          >
            {phone}
          </a>
          <CallScript repName={name} phone={phone} />
        </div>
      )}
    </div>
  );
}
