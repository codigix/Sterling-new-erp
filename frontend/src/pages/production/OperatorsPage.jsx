import { useState, useEffect, useCallback, useMemo } from "react";
import Swal from "sweetalert2";
import axios from "../../utils/api";
import Button from "../../components/ui/Button";
import DataTable from "../../components/ui/DataTable/DataTable";
import { Plus, Edit2, X, Mail, CheckCircle2, Loader2, Users, UserCheck, UserX, Power } from "lucide-react";

// Production-side operator management. Uses /production/operators, which only works on
// operators (role 'employee') — the same records as Admin > Employee Management > Operators.

const EMPTY_FORM = { firstName: "", lastName: "", email: "", designation: "", status: "active" };

const INPUT_CLASS =
  "w-full p-2 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all";

const operatorName = (op) =>
  [op.firstName, op.lastName].filter(Boolean).join(" ").trim() || op.fullName?.trim() || "-";

const OperatorsPage = () => {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingOperator, setEditingOperator] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchOperators = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get("/production/operators");
      setOperators(response.data.operators || []);
    } catch (err) {
      console.error("Failed to fetch operators:", err);
      setError(err.response?.data?.message || "Failed to fetch operators. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOperators();
  }, [fetchOperators]);

  const counts = useMemo(() => {
    const inactive = operators.filter((op) => op.status === "inactive").length;
    return { total: operators.length, active: operators.length - inactive, inactive };
  }, [operators]);

  const visibleOperators = useMemo(
    () =>
      operators
        .filter((op) => statusFilter === "all" || (op.status === "inactive" ? "inactive" : "active") === statusFilter)
        .map((op) => ({ ...op, displayName: operatorName(op) })),
    [operators, statusFilter]
  );

  const openCreate = () => {
    setEditingOperator(null);
    setFormData(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (operator) => {
    setEditingOperator(operator);
    setFormData({
      firstName: operator.firstName || operator.fullName?.split(" ")[0] || "",
      lastName: operator.lastName || operator.fullName?.split(" ").slice(1).join(" ") || "",
      email: operator.email || "",
      designation: operator.designation || "",
      status: operator.status === "inactive" ? "inactive" : "active",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingOperator(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editingOperator) {
        await axios.put(`/production/operators/${editingOperator.id}`, formData);
      } else {
        await axios.post("/production/operators", formData);
      }
      Swal.fire({
        icon: "success",
        title: "Success",
        text: editingOperator ? "Operator updated successfully" : "Operator added successfully",
        timer: 2000,
        showConfirmButton: false,
      });
      closeForm();
      await fetchOperators();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.message || "Failed to save operator" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (operator) => {
    const newStatus = operator.status === "inactive" ? "active" : "inactive";
    const action = newStatus === "active" ? "activate" : "deactivate";

    const result = await Swal.fire({
      title: `${action === "activate" ? "Activate" : "Deactivate"} "${operatorName(operator)}"?`,
      text:
        newStatus === "inactive"
          ? "The operator will be marked Inactive. Existing work logs and assignments are kept."
          : "The operator will be marked Active again.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: newStatus === "active" ? "#22c55e" : "#ef4444",
      cancelButtonColor: "#3085d6",
      confirmButtonText: `Yes, ${action}`,
    });
    if (!result.isConfirmed) return;

    try {
      await axios.patch(`/production/operators/${operator.id}/status`, { status: newStatus });
      await fetchOperators();
      Swal.fire({ icon: "success", title: "Success", text: `Operator ${action}d`, timer: 1800, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.response?.data?.message || `Failed to ${action} operator` });
    }
  };

  const columns = [
    {
      key: "displayName",
      label: "Name",
      sortable: true,
      render: (value) => <span className="font-semibold text-slate-900 dark:text-slate-100">{value}</span>,
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
      render: (value) => <span className="text-slate-500 dark:text-slate-400 text-sm">{value || "-"}</span>,
    },
    {
      key: "designation",
      label: "Designation",
      sortable: true,
      render: (value) => <span className="text-slate-600 dark:text-slate-400 text-sm font-medium">{value || "-"}</span>,
    },
    {
      key: "department",
      label: "Department",
      sortable: true,
      render: (value) => (
        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          {value || "N/A"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => (
        <span
          className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold ${
            value === "inactive"
              ? "bg-red-100 text-red-800 border border-red-200"
              : "bg-green-100 text-green-800 border border-green-200"
          }`}
        >
          {value === "inactive" ? "Inactive" : "Active"}
        </span>
      ),
    },
    {
      key: "id",
      label: "Manage",
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEdit(row)}
            title="Edit"
            className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition"
          >
            <Edit2 className="w-4 h-4 text-green-600" />
          </button>
          {/* Only active operators get the deactivate button; inactive ones are re-activated via Edit → Status */}
          {row.status !== "inactive" && (
            <button
              onClick={() => handleToggleStatus(row)}
              title="Deactivate"
              className="p-1 rounded transition hover:bg-red-100 dark:hover:bg-red-900/30"
            >
              <Power className="w-4 h-4 text-red-600" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const summaryCards = [
    { key: "all", label: "Total Operators", value: counts.total, icon: Users, color: "text-blue-600 bg-blue-50" },
    { key: "active", label: "Active", value: counts.active, icon: UserCheck, color: "text-green-600 bg-green-50" },
    { key: "inactive", label: "Inactive", value: counts.inactive, icon: UserX, color: "text-red-600 bg-red-50" },
  ];

  return (
    <div className="w-full space-y-4 p-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl text-left">Operators</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 text-left">
            Add operators, update their details and mark them active or inactive
          </p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-1 text-sm p-2 h-auto">
          <Plus className="w-4 h-4" />
          Add Operator
        </Button>
      </div>

      {/* Summary cards double as a status filter */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {summaryCards.map(({ key, label, value, icon, color }) => {
          const Icon = icon;
          return (
          <button
            key={key}
            type="button"
            onClick={() => setStatusFilter(key)}
            className={`flex items-center justify-between p-4 rounded border bg-white dark:bg-slate-900 text-left transition-all ${
              statusFilter === key ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
            }`}
          >
            <div>
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-2xl text-slate-900 dark:text-white">{value}</p>
            </div>
            <div className={`p-2 rounded ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
          </button>
          );
        })}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
      )}

      <DataTable
        columns={columns}
        data={visibleOperators}
        loading={loading}
        striped={true}
        hover={true}
        emptyMessage={statusFilter === "all" ? "No operators yet. Add your first operator." : `No ${statusFilter} operators.`}
      />

      {showForm && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-[0.5px] flex items-center justify-center p-4 z-50">
          <div className="rounded shadow-2xl w-full max-w-lg max-h-[95vh] overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="text-lg text-slate-700 dark:text-white text-left">
                  {editingOperator ? "Edit Operator" : "Add New Operator"}
                </h3>
                <p className="text-xs text-slate-500 text-left mt-0.5">
                  {editingOperator ? "Update operator details" : "The operator is added to the Production department"}
                </p>
              </div>
              <button onClick={closeForm} className="text-slate-400 hover:text-slate-600 p-2 rounded hover:bg-slate-100" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4 overflow-auto max-h-[calc(90vh-140px)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5 text-left">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input name="firstName" value={formData.firstName} onChange={handleInputChange} required placeholder="e.g. Rahul" className={INPUT_CLASS} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5 text-left">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input name="lastName" value={formData.lastName} onChange={handleInputChange} required placeholder="e.g. Sharma" className={INPUT_CLASS} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5 text-left">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="operator@sterling.com (Optional)"
                      className={`${INPUT_CLASS} pl-10`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5 text-left">Designation</label>
                  <input
                    name="designation"
                    value={formData.designation}
                    onChange={handleInputChange}
                    placeholder="e.g. Welder, Fitter, CNC Operator"
                    className={INPUT_CLASS}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5 text-left">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select name="status" value={formData.status} onChange={handleInputChange} className={INPUT_CLASS}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 flex justify-end gap-3">
                <button type="button" onClick={closeForm} className="px-4 py-2 border border-slate-300 text-xs text-slate-700 rounded hover:bg-white">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-xs rounded flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  {editingOperator ? "Update Operator" : "Add Operator"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperatorsPage;
