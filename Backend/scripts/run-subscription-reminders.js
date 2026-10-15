import 'dotenv/config';
import { checkAndSendSubscriptionReminders } from '../src/jobs/subscriptionReminder.job.js';
import { prisma } from '../src/lib/prisma.js';

const isDryRun = process.argv.includes('--dry-run');

async function main() {
  console.log('====================================================');
  console.log(`[Subscription Reminders Runner] Mode: ${isDryRun ? 'DRY-RUN (Simulated)' : 'LIVE (Will send emails & notifications)'}`);
  console.log('====================================================\n');

  try {
    const results = await checkAndSendSubscriptionReminders({ dryRun: isDryRun });

    console.log('\n----------------------------------------------------');
    console.log('SUMMARY RESULTS:');
    console.log('----------------------------------------------------');

    if (results.length === 0) {
      console.log('No active subscriptions found in the database.');
    } else {
      results.forEach((r, idx) => {
        console.log(`\n[${idx + 1}] College: "${r.collegeName}" (ID: ${r.collegeId})`);
        console.log(`    Status: ${r.status} | Plan: ${r.planTier || 'N/A'}`);
        console.log(`    Expiry Date (IST): ${r.expiryDate || 'None'}`);
        console.log(`    Today (IST):       ${r.todayIST || 'N/A'}`);
        console.log(`    Days Remaining:    ${r.daysLeft !== null && r.daysLeft !== undefined ? r.daysLeft : 'N/A'}`);
        console.log(`    Exactly 7 Days?:   ${r.isExactly7Days ? 'YES' : 'NO'}`);
        console.log(`    Already Reminded?: ${r.alreadySentForThisExpiry ? 'YES (Deduplicated)' : 'NO'}`);
        console.log(`    Action Taken:      ${r.action}`);
        if (r.error) {
          console.log(`    Error Details:     ${r.error}`);
        }
      });
    }

    console.log('\n====================================================');
    console.log('Finished processing subscription reminders.');
    console.log('====================================================');
  } catch (err) {
    console.error('Fatal error running subscription reminders script:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
