BEGIN;

UPDATE "EmailTemplate"
SET
  status = 'Inactive',
  subject = 'Teacher account setup uses a secure setup link',
  "contentHtml" = '<p>Use the secure Teacher Account Setup email to create your password. No temporary password is issued.</p>',
  "updatedAt" = NOW()
WHERE name = 'Staff Welcome';

COMMIT;