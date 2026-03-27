'use client';

import { useMemo, useState } from 'react';
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
  callScriptTemplate?: string;
  emailTemplate?: string;
}

export default function TargetedRepList({ targetedReps, callScriptTemplate, emailTemplate }: TargetedRepListProps) {
  const [selectedState, setSelectedState] = useState('');

  const states = useMemo(() => {
    const seen = new Map<string, string>();
    for (const rep of targetedReps) {
      const abbr = rep.stateDistrict.slice(0, 2);
      if (!seen.has(abbr)) {
        seen.set(abbr, ABBR_TO_STATE[abbr] || abbr);
      }
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [targetedReps]);

  const filtered = selectedState
    ? targetedReps.filter(rep => rep.stateDistrict.startsWith(selectedState))
    : targetedReps;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <label htmlFor="state-filter" className="text-sm font-medium text-gray-700 shrink-0">
          Filter by state:
        </label>
        <select
          id="state-filter"
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-ring focus:border-ring text-gray-900 text-sm shadow-sm bg-white"
        >
          <option value="">All states</option>
          {states.map(([abbr, name]) => (
            <option key={abbr} value={abbr}>{name}</option>
          ))}
        </select>
      </div>
      {filtered.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">
          No high-priority reps in this state.
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
              targeted
              callScriptTemplate={callScriptTemplate}
              emailTemplate={emailTemplate}
              emailOnly
            />
          ))}
        </div>
      )}
      <p className="text-xs text-gray-400 mt-3 text-center">
        {filtered.length} of {targetedReps.length} high-priority representatives
      </p>
    </div>
  );
}
