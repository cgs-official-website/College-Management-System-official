import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function deleteColleges() {
  const colleges = await prisma.college.findMany({ select: { id: true, name: true, slug: true } });
  console.log('Colleges in DB:', colleges);
  
  const leads = await prisma.lead.findMany();
  console.log('Leads in DB:', leads);
}

deleteColleges().catch(console.error).finally(() => prisma.$disconnect());
