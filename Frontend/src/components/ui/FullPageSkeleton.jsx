import React from 'react';
import { motion } from 'framer-motion';

export function FullPageSkeleton() {
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#020813] overflow-hidden">
      {/* Sidebar Skeleton */}
      <div className="hidden lg:flex flex-col w-[280px] bg-white dark:bg-[#0A0F1C] border-r border-slate-200 dark:border-white/10 p-6 space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="w-24 h-6 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse" />
        </div>
        
        <div className="space-y-4 pt-4">
          {[1, 2, 3, 4, 5, 6, 7].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse" />
              <div className="w-32 h-4 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-1 flex flex-col">
        {/* Header Skeleton */}
        <div className="h-20 bg-white/80 dark:bg-[#0A0F1C]/80 border-b border-slate-200 dark:border-white/10 px-6 flex items-center justify-between">
          <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse lg:hidden" />
          <div className="hidden md:block w-64 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="w-32 h-10 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
          </div>
        </div>

        {/* Dashboard Skeleton */}
        <div className="flex-1 p-6 md:p-8 space-y-8">
          <div className="space-y-2">
            <div className="w-64 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="w-48 h-4 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 h-32 flex flex-col justify-between">
                <div className="flex justify-between">
                  <div className="w-24 h-4 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse" />
                  <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
                </div>
                <div className="w-16 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse mt-4" />
              </div>
            ))}
          </div>

          <div className="h-64 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6">
            <div className="w-48 h-6 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse mb-6" />
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-full h-12 rounded-xl bg-slate-100 dark:bg-slate-800/50 animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
