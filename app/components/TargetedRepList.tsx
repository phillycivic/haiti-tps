'use client';

import { useRef, useState } from 'react';
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
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

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

  const handleScroll = () => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    setIsAtTop(scrollTop <= 10);
    setIsAtBottom(scrollTop + clientHeight >= scrollHeight - 10);
  };

  const scrollUp = () => {
    listRef.current?.scrollBy({ top: -200, behavior: 'smooth' });
  };

  const scrollDown = () => {
    listRef.current?.scrollBy({ top: 200, behavior: 'smooth' });
  };

  return (
    <div>
      <label htmlFor="rep-search" className="block text-sm font-medium text-gray-700 mb-1">
        Search by city, state, or name to find a rep in your network:
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
        <div className="relative">
          {!isAtTop && filtered.length > 8 && (
            <button
              onClick={scrollUp}
              className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center py-2 bg-gradient-to-b from-white via-white/95 to-transparent cursor-pointer"
              aria-label="Scroll up for more"
            >
              <span className="flex items-center gap-1 text-sm text-gray-500 font-medium animate-bounce">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 rotate-180" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                More reps above
              </span>
            </button>
          )}
          <div
            ref={listRef}
            onScroll={handleScroll}
            className="space-y-2 max-h-[28rem] overflow-y-auto pr-1"
          >
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
          {!isAtBottom && filtered.length > 8 && (
            <button
              onClick={scrollDown}
              className="absolute bottom-0 left-0 right-0 flex items-center justify-center py-2 bg-gradient-to-t from-white via-white/95 to-transparent cursor-pointer"
              aria-label="Scroll for more"
            >
              <span className="flex items-center gap-1 text-sm text-gray-500 font-medium animate-bounce">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                More reps below
              </span>
            </button>
          )}
        </div>
      )}
      <p className="text-xs text-gray-400 mt-3 text-center">
        {filtered.length} of {targetedReps.length} targeted representatives
      </p>
    </div>
  );
}
