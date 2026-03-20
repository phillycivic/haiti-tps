'use client';

import { useState } from 'react';

interface CallScriptProps {
  repName: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
}

export default function CallScript({ repName, city, state, zip, phone }: CallScriptProps) {
  const [copied, setCopied] = useState(false);

  const locationParts = [city, state, zip].filter(Boolean).join(', ');
  const script = `My name is ______, and I live in ${locationParts || '[your city, state, zip]'}. I am calling to urge Representative ${repName} to sign the discharge petition for House Resolution 965 so the House can vote on H.R. 1689 to designate Haiti for Temporary Protected Status. Time is of the essence, and I respectfully ask Representative ${repName} to sign as soon as possible. Thank you.`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
      <h3 className="font-semibold text-gray-800 mb-2">Your Call Script</h3>
      <p className="text-gray-700 text-sm leading-relaxed italic mb-3">
        &ldquo;{script}&rdquo;
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <a
          href={`tel:${phone ? phone.replace(/[^0-9]/g, '') : '2022243121'}`}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
          </svg>
          {phone ? `Call ${repName}` : 'Call the House Switchboard'}
        </a>
        <button
          onClick={handleCopy}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors border border-gray-300"
        >
          {copied ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
              Copy Script
            </>
          )}
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-2 text-center">
        {phone ? (
          <>{repName}: {phone}</>
        ) : (
          <>House Switchboard: (202) 224-3121 &mdash; Ask to be connected to your representative</>
        )}
      </p>
    </div>
  );
}
