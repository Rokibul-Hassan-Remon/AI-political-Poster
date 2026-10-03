import { GenerationLog } from '../models/GenerationLog';
import { Poster } from '../models/Poster';
import { Template } from '../models/Template';
import { suggest, suggestionSchema, type Suggestion } from './gemini.service';
import { render, type PhotoShape } from './render.service';
import { uploadBuffer } from './storage.service';

// Used when Gemini is off or fails: template colors, size by headline length.
function fallback(scheme: Suggestion['scheme'], headline: string): Suggestion {
  const len = [...headline].length;
  return {
    scheme,
    headlineSize: len <= 12 ? '2xl' : len <= 24 ? 'xl' : 'lg',
  };
}

// Background job (D4): never awaited by the route, so it must never throw.
// keepSuggestion: a layout-only re-render reuses the last colors instead of asking Gemini again.
export async function run(posterId: string, { keepSuggestion = false } = {}): Promise<void> {
  const started = Date.now();
  let prompt: string | undefined;
  let tokens: number | undefined;
  try {
    const poster = await Poster.findById(posterId);
    if (!poster) return; // deleted while queued
    const template = await Template.findById(poster.templateId);
    if (!template) throw new Error('Template no longer exists');
    const { defaultScheme, headlineDefault } = template.layoutConfig!;
    const scheme = { ...defaultScheme! };
    const form = poster.formData!;
    const headline = form.headline || headlineDefault;

    const kept = keepSuggestion ? suggestionSchema.safeParse(poster.aiSuggestion) : undefined;
    let suggestion: Suggestion;
    if (kept?.success) suggestion = kept.data;
    else try {
      ({ suggestion, prompt, tokens } = await suggest({
        occasionType: `${template.occasionType} (${template.title})`, // title tells Gemini which day, e.g. 21 Feb vs 26 March
        defaultScheme: scheme,
        headline,
      }));
    } catch (err) {
      console.warn('Gemini skipped, using default scheme:', (err as Error).message);
      suggestion = fallback(scheme, headline);
    }

    const { png, pdf, background, layers } = await render(template.slug, {
      scheme: suggestion.scheme,
      headlineSize: suggestion.headlineSize,
      name: form.name,
      designation: form.designation,
      organization: form.organization,
      area: form.area ?? undefined,
      headline,
      photoUrls: poster.uploadedPhotoUrls, // user's order; [0] is the main photo
      photoAdjust: poster.photoAdjust ?? undefined,
      backgroundUrl: poster.backgroundUrl ?? undefined,
      textColors: poster.textColors ?? undefined,
      layout: poster.layout?.map((l) => ({
        key: l.key!, dx: l.dx!, dy: l.dy!, scale: l.scale!, rotate: l.rotate!,
        shape: (l.shape ?? undefined) as PhotoShape | undefined, // zod-checked in the layout route
        hidden: l.hidden ?? undefined,
      })),
    });
    const folder = `rise-together/posters/${poster.userId}`;
    // ponytail: layer files of earlier renders stay in Cloudinary, like the old PNG/PDF.
    const [imageUrl, pdfUrl, backgroundUrl, ...layerUrls] = await Promise.all(
      [png, pdf, background, ...layers.map((l) => l.png)].map((b) => uploadBuffer(b, folder)),
    );
    const layerDocs = {
      background: backgroundUrl,
      items: layers.map(({ key, x, y, w, h }, i) => ({ key, url: layerUrls[i], x, y, w, h })),
    };

    // updateOne, not save(): if the user deleted the poster meanwhile, nothing is re-created.
    await Poster.updateOne(
      { _id: posterId },
      { status: 'completed', aiSuggestion: suggestion, generatedImageUrl: imageUrl, generatedPdfUrl: pdfUrl, layers: layerDocs, $unset: { error: 1 } },
    );
    await GenerationLog.create({ posterId, promptUsed: prompt, tokensUsed: tokens, latencyMs: Date.now() - started, success: true });
  } catch (err) {
    console.error('Generation failed:', posterId, err);
    await Promise.all([
      Poster.updateOne({ _id: posterId }, { status: 'failed', error: 'Poster generation failed, please retry' }),
      GenerationLog.create({ posterId, promptUsed: prompt, tokensUsed: tokens, latencyMs: Date.now() - started, success: false, error: String(err) }),
    ]).catch((e) => console.error('Could not record failure:', posterId, e));
  }
}

// Jobs live in-process (D4); anything still `generating` at boot was lost in a restart.
export function failStaleJobs() {
  return Poster.updateMany({ status: 'generating' }, { status: 'failed', error: 'Server restarted, please retry' });
}
