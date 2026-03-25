import { Suspense } from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fetchSignerData } from './lib/signers';
import ClientPage from './components/ClientPage';

interface HouseRep {
  name: string;
  party: string;
  stateDistrict: string;
  phone: string;
  area: string;
  searchTerms: string;
  targeted: boolean;
}

function loadHouseReps(): HouseRep[] {
  const csv = readFileSync(join(process.cwd(), 'data', 'house_reps.csv'), 'utf8');
  return csv
    .trim()
    .split('\n')
    .slice(1)
    .filter(Boolean)
    .map(line => {
      const [name, party, , , stateDistrict, phone, area, searchTerms, targeted] = line.replace(/\r$/, '').split(',');
      return {
        name,
        party,
        stateDistrict,
        phone,
        area: area || '',
        searchTerms: searchTerms || '',
        targeted: targeted === 'Y',
      };
    });
}

function cleanGoogleDocHtml(html: string): string {
  // Extract CSS class → formatting map from <style> block
  const classFormats = new Map<string, string[]>();
  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  if (styleMatch) {
    const css = styleMatch[1];
    const ruleRegex = /\.([\w-]+)\s*\{([^}]*)\}/g;
    let m;
    while ((m = ruleRegex.exec(css)) !== null) {
      const className = m[1];
      const rules = m[2].toLowerCase();
      const tags: string[] = [];
      if (/font-weight\s*:\s*(700|bold)/.test(rules)) tags.push('b');
      if (/font-style\s*:\s*italic/.test(rules)) tags.push('em');
      if (/text-decoration[^;]*underline/.test(rules)) tags.push('u');
      if (tags.length) classFormats.set(className, tags);
    }
  }

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return '';
  let body = bodyMatch[1];

  body = body.replace(/<script[\s\S]*?<\/script>/gi, '');

  // Keep href on <a> tags, add target/rel, strip everything else
  body = body.replace(/<a [^>]*>/gi, (match) => {
    const hrefMatch = match.match(/href="([^"]*)"/);
    return hrefMatch ? `<a href="${hrefMatch[1]}" target="_blank" rel="noopener noreferrer">` : '<a>';
  });

  // Keep src and alt on <img> tags, strip everything else
  body = body.replace(/<img [^>]*>/gi, (match) => {
    const srcMatch = match.match(/src="([^"]*)"/);
    const altMatch = match.match(/alt="([^"]*)"/);
    if (!srcMatch) return '';
    const alt = altMatch ? ` alt="${altMatch[1]}"` : '';
    return `<img src="${srcMatch[1]}"${alt}>`;
  });

  // Convert spans to semantic tags using CSS class map (Google Docs uses classes, not inline styles)
  body = body.replace(/<span([^>]*)>/gi, (_, attrs) => {
    const tags = new Set<string>();
    // Class-based formatting (Google Docs default export)
    const classMatch = attrs.match(/class="([^"]*)"/);
    if (classMatch) {
      for (const cls of classMatch[1].split(/\s+/)) {
        for (const t of (classFormats.get(cls) || [])) tags.add(t);
      }
    }
    // Inline style fallback
    const styleVal = (attrs.match(/style="([^"]*)"/)?.[1] || '').toLowerCase();
    if (/font-weight\s*:\s*(700|bold)/.test(styleVal)) tags.add('b');
    if (/font-style\s*:\s*italic/.test(styleVal)) tags.add('em');
    if (/text-decoration[^;]*underline/.test(styleVal)) tags.add('u');
    return [...tags].map(t => `<${t}>`).join('');
  });
  body = body.replace(/<\/span>/gi, '</u></em></b>'); // harmless extra closes

  // Strip all attributes from structural tags
  body = body.replace(/<(h[1-6]|p|ul|ol|li|b|strong|em|i|u|br|hr|table|thead|tbody|tfoot|tr|th|td)[^>]*>/gi, '<$1>');

  // Unwrap divs
  body = body.replace(/<\/?div[^>]*>/gi, '');

  // Remove empty paragraphs
  body = body.replace(/<p>\s*(<br\s*\/?>\s*)*<\/p>/gi, '');

  // Strip the first h1 (Google Docs exports the document title as h1)
  body = body.replace(/<h1>[^<]*<\/h1>/, '');

  return body.trim();
}

async function fetchLearnContent(): Promise<string> {
  try {
    const res = await fetch(
      'https://docs.google.com/document/d/1y03Vihs-wPSsDHG5Y9bUw7j5-qFhczDC9CsMNFfPhYk/export?format=html',
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return '';
    const html = await res.text();
    return cleanGoogleDocHtml(html);
  } catch {
    return '';
  }
}

async function fetchDocTab(tab: string): Promise<string> {
  try {
    const res = await fetch(
      `https://docs.google.com/document/d/1y03Vihs-wPSsDHG5Y9bUw7j5-qFhczDC9CsMNFfPhYk/export?format=txt&tab=${tab}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return '';
    return (await res.text()).trim();
  } catch {
    return '';
  }
}

export default async function Home() {
  const allReps = loadHouseReps();
  const targetedReps = allReps.filter(r => r.targeted);
  const [signerData, learnContent, callScriptTemplate, emailTemplate] = await Promise.all([
    fetchSignerData(),
    fetchLearnContent(),
    fetchDocTab('t.rzwkn49ttbko'),
    fetchDocTab('t.s05b9d46sd46'),
  ]);
  return (
    <Suspense>
      <ClientPage
        signerData={signerData}
        allReps={allReps}
        targetedReps={targetedReps}
        learnContent={learnContent}
        callScriptTemplate={callScriptTemplate}
        emailTemplate={emailTemplate}
      />
    </Suspense>
  );
}
