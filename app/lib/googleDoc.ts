/*
 * googleDoc.ts — fetch and clean content from public Google Docs
 *
 * EXPORTED FUNCTIONS
 * ------------------
 * fetchGoogleDocHtml(docId, revalidate?)
 *   Fetches a Google Doc exported as HTML, strips Google-specific markup,
 *   and returns clean HTML safe to render with dangerouslySetInnerHTML.
 *   Preserves: headings, paragraphs, lists, tables, links (with target=_blank),
 *   images (src/alt only), and inline formatting (bold, italic, underline)
 *   detected from the doc's embedded CSS classes.
 *   Strips: the first <h1> (Google exports the doc title as h1), empty <p>s,
 *   all class/style/id attributes on structural tags, <script> tags.
 *
 * fetchGoogleDocTab(docId, tabId, revalidate?)
 *   Fetches a specific tab of a Google Doc as plain text (format=txt).
 *   Use this for structured text content like call scripts or email templates
 *   where you want raw text, not HTML.
 *   Tab IDs look like "t.rzwkn49ttbko" — find them in the doc URL when the tab is open.
 *
 * USAGE NOTES
 * -----------
 * - The doc must be publicly accessible ("Anyone with the link can view").
 * - revalidate controls Next.js ISR cache in seconds (default 60).
 * - Both functions return '' on any fetch or parse failure (never throw).
 * - DOC_ID is the long alphanumeric string in the Google Docs URL:
 *     https://docs.google.com/document/d/<DOC_ID>/edit
 */

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

export async function fetchGoogleDocHtml(docId: string, revalidate = 60): Promise<string> {
  try {
    const res = await fetch(
      `https://docs.google.com/document/d/${docId}/export?format=html`,
      { next: { revalidate } }
    );
    if (!res.ok) return '';
    const html = await res.text();
    return cleanGoogleDocHtml(html);
  } catch {
    return '';
  }
}

export async function fetchGoogleDocTab(docId: string, tabId: string, revalidate = 60): Promise<string> {
  try {
    const res = await fetch(
      `https://docs.google.com/document/d/${docId}/export?format=txt&tab=${tabId}`,
      { next: { revalidate } }
    );
    if (!res.ok) return '';
    return (await res.text()).trim();
  } catch {
    return '';
  }
}
