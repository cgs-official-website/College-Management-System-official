import { prisma } from '../../server.js';

const DEFAULT_PLANS = [
  { name: 'Starter', price: '₹3999', duration: 'month', storage: '10GB', studentCount: 'Up to 500', status: 'active', order: 1, modules: ['dashboards', 'students', 'staff', 'departments', 'courses'] },
  { name: 'Professional', price: '₹7999', duration: 'month', storage: '50GB', studentCount: 'Up to 2000', status: 'active', order: 2, modules: ['dashboards', 'students', 'staff', 'departments', 'courses', 'attendance', 'fees', 'library', 'exams'] },
  { name: 'Enterprise', price: 'Custom', duration: 'year', storage: 'Unlimited', studentCount: 'Unlimited', status: 'active', order: 3, modules: ['dashboards', 'students', 'staff', 'departments', 'courses', 'attendance', 'fees', 'library', 'exams', 'payroll', 'placements', 'store', 'hostel', 'transport'] },
];

export const getAllPlans = async (req, res) => {
  try {
    let plans = await prisma.subscriptionPlan.findMany({
      orderBy: { order: 'asc' }
    });

    if (plans.length === 0) {
      await prisma.subscriptionPlan.createMany({
        data: DEFAULT_PLANS
      });
      plans = await prisma.subscriptionPlan.findMany({
        orderBy: { order: 'asc' }
      });
    }

    res.status(200).json({ status: 'success', data: plans });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch subscription plans' });
  }
};

export const getPublicPlans = async (req, res) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { status: 'active' },
      orderBy: { order: 'asc' }
    });
    res.status(200).json({ status: 'success', data: plans });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch active subscription plans' });
  }
};

export const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, duration, storage, studentCount, status, order, modules } = req.body;
    
    const updatedPlan = await prisma.subscriptionPlan.update({
      where: { id },
      data: { name, price, duration, storage, studentCount, status, order, modules }
    });

    res.status(200).json({ status: 'success', data: updatedPlan });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Failed to update subscription plan' });
  }
};
