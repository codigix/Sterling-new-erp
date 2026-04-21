import { useState, useEffect, useCallback } from "react";
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
  CheckCircle2,
  ClipboardList,
  Clock,
  Calendar,
  Filter
} from "lucide-react";

const DepartmentTasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    departmentId: "",
    priority: "Medium",
    assignmentDate: new Date().toISOString().split('T')[0],
    dueDate: "",
  });

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await axios.get("/admin/departments");
      setDepartments(response.data || []);
    } catch (err) {
      console.error("Failed to fetch departments:", err);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get("/departmental-tasks/all");
      
      // Map department name from departments list
      const tasksWithDeptNames = (response.data || []).map(task => {
        const dept = departments.find(d => d.id === task.department_id);
        return {
          ...task,
          departmentName: dept ? dept.name : `Dept ${task.department_id}`,
          assignmentDate: task.assignment_date,
          dueDate: task.due_date
        };
      });
      
      setTasks(tasksWithDeptNames);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setLoading(false);
    }
  }, [departments]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    if (departments.length > 0) {
      fetchTasks();
    }
  }, [departments, fetchTasks]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTask) {
        await axios.put(`/departmental-tasks/${editingTask.id}`, formData);
      } else {
        await axios.post("/departmental-tasks/create", formData);
      }
      
      Swal.fire({
        title: "Success",
        text: `Task ${editingTask ? "updated" : "created"} successfully`,
        icon: "success",
      });
      setShowModal(false);
      resetForm();
      fetchTasks();
    } catch (err) {
      console.error("Save Error:", err);
      Swal.fire("Error", "Failed to save task", "error");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      departmentId: "",
      priority: "Medium",
      assignmentDate: new Date().toISOString().split('T')[0],
      dueDate: "",
    });
    setEditingTask(null);
  };

  const columns = [
    {
      label: "Task Title",
      key: "title",
      render: (value, row) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-900">{row.title}</span>
          <span className="text-xs text-slate-500 line-clamp-1">{row.description}</span>
        </div>
      ),
    },
    {
      label: "Department",
      key: "departmentName",
      render: (value) => (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          {value}
        </span>
      ),
    },
    {
      label: "Assigned By",
      key: "assignedByName",
      render: (value) => (
        <span className="text-xs text-slate-600 font-medium">
          {value || "Admin"}
        </span>
      ),
    },
    {
      label: "Priority",
      key: "priority",
      render: (value) => {
        const priorityColors = {
          High: "bg-red-100 text-red-700",
          Medium: "bg-amber-100 text-amber-700",
          Low: "bg-green-100 text-green-700",
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[value] || "bg-slate-100"}`}>
            {value}
          </span>
        );
      },
    },
    {
      label: "Dates",
      key: "dates",
      render: (_, row) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center text-xs text-slate-600">
            <Calendar size={14} className="mr-1 text-blue-500" />
            <span className="font-medium">Assign:</span> {new Date(row.assignmentDate).toLocaleDateString()}
          </div>
          <div className="flex items-center text-xs text-slate-600">
            <Clock size={14} className="mr-1 text-amber-500" />
            <span className="font-medium">Due:</span> {new Date(row.dueDate).toLocaleDateString()}
          </div>
        </div>
      ),
    },
    {
      label: "Status",
      key: "status",
      render: (value) => (
        <span className="flex items-center text-xs font-medium text-slate-700">
          <CheckCircle2 size={14} className="mr-1 text-slate-400" />
          {value || "Pending"}
        </span>
      ),
    },
    {
      label: "Actions",
      key: "actions",
      render: (_, row) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingTask(row);
              setFormData({
                title: row.title,
                description: row.description,
                departmentId: row.department_id,
                priority: row.priority,
                assignmentDate: row.assignmentDate.split('T')[0],
                dueDate: row.dueDate.split('T')[0],
              });
              setShowModal(true);
            }}
          >
            <Edit2 size={16} className="text-blue-600" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)}>
            <Trash2 size={16} className="text-red-600" />
          </Button>
        </div>
      ),
    },
  ];

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDept = filterDepartment === "all" || task.department_id.toString() === filterDepartment.toString();
    return matchesSearch && matchesDept;
  });

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await axios.delete(`/departmental-tasks/${id}`);
        Swal.fire("Deleted!", "Task has been deleted.", "success");
        fetchTasks();
      } catch (err) {
        Swal.fire("Error", "Failed to delete task", "error");
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="text-blue-600" />
            Assign Department Task
          </h1>
          <p className="text-slate-500 text-sm">Assign and track tasks for different departments</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus size={18} />
          Assign New Task
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <ClipboardList className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Total Tasks</p>
              <h3 className="text-2xl font-bold text-slate-900">{tasks.length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-lg">
              <Clock className="text-amber-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Pending Tasks</p>
              <h3 className="text-2xl font-bold text-slate-900">
                {tasks.filter(t => t.status !== 'Completed').length}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle2 className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Completed</p>
              <h3 className="text-2xl font-bold text-slate-900">
                {tasks.filter(t => t.status === 'Completed').length}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-slate-200">
        <CardHeader className="bg-white border-b border-slate-200 p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search tasks..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-slate-400" />
              <select
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filteredTasks}
            loading={loading}
          />
          {!loading && filteredTasks.length === 0 && (
            <div className="py-12 text-center">
              <ClipboardList size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No tasks found</h3>
              <p className="text-slate-500">Assign your first departmental task to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Assignment Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} size="lg">
        <form onSubmit={handleSubmit}>
          <ModalBody>
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900">
                {editingTask ? "Edit Task" : "Assign New Departmental Task"}
              </h2>
              
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Task Title</label>
                <input
                  type="text"
                  name="title"
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Enter task title"
                  value={formData.title}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Enter task details..."
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Department</label>
                  <select
                    name="departmentId"
                    required
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    value={formData.departmentId}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Priority</label>
                  <select
                    name="priority"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    value={formData.priority}
                    onChange={handleInputChange}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Assignment Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="date"
                      name="assignmentDate"
                      required
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.assignmentDate}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Due Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="date"
                      name="dueDate"
                      required
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.dueDate}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingTask ? "Update Task" : "Assign Task"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
};

export default DepartmentTasksPage;
