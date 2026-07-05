import { useState, useEffect } from 'react';
import { 
  FileText, 
  Calendar, 
  Filter, 
  Download, 
  Printer, 
  ChevronDown, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Activity, 
  ShoppingCart, 
  RefreshCw,
  Search,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Toast';

type ReportType = 'orders' | 'revenue' | 'users' | 'wallet' | 'payments' | 'providers' | 'services';

export default function AdminReports() {
  const { currentUser } = useAuth();
  const { success, error: toastError } = useToast();

  const [reportType, setReportType] = useState<ReportType>('orders');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [summaryStats, setSummaryStats] = useState<any>({
    totalCount: 0,
    totalVolume: 0,
    averageValue: 0,
    successRate: 100
  });

  // Load report data
  const generateReport = async () => {
    try {
      setLoading(true);
      const token = await currentUser?.getIdToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Fetch the full analytics payload
      const res = await fetch('/api/admin/analytics', { headers });
      if (res.ok) {
        const payload = await res.json();
        const rawAnalytics = payload.analytics;

        // Based on chosen reportType, extract the raw collections
        let rawList: any[] = [];
        let volField = 'charge';
        let statusField = 'status';

        switch (reportType) {
          case 'orders':
            rawList = rawAnalytics.recentOrders || [];
            volField = 'charge';
            statusField = 'status';
            break;
          case 'revenue':
            rawList = rawAnalytics.recentOrders || [];
            volField = 'charge';
            statusField = 'status';
            break;
          case 'payments':
          case 'wallet':
            rawList = rawAnalytics.recentDeposits || [];
            volField = 'amount';
            statusField = 'status';
            break;
          case 'users':
            rawList = rawAnalytics.topCustomers || [];
            volField = 'totalSpent';
            statusField = 'status';
            break;
          case 'services':
            rawList = rawAnalytics.topServices || [];
            volField = 'revenue';
            statusField = 'status';
            break;
          case 'providers':
            rawList = rawAnalytics.topProviders || [];
            volField = 'spent';
            statusField = 'status';
            break;
          default:
            rawList = [];
        }

        // Apply Date range filters based on createdAt or date
        const filtered = rawList.filter((item: any) => {
          const itemDateStr = item.createdAt || item.date || item.updatedAt || new Date().toISOString();
          const itemDate = new Date(itemDateStr).getTime();
          const start = new Date(startDate + 'T00:00:00').getTime();
          const end = new Date(endDate + 'T23:59:59').getTime();
          
          // Match text search
          let textMatch = true;
          if (searchTerm) {
            const query = searchTerm.toLowerCase();
            const emailMatch = item.userEmail && item.userEmail.toLowerCase().includes(query);
            const idMatch = item.id && String(item.id).toLowerCase().includes(query);
            const nameMatch = item.serviceName && item.serviceName.toLowerCase().includes(query);
            const providerMatch = item.name && item.name.toLowerCase().includes(query);
            const titleMatch = item.title && item.title.toLowerCase().includes(query);
            textMatch = emailMatch || idMatch || nameMatch || providerMatch || titleMatch;
          }

          // Match status
          let statusMatch = true;
          if (statusFilter !== 'all') {
            const itemStatus = String(item[statusField] || '').toLowerCase();
            statusMatch = itemStatus === statusFilter.toLowerCase();
          }

          return itemDate >= start && itemDate <= end && textMatch && statusMatch;
        });

        // Calculate summary metrics
        let totalCount = filtered.length;
        let totalVolume = filtered.reduce((acc, curr) => acc + (Number(curr[volField]) || 0), 0);
        let averageValue = totalCount > 0 ? totalVolume / totalCount : 0;
        
        let successCount = filtered.filter(item => {
          const s = String(item[statusField] || '').toLowerCase();
          return s === 'completed' || s === 'success' || s === 'active' || s === 'completed';
        }).length;
        let successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 100;

        setReportData(filtered);
        setSummaryStats({
          totalCount,
          totalVolume,
          averageValue,
          successRate
        });
      }
    } catch (e) {
      console.error(e);
      toastError('Report Failure', 'Unable to compile the requested logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateReport();
  }, [reportType, startDate, endDate, statusFilter]);

  // Export to CSV helper
  const handleExportCSV = () => {
    if (reportData.length === 0) {
      toastError('Export Empty', 'No ledger rows to export.');
      return;
    }

    const headers = Object.keys(reportData[0]);
    const csvRows = [
      headers.join(','), // header line
      ...reportData.map(row => 
        headers.map(fieldName => {
          const value = row[fieldName];
          const escaped = ('' + value).replace(/"/g, '""');
          return `"${escaped}"`;
        }).join(',')
      )
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Zenit_${reportType}_Report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('CSV Exported', 'Report dataset downloaded successfully.');
  };

  // Export to mock Excel layout (formatted HTML sheet)
  const handleExportExcel = () => {
    if (reportData.length === 0) {
      toastError('Export Empty', 'No ledger rows to export.');
      return;
    }
    
    let html = '<table><thead><tr>';
    const headers = Object.keys(reportData[0]);
    headers.forEach(h => { html += `<th>${h}</th>`; });
    html += '</tr></thead><tbody>';
    
    reportData.forEach(row => {
      html += '<tr>';
      headers.forEach(h => {
        html += `<td>${row[h]}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Zenit_${reportType}_Report_${startDate}_to_${endDate}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Excel Exported', 'Spreadsheet generated successfully.');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12 print:bg-white print:text-black">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-blue-900/10 pb-6 print:hidden">
        <div>
          <h1 className="font-display font-bold text-2xl text-gray-100">Zenit Financial Ledger</h1>
          <p className="text-xs text-gray-400 mt-1">
            Audit panel services, billing transactions, revenue, and active provider metrics.
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={generateReport}
            className="p-2.5 rounded-xl border border-blue-900/10 bg-blue-950/5 text-gray-400 hover:text-blue-400 cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            id="report-csv-btn"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-blue-900/20 bg-[#0A0E17] hover:border-blue-900/50 text-xs font-semibold text-gray-200 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-blue-400" />
            CSV Export
          </button>
          <button
            id="report-xls-btn"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-blue-900/20 bg-[#0A0E17] hover:border-blue-900/50 text-xs font-semibold text-gray-200 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            Excel Export
          </button>
          <button
            id="report-print-btn"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-all cursor-pointer shadow-[0_0_15px_rgba(37,99,235,0.2)]"
          >
            <Printer className="w-4 h-4" />
            Print Ledger
          </button>
        </div>
      </div>

      {/* Filter Toolbar controls */}
      <div className="bg-[#0A0E17] border border-blue-900/20 rounded-2xl p-5 space-y-4 print:hidden">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">
          <Filter className="w-4 h-4" />
          Report Configurator
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Report Type */}
          <div>
            <label className="block text-[11px] text-gray-400 font-medium mb-1.5">Ledger Scope</label>
            <select
              value={reportType}
              onChange={e => setReportType(e.target.value as ReportType)}
              className="w-full px-4 py-2.5 rounded-xl border border-blue-900/10 bg-blue-950/5 text-xs text-gray-300 focus:outline-none cursor-pointer"
            >
              <option value="orders">Orders Performance</option>
              <option value="revenue">Revenue Breakdown</option>
              <option value="payments">Deposits Ledger</option>
              <option value="users">Top SMM Customers</option>
              <option value="services">Services Performance</option>
              <option value="providers">Provider Spend</option>
            </select>
          </div>

          {/* Date range start */}
          <div>
            <label className="block text-[11px] text-gray-400 font-medium mb-1.5">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-blue-900/10 bg-blue-950/5 text-xs text-gray-300 focus:outline-none"
            />
          </div>

          {/* Date range end */}
          <div>
            <label className="block text-[11px] text-gray-400 font-medium mb-1.5">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-blue-900/10 bg-blue-950/5 text-xs text-gray-300 focus:outline-none"
            />
          </div>

          {/* Text Search */}
          <div>
            <label className="block text-[11px] text-gray-400 font-medium mb-1.5">Text Filter</label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search email, ID, name..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-blue-900/10 bg-blue-950/5 text-xs text-gray-300 focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3.5 top-3.5" />
            </div>
          </div>

          {/* Status filter */}
          <div>
            <label className="block text-[11px] text-gray-400 font-medium mb-1.5">Status Filter</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-blue-900/10 bg-blue-950/5 text-xs text-gray-300 focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed / Active</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed / Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Overview performance stat boxes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Ledger Records Count', value: summaryStats.totalCount, icon: Activity, color: 'text-blue-400 bg-blue-500/5 border-blue-500/10' },
          { label: 'Total Volume ($)', value: `$${summaryStats.totalVolume.toFixed(2)}`, icon: DollarSign, color: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10' },
          { label: 'Average Value ($)', value: `$${summaryStats.averageValue.toFixed(2)}`, icon: TrendingUp, color: 'text-amber-400 bg-amber-500/5 border-amber-500/10' },
          { label: 'Completion / Success Rate', value: `${summaryStats.successRate.toFixed(1)}%`, icon: CheckCircle, color: 'text-cyan-400 bg-cyan-500/5 border-cyan-500/10' }
        ].map((stat, i) => (
          <div key={i} className="bg-[#0A0E17] border border-blue-900/10 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-500 font-mono tracking-wider uppercase">{stat.label}</p>
              <p className="text-xl font-bold text-gray-100 mt-1.5 font-mono">{stat.value}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Ledger Dataset table view */}
      <div className="bg-[#0A0E17] border border-blue-900/20 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-gray-200 mb-5 flex items-center gap-2 print:text-black">
          <FileText className="w-4 h-4 text-blue-400" />
          Active Ledger Dataset ({reportData.length} records)
        </h2>

        {loading ? (
          <div className="py-16 flex justify-center">
            <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
          </div>
        ) : reportData.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-xs">
            No matching transaction records found for selection range.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs print:text-black">
              <thead>
                <tr className="border-b border-blue-900/10 text-gray-500 font-mono tracking-wider uppercase text-[10px] print:text-black print:border-black/20">
                  <th className="pb-3 font-semibold">Row ID</th>
                  <th className="pb-3 font-semibold">User Details</th>
                  <th className="pb-3 font-semibold">Metric Name</th>
                  <th className="pb-3 font-semibold">Financial Volume</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-900/5 text-gray-300 print:text-black print:divide-black/10">
                {reportData.map((row, i) => {
                  // Normalize field matches
                  const idVal = row.id || row.orderId || `row-${i}`;
                  const userVal = row.userEmail || row.userId || 'Guest';
                  const labelVal = row.serviceName || row.name || row.method || 'General billing';
                  const volVal = row.charge || row.amount || row.totalSpent || row.revenue || row.spent || 0;
                  const statusVal = row.status || row.providerStatus || 'completed';
                  const timeVal = row.createdAt || row.date || row.updatedAt || new Date().toISOString();

                  return (
                    <tr key={i} className="hover:bg-blue-950/5 print:hover:bg-transparent">
                      <td className="py-3.5 font-mono text-[10px] text-blue-400 print:text-black">{idVal}</td>
                      <td className="py-3.5 font-semibold text-gray-200 print:text-black">{userVal}</td>
                      <td className="py-3.5 pr-4 max-w-xs truncate text-gray-400 print:text-black">{labelVal}</td>
                      <td className="py-3.5 font-mono font-bold text-gray-100 print:text-black">${Number(volVal).toFixed(4)}</td>
                      <td className="py-3.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${
                          statusVal === 'completed' || statusVal === 'active' || statusVal === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 print:bg-green-100 print:text-green-800' :
                          statusVal === 'pending' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400 print:bg-yellow-100 print:text-yellow-800' :
                          'bg-rose-500/10 border border-rose-500/20 text-rose-400 print:bg-red-100 print:text-red-800'
                        }`}>
                          {statusVal}
                        </span>
                      </td>
                      <td className="py-3.5 text-right text-gray-500 font-mono text-[10px] print:text-black">
                        {new Date(timeVal).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
