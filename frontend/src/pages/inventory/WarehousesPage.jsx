import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Warehouse,
  Search,
  Plus,
  RefreshCw,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Clock,
  LayoutGrid,
  List,
  Download,
  X,
  MapPin,
  Database,
  Layers,
  Building2
} from "lucide-react";
import axios from "../../utils/api";
import Swal from "sweetalert2";
import toastUtils from "../../utils/toastUtils";
import DataTable from "../../components/ui/DataTable/DataTable";

const WarehousesPage = () => {
  const [viewMode, setViewMode] = useState("list");
  const [showModal, setShowModal] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    type: "Raw Material",
    department: "All Departments",
    location: "",
    storage_capacity: "",
    parent_warehouse_id: ""
  });

  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get("/inventory/warehouses");
      setWarehouses(response.data || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching warehouses:", error);
      setLoading(false);
    }
  }, []);

  const columns = useMemo(() => [
    {
      key: "code",
      label: "Code",
      sortable: true,
      render: (val) => <span className="text-sm font-medium text-slate-900 dark:text-white">{val}</span>
    },
    {
      key: "name",
      label: "Name",
      sortable: true,
      render: (val) => <span className="text-sm text-slate-500 dark:text-slate-400">{val}</span>
    },
    {
      key: "type",
      label: "Type",
      sortable: true,
      render: (val) => <span className="text-sm text-slate-500 dark:text-slate-400">{val}</span>
    },
    {
      key: "location",
      label: "Location",
      sortable: true,
      render: (val) => <span className="text-sm text-slate-500 dark:text-slate-400">{val || "-"}</span>
    },
    {
      key: "storage_capacity",
      label: "Capacity",
      sortable: true,
      render: (val) => <span className="text-sm text-slate-500 dark:text-slate-400">{val || "0"}</span>
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (_, wh) => (
        <div className="flex justify-end gap-2">
          <button 
            onClick={() => handleOpenModal(wh)}
            className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
          >
            <Edit2 size={15} />
          </button>
          <button 
            onClick={() => handleDelete(wh.id)}
            className="p-2 text-slate-400 hover:text-red-600 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      )
    }
  ], []);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  const handleOpenModal = (warehouse = null) => {
    if (warehouse) {
      setEditingId(warehouse.id);
      setFormData({
        code: warehouse.code || "",
        name: warehouse.name || "",
        type: warehouse.type || "Raw Material",
        department: warehouse.department || "All Departments",
        location: warehouse.location || "",
        storage_capacity: warehouse.storage_capacity || "",
        parent_warehouse_id: warehouse.parent_warehouse_id || ""
      });
    } else {
      setEditingId(null);
      setFormData({
        code: "",
        name: "",
        type: "Raw Material",
        department: "All Departments",
        location: "",
        storage_capacity: "",
        parent_warehouse_id: ""
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`/inventory/warehouses/${editingId}`, formData);
        toastUtils.success("Warehouse updated successfully");
      } else {
        await axios.post("/inventory/warehouses", formData);
        toastUtils.success("Warehouse created successfully");
      }
      setShowModal(false);
      fetchWarehouses();
    } catch (error) {
      console.error("Error saving warehouse:", error);
      toastUtils.error(error.response?.data?.message || "Failed to save warehouse");
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!"
    });

    if (result.isConfirmed) {
      try {
        await axios.delete(`/inventory/warehouses/${id}`);
        toastUtils.success("Warehouse has been deleted.");
        fetchWarehouses();
      } catch (error) {
        console.error("Error deleting warehouse:", error);
        toastUtils.error("Failed to delete warehouse");
      }
    }
  };

  const locations = [...new Set(warehouses.map(wh => wh.location).filter(Boolean))];

  return (
    <div className="p-6 bg-slate-50 min-h-screen dark:bg-slate-900">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded">
            <Warehouse className="text-amber-600 dark:text-amber-400" size={15} />
          </div>
          <div>
            <h1 className="text-2xl  text-slate-900 dark:text-white">Warehouses</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage storage locations and inventory warehouses
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchWarehouses}
            className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-500 dark:text-slate-300 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={15} />
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 p-2 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors  "
          >
            <Plus size={15} />
            Create Warehouse
          </button>
        </div>
      </div>

      <DataTable
        title="Warehouse Directory"
        titleIcon={<Warehouse size={16} />}
        columns={columns}
        data={warehouses}
        loading={loading}
        emptyMessage="No warehouses found"
        filters={[
          {
            key: "location",
            label: "Location",
            options: locations.map(l => ({ label: l, value: l }))
          },
          {
            key: "type",
            label: "Type",
            options: [
              { label: "Raw Material", value: "Raw Material" },
              { label: "Finished Goods", value: "Finished Goods" },
              { label: "WIP", value: "WIP" },
              { label: "Scrap", value: "Scrap" },
              { label: "Stores", value: "Stores" },
            ]
          }
        ]}
      />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded  w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded">
                  <Warehouse className="text-amber-600 dark:text-amber-400" size={20} />
                </div>
                <h2 className="text-xl  text-slate-900 dark:text-white">
                  {editingId ? "Edit Warehouse" : "Create New Warehouse"}
                </h2>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded  transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm  text-slate-700 dark:text-slate-300 mb-2">
                    Warehouse Code *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g., WH001"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm  text-slate-700 dark:text-slate-300 mb-2">
                    Warehouse Name *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g., Main Warehouse"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm  text-slate-700 dark:text-slate-300 mb-2">
                    Warehouse Type *
                  </label>
                  <select
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                  >
                    <option>Raw Material</option>
                    <option>Finished Goods</option>
                    <option>WIP</option>
                    <option>Scrap</option>
                    <option>Stores</option>
                    <option>Transit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm  text-slate-700 dark:text-slate-300 mb-2">
                    Department *
                  </label>
                  <select
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                  >
                    <option>All Departments</option>
                    <option>Production</option>
                    <option>Purchase</option>
                    <option>Stores</option>
                    <option>Logistics</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm  text-slate-700 dark:text-slate-300 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Mumbai"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm  text-slate-700 dark:text-slate-300 mb-2">
                    Storage Capacity
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 1000"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
                    value={formData.storage_capacity}
                    onChange={(e) => setFormData({...formData, storage_capacity: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm  text-slate-700 dark:text-slate-300 mb-2">
                    Parent Warehouse ID
                  </label>
                  <input
                    type="number"
                    placeholder="Leave empty if no parent"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
                    value={formData.parent_warehouse_id}
                    onChange={(e) => setFormData({...formData, parent_warehouse_id: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 border-t border-slate-200 dark:border-slate-700 pt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-200 transition-colors "
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors  "
                >
                  {editingId ? "Update Warehouse" : "Create Warehouse"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehousesPage;
