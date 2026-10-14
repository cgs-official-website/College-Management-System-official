import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const templatesToSeed = [
  {
    name: 'Student Welcome',
    subject: 'Welcome - {{collegeName}}',
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
    subject: 'Password Reset Request',
    contentHtml: `
    <h2 style="color: #0f172a; margin-top: 0;">Password Reset Request</h2>
    <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
    <p>Click the button below to reset your password:</p>
    
    <div style="text-align: center;">
      <a href="{{resetLink}}" class="button">Reset Password</a>
    </div>
    <p style="font-size: 13px; color: #64748b; margin-top: 24px;">This link will expire in 15 minutes.</p>
    `
  },
  {
    name: 'Low Stock Alert',
    subject: 'Inventory Alert: Low Stock',
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
    contentHtml: `
    <h2 style="color: #0f172a; margin-top: 0;">Welcome, {{name}}!</h2>
    <p>Your teacher account has been created for <strong>{{collegeName}}</strong>.</p>
    
    <div class="highlight" style="text-align: left;">
      <div style="margin-bottom: 8px;"><strong>Teacher ID:</strong> {{teacherId}}</div>
      <div style="margin-bottom: 8px;"><strong>College:</strong> {{collegeName}}</div>
      <div><strong>Email:</strong> {{email}}</div>
    </div>
    
    <p>Open the secure setup link below to create your password and set up your account:</p>
    
    <div style="text-align: center;">
      <a href="{{setupUrl}}" class="button">Set Up Your Account</a>
    </div>
    
    <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
      If the button doesn't work, copy this setup link into your browser:<br>
      <a href="{{setupUrl}}">{{setupUrl}}</a>
    </p>
    <p style="font-size: 13px; color: #64748b; margin-top: 12px;">
      Sent on behalf of {{collegeName}}.
    </p>
    `
  }
];

async function seed() {
  for (const template of templatesToSeed) {
    const existing = await prisma.emailTemplate.findFirst({
      where: { name: template.name }
    });
    
    if (!existing) {
      await prisma.emailTemplate.create({
        data: template
      });
      console.log('Seeded template: ' + template.name);
    } else {
      await prisma.emailTemplate.update({
        where: { id: existing.id },
        data: {
          subject: template.subject,
          contentHtml: template.contentHtml
        }
      });
      console.log('Updated existing template: ' + template.name);
    }
  }
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
