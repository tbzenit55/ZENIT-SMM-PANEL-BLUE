import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader } from '../../components/Loader';
import { useToast } from '../../components/Toast';
import api from '../../lib/api';
import { SystemLog, AuditLog, SecurityLog } from '../../types';
import { 
  History, 
  Search, 
  LogIn, 
  Terminal, 
  AlertOctagon, 
  ShieldAlert, 
  RefreshCw,
  Clock,
  User,
  Monitor,
  Shield,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  Globe
} from 'lucide-react';

export function LogsPage() {
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState<'system' | 'audit' | 'security'>('system');
  
  // States for each type of log
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Specific filters
  const [systemFilter, setSystemFilter] = useState<'all' | 'login' | 'activity' | 'error' | 'admin'>('all');
  const [auditFilter, setAuditFilter] = useState<string>('all');
  const [securityFilter, setSecurityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');

  const loadAllLogs = async () => {
    try {
      const [sysRes, auditRes, secRes] = await Promise.all([
        api.get<{ logs: SystemLog[] }>('/logs'),
        api.get<{ success: boolean; logs: AuditLog[] }>('/admin/audit-logs'),
        api.get<{ success: boolean; logs: SecurityLog[] }>('/admin/security-logs')
      ]);
      
      setSystemLogs(sysRes.data.logs || []);
      setAuditLogs(auditRes.data.logs || []);
      setSecurityLogs(secRes.data.logs || []);
    } catch (err) {
      console.error('Failed to retrieve logs:', err);
      error('Audit Error', 'Could not load platform event log streams.');
    }
  };

  useEffect(() => {
    async function init() {
      await loadAllLogs();
      setLoading(false);
    }
    init();
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    await loadAllLogs();
    setLoading(false);
    success('Telemetry Synced', 'Platform security, audit, and system event streams fully synchronized.');
  };

  const getSystemLogIcon = (type: SystemLog['type']) => {
    switch (type) {
      case 'login': return <LogIn className="w-4 h-4 text-emerald-400" />;
      case 'error': return <AlertOctagon className="w-4 h-4 text-rose-400" />;
      case 'admin': return <ShieldAlert className="w-4 h-4 text-amber-400" />;
      default: return <Terminal className="w-4 h-4 text-blue-400" />;
    }
  };

  const getSecuritySeverityBadge = (severity: SecurityLog['severity']) => {
    switch (severity) {
      case 'critical':
        return <span className="px-2 py-0.5 bg-red-950 text-red-400 border border-red-500/30 text-[10px] font-bold rounded-md uppercase tracking-wider animate-pulse">Critical</span>;
      case 'high':
        return <span className="px-2 py-0.5 bg-orange-950 text-orange-400 border border-orange-500/30 text-[10px] font-bold rounded-md uppercase tracking-wider">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 bg-yellow-950 text-yellow-400 border border-yellow-500/20 text-[10px] font-bold rounded-md uppercase tracking-wider">Medium</span>;
      default:
        return <span className="px-2 py-0.5 bg-blue-950 text-blue-400 border border-blue-500/20 text-[10px] font-bold rounded-md uppercase tracking-wider">Low</span>;
    }
  };

  // Filter systems logs
  const getFilteredSystemLogs = () => {
    return systemLogs.filter(log => {
      const matchesSearch = 
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.ipAddress?.includes(searchTerm);
      const matchesFilter = systemFilter === 'all' || log.type === systemFilter;
      return matchesSearch && matchesFilter;
    });
  };

  // Filter audit logs
  const getFilteredAuditLogs = () => {
    return auditLogs.filter(log => {
      const matchesSearch = 
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.ipAddress?.includes(searchTerm);
      const matchesFilter = auditFilter === 'all' || log.category === auditFilter;
      return matchesSearch && matchesFilter;
    });
  };

  // Filter security logs
  const getFilteredSecurityLogs = () => {
    return securityLogs.filter(log => {
      const matchesSearch = 
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.ipAddress?.includes(searchTerm);
      const matchesFilter = securityFilter === 'all' || log.severity === securityFilter;
      return matchesSearch && matchesFilter;
    });
  };

  if (loading) return <Loader />;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 text-white"
    >
      {/* Header and Sync controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-blue-500" />
            Platform Telemetry & Audit Logs
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Comprehensive audit logs, administrative operation histories, and security logs with network fingerprints.
          </p>
        </div>
        
        <button
          id="refresh-logs-btn"
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/20 text-xs font-semibold cursor-pointer transition-all self-stretch sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Synchronize Streams
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-blue-950/40 gap-4">
        <button
          id="tab-btn-system"
          onClick={() => { setActiveTab('system'); setSearchTerm(''); }}
          className={`pb-3 text-sm font-semibold relative cursor-pointer transition-colors ${
            activeTab === 'system' ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            System Events ({systemLogs.length})
          </div>
          {activeTab === 'system' && (
            <motion.div layoutId="activeLogTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
          )}
        </button>

        <button
          id="tab-btn-audit"
          onClick={() => { setActiveTab('audit'); setSearchTerm(''); }}
          className={`pb-3 text-sm font-semibold relative cursor-pointer transition-colors ${
            activeTab === 'audit' ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Audit Trails ({auditLogs.length})
          </div>
          {activeTab === 'audit' && (
            <motion.div layoutId="activeLogTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
          )}
        </button>

        <button
          id="tab-btn-security"
          onClick={() => { setActiveTab('security'); setSearchTerm(''); }}
          className={`pb-3 text-sm font-semibold relative cursor-pointer transition-colors ${
            activeTab === 'security' ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            Security Logs ({securityLogs.length})
          </div>
          {activeTab === 'security' && (
            <motion.div layoutId="activeLogTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
          )}
        </button>
      </div>

      {/* Query Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Search */}
        <div className="lg:col-span-4 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-500" />
          </div>
          <input
            id="logs-search-input"
            type="text"
            placeholder={
              activeTab === 'system' 
                ? "Search system events, email, IP..." 
                : activeTab === 'audit' 
                  ? "Search actions, category, accounts..." 
                  : "Search incidents, severity, IP..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0A0D14] border border-blue-900/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        {/* Dynamic Context Filters */}
        <div className="lg:col-span-8 flex flex-wrap gap-2">
          {activeTab === 'system' && (
            (['all', 'login', 'activity', 'admin', 'error'] as const).map((filter) => (
              <button
                id={`logs-filter-${filter}`}
                key={filter}
                onClick={() => setSystemFilter(filter)}
                className={`
                  px-4 py-2.5 rounded-xl text-[10px] font-mono uppercase tracking-wider border cursor-pointer transition-all
                  ${systemFilter === filter 
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                    : 'bg-[#0A0D14] border-blue-900/10 text-gray-400 hover:text-gray-200'
                  }
                `}
              >
                {filter}
              </button>
            ))
          )}

          {activeTab === 'audit' && (
            (['all', 'user', 'admin', 'provider', 'service', 'order', 'settings', 'wallet', 'system'] as const).map((cat) => (
              <button
                id={`audit-cat-${cat}`}
                key={cat}
                onClick={() => setAuditFilter(cat)}
                className={`
                  px-4 py-2.5 rounded-xl text-[10px] font-mono uppercase tracking-wider border cursor-pointer transition-all
                  ${auditFilter === cat 
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                    : 'bg-[#0A0D14] border-blue-900/10 text-gray-400 hover:text-gray-200'
                  }
                `}
              >
                {cat}
              </button>
            ))
          )}

          {activeTab === 'security' && (
            (['all', 'low', 'medium', 'high', 'critical'] as const).map((sev) => (
              <button
                id={`security-sev-${sev}`}
                key={sev}
                onClick={() => setSecurityFilter(sev)}
                className={`
                  px-4 py-2.5 rounded-xl text-[10px] font-mono uppercase tracking-wider border cursor-pointer transition-all
                  ${securityFilter === sev 
                    ? 'bg-rose-600/20 border-rose-500 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.1)]' 
                    : 'bg-[#0A0D14] border-blue-900/10 text-gray-400 hover:text-gray-200'
                  }
                `}
              >
                {sev}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Log Feed Table */}
      <div className="bg-[#0A0D14] border border-blue-900/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === 'system' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-blue-900/10 text-[10px] font-mono text-gray-500 uppercase font-bold tracking-wider bg-[#0F131D]/40">
                  <th className="p-4 w-12 text-center">Type</th>
                  <th className="p-4">Action Summary</th>
                  <th className="p-4">Account Origin</th>
                  <th className="p-4">Network Node (IP / UA)</th>
                  <th className="p-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-900/5 text-xs font-mono">
                {getFilteredSystemLogs().length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500 font-sans">
                      No system events match your criteria.
                    </td>
                  </tr>
                ) : (
                  getFilteredSystemLogs().map((log) => (
                    <tr key={log.id} className="hover:bg-[#070A11]/30 transition-colors">
                      <td className="p-4 text-center">
                        <div className="inline-flex p-1.5 rounded-lg bg-[#05070B] border border-blue-900/10">
                          {getSystemLogIcon(log.type)}
                        </div>
                      </td>
                      <td className="p-4 text-gray-200 max-w-sm font-sans font-medium">
                        {log.action}
                      </td>
                      <td className="p-4">
                        {log.userEmail ? (
                          <div className="space-y-0.5">
                            <span className="text-gray-300 block text-[11px] font-bold">{log.userEmail}</span>
                            <span className="text-gray-500 block text-[9px] truncate max-w-[120px]">{log.userId}</span>
                          </div>
                        ) : (
                          <span className="text-gray-500">System Core</span>
                        )}
                      </td>
                      <td className="p-4 text-gray-400 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-gray-600" />
                          <span>IP: {log.ipAddress || '127.0.0.1'}</span>
                        </div>
                        {log.userAgent && (
                          <div className="flex items-center gap-1.5 mt-0.5 text-gray-600 text-[9px] truncate max-w-[160px]">
                            <Monitor className="w-3 h-3 text-gray-700" />
                            <span>{log.userAgent}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right text-gray-500 text-[10px]">
                        <div className="flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3 text-gray-700" />
                          <span>{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'audit' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-blue-900/10 text-[10px] font-mono text-gray-500 uppercase font-bold tracking-wider bg-[#0F131D]/40">
                  <th className="p-4 w-28">Category</th>
                  <th className="p-4">Action Taken</th>
                  <th className="p-4">Operator</th>
                  <th className="p-4">Agent details</th>
                  <th className="p-4 text-right">Date/Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-900/5 text-xs font-mono">
                {getFilteredAuditLogs().length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500 font-sans">
                      No audit trails logged matching criteria.
                    </td>
                  </tr>
                ) : (
                  getFilteredAuditLogs().map((log) => (
                    <tr key={log.id} className="hover:bg-[#070A11]/30 transition-colors">
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-blue-950/60 text-blue-400 border border-blue-900/40 text-[10px] font-bold uppercase tracking-wider">
                          {log.category}
                        </span>
                      </td>
                      <td className="p-4 text-gray-200 max-w-sm font-sans font-medium">
                        {log.action}
                      </td>
                      <td className="p-4">
                        {log.userEmail ? (
                          <div className="space-y-0.5">
                            <span className="text-gray-300 block text-[11px] font-bold">{log.userEmail}</span>
                            <span className="text-gray-500 block text-[9px] truncate max-w-[120px]">{log.userId}</span>
                          </div>
                        ) : (
                          <span className="text-gray-500">System Hook</span>
                        )}
                      </td>
                      <td className="p-4 text-gray-400 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Globe className="w-3 h-3 text-gray-600" />
                          <span>IP: {log.ipAddress || '127.0.0.1'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-gray-500 text-[9px]">
                          <span>Dev: {log.device || 'Desktop'} ({log.browser || 'Chrome'})</span>
                        </div>
                      </td>
                      <td className="p-4 text-right text-gray-500 text-[10px]">
                        <div className="flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3 text-gray-700" />
                          <span>{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'security' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-blue-900/10 text-[10px] font-mono text-gray-500 uppercase font-bold tracking-wider bg-[#0F131D]/40">
                  <th className="p-4 w-28">Severity</th>
                  <th className="p-4">Security Action</th>
                  <th className="p-4">Impacted Identity</th>
                  <th className="p-4">Device Fingerprint</th>
                  <th className="p-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-900/5 text-xs font-mono">
                {getFilteredSecurityLogs().length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-500 font-sans">
                      No security incidents reported.
                    </td>
                  </tr>
                ) : (
                  getFilteredSecurityLogs().map((log) => (
                    <tr key={log.id} className="hover:bg-[#070A11]/30 transition-colors">
                      <td className="p-4">
                        {getSecuritySeverityBadge(log.severity)}
                      </td>
                      <td className="p-4 text-gray-200 max-w-sm font-sans font-medium">
                        {log.action}
                      </td>
                      <td className="p-4">
                        {log.userEmail ? (
                          <div className="space-y-0.5">
                            <span className="text-gray-300 block text-[11px] font-bold">{log.userEmail}</span>
                            <span className="text-gray-500 block text-[9px] truncate max-w-[120px]">{log.userId}</span>
                          </div>
                        ) : (
                          <span className="text-gray-500">Global Shell</span>
                        )}
                      </td>
                      <td className="p-4 text-gray-400 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Globe className="w-3 h-3 text-gray-600" />
                          <span>IP: {log.ipAddress || '127.0.0.1'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-gray-500 text-[9px]">
                          <span>Device: {log.device || 'Desktop'} ({log.browser || 'Chrome'})</span>
                        </div>
                      </td>
                      <td className="p-4 text-right text-gray-500 text-[10px]">
                        <div className="flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3 text-gray-700" />
                          <span>{new Date(log.createdAt).toLocaleString()}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default LogsPage;
