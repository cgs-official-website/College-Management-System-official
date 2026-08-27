import { prisma } from '../server.js';

let isSequenceEnsured = false;

/**
 * Ensures the PostgreSQL sequence 'college_code_seq' exists and is set
 * to at least the highest existing ZUNAC number in the database.
 * Concurrency-safe, non-destructive, and will never decrement an active sequence.
 */
export async function ensureCollegeCodeSequence(prismaClient = prisma) {
  if (isSequenceEnsured && prismaClient === prisma) return;

  try {
    // 1. Find all existing codes matching ^ZUNAC\d+$
    const colleges = await prismaClient.college.findMany({
      where: {
        registrationNo: { startsWith: 'ZUNAC' }
      },
      select: { registrationNo: true }
    });

    let maxNum = 0;
    for (const c of colleges) {
      const match = c.registrationNo?.match(/^ZUNAC(\d+)$/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (!isNaN(n) && n > maxNum) {
          maxNum = n;
        }
      }
    }

    const startVal = Math.max(maxNum + 1, 1);

    // 2. Create sequence if it doesn't exist
    await prismaClient.$executeRawUnsafe(`
      CREATE SEQUENCE IF NOT EXISTS college_code_seq START WITH ${startVal};
    `);

    // 3. Ensure sequence is not behind maxNum (without resetting backwards)
    if (maxNum > 0) {
      await prismaClient.$executeRawUnsafe(`
        DO $$
        DECLARE
          curr_val BIGINT;
        BEGIN
          SELECT last_value INTO curr_val FROM college_code_seq;
          IF curr_val < ${maxNum} THEN
            PERFORM setval('college_code_seq', ${maxNum});
          END IF;
        END $$;
      `);
    }

    isSequenceEnsured = true;
  } catch (error) {
    console.error('Failed to ensure college_code_seq:', error.message);
  }
}

/**
 * Atomically generates the next sequential College Code using PostgreSQL sequence.
 * Guaranteed concurrency-safe across simultaneous transactions.
 * Formats as ZUNAC001, ZUNAC002, ..., ZUNAC999, ZUNAC1000, etc.
 * 
 * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} tx
 * @returns {Promise<string>} e.g. "ZUNAC002"
 */
export async function getNextCollegeCode(tx = prisma) {
  const result = await tx.$queryRaw`SELECT nextval('college_code_seq') as next_val`;
  const nextNum = Number(result[0].next_val);
  const formattedCode = `ZUNAC${String(nextNum).padStart(3, '0')}`;
  return formattedCode;
}
