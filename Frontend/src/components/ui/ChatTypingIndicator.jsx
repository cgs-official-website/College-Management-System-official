import { Bot } from 'lucide-react';

export default function ChatTypingIndicator() {
  return (
    <div className="flex gap-3 items-end mb-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 via-primary-600 to-teal-700 flex items-center justify-center shadow-lg shadow-primary-500/20 text-white border border-white/10">
        <Bot className="w-4.5 h-4.5" />
      </div>
      <div className="bg-slate-50 dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.08] backdrop-blur-sm rounded-2xl rounded-bl-sm px-4 py-3 shadow-md">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary-400/80 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.8s' }} />
          <span className="w-2 h-2 rounded-full bg-primary-400/80 animate-bounce" style={{ animationDelay: '150ms', animationDuration: '0.8s' }} />
          <span className="w-2 h-2 rounded-full bg-primary-400/80 animate-bounce" style={{ animationDelay: '300ms', animationDuration: '0.8s' }} />
        </div>
      </div>
    </div>
  );
}