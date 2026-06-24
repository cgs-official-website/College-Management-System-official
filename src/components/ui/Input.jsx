import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Input = forwardRef(({ 
  className, 
  label, 
  error, 
  id,
  ...props 
}, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
        </label>
      )}
      <input
        id={inputId}
        ref={ref}
        className={twMerge(
          clsx(
            "w-full px-4 py-2.5 bg-white dark:bg-[#0A0F1C] border rounded-xl text-sm transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-primary-500/50",
            "text-slate-900 dark:text-white placeholder-slate-400",
            error 
              ? "border-red-500 focus:border-red-500 focus:ring-red-500/50" 
              : "border-slate-200 dark:border-white/10 focus:border-primary-500",
            className
          )
        )}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
