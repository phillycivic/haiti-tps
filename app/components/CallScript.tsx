'use client';

import { useState } from 'react';

interface CallScriptProps {
  repName: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  callScriptTemplate?: string;
  emailTemplate?: string;
}

function applyVars(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((t, [k, v]) => t.replaceAll(k, v), template);
}

export default function CallScript({ repName, city, state, zip, phone, callScriptTemplate, emailTemplate }: CallScriptProps) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [showEmailText, setShowEmailText] = useState(false);

  const locationParts = [city, state, zip].filter(Boolean).join(', ');

  const script = callScriptTemplate
    ? applyVars(callScriptTemplate, {
        '[Rep Name]': repName,
        '[your city, state, zip]': locationParts || '[your city, state, zip]',
      })
    : `My name is ______, and I live in ${locationParts || '[your city, state, zip]'}. I am calling to urge Representative ${repName} to sign the discharge petition for House Resolution 965 so the House can vote on H.R. 1689 to designate Haiti for Temporary Protected Status. Time is of the essence, and I respectfully ask Representative ${repName} to sign as soon as possible. Thank you.`;

  const phoneLineText = phone
    ? `${repName}'s office: ${phone}`
    : 'House Switchboard: (202) 224-3121 — ask to be connected to your representative';

  const defaultEmailBody = emailTemplate
    ? applyVars(emailTemplate, {
        '[Rep Name]': repName,
        '[CALL SCRIPT]': script,
        '[PHONE LINE]': phoneLineText,
      })
    : [
        'Hey,',
        '',
        'I wanted to reach out about something I\'ve been following — the Supreme Court is about to rule on whether to strip Temporary Protected Status from 350,000 Haitians living in the U.S. A decision is expected by end of June, and it could mean deportation orders for hundreds of thousands of people.',
        '',
        `There's a discharge petition in the House that needs 218 signatures to force a vote on legislation that would protect them. ${repName} hasn't signed yet — and a phone call from a constituent can genuinely move the needle on this.`,
        '',
        'Would you be willing to make a quick 2-minute call? Here\'s a script you can use:',
        '',
        `"${script}"`,
        '',
        phoneLineText,
        '',
        'I know it feels small, but these calls really do matter. Thanks for considering it.',
      ].join('\n');

  const emailSubject = `Please call ${repName} to protect TPS for Haitians`;
  const [editableEmail, setEditableEmail] = useState(`Subject: ${emailSubject}\n\n${defaultEmailBody}`);

  const emailHref = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(editableEmail.replace(/^Subject:[^\n]*\n\n?/, ''))}`;

  const handleCopyEmail = async () => {
    await navigator.clipboard.writeText(editableEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div className="mt-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-bold text-gray-900 text-base">Your Call Script</h3>
      </div>
      <p className="text-gray-700 text-sm leading-relaxed italic mb-4 bg-white/60 rounded-lg p-3 border border-amber-100">
        &ldquo;{script}&rdquo;
      </p>
      <a
        href={`tel:${phone ? phone.replace(/[^0-9]/g, '') : '2022243121'}`}
        className="w-full inline-flex items-center justify-center gap-3 bg-gradient-to-r from-cta to-cta-end hover:from-cta-dark hover:to-cta-end-dark text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-lg"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
        </svg>
        <span className="opacity-75 font-normal text-sm">{phone ? `Call ${repName}` : 'Call the House Switchboard'}</span>
        <span className="text-xl tracking-wide">{phone || '(202) 224-3121'}</span>
      </a>
      <div className="mt-2 mb-3" />
      <div className="border-t border-amber-200/60 pt-4 mt-1">
        <p className="text-xs text-gray-600 mb-2 font-medium">Forward to a friend to call their rep:</p>
        <div className="flex gap-2">
          <a
            href={emailHref}
            target="_blank"
            rel="noopener noreferrer"
            className="sm:hidden flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-action to-action-end hover:from-action-dark hover:to-action-end-dark text-white font-semibold py-2.5 px-4 rounded-xl transition-all text-sm shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
            Email a Friend
          </a>
          <button
            onClick={() => setShowEmailText((v) => !v)}
            className="hidden sm:inline-flex flex-1 items-center justify-center gap-2 bg-gradient-to-r from-action to-action-end hover:from-action-dark hover:to-action-end-dark text-white font-semibold py-2.5 px-4 rounded-xl transition-all text-sm shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
            {showEmailText ? 'Hide email text' : 'Email a Friend'}
          </button>
        </div>
        {showEmailText && (
          <div className="hidden sm:block mt-3">
            <p className="text-xs text-gray-600 mb-2">Copy this text and paste it into an email to your network:</p>
            <textarea
              value={editableEmail}
              onChange={(e) => setEditableEmail(e.target.value)}
              rows={12}
              className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3 leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
              aria-label="Editable email text"
            />
            <button
              onClick={handleCopyEmail}
              className="mt-2 w-full inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 px-4 rounded-lg transition-colors border border-gray-300 text-sm"
            >
              {copiedEmail ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                  Copy Email Text
                </>
              )}
            </button>
          </div>
        )}
        <div className="sm:hidden mt-3">
          <p className="text-xs text-gray-600 mb-2">Edit and copy the email text:</p>
          <textarea
            value={editableEmail}
            onChange={(e) => setEditableEmail(e.target.value)}
            rows={12}
            className="w-full text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3 leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
            aria-label="Editable email text"
          />
          <button
            onClick={handleCopyEmail}
            className="mt-2 w-full inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 px-4 rounded-lg transition-colors border border-gray-300 text-sm"
          >
            {copiedEmail ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
                Copy Email Text
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
