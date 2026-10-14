import { prisma } from '../../lib/prisma.js';

export const DEFAULT_TEMPLATES = [
  {
    name: 'Student Welcome',
    subject: 'Welcome - {{collegeName}}',
    status: 'Active',
    contentHtml: `
    <h2 style="color: #0f172a; margin-top: 0;">Welcome, {{name}}!</h2>
    <p>Your student account has been successfully created for <strong>{{collegeName}}</strong>. You can now log in to the portal using the following credentials:</p>
    
    <div class="highlight" style="text-align: left;">
      <div style="margin-bottom: 8px;"><strong>Email:</strong> {{email}}</div>
      <div><strong>Temporary Password:</strong> {{password}}</div>
    </div>
    
    <p>We strongly recommend changing your password after your first login.</p>
    
    <div style="text-align: center;">
      <a href="{{loginUrl}}" class="button">Log In to Your Account</a>
    </div>
    `
  },
  {
    name: 'Admin Welcome',
    subject: 'Welcome to {{collegeName}} - College Admin',
    status: 'Active',
    contentHtml: `
    <h2 style="color: #0f172a; margin-top: 0;">Welcome, {{name}}!</h2>
    <p>Your college admin account has been successfully created for <strong>{{collegeName}}</strong>. You can now log in to the system using the following credentials:</p>
    
    <div class="highlight" style="text-align: left;">
      <div style="margin-bottom: 8px;"><strong>Email:</strong> {{email}}</div>
      <div><strong>Temporary Password:</strong> {{password}}</div>
    </div>
    
    <p>We strongly recommend changing your password after your first login.</p>
    
    <div style="text-align: center;">
      <a href="{{loginUrl}}" class="button">Log In to Your Account</a>
    </div>
    `
  },
  {
    name: 'Password Reset',
    subject: 'Reset your password - {{collegeName}}',
    status: 'Active',
    contentHtml: `
    <h2 style="color: #0f172a; margin-top: 0;">Reset your password</h2>
    <p>Hello {{name}},</p>
    <p>We received a request to reset the password for your <strong>{{collegeName}}</strong> account. Click the button below to choose a new password.</p>

    <div style="text-align: center;">
      <a href="{{resetLink}}" class="button">Reset Password</a>
    </div>

    <p style="font-size: 13px; color: #64748b;">
      If the button doesn't work, copy this link into your browser:<br>
      <a href="{{resetLink}}">{{resetLink}}</a>
    </p>

    <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
      This link expires in 15 minutes. If it has expired, you can request a new one from the login page.
    </p>
    <p style="font-size: 13px; color: #64748b;">
      If you didn't request this, you can safely ignore this email. Your password will not change unless you use the link above.
    </p>
    `
  },
  {
    name: 'Low Stock Alert',
    subject: 'Inventory Alert: Low Stock',
    status: 'Active',
    contentHtml: `
    <h2 style="color: #ef4444; margin-top: 0;">Low Stock Alert</h2>
    <p>The inventory level for <strong>{{itemName}}</strong> has fallen below the reorder threshold.</p>
    
    <div class="highlight" style="text-align: left; background-color: #fef2f2; border-left: 4px solid #ef4444;">
      <div style="margin-bottom: 8px;"><strong>Item:</strong> {{itemName}}</div>
      <div style="margin-bottom: 8px;"><strong>Current Stock:</strong> {{currentStock}}</div>
      <div><strong>Reorder Level:</strong> {{reorderLevel}}</div>
    </div>
    
    <p>Please review the inventory and initiate a restock process as soon as possible.</p>
    `
  },
  {
    name: 'Salary Processed',
    subject: 'Salary Processed Notification - {{collegeName}} ({{month}} {{year}})',
    status: 'Active',
    contentHtml: `
    <h2 style="color: #0f172a; margin-top: 0;">Hello {{staffName}},</h2>
    <p>Your salary from <strong>{{collegeName}}</strong> for <strong>{{month}} {{year}}</strong> has been processed on {{paymentDate}}.</p>
    <p>Net pay: <strong>{{netPay}}</strong></p>
    <p>Your payslip is attached to this email.</p>
    <p>Regards,<br/><strong>{{collegeName}}</strong></p>
    `
  },
  {
    name: 'Teacher Account Setup',
    subject: 'Set up your teacher account - {{collegeName}}',
    status: 'Active',
    contentHtml: `
    <h2 style="color: #0f172a; margin-top: 0;">Welcome, {{name}}!</h2>
    <p><strong>{{collegeName}}</strong> has created a teacher account for you. Use the button below to create your password and activate it.</p>

    <div class="highlight" style="text-align: left; font-family: sans-serif; font-size: 14px; letter-spacing: normal;">
      <div style="margin-bottom: 8px;"><strong>Teacher ID:</strong> {{teacherId}}</div>
      <div><strong>Login email:</strong> {{email}}</div>
    </div>

    <div style="text-align: center;">
      <a href="{{setupUrl}}" class="button">Set Up Your Account</a>
    </div>

    <p style="font-size: 13px; color: #64748b;">
      This link expires in 15 minutes and can only be used once. Please don't share it.
    </p>
    <p style="font-size: 12px; color: #94a3b8; word-break: break-all;">
      Button not working? Copy and paste this link into your browser:<br>
      <a href="{{setupUrl}}" style="color: #94a3b8;">{{setupUrl}}</a>
    </p>
    `
  },
  {
    name: 'Teacher Welcome',
    subject: 'Welcome to {{collegeName}} - your account is ready',
    status: 'Active',
    contentHtml: `
    <h2 style="color: #0f172a; margin-top: 0;">Welcome aboard, {{name}}!</h2>
    <p>Your teacher account at <strong>{{collegeName}}</strong> is now active. You can log in with your email and the password you just created.</p>

    <div class="highlight" style="text-align: left; font-family: sans-serif; font-size: 14px; letter-spacing: normal;">
      <div style="margin-bottom: 8px;"><strong>Teacher ID:</strong> {{teacherId}}</div>
      <div style="margin-bottom: 8px;"><strong>College:</strong> {{collegeName}}</div>
      <div><strong>Login email:</strong> {{email}}</div>
    </div>

    <div style="text-align: center;">
      <a href="{{loginUrl}}" class="button">Log In to Your Account</a>
    </div>

    <p style="font-size: 13px; color: #64748b;">
      If the button doesn't work, copy this link into your browser:<br>
      <a href="{{loginUrl}}">{{loginUrl}}</a>
    </p>
    <p style="font-size: 13px; color: #64748b;">
      Forgot your password? Use "Forgot password" on the login page. If you didn't create this account, please contact your college administrator.
    </p>
    `
  }
];

export async function ensureEmailTemplates() {
  for (const t of DEFAULT_TEMPLATES) {
    try {
      const existing = await prisma.emailTemplate.findFirst({
        where: { name: t.name }
      });
      if (!existing) {
        await prisma.emailTemplate.create({
          data: {
            name: t.name,
            subject: t.subject,
            contentHtml: t.contentHtml,
            status: 'Active'
          }
        });
        console.log(`[EmailTemplates] Auto-seeded default template into DB: "${t.name}"`);
      }
    } catch (err) {
      // Non-fatal background task
    }
  }
}
