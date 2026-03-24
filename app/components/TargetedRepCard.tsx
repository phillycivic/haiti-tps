'use client';

import { useState } from 'react';
import CallScript from './CallScript';

interface TargetedRepCardProps {
  name: string;
  party: string;
  area: string;
  stateDistrict: string;
  phone: string;
  signed?: boolean;
  dateSigned?: string;
  targeted?: boolean;
  callScriptTemplate?: string;
  emailTemplate?: string;
  emailOnly?: boolean;
}

export default function TargetedRepCard({ name, party, area, stateDistrict, phone, signed, dateSigned, targeted, callScriptTemplate, emailTemplate, emailOnly }: TargetedRepCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showEmailText, setShowEmailText] = useState(false);

  const districtLabel = `${stateDistrict.slice(0, 2)}-${stateDistrict.slice(2)}`;
  const phoneDigits = phone.replace(/[^0-9]/g, '');

  const statusColor = signed
    ? 'border-emerald-200 bg-emerald-50/50'
    : targeted
      ? 'border-amber-200 bg-amber-50/50'
      : 'border-gray-200 bg-white';

  const statusBadge = signed
    ? { label: 'Signed', className: 'bg-emerald-100 text-emerald-700' }
    : targeted
      ? { label: 'High Priority', className: 'bg-amber-100 text-amber-700' }
      : null;

  // When emailOnly, render the email button inline (no expand/collapse)
  if (emailOnly) {
    return (
      <div className={`border rounded-xl shadow-sm ${statusColor}`}>
        <div className="px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900">{name} ({party})</span>
              {statusBadge && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge.className}`}>
                  {statusBadge.label}
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500">
              {districtLabel}
              {area && <> &mdash; {area}</>}
              {signed && dateSigned && (
                <span className="text-emerald-600 ml-2">Signed {dateSigned}</span>
              )}
            </div>
          </div>
          {!signed && (
            <div className="shrink-0">
              {/* Mobile: mailto link */}
              <a
                href={`mailto:?subject=${encodeURIComponent(`Please call ${name} to protect TPS for Haitians`)}`}
                className="sm:hidden inline-flex items-center gap-1.5 bg-gradient-to-r from-action to-action-end hover:from-action-dark hover:to-action-end-dark text-white font-semibold py-2 px-3 rounded-lg transition-all text-xs shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                Email a Friend
              </a>
              {/* Desktop: toggle email text */}
              <button
                onClick={() => setShowEmailText(v => !v)}
                className="hidden sm:inline-flex items-center gap-1.5 bg-gradient-to-r from-action to-action-end hover:from-action-dark hover:to-action-end-dark text-white font-semibold py-2 px-3 rounded-lg transition-all text-xs shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                {showEmailText ? 'Hide' : 'Email a Friend'}
              </button>
            </div>
          )}
        </div>
        {showEmailText && !signed && (
          <div className="px-4 pb-4">
            <CallScript repName={name} phone={phone} callScriptTemplate={callScriptTemplate} emailTemplate={emailTemplate} emailOnly />
          </div>
        )}
      </div>
    );
  }

  // Standard expand/collapse with full call script
  return (
    <div className={`border rounded-xl shadow-sm hover:shadow-md transition-shadow ${statusColor}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-brand-tint/50 transition-colors rounded-xl"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{name} ({party})</span>
            {statusBadge && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge.className}`}>
                {statusBadge.label}
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500">
            {districtLabel}
            {area && <> &mdash; {area}</>}
            {signed && dateSigned && (
              <span className="text-emerald-600 ml-2">Signed {dateSigned}</span>
            )}
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
          {signed ? (
            <p className="text-sm text-emerald-700 font-medium">
              This representative has already signed the discharge petition.
            </p>
          ) : (
            <CallScript repName={name} phone={phone} callScriptTemplate={callScriptTemplate} emailTemplate={emailTemplate} />
          )}
        </div>
      )}
    </div>
  );
}
