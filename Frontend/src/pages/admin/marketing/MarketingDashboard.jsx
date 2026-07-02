import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { 
  Target, 
  Mail, 
  MessageCircle, 
  PhoneCall, 
  TrendingUp,
  Users,
  BarChart3,
  ArrowUpRight,
  X
} from 'lucide-react';

const MarketingDashboard = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreateCampaign = (e) => {
    e.preventDefault();
    toast.success('Campaign created successfully!');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Marketing & Leads</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage campaigns, lead capturing, and communications.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-500/30 transition-all flex items-center gap-2"
        >
          <Target className="w-4 h-4" />
          Create Campaign
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        {[
          { title: 'Total Leads (30d)', value: '450', trend: '+15%', icon: Users, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'Email Open Rate', value: '42%', trend: '+5%', icon: Mail, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'WhatsApp Reads', value: '85%', trend: '+12%', icon: MessageCircle, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'Conversion Rate', value: '12%', trend: '+2%', icon: TrendingUp, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
        ].map((stat, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={idx} 
            className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm relative overflow-hidden group"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.title}</p>
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{stat.value}</h3>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <ArrowUpRight className="w-3 h-3" />
              {stat.trend} <span className="text-slate-400 font-normal">vs last month</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Campaigns */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Active Campaigns</h2>
            <button className="text-primary-600 dark:text-primary-400 text-sm font-bold hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            {[
              { name: 'Fall Admission Push', type: 'Email', status: 'Running', performance: '45% Open' },
              { name: 'Campus Tour Invites', type: 'WhatsApp', status: 'Running', performance: '80% Read' },
              { name: 'B.Tech Promo', type: 'SMS', status: 'Completed', performance: '15% Clicked' }
            ].map((camp, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                    {camp.type === 'Email' ? <Mail className="w-5 h-5"/> : <MessageCircle className="w-5 h-5"/>}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">{camp.name}</h4>
                    <p className="text-sm text-slate-500">{camp.type} • {camp.performance}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${camp.status === 'Running' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-400'}`}>
                  {camp.status}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Lead Follow Up List */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Hot Leads to Call</h2>
          </div>
          <div className="space-y-4">
            {[
              { name: 'Rohan Sharma', interest: 'B.Tech CSE', phone: '+91 98765 43210' },
              { name: 'Priya Patel', interest: 'MBA Finance', phone: '+91 87654 32109' },
              { name: 'Amit Kumar', interest: 'B.Tech Mech', phone: '+91 76543 21098' }
            ].map((lead, i) => (
              <div key={i} className="flex flex-col gap-2 p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 hover:border-primary-500/30 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{lead.name}</h4>
                  <button className="text-primary-600 dark:text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <PhoneCall className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">{lead.interest}</span>
                  <span className="text-slate-400">{lead.phone}</span>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl transition-colors">
            View Lead Pipeline
          </button>
        </motion.div>
      </div>

      {/* Create Campaign Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white dark:bg-[#0A0F1C] w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create New Campaign</h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateCampaign} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Campaign Name</label>
                  <input type="text" placeholder="e.g. Summer Admissions Push" className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all dark:text-white" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Channel</label>
                    <select className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all dark:text-white">
                      <option>Email</option>
                      <option>WhatsApp</option>
                      <option>SMS</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Target Audience</label>
                    <select className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all dark:text-white">
                      <option>All Leads</option>
                      <option>Hot Leads Only</option>
                      <option>Current Students</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Message Content</label>
                  <textarea rows="4" placeholder="Type your campaign message here..." className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all dark:text-white resize-none" required></textarea>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Cancel</button>
                  <button type="submit" className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-500/30 transition-all">Launch Campaign</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MarketingDashboard;
