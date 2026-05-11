const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function migrate() {
  console.log('Starting UUID Migration for BOMs...');
  
  const boms = await prisma.boms.findMany({
    select: { id: true, public_id: true }
  });

  console.log(`Found ${boms.length} BOM records.`);

  for (const bom of boms) {
    // Generate a fresh v4 UUID if it's missing or matches the MySQL v1 pattern (optional check)
    const newUuid = crypto.randomUUID();
    await prisma.boms.update({
      where: { id: bom.id },
      data: { public_id: newUuid }
    });
    console.log(`Updated BOM ID ${bom.id} with secure UUID: ${newUuid}`);
  }

  console.log('BOM UUID migration completed successfully.');
  await prisma.$disconnect();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
