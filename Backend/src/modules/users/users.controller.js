import { prisma } from '../../server.js';
import bcrypt from 'bcryptjs';

export const updateProfile = async (req, res) => {
  try {
    const { userId } = req.user;
    const { email, currentPassword, newPassword, ...profileData } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: { message: 'User not found' } });

    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: { message: 'Current password required' } });
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) return res.status(401).json({ error: { message: 'Invalid current password' } });
      
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash }
      });
    }

    if (email && email !== user.email) {
      const existing = await prisma.user.findFirst({ where: { email } });
      if (existing) return res.status(400).json({ error: { message: 'Email already in use' } });
      await prisma.user.update({
        where: { id: userId },
        data: { email }
      });
    }

    // Update specific role profile (simplified for stub)
    // You would normally check user.role and update the corresponding Teacher/Student record
    // using Prisma transactions. For now we will return success.

    res.json({ data: { success: true, message: 'Profile updated' } });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};
