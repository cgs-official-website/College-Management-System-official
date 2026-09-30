/**
 * SMTP Diagnostic Script — safe, no credentials printed
 * Run: node smtp_diag.mjs
 */
import 'dotenv/config';
import nodemailer from 'nodemailer';

console.log('='.repeat(60));
console.log('SMTP DIAGNOSTIC');
console.log('='.repeat(60));

// --- Check env vars ---
const host  = process.env.SMTP_HOST;
const port  = process.env.SMTP_PORT;
const user  = process.env.SMTP_USER;
const pass  = process.env.SMTP_PASS;

console.log('Env var check:');
console.log('  SMTP_HOST   :', host   || '⚠️  NOT SET');
console.log('  SMTP_PORT   :', port   || '⚠️  NOT SET');
console.log('  SMTP_USER configured:', Boolean(user));
console.log('  SMTP_PASS configured:', Boolean(pass));
console.log('');

// --- Warn about common .env parsing issues ---
if (pass && (pass.startsWith('"') || pass.endsWith('"'))) {
  console.warn('⚠️  SMTP_PASS appears to still have surrounding quotes — dotenv may not have stripped them.');
  console.warn('   Remove quotes from SMTP_PASS in .env if the value starts/ends with "');
}
if (!pass) {
  console.error('❌ SMTP_PASS is undefined — Nodemailer will fail authentication.');
  process.exit(1);
}
if (!user) {
  console.error('❌ SMTP_USER is undefined — Nodemailer will fail authentication.');
  process.exit(1);
}

const smtpPort   = parseInt(port || '465', 10);
const smtpSecure = smtpPort === 465;

console.log('Transporter config:');
console.log('  host  :', host || 'smtp.gmail.com');
console.log('  port  :', smtpPort);
console.log('  secure:', smtpSecure, `(${smtpSecure ? 'SSL/TLS' : 'STARTTLS'})`);
console.log('');

const transporter = nodemailer.createTransport({
  host  : host || 'smtp.gmail.com',
  port  : smtpPort,
  secure: smtpSecure,
  auth  : { user, pass },
});

console.log('Running transporter.verify() ...');

transporter.verify((err, success) => {
  if (err) {
    console.error('');
    console.error('❌ SMTP VERIFICATION FAILED');
    console.error('  Error code     :', err.code     || 'NONE');
    console.error('  Error command  :', err.command   || 'NONE');
    console.error('  Error response code:', err.responseCode || 'NONE');
    const redactCredentials = (value) => {
      let message = String(value || '');
      for (const secret of [user, pass]) {
        if (secret) message = message.split(secret).join('[redacted]');
      }
      return message;
    };
    console.error('  Error message  :', redactCredentials(err.message));
    console.error('');
    console.error('Diagnosis:');
    if (err.code === 'EAUTH' || (err.response && err.response.includes('535'))) {
      console.error('  → AUTHENTICATION FAILED (EAUTH / 535)');
      console.error('  → The Gmail App Password is wrong or has expired.');
      console.error('  → Fix: Go to myaccount.google.com/apppasswords and generate a new App Password.');
      console.error('  → Make sure 2-Step Verification is enabled on the Gmail account.');
      console.error('  → The App Password should be 16 chars, no spaces, entered WITHOUT quotes in .env');
    } else if (err.code === 'ECONNECTION' || err.code === 'ECONNREFUSED') {
      console.error('  → CONNECTION REFUSED — cannot reach the SMTP server.');
      console.error('  → Check your firewall/network for port', smtpPort);
    } else if (err.code === 'ETIMEDOUT') {
      console.error('  → CONNECTION TIMED OUT — SMTP server unreachable on port', smtpPort);
    } else if (err.code === 'ENOTFOUND') {
      console.error('  → DNS RESOLUTION FAILED — SMTP_HOST is wrong or DNS is unavailable.');
    } else if (!pass || pass.trim() === '') {
      console.error('  → SMTP_PASS is empty — check .env file');
    }
  } else {
    console.log('');
    console.log('✅ SMTP VERIFICATION PASSED — transporter is ready to send emails.');
  }
});
