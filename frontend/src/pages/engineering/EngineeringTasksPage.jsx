import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Upload, Download, CheckCircle, Clock, AlertCircle, Eye, Edit2, Trash2 } from 'lucide-react';
import axios from '../../utils/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import DataTable from '../../components/ui/DataTable/DataTable';
import '../../styles/TaskPage.css';

const EngineeringTasksPage = () => {
  const navigate = useNavigate();
  const [rootCards, setRootCards] = useState([]);
  const [selectedRootCard, setSelectedRootCard] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [boms, setBoms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('documents');
  const [showUploadForm, setShowUploadForm] = useState(false);

  const [uploadForm, setUploadForm] = useState({
    documentType: 'qap',
    documentName: '',
    file: null
  });

  const fetchRootCards = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get('/root-cards', { 
        params: { assignedOnly: true },
        __sessionGuard: true 
      });
      setRootCards(response.data.rootCards || []);
      if (response.data.rootCards && response.data.rootCards.length > 0) {
        setSelectedRootCard(response.data.rootCards[0].id);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load root cards');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDocuments = useCallback(async () => {
    if (!selectedRootCard) return;
    try {
      const response = await axios.get('/engineering/documents', {
        params: { rootCardId: selectedRootCard },
        __sessionGuard: true
      });
      setDocuments(response.data || []);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }
  }, [selectedRootCard]);

  const fetchBOMs = useCallback(async () => {
    if (!selectedRootCard) return;
    try {
      const response = await axios.get(`/engineering/bom/comprehensive/root-card/${selectedRootCard}/all`, {
        __sessionGuard: true
      });
      setBoms(response.data || []);
    } catch (err) {
      console.error('Failed to fetch BOMs:', err);
    }
  }, [selectedRootCard]);

  useEffect(() => {
    fetchRootCards();
  }, [fetchRootCards]);

  useEffect(() => {
    fetchDocuments();
    fetchBOMs();
  }, [selectedRootCard, fetchDocuments, fetchBOMs]);

  const handleUploadChange = (e) => {
    const { name, value, type } = e.target;
    if (type === 'file') {
      setUploadForm(prev => ({ ...prev, file: e.target.files[0] }));
    } else {
      setUploadForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!uploadForm.file) {
      setError('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('rootCardId', selectedRootCard);
    formData.append('documentType', uploadForm.documentType);
    formData.append('documentName', uploadForm.documentName || uploadForm.file.name);
    formData.append('document', uploadForm.file);

    try {
      await axios.post('/engineering/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        __sessionGuard: true
      });
      setUploadForm({ documentType: 'qap', documentName: '', file: null });
      setShowUploadForm(false);
      fetchDocuments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload document');
    }
  };

  const handleCreateBOMRedirect = () => {
    if (!selectedRootCard) return;
    const rc = rootCards.find(r => r.id === selectedRootCard);
    navigate(`/department/production/bom/create?rootCardId=${selectedRootCard}&projectId=${rc?.project_id || ''}`);
  };

  const getDocumentTypeLabel = (type) => {
    const labels = {
      qap: 'QAP/ATP',
      pd: 'PD Document',
      drawing: 'Drawing',
      fea: 'FEA Analysis',
      other: 'Other'
    };
    return labels[type] || type;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'draft':
      case 'pending_approval':
        return <Clock size={15} />;
      case 'approved':
        return <CheckCircle size={15} />;
      case 'rejected':
        return <AlertCircle size={15} />;
      default:
        return <Clock size={15} />;
    }
  };

  if (loading) {
    return (
      <div className="task-page-container">
        <div className="text-center py-12">Loading engineering tasks...</div>
      </div>
    );
  }

  return (
    <div className="task-page-container">
      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-4 text-red-600 hover:text-red-700">×</button>
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm   dark: mb-2">
          Select Root Card
        </label>
        <select
          value={selectedRootCard || ''}
          onChange={(e) => setSelectedRootCard(Number(e.target.value))}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700  dark:"
        >
          {rootCards.map(order => {
            const baseName = order.project_name || order.po_number || order.customer || "";
            // Remove RC-XXXX pattern from the start of the string if it exists
            const displayName = baseName.replace(/^RC-\d{4}\s*[-:]\s*/i, '');
            return (
              <option key={order.id} value={order.id}>
                {displayName || baseName || `Root Card ${order.id}`}
              </option>
            );
          })}
        </select>
      </div>

      <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('documents')}
          className={`p-2  border-b-2 transition-colors ${
            activeTab === 'documents'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:'
          }`}
        >
          Documents
        </button>
        <button
          onClick={() => setActiveTab('bom')}
          className={`p-2  border-b-2 transition-colors ${
            activeTab === 'bom'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:'
          }`}
        >
          Bill of Materials
        </button>
      </div>

      {activeTab === 'documents' && (
        <div className="space-y-2">
          {!showUploadForm && (
            <button
              onClick={() => setShowUploadForm(true)}
              className="flex items-center text-xs gap-2 p-2 rounded text-xs bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <Upload size={15} />
              Upload Document
            </button>
          )}

          {showUploadForm && (
            <Card className="mb-6 p-6">
              <h3 className="text-lg   dark: mb-4">Upload Engineering Document</h3>
              <form onSubmit={handleUploadDocument} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm  text-slate-700 dark:text-slate-300 mb-1">
                      Document Type
                    </label>
                    <select
                      name="documentType"
                      value={uploadForm.documentType}
                      onChange={handleUploadChange}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700  dark:"
                    >
                      <option value="qap">QAP/ATP</option>
                      <option value="pd">PD Document</option>
                      <option value="drawing">Drawing</option>
                      <option value="fea">FEA Analysis</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm  text-slate-700 dark:text-slate-300 mb-1">
                      Document Name
                    </label>
                    <input
                      type="text"
                      name="documentName"
                      value={uploadForm.documentName}
                      onChange={handleUploadChange}
                      placeholder="Optional - defaults to filename"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700  dark:"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm  text-slate-700 dark:text-slate-300 mb-1">
                    Select File
                  </label>
                  <input
                    type="file"
                    onChange={handleUploadChange}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700  dark:"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="p-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUploadForm(false)}
                    className="p-2 rounded  dark:bg-slate-600  dark: hover:bg-slate-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </Card>
          )}

          <Card>
            <DataTable
              columns={[
                { key: 'documentName', label: 'Document Name' },
                { key: 'documentType', label: 'Type', render: (val) => getDocumentTypeLabel(val) },
                { key: 'uploadedByName', label: 'Uploaded By' },
                {
                  key: 'status',
                  label: 'Status',
                  render: (val) => (
                    <Badge className={`flex items-center text-xs gap-1 w-fit ${getStatusColor(val)}`}>
                      {getStatusIcon(val)}
                      {val.replace(/_/g, ' ')}
                    </Badge>
                  )
                },
                {
                  key: 'actions',
                  label: 'Actions',
                  render: (_, doc) => (
                    <div className="flex gap-2">
                      <button className="p-2 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 transition-colors">
                        <Download size={15} />
                      </button>
                      <button className="p-2 rounded bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 hover:bg-blue-200 transition-colors">
                        <Eye size={15} />
                      </button>
                    </div>
                  )
                }
              ]}
              data={documents}
              emptyMessage="No documents uploaded for this root card"
            />
          </Card>
        </div>
      )}

      {activeTab === 'bom' && (
        <div className="space-y-2">
          <button
            onClick={handleCreateBOMRedirect}
            className="flex items-center text-xs gap-2 p-2 rounded text-xs bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <Plus size={15} />
            Create Comprehensive BOM
          </button>

          <Card>
            <DataTable
              columns={[
                { key: 'productName', label: 'Product Name' },
                { key: 'itemCode', label: 'Item Code' },
                { key: 'revision', label: 'Revision', render: (val) => `Rev ${val}` },
                {
                  key: 'status',
                  label: 'Status',
                  render: (val) => (
                    <Badge className={`flex items-center text-xs gap-1 w-fit ${getStatusColor(val)}`}>
                      {val.replace(/_/g, ' ')}
                    </Badge>
                  )
                },
                {
                  key: 'actions',
                  label: 'Actions',
                  render: (_, bom) => (
                    <div className="flex gap-2">
                      <Link 
                        to={`/department/production/bom/view?bomId=${bom.id}`}
                        className="p-2 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 transition-colors"
                      >
                        <Eye size={15} />
                      </Link>
                      <button className="p-2 rounded bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 hover:bg-blue-200 transition-colors">
                        <Download size={15} />
                      </button>
                    </div>
                  )
                }
              ]}
              data={boms}
              emptyMessage="No BOMs found for this root card"
            />
          </Card>
        </div>
      )}
    </div>
  );
};

export default EngineeringTasksPage;
