import { GenerationLog } from '../models/GenerationLog';
import { Poster } from '../models/Poster';
import { Template } from '../models/Template';
import { suggest, type Suggestion } from './gemini.service';
import { render } from './render.service';
import { uploadBuffer } from './storage.service';

// Used when Gemini is off or fails: template colors, photos as uploaded, size by headline length.
function fallback(scheme: Suggestion['scheme'], headline: string, photoCount: number): Suggestion {
  const len = [...headline].length;
  return {
    scheme,
    photoOrder: [...Array(photoCount).keys()],
    headlineSize: len <= 12 ? '2xl' : len <= 24 ? 'xl' : 'lg',
  };
}

// Background job (D4): never awaited by the route, so it must never throw.
export async function run(posterId: string): Promise<void> {
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
    const photos = poster.uploadedPhotoUrls;

    let suggestion: Suggestion;
    try {
      ({ suggestion, prompt, tokens } = await suggest({
        occasionType: template.occasionType,
        defaultScheme: scheme,
        headline,
        photoCount: photos.length,
      }));
    } catch (err) {
      console.warn('Gemini skipped, using default scheme:', (err as Error).message);
      suggestion = fallback(scheme, headline, photos.length);
    }

    const { png, pdf } = await render(template.slug, {
      scheme: suggestion.scheme,
      headlineSize: suggestion.headlineSize,
      name: form.name,
      designation: form.designation,
      organization: form.organization,
      area: form.area ?? undefined,
      headline,
      photoUrls: suggestion.photoOrder.map((i) => photos[i]),
    });
    const folder = `rise-together/posters/${poster.userId}`;
    const [imageUrl, pdfUrl] = await Promise.all([uploadBuffer(png, folder), uploadBuffer(pdf, folder)]);

    // updateOne, not save(): if the user deleted the poster meanwhile, nothing is re-created.
    await Poster.updateOne(
      { _id: posterId },
      { status: 'completed', aiSuggestion: suggestion, generatedImageUrl: imageUrl, generatedPdfUrl: pdfUrl, $unset: { error: 1 } },
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
