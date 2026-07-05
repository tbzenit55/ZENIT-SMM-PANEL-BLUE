import * as React from 'react';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { Loader } from '../components/Loader';
import api from '../lib/api';
import { Ticket } from '../types';
import { HelpCircle, ChevronDown, ChevronUp, Send, MessageSquarePlus, User, ShieldAlert } from 'lucide-react';

export function Tickets() {
  const { userProfile } = useAuth();
  const { success, error } = useToast();
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [replySubmitting, setReplySubmitting] = useState(false);

  // Form states
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');

  const loadTickets = async () => {
    try {
      const res = await api.get<{ tickets: Ticket[] }>('/tickets');
      setTickets(res.data.tickets);
    } catch (err) {
      console.error('Failed to load tickets', err);
    }
  };

  useEffect(() => {
    async function init() {
      await loadTickets();
      setLoading(false);
    }
    init();
  }, []);

  const handleOpenTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) {
      error('Fields Required', 'Please enter a ticket subject and message.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/tickets', { subject, message });
      success('Ticket Opened', 'A support specialist has been queued to respond.');
      setSubject('');
      setMessage('');
      await loadTickets();
    } catch (err: any) {
      error('Failed to Open Ticket', err.response?.data?.error || 'Could not complete support request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (ticketId: string) => {
    if (!replyMessage) return;
    setReplySubmitting(true);
    try {
      await api.post(`/tickets/${ticketId}/replies`, { message: replyMessage });
      success('Reply Sent', 'Your message has been appended successfully.');
      setReplyMessage('');
      await loadTickets();
    } catch (err: any) {
      error('Could not reply', err.response?.data?.error || 'A network error occurred.');
    } finally {
      setReplySubmitting(false);
    }
  };

  if (loading) return <Loader />;

  const statusColors = {
    pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    answered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    closed: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 font-sans">
      {/* Create support request */}
      <div className="bg-[#0A0D15] border border-blue-900/10 rounded-2xl p-8 h-fit">
        <h3 className="text-xl font-display font-bold text-white mb-6 flex items-center gap-2">
          <MessageSquarePlus className="w-5 h-5 text-blue-400" />
          Open Support Ticket
        </h3>

        <form onSubmit={handleOpenTicket} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Subject Header</label>
            <input
              id="ticket-subject"
              type="text"
              placeholder="e.g. Balance issue, Order issue"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-3 bg-[#06080E] border border-blue-900/15 rounded-xl text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Details / Inquiry</label>
            <textarea
              id="ticket-message"
              rows={4}
              placeholder="Describe your issue with order numbers if applicable..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-3 bg-[#06080E] border border-blue-900/15 rounded-xl text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition-colors resize-none"
            />
          </div>

          <button
            id="ticket-submit-btn"
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-semibold rounded-xl tracking-wide shadow-lg cursor-pointer transition-colors"
          >
            {submitting ? 'Opening Ticket...' : 'Submit Support Request'}
          </button>
        </form>
      </div>

      {/* Ticket Logs List */}
      <div className="lg:col-span-2 bg-[#0A0D15] border border-blue-900/10 rounded-2xl p-8">
        <h3 className="text-xl font-display font-bold text-white mb-6 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-blue-400" />
          Inquiry Log & Replies
        </h3>

        {tickets.length === 0 ? (
          <div className="text-center py-12">
            <HelpCircle className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No support tickets submitted yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((t) => {
              const isExpanded = expandedTicketId === t.id;
              return (
                <div key={t.id} className="border border-blue-900/15 rounded-xl overflow-hidden bg-[#06080E]/60">
                  {/* Ticket Header Toggle */}
                  <button
                    id={`ticket-header-${t.id}`}
                    onClick={() => setExpandedTicketId(isExpanded ? null : t.id)}
                    className="w-full p-5 flex items-center justify-between text-left hover:bg-blue-950/5 transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-gray-500 font-semibold">{t.id}</span>
                        <span className={`px-2 py-0.5 border rounded-full text-[10px] font-bold capitalize ${statusColors[t.status]}`}>
                          {t.status}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-200 text-sm mt-1">{t.subject}</h4>
                    </div>
                    <div className="text-gray-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {/* Expanded Replies & Message */}
                  {isExpanded && (
                    <div className="p-5 border-t border-blue-900/10 space-y-4 bg-[#05070B]/50">
                      {/* Initial message */}
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-950 flex items-center justify-center text-blue-400 border border-blue-900/30 text-xs font-semibold flex-shrink-0">
                          U
                        </div>
                        <div className="flex-1 bg-[#06080E] border border-blue-900/10 p-3 rounded-xl">
                          <p className="text-xs text-gray-500 font-semibold mb-1">Inquirer Message</p>
                          <p className="text-sm text-gray-300 leading-relaxed">{t.message}</p>
                          <span className="block text-[9px] text-gray-600 font-mono mt-2">{new Date(t.createdAt).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Replies List */}
                      {t.replies.map((r) => (
                        <div key={r.id} className="flex gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border text-xs font-semibold flex-shrink-0
                            ${r.userRole === 'admin' 
                              ? 'bg-amber-950/20 text-amber-400 border-amber-950' 
                              : 'bg-blue-950 text-blue-400 border-blue-900/30'
                            }
                          `}>
                            {r.userRole === 'admin' ? 'A' : 'U'}
                          </div>
                          <div className={`flex-1 border p-3 rounded-xl
                            ${r.userRole === 'admin'
                              ? 'bg-amber-950/5 border-amber-950/30'
                              : 'bg-[#06080E] border-blue-900/10'
                            }
                          `}>
                            <p className="text-xs font-semibold mb-1 flex items-center gap-1.5">
                              <span className={r.userRole === 'admin' ? 'text-amber-400' : 'text-gray-400'}>{r.userName}</span>
                              {r.userRole === 'admin' && (
                                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold uppercase tracking-wider">
                                  <ShieldAlert className="w-2 h-2" /> Staff
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-gray-300 leading-relaxed">{r.message}</p>
                            <span className="block text-[9px] text-gray-600 font-mono mt-2">{new Date(r.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}

                      {/* Post Reply Area */}
                      {t.status !== 'closed' && (
                        <div className="flex gap-2 pt-2 border-t border-blue-900/10">
                          <input
                            id={`ticket-reply-input-${t.id}`}
                            type="text"
                            placeholder="Type support reply message..."
                            value={replyMessage}
                            onChange={(e) => setReplyMessage(e.target.value)}
                            className="flex-1 px-4 py-2 bg-[#06080E] border border-blue-900/15 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-blue-500 transition-colors"
                          />
                          <button
                            id={`ticket-reply-send-${t.id}`}
                            onClick={() => handleSendReply(t.id)}
                            disabled={replySubmitting}
                            className="p-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-white transition-colors cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Tickets;
