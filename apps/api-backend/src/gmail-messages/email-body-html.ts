const HTML_MARKUP_PATTERN = /<[a-z!/][^>]*>/i;

const EMAIL_CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  'img-src https: http: data:',
  "style-src 'unsafe-inline' https: http:",
  'font-src data: https: http:',
  "object-src 'none'",
  "form-action 'none'",
  "frame-src 'none'",
  "script-src 'none'",
].join('; ');

const EMAIL_RESET_STYLES = `
  html, body { height: auto !important; min-height: 0 !important; margin: 0; }
  img { max-width: 100%; height: auto; }
  img[width="1"], img[height="1"], img[width="0"], img[height="0"] { display: none !important; }
`.trim();

const PLAINTEXT_VIEWER_STYLES = `
  html, body { margin: 0; padding: 0; background: #f4f4f5; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #111827;
    padding: 16px;
  }
  .email-card {
    max-width: 640px;
    margin: 0 auto;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 24px;
    line-height: 1.5;
  }
  .email-card p { margin: 0 0 12px; overflow-wrap: anywhere; }
  .email-card dl { margin: 16px 0 0; }
  .email-row {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.4fr);
    gap: 8px 16px;
    padding: 10px 0;
    border-bottom: 1px solid #f3f4f6;
  }
  .email-row:last-child { border-bottom: 0; }
  .email-row dt {
    color: #6b7280;
    font-size: 13px;
    font-weight: 500;
  }
  .email-row dd {
    margin: 0;
    font-weight: 600;
    text-align: right;
    overflow-wrap: anywhere;
  }
`.trim();

const EMAIL_DOCUMENT_HEAD = [
  '<meta charset="utf-8" />',
  '<meta name="viewport" content="width=device-width, initial-scale=1" />',
  `<meta http-equiv="Content-Security-Policy" content="${EMAIL_CONTENT_SECURITY_POLICY}" />`,
  '<base target="_blank" />',
  `<style>${EMAIL_RESET_STYLES}</style>`,
].join('');

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function looksLikeHtml(body: string): boolean {
  return HTML_MARKUP_PATTERN.test(body);
}

function extractMeaningfulLines(body: string): string[] {
  return body
    .replace(/\u00a0/g, ' ')
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t\f\v]+/g, ' ').trim())
    .filter((line) => line.length > 0);
}

function isLabelLine(line: string): boolean {
  if (line.length > 80 || /https?:\/\//i.test(line)) {
    return false;
  }

  return /[:：]\s*$/.test(line);
}

function beautifyPlainText(body: string): string {
  const lines = extractMeaningfulLines(body);
  const blocks: string[] = [];
  const rows: string[] = [];

  const flushRows = () => {
    if (rows.length === 0) {
      return;
    }

    blocks.push(`<dl>${rows.join('')}</dl>`);
    rows.length = 0;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    const next = lines[index + 1];

    if (next !== undefined && isLabelLine(line) && !isLabelLine(next)) {
      const label = line.replace(/[:：]\s*$/, '');
      rows.push(
        `<div class="email-row"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(next)}</dd></div>`,
      );
      index += 1;
      continue;
    }

    flushRows();
    blocks.push(`<p>${escapeHtml(line)}</p>`);
  }

  flushRows();

  const content =
    blocks.length > 0 ? blocks.join('') : `<p>${escapeHtml(body.trim())}</p>`;

  return `<!doctype html><html><head>${EMAIL_DOCUMENT_HEAD}<style>${PLAINTEXT_VIEWER_STYLES}</style></head><body><article class="email-card">${content}</article></body></html>`;
}

function injectViewerChrome(body: string): string {
  const headOpen = body.match(/<head\b[^>]*>/i);
  if (headOpen?.index !== undefined) {
    const insertAt = headOpen.index + headOpen[0].length;
    return `${body.slice(0, insertAt)}${EMAIL_DOCUMENT_HEAD}${body.slice(insertAt)}`;
  }

  const htmlOpen = body.match(/<html\b[^>]*>/i);
  if (htmlOpen?.index !== undefined) {
    const insertAt = htmlOpen.index + htmlOpen[0].length;
    return `${body.slice(0, insertAt)}<head>${EMAIL_DOCUMENT_HEAD}</head>${body.slice(insertAt)}`;
  }

  return `<!doctype html><html><head>${EMAIL_DOCUMENT_HEAD}</head><body>${body}</body></html>`;
}

/** Turn a stored Gmail body into a document the iframe can render as-is. */
export function toRenderableHtml(body: string): string {
  if (!looksLikeHtml(body)) {
    return beautifyPlainText(body);
  }

  return injectViewerChrome(body);
}
