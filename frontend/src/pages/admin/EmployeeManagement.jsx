import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../utils/api";
import Swal from "sweetalert2";
import Card, {
  CardContent,
  CardTitle,
  CardHeader,
} from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { Modal, ModalBody, ModalFooter } from "../../components/ui/Modal";
import DataTable from "../../components/ui/DataTable/DataTable";
import Select from "../../components/ui/Select";
import {
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  Search,
  Lock,
  Shield,
  CheckCircle2,
  Users,
  LogIn,
  Mail,
  X,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("system_users"); // "employees" | "system_users"
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    department: "",
    departmentId: null,
    password: "",
    status: "active",
    designation: "",
  });

  const [designations, setDesignations] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await axios.get("/admin/departments");
      setDepartments(response.data || []);
    } catch (err) {
      console.error("Failed to fetch departments:", err);
    }
  }, []);

  const fetchDesignations = useCallback(async () => {
    try {
      const response = await axios.get("/admin/designations");
      const designationsData = response.data.designations || response.data || [];
      setDesignations(designationsData);
    } catch (err) {
      console.error("Failed to fetch designations:", err);
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      const response = await axios.get("/admin/roles");
      const rolesData = response.data.roles || response.data || [];
      setAvailableRoles(rolesData);
    } catch (err) {
      console.error("Failed to fetch roles:", err);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get("/admin/employee-list");
      setEmployees(response.data || []);
    } catch (err) {
      console.error("API Error:", err);
      setError("Failed to fetch employees. Please try again.");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    fetchRoles();
    fetchDesignations();
  }, [fetchEmployees, fetchDepartments, fetchRoles, fetchDesignations]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        department: formData.department,
        departmentId: formData.departmentId,
        isLoginUser: activeTab === 'system_users',
        password: formData.password,
        status: formData.status,
        designation: activeTab === 'employees' ? formData.designation : null
      };

      if (editingEmployee) {
        await axios.put(`/admin/employee-list/${editingEmployee.id}`, data);
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Details updated successfully",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        await axios.post("/admin/employee-list", data);
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Created successfully",
          timer: 2000,
          showConfirmButton: false,
        });
      }

      await fetchEmployees();
      setShowForm(false);
      setEditingEmployee(null);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        department: "",
        departmentId: null,
        password: "",
        status: "active",
        designation: "",
      });
    } catch (err) {
      setError("Failed to save: " + (err.response?.data?.message || err.message));
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      firstName: employee.firstName || "",
      lastName: employee.lastName || "",
      email: employee.email || "",
      department: employee.department || "",
      departmentId: employee.departmentId || null,
      password: "",
      status: employee.status || "active",
      designation: employee.designation || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await axios.delete(`/admin/employee-list/${id}`);
        await fetchEmployees();
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "Record has been deleted.",
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to delete record",
        });
      }
    }
  };

  const handleToggleStatus = async (id, currentStatus, name) => {
    const newStatus = currentStatus === 'inactive' ? 'active' : 'inactive';
    const action = newStatus === 'active' ? 'activate' : 'deactivate';

    const result = await Swal.fire({
      title: `Are you sure you want to ${action} "${name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: newStatus === 'active' ? "#22c55e" : "#ef4444",
      cancelButtonColor: "#3085d6",
      confirmButtonText: `Yes, ${action}!`,
    });

    if (result.isConfirmed) {
      try {
        await axios.put(`/admin/employee-list/${id}/status`, { status: newStatus });
        await fetchEmployees();
        Swal.fire({
          icon: "success",
          title: "Success",
          text: `User has been ${action}d successfully.`,
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: `Failed to ${action} user`,
        });
      }
    }
  };

  const getRoleBadgeColor = (roleName) => {
    const colors = {
      'admin': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      'management': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      'sales': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
      'engineering': 'bg-slate-100 text-slate-800 dark:bg-slate-800/30 dark:text-slate-300',
      'procurement': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
      'qc': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'quality': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'inventory': 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
      'production supervisor': 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
      'production': 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
      'design_engineer': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
      'accountant': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300'
    };
    return colors[roleName?.toLowerCase()] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  };

  const dailyEmployees = employees.filter((emp) => emp.role === "employee");
  const departmentUsers = employees.filter((emp) => emp.role !== "employee");

  const currentTabUsers = activeTab === "employees" ? dailyEmployees : departmentUsers;

  const filteredEmployees = currentTabUsers.filter(
    (emp) =>
      emp.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      key: "firstName",
      label: "Name",
      sortable: true,
      render: (value, row) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          {row.firstName} {row.lastName}
        </span>
      ),
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
      render: (value) => (
        <span className="text-slate-500 dark:text-slate-400 text-sm">
          {value || "-"}
        </span>
      ),
    },
    ...(activeTab === "employees"
      ? [
          {
            key: "designation",
            label: "Designation",
            sortable: true,
            render: (value) => (
              <span className="text-slate-600 dark:text-slate-400 text-sm font-medium">
                {value || "-"}
              </span>
            ),
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
        ]
      : []),
    ...(activeTab === "system_users"
      ? [
          {
            key: "role",
            label: "Role",
            sortable: true,
            render: (value) => (
              <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold uppercase ${getRoleBadgeColor(value)}`}>
                {value || "N/A"}
              </span>
            ),
          },
        ]
      : []),
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => (
        <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold capitalize ${
          value === 'inactive'
            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-700/50'
            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-700/50'
        }`}>
          {value === 'inactive' ? 'Inactive' : 'Active'}
        </span>
      ),
    },
    {
      key: "id",
      label: "Manage",
      sortable: false,
      render: (value, row) => (
        <div className="flex items-center text-xs gap-1">
          <button
            onClick={() => handleEdit(row)}
            title="Edit"
            className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition"
          >
            <Edit2 className="w-4 h-4 text-green-600" />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            title="Delete"
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full space-y-4 p-4">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl text-left">Employee Management</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 text-left">
            Create and manage employees with role-based access controls
          </p>
        </div>
        <Button
          onClick={() => {
            setShowForm(true);
            setEditingEmployee(null);
            setFormData({
              firstName: "",
              lastName: "",
              email: "",
              department: "",
              departmentId: null,
              password: "",
              status: "active",
              designation: "",
            });
          }}
          className="flex items-center text-xs gap-1 text-sm p-2 h-auto"
        >
          <Plus className="w-4 h-4" />
          {activeTab === "system_users" ? "Add Department User" : "Add Operator"}
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex gap-6 mt-2 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab("system_users")}
          className={`pb-3 text-sm flex items-center transition-all focus:outline-none relative ${
            activeTab === "system_users"
              ? "text-blue-600 dark:text-blue-400 font-semibold border-b-2 border-blue-600 dark:border-blue-400"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
          }`}
        >
          Department Users
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ml-2 transition-all ${
            activeTab === "system_users"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
          }`}>
            {departmentUsers.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("employees")}
          className={`pb-3 text-sm flex items-center transition-all focus:outline-none relative ${
            activeTab === "employees"
              ? "text-blue-600 dark:text-blue-400 font-semibold border-b-2 border-blue-600 dark:border-blue-400"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
          }`}
        >
          Operators
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ml-2 transition-all ${
            activeTab === "employees"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
          }`}>
            {dailyEmployees.length}
          </span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded flex items-center text-xs gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span className="text-sm text-red-700 dark:text-red-300">
            {error}
          </span>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-[0.5px] flex items-center justify-center p-4 z-50 transition-all duration-300">
          <div className="rounded shadow-2xl w-full max-w-lg max-h-[95vh] overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 animate-in fade-in scale-95 duration-300">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <div className="flex-1">
                <h3 className="text-lg text-slate-700 dark:text-white text-left">
                  {editingEmployee
                    ? activeTab === "system_users"
                      ? "Edit Department User"
                      : "Edit Operator"
                    : activeTab === "system_users"
                    ? "Create Department User"
                    : "Create New Operator"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 text-left mt-0.5">
                  {editingEmployee
                    ? "Update user profile details"
                    : "Add a new record to the directory"}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingEmployee(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-all ml-4"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-hidden flex flex-col">
              <div className="p-6 space-y-5 overflow-auto max-h-[calc(90vh-140px)] bg-white dark:bg-slate-900">
                {/* Personal Information */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3 ml-0.5 text-left">
                    Personal Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 text-left ml-0.5">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g. John"
                        className="w-full p-2 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 text-left ml-0.5">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g. Doe"
                        className="w-full p-2 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 text-left ml-0.5">
                      Email Address {activeTab === "system_users" && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required={activeTab === "system_users"}
                        placeholder={activeTab === "system_users" ? "john.doe@sterling.com" : "john.doe@sterling.com (Optional)"}
                        className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="pt-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-3 ml-0.5 text-left">
                    Additional Information
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 text-left ml-0.5">
                        Department <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="departmentId"
                        value={formData.departmentId || ""}
                        onChange={(e) => {
                          const deptId = e.target.value ? parseInt(e.target.value) : null;
                          const selectedDept = departments.find((d) => d.id === deptId);
                          setFormData((prev) => ({
                            ...prev,
                            departmentId: deptId,
                            department: selectedDept ? selectedDept.name : "",
                          }));
                        }}
                        required
                        className="w-full p-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      >
                        <option value="">Select Department</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {activeTab === "employees" && (
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 text-left ml-0.5">
                          Designation
                        </label>
                        <input
                          type="text"
                          name="designation"
                          value={formData.designation || ""}
                          onChange={handleInputChange}
                          placeholder="e.g. Welder, Fitter, Machinist"
                          className="w-full p-2 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 text-left ml-0.5">
                        Status <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="status"
                        value={formData.status || "active"}
                        onChange={handleInputChange}
                        required
                        className="w-full p-2.5 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Credentials - Only for Department Login Users */}
                {activeTab === "system_users" && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3 ml-0.5 text-left">
                      Portal Login Credentials
                    </h4>

                    {formData.department && (
                      <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded text-left text-xs text-blue-700 dark:text-blue-300">
                        Mapped Role: <strong className="uppercase">{formData.department}</strong>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 text-left ml-0.5">
                        Password {editingEmployee ? "(Optional)" : <span className="text-red-500">*</span>}
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="password"
                          name="password"
                          value={formData.password || ""}
                          onChange={handleInputChange}
                          required={!editingEmployee}
                          placeholder={editingEmployee ? "Leave blank to keep current password" : "Enter password (min 6 chars)"}
                          minLength={6}
                          className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingEmployee(null);
                  }}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-xs text-slate-700 dark:text-slate-300 rounded hover:bg-white dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white text-xs rounded shadow-lg shadow-green-600/20 flex items-center gap-2 transition-all active:scale-95"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  {editingEmployee
                    ? activeTab === "system_users"
                      ? "Update Department User"
                      : "Update Operator"
                    : activeTab === "system_users"
                    ? "Add Department User"
                    : "Add Operator"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredEmployees.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="w-12 h-12 text-slate-300 dark:text-slate-500 mb-3" />
          <h3 className="text-lg text-slate-900 dark:text-white mb-1">
            No records found
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {searchTerm
              ? "Try adjusting your search filters"
              : activeTab === "system_users"
              ? "Create your first department user to get started"
              : "Create your first operator to get started"}
          </p>
        </div>
      )}

      {/* Employee Table */}
      {filteredEmployees.length > 0 && (
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filteredEmployees}
            sortable={true}
            striped={true}
            hover={true}
          />
        </CardContent>
      )}
    </div>
  );
};

export default EmployeeManagement;
