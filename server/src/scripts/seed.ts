// `npm run seed` — upserts templates by slug and (if ADMIN_* env is set) the admin user. Safe to re-run.
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { Template, type TemplateData } from '../models/Template';
import { User } from '../models/User';
import { closeBrowser, render } from '../services/render.service';
import { uploadBuffer } from '../services/storage.service';

const templates: Omit<TemplateData, 'createdAt' | 'updatedAt' | 'isActive' | 'thumbnailUrl'>[] = [
  {
    title: 'মহান বিজয় দিবস',
    slug: 'victory-day-classic',
    occasionType: 'victory-day',
    layoutConfig: {
      photoSlots: 3,
      defaultScheme: { primary: '#006A4E', secondary: '#F42A41', accent: '#FFD700', text: '#FFFFFF' },
      headlineDefault: 'মহান বিজয় দিবস',
      customBackground: false,
    },
  },
  {
    title: 'শোক ও স্মরণ',
    slug: 'mourning-tribute',
    occasionType: 'mourning',
    layoutConfig: {
      photoSlots: 2,
      defaultScheme: { primary: '#111111', secondary: '#3A3A3A', accent: '#B22222', text: '#FFFFFF' },
      headlineDefault: 'গভীর শ্রদ্ধাঞ্জলি',
      customBackground: false,
    },
  },
  {
    title: 'নির্বাচনী প্রচার',
    slug: 'campaign-bold',
    occasionType: 'campaign',
    layoutConfig: {
      photoSlots: 1,
      defaultScheme: { primary: '#0B5D1E', secondary: '#FFFFFF', accent: '#E63946', text: '#1A1A1A' },
      headlineDefault: 'আপনার ভোট আপনার অধিকার',
      customBackground: false,
    },
  },
  {
    title: 'ঈদ মোবারক',
    slug: 'eid-mubarak',
    occasionType: 'festival',
    layoutConfig: {
      photoSlots: 2,
      defaultScheme: { primary: '#0B3D2E', secondary: '#14614A', accent: '#F2C14E', text: '#FFFFFF' },
      headlineDefault: 'ঈদ মোবারক',
      customBackground: false,
    },
  },
  {
    title: 'শুভেচ্ছা',
    slug: 'greetings-warm',
    occasionType: 'greetings',
    layoutConfig: {
      photoSlots: 2,
      defaultScheme: { primary: '#7A1F2B', secondary: '#FFF6E5', accent: '#E0A526', text: '#3A1A1F' },
      headlineDefault: 'আন্তরিক শুভেচ্ছা',
      customBackground: false,
    },
  },
  {
    title: 'শহীদ দিবস ও মাতৃভাষা দিবস',
    slug: 'ekushey-february',
    occasionType: 'national-day',
    layoutConfig: {
      photoSlots: 2,
      defaultScheme: { primary: '#141414', secondary: '#3A3A3A', accent: '#D7263D', text: '#FFFFFF' },
      headlineDefault: 'অমর একুশে ফেব্রুয়ারি',
      customBackground: false,
    },
  },
  {
    title: 'মহান স্বাধীনতা দিবস',
    slug: 'independence-day',
    occasionType: 'national-day',
    layoutConfig: {
      photoSlots: 3,
      defaultScheme: { primary: '#006A4E', secondary: '#F42A41', accent: '#FFD700', text: '#FFFFFF' },
      headlineDefault: 'মহান স্বাধীনতা দিবস',
      customBackground: false,
    },
  },
  {
    title: 'শহীদ বুদ্ধিজীবী দিবস',
    slug: 'intellectuals-day',
    occasionType: 'mourning',
    layoutConfig: {
      photoSlots: 2,
      defaultScheme: { primary: '#F4F1EA', secondary: '#DCD6C8', accent: '#1A1A1A', text: '#1A1A1A' },
      headlineDefault: 'শহীদ বুদ্ধিজীবী দিবস',
      customBackground: false,
    },
  },
  {
    title: 'গণহত্যা দিবস (২৫ মার্চ)',
    slug: 'genocide-night',
    occasionType: 'mourning',
    layoutConfig: {
      photoSlots: 2,
      defaultScheme: { primary: '#0A0A0A', secondary: '#4A0D0D', accent: '#8B0000', text: '#FFFFFF' },
      headlineDefault: '২৫ মার্চ কালরাত্রি',
      customBackground: false,
    },
  },
  {
    title: 'পহেলা বৈশাখ',
    slug: 'pohela-boishakh',
    occasionType: 'festival',
    layoutConfig: {
      photoSlots: 2,
      defaultScheme: { primary: '#FFF8EC', secondary: '#C8102E', accent: '#E8A317', text: '#5A0E0E' },
      headlineDefault: 'শুভ নববর্ষ',
      customBackground: false,
    },
  },
  {
    title: 'শারদীয় দুর্গাপূজা',
    slug: 'durga-puja',
    occasionType: 'festival',
    layoutConfig: {
      photoSlots: 2,
      defaultScheme: { primary: '#5C0A0A', secondary: '#B3360C', accent: '#FFC72C', text: '#FFF4D6' },
      headlineDefault: 'শুভ শারদীয় দুর্গোৎসব',
      customBackground: false,
    },
  },
  {
    title: 'শুভ বুদ্ধপূর্ণিমা',
    slug: 'buddha-purnima',
    occasionType: 'festival',
    layoutConfig: {
      photoSlots: 2,
      defaultScheme: { primary: '#0E1A3A', secondary: '#2B4278', accent: '#F5D76E', text: '#FFFFFF' },
      headlineDefault: 'শুভ বুদ্ধপূর্ণিমা',
      customBackground: false,
    },
  },
  {
    title: 'শুভ বড়দিন',
    slug: 'christmas',
    occasionType: 'festival',
    layoutConfig: {
      photoSlots: 2,
      defaultScheme: { primary: '#8B1020', secondary: '#0F5132', accent: '#F2C94C', text: '#FFFFFF' },
      headlineDefault: 'শুভ বড়দিন',
      customBackground: false,
    },
  },
  {
    title: 'নিজের ডিজাইন',
    slug: 'own-design',
    occasionType: 'custom',
    layoutConfig: {
      photoSlots: 3,
      defaultScheme: { primary: '#222222', secondary: '#444444', accent: '#FFD700', text: '#FFFFFF' },
      headlineDefault: 'আপনার শিরোনাম',
      customBackground: true,
    },
  },
];

