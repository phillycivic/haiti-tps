import { readFileSync } from 'fs';
import { join } from 'path';
import signerData from '../data/signers.json';
import ClientPage from './components/ClientPage';

interface TargetedRep {
  name: string;
  party: string;
  stateDistrict: string;
  phone: string;
  area: string;
  searchTerms: string;
}

function loadTargetedReps(): TargetedRep[] {
  const csv = readFileSync(join(process.cwd(), 'data', 'targeted.csv'), 'utf8');
  return csv
    .trim()
    .split('\n')
    .slice(1)
    .filter(Boolean)
    .map(line => {
      const [name, party, , , stateDistrict, phone, area, searchTerms] = line.split(',');
      return { name, party, stateDistrict, phone, area: area || '', searchTerms: searchTerms || '' };
    });
}

function cleanGoogleDocHtml(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return '';
  let body = bodyMatch[1];

  body = body.replace(/<script[\s\S]*?<\/script>/gi, '');
  body = body.replace(/<style[\s\S]*?<\/style>/gi, '');

  // Keep href on <a> tags, add target/rel, strip everything else
  body = body.replace(/<a [^>]*>/gi, (match) => {
    const hrefMatch = match.match(/href="([^"]*)"/);
    return hrefMatch ? `<a href="${hrefMatch[1]}" target="_blank" rel="noopener noreferrer">` : '<a>';
  });

  // Convert styled spans to semantic elements before stripping
  body = body.replace(/<span([^>]*)>/gi, (match, attrs) => {
    const style = (attrs.match(/style="([^"]*)"/)?.[1] || '').toLowerCase();
    const tags: string[] = [];
    if (style.includes('font-weight:700') || style.includes('font-weight: 700') || style.includes('font-weight:bold')) tags.push('<b>');
    if (style.includes('font-style:italic') || style.includes('font-style: italic')) tags.push('<em>');
    if (style.includes('text-decoration:underline') || style.includes('text-decoration: underline')) tags.push('<u>');
    return tags.length ? tags.join('') : '';
  });
  body = body.replace(/<\/span>/gi, '</u></em></b>'); // close all; extras are harmless

  // Strip all attributes from structural tags (keep the tags themselves)
  body = body.replace(/<(h[1-6]|p|ul|ol|li|b|strong|em|i|u|br|hr|table|thead|tbody|tfoot|tr|th|td)[^>]*>/gi, '<$1>');

  // Unwrap divs (keep content)
  body = body.replace(/<\/?div[^>]*>/gi, '');

  // Remove empty paragraphs
  body = body.replace(/<p>\s*(<br\s*\/?>\s*)*<\/p>/gi, '');

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

export default async function Home() {
  const targetedReps = loadTargetedReps();
  const learnContent = await fetchLearnContent();
  return <ClientPage signerData={signerData} targetedReps={targetedReps} learnContent={learnContent} />;
}
