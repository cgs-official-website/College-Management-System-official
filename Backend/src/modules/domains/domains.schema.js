import { z } from 'zod';

const BLOCKED_PUBLIC_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'ymail.com',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'proton.me',
  'protonmail.com',
  'live.com',
  'msn.com',
  'rediffmail.com',
  'aol.com',
  'zoho.com',
  'gmx.com',
  'mail.com',
]);

// Hostname regex: supports domain with subdomains, e.g. abccollege.edu, eng.abccollege.ac.in
const DOMAIN_REGEX = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

export const addDomainSchema = z.object({
  domain: z
    .string({ required_error: 'Domain is required' })
    .trim()
    .toLowerCase()
    .refine((val) => !val.includes('@'), {
      message: 'Please enter only the domain name (e.g. college.edu), not an email address.',
    })
    .refine((val) => !val.startsWith('http://') && !val.startsWith('https://') && !val.includes('/'), {
      message: 'Please enter only the domain name, not a URL (exclude http:// or https://).',
    })
    .refine((val) => DOMAIN_REGEX.test(val), {
      message: 'Please provide a valid domain name (e.g. college.edu or college.ac.in).',
    })
    .refine((val) => !BLOCKED_PUBLIC_DOMAINS.has(val), {
      message: 'Public email providers (like Gmail, Yahoo, Outlook, etc.) cannot be used as institutional domains.',
    }),
});

export const domainIdParamSchema = z.object({
  id: z.string().uuid('Invalid domain ID format.'),
});
