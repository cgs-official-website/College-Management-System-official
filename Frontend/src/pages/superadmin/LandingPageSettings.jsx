import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { LayoutTemplate, Save, CheckCircle2, Loader2, Link2, Type, FileText } from 'lucide-react';
import apiClient from '../../services/apiClient';

const LandingPageSettings = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await apiClient.get('/landing-page');
        if (response.data?.status === 'success') {
          reset(response.data.data);
        }
      } catch (err) {
        setError('Failed to load landing page settings.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchContent();
  }, [reset]);

  const onSubmit = async (data) => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await apiClient.put('/landing-page', data);
      if (response.data?.status === 'success') {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
      }
    } catch (err) {
      setError('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mt-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Landing Page Configuration</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage the content shown on the public landing page dynamically.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 rounded-xl font-medium">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-sm mt-8">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <LayoutTemplate className="w-5 h-5 text-primary-500" />
          Hero Section
        </h2>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Hero Badge</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Link2 className="h-5 w-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                </div>
                <input
                  type="text"
                  {...register("heroBadge", { required: "Hero Badge is required" })}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                  placeholder="e.g. Next-Gen Campus OS"
                />
              </div>
              {errors.heroBadge && <p className="mt-1 text-xs text-red-500">{errors.heroBadge.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Hero Title</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Type className="h-5 w-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                </div>
                <input
                  type="text"
                  {...register("heroTitle", { required: "Hero Title is required" })}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                  placeholder="e.g. Architect Your Future."
                />
              </div>
              {errors.heroTitle && <p className="mt-1 text-xs text-red-500">{errors.heroTitle.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Hero Subtitle</label>
              <div className="relative group">
                <div className="absolute top-3 left-4 flex items-start pointer-events-none">
                  <FileText className="h-5 w-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                </div>
                <textarea
                  {...register("heroSubtitle", { required: "Hero Subtitle is required" })}
                  rows={4}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                  placeholder="Enter a brief description..."
                ></textarea>
              </div>
              {errors.heroSubtitle && <p className="mt-1 text-xs text-red-500">{errors.heroSubtitle.message}</p>}
            </div>

          </div>

          <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-6 mt-8">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Contact Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Support Email</label>
                <input
                  type="email"
                  {...register("contactEmail")}
                  className="block w-full px-4 py-3 bg-white dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                  placeholder="e.g. support@zuna.edu"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Support Phone</label>
                <input
                  type="text"
                  {...register("contactPhone")}
                  className="block w-full px-4 py-3 bg-white dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                  placeholder="e.g. +1 (555) 123-4567"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Headquarters Address</label>
                <input
                  type="text"
                  {...register("contactAddress")}
                  className="block w-full px-4 py-3 bg-white dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                  placeholder="e.g. 123 Education Blvd, New York, NY"
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className={`flex items-center gap-2 px-8 py-3 text-white text-sm font-bold rounded-xl shadow-lg transition-all ${
                isSaved ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30' : 'bg-primary-600 hover:bg-primary-700 shadow-primary-500/30'
              } disabled:opacity-50`}
            >
              {isSaving ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
              ) : isSaved ? (
                <><CheckCircle2 className="w-5 h-5" /> Saved Successfully</>
              ) : (
                <><Save className="w-5 h-5" /> Save Changes</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LandingPageSettings;
