import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import {
  getCalendarDaysDiffIST,
  getISTCalendarDateString,
  sendSubscriptionExpiryReminder,
} from '../services/email/subscriptionEmail.service.js';

/**
 * Checks all active subscriptions and sends 7-day expiry reminder.
 *
 * @param {Object} [options]
 * @param {boolean} [options.dryRun=false] - If true, only calculates and logs without sending emails/notifications or mutating DB
 * @returns {Promise<Array>} List of processed subscription summaries
 */
export async function checkAndSendSubscriptionReminders({ dryRun = false } = {}) {
  logger.info({ dryRun }, '[SubscriptionReminder] Starting check for expiring subscriptions');

  const results = [];

  try {
    // 1. Fetch all active billing subscriptions with their college details
    const subscriptions = await prisma.billingSubscription.findMany({
      where: {
        status: {
          equals: 'Active',
          mode: 'insensitive',
        },
      },
      include: {
        college: {
          select: {
            id: true,
            name: true,
            status: true,
            contactEmail: true,
          },
        },
      },
    });

    const now = new Date();
    const todayIST = getISTCalendarDateString(now);

    for (const sub of subscriptions) {
      const collegeId = sub.collegeId;
      const collegeName = sub.college?.name || 'College';

      try {
        // Expiry date is currentPeriodEnd, or trialExpiresAt if currentPeriodEnd is null
        const expiryDate = sub.currentPeriodEnd || sub.trialExpiresAt;
        if (!expiryDate) {
          results.push({
            collegeId,
            collegeName,
            status: sub.status,
            expiryDate: null,
            daysLeft: null,
            isMatch: false,
            action: 'SKIPPED_NO_EXPIRY_DATE',
          });
          continue;
        }

        const expiryIST = getISTCalendarDateString(expiryDate);
        const daysLeft = getCalendarDaysDiffIST(expiryDate, now);

        // Rule: send reminder ONLY when subscription has exactly 7 days left
        const isExactly7Days = daysLeft === 7;

        // Deduplication check: compare reminderSentForDate with current expiryDate
        let alreadySentForThisExpiry = false;
        if (sub.reminderSentForDate) {
          const sentForIST = getISTCalendarDateString(sub.reminderSentForDate);
          alreadySentForThisExpiry = sentForIST === expiryIST;
        }

        const itemSummary = {
          collegeId,
          collegeName,
          planTier: sub.planTier,
          status: sub.status,
          expiryDate: expiryIST,
          todayIST,
          daysLeft,
          isExactly7Days,
          alreadySentForThisExpiry,
        };

        if (!isExactly7Days) {
          itemSummary.action = `SKIPPED_DAYS_LEFT_${daysLeft}`;
          results.push(itemSummary);
          continue;
        }

        if (alreadySentForThisExpiry) {
          itemSummary.action = 'SKIPPED_ALREADY_SENT_FOR_THIS_EXPIRY';
          results.push(itemSummary);
          continue;
        }

        if (dryRun) {
          itemSummary.action = 'WOULD_SEND_REMINDER';
          results.push(itemSummary);
          logger.info(
            itemSummary,
            `[SubscriptionReminder:DRY-RUN] ${collegeName} has exactly 7 days left (${expiryIST}). Would send reminder.`
          );
          continue;
        }

        // Send email and in-app notification
        await sendSubscriptionExpiryReminder({
          collegeId,
          collegeName,
          planTier: sub.planTier,
          expiryDate,
        });

        // Record reminderSentForDate for deduplication
        await prisma.billingSubscription.update({
          where: { id: sub.id },
          data: { reminderSentForDate: expiryDate },
        });

        itemSummary.action = 'SENT_REMINDER';
        results.push(itemSummary);

        logger.info(
          { collegeId, collegeName, expiryDate: expiryIST },
          `[SubscriptionReminder] Expiry reminder sent to college admins for ${collegeName}`
        );
      } catch (collegeErr) {
        // One failed college must not stop the loop
        logger.error(
          { err: collegeErr, collegeId, collegeName },
          `[SubscriptionReminder] Error processing reminder for college ${collegeName}`
        );
        results.push({
          collegeId,
          collegeName,
          action: 'ERROR',
          error: collegeErr.message,
        });
      }
    }
  } catch (err) {
    logger.error({ err }, '[SubscriptionReminder] Unexpected error during reminder check');
  }

  logger.info({ totalProcessed: results.length }, '[SubscriptionReminder] Finished subscription reminder check');
  return results;
}

/**
 * Initializes the subscription reminder cron schedule and runs once on server start.
 */
export function startSubscriptionReminderJob() {
  // 1. Schedule daily at 09:00 IST (timezone Asia/Kolkata)
  cron.schedule(
    '0 9 * * *',
    async () => {
      logger.info('[SubscriptionReminder] Running daily 09:00 IST scheduled reminder check');
      try {
        await checkAndSendSubscriptionReminders();
      } catch (err) {
        logger.error({ err }, '[SubscriptionReminder] Scheduled job encountered error');
      }
    },
    {
      timezone: 'Asia/Kolkata',
    }
  );

  logger.info('[SubscriptionReminder] Cron job scheduled daily at 09:00 IST (Asia/Kolkata)');

  // 2. Also run once when the server starts (deferred slightly to allow DB connect)
  setTimeout(() => {
    logger.info('[SubscriptionReminder] Running on-startup subscription reminder verification');
    checkAndSendSubscriptionReminders().catch((err) => {
      logger.error({ err }, '[SubscriptionReminder] On-startup check failed');
    });
  }, 3500);
}
