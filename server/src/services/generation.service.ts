import { Poster } from '../models/Poster';

// Background job (D4): never awaited by the route, so it must never throw.
// ponytail: stub until the generation module lands (Gemini + Puppeteer); it marks the poster failed.
export async function run(posterId: string): Promise<void> {
  try {
    await Poster.updateOne({ _id: posterId }, { status: 'failed', error: 'Poster generation is not available yet' });
  } catch (err) {
    console.error('Generation job crashed:', posterId, err);
  }
}

// Jobs live in-process (D4); anything still `generating` at boot was lost in a restart.
export function failStaleJobs() {
  return Poster.updateMany({ status: 'generating' }, { status: 'failed', error: 'Server restarted, please retry' });
}
