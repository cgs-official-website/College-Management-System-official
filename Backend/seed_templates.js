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
    subject: 'Welcome to Zuna ERP',
    contentHtml: `
    <h2 style="color: #0f172a; margin-top: 0;">Welcome to Zuna ERP, {{name}}!</h2>
    <p>Your account has been successfully created. You can now log in to the system using the following credentials:</p>
    
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
    name: 'Staff Welcome',
    subject: 'Welcome to Zuna ERP',
    contentHtml: `
    <h2 style="color: #0f172a; margin-top: 0;">Welcome to Zuna ERP, {{name}}!</h2>
    <p>Your staff account has been successfully created. You can now log in to the system using the following credentials:</p>
    
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
    subject: 'Welcome to Zuna ERP - College Admin',
    contentHtml: `
    <h2 style="color: #0f172a; margin-top: 0;">Welcome to Zuna ERP, {{name}}!</h2>
    <p>Your college admin account has been successfully created. You can now log in to the system using the following credentials:</p>
    
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
      console.log('Template already exists: ' + template.name);
    }
  }
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
