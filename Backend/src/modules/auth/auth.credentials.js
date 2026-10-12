import bcrypt from 'bcryptjs';

export async function findUserWithMatchingPassword(users, password) {
  for (const user of users) {
    if (user.passwordHash && await bcrypt.compare(password, user.passwordHash)) {
      return user;
    }
  }

  return null;
}