import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { prisma } from '../../server.js';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendMail = async ({ to, subject, html, text, cc, bcc, replyTo }) => {
  try {
    // Generate a basic text fallback if not provided
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
    console.log(`[EmailService] Sent mail to ${to} (MessageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    // Avoid logging full error object which might contain credentials in transporter config
    console.error(`[EmailService] Failed to send mail to ${to}: ${error.message}`);
    return { success: false, error: error.message };
  }
};

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

export const sendDynamicMail = async ({ to, templateName, variables = {}, cc, bcc, replyTo }) => {
  try {
    const template = await prisma.emailTemplate.findFirst({
      where: { name: templateName }
    });

    if (!template) {
      throw new Error(`EmailTemplate not found: ${templateName}`);
    }
    
    // Check if it's inactive (optional, but good practice if you implement status)
    if (template.status !== 'Active') {
      console.log(`[EmailService] Template ${templateName} is not active. Skipping email.`);
      return { success: false, error: 'Template is not active' };
    }

    let subject = template.subject;
    let htmlContent = template.contentHtml || '';

    // Replace variables in subject and html
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, value);
      htmlContent = htmlContent.replace(regex, value);
    }

    // Wrap with base template
    const fullHtml = baseTemplate(htmlContent);

    return await sendMail({ to, subject, html: fullHtml, cc, bcc, replyTo });
  } catch (error) {
    console.error(`[EmailService] Failed to send dynamic mail to ${to}: ${error.message}`);
    return { success: false, error: error.message };
  }
};
