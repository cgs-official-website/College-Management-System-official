import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { prisma } from '../../server.js';
dotenv.config();

// ---------------------------------------------------------------------------
// Transporter setup
// ---------------------------------------------------------------------------
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: parseInt(process.env.SMTP_PORT || '465', 10) === 465, // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // Fail fast: don't hang the HTTP request if SMTP is unreachable
  connectionTimeout: 10000,  // 10s — time to establish TCP connection
  greetingTimeout: 10000,    // 10s — time to receive SMTP greeting banner
  socketTimeout: 20000,      // 20s — time for each SMTP command/data
});

// Verify SMTP connection at startup (non-blocking, safe log only — NO credentials ever logged)
transporter.verify((err) => {
  if (err) {
    console.error('[EmailService] ⚠️  SMTP transporter verification FAILED — emails will not be delivered.');
    if (process.env.NODE_ENV !== 'production') {
      const missingAuth = !process.env.SMTP_USER || !process.env.SMTP_PASS;
      const isAuthFailure = err.code === 'EAUTH' || err.responseCode === 535;
      const isTlsFailure = /tls|ssl|certificate/i.test(err.message || '');
      const category = missingAuth
        ? 'SMTP_CONFIG_MISSING'
        : isAuthFailure
          ? 'SMTP_AUTH_FAILED'
          : isTlsFailure
            ? 'SMTP_TLS_ERROR'
            : err.code || 'SMTP_UNKNOWN';
      const redactCredentials = (value) => {
        let message = String(value || '');
        for (const secret of [process.env.SMTP_USER, process.env.SMTP_PASS]) {
          if (secret) message = message.split(secret).join('[redacted]');
        }
        return message;
      };

      console.error('[EmailService] SMTP failure category:', category);
      console.error('[EmailService] SMTP host:', process.env.SMTP_HOST || 'smtp.gmail.com');
      console.error('[EmailService] SMTP port:', process.env.SMTP_PORT || '465');
      console.error('[EmailService] SMTP user configured:', Boolean(process.env.SMTP_USER));
      console.error('[EmailService] SMTP password configured:', Boolean(process.env.SMTP_PASS));
      console.error('[EmailService] SMTP error code:', err.code || 'NONE');
      console.error('[EmailService] SMTP error command:', err.command || 'NONE');
      console.error('[EmailService] SMTP error message:', redactCredentials(err.message));
    }
  } else {
    console.log('[EmailService] ✅ SMTP transporter is ready to send emails.');
    console.log('[EmailService]   SMTP host :', process.env.SMTP_HOST || 'smtp.gmail.com');
    console.log('[EmailService]   SMTP port :', process.env.SMTP_PORT || '465');
    console.log('[EmailService]   SMTP user configured:', Boolean(process.env.SMTP_USER));
  }
});

