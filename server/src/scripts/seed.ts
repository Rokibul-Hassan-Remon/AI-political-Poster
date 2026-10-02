// `npm run seed` — upserts templates by slug and (if ADMIN_* env is set) the admin user. Safe to re-run.
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { Template, type TemplateData } from '../models/Template';
import { User } from '../models/User';

const templates: Omit<TemplateData, 'createdAt' | 'updatedAt' | 'isActive' | 'thumbnailUrl'>[] = [
  {
    title: 'মহান বিজয় দিবস',
    slug: 'victory-day-classic',
    occasionType: 'victory-day',
    layoutConfig: {
      photoSlots: 3,
      defaultScheme: { primary: '#006A4E', secondary: '#F42A41', accent: '#FFD700', text: '#FFFFFF' },
      headlineDefault: 'মহান বিজয় দিবস',
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
    },
  },
];

async function seed() {
  await mongoose.connect(env.MONGODB_URI);

  for (const t of templates) {
    await Template.updateOne({ slug: t.slug }, { $set: t }, { upsert: true, runValidators: true });
    console.log(`template: ${t.slug}`);
  }

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
