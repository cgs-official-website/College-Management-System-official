import { prisma } from './src/server.js';
async function sync() {
  const entities = await prisma.customEntity.findMany();
  for (const entity of entities) {
    const key = `custom_${entity.collegeId}_${entity.slug}`;
    const exists = await prisma.module.findUnique({ where: { key } });
    if (!exists) {
      await prisma.module.create({
        data: { key, label: entity.name }
      });
      console.log('Created module for', key);
    }
  }
  console.log('Done!');
  process.exit(0);
}
sync().catch(console.error);
