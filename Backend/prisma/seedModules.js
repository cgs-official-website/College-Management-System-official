import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEFAULT_MODULES = [
  { key: 'students', label: 'Students Directory' },
  { key: 'staff', label: 'HR & Staff Management' },
  { key: 'attendance', label: 'Attendance Management' },
  { key: 'fees', label: 'Fees & Financials' },
  { key: 'exams', label: 'Exams & Marks' },
  { key: 'library', label: 'Library Management' },
  { key: 'hostel', label: 'Hostel Management' },
  { key: 'transport', label: 'Transport & Routes' },
  { key: 'api_integration', label: 'API Integrations' },
  { key: 'inventory', label: 'Inventory Management' },
];

async function seedModules() {
  console.log('Seeding default modules...');
  for (const mod of DEFAULT_MODULES) {
    await prisma.module.upsert({
      where: { key: mod.key },
      update: { label: mod.label },
      create: {
        key: mod.key,
        label: mod.label,
      },
    });
    console.log(`- Seeded module: ${mod.key} (${mod.label})`);
  }
  console.log('Finished seeding default modules.');
}

seedModules()
  .catch((err) => {
    console.error('Error seeding modules:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
