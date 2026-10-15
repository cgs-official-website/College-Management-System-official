import { Resend } from 'resend';
import dotenv from 'dotenv';
import { prisma } from '../../lib/prisma.js';
import { DEFAULT_TEMPLATES } from './templateSeeder.js';
dotenv.config();

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

if (resend) {
  console.log('[EmailService] ✅ Resend client configured.');
} else {
  console.error('[EmailService] ⚠️ RESEND_API_KEY is not set — emails will not be delivered.');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

// ---------------------------------------------------------------------------
// Base HTML layout (wraps both DB templates and built-in fallbacks)
const baseTemplate = (content, title = '') => {
  const displayTitle = (title && title !== 'Zuna ERP') ? title : 'College Management System';
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 40px 20px;
      color: #334155;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      overflow: hidden;
    }
    .header {
      background-color: #0f172a;
      padding: 32px 40px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.025em;
    }
    .content {
      padding: 40px;
    }
    .button {
      display: inline-block;
      background-color: #3b82f6;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      margin-top: 24px;
      margin-bottom: 24px;
      text-align: center;
    }
    .footer {
      background-color: #f1f5f9;
      padding: 24px 40px;
      text-align: center;
      font-size: 13px;
      color: #64748b;
    }
    .highlight {
      background-color: #f1f5f9;
      padding: 16px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 16px;
      letter-spacing: 2px;
      text-align: center;
      font-weight: bold;
      color: #0f172a;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${escapeHtml(displayTitle)}</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>This is an automated message.</p>
    </div>
  </div>
</body>
</html>
`;
};

// ---------------------------------------------------------------------------
// Built-in fallback templates
// Used when the EmailTemplate record doesn't exist in the database.
// Run seed_templates.js to persist templates to the DB for runtime editing.
// ---------------------------------------------------------------------------
const FALLBACK_TEMPLATES = {
  'Teacher Account Setup': {
    subject: (vars) => vars?.collegeName ? `Set up your teacher account - ${vars.collegeName}` : 'Set up your teacher account',
    buildHtml: (vars) => {
      const url = escapeHtml(vars.setupUrl);
      return `
      <h2 style="color: #0f172a; margin-top: 0;">Welcome, ${escapeHtml(vars.name || 'Teacher')}!</h2>
      <p><strong>${escapeHtml(vars.collegeName || 'Your college')}</strong> has created a teacher account for you. Use the button below to create your password and activate it.</p>

      <div class="highlight" style="text-align: left; font-family: sans-serif; font-size: 14px; letter-spacing: normal;">
        <div style="margin-bottom: 8px;"><strong>Teacher ID:</strong> ${escapeHtml(vars.teacherId)}</div>
        <div><strong>Login email:</strong> ${escapeHtml(vars.email)}</div>
      </div>

      <div style="text-align: center;">
        <a href="${url}" class="button">Set Up Your Account</a>
      </div>

      <p style="font-size: 13px; color: #64748b;">
        This link expires in 15 minutes and can only be used once. Please don't share it.
      </p>
      <p style="font-size: 12px; color: #94a3b8; word-break: break-all;">
        Button not working? Copy and paste this link into your browser:<br>
        <a href="${url}" style="color: #94a3b8;">${url}</a>
      </p>
    `;
    }
  },
  'Student Welcome': {
    subject: (vars) => vars?.collegeName ? `Welcome to ${vars.collegeName}` : 'Welcome to College Management System',
    buildHtml: (vars) => `
      <h2 style="color: #0f172a; margin-top: 0;">Welcome, ${escapeHtml(vars.name || 'Student')}!</h2>
      <p>Your student account has been successfully created${vars.collegeName ? ` for <strong>${escapeHtml(vars.collegeName)}</strong>` : ''}. You can now log in using the credentials below:</p>

      <div class="highlight" style="text-align: left; font-family: sans-serif; font-size: 14px; letter-spacing: normal;">
        <div style="margin-bottom: 8px;"><strong>Email:</strong> ${escapeHtml(vars.email)}</div>
        <div><strong>Your Password:</strong> ${escapeHtml(vars.password)}</div>
      </div>

      <p>We strongly recommend changing your password after your first login.</p>

      <div style="text-align: center;">
        <a href="${escapeHtml(vars.loginUrl || '#')}" class="button">Log In to Your Account</a>
      </div>
    `
  },
    'Password Reset': {
    subject: (vars) => vars?.collegeName ? `Reset your password - ${vars.collegeName}` : 'Reset your password',
    buildHtml: (vars) => {
      const link = escapeHtml(vars.resetUrl || vars.resetLink || '#');
      return `
      <h2 style="color: #0f172a; margin-top: 0;">Reset your password</h2>
      <p>Hello ${escapeHtml(vars.name || 'there')},</p>
      <p>We received a request to reset the password for your <strong>${escapeHtml(vars.collegeName || 'College Management System')}</strong> account. Click the button below to choose a new password.</p>

      <div style="text-align: center;">
        <a href="${link}" class="button">Reset Password</a>
      </div>

      <p style="font-size: 13px; color: #64748b;">
        If the button doesn't work, copy this link into your browser:<br>
        <a href="${link}">${link}</a>
      </p>

      <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
        This link expires in 15 minutes. If it has expired, you can request a new one from the login page.
      </p>
      <p style="font-size: 13px; color: #64748b;">
        If you didn't request this, you can safely ignore this email. Your password will not change unless you use the link above.
      </p>
    `;
    }
  },
  'Admin Welcome': {
    subject: (vars) => vars?.collegeName ? `Welcome to ${vars.collegeName} - College Admin` : 'Welcome - College Admin',
    buildHtml: (vars) => `
      <h2 style="color: #0f172a; margin-top: 0;">Welcome, ${escapeHtml(vars.name || 'Admin')}!</h2>
      <p>Your college admin account has been successfully created${vars.collegeName ? ` for <strong>${escapeHtml(vars.collegeName)}</strong>` : ''}. You can now log in using the credentials below:</p>

      <div class="highlight" style="text-align: left; font-family: sans-serif; font-size: 14px; letter-spacing: normal;">
        <div style="margin-bottom: 8px;"><strong>Email:</strong> ${escapeHtml(vars.email)}</div>
        ${vars.password ? `<div><strong>Temporary Password:</strong> ${escapeHtml(vars.password)}</div>` : ''}
      </div>

      <div style="text-align: center;">
        <a href="${escapeHtml(vars.loginUrl || '#')}" class="button">Log In to Your Account</a>
      </div>
    `
  },
  'Salary Processed': {
    subject: (vars) => vars?.collegeName ? `Salary Processed Notification - ${vars.collegeName} (${vars.month || ''} ${vars.year || ''})` : 'Salary Processed Notification',
    buildHtml: (vars) => `
      <h2 style="color: #0f172a; margin-top: 0;">Hello ${escapeHtml(vars.staffName || 'Staff')},</h2>
      <p>Your salary from <strong>${escapeHtml(vars.collegeName || 'the college')}</strong> for <strong>${escapeHtml(vars.month || '')} ${escapeHtml(vars.year || '')}</strong> has been processed on ${escapeHtml(vars.paymentDate || '')}.</p>
      <p>Net Pay: <strong>${escapeHtml(vars.netPay || '')}</strong></p>
      <p>Your payslip details have been updated in your staff portal.</p>
      <p>Regards,<br/><strong>${escapeHtml(vars.collegeName || 'College Administration')}</strong></p>
    `
  },
  'Low Stock Alert': {
    subject: 'Inventory Alert: Low Stock',
    buildHtml: (vars) => `
      <h2 style="color: #ef4444; margin-top: 0;">Low Stock Alert</h2>
      <p>The inventory level for <strong>${escapeHtml(vars.itemName || '')}</strong> has fallen below the reorder threshold.</p>
      <div class="highlight" style="text-align: left; background-color: #fef2f2; border-left: 4px solid #ef4444;">
        <div style="margin-bottom: 8px;"><strong>Item:</strong> ${escapeHtml(vars.itemName || '')}</div>
        <div style="margin-bottom: 8px;"><strong>Current Stock:</strong> ${escapeHtml(vars.currentStock || '')}</div>
        <div><strong>Reorder Level:</strong> ${escapeHtml(vars.reorderLevel || '')}</div>
      </div>
      <p>Please review inventory and initiate a replenishment request.</p>
    `
  },
  'Teacher Welcome': {
    subject: (vars) => vars?.collegeName ? `Welcome to ${vars.collegeName} - your account is ready` : 'Your teacher account is ready',
    buildHtml: (vars) => `
      <h2 style="color: #0f172a; margin-top: 0;">Welcome aboard, ${escapeHtml(vars.name || 'Teacher')}!</h2>
      <p>Your teacher account at <strong>${escapeHtml(vars.collegeName || 'your college')}</strong> is now active. You can log in with your email and the password you just created.</p>

      <div class="highlight" style="text-align: left; font-family: sans-serif; font-size: 14px; letter-spacing: normal;">
        <div style="margin-bottom: 8px;"><strong>Teacher ID:</strong> ${escapeHtml(vars.teacherId)}</div>
        <div><strong>Login email:</strong> ${escapeHtml(vars.email)}</div>
      </div>

      <div style="text-align: center;">
        <a href="${escapeHtml(vars.loginUrl || '#')}" class="button">Log In to Your Account</a>
      </div>

      <p style="font-size: 13px; color: #64748b;">
        If the button doesn't work, copy this link into your browser:<br>
        <a href="${escapeHtml(vars.loginUrl || '#')}">${escapeHtml(vars.loginUrl || '')}</a>
      </p>
      <p style="font-size: 13px; color: #64748b;">
        Forgot your password? Use "Forgot password" on the login page. If you didn't create this account, please contact your college administrator.
      </p>
    `
  },
  'College Activated': {
    subject: (vars) => vars?.collegeName ? `Your College Has Been Activated - ${vars.collegeName}` : 'Your College Has Been Activated',
    buildHtml: (vars) => `
      <h2 style="color: #0f172a; margin-top: 0;">Congratulations, ${escapeHtml(vars.name || 'Admin')}!</h2>
      <p>We are pleased to inform you that your institution, <strong>${escapeHtml(vars.collegeName || 'your college')}</strong>, has been officially reviewed, approved, and activated by the Super Administration.</p>
      
      <div class="highlight" style="text-align: left; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <div style="margin-bottom: 8px; color: #15803d; font-weight: 700;">Status: Active &amp; Approved</div>
        <div style="margin-bottom: 8px; font-size: 14px; color: #1e293b;"><strong>College Name:</strong> ${escapeHtml(vars.collegeName || '')}</div>
        <div style="margin-bottom: 8px; font-size: 14px; color: #1e293b;"><strong>College Code:</strong> ${escapeHtml(vars.collegeCode || 'N/A')}</div>
        <div style="font-size: 14px; color: #1e293b;"><strong>Admin Account:</strong> ${escapeHtml(vars.email || '')}</div>
      </div>
      
      <p>Your institutional management portal is now completely unlocked. You can now log in to:</p>
      <ul style="color: #475569; padding-left: 20px; line-height: 1.8;">
        <li>Set up academic departments, courses, and sections</li>
        <li>Onboard faculty, teachers, and staff members</li>
        <li>Manage student admissions and class enrollments</li>
        <li>Configure fee structures and collect payments</li>
        <li>Publish timetables, notices, exams, and attendance records</li>
      </ul>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${escapeHtml(vars.loginUrl || '#')}" class="button" style="background-color: #16a34a; font-size: 15px; padding: 14px 28px; border-radius: 8px; text-decoration: none; color: #ffffff; display: inline-block; font-weight: 600;">Log In to Admin Dashboard</a>
      </div>

      <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
        Direct login URL: <a href="${escapeHtml(vars.loginUrl || '#')}" style="color: #2563eb;">${escapeHtml(vars.loginUrl || '#')}</a>
      </p>
    `
  },
  'College Suspended': {
    subject: (vars) => vars?.collegeName ? `Notice of Account Suspension - ${vars.collegeName}` : 'Notice of Account Suspension',
    buildHtml: (vars) => `
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
      <div style="font-family: 'Poppins', Arial, sans-serif; color: #1e293b;">
        <h2 style="font-family: 'Poppins', Arial, sans-serif; color: #b91c1c; margin-top: 0; font-size: 20px; font-weight: 700;">Account Suspension Notice</h2>
        <p style="font-family: 'Poppins', Arial, sans-serif; font-size: 15px; color: #334155; line-height: 1.6;">
          Dear <strong>${escapeHtml(vars.name || 'College Administrator')}</strong>,
        </p>
        <p style="font-family: 'Poppins', Arial, sans-serif; font-size: 14px; color: #475569; line-height: 1.6;">
          This email is an official notification that institutional access for <strong>${escapeHtml(vars.collegeName || 'your college')}</strong> has been temporarily suspended by the Super Administration.
        </p>

        <div style="font-family: 'Poppins', Arial, sans-serif; text-align: left; background-color: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #ef4444; border-radius: 8px; padding: 18px; margin: 20px 0;">
          <div style="margin-bottom: 10px; color: #b91c1c; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Account Status: Suspended</div>
          <div style="margin-bottom: 8px; font-size: 14px; color: #1e293b;"><strong>College Name:</strong> ${escapeHtml(vars.collegeName || '')}</div>
          <div style="margin-bottom: 8px; font-size: 14px; color: #1e293b;"><strong>College Code:</strong> ${escapeHtml(vars.collegeCode || 'N/A')}</div>
          <div style="margin-bottom: 8px; font-size: 14px; color: #1e293b;"><strong>Effective Date:</strong> ${escapeHtml(vars.effectiveDate || '')}</div>
          <div style="font-size: 14px; color: #1e293b;"><strong>Reason for Suspension:</strong> ${escapeHtml(vars.suspensionReason || 'Administrative review & platform compliance verification')}</div>
        </div>

        <p style="font-family: 'Poppins', Arial, sans-serif; font-size: 14px; color: #475569; line-height: 1.6;">
          During the suspension period, administrative access, faculty portals, and student service features associated with your institution will remain inaccessible.
        </p>

        <div style="font-family: 'Poppins', Arial, sans-serif; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
          <h4 style="font-family: 'Poppins', Arial, sans-serif; margin: 0 0 10px 0; color: #0f172a; font-size: 14px; font-weight: 600;">Support &amp; Next Steps</h4>
          <p style="font-family: 'Poppins', Arial, sans-serif; font-size: 13px; color: #475569; margin: 0 0 10px 0; line-height: 1.5;">
            If you believe this action was taken in error or if you wish to appeal and reactivate your institution's account, please contact our support desk immediately:
          </p>
          <div style="font-size: 13px; color: #334155; margin-bottom: 4px;"><strong>Support Email:</strong> <a href="mailto:${escapeHtml(vars.supportEmail || '')}" style="color: #2563eb; text-decoration: none;">${escapeHtml(vars.supportEmail || 'support@campusadmin.edu')}</a></div>
          <div style="font-size: 13px; color: #334155; margin-bottom: 4px;"><strong>Support Helpline:</strong> ${escapeHtml(vars.supportPhone || '+1 (800) 555-0199')}</div>
          <div style="font-size: 13px; color: #334155;"><strong>Management Portal:</strong> <a href="${escapeHtml(vars.portalUrl || '#')}" style="color: #2563eb; text-decoration: none;">${escapeHtml(vars.portalUrl || '#')}</a></div>
        </div>

        <p style="font-family: 'Poppins', Arial, sans-serif; font-size: 12px; color: #94a3b8; margin-top: 24px; line-height: 1.5;">
          This is an automated system notification. Please reach out to the support details provided above for any queries.
        </p>
      </div>
    `
  }
};

// ---------------------------------------------------------------------------
// Core sendMail — wraps resend.emails.send with proper logging
// ---------------------------------------------------------------------------
const htmlToText = (html = '') => html
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export const sendMail = async ({ to, subject, html, text, fromName, cc, bcc, replyTo, attachments }) => {
  try {
    if (!resend) {
      return { success: false, error: 'Email service is not configured (RESEND_API_KEY missing)' };
    }

    // Placeholder accounts can never receive mail; sending would only cause bounces
    const recipients = [].concat(to).map(String);
    if (recipients.some((addr) => addr.toLowerCase().endsWith('@pending.local'))) {
      return { success: false, error: 'Recipient has no real email address registered' };
    }

    const fromEnv = process.env.FROM_EMAIL || '';
    const senderEmail = fromEnv.match(/<([^>]+)>/)?.[1] || fromEnv || 'noreply@teamzuna.in';
    const envName = fromEnv.includes('<') ? fromEnv.replace(/<.*>/, '').replace(/"/g, '').trim() : '';
    const displayName = (fromName || envName || 'College Management System')
      .replace(/["<>\r\n]/g, '').trim();
    const from = `"${displayName}" <${senderEmail}>`;

    const payload = { from, to, subject, html, text: text || htmlToText(html) };
    if (cc) payload.cc = cc;
    if (bcc) payload.bcc = bcc;
    if (replyTo) payload.replyTo = replyTo;
    if (attachments?.length) {
      payload.attachments = attachments.map((a) => ({ filename: a.filename, content: a.content }));
    }

    const { data, error } = await resend.emails.send(payload);

    if (error) {
      console.error(
        `[EmailService] ❌ Failed to send email to: ${to}\n` +
        `  Subject: "${subject}"\n` +
        `  Error: ${error.name || 'UNKNOWN'} - ${error.message}`
      );
      return { success: false, error: error.message };
    }

    console.log(`[EmailService] ✅ Email sent to: ${to} | Subject: "${subject}" | Id: ${data?.id}`);
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error(`[EmailService] ❌ Failed to send email to: ${to} | Error: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// ---------------------------------------------------------------------------
// PASSWORD SAFETY GUARD
// Rejects any DB-stored email template whose subject or contentHtml contains
// a {{password}} placeholder. This prevents accidental exposure of passwords
// through misconfigured database templates regardless of template name.
// ---------------------------------------------------------------------------
const UNSAFE_TEMPLATE_PATTERN = /\{\{\s*password\s*\}\}/i;

// ---------------------------------------------------------------------------
// sendDynamicMail — loads template from DB, falls back to built-in if missing
// ---------------------------------------------------------------------------
export const sendDynamicMail = async ({
  to,
  templateName,
  variables = {},
  headerTitle,
  fromName,
  cc,
  bcc,
  replyTo,
  attachments,
}) => {
  try {
    let subject;
    let htmlContent;
    // Always prioritize the sending college's name for the banner header
    const resolvedTitle = variables.collegeName || headerTitle || 'College Management System';
    const resolvedFromName = variables.collegeName || fromName || undefined;

    // --- Try loading template from database first ---
    let template = await prisma.emailTemplate.findFirst({
      where: { name: templateName }
    }).catch(() => null); // DB failure should not crash email sending

    // If template is missing from DB, auto-persist the default template on-the-fly
    if (!template) {
      const defaultTpl = DEFAULT_TEMPLATES.find((t) => t.name === templateName);
      if (defaultTpl) {
        try {
          template = await prisma.emailTemplate.create({
            data: {
              name: defaultTpl.name,
              subject: defaultTpl.subject,
              contentHtml: defaultTpl.contentHtml,
              status: 'Active'
            }
          });
          console.log(`[EmailService] 🚀 Auto-seeded missing template "${templateName}" into DB.`);
        } catch (_) {
          // If creation fails (e.g. race condition), fallback continues
        }
      }
    }

    // Safety guard: refuse to send any DB template that contains a {{password}}
    // placeholder, regardless of template name. Fall through to built-in fallback.
    if (template && (
      UNSAFE_TEMPLATE_PATTERN.test(template.subject || '') ||
      UNSAFE_TEMPLATE_PATTERN.test(template.contentHtml || '')
    )) {
      console.error(
        `[EmailService] 🚫 SECURITY: DB template "${templateName}" contains a {{password}} placeholder.\n` +
        `  Refusing to send to ${to} — falling back to built-in template.\n` +
        `  Update the DB template in the Email Templates panel to remove the password placeholder.`
      );
      // Fall through to built-in fallback below
    } else if (template) {
      if (template.status !== 'Active') {
        // Template exists but is inactive — fall through to built-in fallback.
        console.warn(
          `[EmailService] ⚠️  DB template "${templateName}" status="${template.status}" (not "Active").` +
          ` Falling back to built-in template for: ${to}`
        );
      } else {
        // DB template found, active, and safe — interpolate variables
        subject = template.subject;
        htmlContent = template.contentHtml || '';

        for (const [key, value] of Object.entries(variables)) {
          const regex = new RegExp(`{{${key}}}`, 'g');
          subject = subject.replace(regex, String(value ?? ''));
          htmlContent = htmlContent.replace(regex, String(value ?? ''));
        }

        const fullHtml = baseTemplate(htmlContent, resolvedTitle);
        console.log(`[EmailService] Using DB template: "${templateName}"`);

        return await sendMail({ to, subject, html: fullHtml, fromName: resolvedFromName, cc, bcc, replyTo, attachments });
      }
    }

    // --- DB template not found or inactive — use built-in fallback ---
    const fallback = FALLBACK_TEMPLATES[templateName];

    if (!fallback) {
      console.error(
        `[EmailService] ❌ No DB template AND no built-in fallback found for: "${templateName}".\n` +
        `  Run: node seed_templates.js  — to seed templates into the database.`
      );
      return { success: false, error: `Email template not found: ${templateName}` };
    }

    if (!template) {
      console.warn(
        `[EmailService] ⚠️  Template "${templateName}" not found in DB. Using built-in fallback.\n` +
        `  To persist templates to DB, run: node seed_templates.js`
      );
    }

    subject = typeof fallback.subject === 'function' ? fallback.subject(variables) : fallback.subject;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, String(value ?? ''));
    }

    htmlContent = baseTemplate(fallback.buildHtml(variables), resolvedTitle);

    return await sendMail({ to, subject, html: htmlContent, fromName: resolvedFromName, cc, bcc, replyTo, attachments });

  } catch (error) {
    console.error(
      `[EmailService] ❌ sendDynamicMail failed for template "${templateName}" to ${to}: ${error.message}`
    );
    return { success: false, error: error.message };
  }
};