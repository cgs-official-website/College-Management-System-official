import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function clean() {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  const seen = new Set();
  
  for (const user of users) {
    if (seen.has(user.email)) {
      console.log('Deleting duplicate user:', user.email, 'ID:', user.id);
      await prisma.user.delete({ where: { id: user.id } });
    } else {
      seen.add(user.email);
    }
  }
  console.log('Cleanup done!');
}

clean().catch(console.error).finally(() => prisma.$disconnect());
