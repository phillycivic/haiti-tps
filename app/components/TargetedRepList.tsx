'use client';

import { useState } from 'react';
import TargetedRepCard from './TargetedRepCard';

const ABBR_TO_STATE: Record<string, string> = {
  AZ: 'Arizona', CA: 'California', CO: 'Colorado', FL: 'Florida',
  HI: 'Hawaii', IL: 'Illinois', MI: 'Michigan', MO: 'Missouri',
  NC: 'North Carolina', NE: 'Nebraska', NJ: 'New Jersey', NM: 'New Mexico',
  NY: 'New York', OH: 'Ohio', PA: 'Pennsylvania', TX: 'Texas',
  VA: 'Virginia', WA: 'Washington',
};

interface TargetedRep {
  name: string;
  party: string;
  stateDistrict: string;
  phone: string;
  area: string;
  searchTerms: string;
}

interface TargetedRepListProps {
  targetedReps: TargetedRep[];
}

export default function TargetedRepList({ targetedReps }: TargetedRepListProps) {
  const [query, setQuery] = useState('');

  const filtered = query.trim()
    ? targetedReps.filter(rep => {
        const q = query.toLowerCase();
        const stateAbbr = rep.stateDistrict.slice(0, 2);
        const stateName = (ABBR_TO_STATE[stateAbbr] || '').toLowerCase();
        return (
          rep.searchTerms.toLowerCase().includes(q) ||
          rep.name.toLowerCase().includes(q) ||
          rep.stateDistrict.toLowerCase().includes(q) ||
          stateName.includes(q)
        );
      })
    : targetedReps;

  return (
    <div>
      <label htmlFor="rep-search" className="block text-sm font-medium text-gray-700 mb-1">
        Know someone in one of these areas? Search to find their rep.
      </label>
      <input
        id="rep-search"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by city, state, or rep name..."
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 mb-4"
      />
      {filtered.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">
          No targeted reps found for &ldquo;{query}&rdquo;
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map(rep => (
            <TargetedRepCard
              key={rep.stateDistrict}
              name={rep.name}
              party={rep.party}
              area={rep.area}
              stateDistrict={rep.stateDistrict}
              phone={rep.phone}
            />
          ))}
        </div>
      )}
      <p className="text-xs text-gray-400 mt-3 text-center">
        {filtered.length} of {targetedReps.length} targeted representatives
      </p>
    </div>
  );
}
