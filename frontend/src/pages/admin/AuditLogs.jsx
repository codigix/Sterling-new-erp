import { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  Eye,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  LogOut,
  Lock,
  Edit,
  Activity,
  Loader2,
} from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import api from '../../utils/api';
import { format } from 'date-fns';
import DataTable from '../../components/ui/DataTable/DataTable';

const AuditLogs = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/audit-logs');
      setAuditLogs(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError('Failed to fetch audit logs. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { label: 'Total Logs', value: auditLogs.length, icon: Activity, color: 'blue' },
    { label: 'Successful', value: auditLogs.filter(l => l.status === 'success').length, icon: CheckCircle2, color: 'emerald' },
    { label: 'Warnings', value: auditLogs.filter(l => l.status === 'warning').length, icon: AlertTriangle, color: 'amber' },
    { label: 'Errors', value: auditLogs.filter(l => l.status === 'error').length, icon: Trash2, color: 'red' },
  ];

  const getTypeIcon = (type) => {
    switch (type) {
      case 'auth':
        return <LogOut className="w-4 h-4" />;
      case 'export':
        return <Download className="w-4 h-4" />;
      case 'admin':
        return <Lock className="w-4 h-4" />;
      case 'account':
        return <User className="w-4 h-4" />;
      case 'security':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'bg-emerald-100 text-emerald-700';
      case 'warning':
        return 'bg-amber-100 text-amber-700';
      case 'error':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'auth':
        return 'bg-blue-100 text-blue-700';
      case 'export':
        return 'bg-purple-100 text-purple-700';
      case 'admin':
        return 'bg-cyan-100 text-cyan-700';
      case 'account':
        return 'bg-indigo-100 text-indigo-700';
      case 'security':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.details.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || log.type === filterType;
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const columns = [
    { key: 'user', label: 'User', className: '' },
    { key: 'action', label: 'Action' },
    {
      key: 'type',
      label: 'Type',
      render: (val) => (
        <div className="flex items-center text-xs gap-2">
          <div className={`p-2 rounded ${getTypeColor(val)}`}>
            {getTypeIcon(val)}
          </div>
          <span className={`rounded text-xs  ${getTypeColor(val)}`}>
            {val}
          </span>
        </div>
      )
    },
    { 
      key: 'details', 
      label: 'Details', 
      render: (val) => <div className="max-w-xs truncate" title={val}>{val}</div> 
    },
    {
      key: 'timestamp',
      label: 'Timestamp',
      render: (val) => val ? format(new Date(val), 'yyyy-MM-dd HH:mm:ss') : 'N/A'
    },
    { key: 'ipAddress', label: 'IP Address', className: 'font-mono text-xs' },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <span className={`px-3 py-1 rounded text-xs  ${getStatusColor(val)}`}>
          {val === 'success' && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
          {val === 'warning' && <AlertTriangle className="w-3 h-3 inline mr-1" />}
          {val === 'error' && <Trash2 className="w-3 h-3 inline mr-1" />}
          {val.charAt(0).toUpperCase() + val.slice(1)}
        </span>
      )
    }
  ];

  return (
    <div className="w-full min-h-screen p-4 space-y-2">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl  ">Audit Logs</h1>
          <p className="text-xs text-slate-500 mt-1 text-left">
            Track and monitor all system activities and user actions
          </p>
        </div>
        <button className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center text-xs gap-2 transition-colors">
          <Download className="w-4 h-4" />
          Export Logs
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          const colorBg = { blue: 'bg-blue-50', emerald: 'bg-emerald-50', amber: 'bg-amber-50', red: 'bg-red-50' }[stat.color];
          const colorIcon = { blue: 'text-blue-600', emerald: 'text-emerald-600', amber: 'text-amber-600', red: 'text-red-600' }[stat.color];
          return (
            <Card key={idx} className=" transition-shadow">
              <CardContent className="">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs  text-slate-500   mb-1">{stat.label}</p>
                    <p className="text-xl  ">{stat.value}</p>
                  </div>
                  <div className={`${colorBg} p-3 rounded flex-shrink-0`}>
                    <Icon className={`w-3 h-3 ${colorIcon}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters and Search */}
      <div className=" transition-shadow">
        <div className="my-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div className="md:col-span-2">
              <label className="block text-xs  text-slate-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by user, action, or details..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 p-2 border border-slate-300 text-xs rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div >
              <Select
                label="Activity Type"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                placeholder="All Types"
              >
                <option value="all">All Types</option>
                <option value="auth">Authentication</option>
                <option value="export">Export</option>
                <option value="admin">Admin</option>
                <option value="account">Account</option>
                <option value="security">Security</option>
              </Select>
            </div>
            <div className="">
              <Select
                label="Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                placeholder="All Status"
              >
                <option value="all">All Status</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className=" transition-shadow">
        <div className="border-b border-slate-100 pb-4">
          <CardTitle className="flex items-center text-xs gap-2 text-lg">
            <div className=" bg-blue-50 rounded">
              <Activity className="w-3 h-3 text-blue-600" />
            </div>
            <span className='text-sm'>Activity Logs</span>
            <span className="text-sm font-normal text-slate-500 ml-auto">{filteredLogs.length} entries</span>
          </CardTitle>
        </div>
        <div className="">
          <DataTable
            columns={columns}
            data={filteredLogs}
            loading={loading}
            error={error}
            showSearch={false}
            emptyMessage="No audit logs found matching your filters"
          />
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
