const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function clean() {
  try {
    console.log('Cleaning db...');
    await prisma.user.deleteMany({ where: { role: { not: 'superadmin' } } });
    console.log('Deleted non-superadmin users');
    await prisma.college.deleteMany({});
    console.log('Deleted colleges');
    console.log('Done!');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
clean();
