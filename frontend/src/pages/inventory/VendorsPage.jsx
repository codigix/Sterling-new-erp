import { useState, useCallback, useEffect } from "react";
import {
  Truck,
  Search,
  Plus,
  Filter,
  Download,
  Mail,
  Phone,
  MapPin,
  Edit,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  Building2,
  UserCheck,
  Loader2,
} from "lucide-react";
import axios from "../../utils/api";
import toastUtils from "../../utils/toastUtils";

const VendorsPage = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
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
  const [selectedVendor, setSelectedVendor] = useState(null);
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

  const fetchVendors = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);

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
  }, [searchQuery]);

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
      // Backend returns [{category: "cat1"}, {category: "cat2"}]
      // But some might be JSON strings if they were saved as arrays
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

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

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
      // Auto-generate code on load
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
      const payload = {
        ...formData,
        category: JSON.stringify(formData.category),
      };

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
      const payload = {
        ...formData,
        category: JSON.stringify(formData.category),
      };

      await axios.put(
        `department/procurement/vendors/${editingVendor.id}`,
        payload
      );

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
      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  return (
    <div className="space-y-2 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-md  text-slate-900 dark:text-white  flex items-center  gap-2">
            <Truck size={15} />
            Vendor Management
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs">
            Manage and track vendor relationships
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center text-xs gap-2 p-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors font-medium"
          >
            <Plus size={15} />
            Add Vendor
          </button>
          <button className="flex items-center text-xs gap-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors font-medium">
            <Download size={15} />
            Export List
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-2">
            <Search
              size={15}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search vendor or category..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>

          <button className="flex items-center text-xs justify-center gap-2 p-2 border border-slate-300 dark:border-slate-600 rounded text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <Filter size={15} />
            Advanced Filter
          </button>
        </div>
      </div>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          <div className="col-span-2 flex justify-center items-center p-2">
            <p className="text-slate-500 dark:text-slate-400">
              Loading vendors...
            </p>
          </div>
        ) : error ? (
          <div className="col-span-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : vendors.length === 0 ? (
          <div className="col-span-2 text-center p-2">
            <p className="text-slate-500 dark:text-slate-400">
              No vendors found
            </p>
          </div>
        ) : (
          vendors.map((vendor) => (
            <div
              key={vendor.id}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-2  transition-shadow"
            >
              <div className="flex justify-between items-start ">
                <div>
                  <h3 className="text-md  text-slate-900 dark:text-white">
                    {vendor.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {(() => {
                      let categories = [];
                      try {
                        if (typeof vendor.category === 'string') {
                          const parsed = JSON.parse(vendor.category);
                          categories = Array.isArray(parsed) ? parsed : [vendor.category];
                        } else if (Array.isArray(vendor.category)) {
                          categories = vendor.category;
                        } else if (vendor.category) {
                          categories = [vendor.category];
                        }
                      } catch (e) {
                        categories = [vendor.category];
                      }

                      return categories.length > 0 ? (
                        categories.map((cat, idx) => (
                          <span key={idx} className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 p-1 rounded">
                            {cat}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-1 rounded">
                          No category
                        </span>
                      );
                    })()}
                    <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 p-1 rounded capitalize">
                      {(vendor.vendor_type || "material_supplier").replace(
                        /_/g,
                        " "
                      )}
                    </span>
                  </div>
                </div>
                <span
                  className={`p-1 rounded text-xs  ${getStatusColor(
                    vendor.status
                  )}`}
                >
                  {(vendor.status || "active").charAt(0).toUpperCase() +
                    (vendor.status || "active").slice(1)}
                </span>
              </div>

              <div className="space-y-2 my-4 text-sm">
                {vendor.email && (
                  <div className="flex items-center text-xs gap-2 text-slate-500 dark:text-slate-400">
                    <Mail size={15} />
                    <a
                      href={`mailto:${vendor.email}`}
                      className="hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {vendor.email}
                    </a>
                  </div>
                )}
                {vendor.mobile_number && (
                  <div className="flex items-center text-xs gap-2 text-slate-500 dark:text-slate-400">
                    <Phone size={15} />
                    <a
                      href={`tel:${vendor.mobile_number}`}
                      className="hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {vendor.mobile_number}
                    </a>
                  </div>
                )}
                {(vendor.city || vendor.state) && (
                  <div className="flex items-center text-xs gap-2 text-slate-500 dark:text-slate-400">
                    <MapPin size={15} />
                    <span>{[vendor.city, vendor.state].filter(Boolean).join(", ")}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEditVendor(vendor)}
                  className="flex-1 flex items-center text-xs justify-center gap-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors font-medium text-sm"
                >
                  <Edit size={15} />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteVendor(vendor.id)}
                  className="p-2 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 rounded transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Vendor Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-800 dark:to-slate-700 rounded p-2 border border-blue-200 dark:border-slate-600">
          <p className="text-sm  text-slate-500 dark:text-slate-400">
            Total Vendors
          </p>
          <p className="text-xl  text-slate-900 dark:text-white text-xs mt-1">
            {stats.total || 0}
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-slate-800 dark:to-slate-700 rounded p-2 border border-green-200 dark:border-slate-600">
          <p className="text-sm  text-slate-500 dark:text-slate-400">
            Active Vendors
          </p>
          <p className="text-xl  text-slate-900 dark:text-white text-xs mt-1">
            {stats.active_count || 0}
          </p>
        </div>
      </div>

      {(showAddModal || showEditModal) && (
        <div
          className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowAddModal(false);
            setShowEditModal(false);
            setEditingVendor(null);
          }}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0  flex justify-between items-center p-2 border-b border-slate-200 dark:border-slate-600">
              <div>
                <h3 className="text-md  text-slate-900 dark:text-white">
                  {editingVendor ? "Edit Vendor" : "Add New Vendor"}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 text-xs">
                  {editingVendor ? `Updating: ${editingVendor.vendor_code}` : "Fill in the vendor details below"}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setEditingVendor(null);
                }}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
              >
                <X size={15} className="text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            {/* Form Content */}
            <form
              onSubmit={editingVendor ? handleUpdateVendor : handleAddVendor}
              className="overflow-y-auto flex-1 p-2"
            >
              {/* Section: Basic Information */}
              <div className="border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection("basic")}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-700/50 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white  text-xs  ">
                    <Building2 size={15} className="text-blue-500" />
                    Basic Information
                  </div>
                  {expandedSections.basic ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
                
                {expandedSections.basic && (
                  <div className="p-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-slate-800 animate-in slide-in-from-top-2 duration-200">
                    <div>
                      <label className="block text-xs  text-slate-500  mb-1">Vendor Code</label>
                      <input
                        type="text"
                        name="vendor_code"
                        value={formData.vendor_code}
                        disabled
                        className="w-full p-2 text-xs border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-900  text-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs  text-slate-500  mb-1">Vendor Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleFormChange}
                        required
                        placeholder="Enter vendor name"
                        className="w-full p-2 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs  text-slate-500  mb-1">Vendor Type *</label>
                      <select
                        name="vendor_type"
                        value={formData.vendor_type}
                        onChange={handleFormChange}
                        className="w-full p-2 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:border-blue-500 outline-none"
                      >
                        <option value="material_supplier">Material Supplier</option>
                        <option value="service_vendor">Service Vendor</option>
                        <option value="contractor">Contractor</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs  text-slate-500  mb-1">Status</label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleFormChange}
                        className="w-full p-2 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:border-blue-500 outline-none"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs  text-slate-500  mb-1">Vendor Category (Multi-select)</label>
                      <div className="flex flex-wrap gap-2 p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900">
                        {VENDOR_CATEGORIES.map(cat => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              const current = Array.isArray(formData.category) ? formData.category : [];
                              const updated = current.includes(cat) 
                                ? current.filter(c => c !== cat)
                                : [...current, cat];
                              setFormData(prev => ({ ...prev, category: updated }));
                            }}
                            className={`p-1 text-xs  rounded transition-all ${
                              Array.isArray(formData.category) && formData.category.includes(cat)
                                ? "bg-blue-600 text-white  shadow-blue-500/20"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section: Contact Information */}
              <div className="border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection("contact")}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-700/50 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white  text-xs  ">
                    <UserCheck size={15} className="text-emerald-500" />
                    Contact Information
                  </div>
                  {expandedSections.contact ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
                
                {expandedSections.contact && (
                  <div className="p-2 grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-slate-800 animate-in slide-in-from-top-2 duration-200">
                    <div>
                      <label className="block text-xs  text-slate-500  mb-1">Contact Person Name</label>
                      <input
                        type="text"
                        name="contact_person_name"
                        value={formData.contact_person_name}
                        onChange={handleFormChange}
                        placeholder="Full Name"
                        className="w-full p-2 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs  text-slate-500  mb-1">Designation</label>
                      <input
                        type="text"
                        name="designation"
                        value={formData.designation}
                        onChange={handleFormChange}
                        placeholder="e.g. Sales Manager"
                        className="w-full p-2 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs  text-slate-500  mb-1">Mobile Number</label>
                      <input
                        type="text"
                        name="mobile_number"
                        value={formData.mobile_number}
                        onChange={handleFormChange}
                        placeholder="+91 XXXXXXXXXX"
                        className="w-full p-2 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs  text-slate-500  mb-1">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleFormChange}
                        placeholder="vendor@example.com"
                        className="w-full p-2 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs  text-slate-500  mb-1">Address</label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleFormChange}
                        placeholder="Plot No, Industrial Area..."
                        className="w-full p-2 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs  text-slate-500  mb-1">City</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleFormChange}
                        className="w-full p-2 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs  text-slate-500  mb-1">State</label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleFormChange}
                        className="w-full p-2 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs  text-slate-500  mb-1">Pincode</label>
                      <input
                        type="text"
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleFormChange}
                        className="w-full p-2 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </form>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-slate-800 px-8 py-4 border-t border-slate-200 dark:border-slate-600 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setEditingVendor(null);
                }}
                className="p-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors  text-xs "
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={editingVendor ? handleUpdateVendor : handleAddVendor}
                disabled={submitting}
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-all  text-xs   shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  editingVendor ? "Update Vendor" : "Add Vendor"
                )}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default VendorsPage;
