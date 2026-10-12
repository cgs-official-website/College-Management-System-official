import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();
const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = 'admin@zuna.com';
  const password = 'Cgs@001a';

  // Hash the password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  console.log(`Seeding superadmin: ${email}`);

  // Check if user exists first
  const existingUser = await prisma.user.findFirst({
    where: { email }
  });

  if (existingUser) {
    console.log('User already exists, updating password and role...');
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        passwordHash,
        role: 'superadmin',
        accountStatus: 'active'
      }
    });
    console.log('Superadmin user updated successfully.');
  } else {
    console.log('Creating new superadmin user...');
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'superadmin',
        accountStatus: 'active'
      }
    });
    console.log('Superadmin user created successfully.');
  }
}

main()
  .catch((e) => {
    console.error('Error seeding superadmin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
