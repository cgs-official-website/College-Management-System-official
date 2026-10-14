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
  },
  {
    name: 'College Activated',
    subject: ' Your College Has Been Activated - {{collegeName}}',
    status: 'Active',
    contentHtml: `
    <h2 style="color: #0f172a; margin-top: 0;">Congratulations, {{name}}!</h2>
    <p>We are pleased to inform you that your institution, <strong>{{collegeName}}</strong>, has been officially reviewed, approved, and activated by the Super Administration.</p>
    
    <div class="highlight" style="text-align: left; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <div style="margin-bottom: 8px; color: #15803d; font-weight: 700;">Status: Active &amp; Approved</div>
      <div style="margin-bottom: 8px; font-size: 14px; color: #1e293b;"><strong>College Name:</strong> {{collegeName}}</div>
      <div style="margin-bottom: 8px; font-size: 14px; color: #1e293b;"><strong>College Code:</strong> {{collegeCode}}</div>
      <div style="font-size: 14px; color: #1e293b;"><strong>Admin Account:</strong> {{email}}</div>
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
      <a href="{{loginUrl}}" class="button" style="background-color: #16a34a; font-size: 15px; padding: 14px 28px; border-radius: 8px; text-decoration: none; color: #ffffff; display: inline-block; font-weight: 600;">Log In to Admin Dashboard</a>
    </div>

    <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
      Direct login URL: <a href="{{loginUrl}}" style="color: #2563eb;">{{loginUrl}}</a>
    </p>
    `
  },
  {
    name: 'College Suspended',
    subject: ' Notice of Account Suspension - {{collegeName}}',
    status: 'Active',
    contentHtml: `
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
    <div style="font-family: 'Poppins', Arial, sans-serif; color: #1e293b;">
      <h2 style="font-family: 'Poppins', Arial, sans-serif; color: #b91c1c; margin-top: 0; font-size: 20px; font-weight: 700;">Account Suspension Notice</h2>
      <p style="font-family: 'Poppins', Arial, sans-serif; font-size: 15px; color: #334155; line-height: 1.6;">
        Dear <strong>{{name}}</strong>,
      </p>
      <p style="font-family: 'Poppins', Arial, sans-serif; font-size: 14px; color: #475569; line-height: 1.6;">
        This email is an official notification that institutional access for <strong>{{collegeName}}</strong> has been temporarily suspended by the Super Administration.
      </p>

      <div style="font-family: 'Poppins', Arial, sans-serif; text-align: left; background-color: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #ef4444; border-radius: 8px; padding: 18px; margin: 20px 0;">
        <div style="margin-bottom: 10px; color: #b91c1c; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Account Status: Suspended</div>
        <div style="margin-bottom: 8px; font-size: 14px; color: #1e293b;"><strong>College Name:</strong> {{collegeName}}</div>
        <div style="margin-bottom: 8px; font-size: 14px; color: #1e293b;"><strong>College Code:</strong> {{collegeCode}}</div>
        <div style="margin-bottom: 8px; font-size: 14px; color: #1e293b;"><strong>Effective Date:</strong> {{effectiveDate}}</div>
        <div style="font-size: 14px; color: #1e293b;"><strong>Reason for Suspension:</strong> {{suspensionReason}}</div>
      </div>

      <p style="font-family: 'Poppins', Arial, sans-serif; font-size: 14px; color: #475569; line-height: 1.6;">
        During the suspension period, administrative access, faculty portals, and student service features associated with your institution will remain inaccessible.
      </p>

      <div style="font-family: 'Poppins', Arial, sans-serif; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
        <h4 style="font-family: 'Poppins', Arial, sans-serif; margin: 0 0 10px 0; color: #0f172a; font-size: 14px; font-weight: 600;">Support &amp; Next Steps</h4>
        <p style="font-family: 'Poppins', Arial, sans-serif; font-size: 13px; color: #475569; margin: 0 0 10px 0; line-height: 1.5;">
          If you believe this action was taken in error or if you wish to appeal and reactivate your institution's account, please contact our support desk immediately:
        </p>
        <div style="font-size: 13px; color: #334155; margin-bottom: 4px;"><strong>Support Email:</strong> <a href="mailto:{{supportEmail}}" style="color: #2563eb; text-decoration: none;">{{supportEmail}}</a></div>
        <div style="font-size: 13px; color: #334155; margin-bottom: 4px;"><strong>Support Helpline:</strong> {{supportPhone}}</div>
        <div style="font-size: 13px; color: #334155;"><strong>Management Portal:</strong> <a href="{{portalUrl}}" style="color: #2563eb; text-decoration: none;">{{portalUrl}}</a></div>
      </div>

      <p style="font-family: 'Poppins', Arial, sans-serif; font-size: 12px; color: #94a3b8; margin-top: 24px; line-height: 1.5;">
        This is an automated system notification. Please reach out to the support details provided above for any queries.
      </p>
    </div>
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
