import { useState, useEffect, useCallback } from "react";
import axios from "../../utils/api";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import Card, {
  CardContent,
  CardTitle,
  
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
  Filter,
  Download,
  FileSpreadsheet
} from "lucide-react";

const DepartmentTasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [exporting, setExporting] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  
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

  const isCompletedLate = (row) => {
    const isCompleted = row.status === 'Completed' || row.status === 'completed';
    if (!isCompleted) return false;
    const finishedAt = row.completed_date || row.updated_at;
    if (!row.dueDate || !finishedAt) return false;
    
    const due = new Date(row.dueDate);
    due.setHours(0, 0, 0, 0);
    
    const completedDate = new Date(finishedAt);
    completedDate.setHours(0, 0, 0, 0);
    
    return completedDate > due;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleExportToExcel = () => {
    setExporting(true);
    
    // Wrap the synchronous Excel sheet generation in a setTimeout to allow the UI to update with a loading spinner.
    setTimeout(() => {
      try {
        // Format the tasks for exporting
        const exportData = filteredTasks.map((task) => {
          // Find completion date
          const isCompleted = task.status === 'Completed' || task.status === 'completed';
          let doneDate = 'N/A';
          if (isCompleted && (task.completed_date || task.updated_at)) {
            doneDate = formatDate(task.completed_date || task.updated_at);
          }

          // Determine late / overdue status details
          let statusDetail = task.status || 'Pending';
          if (isCompleted) {
            const isLate = isCompletedLate(task);
            if (isLate) {
              statusDetail = 'Completed (Delayed)';
            }
          } else {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const due = new Date(task.dueDate);
            due.setHours(0, 0, 0, 0);
            const isOverdue = due < today;
            if (isOverdue) {
              statusDetail = 'Overdue';
            }
          }

          return {
            "Task Title": task.title || "",
            "Description": task.description || "",
            "Department": task.departmentName || "",
            "Assigned By": task.assignedByName || "Admin",
            "Priority": task.priority || "Medium",
            "Assignment Date": formatDate(task.assignmentDate),
            "Due Date": formatDate(task.dueDate),
            "Completed Date": doneDate,
            "Status": statusDetail
          };
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Departmental Tasks");
        XLSX.writeFile(wb, "Departmental_Tasks.xlsx");
      } catch (err) {
        console.error("Export to Excel error:", err);
      } finally {
        setExporting(false);
      }
    }, 800);
  };

  const columns = [
    {
      label: "Task Title",
      key: "title",
      render: (value, row) => (
        <div className="flex flex-col">
          <span className=" text-slate-900">{row.title}</span>
          <span className="text-xs text-slate-500 line-clamp-1">{row.description}</span>
        </div>
      ),
    },
    {
      label: "Department",
      key: "departmentName",
      render: (value) => (
        <span className="px-2 py-1 rounded-full text-xs  bg-blue-100 text-blue-700">
          {value}
        </span>
      ),
    },
    {
      label: "Assigned By",
      key: "assignedByName",
      render: (value) => (
        <span className="text-xs text-slate-600 ">
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
          <span className={`px-2 py-1 rounded-full text-xs  ${priorityColors[value] || "bg-slate-100"}`}>
            {value}
          </span>
        );
      },
    },
    {
      label: "Dates",
      key: "dates",
      render: (_, row) => {
        const isCompleted = row.status === 'Completed' || row.status === 'completed';
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center text-xs text-slate-600">
              <Calendar size={14} className="mr-1 text-blue-500" />
              <span className="">Assign:</span> {formatDate(row.assignmentDate)}
            </div>
            <div className="flex items-center text-xs text-slate-600">
              <Clock size={14} className="mr-1 text-amber-500" />
              <span className="">Due:</span> {formatDate(row.dueDate)}
            </div>
            {isCompleted && (row.completed_date || row.updated_at) && (
              <div className="flex items-center text-xs text-slate-600">
                <CheckCircle2 size={14} className="mr-1 text-green-500" />
                <span className="font-semibold text-green-600">Done:</span> {formatDate(row.completed_date || row.updated_at)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      label: "Status",
      key: "status",
      render: (value, row) => {
        const isCompleted = value === 'Completed' || value === 'completed';
        if (isCompleted) {
          const isLate = isCompletedLate(row);
          if (isLate) {
            return (
              <span className="flex items-center text-xs font-semibold text-amber-600">
                <CheckCircle2 size={14} className="mr-1 text-amber-500 animate-pulse" />
                Completed (Delayed)
              </span>
            );
          }
          return (
            <span className="flex items-center text-xs font-semibold text-green-600">
              <CheckCircle2 size={14} className="mr-1 text-green-500" />
              Completed
            </span>
          );
        }

        // Non-completed: check if overdue (due date in the past)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(row.dueDate);
        due.setHours(0, 0, 0, 0);
        const isOverdue = due < today;
        if (isOverdue) {
          return (
            <span className="flex items-center text-xs font-semibold text-red-600">
              <AlertCircle size={14} className="mr-1 text-red-500 animate-pulse" />
              Overdue
            </span>
          );
        }

        return (
          <span className="flex items-center text-xs text-slate-700">
            <Clock size={14} className="mr-1 text-slate-400" />
            {value || "Pending"}
          </span>
        );
      },
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
    let matchesSearch = true;
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      const fieldsToSearch = [
        task.title,
        task.description,
        task.departmentName,
        task.assignedByName,
        task.priority,
        task.status
      ];
      matchesSearch = fieldsToSearch.some(field => 
        field && String(field).toLowerCase().includes(lowerSearch)
      );
    }
    const matchesDept = filterDepartment === "all" || task.department_id.toString() === filterDepartment.toString();
    
    let matchesDate = true;
    if (task.assignmentDate) {
      const taskAssignDate = task.assignmentDate.split('T')[0];
      if (startDateFilter) {
        matchesDate = matchesDate && taskAssignDate >= startDateFilter;
      }
      if (endDateFilter) {
        matchesDate = matchesDate && taskAssignDate <= endDateFilter;
      }
    }

    let matchesStatus = true;
    if (filterStatus !== "all") {
      const isCompleted = task.status === 'Completed' || task.status === 'completed';
      if (filterStatus === "Completed") {
        matchesStatus = isCompleted;
      } else if (filterStatus === "Completed (Delayed)") {
        matchesStatus = isCompleted && isCompletedLate(task);
      } else if (filterStatus === "Overdue") {
        if (isCompleted) {
          matchesStatus = false;
        } else {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const due = new Date(task.dueDate);
          due.setHours(0, 0, 0, 0);
          matchesStatus = due < today;
        }
      } else if (filterStatus === "Pending") {
        if (isCompleted) {
          matchesStatus = false;
        } else {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const due = new Date(task.dueDate);
          due.setHours(0, 0, 0, 0);
          matchesStatus = due >= today;
        }
      }
    }
    
    return matchesSearch && matchesDept && matchesDate && matchesStatus;
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

  const getTaskCounts = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let completed = 0;
    let pending = 0;
    let overdue = 0;
    let completedDelayed = 0;

    tasks.forEach(t => {
      const isCompleted = t.status === 'Completed' || t.status === 'completed';
      if (isCompleted) {
        completed++;
        if (t.dueDate && t.updated_at) {
          const due = new Date(t.dueDate);
          due.setHours(0, 0, 0, 0);
          const completedDate = new Date(t.updated_at);
          completedDate.setHours(0, 0, 0, 0);
          if (completedDate > due) {
            completedDelayed++;
          }
        }
      } else {
        const hasDueDate = !!t.dueDate;
        if (hasDueDate) {
          const due = new Date(t.dueDate);
          due.setHours(0, 0, 0, 0);
          if (due < today) {
            overdue++;
          } else {
            pending++;
          }
        } else {
          pending++;
        }
      }
    });

    return { total: tasks.length, completed, pending, overdue, completedDelayed };
  };

  const { total, completed, pending, overdue, completedDelayed } = getTaskCounts();

  return (
    <div className=" space-y-2 p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl  text-slate-900 flex items-center gap-2">
            Assign Department Task
          </h1>
          <p className="text-slate-500 text-xs">Assign and track tasks for different departments</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportToExcel}
            variant="success"
            loading={exporting}
            className="flex items-center gap-2"
          >
            <FileSpreadsheet size={15} />
            Export to Excel
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus size={15} />
            Assign New Task
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-white">
          <CardContent className=" flex items-center gap-4">
            <div className=" bg-blue-100 rounded">
              <ClipboardList className="text-blue-600" size={15} />
            </div>
            <div>
              <p className="text-sm text-slate-500 ">Total Tasks</p>
              <h3 className="text-xl  text-slate-900">{total}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="flex items-center gap-4">
            <div className=" bg-amber-100 rounded">
              <Clock className="text-amber-600" size={15} />
            </div>
            <div>
              <p className="text-sm text-slate-500 ">Pending Tasks</p>
              <h3 className="text-xl  text-slate-900">{pending}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className=" flex items-center gap-4">
            <div className=" bg-green-100 rounded">
              <CheckCircle2 className="text-green-600" size={15} />
            </div>
            <div>
              <p className="text-sm text-slate-500 ">Completed</p>
              <h3 className="text-xl  text-slate-900">{completed}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-l-4 border-amber-500 shadow-sm">
          <CardContent className=" flex items-center gap-4">
            <div className=" bg-amber-100 rounded p-2">
              <AlertCircle className="text-amber-600 animate-pulse" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500 ">Completed (Delayed)</p>
              <h3 className="text-xl font-bold text-slate-900 text-amber-600">{completedDelayed}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-l-4 border-red-500 shadow-sm">
          <CardContent className=" flex items-center gap-4">
            <div className=" bg-red-100 rounded p-2">
              <AlertCircle className="text-red-600 animate-pulse" size={20} />
            </div>
            <div>
              <p className="text-sm text-slate-500 ">Overdue Tasks</p>
              <h3 className="text-xl font-bold text-slate-900 text-red-600">{overdue}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filteredTasks}
            loading={loading}
            onSearch={(val) => setSearchTerm(val)}
            initialSearchValue={searchTerm}
            titleExtra={
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Department Filter */}
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-slate-400" />
                  <span className="text-xs font-medium text-slate-500">Department:</span>
                  <select
                    className="border border-slate-200 rounded p-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700 shadow-sm cursor-pointer hover:border-slate-300 transition-colors min-w-[150px]"
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

                {/* Status Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">Status:</span>
                  <select
                    className="border border-slate-200 rounded p-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700 shadow-sm cursor-pointer hover:border-slate-300 transition-colors min-w-[130px]"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Completed">Completed</option>
                    <option value="Completed (Delayed)">Completed (Delayed)</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>

                {/* Date Filter */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">From:</span>
                    <input
                      type="date"
                      className="border border-slate-200 rounded p-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700 shadow-sm cursor-pointer hover:border-slate-300 transition-colors"
                      value={startDateFilter}
                      onChange={(e) => setStartDateFilter(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">To:</span>
                    <input
                      type="date"
                      className="border border-slate-200 rounded p-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700 shadow-sm cursor-pointer hover:border-slate-300 transition-colors"
                      value={endDateFilter}
                      onChange={(e) => setEndDateFilter(e.target.value)}
                    />
                  </div>
                  {(startDateFilter || endDateFilter) && (
                    <button
                      onClick={() => { setStartDateFilter(""); setEndDateFilter(""); }}
                      className="text-xs text-red-500 hover:text-red-700 transition-colors ml-2 font-medium"
                    >
                      Clear Date
                    </button>
                  )}
                </div>
              </div>
            }
          />
          {!loading && filteredTasks.length === 0 && (
            <div className="py-12 text-center">
              <ClipboardList size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg  text-slate-900">No tasks found</h3>
              <p className="text-slate-500">Assign your first departmental task to get started.</p>
            </div>
          )}
        </CardContent>

      {/* Task Assignment Modal */}
      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        size="lg"
        title={editingTask ? "Edit Task" : "Assign New Departmental Task"}
        closeOnOverlayClick={false}
      >
        <form onSubmit={handleSubmit}>
          <ModalBody>
            <div className="space-y-2">
              
              <div className="space-y-1">
                <label className="text-xs  text-slate-700">Task Title</label>
                <input
                  type="text"
                  name="title"
                  required
                  className="w-full p-2 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  placeholder="Enter task title"
                  value={formData.title}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs  text-slate-700">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  className="w-full p-2 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  placeholder="Enter task details..."
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs  text-slate-700">Department</label>
                  <select
                    name="departmentId"
                    required
                    className="w-full p-2 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 outline-none text-xs bg-white"
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
                  <label className="text-xs  text-slate-700">Priority</label>
                  <select
                    name="priority"
                    className="w-full p-2 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 outline-none text-xs bg-white"
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
                  <label className="text-xs  text-slate-700">Assignment Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      type="date"
                      name="assignmentDate"
                      required
                      className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.assignmentDate}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs  text-slate-700">Due Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                      type="date"
                      name="dueDate"
                      required
                      className="w-full pl-10 text-xs pr-4 py-2 border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 outline-none"
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