// ---------------------------------------------------------------------------
// Base HTML layout (used as fallback when DB template is missing)
// ---------------------------------------------------------------------------
const baseTemplate = (content) => `
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
      font-size: 24px;
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
      <h1>Zuna ERP</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>This is an automated message from Zuna ERP College Management System.</p>
      <p>&copy; ${new Date().getFullYear()} Carrezza Global Solutions. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

// ---------------------------------------------------------------------------
// Built-in fallback templates
// These are used when the EmailTemplate record doesn't exist in the database.
// Run seed_templates.js to persist templates to the DB for runtime editing.
// ---------------------------------------------------------------------------
const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const FALLBACK_TEMPLATES = {
  'Teacher Account Setup': {
    subject: 'Set up your Zuna ERP teacher account',
    buildHtml: (vars) => `
      <h2 style="color: #0f172a; margin-top: 0;">Welcome, ${escapeHtml(vars.name || 'Teacher')}!</h2>
      <p>Your teacher account has been created for ${escapeHtml(vars.collegeName || 'your college')}.</p>

      <div class="highlight" style="text-align: left; font-family: sans-serif; font-size: 14px; letter-spacing: normal;">
        <div style="margin-bottom: 8px;"><strong>Teacher ID:</strong> ${escapeHtml(vars.teacherId)}</div>
        <div><strong>Email:</strong> ${escapeHtml(vars.email)}</div>
      </div>

      <p>Open the secure setup link to review your account details and create your password.</p>

      <div style="text-align: center;">
        <a href="${escapeHtml(vars.setupUrl)}" class="button">Set Up Your Account</a>
      </div>

      <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
        If the button doesn't work, copy this setup link into your browser:<br>
        <a href="${escapeHtml(vars.setupUrl)}">${escapeHtml(vars.setupUrl)}</a>
      </p>
    `
  },
  'Student Welcome': {
    subject: 'Welcome to Zuna ERP',
    buildHtml: (vars) => `
      <h2 style="color: #0f172a; margin-top: 0;">Welcome to Zuna ERP, ${vars.name || 'Student'}!</h2>
      <p>Your account has been successfully created. You can now log in to the system using the following credentials:</p>

      <div class="highlight" style="text-align: left; font-family: sans-serif; font-size: 14px; letter-spacing: normal;">
        <div style="margin-bottom: 8px;"><strong>Email:</strong> ${vars.email}</div>
        <div><strong>Your Password:</strong> ${vars.password}</div>
      </div>

      <p>We strongly recommend changing your password after your first login.</p>

      <div style="text-align: center;">
        <a href="${vars.loginUrl}" class="button">Log In to Your Account</a>
      </div>
    `
  },
  'Password Reset': {
    subject: 'Password Reset Request',
    buildHtml: (vars) => `
      <h2 style="color: #0f172a; margin-top: 0;">Password Reset Request</h2>
      <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
      <p>Click the button below to reset your password:</p>

      <div style="text-align: center;">
        <a href="${vars.resetLink}" class="button">Reset Password</a>
      </div>

      <p style="font-size: 13px; color: #64748b; margin-top: 24px;">This link will expire in 15 minutes.</p>
    `
  },
};

// ---------------------------------------------------------------------------
// Core sendMail — wraps nodemailer.sendMail with proper logging
// ---------------------------------------------------------------------------
export const sendMail = async ({ to, subject, html, text, cc, bcc, replyTo }) => {
  try {
    const textContent = text || (html ? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '');

    const mailOptions = {
      from: process.env.FROM_EMAIL || '"Zuna ERP" <noreply@zuna.edu>',
      to,
      subject,
      html,
      text: textContent,
    };

    if (cc) mailOptions.cc = cc;
    if (bcc) mailOptions.bcc = bcc;
    if (replyTo) mailOptions.replyTo = replyTo;

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] ✅ Email sent successfully to: ${to} | Subject: "${subject}" | MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    // Log the Nodemailer error code/message for debugging — never log credentials
    console.error(
      `[EmailService] ❌ Failed to send email to: ${to}\n` +
      `  Subject: "${subject}"\n` +
      `  Error Code: ${error.code || 'UNKNOWN'}\n` +
      `  Error: ${error.message}`
    );
    return { success: false, error: error.message };
  }
};

// ---------------------------------------------------------------------------
// sendDynamicMail — loads template from DB, falls back to built-in if missing
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// PASSWORD SAFETY GUARD
// Rejects any DB-stored email template whose subject or contentHtml contains
// a {{password}} placeholder. This prevents accidental exposure of passwords
// through misconfigured database templates regardless of template name.
// ---------------------------------------------------------------------------
const UNSAFE_TEMPLATE_PATTERN = /\{\{\s*password\s*\}\}/i;

export const sendDynamicMail = async ({ to, templateName, variables = {}, cc, bcc, replyTo }) => {
  try {
    let subject;
    let htmlContent;

    // --- Try loading template from database first ---
    const template = await prisma.emailTemplate.findFirst({
        where: { name: templateName }
      }).catch(() => null); // DB failure should not crash email sending

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
        // Do NOT return early; the built-in template is always safe to use.
        console.warn(
          `[EmailService] ⚠️  DB template "${templateName}" status="${template.status}" (not "Active").` +
          ` Falling back to built-in template for: ${to}`
        );
        // Fall through to built-in fallback below
      } else {
        // DB template found, active, and safe — interpolate variables
        subject = template.subject;
        htmlContent = template.contentHtml || '';

        for (const [key, value] of Object.entries(variables)) {
          const regex = new RegExp(`{{${key}}}`, 'g');
          subject = subject.replace(regex, String(value ?? ''));
          htmlContent = htmlContent.replace(regex, String(value ?? ''));
        }

        htmlContent = baseTemplate(htmlContent);
        console.log(`[EmailService] Using DB template: "${templateName}"`);

        return await sendMail({ to, subject, html: htmlContent, cc, bcc, replyTo });
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

    subject = fallback.subject;
    htmlContent = baseTemplate(fallback.buildHtml(variables));

    return await sendMail({ to, subject, html: htmlContent, cc, bcc, replyTo });

  } catch (error) {
    console.error(
      `[EmailService] ❌ sendDynamicMail failed for template "${templateName}" to ${to}: ${error.message}`
    );
    return { success: false, error: error.message };
  }
};
