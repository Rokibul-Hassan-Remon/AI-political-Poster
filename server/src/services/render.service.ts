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
  photoAdjust?: { x?: number | null; y?: number | null; zoom?: number | null }[];
  layout?: LayoutEntry[];
  backgroundUrl?: string; // user's own design (templates with customBackground)
  // User-picked text color per section; every template styles these with .headline / .name / .meta.
  textColors?: { headline?: string | null; name?: string | null; meta?: string | null };
}

// Override CSS for the user's text colors, added after the template's own styles.
// Keys are read by name, not Object.entries: the poster passes a Mongoose subdocument, whose own keys are internals.
function textColorCss(colors: RenderData['textColors'] = {}): string {
  return (['headline', 'name', 'meta'] as const)
    .filter((key) => /^#[0-9a-fA-F]{6}$/.test(colors[key] ?? ''))
    .map((key) => `.${key}{color:${colors[key]}!important}`)
    .join('');
}

// User's move/scale/rotate of one [data-layer] element, relative to where the template puts it.
// shape (photos only) replaces the template's frame; hidden hides the part but keeps its slot, so other moves stay put.
export interface LayoutEntry { key: string; dx: number; dy: number; scale: number; rotate: number; shape?: PhotoShape; hidden?: boolean }
export type PhotoShape = 'circle' | 'square' | 'portrait' | 'landscape';
// Keeps the template's frame width; height follows the ratio. Inline style, so it beats the template's .photo rules.
// align-self stops a flex row (e.g. campaign-bold) from stretching the height back to the tallest photo.
const SHAPE_CSS: Record<PhotoShape, string> = {
  circle: 'height:auto;align-self:center;aspect-ratio:1/1;border-radius:50%',
  square: 'height:auto;align-self:center;aspect-ratio:1/1;border-radius:24px',
  portrait: 'height:auto;align-self:center;aspect-ratio:3/4;border-radius:24px',
  landscape: 'height:auto;align-self:center;aspect-ratio:4/3;border-radius:24px',
};
// One movable part cut out of the poster (transparent PNG) + its box in poster px, for the client editor.
export interface Layer { key: string; png: Buffer; x: number; y: number; w: number; h: number }

// Room around each layer for shadows/outlines that paint outside the element box.
const LAYER_PAD = 60;

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const clamp = (n: unknown, min: number, max: number, dflt: number) =>
  typeof n === 'number' && Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt;

// Same result as the form preview (object-position + scale(zoom) around the focal point), but without
// scaling the frame/border: object-view-box (Chromium) crops the image to 1/zoom around (x, y) first.
function adjustStyle(a: NonNullable<RenderData['photoAdjust']>[number] | undefined): string {
  if (!a) return '';
  const x = clamp(a.x, 0, 100, 50), y = clamp(a.y, 0, 100, 50), zoom = clamp(a.zoom, 1, 3, 1);
  const k = 1 - 1 / zoom; // share of each axis cropped away
  const r = (n: number) => +n.toFixed(2);
  return `object-position:${x}% ${y}%;object-view-box:inset(${r(k * y)}% ${r(k * (100 - x))}% ${r(k * (100 - y))}% ${r(k * x)}%)`;
}

// photoUrls[0] is the user's main photo: tagged `.main` and, with 3 photos, moved to the middle.
function photoTags(urls: string[], adjust: RenderData['photoAdjust'] = [], layout: LayoutEntry[] = []): string {
  const tags = urls.map((u, i) => {
    const shape = layout.find((l) => l.key === `photo${i}`)?.shape;
    const style = [adjustStyle(adjust[i]), shape && SHAPE_CSS[shape]].filter(Boolean).join(';');
    return `<img data-layer="photo${i}" class="photo${i === 0 ? ' main' : ''}" src="${escapeHtml(u)}"${style && ` style="${style}"`} alt="">`;
  });
  return (tags.length === 3 ? [tags[1], tags[0], tags[2]] : tags).join('');
}

// Every {{key}} in the template is replaced; text values are escaped, `fonts` and `photos` are built here.
export function fillTemplate(html: string, d: RenderData): string {
  const vars: Record<string, string> = {
    fonts: FONTS_CSS,
    photos: photoTags(d.photoUrls, d.photoAdjust, d.layout),
    photoCount: String(d.photoUrls.length),
    headlineSize: d.headlineSize,
    ...d.scheme, // hex colors, validated by the Template model / Gemini zod schema
    name: escapeHtml(d.name),
    designation: escapeHtml(d.designation),
    organization: escapeHtml(d.organization),
    area: escapeHtml(d.area ?? ''),
    headline: escapeHtml(d.headline),
    backgroundUrl: escapeHtml(d.backgroundUrl ?? ''),
  };
  return html
    .replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '')
    .replace('</head>', `<style>${textColorCss(d.textColors)}</style></head>`);
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

export async function render(
  slug: string,
  data: RenderData,
): Promise<{ png: Buffer; pdf: Buffer; background: Buffer; layers: Layer[] }> {
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

    // Layers are cut from the template's own layout (before the user's moves), so the editor and the
    // final render agree: both place the same pixels at clip + (dx, dy), rotated/scaled around the clip corner.
    const clips = await page.evaluate((pad) => {
      return [...document.querySelectorAll<HTMLElement>('[data-layer]')].map((el) => {
        const r = el.getBoundingClientRect();
        const x = Math.max(0, Math.floor(r.left - pad));
        const y = Math.max(0, Math.floor(r.top - pad));
        const w = Math.min(1200, Math.ceil(r.right + pad)) - x;
        const h = Math.min(1600, Math.ceil(r.bottom + pad)) - y;
        return { key: el.dataset.layer!, x, y, w, h, ox: x - r.left, oy: y - r.top };
      });
    }, LAYER_PAD);
    const withCss = async <T>(css: string, shot: () => Promise<T>) => {
      const style = await page.addStyleTag({ content: css });
      try {
        return await shot();
      } finally {
        await style.evaluate((n) => n.remove());
      }
    };
    // clip.scale 0.5 undoes deviceScaleFactor 2: editor images are 1 px per poster px.
    const background = Buffer.from(
      await withCss('[data-layer]{visibility:hidden!important}', () =>
        page.screenshot({ type: 'jpeg', quality: 85, clip: { x: 0, y: 0, width: 1200, height: 1600, scale: 0.5 } }),
      ),
    );
    const layers: Layer[] = [];
    for (const { key, x, y, w, h } of clips) {
      const only = `[data-layer="${key}"]`;
      const css = `html,body{background:transparent!important;border-color:transparent!important;outline-color:transparent!important}
        body *,body::before,body::after{visibility:hidden!important}${only},${only} *{visibility:visible!important}`;
      const png = await withCss(css, () =>
        page.screenshot({ type: 'png', omitBackground: true, clip: { x, y, width: w, height: h, scale: 0.5 } }),
      );
      layers.push({ key, png: Buffer.from(png), x, y, w, h });
    }

    // Layout order is paint order (the editor's "bring to front"); every layer gets a transform and z-index
    // so none is left painting by DOM order underneath. Layers missing from the layout stay at the bottom.
    if (data.layout?.length) {
      await page.evaluate(
        (clips, layout) => {
          for (const c of clips) {
            const i = layout.findIndex((e) => e.key === c.key);
            const l = layout[i] ?? { dx: 0, dy: 0, scale: 1, rotate: 0 };
            const el = document.querySelector<HTMLElement>(`[data-layer="${c.key}"]`)!;
            el.style.transformOrigin = `${c.ox}px ${c.oy}px`;
            el.style.transform = `translate(${l.dx}px,${l.dy}px) rotate(${l.rotate}deg) scale(${l.scale})`;
            if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
            el.style.zIndex = String(i + 1);
            if (l.hidden) el.style.visibility = 'hidden';
          }
        },
        clips,
        data.layout,
      );
    }
    const png = Buffer.from(await page.screenshot({ type: 'png' }));
    const pdf = Buffer.from(await page.pdf({ width: '1200px', height: '1600px', printBackground: true, pageRanges: '1' }));
    return { png, pdf, background, layers };
  } finally {
    await page.close();
  }
}
