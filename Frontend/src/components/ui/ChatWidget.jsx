import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Trash2, Bot } from 'lucide-react';
import { useChat } from '../../hooks/useChat';
import ChatMessage from './ChatMessage';
import ChatTypingIndicator from './ChatTypingIndicator';
import { QUICK_REPLIES } from '../../data/knowledgeBase';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const { messages, isLoading, sendUserMessage, clearChat } = useChat();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [unreadCount, setUnreadCount] = useState(1);
  const prevMessagesLength = useRef(messages.length);

  useEffect(() => {
    if (isOpen) setUnreadCount(0);
    else if (messages.length > prevMessagesLength.current) {
      setUnreadCount(prev => prev + (messages.length - prevMessagesLength.current));
    }
    prevMessagesLength.current = messages.length;
  }, [messages, isOpen]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);
  useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 300); }, [isOpen]);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;
    setInputValue('');
    setShowQuickReplies(false);
    await sendUserMessage(text);
  };

  const handleQuickReply = async (reply) => {
    setShowQuickReplies(false);
    await sendUserMessage(reply);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <motion.div drag dragMomentum={false} className="fixed bottom-5 right-5 z-[9999]" style={{ touchAction: "none" }}>
      <AnimatePresence mode="wait">
        {!isOpen && (
          <motion.button
            key="open-btn"
            initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
            onClick={() => setIsOpen(true)}
            className="relative rounded-full bg-gradient-to-br from-primary-500 via-primary-600 to-teal-700 shadow-2xl flex items-center justify-center border border-white/10"
            style={{ width: '56px', height: '56px' }}
            aria-label="Open Zuna AI Chat"
          >
            <span className="absolute inset-0 rounded-full bg-primary-500/20 animate-ping pointer-events-none" />
            <Bot className="w-6.5 h-6.5 text-white relative z-10" />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -left-2 min-w-[20px] h-5 px-1.5 bg-rose-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold animate-bounce">
                {unreadCount}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-window"
            initial={{ opacity: 0, y: 16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="absolute bottom-0 right-0 w-[calc(100vw-40px)] sm:w-[380px] h-[calc(100vh-100px)] sm:h-[540px] max-h-[580px] flex flex-col rounded-2xl overflow-hidden shadow-2xl bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10"
            style={{ transformOrigin: 'bottom right' }}
          >
            <div className="px-4 py-3.5 bg-primary-600 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"><Bot className="w-5 h-5 text-white" /></div>
                <div>
                  <h3 className="font-bold text-sm text-white leading-none">Zuna AI</h3>
                  <span className="text-emerald-200 text-[11px]">Online</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={clearChat} className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10"><Trash2 className="w-4 h-4" /></button>
                <button onClick={() => setIsOpen(false)} className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10"><X className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)}
              {isLoading && <ChatTypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            <AnimatePresence>
              {showQuickReplies && messages.length <= 1 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                  className="px-4 pb-3 flex gap-2 overflow-x-auto">
                  {QUICK_REPLIES.map((reply) => (
                    <button key={reply} onClick={() => handleQuickReply(reply)}
                      className="text-[11px] px-3.5 py-1.5 rounded-full border border-primary-300 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 whitespace-nowrap flex-shrink-0">
                      {reply}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="px-4 py-3 border-t border-slate-100 dark:border-white/10 flex items-center gap-2.5">
              <textarea
                ref={inputRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="Ask about the portal..." rows={1}
                className="flex-1 bg-slate-50 dark:bg-white/5 rounded-xl px-3 py-2 text-sm outline-none resize-none"
                disabled={isLoading}
              />
              <button onClick={handleSend} disabled={!inputValue.trim() || isLoading}
                className="w-8 h-8 rounded-xl flex items-center justify-center bg-primary-600 text-white disabled:opacity-40">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}