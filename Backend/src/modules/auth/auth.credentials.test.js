import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import test from 'node:test';
import bcrypt from 'bcryptjs';
import { findUserWithMatchingPassword } from './auth.credentials.js';

const randomPassword = () => randomBytes(32).toString('hex');

async function createAccount(role, password) {
  return {
    id: randomUUID(),
    role,
    passwordHash: await bcrypt.hash(password, 10)
  };
}

test('each Admin authenticates only with that account password', async () => {
  const passwordA = randomPassword();
  const passwordB = randomPassword();
  const adminA = await createAccount('admin', passwordA);
  const adminB = await createAccount('admin', passwordB);

  assert.equal((await findUserWithMatchingPassword([adminA], passwordA))?.id, adminA.id);
  assert.equal((await findUserWithMatchingPassword([adminB], passwordB))?.id, adminB.id);
  assert.equal((await findUserWithMatchingPassword([adminA, adminB], passwordB))?.id, adminB.id);
  assert.equal(await findUserWithMatchingPassword([adminA], passwordB), null);
  assert.equal(await findUserWithMatchingPassword([adminB], passwordA), null);
  assert.equal(await findUserWithMatchingPassword([adminA], randomPassword()), null);
});

test('Super Admin authenticates with its own password', async () => {
  const password = randomPassword();
  const superAdmin = await createAccount('superadmin', password);

  assert.equal((await findUserWithMatchingPassword([superAdmin], password))?.id, superAdmin.id);
});