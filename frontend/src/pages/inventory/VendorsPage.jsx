import { useState, useCallback, useEffect } from "react";
import {
  Truck,
  Plus,
  Download,
  Mail,
  Phone,
  Edit,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  Building2,
  UserCheck,
  Eye,
} from "lucide-react";
import axios from "../../utils/api";
import toastUtils from "../../utils/toastUtils";
import DataTable from "../../components/ui/DataTable/DataTable";

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;

const VendorsPage = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    vendor_code: "",
    name: "",
    email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    category: [], // Multi-select
    vendor_type: "material_supplier",
    status: "active",
    contact_person_name: "",
    designation: "",
    mobile_number: "",
    gstin: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingVendor, setViewingVendor] = useState(null);
  const [categories, setCategories] = useState([]);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    contact: true,
  });

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const VENDOR_CATEGORIES = [
    "Raw Material Supplier",
    "Fabrication Vendor",
    "Machining Vendor",
    "Electrical Vendor",
    "Paint Vendor",
    "Transport Vendor",
    "Service Provider",
  ];

  const fetchVendors = useCallback(async (query = "") => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (query) params.append("search", query);

      const response = await axios.get(
        `department/procurement/vendors?${params}`
      );
      setVendors(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching vendors:", err);
      setError("Failed to fetch vendors");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get(`department/procurement/vendors/stats`);
      setStats(response.data);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get(
        `department/procurement/vendors/categories`
      );
      let uniqueCategories = new Set();
      response.data.forEach((item) => {
        if (!item.category) return;
        try {
          const parsed = JSON.parse(item.category);
          if (Array.isArray(parsed)) {
            parsed.forEach((c) => uniqueCategories.add(c));
          } else {
            uniqueCategories.add(item.category);
          }
        } catch (e) {
          uniqueCategories.add(item.category);
        }
      });
      setCategories(Array.from(uniqueCategories));
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
    fetchStats();
    fetchCategories();
  }, [fetchVendors, fetchStats, fetchCategories]);

  const fetchVendorById = async (id) => {
    try {
      const response = await axios.get(`department/procurement/vendors/${id}`);
      return response.data;
    } catch (err) {
      console.error("Error fetching vendor details:", err);
      toastUtils.error("Failed to load vendor details");
      return null;
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalValue = value;
    if (name === "gstin") {
      finalValue = value.toUpperCase();
    }
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : finalValue,
    }));
  };

  const resetForm = () => {
    setFormData({
      vendor_code: "",
      name: "",
      email: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      category: [],
      vendor_type: "material_supplier",
      status: "active",
      contact_person_name: "",
      designation: "",
      mobile_number: "",
      gstin: "",
    });
    setExpandedSections({
      basic: true,
      contact: true,
    });
  };

  const handleOpenAddModal = async () => {
    resetForm();
    try {
      const response = await axios.get("department/procurement/vendors/stats");
      const nextNum = (response.data.totalVendors + 1).toString().padStart(4, "0");
      setFormData(prev => ({ ...prev, vendor_code: `VEN-${nextNum}` }));
    } catch (err) {
      console.error("Error generating vendor code:", err);
    }
    setShowAddModal(true);
  };

  const handleEditVendor = async (vendor) => {
    const vendorData = await fetchVendorById(vendor.id);
    if (vendorData) {
      let parsedCategory = [];
      try {
        parsedCategory = JSON.parse(vendorData.category);
        if (!Array.isArray(parsedCategory)) parsedCategory = [vendorData.category];
      } catch (e) {
        parsedCategory = vendorData.category ? [vendorData.category] : [];
      }

      setEditingVendor(vendorData);
      setFormData({
        vendor_code: vendorData.vendor_code || "",
        name: vendorData.name || "",
        email: vendorData.email || "",
        address: vendorData.address || "",
        city: vendorData.city || "",
        state: vendorData.state || "",
        pincode: vendorData.pincode || "",
        category: parsedCategory,
        vendor_type: vendorData.vendor_type || "material_supplier",
        status: vendorData.status || "active",
        contact_person_name: vendorData.contact_person_name || "",
        designation: vendorData.designation || "",
        mobile_number: vendorData.mobile_number || "",
        gstin: vendorData.gstin || "",
      });
      setShowEditModal(true);
    }
  };

  const handleViewVendor = async (vendor) => {
    const vendorData = await fetchVendorById(vendor.id);
    if (vendorData) {
      setViewingVendor(vendorData);
      setShowViewModal(true);
    }
  };

  const handleAddVendor = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toastUtils.warning("Vendor name is required");
      return;
    }
    if (!formData.gstin.trim()) {
      toastUtils.warning("GST Number is required");
      return;
    }
    if (!GST_REGEX.test(formData.gstin.trim())) {
      toastUtils.warning("Please enter a valid GST number (e.g. 27AARCS2886C1ZX)");
      return;
    }
    setSubmitting(true);
    try {
      const payload = { ...formData, category: JSON.stringify(formData.category) };
      await axios.post(`department/procurement/vendors`, payload);
      setShowAddModal(false);
      resetForm();
      fetchVendors();
      fetchStats();
      toastUtils.success("Vendor added successfully");
    } catch (err) {
      console.error("Error adding vendor:", err);
      toastUtils.error("Failed to add vendor");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateVendor = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toastUtils.warning("Vendor name is required");
      return;
    }
    if (!formData.gstin.trim()) {
      toastUtils.warning("GST Number is required");
      return;
    }
    if (!GST_REGEX.test(formData.gstin.trim())) {
      toastUtils.warning("Please enter a valid GST number (e.g. 27AARCS2886C1ZX)");
      return;
    }
    setSubmitting(true);
    try {
      const payload = { ...formData, category: JSON.stringify(formData.category) };
      await axios.put(`department/procurement/vendors/${editingVendor.id}`, payload);
      setShowEditModal(false);
      setEditingVendor(null);
      resetForm();
      fetchVendors();
      fetchStats();
      toastUtils.success("Vendor updated successfully");
    } catch (err) {
      console.error("Error updating vendor:", err);
      toastUtils.error("Failed to update vendor");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVendor = async (id) => {
    if (window.confirm("Are you sure you want to delete this vendor?")) {
      try {
        await axios.delete(`department/procurement/vendors/${id}`);
        toastUtils.success("Vendor deleted successfully");
        fetchVendors();
        fetchStats();
      } catch (err) {
        console.error("Error deleting vendor:", err);
        toastUtils.error("Failed to delete vendor");
      }
    }
  };

  const getStatusColor = (status) => {
    return status === "active"
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200"
      : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-gray-200";
  };

  return (
    <div className="space-y-4 p-4">
      <DataTable
        title="Vendor Management"
        titleIcon={<Truck size={16} />}
        titleExtra={
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={handleOpenAddModal}
              className="flex items-center text-xs gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded transition-colors shadow-sm"
            >
              <Plus size={14} /> Add Vendor
            </button>
            <button className="flex items-center text-xs gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors shadow-sm">
              <Download size={14} /> Export List
            </button>
          </div>
        }
        data={vendors}
        loading={loading}
        onSearch={(val) => fetchVendors(val)}
        filters={[
          {
            key: "vendor_type",
            label: "Type",
            options: [
              { label: "Material Supplier", value: "material_supplier" },
              { label: "Service Provider", value: "service_provider" },
              { label: "Fabrication", value: "fabrication" },
            ]
          },
          {
            key: "status",
            label: "Status",
            options: [
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
            ]
          }
        ]}
        columns={[
          {
            key: "name",
            label: "Vendor Details",
            sortable: true,
            render: (val, vendor) => (
              <div className="flex flex-col">
                <span className="text-xs font-medium text-slate-900 dark:text-white">{val}</span>
                <span className="text-[10px] text-slate-500 font-mono">{vendor.vendor_code}</span>
              </div>
            )
          },
          {
            key: "gstin",
            label: "GST Number",
            render: (val) => (
              <span className="text-xs font-mono font-medium text-slate-900 dark:text-white">
                {val || "-"}
              </span>
            )
          },
          {
            key: "status",
            label: "Status",
            render: (val) => (
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${getStatusColor(val)}`}>
                {val.toUpperCase()}
              </span>
            )
          },
          {
            key: "actions",
            label: "Actions",
            align: "right",
            render: (_, vendor) => (
              <div className="flex justify-end gap-1">
                <button
                  onClick={() => handleViewVendor(vendor)}
                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-emerald-600"
                  title="View Vendor"
                >
                  <Eye size={14} />
                </button>
                <button
                  onClick={() => handleEditVendor(vendor)}
                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600"
                  title="Edit Vendor"
                >
                  <Edit size={14} />
                </button>
                <button
                  onClick={() => handleDeleteVendor(vendor.id)}
                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600"
                  title="Delete Vendor"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          }
        ]}
      />

      {/* Vendor Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-800 dark:to-slate-700 rounded p-4 border border-blue-200 dark:border-slate-600">
          <p className="text-sm  text-slate-500 dark:text-slate-400">
            Total Vendors
          </p>
          <p className="text-xl  text-slate-900 dark:text-white text-xs mt-1">
            {stats.totalVendors || 0}
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-slate-800 dark:to-slate-700 rounded p-4 border border-green-200 dark:border-slate-600">
          <p className="text-sm  text-slate-500 dark:text-slate-400">
            Active Vendors
          </p>
          <p className="text-xl  text-slate-900 dark:text-white text-xs mt-1">
            {stats.activeVendors || 0}
          </p>
        </div>
      </div>

      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowAddModal(false); setShowEditModal(false); setEditingVendor(null); }}>
          <div className="bg-white dark:bg-slate-800 rounded w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0  flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-600">
              <div>
                <h3 className="text-md  text-slate-900 dark:text-white">{editingVendor ? "Edit Vendor" : "Add New Vendor"}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{editingVendor ? `Updating: ${editingVendor.vendor_code}` : "Fill in the vendor details below"}</p>
              </div>
              <button onClick={() => { setShowAddModal(false); setShowEditModal(false); setEditingVendor(null); }} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors">
                <X size={15} className="text-slate-500 dark:text-slate-400" />
              </button>
            </div>
            <form onSubmit={editingVendor ? handleUpdateVendor : handleAddVendor} className="overflow-y-auto flex-1 p-4 space-y-4">
              <div className="border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                <button type="button" onClick={() => toggleSection("basic")} className="w-full p-2 bg-slate-50 dark:bg-slate-700/50 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white text-xs"><Building2 size={15} className="text-blue-500" />Basic Information</div>
                  {expandedSections.basic ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
                {expandedSections.basic && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-slate-800 animate-in slide-in-from-top-2 duration-200">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Vendor Code</label>
                      <input type="text" name="vendor_code" value={formData.vendor_code} disabled className="w-full p-2 text-xs border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-900 text-blue-600" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Vendor Name *</label>
                      <input type="text" name="name" value={formData.name} onChange={handleFormChange} required placeholder="Enter vendor name" className="w-full p-2 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Vendor Type *</label>
                      <select name="vendor_type" value={formData.vendor_type} onChange={handleFormChange} className="w-full p-2 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:border-blue-500 outline-none">
                        <option value="material_supplier">Material Supplier</option>
                        <option value="service_vendor">Service Vendor</option>
                        <option value="contractor">Contractor</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Status</label>
                      <select name="status" value={formData.status} onChange={handleFormChange} className="w-full p-2 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:border-blue-500 outline-none">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">GST Number *</label>
                      <input type="text" name="gstin" value={formData.gstin} onChange={handleFormChange} required placeholder="Enter GST number" className="w-full p-2 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:border-blue-500 outline-none" maxLength={20} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-slate-500 mb-1">Vendor Category</label>
                      <div className="flex flex-wrap gap-2 p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900">
                        {VENDOR_CATEGORIES.map(cat => (
                          <button key={cat} type="button" onClick={() => { const current = Array.isArray(formData.category) ? formData.category : []; const updated = current.includes(cat) ? current.filter(c => c !== cat) : [...current, cat]; setFormData(prev => ({ ...prev, category: updated })); }} className={`p-1.5 text-xs rounded transition-all ${Array.isArray(formData.category) && formData.category.includes(cat) ? "bg-blue-600 text-white shadow-blue-500/20" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200"}`}>{cat}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                <button type="button" onClick={() => toggleSection("contact")} className="w-full p-2 bg-slate-50 dark:bg-slate-700/50 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white text-xs"><UserCheck size={15} className="text-emerald-500" />Contact & Address Information</div>
                  {expandedSections.contact ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
                {expandedSections.contact && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-slate-800 animate-in slide-in-from-top-2 duration-200">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Contact Person</label>
                      <input type="text" name="contact_person_name" value={formData.contact_person_name} onChange={handleFormChange} placeholder="Full Name" className="w-full p-2 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Mobile</label>
                      <input type="text" name="mobile_number" value={formData.mobile_number} onChange={handleFormChange} placeholder="+91 XXXXXXXXXX" className="w-full p-2 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Email</label>
                      <input type="email" name="email" value={formData.email} onChange={handleFormChange} placeholder="vendor@example.com" className="w-full p-2 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">City</label>
                      <input type="text" name="city" value={formData.city} onChange={handleFormChange} placeholder="City" className="w-full p-2 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">State</label>
                      <input type="text" name="state" value={formData.state} onChange={handleFormChange} placeholder="State" className="w-full p-2 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Pincode</label>
                      <input type="text" name="pincode" value={formData.pincode} onChange={handleFormChange} placeholder="Pincode" className="w-full p-2 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-slate-500 mb-1">Address</label>
                      <textarea name="address" value={formData.address} onChange={handleFormChange} placeholder="Enter full address" rows={3} className="w-full p-2 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:border-blue-500 outline-none" />
                    </div>
                  </div>
                )}
              </div>
            </form>
            <div className="sticky bottom-0 bg-white dark:bg-slate-800 p-4 border-t border-slate-200 dark:border-slate-600 flex justify-end gap-3">
              <button type="button" onClick={() => { setShowAddModal(false); setShowEditModal(false); setEditingVendor(null); }} className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-50 dark:hover:bg-slate-700 text-xs transition-colors">Cancel</button>
              <button type="submit" disabled={submitting} onClick={editingVendor ? handleUpdateVendor : handleAddVendor} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs transition-colors flex items-center gap-2 disabled:opacity-50">{submitting && <X className="animate-spin" size={12} />}{editingVendor ? "Update Vendor" : "Create Vendor"}</button>
            </div>
          </div>
        </div>
      )}
      {showViewModal && viewingVendor && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowViewModal(false); setViewingVendor(null); }}>
          <div className="bg-white dark:bg-slate-800 rounded w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-tight">
                    {viewingVendor.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {viewingVendor.vendor_code}
                  </p>
                </div>
              </div>
              <button onClick={() => { setShowViewModal(false); setViewingVendor(null); }} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                <X size={16} className="text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-6">
              {/* Status and Type */}
              <div className="flex gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Vendor Type</span>
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200 capitalize mt-1 block">
                    {viewingVendor.vendor_type ? viewingVendor.vendor_type.replace('_', ' ') : 'N/A'}
                  </span>
                </div>
                <div className="ml-auto">
                  <span className="block text-[10px] text-slate-400 uppercase font-semibold tracking-wider text-right">Status</span>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border mt-1 ${getStatusColor(viewingVendor.status)}`}>
                    {viewingVendor.status ? viewingVendor.status.toUpperCase() : 'N/A'}
                  </span>
                </div>
              </div>

              {/* GST Number and Categories */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded border border-slate-100 dark:border-slate-700/50">
                  <span className="block text-[10px] text-slate-400 uppercase font-semibold tracking-wider">GST Number</span>
                  <span className="text-xs font-mono font-semibold text-slate-900 dark:text-white mt-1 block">
                    {viewingVendor.gstin || 'N/A'}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded border border-slate-100 dark:border-slate-700/50">
                  <span className="block text-[10px] text-slate-400 uppercase font-semibold tracking-wider mb-1">Categories</span>
                  <div className="flex flex-wrap gap-1">
                    {(() => {
                      let categoriesList = [];
                      try {
                        if (typeof viewingVendor.category === 'string') {
                          const parsed = JSON.parse(viewingVendor.category);
                          categoriesList = Array.isArray(parsed) ? parsed : [viewingVendor.category];
                        } else if (Array.isArray(viewingVendor.category)) {
                          categoriesList = viewingVendor.category;
                        } else if (viewingVendor.category) {
                          categoriesList = [viewingVendor.category];
                        }
                      } catch (e) {
                        categoriesList = [viewingVendor.category];
                      }
                      
                      return categoriesList.length > 0 ? (
                        categoriesList.map((c, i) => (
                          <span key={i} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded text-[10px] font-medium border border-blue-100/30">
                            {c}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500">None</span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="border border-slate-100 dark:border-slate-700 rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <UserCheck size={14} className="text-emerald-500" />
                  Contact Information
                </div>
                 <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[10px] text-slate-400">Contact Person</span>
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                        {viewingVendor.contact_person_name || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400">Mobile</span>
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                        {viewingVendor.mobile_number || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">Email</span>
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                      {viewingVendor.email || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Address / Location Details */}
              <div className="border border-slate-100 dark:border-slate-700 rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Building2 size={14} className="text-blue-500" />
                  Location Details
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="block text-[10px] text-slate-400">City</span>
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                        {viewingVendor.city || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400">State</span>
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                        {viewingVendor.state || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400">Pincode</span>
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                        {viewingVendor.pincode || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">Address</span>
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200 whitespace-pre-line block mt-0.5">
                      {viewingVendor.address || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <button
                type="button"
                onClick={() => { setShowViewModal(false); setViewingVendor(null); }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorsPage;
