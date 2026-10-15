import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { sendMail } from './email.service.js';
import { notify } from '../../modules/notifications/notify.service.js';

/**
 * Format a Date object or ISO string to IST representation: e.g. "20 Oct 2026"
 */
export function formatISTDate(date) {
  if (!date) return 'N/A';
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(d);
}

/**
 * Get calendar date string in IST timezone: "YYYY-MM-DD"
 */
export function getISTCalendarDateString(date) {
  if (!date) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(date));
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;
  return `${y}-${m}-${d}`;
}

/**
 * Compare calendar days difference in IST: targetDate - baseDate (in days)
 */
export function getCalendarDaysDiffIST(targetDate, baseDate = new Date()) {
  const targetStr = getISTCalendarDateString(targetDate);
  const baseStr = getISTCalendarDateString(baseDate);
  if (!targetStr || !baseStr) return null;

  const targetUtc = Date.UTC(
    ...targetStr.split('-').map((v, i) => (i === 1 ? Number(v) - 1 : Number(v)))
  );
  const baseUtc = Date.UTC(
    ...baseStr.split('-').map((v, i) => (i === 1 ? Number(v) - 1 : Number(v)))
  );

  return Math.round((targetUtc - baseUtc) / (24 * 60 * 60 * 1000));
}

/**
 * Find admin recipient email(s) for a given college
 */
export async function getCollegeAdminEmails(collegeId) {
  try {
    const admins = await prisma.user.findMany({
      where: {
        collegeId,
        role: 'admin',
        accountStatus: 'active',
      },
      select: { email: true, name: true },
    });

    const emails = admins.map((a) => a.email).filter(Boolean);
    if (emails.length > 0) return emails;

    // Fallback: check college contactEmail if no active admin user exists
    const college = await prisma.college.findUnique({
      where: { id: collegeId },
      select: { contactEmail: true },
    });
    if (college?.contactEmail) {
      return [college.contactEmail];
    }
    return [];
  } catch (err) {
    logger.error({ err, collegeId }, '[SubscriptionEmail] Failed to fetch admin emails');
    return [];
  }
}

/**
 * HTML shell for subscription emails
 */
