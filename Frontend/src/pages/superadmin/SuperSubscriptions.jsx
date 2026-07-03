import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CreditCard, Edit2, Check, X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const DEFAULT_PLANS = [
  { id: 'plan_1', name: 'Demo Plan', price: '₹0', duration: '30 Days', storage: '5 GB', studentCount: '100', status: 'active', order: 1 },
  { id: 'plan_2', name: 'Professional', price: '₹999', duration: 'Monthly', storage: '100 GB', studentCount: '2000', status: 'inactive', order: 2 },
  { id: 'plan_3', name: 'Enterprise', price: 'Custom', duration: 'Yearly', storage: 'Unlimited', studentCount: 'Unlimited', status: 'inactive', order: 3 },
];

const SuperSubscriptions = () => {
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState(null);

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'subscription_plans'));
      const snapshot = await getDocs(q);
      
      let fetchedPlans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Initialize if empty
      if (fetchedPlans.length === 0) {
        for (const plan of DEFAULT_PLANS) {
          await setDoc(doc(db, 'subscription_plans', plan.id), plan);
        }
        fetchedPlans = DEFAULT_PLANS;
      }

      setPlans(fetchedPlans.sort((a, b) => a.order - b.order));
    } catch (error) {
      console.error("Error fetching plans:", error);
      toast.error("Failed to load subscription plans");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleToggleStatus = async (plan) => {
    const newStatus = plan.status === 'active' ? 'inactive' : 'active';
    try {
      await updateDoc(doc(db, 'subscription_plans', plan.id), { status: newStatus });
      setPlans(plans.map(p => p.id === plan.id ? { ...p, status: newStatus } : p));
      toast.success(`Plan marked as ${newStatus}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status");
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.target);
      const updatedData = {
        name: formData.get('name'),
        price: formData.get('price'),
        storage: formData.get('storage'),
        duration: formData.get('duration'),
        studentCount: formData.get('studentCount'),
      };

      await updateDoc(doc(db, 'subscription_plans', editingPlan.id), updatedData);
      
      setPlans(plans.map(p => p.id === editingPlan.id ? { ...p, ...updatedData } : p));
      setEditingPlan(null);
      toast.success("Plan updated successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update plan");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-primary-500 mb-4" />
        <p className="text-slate-500 dark:text-slate-400">Loading subscription plans...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Subscription Plans</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage the platform subscription offerings that appear on the landing page.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm relative flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                plan.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
              }`}>
                {plan.status.toUpperCase()}
              </span>
              <button 
                onClick={() => setEditingPlan(plan)}
                className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 rounded-lg text-slate-500 hover:text-primary-600 transition-colors"
                title="Edit Plan"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>

            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1">{plan.name}</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-extrabold text-slate-900 dark:text-white">{plan.price}</span>
              <span className="text-slate-500 dark:text-slate-400 font-medium">/{plan.duration}</span>
            </div>

            <div className="space-y-4 mb-8 flex-1">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Storage</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary-500" /> {plan.storage}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Duration</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary-500" /> {plan.duration}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Student Count</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary-500" /> {plan.studentCount}
                </p>
              </div>
            </div>

            <button
              onClick={() => handleToggleStatus(plan)}
              className={`w-full py-3 rounded-xl font-bold transition-colors ${
                plan.status === 'active' 
                  ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20' 
                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20'
              }`}
            >
              Mark as {plan.status === 'active' ? 'Inactive' : 'Active'}
            </button>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {editingPlan && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingPlan(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5 shrink-0">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit {editingPlan.name}</h2>
                <button onClick={() => setEditingPlan(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSaveEdit} className="p-6 space-y-4 overflow-y-auto">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Plan Name</label>
                  <input name="name" defaultValue={editingPlan.name} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Price Text</label>
                  <input name="price" defaultValue={editingPlan.price} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl" placeholder="e.g. ₹999 or Custom" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Storage</label>
                  <input name="storage" defaultValue={editingPlan.storage} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl" placeholder="e.g. 100 GB" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Duration</label>
                  <input name="duration" defaultValue={editingPlan.duration} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl" placeholder="e.g. Monthly" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Student Count</label>
                  <input name="studentCount" defaultValue={editingPlan.studentCount} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl" placeholder="e.g. 2000" required />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setEditingPlan(null)} className="px-4 py-2 font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Cancel</button>
                  <button type="submit" className="px-5 py-2.5 bg-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary-500/30 hover:bg-primary-700">Save Changes</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SuperSubscriptions;
