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
} from "lucide-react";

const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [registeringEmployee, setRegisteringEmployee] = useState(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    designation: "",
    department: "",
    departmentId: null,
    roleId: null,
    loginId: "",
    password: "",
    actions: [],
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

  const generateLoginId = (firstName, lastName) => {
    return `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
  };

  const generatePassword = () => {
    return Math.random().toString(36).substring(2, 12);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const finalRoleId = formData.roleId || 2; // Default to Employee role (ID 2)
      
      const autoLoginId =
        formData.loginId ||
        generateLoginId(formData.firstName, formData.lastName);
      
      const finalPassword = formData.password || (editingEmployee ? null : generatePassword());

      const data = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        designation: formData.designation,
        department: formData.department,
        departmentId: formData.departmentId,
        roleId: finalRoleId,
        loginId: autoLoginId,
        actions: formData.actions,
      };

      if (finalPassword) {
        data.password = finalPassword;
      }

      if (editingEmployee) {
        await axios.put(`/admin/employee-list/${editingEmployee.id}`, data);
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Employee updated successfully",
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        await axios.post("/admin/employee-list", data);
        Swal.fire({
          icon: "warning",
          title: "Account Created Successfully",
          html: `
            <div class="text-left bg-slate-50 p-4 rounded-lg border border-slate-200 mt-4 space-y-3">
              <div class="mb-3">
                <p class="text-xs text-slate-500 font-bold uppercase tracking-wider">Employee Name</p>
                <p class="text-sm font-semibold text-slate-800">${formData.firstName} ${formData.lastName}</p>
              </div>
              <div class="mb-3">
                <p class="text-xs text-slate-500 font-bold uppercase tracking-wider">Login ID</p>
                <p class="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block">${autoLoginId}</p>
              </div>
              <div class="mb-3">
                <p class="text-xs text-slate-500 font-bold uppercase tracking-wider">Password</p>
                <p class="text-sm font-mono text-amber-600 bg-amber-50 px-2 py-1 rounded inline-block">${finalPassword}</p>
              </div>
              <div class="mt-4 p-2 bg-amber-100/50 border border-amber-200 rounded text-[11px] text-amber-700">
                ⚠️ Please share these credentials with the employee. They must change their password upon first login.
              </div>
            </div>
          `,
          confirmButtonText: "Close",
          confirmButtonColor: "#2563eb",
        });
      }

      await fetchEmployees();
      setShowForm(false);
      setEditingEmployee(null);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        designation: "",
        department: "",
        departmentId: null,
        roleId: null,
        loginId: "",
        password: "",
        actions: [],
      });
    } catch (err) {
      setError("Failed to save employee: " + err.message);
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      designation: employee.designation,
      department: employee.department,
      departmentId: employee.departmentId || null,
      roleId: employee.roleId || null,
      loginId: employee.loginId,
      password: "",
      actions: employee.actions || [],
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
          text: "Employee has been deleted.",
          timer: 2000,
          showConfirmButton: false,
        });
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to delete employee",
        });
      }
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handleRegister = (employee) => {
    setRegisteringEmployee(employee);
    setShowRegisterDialog(true);
  };

  const sendRegistrationEmail = async () => {
    try {
      await axios.post(
        `/admin/employee-list/${registeringEmployee.id}/send-credentials`,
        {
          email: registeringEmployee.email,
          loginId: registeringEmployee.loginId,
          password: registeringEmployee.password,
          name: `${registeringEmployee.firstName} ${registeringEmployee.lastName}`,
        }
      );
      setError(null);
      setShowRegisterDialog(false);
      alert(`Registration email sent to ${registeringEmployee.email}`);
    } catch (err) {
      setError("Failed to send registration email: " + err.message);
    }
  };

  const handleLogin = (employee) => {
    localStorage.setItem("token", "demo-token");
    localStorage.setItem(
      "demoUser",
      JSON.stringify({
        id: employee.id,
        username: employee.loginId,
        role: employee.role || "Employee",
        name: `${employee.firstName} ${employee.lastName}`,
        type: "employee",
        email: employee.email,
        designation: employee.designation,
        department: employee.department,
        departmentId: employee.departmentId,
      })
    );
    window.location.href = "/employee/dashboard";
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      key: "firstName",
      label: "Name",
      sortable: true,
      render: (value, row) => (
        <span className="font-medium  dark:">
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
          {value}
        </span>
      ),
    },
    {
      key: "roleId",
      label: "Role",
      sortable: true,
      render: (value, row) => (
        <span className="inline-block  rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
          {availableRoles.find((r) => r.id === value)?.name || row.role || "Employee"}
        </span>
      ),
    },
    {
      key: "loginId",
      label: "Login ID",
      sortable: true,
      render: (value) => (
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
          {value}
        </span>
      ),
    },
    {
      key: "status",
      label: "Credentials",
      sortable: false,
      render: (value, row) => (
        <button
          onClick={() => handleRegister(row)}
          title="Send Registration Email"
          className="inline-flex items-center gap-1 p-1 text-xs font-medium bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded transition-all duration-200 "
        >
          <Mail className="w-4 h-4" />
          Register
        </button>
      ),
    },
    {
      key: "quickLogin",
      label: "Quick Login",
      sortable: false,
      render: (value, row) => (
        <button
          onClick={() => handleLogin(row)}
          title="Login as this employee"
          className="inline-flex items-center gap-1 p-1 text-xs font-medium bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded transition-all duration-200 "
        >
          <LogIn className="w-4 h-4" />
          Login
        </button>
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
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl   text-left">Employee Management</h1>
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
              designation: "",
              department: "",
              departmentId: null,
              roleId: null,
              loginId: "",
              password: "",
              actions: [],
            });
          }}
          className="flex items-center text-xs gap-1 text-sm px-3 py-2 h-auto"
        >
          <Plus className="w-4 h-4" />
          Add Employee
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded flex items-center text-xs gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span className="text-sm text-red-700 dark:text-red-300">
            {error}
          </span>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, email, or designation..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800  dark: placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-[0.5px] flex items-center justify-center p-4 z-50 transition-all duration-300">
          <div className="rounded-xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 animate-in fade-in scale-95 duration-300">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-700 dark:text-white text-left">
                  {editingEmployee ? "Edit Employee" : "Create New Employee"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 text-left mt-0.5">
                  {editingEmployee 
                    ? "Update employee profile and credentials" 
                    : "Register a new employee to the system"}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingEmployee(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all ml-4"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-hidden flex flex-col">
              <div className="p-6 space-y-5 overflow-auto max-h-[calc(90vh-140px)] bg-white dark:bg-slate-900">
                {/* Personal Information */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3 ml-0.5">
                    Personal Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-left ml-0.5">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g. John"
                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-left ml-0.5">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g. Doe"
                        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-left ml-0.5">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        placeholder="john.doe@sterling.com"
                        className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Account Access */}
                <div className="pt-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-3 ml-0.5">
                    Account Access
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-left ml-0.5">
                        Login ID
                      </label>
                      <input
                        type="text"
                        name="loginId"
                        value={
                          formData.loginId ||
                          (editingEmployee
                            ? ""
                            : generateLoginId(
                                formData.firstName,
                                formData.lastName
                              ))
                        }
                        onChange={handleInputChange}
                        readOnly={editingEmployee}
                        className={`w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg transition-all ${
                          editingEmployee
                            ? "bg-slate-50 dark:bg-slate-800/50 text-slate-500 italic"
                            : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-left ml-0.5">
                        {editingEmployee ? "Update Password" : "Set Password"} <span className="text-red-500">{editingEmployee ? "" : "*"}</span>
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          required={!editingEmployee}
                          placeholder={editingEmployee ? "Leave blank to keep same" : "••••••••"}
                          className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fixed Information */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700 dark:text-white">Employee Role</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Default permissions applied</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-full uppercase">Active</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingEmployee(null);
                  }}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg shadow-lg shadow-green-600/20 flex items-center gap-2 transition-all active:scale-95"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  {editingEmployee ? "Update Account" : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Registration Dialog */}
      {showRegisterDialog && registeringEmployee && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-3 h-3 text-blue-600" />
                Register Employee
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-700/50">
                <p className="text-sm text-blue-900 dark:text-blue-300">
                  Send registration credentials to{" "}
                  <strong>
                    {registeringEmployee.firstName}{" "}
                    {registeringEmployee.lastName}
                  </strong>
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Email Address
                </p>
                <p className="text-sm font-medium text-slate-900 text-left dark:text-slate-100">
                  {registeringEmployee.email}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Login ID
                </p>
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                  <p className="font-mono text-sm text-slate-900 dark:text-slate-100">
                    {registeringEmployee.loginId}
                  </p>
                  <button
                    onClick={() => copyToClipboard(registeringEmployee.loginId)}
                    className="text-xs  bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded hover:bg-blue-200"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Temporary Password
                </p>
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                  <p className="font-mono text-sm text-slate-900 dark:text-slate-100">
                    {registeringEmployee.password}
                  </p>
                  <button
                    onClick={() =>
                      copyToClipboard(registeringEmployee.password)
                    }
                    className="text-xs  bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded hover:bg-blue-200"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                ⚠️ Employee must change password on first login
              </p>

              <div className="flex gap-2">
                <Button
                  onClick={sendRegistrationEmail}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Mail className="w-4 h-4" />
                  Send Email
                </Button>
                <Button
                  onClick={() => setShowRegisterDialog(false)}
                  variant="secondary"
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredEmployees.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="w-12 h-12 text-slate-300 dark:text-slate-500 mb-3" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
            No employees found
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {searchTerm
              ? "Try adjusting your search filters"
              : "Create your first employee to get started"}
          </p>
        </div>
      )}

      {/* Employee Table */}
      {filteredEmployees.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={filteredEmployees}
              sortable={true}
              striped={true}
              hover={true}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmployeeManagement;
