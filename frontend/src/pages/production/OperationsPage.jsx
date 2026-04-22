import React, { useState, useEffect, useCallback } from "react";
import axios from "../../utils/api";
import { toast } from "react-toastify";
import {
  Plus,
  Search,
  Settings2,
  Trash2,
  Edit2,
  ChevronRight,
  Filter,
  X,
  Save,
  Wrench,
  Factory,
  Truck,
  Loader2
} from "lucide-react";
import DataTable from "../../components/ui/DataTable/DataTable";

const CreateOperationModal = ({ isOpen, onClose, onSave, loading }) => {
  const [formData, setFormData] = useState({
    name: "",
    type: "In-house",
    description: ""
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-950 w-full max-w-md rounded shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col animate-in zoom-in duration-200">
        <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded">
              <Plus size={15} />
            </div>
            <h2 className="text-sm  text-slate-900 dark:text-white  ">Create New Operation</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs  text-slate-400  ">Operation Name</label>
              <input
                type="text"
                required
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs  focus:ring-1 focus:ring-indigo-500 outline-none"
                placeholder="E.G. Cutting, Welding..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs  text-slate-400  ">Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: "In-house" })}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded text-xs    border transition-all ${
                    formData.type === "In-house"
                      ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-600"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500"
                  }`}
                >
                  <Factory size={14} /> In-house
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: "Outsource" })}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded text-xs    border transition-all ${
                    formData.type === "Outsource"
                      ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-600"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500"
                  }`}
                >
                  <Truck size={14} /> Outsource
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs  text-slate-400  ">Description (Optional)</label>
              <textarea
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs  h-24 outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="ADDITIONAL DETAILS..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          <div className="p-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-900/50">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-6 py-2 text-xs   text-slate-500 hover:bg-slate-100 rounded transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-2 bg-indigo-600 text-white text-xs   rounded shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Operation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const OperationsPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [operations, setOperations] = useState([]);

  const fetchOperations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get("/production/operations");
      if (response.data.success) {
        setOperations(response.data.operations);
      }
    } catch (error) {
      console.error("Error fetching operations:", error);
      toast.error("Failed to load operations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOperations();
  }, [fetchOperations]);

  const handleSaveOperation = async (newOp) => {
    setSaveLoading(true);
    try {
      const response = await axios.post("/production/operations", newOp);
      if (response.data.success) {
        toast.success("Operation created successfully");
        setIsModalOpen(false);
        fetchOperations();
      }
    } catch (error) {
      console.error("Error creating operation:", error);
      toast.error(error.response?.data?.message || "Failed to create operation");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteOperation = async (id) => {
    if (!window.confirm("Are you sure you want to delete this operation?")) return;

    try {
      const response = await axios.delete(`/production/operations/${id}`);
      if (response.data.success) {
        toast.success("Operation deleted successfully");
        setOperations(operations.filter((op) => op.id !== id));
      }
    } catch (error) {
      console.error("Error deleting operation:", error);
      toast.error("Failed to delete operation");
    }
  };

  const operationColumns = [
    {
      header: "Operation Name",
      accessor: "name",
      render: (value) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded">
            <Wrench size={15} />
          </div>
          <span className="text-xs text-slate-900 dark:text-white tracking-tight">
            {value}
          </span>
        </div>
      ),
    },
    {
      header: "Type",
      accessor: "type",
      render: (value) => (
        <span
          className={`px-2.5 py-1 text-xs rounded border flex items-center gap-1.5 w-fit ${
            value === "In-house"
              ? "bg-blue-100 text-blue-700 border-blue-200"
              : "bg-amber-100 text-amber-700 border-amber-200"
          }`}
        >
          {value === "In-house" ? <Factory size={10} /> : <Truck size={10} />}
          {value}
        </span>
      ),
    },
    {
      header: "Description",
      accessor: "description",
      render: (value) => (
        <span className="text-xs text-slate-500 tracking-tight">
          {value || "NO DESCRIPTION"}
        </span>
      ),
    },
    {
      header: "Actions",
      align: "right",
      render: (_, op) => (
        <div className="flex justify-end gap-2">
          <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
            <Edit2 size={15} />
          </button>
          <button
            onClick={() => handleDeleteOperation(op.id)}
            className="p-2 text-slate-400 hover:text-red-600 transition-colors"
          >
            <Trash2 size={15} />
          </button>
          <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
            <ChevronRight size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4">
      {/* Page Header */}
      <div className="max-w-7xl mx-auto  flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl  text-slate-900 dark:text-white  ">Manufacturing Operations</h1>
            <p className="text-xs  text-slate-500   mt-1">Global Operation Dictionary for Planning</p>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="p-2 bg-indigo-600 text-white rounded text-xs     shadow-indigo-600/30 hover:bg-indigo-700 transition-all flex items-center gap-3 group"
        >
          <Plus size={15} className="group-hover:rotate-90 transition-transform duration-300" />
          Create New Operation
        </button>
      </div>

      <div className=" mx-auto space-y-2">
        {/* Table/List Area */}
        <div className="">
          

          <div className="overflow-x-auto min-h-[400px]">
            <DataTable
              columns={operationColumns}
              data={operations}
              loading={loading}
              searchPlaceholder="SEARCH OPERATIONS..."
              emptyMessage="No Operations Found"
            />
          </div>
        </div>
      </div>

      <CreateOperationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveOperation}
        loading={saveLoading}
      />
    </div>
  );
};

export default OperationsPage;
