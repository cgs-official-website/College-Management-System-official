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

export const getWelcomeEmailTemplate = ({ name, email, password, loginUrl }) => {
  const content = `
    <h2 style="color: #0f172a; margin-top: 0;">Welcome to Zuna ERP, ${name}!</h2>
    <p>Your account has been successfully created. You can now log in to the system using the following credentials:</p>
    
    <div class="highlight" style="text-align: left;">
      <div style="margin-bottom: 8px;"><strong>Email:</strong> ${email}</div>
      <div><strong>Temporary Password:</strong> ${password}</div>
    </div>
    
    <p>We strongly recommend changing your password after your first login.</p>
    
    <div style="text-align: center;">
      <a href="${loginUrl}" class="button">Log In to Your Account</a>
    </div>
  `;
  return baseTemplate(content);
};

export const getPasswordResetTemplate = ({ resetLink }) => {
  const content = `
    <h2 style="color: #0f172a; margin-top: 0;">Password Reset Request</h2>
    <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
    <p>Click the button below to reset your password:</p>
    
    <div style="text-align: center;">
      <a href="${resetLink}" class="button">Reset Password</a>
    </div>
    <p style="font-size: 13px; color: #64748b; margin-top: 24px;">This link will expire in 15 minutes.</p>
  `;
  return baseTemplate(content);
};

export const getLowStockAlertTemplate = ({ itemName, currentStock, reorderLevel }) => {
  const content = `
    <h2 style="color: #ef4444; margin-top: 0;">Low Stock Alert</h2>
    <p>The inventory level for <strong>${itemName}</strong> has fallen below the reorder threshold.</p>
    
    <div class="highlight" style="text-align: left; background-color: #fef2f2; border-left: 4px solid #ef4444;">
      <div style="margin-bottom: 8px;"><strong>Item:</strong> ${itemName}</div>
      <div style="margin-bottom: 8px;"><strong>Current Stock:</strong> ${currentStock}</div>
      <div><strong>Reorder Level:</strong> ${reorderLevel}</div>
    </div>
    
    <p>Please review the inventory and initiate a restock process as soon as possible.</p>
  `;
  return baseTemplate(content);
};
