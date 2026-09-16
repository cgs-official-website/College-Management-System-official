import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  LuX, 
  LuLifeBuoy, 
  LuSend, 
  LuCircleAlert, 
  LuCircleCheck, 
  LuMessageSquare, 
  LuClock, 
  LuPlus, 
  LuChevronRight, 
  LuArrowLeft,
  LuLoader 
} from "react-icons/lu";
import api from '../../services/api';

export default function RaiseTicketModal({ isOpen, onClose, collegeName = 'College Administrator', collegeEmail = '' }) {
  const [activeTab, setActiveTab] = useState('raise');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [fetchingTickets, setFetchingTickets] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [myTickets, setMyTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const fetchTickets = async () => {
    setFetchingTickets(true);
    try {
      const res = await api.get('/tickets');
      const list = res.data?.data || res.data || [];
      setMyTickets(list);
      
      if (selectedTicket) {
        const updated = list.find(x => x.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    } catch (err) {
      console.warn('Failed to load tickets from server, checking local fallback:', err);
      try {
        const saved = localStorage.getItem('zuna_tickets');
        if (saved) setMyTickets(JSON.parse(saved));
      } catch (_e) {
        setMyTickets([]);
      }
    } finally {
      setFetchingTickets(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchTickets();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await api.post('/tickets', {
        subject: subject.trim(),
        description: description.trim(),
        priority
      });

      const newTicket = res.data?.data || {
        id: `TK-${Date.now()}`,
        subject: subject.trim(),
        description: description.trim(),
        priority,
        status: 'open',
        createdAt: new Date().toISOString()
      };

      setMyTickets(prev => [newTicket, ...prev]);

      try {
        const current = JSON.parse(localStorage.getItem('zuna_tickets') || '[]');
        localStorage.setItem('zuna_tickets', JSON.stringify([newTicket, ...current]));
      } catch (_e) {}

      setSuccessMsg('✓ Ticket submitted! Zuna SuperAdmin will reply shortly.');
      setSubject('');
      setDescription('');
      setTimeout(() => {
        setSuccessMsg('');
        setActiveTab('history');
      }, 1200);
    } catch (err) {
      console.error('Failed to submit ticket:', err);
      setErrorMsg(err.response?.data?.error?.message || 'Failed to submit ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;
    setSendingReply(true);

    const clientReply = {
      sender: 'Client',
      author: collegeName,
      text: replyText.trim(),
      timestamp: new Date().toISOString()
    };

    try {
      const res = await api.post(`/tickets/${selectedTicket.id}/reply`, {
        text: replyText.trim()
      });

      const replyObj = res.data?.data?.reply || clientReply;
      const updatedMessages = [...(selectedTicket.messages || []), replyObj];
      const updatedTicket = { ...selectedTicket, messages: updatedMessages };

      setSelectedTicket(updatedTicket);
      setMyTickets(prev => prev.map(t => t.id === selectedTicket.id ? updatedTicket : t));
      setReplyText('');
    } catch (err) {
      console.warn('Reply write error, applying optimistic message:', err);
      const updatedTicket = {
        ...selectedTicket,
        messages: [...(selectedTicket.messages || []), clientReply]
      };
      setSelectedTicket(updatedTicket);
      setMyTickets(prev => prev.map(t => t.id === selectedTicket.id ? updatedTicket : t));
      setReplyText('');
    } finally {
      setSendingReply(false);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'resolved': return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-xs font-bold flex items-center gap-1"><LuCircleCheck size={12}/> Resolved</span>;
      case 'in-progress': return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md text-xs font-bold flex items-center gap-1"><LuClock size={12}/> In Progress</span>;
      default: return <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-md text-xs font-bold flex items-center gap-1"><LuMessageSquare size={12}/> Open</span>;
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <LuLifeBuoy size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Zuna Central Support</h3>
              <p className="text-xs text-slate-500 font-medium">Direct support desk for College Administrators</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors">
            <LuX size={18} />
          </button>
        </div>

        <div className="flex border-b border-slate-100 bg-slate-50 px-5 gap-2">
          <button
            onClick={() => { setActiveTab('raise'); setSelectedTicket(null); }}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'raise' ? 'border-amber-600 text-amber-600 bg-white rounded-t-xl' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <LuPlus size={15} /> Raise New Ticket
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'history' ? 'border-amber-600 text-amber-600 bg-white rounded-t-xl' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <LuMessageSquare size={15} /> My Tickets ({myTickets.length})
          </button>
        </div>

        {activeTab === 'raise' && (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
            {successMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-bold flex items-center gap-2">
                <LuCircleCheck size={16} /> {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold flex items-center gap-2">
                <LuCircleAlert size={16} /> {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Issue Subject</label>
              <input 
                type="text" required
                className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none text-slate-900 font-medium"
                placeholder="e.g. Admission Portal Fee Sync Issue"
                value={subject} onChange={e => setSubject(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Priority</label>
                <select className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl font-semibold" value={priority} onChange={e => setPriority(e.target.value)}>
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">⚡ Urgent Priority</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Product</label>
                <input type="text" disabled value="College Management" className="w-full px-4 py-3 text-sm bg-slate-100 border border-slate-200 rounded-2xl text-slate-500 font-bold"/>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Detailed Description</label>
              <textarea required rows={4} className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-medium resize-none" placeholder="Describe the issue..." value={description} onChange={e => setDescription(e.target.value)}/>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-2xl">Cancel</button>
              <button type="submit" disabled={loading} className="px-6 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-2xl shadow-lg shadow-amber-500/25 flex items-center gap-2">
                <LuSend size={14} /> {loading ? 'Submitting...' : 'Submit to Zuna Admin'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'history' && !selectedTicket && (
          <div className="p-5 flex-1 overflow-y-auto space-y-3">
            {fetchingTickets ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
                <LuLoader className="animate-spin text-amber-600" size={24} />
                <span className="text-xs font-semibold">Loading support tickets...</span>
              </div>
            ) : myTickets.map(t => (
              <div key={t.id} onClick={() => setSelectedTicket(t)} className="p-4 rounded-2xl border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer bg-white flex items-center justify-between gap-3 group">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-extrabold text-amber-600">#{t.id.substring(0, 8)}</span>
                    {getStatusBadge(t.status)}
                    <span className="text-xs text-slate-400 font-medium ml-auto">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'Recently'}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">{t.subject}</h4>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{t.description}</p>
                </div>
                <LuChevronRight className="text-slate-300 group-hover:text-amber-600 shrink-0" size={18}/>
              </div>
            ))}
            {!fetchingTickets && myTickets.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-sm font-semibold">No support tickets found.</div>
            )}
          </div>
        )}

        {activeTab === 'history' && selectedTicket && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <button onClick={() => setSelectedTicket(null)} className="text-xs font-bold text-amber-600 flex items-center gap-1"><LuArrowLeft size={14}/> Back to My Tickets</button>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-slate-400">#{selectedTicket.id.substring(0, 8)}</span>
                {getStatusBadge(selectedTicket.status)}
              </div>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-3 bg-slate-50/40">
              <div className="p-3.5 bg-slate-100 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-500 block mb-1">Subject: {selectedTicket.subject}</span>
                <p className="text-xs text-slate-800 font-medium whitespace-pre-wrap">{selectedTicket.description}</p>
              </div>

              {(selectedTicket.messages || []).map((msg, i) => {
                const isSuperAdmin = msg.sender === 'Agent' || msg.sender === 'SuperAdmin' || msg.role === 'superadmin';
                return (
                  <div key={i} className={`flex flex-col ${isSuperAdmin ? 'items-start' : 'items-end'}`}>
                    <div className={`max-w-[85%] p-3.5 rounded-2xl text-xs font-medium ${isSuperAdmin ? 'bg-amber-600 text-white rounded-tl-none shadow-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tr-none shadow-sm'}`}>
                      <div className="flex items-center justify-between gap-3 text-[10px] opacity-75 mb-1 font-bold">
                        <span>{isSuperAdmin ? '⚡ Zuna SuperAdmin Support' : msg.author || 'College Admin'}</span>
                        <span>{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}</span>
                      </div>
                      <p className="leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSendReply} className="p-3 border-t border-slate-100 bg-white flex gap-2">
              <input type="text" placeholder="Write reply..." value={replyText} onChange={e => setReplyText(e.target.value)} className="flex-1 px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-slate-900 font-medium" required/>
              <button type="submit" disabled={sendingReply} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center gap-1">
                <LuSend size={12}/> {sendingReply ? 'Sending...' : 'Reply'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
