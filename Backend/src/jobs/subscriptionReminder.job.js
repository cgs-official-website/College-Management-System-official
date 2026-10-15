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

        // Rule: send reminder when subscription has between 1 and 7 days left (inclusive) in IST
        const isWithinReminderWindow = daysLeft !== null && daysLeft >= 1 && daysLeft <= 7;

        // Deduplication check: compare reminderSentForDate with today's IST date
        let alreadySentToday = false;
        if (sub.reminderSentForDate) {
          const sentDateIST = getISTCalendarDateString(sub.reminderSentForDate);
          alreadySentToday = sentDateIST === todayIST;
        }

        const itemSummary = {
          collegeId,
          collegeName,
          planTier: sub.planTier,
          status: sub.status,
          expiryDate: expiryIST,
          todayIST,
          daysLeft,
          isWithinReminderWindow,
          alreadySentToday,
        };

        if (!isWithinReminderWindow) {
          itemSummary.action =
            daysLeft !== null && daysLeft < 1
              ? `SKIPPED_EXPIRED_OR_TODAY_${daysLeft}`
              : `SKIPPED_DAYS_LEFT_${daysLeft}`;
          results.push(itemSummary);
          continue;
        }

        if (alreadySentToday) {
          itemSummary.action = 'SKIPPED_ALREADY_SENT_TODAY';
          results.push(itemSummary);
          continue;
        }

        if (dryRun) {
          itemSummary.action = 'WOULD_SEND_REMINDER';
          results.push(itemSummary);
          logger.info(
            itemSummary,
            `[SubscriptionReminder:DRY-RUN] ${collegeName} has ${daysLeft} day(s) left (${expiryIST}). Would send daily reminder.`
          );
          continue;
        }

        // Send email and in-app notification
        await sendSubscriptionExpiryReminder({
          collegeId,
          collegeName,
          planTier: sub.planTier,
          expiryDate,
          daysLeft,
        });

        // Record reminderSentForDate as today's timestamp for daily deduplication
        try {
          await prisma.billingSubscription.update({
            where: { id: sub.id },
            data: { reminderSentForDate: now },
          });
        } catch (updateErr) {
          logger.warn(
            { err: updateErr.message, collegeId },
            `[SubscriptionReminder] Could not record reminderSentForDate: ${updateErr.message}`
          );
        }

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
 * Finds all BillingSubscription rows where status is "Active" and the expiry date
 * (currentPeriodEnd or trialExpiresAt) is before today (IST), and updates their status to "Expired".
 *
 * @param {Object} [options]
 * @param {boolean} [options.dryRun=false] - If true, only calculates and logs without updating DB
 * @returns {Promise<Array>} List of expired subscription summaries
 */
export async function checkAndExpireSubscriptions({ dryRun = false } = {}) {
  logger.info({ dryRun }, '[SubscriptionExpiry] Starting check for expired subscriptions');

  const results = [];

  try {
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
      const expiryDate = sub.currentPeriodEnd || sub.trialExpiresAt;

      if (!expiryDate) continue;

      const expiryIST = getISTCalendarDateString(expiryDate);
      const daysLeft = getCalendarDaysDiffIST(expiryDate, now);

      // If expiry date is before today in IST (daysLeft < 0, e.g. -1 for yesterday)
      if (daysLeft !== null && daysLeft < 0) {
        if (dryRun) {
          logger.info(
            { collegeId, collegeName, expiryDate: expiryIST, todayIST, daysLeft },
            `[SubscriptionExpiry:DRY-RUN] ${collegeName} expired on ${expiryIST} (${Math.abs(daysLeft)} day(s) ago). Would update status to "Expired".`
          );
          results.push({
            collegeId,
            collegeName,
            planTier: sub.planTier,
            status: sub.status,
            newStatus: 'Expired',
            expiryDate: expiryIST,
            todayIST,
            daysLeft,
            action: 'WOULD_EXPIRE',
          });
        } else {
          await prisma.billingSubscription.update({
            where: { id: sub.id },
            data: { status: 'Expired' },
          });

          logger.info(
            { collegeId, collegeName, expiryDate: expiryIST, todayIST, daysLeft },
            `[SubscriptionExpiry] ${collegeName} expired on ${expiryIST}. Updated status to "Expired".`
          );
          results.push({
            collegeId,
            collegeName,
            planTier: sub.planTier,
            previousStatus: sub.status,
            status: 'Expired',
            expiryDate: expiryIST,
            todayIST,
            daysLeft,
            action: 'EXPIRED',
          });
        }
      }
    }
  } catch (err) {
    logger.error({ err }, '[SubscriptionExpiry] Unexpected error during expired subscription check');
  }

  logger.info({ totalExpiredFound: results.length }, '[SubscriptionExpiry] Finished expired subscription check');
  return results;
}

/**
 * Initializes the subscription reminder & auto-expiry cron schedule and runs once on server start.
 */
export function startSubscriptionReminderJob() {
  // 1. Schedule daily at 09:00 IST (timezone Asia/Kolkata)
  cron.schedule(
    '0 9 * * *',
    async () => {
      logger.info('[SubscriptionReminder] Running daily 09:00 IST scheduled checks');
      try {
        await checkAndExpireSubscriptions();
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
  setTimeout(async () => {
    logger.info('[SubscriptionReminder] Running on-startup subscription verification');
    try {
      await checkAndExpireSubscriptions();
      await checkAndSendSubscriptionReminders();
    } catch (err) {
      logger.error({ err }, '[SubscriptionReminder] On-startup check failed');
    }
  }, 3500);
}

