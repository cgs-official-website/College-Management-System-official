const importDynamic = new Function('modulePath', 'return import(modulePath)');
async function main() {
  const { prisma } = await importDynamic('./src/server.js');
  try {
    console.log('Truncating College with CASCADE...');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "College" CASCADE');
    console.log('Colleges truncated.');
    console.log('Deleting non-superadmin users...');
    await prisma.$executeRawUnsafe("DELETE FROM \"User\" WHERE role != 'superadmin'");
    console.log('Users cleaned.');
    console.log('Done!');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    process.exit(0);
  }
}
main();