function buildEmailHtml({ title, preheader, bodyHtml, buttonText, buttonUrl }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px; color: #1e293b; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 40px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.025em; }
    .header p { color: #94a3b8; margin: 6px 0 0 0; font-size: 13px; }
    .content { padding: 36px 40px; }
    .badge-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .badge-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
    .badge-label { color: #64748b; font-weight: 500; }
    .badge-val { color: #0f172a; font-weight: 700; text-align: right; }
    .button-wrap { text-align: center; margin: 30px 0 10px 0; }
    .button { display: inline-block; background-color: #0d9488; color: #ffffff !important; text-decoration: none; padding: 12px 32px; border-radius: 10px; font-weight: 700; font-size: 14px; }
    .footer { background-color: #f8fafc; padding: 24px 40px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Zuna Campus OS</h1>
      <p>${preheader || 'Institutional Subscription Management'}</p>
    </div>
    <div class="content">
      ${bodyHtml}
      ${
        buttonText && buttonUrl
          ? `<div class="button-wrap"><a href="${buttonUrl}" class="button">${buttonText}</a></div>`
          : ''
      }
    </div>
    <div class="footer">
      <p>This is an automated administrative notification from Zuna Campus Operating System.</p>
      <p>If you have any questions, contact support at <a href="mailto:support@teamzuna.in" style="color: #0d9488;">support@teamzuna.in</a>.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * PART 1: Send subscription welcome email when a subscription becomes 'Active'
 */
export async function sendSubscriptionWelcomeEmail({
  collegeId,
  collegeName,
  planTier = 'Enterprise',
  validUntilDate,
  adminEmails = [],
}) {
  try {
    let recipients = adminEmails;
    if (!recipients || recipients.length === 0) {
      recipients = await getCollegeAdminEmails(collegeId);
    }
    if (recipients.length === 0) {
      logger.warn({ collegeId, collegeName }, '[SubscriptionWelcome] No recipient admin emails found; skipping email');
      return;
    }

    const formattedExpiry = formatISTDate(validUntilDate);
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
    const loginUrl = `${frontendUrl}/login`;

    const bodyHtml = `
      <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Welcome to Zuna, ${collegeName}!</h2>
      <p style="color: #475569; font-size: 14px;">
        Your institutional subscription is now <strong>Active</strong>. You have full access to your campus management workspace.
      </p>

      <div class="badge-box">
        <div class="badge-row">
          <span class="badge-label">Institution:</span>
          <span class="badge-val">${collegeName}</span>
        </div>
        <div class="badge-row">
          <span class="badge-label">Subscription Tier:</span>
          <span class="badge-val" style="color: #0d9488;">${planTier}</span>
        </div>
        <div class="badge-row">
          <span class="badge-label">Valid Until:</span>
          <span class="badge-val">${formattedExpiry} (IST)</span>
        </div>
        <div class="badge-row" style="margin-bottom: 0;">
          <span class="badge-label">Account Status:</span>
          <span class="badge-val" style="color: #16a34a;">Active</span>
        </div>
      </div>

      <p style="color: #475569; font-size: 14px;">
        You can log in to your college administration panel anytime to manage faculty, admissions, courses, and schedules.
      </p>
    `;

    const html = buildEmailHtml({
      title: `Welcome to Zuna - ${collegeName} Subscription Active`,
      preheader: 'Your subscription is now active',
      bodyHtml,
      buttonText: 'Log In to Admin Panel',
      buttonUrl: loginUrl,
    });

    for (const email of recipients) {
      await sendMail({
        to: email,
        subject: `Your ${collegeName} subscription is now Active - Zuna`,
        html,
        fromName: 'Zuna Subscriptions',
      });
      logger.info({ email, collegeId, collegeName, planTier }, '[SubscriptionWelcome] Welcome email sent successfully');
    }
  } catch (err) {
    logger.error({ err, collegeId, collegeName }, '[SubscriptionWelcome] Failed to send subscription welcome email');
  }
}

/**
 * PART 2: Send subscription expiry reminder email & in-app notification (7 days before)
 */
export async function sendSubscriptionExpiryReminder({
  collegeId,
  collegeName,
  planTier = 'Enterprise',
  expiryDate,
  adminEmails = [],
}) {
  try {
    let recipients = adminEmails;
    if (!recipients || recipients.length === 0) {
      recipients = await getCollegeAdminEmails(collegeId);
    }

    const formattedExpiry = formatISTDate(expiryDate);
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
    const loginUrl = `${frontendUrl}/login`;

    // 1. Send Email to College Admins
    if (recipients.length > 0) {
      const bodyHtml = `
        <h2 style="color: #b45309; margin-top: 0; font-size: 20px;">Important: Subscription Expiring in 7 Days</h2>
        <p style="color: #475569; font-size: 14px;">
          The institutional subscription for <strong>${collegeName}</strong> is scheduled to expire in <strong>7 days</strong>.
        </p>

        <div class="badge-box" style="border-left: 4px solid #f59e0b;">
          <div class="badge-row">
            <span class="badge-label">Institution:</span>
            <span class="badge-val">${collegeName}</span>
          </div>
          <div class="badge-row">
            <span class="badge-label">Current Plan:</span>
            <span class="badge-val">${planTier}</span>
          </div>
          <div class="badge-row" style="margin-bottom: 0;">
            <span class="badge-label">Exact Expiry Date:</span>
            <span class="badge-val" style="color: #b45309;">${formattedExpiry} (IST)</span>
          </div>
        </div>

        <p style="color: #475569; font-size: 14px;">
          To ensure uninterrupted access for your administrators, faculty, and students, please contact support or your account representative to renew your subscription.
        </p>
        <p style="color: #64748b; font-size: 13px;">
          Need assistance or wish to renew? Contact support at <a href="mailto:support@teamzuna.in" style="color: #0d9488; font-weight: 600;">support@teamzuna.in</a>.
        </p>
      `;

      const html = buildEmailHtml({
        title: `Subscription Expiry Notice - ${collegeName}`,
        preheader: 'Your subscription expires in 7 days',
        bodyHtml,
        buttonText: 'Open Admin Dashboard',
        buttonUrl: loginUrl,
      });

      for (const email of recipients) {
        await sendMail({
          to: email,
          subject: `Reminder: Subscription for ${collegeName} expires in 7 days (${formattedExpiry})`,
          html,
          fromName: 'Zuna Subscriptions',
        });
        logger.info({ email, collegeId, collegeName, formattedExpiry }, '[SubscriptionReminder] Expiry reminder email sent');
      }
    } else {
      logger.warn({ collegeId, collegeName }, '[SubscriptionReminder] No recipient emails found for college');
    }

    // 2. Create in-app notification for college admins via notify()
    await notify({
      collegeId,
      target: { role: 'admin' },
      title: 'Subscription Expiring in 7 Days',
      message: `Your ${planTier} subscription for ${collegeName} will expire on ${formattedExpiry}. Please contact support to renew.`,
      type: 'subscription_expiry',
      link: '/admin',
    });
    logger.info({ collegeId, collegeName }, '[SubscriptionReminder] In-app notification created for college admins');

  } catch (err) {
    logger.error({ err, collegeId, collegeName }, '[SubscriptionReminder] Failed to send subscription expiry reminder');
  }
}
