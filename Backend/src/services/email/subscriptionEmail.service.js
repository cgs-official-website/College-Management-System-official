import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { sendMail, sendDynamicMail } from './email.service.js';
import { notify } from '../../modules/notifications/notify.service.js';
import { generateInvoicePDF } from '../pdf/invoicePdf.service.js';

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
 * Get UTC Date objects representing the start and end of a given calendar day in Asia/Kolkata (IST)
 */
export function getISTDayRange(date = new Date()) {
  const dateStr = getISTCalendarDateString(date);
  const [year, month, day] = dateStr.split('-').map(Number);
  // IST is UTC + 5:30. Start of IST day (00:00:00) is previous day 18:30:00 UTC
  const startUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - 5.5 * 60 * 60 * 1000);
  const endUtc = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - 5.5 * 60 * 60 * 1000);
  return { startUtc, endUtc, dateStr };
}

/**
 * Find admin recipient email(s) for a given college (strict admin login email only)
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
    if (emails.length === 0) {
      logger.warn({ collegeId }, '[SubscriptionEmail] No active admin user found for college');
    }
    return emails;
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
 * PART 1: Send subscription welcome email with invoice details when a college is approved/activated
 */
export async function sendSubscriptionWelcomeEmail({
  collegeId,
  collegeName,
  planTier = 'Enterprise',
  validUntilDate,
  adminEmails = [],
  subscription = null,
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

    // Attempt to load subscription with plan if not provided
    let sub = subscription;
    if (!sub && collegeId) {
      sub = await prisma.billingSubscription.findUnique({
        where: { collegeId },
        include: { subscriptionPlan: true }
      });
    }

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
    const loginUrl = `${frontendUrl}/login`;

    let invoiceSectionHtml = '';
    let attachments = undefined;

    if (!sub) {
      logger.warn(
        { collegeId, collegeName },
        '[SubscriptionWelcome] College has no billingSubscription record at activation time; sending welcome mail without invoice section'
      );
    } else {
      // Find matching plan if not already populated on sub
      let plan = sub.subscriptionPlan;
      if (!plan && (sub.planTier || planTier)) {
        plan = await prisma.subscriptionPlan.findFirst({
          where: { name: { equals: sub.planTier || planTier, mode: 'insensitive' } }
        });
      }

      // Generate invoice number: INV-<YYYYMMDD>-<first 6 chars of subscription id, uppercase>
      const todayDateStr = (getISTCalendarDateString(new Date()) || '').replace(/-/g, '');
      const subShortId = sub.id ? sub.id.replace(/-/g, '').slice(0, 6).toUpperCase() : 'SUB001';
      const invoiceNumber = `INV-${todayDateStr}-${subShortId}`;

      const invoiceDateIST = formatISTDate(new Date());
      const effectivePlanName = plan?.name || sub.planTier || planTier || 'Enterprise';
      const validFromIST = formatISTDate(sub.createdAt || new Date());
      const calculatedValidUntil = sub.currentPeriodEnd || sub.trialExpiresAt || validUntilDate;
      const validUntilIST = formatISTDate(calculatedValidUntil);

      // Amount: Check if price is stored in SubscriptionPlan or BillingSubscription
      let amountStr = null;
      if (plan?.price && typeof plan.price === 'string' && plan.price.trim() !== '' && plan.price.trim().toLowerCase() !== 'custom') {
        amountStr = plan.duration ? `${plan.price} / ${plan.duration}` : plan.price;
      } else if (sub.pricePerStudent && sub.pricePerStudent > 0) {
        amountStr = `₹${sub.pricePerStudent} / student`;
      }

      // Payment status: Use subscription status (e.g. 'Active') since DB has no SaaS transaction/paid flag
      const paymentStatus = sub.status || 'Active';

      // Generate in-memory PDF invoice attachment (no disk write, A4 single-page)
      try {
        const pdfBuffer = await generateInvoicePDF({
          invoiceNumber,
          invoiceDateIST,
          collegeName,
          planName: effectivePlanName,
          validFromIST,
          validUntilIST,
          amountStr,
          paymentStatus,
        });

        attachments = [
          {
            filename: `Invoice-${invoiceNumber}.pdf`,
            content: pdfBuffer,
          },
        ];
      } catch (pdfErr) {
        logger.error(
          { err: pdfErr, collegeId, invoiceNumber },
          '[SubscriptionWelcome] Failed to generate invoice PDF attachment; sending mail without attachment'
        );
      }

      invoiceSectionHtml = `
      <div style="border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc; padding: 20px; margin: 24px 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 14px;">
          <h3 style="margin: 0; font-size: 14px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em;">Invoice & Subscription Summary</h3>
          <span style="font-size: 12px; font-weight: 700; color: #0d9488; background-color: #ccfbf1; padding: 3px 8px; border-radius: 6px;">${invoiceNumber}</span>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tbody>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Invoice Number:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 700; text-align: right;">${invoiceNumber}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Invoice Date:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600; text-align: right;">${invoiceDateIST} (IST)</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 500;">College Name:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600; text-align: right;">${collegeName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Plan Name:</td>
              <td style="padding: 6px 0; color: #0d9488; font-weight: 700; text-align: right;">${effectivePlanName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Valid From:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600; text-align: right;">${validFromIST} (IST)</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Valid Until:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600; text-align: right;">${validUntilIST} (IST)</td>
            </tr>
            ${
              amountStr
                ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Amount:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 700; text-align: right;">${amountStr}</td>
            </tr>
            `
                : ''
            }
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: 500;">Payment Status:</td>
              <td style="padding: 6px 0; color: #16a34a; font-weight: 700; text-align: right;">${paymentStatus}</td>
            </tr>
          </tbody>
        </table>
      </div>
      `;
    }

    const bodyHtml = `
      <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Welcome to Zuna, ${collegeName}!</h2>
      <p style="color: #16a34a; font-weight: 600; font-size: 14px; margin-top: 4px; margin-bottom: 12px;">
        Your college registration has been approved and activated.
      </p>
      <p style="color: #475569; font-size: 14px; margin-bottom: 16px;">
        Your institutional workspace is now <strong>Active</strong>. You have full administrative access to your campus management portal.
      </p>

      ${invoiceSectionHtml}
    `;

    const html = buildEmailHtml({
      title: `Welcome to Zuna - ${collegeName} Approved & Activated`,
      preheader: 'Your college has been approved and activated',
      bodyHtml,
      // No "Open Admin Dashboard" button per requirement
    });

    for (const email of recipients) {
      await sendMail({
        to: email,
        subject: `Welcome to Zuna - ${collegeName} Approved & Activated`,
        html,
        attachments,
        fromName: 'Zuna Subscriptions',
      });
      logger.info({ email, collegeId, collegeName, planTier }, '[SubscriptionWelcome] Upgraded welcome email with invoice sent successfully');
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
  daysLeft,
  adminEmails = [],
}) {
  try {
    let recipients = adminEmails;
    if (!recipients || recipients.length === 0) {
      recipients = await getCollegeAdminEmails(collegeId);
    }

    const calculatedDaysLeft =
      daysLeft !== undefined && daysLeft !== null
        ? daysLeft
        : getCalendarDaysDiffIST(expiryDate);

    const isTomorrow = calculatedDaysLeft === 1;
    const timePhrase = isTomorrow ? 'tomorrow' : `in ${calculatedDaysLeft} days`;
    const headingText = isTomorrow
      ? 'Important: Subscription Expiring Tomorrow'
      : `Important: Subscription Expiring in ${calculatedDaysLeft} Days`;
    const bodyExpiryText = isTomorrow
      ? 'is scheduled to expire <strong>tomorrow</strong>.'
      : `is scheduled to expire in <strong>${calculatedDaysLeft} days</strong>.`;

    const formattedExpiry = formatISTDate(expiryDate);

    // 1. Send Email to College Admins
    if (recipients.length > 0) {
      const bodyHtml = `
        <h2 style="color: #b45309; margin-top: 0; font-size: 20px;">${headingText}</h2>
        <p style="color: #475569; font-size: 14px;">
          The institutional subscription for <strong>${collegeName}</strong> ${bodyExpiryText}
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
        preheader: `Your subscription expires ${timePhrase}`,
        bodyHtml,
      });

      const subject = `Reminder: Subscription for ${collegeName} expires ${timePhrase} (${formattedExpiry})`;

      for (const email of recipients) {
        let sent = false;
        try {
          const res = await sendDynamicMail({
            to: email,
            templateName: 'Subscription Expiry Reminder',
            headerTitle: collegeName || 'College Management System',
            fromName: 'Zuna Subscriptions',
            variables: {
              collegeName,
              planName: planTier,
              expiryDate: formattedExpiry,
              daysLeft: String(calculatedDaysLeft),
              daysLeftText: timePhrase,
            },
          });
          if (res?.success) {
            sent = true;
          }
        } catch (dynamicErr) {
          logger.warn(
            { err: dynamicErr, email, collegeId },
            '[SubscriptionReminder] sendDynamicMail failed; falling back to hardcoded template'
          );
        }

        // Seamless fallback to hardcoded email if DB template is missing or inactive
        if (!sent) {
          await sendMail({
            to: email,
            subject,
            html,
            fromName: 'Zuna Subscriptions',
          });
        }

        logger.info({ email, collegeId, collegeName, formattedExpiry, calculatedDaysLeft }, '[SubscriptionReminder] Expiry reminder email sent');
      }
    } else {
      logger.warn({ collegeId, collegeName }, '[SubscriptionReminder] No recipient emails found for college');
    }

    // 2. Create in-app notification for college admins via notify() (with daily deduplication guard)
    const { startUtc, endUtc, dateStr } = getISTDayRange(new Date());
    const existingNotification = await prisma.notification.findFirst({
      where: {
        collegeId,
        type: 'subscription_expiry',
        createdAt: {
          gte: startUtc,
          lte: endUtc,
        },
      },
    });

    if (existingNotification) {
      logger.info(
        { collegeId, collegeName, dateStr, existingNotificationId: existingNotification.id },
        '[SubscriptionReminder] In-app notification already exists for this college today (IST); skipping duplicate notification'
      );
    } else {
      const inAppTitle = isTomorrow
        ? 'Subscription Expiring Tomorrow'
        : `Subscription Expiring in ${calculatedDaysLeft} Days`;
      const inAppMessage = isTomorrow
        ? `Your ${planTier} subscription for ${collegeName} will expire tomorrow (${formattedExpiry}). Please contact support to renew.`
        : `Your ${planTier} subscription for ${collegeName} will expire in ${calculatedDaysLeft} days (${formattedExpiry}). Please contact support to renew.`;

      await notify({
        collegeId,
        target: { role: 'admin' },
        title: inAppTitle,
        message: inAppMessage,
        type: 'subscription_expiry',
        link: '/admin',
      });
      logger.info({ collegeId, collegeName, calculatedDaysLeft }, '[SubscriptionReminder] In-app notification created for college admins');
    }

  } catch (err) {
    logger.error({ err, collegeId, collegeName }, '[SubscriptionReminder] Failed to send subscription expiry reminder');
  }
}
