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
} from "lucide-react";
import axios from "../../utils/api";
import toastUtils from "../../utils/toastUtils";
import DataTable from "../../components/ui/DataTable/DataTable";

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
  });
  const [submitting, setSubmitting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
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
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
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
      });
      setShowEditModal(true);
    }
  };

  const handleAddVendor = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toastUtils.warning("Vendor name is required");
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
            key: "category",
            label: "Categories",
            render: (val) => {
              let categoriesList = [];
              try {
                if (typeof val === 'string') {
                  const parsed = JSON.parse(val);
                  categoriesList = Array.isArray(parsed) ? parsed : [val];
                } else if (Array.isArray(val)) {
                  categoriesList = val;
                } else if (val) {
                  categoriesList = [val];
                }
              } catch (e) {
                categoriesList = [val];
              }
              return (
                <div className="flex flex-wrap gap-1">
                  {categoriesList.map((c, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px]">
                      {c}
                    </span>
                  ))}
                </div>
              );
            }
          },
          {
            key: "contact",
            label: "Contact",
            render: (_, vendor) => (
              <div className="flex flex-col text-[10px]">
                <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                  <Mail size={10} className="text-slate-400" />
                  {vendor.email || "No Email"}
                </div>
                <div className="flex items-center gap-1 text-slate-500">
                  <Phone size={10} className="text-slate-400" />
                  {vendor.mobile_number || "No Phone"}
                </div>
              </div>
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
                  onClick={() => handleEditVendor(vendor)}
                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600"
                >
                  <Edit size={14} />
                </button>
                <button
                  onClick={() => handleDeleteVendor(vendor.id)}
                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-red-600"
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
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white text-xs"><UserCheck size={15} className="text-emerald-500" />Contact Information</div>
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
                      <input type="text" name="city" value={formData.city} onChange={handleFormChange} className="w-full p-2 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:border-blue-500 outline-none" />
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
    </div>
  );
};

export default VendorsPage;
