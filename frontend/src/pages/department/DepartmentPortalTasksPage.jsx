import { useState, useEffect, useCallback } from "react";
import axios from "../../utils/api";
import Card, {
  CardContent,
  CardTitle,
  CardHeader,
} from "../../components/ui/Card";
import DataTable from "../../components/ui/DataTable/DataTable";
import SwipeButton from "../../components/ui/SwipeButton";
import { Modal, ModalBody, ModalFooter } from "../../components/ui/Modal";
import {
  ClipboardList,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Eye,
  Info,
  User,
  Tag
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Swal from "sweetalert2";

const DepartmentPortalTasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const { user } = useAuth();

  const fetchTasks = useCallback(async () => {
    if (!user?.departmentId) return;
    try {
      setLoading(true);
      const response = await axios.get(`/departmental-tasks/department/${user.departmentId}`);
      setTasks(response.data || []);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.departmentId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleStatusUpdate = async (taskId, newStatus) => {
    try {
      setIsUpdating(true);
      await axios.patch(`/departmental-tasks/${taskId}/status`, { status: newStatus });
      
      Swal.fire({
        title: "Success",
        text: `Task marked as ${newStatus}`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false
      });
      fetchTasks();
      if (selectedTask?.id === taskId) {
        if (newStatus === 'Completed') {
          setShowViewModal(false);
        } else {
          setSelectedTask(prev => ({ ...prev, status: newStatus }));
        }
      }
    } catch (error) {
      console.error("Status update error:", error);
      Swal.fire("Error", "Failed to update status", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const columns = [
    {
      label: "Task Title",
      key: "title",
      render: (value, row) => (
        <span className=" text-slate-900">{row.title}</span>
      ),
    },
    {
      label: "Assigned Date",
      key: "assignment_date",
      render: (value) => (
        <div className="flex items-center text-sm text-slate-600">
          <Calendar size={14} className="mr-1.5 text-blue-500" />
          {new Date(value).toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })}
        </div>
      ),
    },
    {
      label: "Due Date",
      key: "due_date",
      render: (value) => (
        <div className="flex items-center text-sm text-slate-600">
          <Calendar size={14} className="mr-1.5 text-amber-500" />
          {new Date(value).toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })}
        </div>
      ),
    },
    {
      label: "Priority",
      key: "priority",
      render: (value) => {
        const priorityColors = {
          High: "bg-red-100 text-red-700 border-red-200",
          Medium: "bg-amber-100 text-amber-700 border-amber-200",
          Low: "bg-green-100 text-green-700 border-green-200",
        };
        return (
          <span className={`px-2.5 py-1 rounded-full text-[10px]    border ${priorityColors[value] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
            {value}
          </span>
        );
      },
    },
    {
      label: "Status",
      key: "status",
      render: (value) => {
        const status = value || "Pending";
        const statusConfig = {
          Pending: { color: "text-amber-600 bg-amber-50", icon: Clock },
          Completed: { color: "text-green-600 bg-green-50", icon: CheckCircle2 },
        };
        const config = statusConfig[status] || statusConfig.Pending;
        const Icon = config.icon;

        return (
          <div className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs  ${config.color}`}>
            <Icon size={14} className="mr-1.5" />
            {status}
          </div>
        );
      },
    },
    {
      label: "Actions",
      key: "actions",
      render: (_, row) => (
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          onClick={() => {
            setSelectedTask(row);
            setShowViewModal(true);
          }}
        >
          <Eye size={16} />
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 ">
        <div className="flex items-center gap-4">
          
          <div>
            <h1 className="text-xl  text-slate-900">
              Departmental Tasks
            </h1>
            <p className="text-slate-500 text-sm">
              Tasks assigned by Admin to the <span className=" text-blue-600 ">{user?.department}</span> department
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <p className="text-xs text-slate-400 font-medium  ">Last Sync</p>
            <p className="text-sm  text-slate-700">Just now</p>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchTasks} className="rounded-full h-10 w-10 p-0 hover:bg-slate-100">
            <Clock size={20} className="text-slate-600" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 my-3 gap-6">
        <Card className="bg-white border-none  ring-1 ring-slate-200">
          <CardContent className="p-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm  text-slate-500  ">Pending</p>
              <div className="p-2 bg-amber-50 rounded-lg">
                <Clock className="text-amber-600" size={18} />
              </div>
            </div>
            <h3 className="text-xl  text-slate-900">
              {tasks.filter(t => t.status === 'Pending' || !t.status).length}
            </h3>
          </CardContent>
        </Card>
        <Card className="bg-white border-none  ring-1 ring-slate-200">
          <CardContent className="p-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm  text-slate-500  ">Completed</p>
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle2 className="text-green-600" size={18} />
              </div>
            </div>
            <h3 className="text-xl  text-slate-900">
              {tasks.filter(t => t.status === 'Completed').length}
            </h3>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border-none  ring-1 ring-slate-200 overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-200 px-6 py-4">
          <CardTitle className="text-lg  text-slate-800">Your Department's Task List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={tasks}
            loading={loading}
          />
          {!loading && tasks.length === 0 && (
            <div className="py-20 text-center">
              <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={40} className="text-slate-300" />
              </div>
              <h3 className="text-xl  text-slate-800">No Assignments Yet</h3>
              <p className="text-slate-500 mt-2">Check back later for new tasks assigned to your department.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Details Modal */}
      <Modal 
        isOpen={showViewModal} 
        onClose={() => setShowViewModal(false)} 
        size="lg"
        title="Task Details"
      >
        {selectedTask && (
          <div className="flex flex-col h-full">
            <ModalBody className="p-6 space-y-6">
              {/* Header Info */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <h2 className="text-xl  text-slate-900 mb-1">{selectedTask.title}</h2>
                  <p className="text-sm text-slate-500">
                    Assigned to <span className=" text-blue-600">{user?.department}</span> Department
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge className={
                    selectedTask.priority === 'High' ? 'bg-red-100 text-red-700' :
                    selectedTask.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-green-100 text-green-700'
                  }>
                    {selectedTask.priority} Priority
                  </Badge>
                  <Badge className={
                    selectedTask.status === 'Completed' ? 'bg-green-100 text-green-700' : 
                    'bg-amber-100 text-amber-700'
                  }>
                    {selectedTask.status || 'Pending'}
                  </Badge>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h3 className="text-sm  text-slate-400  tracking-widest flex items-center gap-2">
                  <Info size={14} className="text-blue-500" /> Description
                </h3>
                <div className="bg-slate-50 rounded-xl p-4 text-slate-700 leading-relaxed border border-slate-100 text-sm">
                  {selectedTask.description || "No additional details provided for this task."}
                </div>
              </div>

              {/* Grid Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                <div className="space-y-4">
                  <h3 className="text-sm  text-slate-400  tracking-widest flex items-center gap-2">
                    <Calendar size={14} className="text-blue-500" /> Timeline
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <p className="text-[10px] text-slate-400   mb-1">Assigned On</p>
                      <p className="text-sm  text-slate-700">
                        {new Date(selectedTask.assignment_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <p className="text-[10px] text-slate-400   mb-1">Due Date</p>
                      <p className="text-sm  text-slate-700">
                        {new Date(selectedTask.due_date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm  text-slate-400  tracking-widest flex items-center gap-2">
                    <Tag size={14} className="text-blue-500" /> Assignment
                  </h3>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-[10px] text-slate-400   mb-1">Assigned By</p>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px]  text-blue-600">
                        {selectedTask.assignedByName?.charAt(0) || 'A'}
                      </div>
                      <p className="text-sm  text-slate-700">{selectedTask.assignedByName || 'Administrator'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </ModalBody>
            <ModalFooter className="bg-slate-50 border-t border-slate-200 p-6 px-8">
              <div className="flex flex-col gap-4 w-full">
                {selectedTask.status !== 'Completed' && (
                  <div className="w-full">
                    <SwipeButton
                      onSwipeComplete={() => handleStatusUpdate(selectedTask.id, 'Completed')}
                      isLoading={isUpdating}
                      isCompleted={selectedTask.status === 'Completed'}
                    />
                  </div>
                )}

                {selectedTask.status === 'Completed' && (
                  <div className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-green-50 text-green-700 rounded border border-green-100 ">
                    <CheckCircle2 size={20} /> Task Successfully Completed
                  </div>
                )}

                <Button 
                  variant="ghost" 
                  onClick={() => setShowViewModal(false)}
                  className="text-slate-500 hover:text-slate-700 w-full "
                >
                  Close View
                </Button>
              </div>
            </ModalFooter>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DepartmentPortalTasksPage;