// Stands in for the user's own design on the "own-design" thumbnail.
const SAMPLE_BACKGROUND =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1600"><defs><linearGradient id="g" x2="1" y2="1"><stop offset="0" stop-color="#5b6b8c"/><stop offset="1" stop-color="#2b3247"/></linearGradient></defs><rect width="1200" height="1600" fill="url(#g)"/><path d="M0 1300 L1200 1000 V1600 H0z" fill="#ffffff22"/></svg>',
  );

// Grey head-and-shoulders silhouette standing in for leader photos on the thumbnails.
const SAMPLE_PHOTO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><rect width="300" height="400" fill="#cfcfcf"/><circle cx="150" cy="150" r="70" fill="#8a8a8a"/><path d="M30 400c0-90 55-150 120-150s120 60 120 150z" fill="#8a8a8a"/></svg>',
  );

// Renders the real HTML template with sample data so the gallery shows what the poster actually looks like.
// ponytail: uploads a new Cloudinary asset on every seed run; old ones are left behind (seed runs rarely).
async function renderThumbnail(t: (typeof templates)[number]): Promise<string> {
  const lc = t.layoutConfig!; // always set in the literals above
  const { png } = await render(t.slug, {
    scheme: lc.defaultScheme!,
    headlineSize: 'xl',
    name: 'আপনার নাম',
    designation: 'পদবি',
    organization: 'দল / সংগঠন',
    area: 'এলাকা',
    headline: lc.headlineDefault,
    photoUrls: Array(lc.photoSlots).fill(SAMPLE_PHOTO),
    backgroundUrl: lc.customBackground ? SAMPLE_BACKGROUND : undefined,
  });
  const url = await uploadBuffer(png, 'rise-together/thumbnails');
  return url.replace('/upload/', '/upload/w_600,f_auto,q_auto/'); // Cloudinary resizes on delivery
}

async function seed() {
  await mongoose.connect(env.MONGODB_URI);

  for (const t of templates) {
    const thumbnailUrl = await renderThumbnail(t);
    await Template.updateOne({ slug: t.slug }, { $set: { ...t, thumbnailUrl } }, { upsert: true, runValidators: true });
    console.log(`template: ${t.slug}`);
  }
  await closeBrowser();

  if (env.ADMIN_EMAIL && env.ADMIN_PASSWORD) {
    await User.updateOne(
      { email: env.ADMIN_EMAIL },
      { $set: { role: 'admin', passwordHash: await bcrypt.hash(env.ADMIN_PASSWORD, 10) }, $setOnInsert: { name: 'Admin' } },
      { upsert: true },
    );
    console.log(`admin: ${env.ADMIN_EMAIL}`);
  } else {
    console.log('admin: skipped (ADMIN_EMAIL / ADMIN_PASSWORD not set)');
  }

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
