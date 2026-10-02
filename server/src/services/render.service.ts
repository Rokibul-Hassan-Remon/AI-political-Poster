import { readFileSync } from 'node:fs';
import path from 'node:path';
import puppeteer, { type Browser } from 'puppeteer';

// Works from both src/services (tsx) and dist/services (node): the HTML/fonts stay in src/templates.
const TEMPLATES_DIR = path.join(__dirname, '..', '..', 'src', 'templates');

// Fonts are embedded as data URIs so rendering never depends on the network.
const fontFace = (file: string, weight: number) =>
  `@font-face{font-family:'Hind Siliguri';font-weight:${weight};src:url(data:font/ttf;base64,${readFileSync(
    path.join(TEMPLATES_DIR, 'fonts', file),
  ).toString('base64')}) format('truetype');}`;
const FONTS_CSS = fontFace('HindSiliguri-Regular.ttf', 400) + fontFace('HindSiliguri-Bold.ttf', 700);

export interface RenderData {
  scheme: { primary: string; secondary: string; accent: string; text: string };
  headlineSize: 'lg' | 'xl' | '2xl';
  name: string;
  designation: string;
  organization: string;
  area?: string;
  headline: string;
  photoUrls: string[];
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

// Every {{key}} in the template is replaced; text values are escaped, `fonts` and `photos` are built here.
export function fillTemplate(html: string, d: RenderData): string {
  const vars: Record<string, string> = {
    fonts: FONTS_CSS,
    photos: d.photoUrls.map((u) => `<img class="photo" src="${escapeHtml(u)}" alt="">`).join(''),
    photoCount: String(d.photoUrls.length),
    headlineSize: d.headlineSize,
    ...d.scheme, // hex colors, validated by the Template model / Gemini zod schema
    name: escapeHtml(d.name),
    designation: escapeHtml(d.designation),
    organization: escapeHtml(d.organization),
    area: escapeHtml(d.area ?? ''),
    headline: escapeHtml(d.headline),
  };
  return html.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

let browser: Promise<Browser> | undefined;
function getBrowser() {
  browser ??= puppeteer.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] }).then((b) => {
    b.on('disconnected', () => (browser = undefined)); // relaunch next time if Chromium dies
    return b;
  });
  return browser;
}

// For one-off scripts (seed) so Node can exit; the server keeps the browser for its lifetime.
export async function closeBrowser() {
  await (await browser)?.close();
}

export async function render(slug: string, data: RenderData): Promise<{ png: Buffer; pdf: Buffer }> {
  const html = fillTemplate(readFileSync(path.join(TEMPLATES_DIR, `${slug}.html`), 'utf8'), data);
  const page = await (await getBrowser()).newPage();
  try {
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'load', timeout: 30_000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      const imgs = [...document.images];
      if (imgs.some((img) => !img.complete || img.naturalWidth === 0)) throw new Error('A photo failed to load');
    });
    const png = Buffer.from(await page.screenshot({ type: 'png' }));
    const pdf = Buffer.from(await page.pdf({ width: '1200px', height: '1600px', printBackground: true, pageRanges: '1' }));
    return { png, pdf };
  } finally {
    await page.close();
  }
}
