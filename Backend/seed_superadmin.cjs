const bcrypt = require('bcryptjs');
const importDynamic = new Function('modulePath', 'return import(modulePath)');

async function main() {
  const { prisma } = await importDynamic('./src/server.js');
  try {
    const passwordHash = await bcrypt.hash('Cgs@001a', 10);
    
    // Check if superadmin exists
    let superadmin = await prisma.user.findFirst({
      where: { email: 'admin@zuna.com' }
    });

    if (superadmin) {
      console.log('Superadmin exists, updating password...');
      await prisma.user.update({
        where: { id: superadmin.id },
        data: { passwordHash, role: 'superadmin' }
      });
    } else {
      console.log('Creating superadmin...');
      await prisma.user.create({
        data: {
          email: 'admin@zuna.com',
          passwordHash,
          role: 'superadmin',
          accountStatus: 'active'
        }
      });
    }
    console.log('Superadmin stored successfully.');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    process.exit(0);
  }
}

main();
