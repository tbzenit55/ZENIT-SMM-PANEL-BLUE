import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Plus, 
  Trash2, 
  Send, 
  Users, 
  User, 
  Calendar, 
  AlertTriangle, 
  FileText, 
  Sparkles, 
  Clock, 
  Layers, 
  X, 
  CheckCircle,
  Eye
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';
import { ZenitNotification, NotificationTemplate } from '../../types';

export default function AdminNotifications() {
  const { currentUser } = useAuth();
  const { success, error: toastError } = useToast();

  const [notifications, setNotifications] = useState<ZenitNotification[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [recipientType, setRecipientType] = useState<'broadcast' | 'single' | 'multiple'>('broadcast');
  const [userIdInput, setUserIdInput] = useState('');
  const [userIdsInput, setUserIdsInput] = useState('');
  
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [notifType, setNotifType] = useState('System');
  const [severity, setSeverity] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  
  // Template handling
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({
    username: 'ZenitMember',
    amount: '10.00',
    orderId: '123456'
  });

  // Scheduling
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');

  // New Template Form modal
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [tmplTitle, setTmplTitle] = useState('');
  const [tmplMessage, setTmplMessage] = useState('');
  const [tmplType, setTmplType] = useState('System');
  const [tmplSeverity, setTmplSeverity] = useState<'info' | 'success' | 'warning' | 'error'>('info');

  const fetchLogsAndTemplates = async () => {
    try {
      setLoading(true);
      const token = await currentUser?.getIdToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        headers['x-sandbox-user'] = 'sandbox_user_123';
      }

      const [notifsRes, tmplsRes] = await Promise.all([
        fetch('/api/admin/notifications', { headers }),
        fetch('/api/admin/notifications/templates', { headers })
      ]);

      if (notifsRes.ok && tmplsRes.ok) {
        const notifsData = await notifsRes.json();
        const tmplsData = await tmplsRes.json();
        setNotifications(notifsData.notifications || []);
        setTemplates(tmplsData.templates || []);
      }
    } catch (e) {
      console.error(e);
      toastError('Error', 'Failed to retrieve logs and templates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogsAndTemplates();
  }, [currentUser]);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = await currentUser?.getIdToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        headers['x-sandbox-user'] = 'sandbox_user_123';
      }

      // Prepare target array if recipient is multiple
      let parsedUserIds: string[] = [];
      if (recipientType === 'multiple') {
        parsedUserIds = userIdsInput.split(',').map(s => s.trim()).filter(Boolean);
        if (parsedUserIds.length === 0) {
          toastError('Error', 'Please provide user IDs for multiple recipients.');
          return;
        }
      }

      const body = {
        recipientType,
        userId: recipientType === 'single' ? userIdInput.trim() : undefined,
        userIds: recipientType === 'multiple' ? parsedUserIds : undefined,
        title,
        message,
        type: notifType,
        severity,
        templateId: selectedTemplateId || undefined,
        templateVariables: selectedTemplateId ? templateVars : undefined,
        isScheduled,
        scheduledAt: isScheduled ? scheduledAt : undefined
      };

      const res = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (res.ok) {
        success('Notification Dispatched', 'Your notification has been successfully compiled and sent.');
        // Reset form
        setTitle('');
        setMessage('');
        setUserIdInput('');
        setUserIdsInput('');
        setSelectedTemplateId('');
        setIsScheduled(false);
        setScheduledAt('');
        fetchLogsAndTemplates();
      } else {
        const err = await res.json();
        toastError('Failed to dispatch alert', err.error || 'Server error');
      }
    } catch (err: any) {
      toastError('Network Error', err.message);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName || !tmplTitle || !tmplMessage) {
      toastError('Validation Alert', 'All fields are required.');
      return;
    }

    try {
      const token = await currentUser?.getIdToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        headers['x-sandbox-user'] = 'sandbox_user_123';
      }

      const res = await fetch('/api/admin/notifications/templates', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: templateName,
          titleTemplate: tmplTitle,
          messageTemplate: tmplMessage,
          type: tmplType,
          severity: tmplSeverity
        })
      });

      if (res.ok) {
        success('Template Added', 'The notification template is ready to use.');
        setIsTemplateModalOpen(false);
        setTemplateName('');
        setTmplTitle('');
        setTmplMessage('');
        fetchLogsAndTemplates();
      } else {
        const err = await res.json();
        toastError('Failed to create template', err.error);
      }
    } catch (err: any) {
      toastError('Network Error', err.message);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this notification template?')) return;
    try {
      const token = await currentUser?.getIdToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        headers['x-sandbox-user'] = 'sandbox_user_123';
      }

      const res = await fetch(`/api/admin/notifications/templates/${id}`, {
        method: 'DELETE',
        headers
      });

      if (res.ok) {
        success('Deleted', 'Notification template deleted successfully.');
        fetchLogsAndTemplates();
      }
    } catch (err: any) {
      toastError('Error', err.message);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    if (!window.confirm('Delete this dispatch history entry?')) return;
    try {
      const token = await currentUser?.getIdToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        headers['x-sandbox-user'] = 'sandbox_user_123';
      }

      const res = await fetch(`/api/admin/notifications/${id}`, {
        method: 'DELETE',
        headers
      });

      if (res.ok) {
        success('Deleted', 'Notification dispatch record removed.');
        fetchLogsAndTemplates();
      }
    } catch (err: any) {
      toastError('Error', err.message);
    }
  };

  const applyTemplatePreset = (tmplId: string) => {
    setSelectedTemplateId(tmplId);
    if (!tmplId) {
      setTitle('');
      setMessage('');
      return;
    }
    const selected = templates.find(t => t.id === tmplId);
    if (selected) {
      setTitle(selected.titleTemplate);
      setMessage(selected.messageTemplate);
      setNotifType(selected.type);
      setSeverity(selected.severity);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Overview Headings */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-900/10 pb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-gray-100">Zenit Notification Hub</h1>
          <p className="text-xs text-gray-400 mt-1">
            Dispatch announcements, system notices, and custom user alerts across the entire panel ecosystem.
          </p>
        </div>
        <button
          id="admin-create-tmpl-btn"
          onClick={() => setIsTemplateModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#05070B] text-xs font-bold transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Template
        </button>
      </div>

      {/* Grid container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column - Dispatch Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0A0E17] border border-blue-900/20 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-gray-200 mb-5 flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-400" />
              Compile & Send Notification
            </h2>

            <form onSubmit={handleSendNotification} className="space-y-5">
              {/* Recipient Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Recipient Scope</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'broadcast', label: 'Global (All Users)', icon: Users },
                    { id: 'single', label: 'Single User', icon: User },
                    { id: 'multiple', label: 'Group of Users', icon: Layers }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setRecipientType(item.id as any)}
                      className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                        recipientType === item.id 
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400' 
                          : 'border-blue-900/10 bg-blue-950/5 text-gray-400 hover:border-blue-900/30'
                      }`}
                    >
                      <item.icon className="w-4.5 h-4.5 mb-1.5" />
                      <span className="text-[11px] font-semibold">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Scope specific inputs */}
              {recipientType === 'single' && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Target User UID / Email</label>
                  <input
                    type="text"
                    required
                    value={userIdInput}
                    onChange={e => setUserIdInput(e.target.value)}
                    placeholder="e.g. usr-abc123yz or user@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-blue-900/10 bg-blue-950/5 text-xs text-gray-200 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              )}

              {recipientType === 'multiple' && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Target User UIDs (Comma separated)</label>
                  <textarea
                    required
                    rows={2}
                    value={userIdsInput}
                    onChange={e => setUserIdsInput(e.target.value)}
                    placeholder="usr-abc123yz, usr-987xyz, usr-foo456"
                    className="w-full px-4 py-3 rounded-xl border border-blue-900/10 bg-blue-950/5 text-xs text-gray-200 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                  />
                </div>
              )}

              {/* Template Preset Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Apply Template Preset (Optional)</label>
                <select
                  value={selectedTemplateId}
                  onChange={e => applyTemplatePreset(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-blue-900/10 bg-blue-950/5 text-xs text-gray-300 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">Custom Alert (No template)</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.type})</option>
                  ))}
                </select>
              </div>

              {/* Template variable mapping */}
              {selectedTemplateId && (
                <div className="p-4 rounded-xl border border-blue-900/20 bg-blue-950/5 space-y-3.5 animate-fade-in">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    Template Variables Integration
                  </div>
                  <div className="grid grid-cols-3 gap-3.5">
                    {Object.keys(templateVars).map((key) => (
                      <div key={key}>
                        <label className="block text-[10px] text-gray-500 uppercase font-mono tracking-wider mb-1">{key}</label>
                        <input
                          type="text"
                          value={templateVars[key]}
                          onChange={e => setTemplateVars(p => ({ ...p, [key]: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-blue-900/10 bg-[#05070B] text-xs text-gray-300 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom / Form fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Notification Category</label>
                  <select
                    value={notifType}
                    onChange={e => setNotifType(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-blue-900/10 bg-blue-950/5 text-xs text-gray-300 focus:outline-none cursor-pointer"
                  >
                    {['System', 'Order', 'Wallet', 'Payment', 'Deposit', 'Refund', 'Provider', 'Security', 'Admin', 'Promotion'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Severity Level</label>
                  <select
                    value={severity}
                    onChange={e => setSeverity(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-xl border border-blue-900/10 bg-blue-950/5 text-xs text-gray-300 focus:outline-none cursor-pointer"
                  >
                    <option value="info">Info (Blue)</option>
                    <option value="success">Success (Green)</option>
                    <option value="warning">Warning (Amber)</option>
                    <option value="error">Critical Error (Red)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Delivery Time</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsScheduled(false)}
                      className={`flex-1 py-3 rounded-xl text-xs font-semibold border ${
                        !isScheduled 
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400' 
                          : 'border-blue-900/10 bg-blue-950/5 text-gray-400'
                      }`}
                    >
                      Instant
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsScheduled(true)}
                      className={`flex-1 py-3 rounded-xl text-xs font-semibold border ${
                        isScheduled 
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400' 
                          : 'border-blue-900/10 bg-blue-950/5 text-gray-400'
                      }`}
                    >
                      Schedule
                    </button>
                  </div>
                </div>
              </div>

              {isScheduled && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Scheduled Launch Timestamp</label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      required
                      value={scheduledAt}
                      onChange={e => setScheduledAt(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-blue-900/10 bg-blue-950/5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                    />
                    <Clock className="absolute right-4 top-3.5 w-4 h-4 text-gray-500 pointer-events-none" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Notification Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Scheduled Service Outage"
                  className="w-full px-4 py-3 rounded-xl border border-blue-900/10 bg-blue-950/5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Notification Content Message</label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Insert complete markdown or detailed alerts..."
                  className="w-full px-4 py-3 rounded-xl border border-blue-900/10 bg-blue-950/5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  id="notif-dispatch-btn"
                  type="submit"
                  className="flex items-center gap-1.5 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-all shadow-[0_0_15px_rgba(37,99,235,0.25)] cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  Dispatch Announcement
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column - Templates List */}
        <div className="space-y-6">
          <div className="bg-[#0A0E17] border border-blue-900/20 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-gray-200 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-500" />
              Active Templates
            </h2>

            <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
              {templates.length === 0 ? (
                <div className="py-12 text-center text-gray-500 text-xs">
                  No preset templates configured.
                </div>
              ) : (
                templates.map(t => (
                  <div key={t.id} className="p-3.5 rounded-xl border border-blue-900/10 bg-blue-950/5 relative group">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-gray-200">{t.name}</span>
                      <button
                        onClick={() => handleDeleteTemplate(t.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-950/30 text-rose-400 transition-all cursor-pointer"
                        title="Delete Template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex gap-2 mt-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-[9px] text-blue-400 font-semibold uppercase">
                        {t.type}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[9px] text-amber-400 font-semibold uppercase">
                        {t.severity}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 line-clamp-2 italic font-mono border-l-2 border-blue-500/20 pl-2">
                      {t.messageTemplate}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Dispatch History Logs */}
      <div className="bg-[#0A0E17] border border-blue-900/20 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-gray-200 mb-5 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400" />
          Hub Dispatch & Broadcast Logs
        </h2>

        {loading ? (
          <div className="py-12 flex justify-center">
            <Clock className="w-6 h-6 text-blue-400 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-xs">
            No previous broadcast log records located.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-blue-900/10 text-gray-500 font-mono tracking-wider uppercase text-[10px]">
                  <th className="pb-3 font-semibold">Title</th>
                  <th className="pb-3 font-semibold">Category</th>
                  <th className="pb-3 font-semibold">Audience Scope</th>
                  <th className="pb-3 font-semibold">Severity</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Timestamp</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-900/5 text-gray-300">
                {notifications.slice(0, 30).map(n => (
                  <tr key={n.id} className="hover:bg-blue-950/5">
                    <td className="py-3.5 pr-4 max-w-xs truncate">
                      <p className="font-semibold text-gray-200">{n.title}</p>
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">{n.message}</p>
                    </td>
                    <td className="py-3.5">
                      <span className="font-mono text-[10px] text-blue-400 uppercase font-semibold">{n.type}</span>
                    </td>
                    <td className="py-3.5">
                      {n.isBroadcast ? (
                        <span className="text-[11px] text-amber-400 font-semibold">Broadcast (Global)</span>
                      ) : (
                        <span className="text-[11px] text-gray-400 font-mono">{n.userId}</span>
                      )}
                    </td>
                    <td className="py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        n.severity === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' :
                        n.severity === 'warning' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' :
                        n.severity === 'error' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' :
                        'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                      }`}>
                        {n.severity}
                      </span>
                    </td>
                    <td className="py-3.5">
                      {n.isScheduled ? (
                        <span className="flex items-center gap-1 text-amber-400">
                          <Clock className="w-3.5 h-3.5" />
                          Pending ({new Date(n.scheduledAt!).toLocaleString()})
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Dispatched
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 text-gray-500 font-mono text-[10px]">
                      {new Date(n.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => handleDeleteNotification(n.id)}
                        className="p-1 rounded text-gray-500 hover:text-rose-400 hover:bg-rose-950/20 transition-all cursor-pointer"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Template Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg bg-[#0A0D14] border border-blue-900/20 rounded-2xl shadow-2xl overflow-hidden">
            <form onSubmit={handleCreateTemplate}>
              <div className="p-5 border-b border-blue-900/10 flex items-center justify-between">
                <span className="font-semibold text-base text-gray-200">New Alert Template</span>
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Template Name</label>
                  <input
                    type="text"
                    required
                    value={templateName}
                    onChange={e => setTemplateName(e.target.value)}
                    placeholder="e.g. Deposit Confirmation Alert"
                    className="w-full px-4 py-3 rounded-xl border border-blue-900/10 bg-blue-950/5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">Default Category</label>
                    <select
                      value={tmplType}
                      onChange={e => setTmplType(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-blue-900/10 bg-blue-950/5 text-xs text-gray-300 focus:outline-none cursor-pointer"
                    >
                      {['System', 'Order', 'Wallet', 'Payment', 'Deposit', 'Refund', 'Provider', 'Security', 'Admin', 'Promotion'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5">Default Severity</label>
                    <select
                      value={tmplSeverity}
                      onChange={e => setTmplSeverity(e.target.value as any)}
                      className="w-full px-4 py-3 rounded-xl border border-blue-900/10 bg-blue-950/5 text-xs text-gray-300 focus:outline-none cursor-pointer"
                    >
                      <option value="info">Info</option>
                      <option value="success">Success</option>
                      <option value="warning">Warning</option>
                      <option value="error">Error</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                    Title Template <span className="text-gray-500">(Supports variables like {"{username}"})</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={tmplTitle}
                    onChange={e => setTmplTitle(e.target.value)}
                    placeholder="e.g. Hello {username}, Wallet Updated"
                    className="w-full px-4 py-3 rounded-xl border border-blue-900/10 bg-blue-950/5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                    Message Template <span className="text-gray-500">(Supports variables like {"{amount}"})</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={tmplMessage}
                    onChange={e => setTmplMessage(e.target.value)}
                    placeholder="e.g. Your deposit of ${amount} has been approved."
                    className="w-full px-4 py-3 rounded-xl border border-blue-900/10 bg-blue-950/5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="p-4 bg-[#070A11] border-t border-blue-900/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="notif-save-tmpl-btn"
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs text-white font-semibold transition-all cursor-pointer"
                >
                  Save Preset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
