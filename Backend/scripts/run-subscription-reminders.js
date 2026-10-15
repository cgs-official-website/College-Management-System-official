import 'dotenv/config';
import {
  checkAndSendSubscriptionReminders,
  checkAndExpireSubscriptions,
} from '../src/jobs/subscriptionReminder.job.js';
import { prisma } from '../src/lib/prisma.js';

const isDryRun = process.argv.includes('--dry-run');

async function main() {
  console.log('====================================================');
  console.log(`[Subscription Tasks Runner] Mode: ${isDryRun ? 'DRY-RUN (Simulated)' : 'LIVE (Will update DB & send emails)'}`);
  console.log('====================================================\n');

  try {
    console.log('[1/2] Checking expired subscriptions...');
    const expiredResults = await checkAndExpireSubscriptions({ dryRun: isDryRun });

    console.log('\n----------------------------------------------------');
    console.log('EXPIRED SUBSCRIPTIONS RESULTS:');
    console.log('----------------------------------------------------');
    if (expiredResults.length === 0) {
      console.log('No expired active subscriptions found.');
    } else {
      expiredResults.forEach((r, idx) => {
        console.log(`\n[${idx + 1}] College: "${r.collegeName}" (ID: ${r.collegeId})`);
        console.log(`    Current Status:    ${r.previousStatus || r.status}`);
        console.log(`    New Status:        ${r.newStatus || r.status}`);
        console.log(`    Expiry Date (IST): ${r.expiryDate || 'None'}`);
        console.log(`    Today (IST):       ${r.todayIST || 'N/A'}`);
        console.log(`    Days Remaining:    ${r.daysLeft}`);
        console.log(`    Action Taken:      ${r.action}`);
      });
    }

    console.log('\n\n[2/2] Checking daily expiry reminders (1-7 days before expiry)...');
    const results = await checkAndSendSubscriptionReminders({ dryRun: isDryRun });

    console.log('\n----------------------------------------------------');
    console.log('REMINDER CHECK RESULTS:');
    console.log('----------------------------------------------------');

    if (results.length === 0) {
      console.log('No active subscriptions found in the database.');
    } else {
      results.forEach((r, idx) => {
        console.log(`\n[${idx + 1}] College: "${r.collegeName}" (ID: ${r.collegeId})`);
        console.log(`    Status:            ${r.status} | Plan: ${r.planTier || 'N/A'}`);
        console.log(`    Expiry Date (IST): ${r.expiryDate || 'None'}`);
        console.log(`    Today (IST):       ${r.todayIST || 'N/A'}`);
        console.log(`    Days Remaining:    ${r.daysLeft !== null && r.daysLeft !== undefined ? r.daysLeft : 'N/A'}`);
        console.log(`    In 1-7 Day Window?: ${r.isWithinReminderWindow ? 'YES' : 'NO'}`);
        console.log(`    Already Sent Today?: ${r.alreadySentToday ? 'YES (Deduplicated)' : 'NO'}`);
        console.log(`    Action Taken:      ${r.action}`);
        if (r.error) {
          console.log(`    Error Details:     ${r.error}`);
        }
      });
    }

    console.log('\n====================================================');
    console.log('Finished processing subscription tasks.');
    console.log('====================================================');
  } catch (err) {
    console.error('Fatal error running subscription tasks script:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
