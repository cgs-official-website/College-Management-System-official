import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronRight, AlertCircle, Bot } from 'lucide-react';

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function ChatMessage({ message, compact = false }) {
  const isUser = message.role === 'user';
  const isError = message.role === 'error';

  const renderMessageText = (text) => {
    if (!text) return null;
    const parts = text.split(/(https?:\/\/[^\s]+|@[\w.-]+)/g);
    return parts.map((part, i) => {
      if (part.match(/^https?:\/\/[^\s]+$/)) {
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 opacity-90 hover:opacity-100 break-all transition-opacity">
            {part}
          </a>
        );
      }
      if (part.match(/^@[\w.-]+$/)) {
        return (
          <strong key={i} className={`px-1 py-0.5 rounded-[4px] mx-0.5 font-bold ${isUser ? 'bg-white/20 text-white' : 'bg-primary-500/10 text-primary-600 dark:text-primary-400'}`}>
            {part}
          </strong>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const processedContent = (!isUser && !isError)
    ? message.content.replace(/(@[\w.-]+)/g, '**$1**')
    : message.content;

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end mb-4`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 via-primary-600 to-teal-700 flex items-center justify-center shadow-lg shadow-primary-500/20 text-white border border-white/10">
          <Bot className="w-4.5 h-4.5" />
        </div>
      )}

      <div className="max-w-[85%] group">
        <div
          className={`
            relative px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-md transition-colors duration-200
            ${isUser
              ? 'bg-gradient-to-br from-primary-600 via-primary-700 to-teal-700 text-white rounded-br-sm border border-primary-500/20 shadow-primary-500/5'
              : isError
              ? 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-300 rounded-bl-sm'
              : 'bg-slate-50 dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-700 dark:text-gray-200 backdrop-blur-sm rounded-bl-sm shadow-black/5'
            }
          `}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap">{renderMessageText(message.content)}</div>
          ) : isError ? (
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <p>{message.content}</p>
            </div>
          ) : (
            <div className="prose dark:prose-invert max-w-none
              [&>*]:text-sm [&>p]:my-1 [&>ul]:my-1 [&>ul]:pl-0 [&>ul]:list-none [&>li]:my-1
              [&>strong]:text-primary-600 dark:[&>strong]:text-primary-300 [&>strong]:font-semibold
              [&>h1]:text-primary-700 [&>h2]:text-primary-700 [&>h3]:text-primary-700 dark:[&>h1]:text-primary-200 dark:[&>h2]:text-primary-200 dark:[&>h3]:text-primary-200
              [&>a]:text-primary-600 dark:[&>a]:text-primary-400 hover:[&>a]:underline [&>code]:text-primary-600 dark:[&>code]:text-primary-300 [&>code]:bg-slate-100 dark:[&>code]:bg-black/30 [&>code]:px-1.5 [&>code]:py-0.5 [&>code]:rounded [&>code]:font-mono [&>code]:text-xs [&>p]:text-slate-700 dark:[&>p]:text-gray-200">
              <ReactMarkdown
                components={{
                  li: ({ node, ...props }) => (
                    <li className="flex items-start gap-1.5" {...props}>
                      <ChevronRight className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                      <span>{props.children}</span>
                    </li>
                  )
                }}
              >
                {processedContent}
              </ReactMarkdown>
            </div>
          )}
        </div>
        <p className={`text-[10px] text-slate-400 dark:text-gray-600 mt-1 ${isUser ? 'text-right pr-1' : 'text-left pl-1'}`}>
          {formatTime(message.timestamp)}
        </p>
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center text-white text-xs font-black shadow border border-white/10">
          Y
        </div>
      )}
    </div>
  );
}