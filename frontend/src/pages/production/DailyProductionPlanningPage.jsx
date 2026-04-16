import React, { useState, useCallback, useMemo, memo, useEffect } from "react";
import axios from "../../utils/api";
import { toast } from "react-toastify";
import {
  Plus,
  Trash2,
  Save,
  ChevronDown,
  Clock,
  User,
  LayoutDashboard,
  Settings2,
  Calendar,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Filter,
  X,
  PackageCheck,
  Target,
  Activity,
  Zap,
  Briefcase,
  Clipboard,
  Loader2,
  Eye,
  Package,
  Pencil,
  Edit2,
  Check,
  FileText,
  Scissors,
  PlusCircle
} from "lucide-react";
import SearchableSelect from "../../components/ui/SearchableSelect";
import { renderDimensions } from "../../utils/dimensionUtils";

// Reuse Accordion component for the Modal structure
const AccordionSection = memo(({ title, section, children, itemCount = 0, expandedSections, toggleSection }) => (
  <div className="">
    <div className={`p-2 flex items-center justify-between cursor-pointer select-none transition-colors ${expandedSections[section] ? "bg-slate-50/80 dark:bg-slate-800/50" : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30"}`}
      onClick={() => toggleSection(section)}
    >
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded transition-colors ${expandedSections[section] ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
          <ChevronDown
            size={14}
            className={`transition-transform duration-300 ${expandedSections[section] ? "" : "-rotate-90"}`}
          />
        </div>
        <h3 className="text-sm  text-slate-900 dark:text-white  ">
          {title}
        </h3>
        {itemCount > 0 && (
          <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded ">
            {itemCount} Assignments
          </span>
        )}
      </div>
    </div>
    {expandedSections[section] && (
      <div className=" border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
        {children}
      </div>
    )}
  </div>
));

const CreatePlanModal = ({ isOpen, onClose, planDate, onSave, projects, operators, operations, loading, mode = "create", initialData }) => {
  const [selectedProject, setSelectedProject] = useState(null);
  const [showReleasedMaterials, setShowReleasedMaterials] = useState(false);
  const [releasedMaterials, setReleasedMaterials] = useState([]);
  const [fetchingMaterials, setFetchingMaterials] = useState(false);
  const [entryOptions, setEntryOptions] = useState([]);
  const [selectedReleaseEntry, setSelectedReleaseEntry] = useState(null);
  const [localPlanDate, setLocalPlanDate] = useState(planDate);
  const [expandedSections, setExpandedSections] = useState({
    project: true,
    allocation: true,
    summary: true,
  });

  const [newAssignment, setNewAssignment] = useState({
    operation: "",
    operator: "",
    startTime: "09:00",
    startPeriod: "AM",
    endTime: "",
    endPeriod: "PM",
    breakTime: "60",
    remarks: ""
  });

  const [dailyPlan, setDailyPlan] = useState([]);
  const [editingAssignmentId, setEditingAssignmentId] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    operator: "",
    operation: "",
    startTime: "",
    startPeriod: "AM",
    endTime: "",
    endPeriod: "PM",
    remarks: "",
    breakTime: "60"
  });

  const to24h = (timeStr, period) => {
    if (!timeStr) return null;
    try {
      let [hours, minutes] = timeStr.split(':');
      hours = parseInt(hours);
      if (period === "PM" && hours < 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;
      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    } catch (e) {
      return timeStr;
    }
  };

  const calculateHours = useCallback((startStr, startPeriod, endStr, endPeriod, breakMins) => {
    if (!startStr || !endStr) return 0;
    try {
      const s24 = to24h(startStr, startPeriod);
      const e24 = to24h(endStr, endPeriod);
      
      const start = new Date(`2000-01-01T${s24}`);
      let end = new Date(`2000-01-01T${e24}`);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
      
      // Handle cross-midnight
      if (end <= start) {
        end = new Date(`2000-01-02T${e24}`);
      }
      
      const diffHrs = (end - start) / (1000 * 60 * 60);
      const bHrs = (parseInt(breakMins) || 0) / 60;
      return Math.max(0, diffHrs - bHrs);
    } catch (e) {
      return 0;
    }
  }, []);

  const from24h = (timeStr) => {
    if (!timeStr) return { time: "", period: "AM" };
    try {
      let [hours, minutes] = timeStr.split(':');
      hours = parseInt(hours);
      const period = hours >= 12 ? "PM" : "AM";
      let h12 = hours % 12;
      if (h12 === 0) h12 = 12;
      return {
        time: `${h12.toString().padStart(2, '0')}:${minutes}`,
        period
      };
    } catch (e) {
      return { time: timeStr, period: "AM" };
    }
  };

  const format12h = (timeStr) => {
    if (!timeStr) return "";
    const { time, period } = from24h(timeStr);
    return `${time} ${period}`;
  };

  // Sync initial data when in edit/view mode
  useEffect(() => {
    if ((mode === "edit" || mode === "view") && initialData?.plan?.plan_date) {
      const pDate = initialData.plan.plan_date.split('T')[0];
      setLocalPlanDate(pDate);
      const assignments = initialData.assignments.map(a => {
        const startTime24 = a.start_time?.substring(0, 5);
        const endTime24 = a.end_time?.substring(0, 5);
        const breakTime = a.break_time || 0;
        
        // Use backend value if provided and > 0, otherwise calculate
        const totalHours = parseFloat(a.total_hours) > 0 
          ? parseFloat(a.total_hours) 
          : calculateHours(startTime24, "AM", endTime24, "AM", breakTime); 

        return {
          ...a,
          id: a.id,
          projectName: a.project_name,
          projectRef: a.root_card_id,
          operation_name: a.operation_name,
          operator_name: a.operator_name,
          start_time: startTime24,
          end_time: endTime24,
          break_time: breakTime,
          total_hours: totalHours
        };
      });
      setDailyPlan(assignments);

      // Auto-select first project from assignments if available
      if (assignments.length > 0) {
        const firstAssignment = assignments[0];
        const proj = projects.find(p => p.value === firstAssignment.root_card_id);
        if (proj) {
          setSelectedProject(proj);
          fetchReleasedMaterials(proj.name);
        }
      }
    } else {
      setLocalPlanDate(planDate);
      setDailyPlan([]);
      setSelectedProject(null);
    }
    setEditingAssignmentId(null);
    setSelectedReleaseEntry(null);
  }, [mode, initialData, isOpen, projects, planDate, calculateHours]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const fetchReleasedMaterials = async (projectName) => {
    if (!projectName) return;
    try {
      setFetchingMaterials(true);
      const response = await axios.get(`/inventory/stock-entries?type=Material Issue`);
      const movements = response.data.movements || [];

      // Filter by project name accurately
      const projectMaterials = movements.filter(m =>
        m.project_name && m.project_name.toLowerCase().trim() === projectName.toLowerCase().trim()
      );

      setReleasedMaterials(projectMaterials);

      // Format options for Inventory Release Entries (ST#)
      const entries = projectMaterials.map(m => ({
        value: m.entry_no,
        label: m.entry_no,
        subLabel: `Date: ${new Date(m.entry_date).toLocaleDateString()} | ${m.remarks || ""}`
      }));
      setEntryOptions(entries);

      // Auto-select if there's only one entry and not in edit/view mode
      if (entries.length === 1 && !selectedReleaseEntry) {
        setSelectedReleaseEntry(entries[0].value);
      }

    } catch (error) {
      console.error("Error fetching released materials:", error);
    } finally {
      setFetchingMaterials(false);
    }
  };

  const currentLoad = useMemo(() => {
    return calculateHours(newAssignment.startTime, newAssignment.startPeriod, newAssignment.endTime, newAssignment.endPeriod, newAssignment.breakTime);
  }, [newAssignment.startTime, newAssignment.startPeriod, newAssignment.endTime, newAssignment.endPeriod, newAssignment.breakTime, calculateHours]);

  const handleAddAssignment = () => {
    if (!selectedProject || !newAssignment.operation || !newAssignment.operator) {
      toast.error("Please select project, operation and operator");
      return;
    }

    const totalHours = calculateHours(newAssignment.startTime, newAssignment.startPeriod, newAssignment.endTime, newAssignment.endPeriod, newAssignment.breakTime);
    const s24 = to24h(newAssignment.startTime, newAssignment.startPeriod);
    const e24 = to24h(newAssignment.endTime, newAssignment.endPeriod);

    const operator = operators.find(o => o.value === newAssignment.operator);
    const operation = operations.find(o => o.value === newAssignment.operation || o.name === newAssignment.operation);

    const entry = {
      id: editingAssignmentId || Date.now(),
      root_card_id: selectedProject.id,
      projectName: selectedProject.name,
      projectRef: selectedProject.ref,
      operation_id: operation?.id,
      operation_name: newAssignment.operation,
      operator_id: operator?.id,
      operator_name: operator?.label,
      start_time: s24,
      end_time: e24,
      break_time: parseInt(newAssignment.breakTime || 0),
      total_hours: totalHours,
      remarks: newAssignment.remarks
    };

    setDailyPlan([...dailyPlan, entry]);
    toast.success("Assignment added to plan");

    setNewAssignment({
      operation: "",
      operator: "",
      startTime: "09:00",
      startPeriod: "AM",
      endTime: "",
      endPeriod: "PM",
      breakTime: "60",
      remarks: ""
    });
  };

  const editAssignment = (assignment) => {
    setEditingAssignmentId(assignment.id);
    const startObj = from24h(assignment.start_time);
    const endObj = from24h(assignment.end_time);

    setEditForm({
      operator: assignment.operator_name,
      operation: assignment.operation_name,
      startTime: startObj.time,
      startPeriod: startObj.period,
      endTime: endObj.time,
      endPeriod: endObj.period,
      remarks: assignment.remarks || "",
      breakTime: assignment.break_time || "60"
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateAssignment = () => {
    setDailyPlan(prev => prev.map(a => {
      if (a.id === editingAssignmentId) {
        const totalHours = calculateHours(editForm.startTime, editForm.startPeriod, editForm.endTime, editForm.endPeriod, editForm.breakTime);
        const s24 = to24h(editForm.startTime, editForm.startPeriod);
        const e24 = to24h(editForm.endTime, editForm.endPeriod);

        const operator = operators.find(o => o.value === editForm.operator || o.label === editForm.operator);
        const operation = operations.find(o => o.value === editForm.operation || o.name === editForm.operation);

        return {
          ...a,
          operator_id: operator?.id,
          operator_name: editForm.operator,
          operation_id: operation?.id,
          operation_name: editForm.operation,
          start_time: s24,
          end_time: e24,
          break_time: parseInt(editForm.breakTime || 0),
          total_hours: totalHours,
          remarks: editForm.remarks
        };
      }
      return a;
    }));
    setIsEditModalOpen(false);
    setEditingAssignmentId(null);
    toast.success("Assignment updated");
  };

  const removeAssignment = (id) => {
    setDailyPlan(dailyPlan.filter(a => a.id !== id));
  };

  const handleFinalize = () => {
    if (dailyPlan.length === 0) {
      toast.error("Add at least one assignment to the plan");
      return;
    }

    onSave({ plan_date: localPlanDate, assignments: dailyPlan });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
        <div className="bg-slate-50 dark:bg-slate-950 w-full max-w-5xl rounded shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[98vh]">
          {/* Modal Header - BOM Style */}
        <div className="p-2 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-indigo-600 text-white rounded shadow-lg shadow-indigo-600/20">
              <Calendar size={15} />
            </div>
            <div>
              <h2 className="text-lg  text-slate-900 dark:text-white  ">
                {mode === "view" ? "View Production Plan" : mode === "edit" ? "Edit Production Plan" : "Daily Production Planning"}
              </h2>
              {mode === "view" ? (
                <p className="text-xs  text-slate-500   mt-0.5">
                  Read-only plan view for {new Date(localPlanDate).toLocaleDateString()}
                </p>
              ) : (
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs  text-slate-500  ">
                    Planning Workspace for
                  </p>
                  <input
                    type="date"
                    className="text-xs  text-indigo-600 bg-transparent border-b border-indigo-200 focus:border-indigo-500 outline-none "
                    value={localPlanDate}
                    onChange={(e) => setLocalPlanDate(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors">
              <X size={15} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className=" overflow-y-auto flex-1 p-2">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Main Area */}
            <div className="lg:col-span-9 space-y-4">
              {/* 1. Project Context */}
              <AccordionSection
                title="1. Project Context"
                section="project"
                expandedSections={expandedSections}
                toggleSection={toggleSection}
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-xs  text-slate-400  ">Select Project</label>
                    <SearchableSelect
                      options={projects}
                      value={selectedProject?.value}
                      onChange={(val) => {
                        const proj = projects.find(p => p.value === val);
                        setSelectedProject(proj);
                        setSelectedReleaseEntry(null);
                        setEntryOptions([]);
                        if (proj) fetchReleasedMaterials(proj.name);
                      }}
                      placeholder="Search Project..."
                      disabled={mode === "view"}
                    />
                  </div>
                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-xs  text-slate-400  ">Inventory Release (ST#)</label>
                    <SearchableSelect
                      options={entryOptions}
                      value={selectedReleaseEntry}
                      onChange={(val) => {
                        setSelectedReleaseEntry(val);
                      }}
                      placeholder={selectedProject ? (fetchingMaterials ? "FETCHING..." : "Select Material Piece...") : "..."}
                      disabled={!selectedProject || mode === "view"}
                    />
                  </div>
                  {selectedProject && (
                    <div className="md:col-span-4 flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/10 rounded border border-indigo-100 dark:border-indigo-900/30">
                      <div className="flex-1">
                        <p className="text-xs  text-indigo-600   mb-1">Project Reference</p>
                        <p className="text-xs  text-indigo-900 dark:text-indigo-300 truncate ">REF: {selectedProject.ref}</p>
                      </div>
                      <div className="border-l border-indigo-100 dark:border-indigo-900/30 pl-3 flex items-center">
                        <button
                          onClick={() => setShowReleasedMaterials(true)}
                          className="p-2 bg-white dark:bg-slate-800 text-indigo-600 rounded border border-indigo-200 dark:border-indigo-800  hover:bg-indigo-50 transition-colors group relative"
                          title="View Released History"
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </AccordionSection>

              {/* 2. Work Allocation Form */}
              {(selectedProject || mode === "view") ? (
                <AccordionSection
                  title={mode === "view" ? "Production Assignments" : "2. Daily Assignment Allocation"}
                  section="allocation"
                  expandedSections={expandedSections}
                  toggleSection={toggleSection}
                >
                  <div className="space-y-6">
                    {mode !== "view" && (
                      <div className="bg-slate-50 dark:bg-slate-800/50  rounded border border-slate-100 dark:border-slate-800 space-y-4">
                        <div className="grid grid-cols-1 items-end md:grid-cols-12 gap-4">
                          <div className="md:col-span-3 space-y-1.5">
                            <label className="text-xs  text-slate-900 dark:text-slate-200  ">Operator</label>
                            <SearchableSelect
                              options={operators}
                              value={newAssignment.operator}
                              onChange={(val) => setNewAssignment({ ...newAssignment, operator: val })}
                              placeholder="Select Operator..."
                              className="text-xs  text-slate-900"
                              allowCustom={true}
                            />
                          </div>
                          <div className="md:col-span-3 space-y-1.5">
                            <label className="text-xs  text-slate-900 dark:text-slate-200  ">Operation</label>
                            <SearchableSelect
                              options={operations}
                              value={newAssignment.operation}
                              onChange={(val) => setNewAssignment({ ...newAssignment, operation: val })}
                              placeholder="Search Operation..."
                              className="text-xs  text-slate-900"
                              allowCustom={true}
                            />
                          </div>
                          <div className="md:col-span-3 space-y-1.5">
                            <label className="text-xs  text-slate-400  ">Start Time</label>
                            <div className="flex gap-1">
                              <input
                                type="time"
                                className="flex-1 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs  outline-none"
                                value={newAssignment.startTime}
                                onChange={(e) => setNewAssignment({ ...newAssignment, startTime: e.target.value })}
                              />
                              <select
                                className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none"
                                value={newAssignment.startPeriod}
                                onChange={(e) => setNewAssignment({ ...newAssignment, startPeriod: e.target.value })}
                              >
                                <option value="AM">AM</option>
                                <option value="PM">PM</option>
                              </select>
                            </div>
                          </div>
                          <div className="md:col-span-3 space-y-1.5">
                            <label className="text-xs  text-slate-400  ">End Time</label>
                            <div className="flex gap-1">
                              <input
                                type="time"
                                className="flex-1 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs  outline-none"
                                value={newAssignment.endTime}
                                onChange={(e) => setNewAssignment({ ...newAssignment, endTime: e.target.value })}
                              />
                              <select
                                className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none"
                                value={newAssignment.endPeriod}
                                onChange={(e) => setNewAssignment({ ...newAssignment, endPeriod: e.target.value })}
                              >
                                <option value="AM">AM</option>
                                <option value="PM">PM</option>
                              </select>
                            </div>
                          </div>
                          <div className="md:col-span-2 space-y-1.5">
                            <label className="text-xs  text-indigo-500   text-center block">Working Hrs.</label>
                            <div className="w-full p-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 rounded text-xs  text-indigo-600 flex items-center justify-center">
                              {currentLoad.toFixed(1)}h
                            </div>
                          </div>
                          <div className="md:col-span-8 space-y-1.5">
                            <label className="text-xs  text-slate-900 dark:text-slate-200  ">Remarks / Special Instructions</label>
                            <input
                              type="text"
                              placeholder="Add instructions or remarks..."
                              className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm font-medium outline-none placeholder:text-slate-300"
                              value={newAssignment.remarks}
                              onChange={(e) => setNewAssignment({ ...newAssignment, remarks: e.target.value })}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <button
                              onClick={handleAddAssignment}
                              className="w-full h-[38px] bg-indigo-600 hover:bg-indigo-700 text-white rounded  text-xs   shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                              <Plus size={14} />
                              Add
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end pt-2 border-t border-slate-100 dark:border-slate-700/50">
                          
                        </div>
                      </div>
                    )}

                    {/* Assignments List in this section */}
                    {dailyPlan.length > 0 && (
                      <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 overflow-hidden ">
                        <table className="w-full text-left border-collapse bg-white">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800">
                              <th className="px-4 py-2.5 text-xs  text-slate-400  ">Project / Ref</th>
                              <th className="px-4 py-2.5 text-xs  text-slate-400  ">Operation</th>
                              <th className="px-4 py-2.5 text-xs  text-slate-400  ">Operator</th>
                              <th className="px-4 py-2.5 text-xs  text-slate-400   text-center">Load</th>
                              {mode !== "view" && <th className="px-4 py-2.5 text-xs  text-slate-400   text-right">Action</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {dailyPlan.map((entry) => (
                              <tr key={entry.id} className="hover:bg-indigo-50/10 transition-all">
                                <td className="px-4 py-3">
                                  <p className="text-xs  text-slate-900 dark:text-white  ">{entry.projectName}</p>
                                  <span className="text-xs  text-slate-400 ">{entry.projectRef}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-xs  text-indigo-600 dark:text-indigo-400   bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded">{entry.operation_name}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-xs  text-slate-700 dark:text-slate-300  ">{entry.operator_name}</span>
                                  <p className="text-xs text-slate-400">{format12h(entry.start_time)} - {format12h(entry.end_time)}</p>
                                  {entry.remarks && <p className="text-xs text-indigo-500   mt-0.5">{entry.remarks}</p>}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="text-xs  text-slate-900 dark:text-white">{entry.total_hours.toFixed(1)}h</span>
                                </td>
                                {mode !== "view" && (
                                  <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button onClick={() => editAssignment(entry)} className="p-1.5 text-slate-300 hover:text-amber-600 transition-colors">
                                        <Edit2 size={14} />
                                      </button>
                                      <button onClick={() => removeAssignment(entry.id)} className="p-1.5 text-slate-300 hover:text-red-600 transition-colors">
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </AccordionSection>
              ) : mode !== "view" ? (
                <div className="py-12 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded border border-dashed border-slate-200 dark:border-slate-800">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-full mb-4">
                    <Target size={32} className="text-slate-300" />
                  </div>
                  <h4 className="text-xs  text-slate-900 dark:text-white   mb-1">Project Selection Required</h4>
                  <p className="text-xs  text-slate-400  ">Please select a root card above to begin operator allocation</p>
                </div>
              ) : null}
            </div>

            {/* Right Sidebar Info */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 p-2 ">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-6 h-6 bg-indigo-600 text-white rounded flex items-center justify-center">
                    <Activity size={15} />
                  </div>
                  <div>
                    <h4 className="text-xs  text-slate-900 dark:text-white  ">Plan Summary</h4>
                    <p className="text-xs  text-slate-400  ">Live Aggregates</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-100 dark:border-slate-800">
                    <p className="text-xs  text-slate-400   mb-1">Total Man-Hours</p>
                    <h4 className="text-xl  text-slate-900 dark:text-white">{dailyPlan.reduce((acc, curr) => acc + (parseFloat(curr.total_hours) || 0), 0).toFixed(1)}<span className="text-sm ml-1 text-slate-400  ">Hrs</span></h4>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="p-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded">
                      <p className="text-xs  text-slate-400   mb-1">Operators</p>
                      <h5 className="text-lg  text-slate-900 dark:text-white">{new Set(dailyPlan.map(p => p.operator_id)).size}</h5>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded">
                      <p className="text-xs  text-slate-400   mb-1">Projects</p>
                      <h5 className="text-lg  text-slate-900 dark:text-white">{new Set(dailyPlan.map(p => p.root_card_id)).size}</h5>
                    </div>
                  </div>
                </div>

                <div className=" p-2 border-t border-slate-100 dark:border-slate-800">
                  <h5 className="text-sm  text-slate-900 dark:text-white   mb-3 flex items-center gap-2">
                    <AlertCircle size={12} className="text-amber-500" /> Validation Rules
                  </h5>
                  <ul className="space-y-2 text-xs  text-slate-500   leading-relaxed">
                    <li>• Check for Overlapping Shifts</li>
                    <li>• Verify Operator Availability</li>
                    <li>• Sequence Order Validation</li>
                  </ul>
                </div>
              </div>

              {mode !== "view" && (
                <div className="p-2 bg-indigo-600 rounded  shadow-indigo-600/20 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={14} className="fill-current" />
                    <span className="text-sm ">Fast Action</span>
                  </div>
                  <h5 className="text-xs    leading-tight mb-3">Commit plan to floor execution immediately?</h5>
                  <button
                    onClick={handleFinalize}
                    disabled={loading}
                    className="w-full p-2 bg-white text-indigo-600 rounded text-xs hover:bg-slate-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading && <Loader2 size={12} className="animate-spin" />}
                    Quick Finalize
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded text-xs    hover:bg-slate-200 transition-all">
            {mode === "view" ? "Close Viewer" : "Cancel Workspace"}
          </button>
          {mode !== "view" && (
            <button
              onClick={handleFinalize}
              disabled={loading}
              className="px-10 py-2.5 bg-indigo-600 text-white rounded text-xs    hover:bg-indigo-700 transition-all  shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {mode === "edit" ? "Update Today's Plan" : "Finalize Today's Plan"}
            </button>
          )}
        </div>

        {/* Released Materials Detail Modal */}
        {showReleasedMaterials && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-2 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-indigo-50/50 dark:bg-indigo-900/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-600 text-white rounded">
                    <Package size={15} />
                  </div>
                  <div>
                    <h3 className="text-sm  text-slate-900 dark:text-white  ">
                      Released Materials: {selectedProject?.name}
                    </h3>
                    <p className="text-xs  text-slate-500   mt-0.5">Inventory Release History for this Project</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowReleasedMaterials(false)}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
                >
                  <X size={15} className="text-slate-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {releasedMaterials.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                      <Package size={32} />
                    </div>
                    <p className="text-sm  text-slate-400  ">No materials released for this project yet</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {releasedMaterials.map((entry) => (
                      <div key={entry.entry_no} className="border border-slate-200 dark:border-slate-800 rounded overflow-hidden ">
                        <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2 flex justify-between items-center border-b border-slate-200 dark:border-slate-800">
                          <div className="flex items-center gap-4">
                            <span className="text-xs  text-indigo-600  ">{entry.entry_no}</span>
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <Calendar size={12} />
                              <span className="text-xs  ">{new Date(entry.entry_date).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <span className="text-xs  text-slate-400  ">{entry.remarks || 'NO REMARKS'}</span>
                        </div>
                        <table className="w-full text-left">
                          <thead>
                            <tr className="text-xs  text-slate-400   border-b border-slate-100 dark:border-slate-800">
                              <th className="px-4 py-2">Item Details</th>
                              <th className="px-4 py-2 text-center">Qty</th>
                              <th className="px-4 py-2 text-center">UOM</th>
                              <th className="px-4 py-2 text-right">ST Numbers</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {entry.items?.map((item, idx) => (
                              <tr key={idx} className="text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center gap-3">
                                    <div className="w-7 h-7 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded flex items-center justify-center">
                                      <Package size={14} />
                                    </div>
                                    <div>
                                      <p className=" text-slate-900 dark:text-white  ">{item.item_name}</p>
                                      <div className="flex items-center gap-2">
                                        <p className="text-xs  text-slate-400 ">{item.item_code}</p>
                                        <p className="text-[10px] text-indigo-500 font-medium bg-indigo-50 dark:bg-indigo-900/20 px-1 rounded">{renderDimensions(item)}</p>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 text-center  text-emerald-600">{item.quantity ? parseFloat(item.quantity).toString() : "0"}</td>
                                <td className="px-4 py-2.5 text-center  text-slate-500 ">{item.uom}</td>
                                <td className="px-4 py-2.5 text-right  text-indigo-500">{item.serials?.length || 0} PCS</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end">
                <button
                  onClick={() => setShowReleasedMaterials(false)}
                  className="px-6 py-2 bg-slate-900 text-white rounded text-xs    hover:bg-slate-800 transition-all"
                >
                  Close History
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Assignment Edit Popup Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-500 text-white rounded">
                  <Edit2 size={15} />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Edit Assignment</h3>
              </div>
              <button onClick={() => { setIsEditModalOpen(false); setEditingAssignmentId(null); }} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors">
                <X size={15} className="text-slate-500" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Operator</label>
                <SearchableSelect
                  options={operators}
                  value={editForm.operator}
                  onChange={(val) => setEditForm({ ...editForm, operator: val })}
                  placeholder="Select Operator..."
                  allowCustom={true}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Operation</label>
                <SearchableSelect
                  options={operations}
                  value={editForm.operation}
                  onChange={(val) => setEditForm({ ...editForm, operation: val })}
                  placeholder="Select Operation..."
                  allowCustom={true}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Start Time</label>
                  <div className="flex gap-1">
                    <input
                      type="time"
                      className="flex-1 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs outline-none focus:border-indigo-500"
                      value={editForm.startTime}
                      onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                    />
                    <select
                      className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs outline-none focus:border-indigo-500"
                      value={editForm.startPeriod}
                      onChange={(e) => setEditForm({ ...editForm, startPeriod: e.target.value })}
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">End Time</label>
                  <div className="flex gap-1">
                    <input
                      type="time"
                      className="flex-1 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs outline-none focus:border-indigo-500"
                      value={editForm.endTime}
                      onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                    />
                    <select
                      className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs outline-none focus:border-indigo-500"
                      value={editForm.endPeriod}
                      onChange={(e) => setEditForm({ ...editForm, endPeriod: e.target.value })}
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Remarks</label>
                <input
                  type="text"
                  placeholder="Instructions or remarks..."
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs outline-none focus:border-indigo-500"
                  value={editForm.remarks}
                  onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <button 
                onClick={() => { setIsEditModalOpen(false); setEditingAssignmentId(null); }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdateAssignment}
                className="px-6 py-2 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
              >
                <Check size={14} /> Update Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </>
);
};

const CuttingCalculator = ({ item, serials, onSave, onCancel }) => {
  const [group, setGroup] = useState(item.item_group || "PLATE / SHEET");
  const [rawDetails, setRawDetails] = useState({
    length: 8000,
    width: 1200,
    thickness: 20,
    diameter: 20,
    od: 60,
    kerf: 3,
    processed_qty: 1
  });

  const [parts, setParts] = useState([
    { code: "P1", l: 500, w: 300, qty: 1, id: Date.now() }
  ]);

  const results = useMemo(() => {
    const { length, width, thickness, diameter, od, kerf, processed_qty } = rawDetails;
    const qty = parseInt(processed_qty || 1);

    if (group.includes("PLATE") || group.includes("SHEET")) {
      let partsPerPlate = 0;
      let usedArea = 0;

      parts.forEach(p => {
        const pL = parseFloat(p.l) + parseFloat(kerf);
        const pW = parseFloat(p.w) + parseFloat(kerf);
        const perRow = Math.floor(width / pW);
        const rows = Math.floor(length / pL);
        const fits = perRow * rows;
        partsPerPlate += fits;
        usedArea += (p.l * p.w * p.qty) / 1000000; // m2
      });

      const rawArea = (length * width) / 1000000;
      const totalRawArea = rawArea * qty;
      const totalUsedArea = usedArea * qty;
      const scrapArea = totalRawArea - totalUsedArea;
      const scrapPercent = (scrapArea / totalRawArea) * 100;

      return {
        partsPerRaw: Math.floor(partsPerPlate),
        totalParts: Math.floor(partsPerPlate * qty),
        scrapPercent: scrapPercent.toFixed(1),
        totalScrap: scrapArea.toFixed(2) + " m²"
      };
    } else if (group.includes("ROUND") || group.includes("BAR") || group.includes("PIPE")) {
      const rawLen = parseFloat(length || 6000);
      let totalFits = 0;
      let usedLen = 0;

      parts.forEach(p => {
        const fits = Math.floor(rawLen / (parseFloat(p.l) + parseFloat(kerf)));
        totalFits += fits;
        usedLen += (parseFloat(p.l) * parseFloat(p.qty));
      });

      const totalRawLen = rawLen * qty;
      const totalUsedLen = usedLen * qty;
      const scrapLen = totalRawLen - totalUsedLen;
      const scrapPercent = (scrapLen / totalRawLen) * 100;

      return {
        partsPerRaw: Math.floor(totalFits),
        totalParts: Math.floor(totalFits * qty),
        scrapPercent: scrapPercent.toFixed(1),
        totalScrap: scrapLen.toFixed(0) + " mm"
      };
    }

    return { partsPerRaw: 0, totalParts: 0, scrapPercent: 0, totalScrap: 0 };
  }, [group, rawDetails, parts]);

  return (
    <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 1. Raw Material Details */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-lg shadow-indigo-600/20">
              <Settings2 size={15} />
            </div>
            <h4 className="text-xs  text-slate-900 dark:text-white  ">Raw Material Context</h4>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-100 dark:border-slate-700  space-y-3">
            <div>
              <label className="text-xs  text-slate-400   block mb-1">Item Group</label>
              <select
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-2 text-xs  outline-none"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
              >
                <option value="PLATE / SHEET">PLATE / SHEET</option>
                <option value="ROUND BAR">ROUND BAR</option>
                <option value="PIPE / TUBE">PIPE / TUBE</option>
                <option value="BLOCK / SOLID">BLOCK / SOLID</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(group.includes("PLATE") || group.includes("BLOCK")) && (
                <>
                  <div>
                    <label className="text-xs  text-slate-400  block mb-1">Length (mm)</label>
                    <input type="number" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded p-2 text-xs " value={rawDetails.length} onChange={(e) => setRawDetails({ ...rawDetails, length: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs  text-slate-400  block mb-1">Width (mm)</label>
                    <input type="number" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded p-2 text-xs " value={rawDetails.width} onChange={(e) => setRawDetails({ ...rawDetails, width: e.target.value })} />
                  </div>
                </>
              )}
              {group.includes("ROUND") && (
                <div>
                  <label className="text-xs  text-slate-400  block mb-1">Diameter (Ø)</label>
                  <input type="number" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded p-2 text-xs " value={rawDetails.diameter} onChange={(e) => setRawDetails({ ...rawDetails, diameter: e.target.value })} />
                </div>
              )}
              <div className="col-span-2">
                <label className="text-xs  text-indigo-600  block mb-1">Processed Quantity (Nos)</label>
                <input
                  type="number"
                  className="w-full bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded p-2 text-xs  text-indigo-700"
                  value={rawDetails.processed_qty}
                  onChange={(e) => setRawDetails({ ...rawDetails, processed_qty: e.target.value })}
                  min="1"
                  max={serials.length}
                />
                <p className="text-xs  text-slate-400 mt-1  italic">Max Available: {serials.length} Pieces</p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Part Requirements */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-600 text-white rounded-lg">
                <Target size={15} />
              </div>
              <h4 className="text-xs  text-slate-900 dark:text-white  ">Cutting Plan</h4>
            </div>
            <button
              onClick={() => setParts([...parts, { code: "P" + (parts.length + 1), l: 100, w: 100, qty: 1, id: Date.now() }])}
              className="p-1 bg-emerald-50 text-emerald-600 rounded border border-emerald-100 hover:bg-emerald-100 transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700  overflow-hidden">
            <table className="w-full text-left border-collapse bg-white">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="p-2 text-xs  text-slate-400 ">Part</th>
                  <th className="p-2 text-xs  text-slate-400 ">L (mm)</th>
                  {group.includes("PLATE") && <th className="p-2 text-xs  text-slate-400 ">W (mm)</th>}
                  <th className="p-2 text-xs  text-slate-400 ">Qty</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {parts.map((p, idx) => (
                  <tr key={p.id}>
                    <td className="p-2"><input className="w-10 bg-transparent text-xs  outline-none " value={p.code} onChange={(e) => {
                      const newParts = [...parts];
                      newParts[idx].code = e.target.value;
                      setParts(newParts);
                    }} /></td>
                    <td className="p-2"><input type="number" className="w-12 bg-transparent text-xs  outline-none" value={p.l} onChange={(e) => {
                      const newParts = [...parts];
                      newParts[idx].l = e.target.value;
                      setParts(newParts);
                    }} /></td>
                    {group.includes("PLATE") && (
                      <td className="p-2"><input type="number" className="w-12 bg-transparent text-xs  outline-none" value={p.w} onChange={(e) => {
                        const newParts = [...parts];
                        newParts[idx].w = e.target.value;
                        setParts(newParts);
                      }} /></td>
                    )}
                    <td className="p-2"><input type="number" className="w-10 bg-transparent text-xs  outline-none text-emerald-600" value={p.qty} onChange={(e) => {
                      const newParts = [...parts];
                      newParts[idx].qty = e.target.value;
                      setParts(newParts);
                    }} /></td>
                    <td className="p-2">
                      <button onClick={() => setParts(parts.filter(pt => pt.id !== p.id))} className="text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Calculated Results */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-amber-500 text-white rounded-lg">
              <Activity size={15} />
            </div>
            <h4 className="text-xs  text-slate-900 dark:text-white  ">Execution Summary</h4>
          </div>

          <div className="bg-indigo-600 text-white p-5 rounded  shadow-indigo-600/20 space-y-4 relative overflow-hidden group">
            <Zap className="absolute -right-4 -top-4 text-white/10 w-24 h-24 group-hover:scale-110 transition-transform duration-500" />

            <div className="grid grid-cols-2 gap-4 relative z-10">
              <div className="space-y-1">
                <p className="text-xs  text-indigo-200  ">Yield / Piece</p>
                <p className="text-xl  ">{results.partsPerRaw} <span className="text-xs">PCS</span></p>
              </div>
              <div className="space-y-1">
                <p className="text-xs  text-indigo-200  ">Total Produced</p>
                <p className="text-xl   text-emerald-300">{results.totalParts} <span className="text-xs">PCS</span></p>
              </div>
              <div className="space-y-1 col-span-2 border-t border-white/10 pt-4">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs  text-indigo-200  ">Total Scrap Loss</p>
                  <p className="text-xs  bg-white/20 px-2 py-0.5 rounded">{results.scrapPercent}%</p>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full transition-all duration-500" style={{ width: `${results.scrapPercent}%` }}></div>
                </div>
                <p className="text-xs  text-white/80 mt-1  italic ">{results.totalScrap} Wastage</p>
              </div>
            </div>

            <div className="pt-2 flex gap-2 relative z-10">
              <button
                onClick={() => onSave({ ...results, group, rawDetails, parts })}
                className="flex-1 bg-white text-indigo-600 py-2 rounded text-xs    hover:bg-indigo-50 transition-colors shadow-lg"
              >
                Accept & Apply
              </button>
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-indigo-500 text-white rounded text-xs    hover:bg-indigo-400 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MCRReportModal = ({ isOpen, onClose, plan, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [reportEntries, setReportEntries] = useState([]); // The summary table
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedItemCode, setSelectedItemCode] = useState("");
  const [mcrDate, setMcrDate] = useState("");

  useEffect(() => {
    if (plan?.plan_date) {
      setMcrDate(plan.plan_date.split('T')[0]);
    }
  }, [plan]);

  const formatDimensionString = (itemGroup, dims) => {
    const formatDim = (val) => (val !== undefined && val !== null && val !== "" && !isNaN(val)) ? parseFloat(val).toString() : "0";
    const group = (itemGroup || "").toUpperCase();
    
    // Normalize dimension keys (handle both raw_l and l)
    const d = {
      l: dims.l || dims.raw_l || 0,
      w: dims.w || dims.raw_w || 0,
      t: dims.t || dims.raw_thk || dims.raw_t || dims.thickness || 0,
      h: dims.h || dims.raw_h || 0,
      d: dims.d || dims.diameter || dims.raw_diameter || 0,
      od: dims.od || dims.outer_diameter || dims.raw_outer_diameter || 0,
      tw: dims.tw || dims.web_thickness || dims.raw_web_thickness || 0,
      tf: dims.tf || dims.flange_thickness || dims.raw_flange_thickness || 0,
      side1: dims.side1 || dims.raw_side1 || 0,
      side2: dims.side2 || dims.raw_side2 || 0,
    };

    if (group.includes("ROUND") && !group.includes("PIPE") && !group.includes("TUBE")) {
      return `Ø${formatDim(d.w || d.d)} x ${formatDim(d.l)}`;
    } else if (group.includes("BAR") && group.includes("SQUARE")) {
      const s1 = d.w || d.side1;
      const s2 = d.h || d.side2 || d.t || s1; // Fallback to S1 for Square Bar if S2 is missing
      return `${formatDim(s1)}x${formatDim(s2)} x ${formatDim(d.l)}`;
    } else if (group.includes("BAR") && !group.includes("ROUND") && !group.includes("PLATE")) { // Rectangular Bar
      return `${formatDim(d.w)}x${formatDim(d.h || d.t)} x ${formatDim(d.l)}`;
    } else if (group.includes("PIPE") || group.includes("TUBE")) {
      if (group.includes("SQUARE") || group.includes("RECT")) {
        return `${formatDim(d.w)}x${formatDim(d.h)}x${formatDim(d.t)} x ${formatDim(d.l)}`;
      } else {
        return `Ø${formatDim(d.od || d.w || d.d)}x${formatDim(d.t)} x ${formatDim(d.l)}`;
      }
    } else if (group.includes("BEAM") || group.includes("CHANNEL")) {
      return `${formatDim(d.h)}x${formatDim(d.w)}x${formatDim(d.tw || d.t)}x${formatDim(d.tf || d.t)} x ${formatDim(d.l)}`;
    } else if (group.includes("ANGLE")) {
      return `${formatDim(d.side1 || d.w)}x${formatDim(d.side2 || d.h)}x${formatDim(d.t)} x ${formatDim(d.l)}`;
    } else if (group.includes("PLATE") || group.includes("SHEET") || group.includes("BLOCK")) {
      return `${formatDim(d.l)}x${formatDim(d.w)}x${formatDim(d.t)}`;
    } else {
      return `${formatDim(d.l)}x${formatDim(d.w)}x${formatDim(d.t)}`;
    }
  };

  // Current Form State (Manual Entry)
  const [cuttingForm, setCuttingForm] = useState({
    raw_l: "",
    raw_w: "",
    raw_thk: "",
    raw_h: "",
    raw_tw: "",
    raw_tf: "",
    raw_s1: "",
    raw_s2: "",
    produced_qty: 1,
    is_finished: false,
    cutting_axis: "L",
    design: "Rectangular",
    diameter: "",
    return_to_stock: false,
    return_l: "",
    return_w: "",
    return_t: "",
    return_h: "",
    return_tw: "",
    return_tf: "",
    return_s1: "",
    return_s2: "",
    return_d: "",
    return_od: ""
  });

  useEffect(() => {
    if (isOpen && plan) {
      const init = async () => {
        await fetchMaterials();
        if (plan.mcr_id) {
          await fetchMCRDetails();
        } else {
          setReportEntries([]);
        }
        setSelectedItem(null);
        setSelectedItemCode("");
        resetForm();
      };
      init();
    }
  }, [isOpen, plan]);

  const resetForm = () => {
    setCuttingForm({
      raw_l: "",
      raw_w: "",
      raw_thk: "",
      raw_h: "",
      raw_tw: "",
      raw_tf: "",
      raw_s1: "",
      raw_s2: "",
      produced_qty: 1,
      is_finished: false,
      cutting_axis: "L",
      design: "Rectangular",
      diameter: "",
      return_to_stock: false,
      return_l: "",
      return_w: "",
      return_t: "",
      return_h: "",
      return_tw: "",
      return_tf: "",
      return_s1: "",
      return_s2: "",
      return_d: "",
      return_od: ""
    });
    setSelectedItem(null);
    setSelectedItemCode("");
  };

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      // If plan has project_names, filter by them
      const projectQuery = plan.project_names ? `?project_names=${encodeURIComponent(plan.project_names)}` : "";
      const response = await axios.get(`/production/mcr/materials${projectQuery}`);
      if (response.data.success) {
        setMaterials(response.data.movements);
      }
    } catch (error) {
      console.error("Error fetching materials for MCR:", error);
      toast.error("Failed to load materials");
    } finally {
      setLoading(false);
    }
  };

  const fetchMCRDetails = async () => {
    try {
      const response = await axios.get(`/production/mcr/${plan.id}`);
      if (response.data.success) {
        if (response.data.mcr?.date) {
          setMcrDate(response.data.mcr.date.split('T')[0]);
        }
        const savedItems = response.data.items.map(item => {
          const raw = item.full_data?.raw_dims || { 
            l: item.raw_l, 
            w: item.raw_w, 
            t: item.raw_t,
            h: item.raw_h,
            tw: item.raw_tw,
            tf: item.raw_tf,
            side1: item.side1 || item.raw_side1,
            side2: item.side2 || item.raw_side2,
            od: item.raw_od
          };
          
          const dims = formatDimensionString(item.item_group, raw);

          return {
            ...item,
            dims,
            // Weight used in the UI Table "Total" column
            weight: item.total_weight_consumed || 0, 
            remnant_weight: item.weight || 0, // Current stock weight
            new_weight: item.weight || 0, // Used for re-finalizing (remnant)
            unit_weight_consumed: item.unit_weight_consumed || item.unit_weight || 0,
            full_data: {
              ...item.full_data,
              // Re-map serial object for dropdown selection
              selectedSerial: item.serial_number,
              produced_qty: item.produced_qty || item.full_data?.produced_qty || 1
            }
          };
        });
        setReportEntries(savedItems);
      }
    } catch (error) {
      console.error("Error fetching MCR details:", error);
    }
  };

  const uniqueItemOptions = useMemo(() => {
    const items = new Map();
    if (!materials || !Array.isArray(materials)) return [];
    
    materials.forEach((entry) => {
      if (!entry.items || !Array.isArray(entry.items)) return;
      
      entry.items.forEach((item) => {
        // Use a composite key because different items can share same item_code (e.g. GEN-SIZE)
        const itemKey = `${item.item_name || item.material_name}_${item.item_code}`;
        if (item && item.item_code && !items.has(itemKey)) {
          items.set(itemKey, {
            value: itemKey, // Use key as value for selection
            item_code: item.item_code,
            label: `${item.item_name || item.material_name} (${item.item_code})`,
            item_name: item.item_name || item.material_name,
            item_group: item.item_group || (() => {
               const name = (item.item_name || item.material_name || "").toUpperCase();
               if (name.includes("SQUARE TUBE") || name.includes("RECTANGULAR TUBE")) return "SQUARE / RECT TUBE";
               if (name.includes("PIPE") || name.includes("TUBE")) return "PIPE / TUBE";
               if (name.includes("SQUARE BAR") || name.includes("SQ BAR")) return "SQUARE BAR";
               if (name.includes("ROUND BAR")) return "ROUND BAR";
               if (name.includes("FLAT BAR") || name.includes("RECTANGULAR BAR")) return "RECTANGULAR BAR";
               if (name.includes("ROUND") || name.includes("BAR")) return "ROUND / BAR";
               if (name.includes("ANGLE")) return "ANGLE";
               if (name.includes("CHANNEL")) return "CHANNEL";
               if (name.includes("BEAM")) return "BEAM";
               if (name.includes("BLOCK")) return "BLOCK";
               return "PLATE / SHEET";
            })(),
            material_grade: item.material_grade || "N/A"
          });
        }
      });
    });
    return Array.from(items.values());
  }, [materials]);

  const selectedItemGroup = useMemo(() => {
    if (!selectedItemCode) {
      // If no item selected in top form, but we have items in report, 
      // use the first item's group to keep the form labels relevant
      if (reportEntries.length > 0) return (reportEntries[0].item_group || "").toUpperCase();
      return "";
    }
    return uniqueItemOptions.find(o => o.value === selectedItemCode)?.item_group?.toUpperCase() || "";
  }, [selectedItemCode, uniqueItemOptions, reportEntries]);

  const stOptions = useMemo(() => {
    if (!selectedItemCode) return [];
    const options = [];
    
    // selectedItemCode is now our composite key: "item_name_item_code"
    
    materials.forEach((entry) => {
      // Find item that matches BOTH name and code (to distinguish GEN-SIZE items)
      const item = entry.items.find(i => `${i.item_name || i.material_name}_${i.item_code}` === selectedItemCode);
      if (item) {
        item.serials.forEach(serial => {
          // Hide if the item is finished/consumed
          if (serial.status === "Consumed") return;
          if (Number(serial.length) <= 0) return;

          // HIDE ONLY IF the item is already in report and marked as FINISHED or RETURNED TO STOCK
          const isFullyUsedInSession = reportEntries.some(re => 
            re.full_data?.selectedSerial === serial.serial_number && 
            (re.full_data?.is_finished || re.full_data?.return_to_stock)
          );
          if (isFullyUsedInSession) return;

          const isInSession = reportEntries.some(re => re.full_data?.selectedSerial === serial.serial_number);
          const isCut = serial.inspection_status === "C" || serial.inspection_status === "CUT";

          // Calculate weight if it's 0 in DB (to prevent missing weight in UI)
          let currentWeight = Number(serial.unit_weight) || 0;
          const group = (item.item_group || "").toUpperCase();
          const density = Number(item.density) || Number(serial.density) || 7.85;

            const { l, w, t, h, d, od, tw, tf } = {
              l: Number(serial.length) || Number(item.length) || 0,
              w: Number(serial.width) || Number(item.width) || Number(serial.side1) || Number(item.side1) || Number(serial.side_s1) || Number(serial.side_s) || 0,
              t: Number(serial.thickness) || Number(item.thickness) || 0,
              h: Number(serial.height) || Number(item.height) || Number(serial.side2) || Number(item.side2) || Number(serial.side_s2) || 0,
              d: Number(serial.diameter) || Number(item.diameter) || 0,
              od: Number(serial.outer_diameter) || Number(item.outer_diameter) || 0,
              tw: Number(serial.web_thickness) || Number(item.web_thickness) || 0,
              tf: Number(serial.flange_thickness) || Number(item.flange_thickness) || 0
            };
            
            let effectiveH = h;
            let effectiveT = t;
            const effectiveTW = tw || t; // Fallback to main thickness if specific web/flange missing
            const effectiveTF = tf || t;

            if (group.includes("SQUARE")) {
              if (!effectiveH && w) effectiveH = w;
              if (!effectiveT && w) effectiveT = w;
            }

            if (group.includes("PLATE") || group.includes("SHEET") || group.includes("BLOCK")) {
              currentWeight = (l * w * effectiveT * density) / 1000000;
            } else if (group.includes("ROUND") && !group.includes("PIPE") && !group.includes("TUBE")) {
              currentWeight = (Math.PI * Math.pow(d || w / 2, 2) * l * density) / 1000000;
            } else if (group.includes("ANGLE")) {
              const s1 = w;
              const s2 = h || w;
              const area = (s1 + s2 - effectiveT) * effectiveT;
              currentWeight = (area * l * density) / 1000000;
            } else if (group.includes("CHANNEL")) {
              const area = (w * effectiveT) + (2 * (effectiveH - effectiveT) * effectiveT);
              currentWeight = (area * l * density) / 1000000;
            } else if (group.includes("BEAM")) {
              const area = ((effectiveH - 2 * effectiveTF) * effectiveTW) + (2 * w * effectiveTF);
              currentWeight = (area * l * density) / 1000000;
            } else if ((group.includes("PIPE") || group.includes("TUBE")) && (group.includes("SQUARE") || group.includes("RECT"))) {
              const outerArea = w * effectiveH;
              const innerArea = Math.max(0, (w - 2 * effectiveT) * (effectiveH - 2 * effectiveT));
              currentWeight = ((outerArea - innerArea) * l * density) / 1000000;
            } else if (group.includes("PIPE") || group.includes("TUBE") || group.includes("ROUND")) {
              const effectiveOD = od || d || w;
              const innerRadius = Math.max(0, (effectiveOD / 2) - effectiveT);
              const area = Math.PI * (Math.pow(effectiveOD / 2, 2) - Math.pow(innerRadius, 2));
              currentWeight = (area * l * density) / 1000000;
            } else if (group.includes("BAR")) {
              const effectiveD = d || (group.includes("ROUND") ? w : 0);
              if (effectiveD > 0) {
                currentWeight = (Math.PI * Math.pow(effectiveD / 2, 2) * l * density) / 1000000;
              } else {
                currentWeight = (l * w * (effectiveH || effectiveT || 1) * density) / 1000000;
              }
            } else {
              currentWeight = (l * w * (effectiveH || effectiveT || 1) * density) / 1000000;
            }

          // Calculate Absolute Original Weight (from issued dimensions)
          let absoluteOriginalWeight = Number(item.unit_weight) || 0;
          if (absoluteOriginalWeight <= 0) {
            const { l, w, t, h, d, od } = {
              l: Number(item.length) || 0,
              w: Number(item.width) || Number(item.side1) || Number(item.side_s1) || 0,
              t: Number(item.thickness) || 0,
              h: Number(item.height) || Number(item.side2) || Number(item.side_s2) || 0,
              d: Number(item.diameter) || 0,
              od: Number(item.outer_diameter) || 0
            };
            
            let effectiveH = h;
            let effectiveT = t;
            if (group.includes("SQUARE")) {
              if (!effectiveH && w) effectiveH = w;
              if (!effectiveT && w) effectiveT = w;
            }

            if (group.includes("PLATE") || group.includes("SHEET") || group.includes("BLOCK")) {
              absoluteOriginalWeight = (l * w * effectiveT * density) / 1000000;
            } else if (group.includes("ROUND") && !group.includes("PIPE") && !group.includes("TUBE")) {
              absoluteOriginalWeight = (Math.PI * Math.pow(d || w / 2, 2) * l * density) / 1000000;
            } else if (group.includes("ANGLE")) {
              const s1 = w;
              const s2 = h || w;
              const area = (s1 + s2 - effectiveT) * effectiveT;
              absoluteOriginalWeight = (area * l * density) / 1000000;
            } else if (group.includes("CHANNEL")) {
              const area = (w * effectiveT) + (2 * (effectiveH - effectiveT) * effectiveT);
              absoluteOriginalWeight = (area * l * density) / 1000000;
            } else if (group.includes("BEAM")) {
              const itemTW = Number(item.web_thickness) || effectiveT || 0;
              const itemTF = Number(item.flange_thickness) || effectiveT || 0;
              const area = ((effectiveH - 2 * itemTF) * itemTW) + (2 * w * itemTF);
              absoluteOriginalWeight = (area * l * density) / 1000000;
            } else if ((group.includes("PIPE") || group.includes("TUBE")) && (group.includes("SQUARE") || group.includes("RECT"))) {
              const outerArea = w * effectiveH;
              const innerArea = Math.max(0, (w - 2 * effectiveT) * (effectiveH - 2 * effectiveT));
              absoluteOriginalWeight = ((outerArea - innerArea) * l * density) / 1000000;
            } else if (group.includes("PIPE") || group.includes("TUBE") || group.includes("ROUND")) {
              const effectiveOD = od || d || w;
              const innerRadius = Math.max(0, (effectiveOD / 2) - effectiveT);
              const area = Math.PI * (Math.pow(effectiveOD / 2, 2) - Math.pow(innerRadius, 2));
              absoluteOriginalWeight = (area * l * density) / 1000000;
            } else if (group.includes("BAR")) {
              const effectiveD = d || (group.includes("ROUND") ? w : 0);
              if (effectiveD > 0) {
                absoluteOriginalWeight = (Math.PI * Math.pow(effectiveD / 2, 2) * l * density) / 1000000;
              } else {
                absoluteOriginalWeight = (l * w * (effectiveH || effectiveT || 1) * density) / 1000000;
              }
            } else {
              absoluteOriginalWeight = (l * w * (effectiveH || effectiveT || 1) * density) / 1000000;
            }
          }

          const isConsumed = serial.status === "Consumed";
          
          options.push({
            value: serial.serial_number,
            label: `${serial.serial_number} [${parseFloat(currentWeight.toFixed(3))} Kg]${isCut ? " (ALREADY CUT)" : ""}${isConsumed ? " (FULLY CONSUMED)" : ""}${isInSession ? " (IN TABLE)" : ""}`,
            item: item,
            entry_no: entry.entry_no,
            remaining: 1,
            item_group: item.item_group || (() => {
               const name = (item.item_name || item.material_name || "").toUpperCase();
               if (name.includes("SQUARE TUBE") || name.includes("RECTANGULAR TUBE")) return "SQUARE / RECT TUBE";
               if (name.includes("PIPE") || name.includes("TUBE")) return "PIPE / TUBE";
               if (name.includes("SQUARE BAR") || name.includes("SQ BAR")) return "SQUARE BAR";
               if (name.includes("ROUND BAR")) return "ROUND BAR";
               if (name.includes("FLAT BAR") || name.includes("RECTANGULAR BAR")) return "RECTANGULAR BAR";
               if (name.includes("ROUND") || name.includes("BAR")) return "ROUND / BAR";
               if (name.includes("ANGLE")) return "ANGLE";
               if (name.includes("CHANNEL")) return "CHANNEL";
               if (name.includes("BEAM")) return "BEAM";
               if (name.includes("BLOCK")) return "BLOCK";
               return "PLATE / SHEET";
            })(),
            dims: {
              l: Number(serial.length) || Number(item.length) || 0,
              w: Number(serial.width) || Number(item.width) || Number(serial.side1) || Number(item.side1) || Number(serial.side_s1) || Number(serial.side_s) || 0,
              h: Number(serial.height) || Number(item.height) || Number(serial.side2) || Number(item.side2) || Number(serial.side_s2) || 0,
              t: Number(serial.thickness) || Number(item.thickness) || 0,
              d: Number(serial.diameter) || Number(item.diameter) || 0,
              od: Number(serial.outer_diameter) || Number(item.outer_diameter) || 0,
              tw: Number(serial.web_thickness) || Number(item.web_thickness) || 0,
              tf: Number(serial.flange_thickness) || Number(item.flange_thickness) || 0,
              side1: Number(serial.side1) || Number(item.side1) || Number(serial.width) || Number(item.width) || 0,
              side2: Number(serial.side2) || Number(item.side2) || Number(serial.height) || Number(item.height) || 0
            },
            density: serial.density || item.density || 0,
            unit_weight: currentWeight || serial.unit_weight || item.unit_weight || 0,
            absoluteOriginalWeight: absoluteOriginalWeight
          });
        });
      }
    });
    return options;
  }, [materials, selectedItemCode, reportEntries]);

  const remainingInfo = useMemo(() => {
    if (!selectedItem || !selectedItem.dims) return null;
    const group = (selectedItem.item_group || "").toUpperCase();
    const isLinear = group.includes("ROUND") || group.includes("BAR") || group.includes("PIPE") || group.includes("TUBE") || group.includes("BEAM") || group.includes("CHANNEL") || group.includes("ANGLE") || group.includes("SQUARE") || group.includes("RECT");

    // For Circular designs, L and W are the diameter
    const isCircular = cuttingForm.design === "Circular" && !isLinear;
    const effectiveL = isCircular ? parseFloat(cuttingForm.diameter) || 0 : parseFloat(cuttingForm.raw_l) || 0;
    const effectiveW = isCircular ? parseFloat(cuttingForm.diameter) || 0 : (parseFloat(cuttingForm.raw_w) || (isLinear ? 1 : 0));

    const pieceL = effectiveL;
    const pieceW = effectiveW;
    const pieceT = parseFloat(cuttingForm.raw_thk) || 0;
    const qty = parseFloat(cuttingForm.produced_qty) || 0;

    const rawL = parseFloat(selectedItem.dims.l) || 0;
    const rawW = parseFloat(selectedItem.dims.w) || 0;
    const rawT = parseFloat(selectedItem.dims.t) || 0;
    const rawH = parseFloat(selectedItem.dims.h) || 0;
    const rawD = parseFloat(selectedItem.dims.d) || 0;
    const rawOD = parseFloat(selectedItem.dims.od) || 0;
    const rawTW = parseFloat(selectedItem.dims.tw) || 0;
    const rawTF = parseFloat(selectedItem.dims.tf) || 0;
    const density = parseFloat(selectedItem.density) || 7.85;

    // Default: remain the same
    let resL = rawL;
    let resW = rawW;
    let resT = rawT;

    // Grid Calculation
    let maxPerRowL = 0;
    let maxPerRowW = 0;
    let totalMaxPieces = 0;

    if (pieceL > 0) {
      if (isLinear) {
        totalMaxPieces = Math.floor(rawL / pieceL);
      } else if (pieceW > 0) {
        maxPerRowL = Math.floor(rawL / pieceL);
        maxPerRowW = Math.floor(rawW / pieceW);
        totalMaxPieces = maxPerRowL * maxPerRowW;
      }
    }

    if (group.includes("PLATE") || group.includes("SHEET") || group.includes("BLOCK")) {
      if (qty > 0 && pieceL > 0 && pieceW > 0) {
        if (cuttingForm.cutting_axis === "L") {
          const pPerColW = Math.floor(rawW / pieceW);
          if (pPerColW > 0) {
            const colsNeeded = Math.ceil(qty / pPerColW);
            const partialQty = (qty % pPerColW) || pPerColW;

            // Rectangle 1: Deduct full length strips
            const resL1 = Math.max(0, rawL - (colsNeeded * pieceL));
            const resW1 = rawW;
            const area1 = resL1 * resW1;

            // Rectangle 2: If we only have 1 strip, we could also deduct from width
            const resL2 = rawL;
            const resW2 = Math.max(0, rawW - (partialQty * pieceW));
            const area2 = (colsNeeded === 1) ? (resL2 * resW2) : 0;

            if (area2 > area1) {
              resL = resL2;
              resW = resW2;
            } else {
              resL = resL1;
              resW = resW1;
            }
          }
        } else if (cuttingForm.cutting_axis === "W") {
          const pPerRowL = Math.floor(rawL / pieceL);
          if (pPerRowL > 0) {
            const rowsNeeded = Math.ceil(qty / pPerRowL);
            const partialQty = (qty % pPerRowL) || pPerRowL;

            const resW1 = Math.max(0, rawW - (rowsNeeded * pieceW));
            const resL1 = rawL;
            const area1 = resW1 * resL1;

            const resW2 = rawW;
            const resL2 = Math.max(0, rawL - (partialQty * pieceL));
            const area2 = (rowsNeeded === 1) ? (resW2 * resL2) : 0;

            if (area2 > area1) {
              resW = resW2;
              resL = resL2;
            } else {
              resW = resW1;
              resL = resL1;
            }
          }
        } else {
          // Thickness axis (for blocks)
          resT = Math.max(0, rawT - (pieceT * qty));
        }
      }
    }
    else if (isLinear) {
      // Linear items only reduce length
      resL = Math.max(0, rawL - (pieceL * qty));
    }
    else {
      // General fallback (Linear)
      resL = Math.max(0, rawL - (pieceL * qty));
    }

    // Calculate Weights
    const initialSTWeight = parseFloat(selectedItem.unit_weight) || 0;
    const absoluteOriginalWeight = parseFloat(selectedItem.absoluteOriginalWeight) || initialSTWeight;
    let weight = 0;
    let currentWeight = 0;

    // Area/Volume/Linear calculation for piece weight
    if (group.includes("PLATE") || group.includes("SHEET") || group.includes("BLOCK")) {
      const areaPerPiece = isCircular ? (Math.PI * Math.pow(pieceL / 2, 2)) : (pieceL * pieceW);
      currentWeight = (areaPerPiece * pieceT * density * qty) / 1000000;
    }
    else if (group.includes("ANGLE")) {
      const s1 = rawW;
      const s2 = rawH || rawW;
      const area = (s1 + s2 - rawT) * rawT;
      currentWeight = (area * pieceL * density * qty) / 1000000;
    }
    else if (group.includes("CHANNEL")) {
      // Area = (WebWidth * Thickness) + 2 * (FlangeHeight - Thickness) * Thickness
      // Note: rawW is Web Width, rawH is Flange Height, rawT is Thickness
      const area = (rawW * rawT) + (2 * (rawH - rawT) * rawT);
      currentWeight = (area * pieceL * density * qty) / 1000000;
    }
    else if (group.includes("BEAM")) {
      // Area = (Web) + (Flanges) = (TotalHeight - 2*FlangeThick) * WebThick + 2 * (FlangeWidth * FlangeThick)
      // Note: rawH is Total Height, rawW is Flange Width, rawTW is Web Thick, rawTF is Flange Thick
      const area = ((rawH - 2 * rawTF) * rawTW) + (2 * rawW * rawTF);
      currentWeight = (area * pieceL * density * qty) / 1000000;
    }
    else if ((group.includes("PIPE") || group.includes("TUBE")) && (group.includes("SQUARE") || group.includes("RECT"))) {
      const outerArea = rawW * rawH;
      const innerArea = Math.max(0, (rawW - 2*rawT) * (rawH - 2*rawT));
      currentWeight = ((outerArea - innerArea) * pieceL * density * qty) / 1000000;
    }
    else if (group.includes("PIPE") || group.includes("TUBE")) {
      const innerRadius = Math.max(0, (rawOD / 2) - rawT);
      const area = Math.PI * (Math.pow(rawOD / 2, 2) - Math.pow(innerRadius, 2));
      currentWeight = (area * pieceL * density * qty) / 1000000;
    }
    else if (group.includes("ROUND") || group.includes("BAR")) {
      const effectiveD = rawD || rawW;
      const isSquare = group.includes("SQUARE");
      if (isSquare) {
        currentWeight = (effectiveD * (rawH || effectiveD) * pieceL * density * qty) / 1000000;
      } else {
        currentWeight = (Math.PI * Math.pow(effectiveD/ 2, 2) * pieceL * density * qty) / 1000000;
      }
    }
    else if (isLinear && rawL > 0) {
      currentWeight = ((pieceL * qty) / rawL) * initialSTWeight;
    }
    else {
      currentWeight = (pieceL * pieceW * (rawH || rawT || 1) * density * qty) / 1000000;
    }

    // Calculate Scrap (Geometric for circle, or full remnant if finished)
    let scrapWeight = 0;
    if (isCircular) {
      const volumeBox = pieceL * pieceW * pieceT;
      const volumeCircle = Math.PI * Math.pow(pieceL / 2, 2) * pieceT;
      scrapWeight = ((volumeBox - volumeCircle) * density * qty) / 1000000;
    }

    // Remaining weight by simple subtraction from the current ST weight
    weight = Math.max(0, initialSTWeight - currentWeight - scrapWeight);

    if (cuttingForm.is_finished) {
      scrapWeight += weight; // If marked finished, any remaining becomes scrap
      weight = 0;
    }

    const scrapPercent = initialSTWeight > 0 ? (scrapWeight / initialSTWeight) * 100 : 0;

    return {
      l: resL,
      w: resW,
      t: resT,
      weight, // Remnant weight
      currentWeight, // Produced piece weight
      totalMaxPieces,
      scrapWeight,
      scrapPercent,
      initialSTWeight,
      absoluteOriginalWeight,
      singlePieceWeight: currentWeight / (qty || 1)
    };
  }, [selectedItem, cuttingForm]);

  const handleAddToTable = () => {
    const isCircular = cuttingForm.design === "Circular";
    const pieceL = isCircular ? cuttingForm.diameter : cuttingForm.raw_l;

    if (!selectedItem || !pieceL) {
      toast.warn("Please complete the material configuration first");
      return;
    }

    if (remainingInfo && remainingInfo.currentWeight > (remainingInfo.initialSTWeight + 0.1)) {
      toast.error(`Not enough material! Required: ${remainingInfo.currentWeight.toFixed(3)} Kg, Available: ${remainingInfo.initialSTWeight.toFixed(3)} Kg`);
      return;
    }

    const group = (selectedItem.item_group || "").toUpperCase();
    const dims = formatDimensionString(group, {
      l: cuttingForm.raw_l,
      w: cuttingForm.raw_w,
      t: cuttingForm.raw_thk,
      h: cuttingForm.raw_h,
      tw: cuttingForm.raw_tw,
      tf: cuttingForm.raw_tf,
      side1: cuttingForm.raw_s1,
      side2: cuttingForm.raw_s2,
      diameter: cuttingForm.diameter
    });

    const newEntry = {
      id: Date.now(),
      item_name: selectedItem.item.item_name,
      item_code: selectedItem.item.item_code,
      item_group: selectedItem.item_group,
      material_grade: selectedItem.item.material_grade || uniqueItemOptions.find(o => o.value === selectedItemCode)?.material_grade || "N/A",
      processed_qty: 1,
      dims,
      weight: remainingInfo.currentWeight,
      unit_weight_consumed: remainingInfo.singlePieceWeight,
      remnant_weight: remainingInfo.weight,
      scrap_weight: remainingInfo.scrapWeight,
      scrap_percent: remainingInfo.scrapPercent,
      is_new: true,
      full_data: {
        ...cuttingForm,
        selectedItem,
        selectedSerial: selectedItem.value,
        entry_no: selectedItem.entry_no,
        return_dims: cuttingForm.return_to_stock ? {
          l: parseFloat(cuttingForm.return_l || 0),
          w: parseFloat(cuttingForm.return_w || 0),
          t: parseFloat(cuttingForm.return_t || 0),
          height: parseFloat(cuttingForm.return_h || 0),
          web_thickness: parseFloat(cuttingForm.return_tw || 0),
          flange_thickness: parseFloat(cuttingForm.return_tf || 0),
          side1: parseFloat(cuttingForm.return_s1 || 0),
          side2: parseFloat(cuttingForm.return_s2 || 0),
          side_s: parseFloat(cuttingForm.return_s1 || 0),
          side_s1: parseFloat(cuttingForm.return_s1 || 0),
          side_s2: parseFloat(cuttingForm.return_s2 || 0),
          diameter: parseFloat(cuttingForm.return_d || 0),
          outer_diameter: parseFloat(cuttingForm.return_od || 0)
        } : null
      }
    };

    setReportEntries([...reportEntries, newEntry]);

    // Update local state to reflect reduced parent size for immediate reuse
    if (remainingInfo) {
      setMaterials(prev => prev.map(entry => ({
        ...entry,
        items: entry.items.map(item => ({
          ...item,
          serials: item.serials.map(serial => {
            if (serial.serial_number === selectedItem.value) {
              return {
                ...serial,
                length: remainingInfo.l,
                width: remainingInfo.w,
                thickness: remainingInfo.t,
                unit_weight: remainingInfo.weight,
                inspection_status: "CUT",
                status: (cuttingForm.is_finished || cuttingForm.return_to_stock) ? "Consumed" : serial.status
              };
            }
            return serial;
          })
        }))
      })));
    }

    // Reset selections but keep item if needed
    setSelectedItem(null);
    setCuttingForm({
      raw_l: "",
      raw_w: "",
      raw_thk: "",
      produced_qty: 1,
      is_finished: false,
      cutting_axis: "L",
      design: "Rectangular",
      diameter: "",
      return_to_stock: false,
      return_l: "",
      return_w: "",
      return_t: ""
    });
    toast.success(`ST Code ${selectedItem.value} added to report`);
  };

  const handleFinalizeMCR = async () => {
    if (reportEntries.length === 0) {
      toast.warn("Add at least one item to the report table");
      return;
    }

    setLoading(true);
    try {
      const pieces = [];
      const calculations = [];

      for (const entry of reportEntries) {
        // If this is a saved entry, we already processed the inventory logic.
        // We only need the basic info for the report items table.
        if (!entry.is_new) {
          pieces.push({
            serial_number: entry.serial_number,
            item_code: entry.item_code,
            item_name: entry.item_name,
            item_group: entry.item_group,
            material_grade: entry.material_grade,
            design: entry.design,
            produced_qty: entry.produced_qty,
            cutting_axis: entry.cutting_axis,
            is_finished: entry.is_finished,
            return_to_stock: false, // Default for saved
            raw_dims: { 
              l: entry.raw_l, 
              w: entry.raw_w, 
              t: entry.raw_t,
              h: entry.raw_h,
              tw: entry.raw_tw,
              tf: entry.raw_tf,
              side1: entry.side1 || entry.raw_side1,
              side2: entry.side2 || entry.raw_side2,
              diameter: entry.diameter,
              od: entry.raw_od
            },
            new_dims: { 
              l: entry.new_l, 
              w: entry.new_w, 
              t: entry.new_t,
              h: entry.new_h,
              tw: entry.new_tw,
              tf: entry.new_tf,
              side1: entry.new_side1,
              side2: entry.new_side2,
              diameter: entry.new_diameter,
              od: entry.new_od
            },
            new_weight: entry.new_weight || 0,
            scrap_weight: entry.scrap_weight || 0,
            scrap_percent: entry.scrap_percent || 0,
            unit_weight: entry.unit_weight_consumed || (entry.weight / (entry.produced_qty || 1)),
            weight: entry.weight || 0,
            weight_consumed: entry.weight || 0,
            total_weight_consumed: entry.weight || 0,
            is_new: false,
            remarks: entry.remarks || "MCR Entry"
          });

          calculations.push({
            serial_number: entry.serial_number,
            item_group: entry.item_group,
            scrap_percent: entry.scrap_percent || 0,
            scrap_weight: entry.scrap_weight || 0,
            is_new: false,
            currentWeight: entry.weight || 0,
            total_parts_produced: parseInt(entry.produced_qty || 1),
          });
          continue; // Skip the rest of the loop for this entry
        }

        // Calculate new dims for backend update (ONLY for NEW entries)
        const rawL = entry.full_data.selectedItem?.dims?.l || 0;
        const rawW = entry.full_data.selectedItem?.dims?.w || 0;
        const rawT = entry.full_data.selectedItem?.dims?.t || 0;
        const group = (entry.item_group || "").toUpperCase();
        const isLinear = group.includes("ROUND") || group.includes("BAR") || group.includes("PIPE") || group.includes("TUBE") || group.includes("BEAM") || group.includes("CHANNEL") || group.includes("ANGLE") || group.includes("SQUARE") || group.includes("RECT");
        const isCircular = entry.full_data.design === "Circular" && !isLinear;

        const pL = isCircular ? parseFloat(entry.full_data.diameter) || 0 : parseFloat(entry.full_data.raw_l) || 0;
        const pW = isCircular ? parseFloat(entry.full_data.diameter) || 0 : (parseFloat(entry.full_data.raw_w) || (isLinear ? 1 : 0));
        const pT = parseFloat(entry.full_data.raw_thk) || 0;
        const qty = parseFloat(entry.full_data.produced_qty) || 0;

        let newL = rawL;
        let newW = rawW;
        let newT = rawT;

        if (group.includes("PLATE") || group.includes("SHEET") || group.includes("BLOCK")) {
          if (entry.full_data.cutting_axis === "L") {
            const pPerRowL = Math.floor(rawL / pL);
            if (pPerRowL > 0) {
              const rowsNeeded = Math.ceil(qty / pPerRowL);
              const maxRowsPossible = Math.floor(rawW / pW);

              if (rowsNeeded === maxRowsPossible && (qty % pPerRowL !== 0)) {
                newW = pW;
                newL = Math.max(0, rawL - ((qty % pPerRowL) * pL));
              }
              else {
                newW = Math.max(0, rawW - (rowsNeeded * pW));
                newL = rawL;
              }
            }
          } else if (entry.full_data.cutting_axis === "W") {
            const pPerColW = Math.floor(rawW / pW);
            if (pPerColW > 0) {
              const colsNeeded = Math.ceil(qty / pPerColW);
              const maxColsPossible = Math.floor(rawL / pL);

              if (colsNeeded === maxColsPossible && (qty % pPerColW !== 0)) {
                newL = pL;
                newW = Math.max(0, rawW - ((qty % pPerColW) * pW));
              }
              else {
                newL = Math.max(0, rawL - (colsNeeded * pL));
                newW = rawW;
              }
            }
          } else if (entry.full_data.cutting_axis === "T") {
            newT = Math.max(0, rawT - (pT * qty));
          }
        } else {
          // Linear items only reduce length
          newL = Math.max(0, rawL - (pL * qty));
        }

        // Weight for backend update is the remnant weight (initial - consumed)
        const newWeight = entry.remnant_weight;

        const tId = `temp_${entry.id}_${Date.now()}`;

        pieces.push({
          temp_id: tId,
          serial_number: entry.full_data.selectedSerial,
          item_code: entry.item_code,
          item_name: entry.item_name,
          item_group: entry.item_group,
          material_grade: entry.material_grade,
          design: entry.full_data.design,
          produced_qty: qty,
          cutting_axis: entry.full_data.cutting_axis,
          is_finished: entry.full_data.is_finished,
          return_to_stock: entry.full_data.return_to_stock,
          return_dims: entry.full_data.return_dims ? {
            ...entry.full_data.return_dims,
            diameter: entry.full_data.return_dims.diameter || entry.full_data.selectedItem?.dims?.diameter || null,
            outer_diameter: entry.full_data.return_dims.outer_diameter || entry.full_data.selectedItem?.dims?.outer_diameter || null,
            height: entry.full_data.return_dims.height || entry.full_data.selectedItem?.dims?.height || null,
            web_thickness: entry.full_data.return_dims.web_thickness || entry.full_data.selectedItem?.dims?.web_thickness || null,
            flange_thickness: entry.full_data.return_dims.flange_thickness || entry.full_data.selectedItem?.dims?.flange_thickness || null,
            side1: entry.full_data.return_dims.side1 || entry.full_data.selectedItem?.dims?.side1 || null,
            side2: entry.full_data.return_dims.side2 || entry.full_data.selectedItem?.dims?.side2 || null,
            side_s: entry.full_data.return_dims.side_s || entry.full_data.selectedItem?.dims?.side_s || null,
            side_s1: entry.full_data.return_dims.side_s1 || entry.full_data.selectedItem?.dims?.side_s1 || null,
            side_s2: entry.full_data.return_dims.side_s2 || entry.full_data.selectedItem?.dims?.side_s2 || null
          } : null,
          raw_dims: {
            l: pL,
            w: pW,
            t: pT,
            diameter: entry.full_data.diameter || null,
            od: entry.full_data.selectedItem?.dims?.od || null,
            h: entry.full_data.selectedItem?.dims?.h || null,
            tw: entry.full_data.selectedItem?.dims?.web_thickness || entry.full_data.raw_tw || null,
            tf: entry.full_data.selectedItem?.dims?.flange_thickness || entry.full_data.raw_tf || null,
            side1: entry.full_data.side1 || entry.full_data.raw_s1 || null,
            side2: entry.full_data.side2 || entry.full_data.raw_s2 || null,
            raw_side1: entry.full_data.side1 || entry.full_data.raw_s1 || null,
            raw_side2: entry.full_data.side2 || entry.full_data.raw_s2 || null,
            side_s: entry.full_data.side_s || entry.full_data.raw_s || null,
            side_s1: entry.full_data.side_s1 || entry.full_data.raw_s1 || null,
            side_s2: entry.full_data.side_s2 || entry.full_data.raw_s2 || null
          },
          new_dims: {
            l: newL,
            w: newW,
            t: newT,
            diameter: entry.full_data.diameter || null,
            od: entry.full_data.selectedItem?.dims?.od || null,
            h: entry.full_data.selectedItem?.dims?.h || null,
            tw: entry.full_data.selectedItem?.dims?.web_thickness || entry.full_data.raw_tw || null,
            tf: entry.full_data.selectedItem?.dims?.flange_thickness || entry.full_data.raw_tf || null,
            side1: entry.full_data.side1 || entry.full_data.raw_s1 || null,
            side2: entry.full_data.side2 || entry.full_data.raw_s2 || null,
            raw_side1: entry.full_data.side1 || entry.full_data.raw_s1 || null,
            raw_side2: entry.full_data.side2 || entry.full_data.raw_s2 || null,
            side_s: entry.full_data.side_s || entry.full_data.raw_s || null,
            side_s1: entry.full_data.side_s1 || entry.full_data.raw_s1 || null,
            side_s2: entry.full_data.side_s2 || entry.full_data.raw_s2 || null
          },
          new_weight: newWeight,
          scrap_weight: entry.scrap_weight || 0,
          scrap_percent: entry.scrap_percent || 0,
          unit_weight: entry.weight / (qty || 1), // Piece weight
          weight_consumed: entry.weight || 0,
          total_weight_consumed: entry.weight || 0,
          is_new: entry.is_new, // Crucial for backend update logic
          remarks: `MCR Entry`
        });

        calculations.push({
          temp_id: tId,
          serial_number: entry.full_data.selectedSerial,
          item_group: entry.item_group,
          scrap_percent: entry.scrap_percent || 0,
          scrap_weight: entry.scrap_weight || 0,
          is_new: entry.is_new,
          currentWeight: entry.weight, // Pass consumed weight for items table
          total_parts_produced: parseInt(entry.full_data.produced_qty || 1),
          raw_details: entry.full_data
        });
      }

      const response = await axios.post("/production/mcr/save", {
        plan_id: plan.id,
        work_date: mcrDate,
        pieces,
        calculations
      });

      if (response.data.success) {
        toast.success("Full Material Cutting Report Finalized");
        if (onRefresh) onRefresh();
        fetchMaterials();
        onClose();
      }
    } catch (error) {
      console.error("Error finalizing MCR:", error);
      toast.error("Failed to save report");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl rounded shadow-2xl flex flex-col max-h-[98vh] overflow-hidden">
        {/* Header */}
        <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-indigo-600 text-white rounded-lg">
              <Scissors size={15} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-lg  text-slate-900 dark:text-white  ">Material Cutting Report (MCR)</h3>
                <input
                  type="date"
                  className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded text-xs border border-indigo-100 dark:border-indigo-900/50 outline-none"
                  value={mcrDate}
                  onChange={(e) => setMcrDate(e.target.value)}
                />
                {reportEntries.length > 0 && (
                  <span className="bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded text-xs    border border-rose-100 dark:border-rose-900/50 flex items-center gap-1.5">
                    <Activity size={10} />
                    Scrap: {reportEntries.reduce((acc, curr) => acc + (parseFloat(curr.scrap_weight) || 0), 0).toFixed(2)} KG
                  </span>
                )}
              </div>
              <p className="text-xs  text-slate-500   mt-0.5">{plan.project_names}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={15} className="text-slate-400" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
          <div className="space-y-4">

            {/* 1. CONFIGURATION FORM (BOM Style) */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded border border-slate-200  overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                
                {/* Left Side: All Form Inputs (Inputs Column) */}
                <div className="md:col-span-8 space-y-6">
                  
                  {/* Row 1: Item Identification */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-6 space-y-1.5">
                      <label className="text-xs  text-slate-400 font-medium  tracking-wider block">Item Name / Code *</label>
                      <SearchableSelect
                        options={uniqueItemOptions}
                        value={selectedItemCode}
                        onChange={(val) => {
                          setSelectedItemCode(val);
                          setSelectedItem(null);
                        }}
                        placeholder="SEARCH MATERIALS..."
                      />
                    </div>

                    <div className="md:col-span-3 space-y-1.5">
                      <label className="text-xs  text-slate-400 font-medium  tracking-wider block">Item Group</label>
                      <input
                        type="text"
                        readOnly
                        className="w-full h-9 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-2 text-xs  text-slate-500"
                        value={selectedItemCode ? uniqueItemOptions.find(o => o.value === selectedItemCode)?.item_group : ""}
                        placeholder="GROUP..."
                      />
                    </div>

                    <div className="md:col-span-3 space-y-1.5">
                      <label className="text-xs  text-slate-400 font-medium  tracking-wider block">Material Grade</label>
                      <input
                        type="text"
                        readOnly
                        className="w-full h-9 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-2 text-xs  text-slate-500"
                        value={selectedItemCode ? uniqueItemOptions.find(o => o.value === selectedItemCode)?.material_grade : ""}
                        placeholder="GRADE..."
                      />
                    </div>
                  </div>

                  {/* Row 2: Stock Tracking Code Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-8 space-y-1.5">
                      <label className="text-xs  text-slate-400 font-medium  tracking-wider block">Select ST Code *</label>
                      <SearchableSelect
                        options={stOptions}
                        value={selectedItem?.value}
                        onChange={(val) => {
                          const sel = stOptions.find(o => o.value === val);
                          setSelectedItem(sel);
                          if (sel && sel.dims) {
                            const group = selectedItemGroup;
                            
                            // For square items, ensure both dimensions are populated if only one is found
                            const rawW = Number(sel.dims.w) || (group.includes("SQUARE") ? Number(sel.dims.h) : 0);
                            const rawH = Number(sel.dims.h) || (group.includes("SQUARE") ? Number(sel.dims.w) : 0);

                            setCuttingForm(prev => ({
                              ...prev,
                              raw_l: "",   // Always cleared — operator enters the cut length
                              // For plates: L and W are empty (operator enters piece dims), T is auto-filled
                              // For linear profiles: all cross-section dims are auto-filled, only L is entered
                              raw_w:  (group.includes("PLATE") || group.includes("SHEET"))
                                        ? ""  // Plates: operator enters cut width
                                        : (rawW || ""),
                              raw_thk: Number(sel.dims.t) || "", 
                              raw_h:  rawH || "", 
                              raw_tw: Number(sel.dims.tw)    || Number(sel.dims.t) || "",
                              raw_tf: Number(sel.dims.tf)    || Number(sel.dims.t) || "",
                              raw_s1: Number(sel.dims.side1) || (rawW || ""),
                              raw_s2: Number(sel.dims.side2) || (rawH || ""),
                              // Reset return dims
                              return_l: "", return_w: "", return_t: "",
                              return_h: "", return_tw: "", return_tf: "",
                              return_s1: "", return_s2: "",
                              return_d: "", return_od: ""
                            }));
                          }
                        }}
                        placeholder="SELECT ST#"
                        disabled={!selectedItemCode}
                      />
                    </div>

                    <div className="md:col-span-4 space-y-1.5">
                      <label className="text-xs  text-indigo-600 font-semibold  tracking-wider block flex items-center gap-1">
                        Produced Qty *
                      </label>
                      <input
                        type="number"
                        placeholder="PCS"
                        min="1"
                        className={`w-full h-9 bg-indigo-50/50 border rounded px-3 py-1.5 text-xs font-semibold text-indigo-700 focus:border-indigo-500 outline-none ${remainingInfo && parseFloat(cuttingForm.produced_qty) > remainingInfo.totalMaxPieces ? 'border-red-500' : 'border-indigo-100'}`}
                        value={cuttingForm.produced_qty}
                        onChange={(e) => setCuttingForm({ ...cuttingForm, produced_qty: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Row 3: Dimensions & Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end pt-5 border-t border-slate-100">
                    
                    {/* Dimension Group */}
                    <div className="md:col-span-6 grid grid-cols-3 gap-3">

                      {/* ── PLATE / SHEET ── L editable, W editable, T locked */}
                      {(selectedItemGroup.includes("PLATE") || selectedItemGroup.includes("SHEET")) && (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-xs text-blue-600 font-semibold block">Cut Length (L)</label>
                            <input type="number" placeholder="Enter mm" className="w-full h-9 bg-white border border-blue-300 rounded px-2.5 py-1.5 text-xs outline-none focus:border-blue-500" value={cuttingForm.raw_l} onChange={(e) => setCuttingForm({ ...cuttingForm, raw_l: e.target.value })} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs text-blue-600 font-semibold block">Cut Width (W)</label>
                            <input type="number" placeholder="Enter mm" className="w-full h-9 bg-white border border-blue-300 rounded px-2.5 py-1.5 text-xs outline-none focus:border-blue-500" value={cuttingForm.raw_w} onChange={(e) => setCuttingForm({ ...cuttingForm, raw_w: e.target.value })} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs text-slate-400 font-medium block">Thickness (T)</label>
                            <input type="number" readOnly className="w-full h-9 bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-500 cursor-not-allowed outline-none" value={cuttingForm.raw_thk} />
                          </div>
                        </>
                      )}

                      {/* ── BLOCK / SOLID ── L, W, H all editable */}
                      {selectedItemGroup.includes("BLOCK") && (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-xs text-blue-600 font-semibold block">Cut L</label>
                            <input type="number" placeholder="Enter mm" className="w-full h-9 bg-white border border-blue-300 rounded px-2.5 py-1.5 text-xs outline-none" value={cuttingForm.raw_l} onChange={(e) => setCuttingForm({ ...cuttingForm, raw_l: e.target.value })} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs text-blue-600 font-semibold block">Cut W</label>
                            <input type="number" placeholder="Enter mm" className="w-full h-9 bg-white border border-blue-300 rounded px-2.5 py-1.5 text-xs outline-none" value={cuttingForm.raw_w} onChange={(e) => setCuttingForm({ ...cuttingForm, raw_w: e.target.value })} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs text-blue-600 font-semibold block">Cut H</label>
                            <input type="number" placeholder="Enter mm" className="w-full h-9 bg-white border border-blue-300 rounded px-2.5 py-1.5 text-xs outline-none" value={cuttingForm.raw_thk} onChange={(e) => setCuttingForm({ ...cuttingForm, raw_thk: e.target.value })} />
                          </div>
                        </>
                      )}

                      {/* ── ROUND BAR ── Dia locked, Length editable */}
                      {selectedItemGroup.includes("ROUND") && !selectedItemGroup.includes("PIPE") && !selectedItemGroup.includes("TUBE") && (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-xs text-slate-400 font-medium block">Diameter (Ø)</label>
                            <input type="number" readOnly className="w-full h-9 bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-500 cursor-not-allowed outline-none" value={cuttingForm.raw_w || selectedItem?.dims?.d || ""} />
                          </div>
                          <div className="col-span-2 space-y-1.5">
                            <label className="text-xs text-blue-600 font-semibold block">Cut Length (L)</label>
                            <input type="number" placeholder="Enter mm" className="w-full h-9 bg-white border border-blue-300 rounded px-2.5 py-1.5 text-xs outline-none" value={cuttingForm.raw_l} onChange={(e) => setCuttingForm({ ...cuttingForm, raw_l: e.target.value })} />
                          </div>
                        </>
                      )}

                      {/* ── SQUARE / FLAT / RECT BAR ── W, H locked, Length editable */}
                      {(selectedItemGroup.includes("BAR") && !selectedItemGroup.includes("ROUND") && !selectedItemGroup.includes("PLATE")) && (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-xs text-slate-400 font-medium block">
                              {selectedItemGroup.includes("SQUARE") ? "Side (S1)" : "Width (W)"}
                            </label>
                            <input type="number" readOnly className="w-full h-9 bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-500 cursor-not-allowed outline-none" value={cuttingForm.raw_w} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs text-slate-400 font-medium block">
                              {selectedItemGroup.includes("SQUARE") ? "Side (S2)" : "Thickness (T)"}
                            </label>
                            <input type="number" readOnly className="w-full h-9 bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-500 cursor-not-allowed outline-none" value={cuttingForm.raw_thk || cuttingForm.raw_h} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs text-blue-600 font-semibold block">Cut Length (L)</label>
                            <input type="number" placeholder="Enter mm" className="w-full h-9 bg-white border border-blue-300 rounded px-2.5 py-1.5 text-xs outline-none" value={cuttingForm.raw_l} onChange={(e) => setCuttingForm({ ...cuttingForm, raw_l: e.target.value })} />
                          </div>
                        </>
                      )}

                      {/* ── SQUARE TUBE / RECTANGULAR TUBE ── W, H, Thk locked, Length editable */}
                      {(selectedItemGroup.includes("SQUARE") || selectedItemGroup.includes("RECT")) && selectedItemGroup.includes("TUBE") && (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-xs text-slate-400 font-medium block">Width (W)</label>
                            <input type="number" readOnly className="w-full h-9 bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-500 cursor-not-allowed outline-none" value={cuttingForm.raw_w} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs text-slate-400 font-medium block">Height (H)</label>
                            <input type="number" readOnly className="w-full h-9 bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-500 cursor-not-allowed outline-none" value={cuttingForm.raw_h} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs text-slate-400 font-medium block">Thk (T)</label>
                            <input type="number" readOnly className="w-full h-9 bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-500 cursor-not-allowed outline-none" value={cuttingForm.raw_thk} />
                          </div>
                          <div className="col-span-3 space-y-1.5 mt-[-10px]">
                            <label className="text-xs text-blue-600 font-semibold block">Cut Length (L)</label>
                            <input type="number" placeholder="Enter mm" className="w-full h-9 bg-white border border-blue-300 rounded px-2.5 py-1.5 text-xs outline-none" value={cuttingForm.raw_l} onChange={(e) => setCuttingForm({ ...cuttingForm, raw_l: e.target.value })} />
                          </div>
                        </>
                      )}

                      {/* ── ROUND PIPE / TUBE ── OD, Thk locked, Length editable */}
                      {(selectedItemGroup.includes("PIPE") || selectedItemGroup.includes("TUBE")) && !selectedItemGroup.includes("SQUARE") && !selectedItemGroup.includes("RECT") && (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-xs text-slate-400 font-medium block">Outer Dia (OD)</label>
                            <input type="number" readOnly className="w-full h-9 bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-500 cursor-not-allowed outline-none" value={cuttingForm.raw_w || selectedItem?.dims?.od || ""} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs text-slate-400 font-medium block">Wall Thk (T)</label>
                            <input type="number" readOnly className="w-full h-9 bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-500 cursor-not-allowed outline-none" value={cuttingForm.raw_thk} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs text-blue-600 font-semibold block">Cut Length (L)</label>
                            <input type="number" placeholder="Enter mm" className="w-full h-9 bg-white border border-blue-300 rounded px-2.5 py-1.5 text-xs outline-none" value={cuttingForm.raw_l} onChange={(e) => setCuttingForm({ ...cuttingForm, raw_l: e.target.value })} />
                          </div>
                        </>
                      )}

                      {/* ── CHANNEL ── Web Width (W), Flange Height (H), Thickness (T), Length (L) */}
                      {selectedItemGroup.includes("CHANNEL") && (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-xs text-slate-400 font-medium block">Web Width (W)</label>
                            <input type="number" readOnly className="w-full h-9 bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-500 cursor-not-allowed outline-none" value={cuttingForm.raw_w} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs text-slate-400 font-medium block">Flange Height (H)</label>
                            <input type="number" readOnly className="w-full h-9 bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-500 cursor-not-allowed outline-none" value={cuttingForm.raw_h} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs text-slate-400 font-medium block">Thickness (T)</label>
                            <input type="number" readOnly className="w-full h-9 bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-500 cursor-not-allowed outline-none" value={cuttingForm.raw_thk} />
                          </div>
                          <div className="col-span-3 space-y-1.5 mt-[-10px]">
                            <label className="text-xs text-blue-600 font-semibold block">Cut Length (L)</label>
                            <input type="number" placeholder="Enter mm" className="w-full h-9 bg-white border border-blue-300 rounded px-2.5 py-1.5 text-xs outline-none" value={cuttingForm.raw_l} onChange={(e) => setCuttingForm({ ...cuttingForm, raw_l: e.target.value })} />
                          </div>
                        </>
                      )}

                      {/* ── BEAM ── Total Height (H), Flange Width (W), Web Thick (Tw), Flange Thick (Tf), Length (L) */}
                      {selectedItemGroup.includes("BEAM") && (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-xs text-slate-400 font-medium block">Total Height (H)</label>
                            <input type="number" readOnly className="w-full h-9 bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-500 cursor-not-allowed outline-none" value={cuttingForm.raw_h} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs text-slate-400 font-medium block">Flange Width (W)</label>
                            <input type="number" readOnly className="w-full h-9 bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-500 cursor-not-allowed outline-none" value={cuttingForm.raw_w} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs text-slate-400 font-medium block">Web Thick (Tw)</label>
                            <input type="number" readOnly className="w-full h-9 bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-500 cursor-not-allowed outline-none" value={cuttingForm.raw_tw} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs text-slate-400 font-medium block">Flange Thick (Tf)</label>
                            <input type="number" readOnly className="w-full h-9 bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-500 cursor-not-allowed outline-none" value={cuttingForm.raw_tf} />
                          </div>
                          <div className="col-span-2 space-y-1.5">
                            <label className="text-xs text-blue-600 font-semibold block">Cut Length (L)</label>
                            <input type="number" placeholder="Enter mm" className="w-full h-9 bg-white border border-blue-300 rounded px-2.5 py-1.5 text-xs outline-none" value={cuttingForm.raw_l} onChange={(e) => setCuttingForm({ ...cuttingForm, raw_l: e.target.value })} />
                          </div>
                        </>
                      )}

                      {/* ── ANGLE SECTION ── S1, S2, Thk locked, Length editable */}
                      {selectedItemGroup.includes("ANGLE") && (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-xs text-slate-400 font-medium block">Side 1</label>
                            <input type="number" readOnly className="w-full h-9 bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-500 cursor-not-allowed outline-none" value={cuttingForm.raw_s1} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs text-slate-400 font-medium block">Side 2</label>
                            <input type="number" readOnly className="w-full h-9 bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-500 cursor-not-allowed outline-none" value={cuttingForm.raw_s2} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs text-slate-400 font-medium block">Thickness (T)</label>
                            <input type="number" readOnly className="w-full h-9 bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-500 cursor-not-allowed outline-none" value={cuttingForm.raw_thk} />
                          </div>
                          <div className="col-span-3 space-y-1.5 mt-[-10px]">
                            <label className="text-xs text-blue-600 font-semibold block">Cut Length (L)</label>
                            <input type="number" placeholder="Enter mm" className="w-full h-9 bg-white border border-blue-300 rounded px-2.5 py-1.5 text-xs outline-none" value={cuttingForm.raw_l} onChange={(e) => setCuttingForm({ ...cuttingForm, raw_l: e.target.value })} />
                          </div>
                        </>
                      )}

                      {/* ── GENERIC FALLBACK ── for unknown groups */}
                      {selectedItem && 
                        !selectedItemGroup.includes("PLATE") && 
                        !selectedItemGroup.includes("SHEET") && 
                        !selectedItemGroup.includes("BLOCK") && 
                        !selectedItemGroup.includes("ROUND") && 
                        !selectedItemGroup.includes("BAR") && 
                        !selectedItemGroup.includes("PIPE") && 
                        !selectedItemGroup.includes("TUBE") && 
                        !selectedItemGroup.includes("BEAM") && 
                        !selectedItemGroup.includes("CHANNEL") && 
                        !selectedItemGroup.includes("ANGLE") && (
                         <>
                           <div className="space-y-1.5">
                             <label className="text-xs text-blue-600 font-semibold block">Dim 1 (L)</label>
                             <input type="number" placeholder="Enter mm" className="w-full h-9 bg-white border border-blue-300 rounded px-2.5 py-1.5 text-xs outline-none" value={cuttingForm.raw_l} onChange={(e) => setCuttingForm({ ...cuttingForm, raw_l: e.target.value })} />
                           </div>
                           <div className="space-y-1.5">
                             <label className="text-xs text-blue-600 font-semibold block">Dim 2 (W)</label>
                             <input type="number" placeholder="Enter mm" className="w-full h-9 bg-white border border-blue-300 rounded px-2.5 py-1.5 text-xs outline-none" value={cuttingForm.raw_w} onChange={(e) => setCuttingForm({ ...cuttingForm, raw_w: e.target.value })} />
                           </div>
                           <div className="space-y-1.5">
                             <label className="text-xs text-blue-600 font-semibold block">Dim 3 (T)</label>
                             <input type="number" placeholder="Enter mm" className="w-full h-9 bg-white border border-blue-300 rounded px-2.5 py-1.5 text-xs outline-none" value={cuttingForm.raw_thk} onChange={(e) => setCuttingForm({ ...cuttingForm, raw_thk: e.target.value })} />
                           </div>
                         </>
                       )}
                    </div>

                    <div className="md:col-span-6 flex items-center justify-around bg-slate-50 dark:bg-slate-800/50 h-9 rounded-lg border border-slate-100 dark:border-slate-800 px-4">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-400 font-medium ">Inventory</label>
                        <input type="checkbox" className="w-4 h-4 text-emerald-600 rounded border-slate-300 cursor-pointer" checked={cuttingForm.return_to_stock} onChange={(e) => {
                          const checked = e.target.checked;
                          let rL = "", rW = "", rT = "", rH = "", rTw = "", rTf = "", rS1 = "", rS2 = "", rD = "", rOD = "";
                          if (checked && remainingInfo) {
                            const group = (selectedItemGroup || "").toUpperCase();
                            const dims = selectedItem.dims || {};
                            rL = remainingInfo.l;
                            
                            // Base assignments
                            rW = dims.w || dims.side1 || dims.side_s1 || dims.side_s || 0;
                            rH = dims.h || dims.side2 || dims.side_s2 || 0;
                            rT = dims.t || dims.thickness || 0;
                            rD = dims.d || dims.diameter || 0;
                            rOD = dims.od || dims.outer_diameter || 0;

                            if (group.includes("CHANNEL")) {
                              rW = dims.w || 0; // Web Width
                              rH = dims.h || 0; // Flange Height
                              rT = dims.t || 0; // Thickness
                              rTw = 0;
                              rTf = 0;
                            } else if (group.includes("BEAM")) {
                              rH = dims.h || 0; // Total Height
                              rW = dims.w || 0; // Flange Width
                              rTw = dims.tw || dims.web_thickness || rT || 0;
                              rTf = dims.tf || dims.flange_thickness || rT || 0;
                            } else if (group.includes("ANGLE")) {
                              rS1 = dims.side1 || rW || 0;
                              rS2 = dims.side2 || rH || 0;
                              rT = dims.t || 0;
                            } else if (group.includes("PIPE") || group.includes("TUBE")) {
                              if (group.includes("SQUARE") || group.includes("RECT")) {
                                rW = dims.w || 0;
                                rH = dims.h || 0;
                                rT = dims.t || 0;
                              } else {
                                rOD = dims.od || dims.outer_diameter || rD || rW || 0;
                                rT = dims.t || 0;
                              }
                            } else if (group.includes("BAR")) {
                              rW = dims.w || 0;
                              rT = dims.t || 0;
                              rH = dims.h || 0;
                              if (group.includes("SQUARE") && !rH) rH = rW;
                              if (!rT && group.includes("RECT")) rT = rH; // Fallback if T is in H
                            } else if (group.includes("PLATE") || group.includes("SHEET") || group.includes("BLOCK")) {
                              rW = dims.w || 0;
                              rT = dims.t || 0;
                            }

                            if (group.includes("ROUND") && !rD && rW) rD = rW;
                          }
                          setCuttingForm(prev => ({ 
                            ...prev, 
                            return_to_stock: checked, 
                            return_l: rL, 
                            return_w: rW, 
                            return_t: rT,
                            return_h: rH,
                            return_tw: rTw,
                            return_tf: rTf,
                            return_s1: rS1,
                            return_s2: rS2,
                            return_d: rD,
                            return_od: rOD
                          }));
                        }} />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-400 font-medium ">Consumed?</label>
                        <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded border-slate-300 cursor-pointer" checked={cuttingForm.is_finished} onChange={(e) => setCuttingForm({ ...cuttingForm, is_finished: e.target.checked })} />
                      </div>
                    </div>

                    <div className="md:col-span-12">
                      <button onClick={handleAddToTable} className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2">
                        <Plus size={14} /> Add to Report
                      </button>
                    </div>

                    {/* Return Dimensions Nested Row (Only if Inventory Checked) */}
                    {cuttingForm.return_to_stock && (
                      <div className="md:col-span-12 mt-4 p-3 bg-emerald-50/50 rounded border border-emerald-100 flex items-center gap-6">
                        <span className="text-xs text-emerald-600 font-semibold  tracking-wider">Stock Return Dimensions:</span>
                        <div className="flex-1 grid grid-cols-2 gap-4">
                          {(selectedItemGroup.includes("PLATE") || selectedItemGroup.includes("SHEET")) && (
                            <>
                              <div className="flex items-center gap-2"><label className="text-xs text-emerald-600">L</label><input type="number" placeholder="L" className="w-full h-8 bg-white border border-emerald-200 rounded px-2 py-1 text-xs" value={cuttingForm.return_l} onChange={(e) => setCuttingForm({ ...cuttingForm, return_l: e.target.value })} /></div>
                              <div className="flex items-center gap-2"><label className="text-xs text-emerald-600">W</label><input type="number" placeholder="W" className="w-full h-8 bg-white border border-emerald-200 rounded px-2 py-1 text-xs" value={cuttingForm.return_w} onChange={(e) => setCuttingForm({ ...cuttingForm, return_w: e.target.value })} /></div>
                              <div className="flex items-center gap-2"><label className="text-xs text-emerald-600">Thickness (T)</label><input type="number" readOnly className="w-full h-8 bg-slate-100 border border-emerald-100 rounded px-2 py-1 text-xs text-slate-500" value={cuttingForm.return_t} /></div>
                            </>
                          )}

                          {selectedItemGroup.includes("CHANNEL") && (
                            <>
                              <div className="flex items-center gap-2"><label className="text-xs text-emerald-600">L</label><input type="number" placeholder="L" className="w-full h-8 bg-white border border-emerald-200 rounded px-2 py-1 text-xs" value={cuttingForm.return_l} onChange={(e) => setCuttingForm({ ...cuttingForm, return_l: e.target.value })} /></div>
                              <div className="flex items-center gap-2"><label className="text-xs text-emerald-600">Web Width (W)</label><input type="number" readOnly className="w-full h-8 bg-slate-100 border border-emerald-200 rounded px-2 py-1 text-xs text-slate-500" value={cuttingForm.return_w} /></div>
                              <div className="flex items-center gap-2"><label className="text-xs text-emerald-600">Flange Height (H)</label><input type="number" readOnly className="w-full h-8 bg-slate-100 border border-emerald-200 rounded px-2 py-1 text-xs text-slate-500" value={cuttingForm.return_h} /></div>
                              <div className="flex items-center gap-2"><label className="text-xs text-emerald-600">Thickness (T)</label><input type="number" readOnly className="w-full h-8 bg-slate-100 border border-emerald-200 rounded px-2 py-1 text-xs text-slate-500" value={cuttingForm.return_t} /></div>
                            </>
                          )}

                          {selectedItemGroup.includes("BEAM") && (
                            <>
                              <div className="flex items-center gap-2"><label className="text-xs text-emerald-600">L</label><input type="number" placeholder="L" className="w-full h-8 bg-white border border-emerald-200 rounded px-2 py-1 text-xs" value={cuttingForm.return_l} onChange={(e) => setCuttingForm({ ...cuttingForm, return_l: e.target.value })} /></div>
                              <div className="flex items-center gap-2"><label className="text-xs text-emerald-600">Total Height (H)</label><input type="number" readOnly className="w-full h-8 bg-slate-100 border border-emerald-200 rounded px-2 py-1 text-xs text-slate-500" value={cuttingForm.return_h} /></div>
                              <div className="flex items-center gap-2"><label className="text-xs text-emerald-600">Flange Width (W)</label><input type="number" readOnly className="w-full h-8 bg-slate-100 border border-emerald-200 rounded px-2 py-1 text-xs text-slate-500" value={cuttingForm.return_w} /></div>
                              <div className="flex items-center gap-2"><label className="text-xs text-emerald-600">Web Thick (Tw)</label><input type="number" readOnly className="w-full h-8 bg-slate-100 border border-emerald-200 rounded px-2 py-1 text-xs text-slate-500" value={cuttingForm.return_tw} /></div>
                              <div className="flex items-center gap-2"><label className="text-xs text-emerald-600">Flange Thick (Tf)</label><input type="number" readOnly className="w-full h-8 bg-slate-100 border border-emerald-200 rounded px-2 py-1 text-xs text-slate-500" value={cuttingForm.return_tf} /></div>
                            </>
                          )}

                          {selectedItemGroup.includes("ANGLE") && (
                            <>
                              <div className="flex items-center gap-2"><label className="text-xs text-emerald-600">L</label><input type="number" placeholder="L" className="w-full h-8 bg-white border border-emerald-200 rounded px-2 py-1 text-xs" value={cuttingForm.return_l} onChange={(e) => setCuttingForm({ ...cuttingForm, return_l: e.target.value })} /></div>
                              <div className="flex items-center gap-2"><label className="text-xs text-emerald-600">Side 1</label><input type="number" readOnly className="w-full h-8 bg-slate-100 border border-emerald-200 rounded px-2 py-1 text-xs text-slate-500" value={cuttingForm.return_s1} /></div>
                              <div className="flex items-center gap-2"><label className="text-xs text-emerald-600">Side 2</label><input type="number" readOnly className="w-full h-8 bg-slate-100 border border-emerald-200 rounded px-2 py-1 text-xs text-slate-500" value={cuttingForm.return_s2} /></div>
                              <div className="flex items-center gap-2"><label className="text-xs text-emerald-600">Thickness (T)</label><input type="number" readOnly className="w-full h-8 bg-slate-100 border border-emerald-100 rounded px-2 py-1 text-xs text-slate-500" value={cuttingForm.return_t} /></div>
                            </>
                          )}
                          
                          {/* ── ROUND BAR ── */}
                          {selectedItemGroup.includes("ROUND") && !selectedItemGroup.includes("PIPE") && !selectedItemGroup.includes("TUBE") && (
                            <>
                              <div className="flex items-center gap-2"><label className="text-xs text-emerald-600">L</label><input type="number" placeholder="L" className="w-full h-8 bg-white border border-emerald-200 rounded px-2 py-1 text-xs" value={cuttingForm.return_l} onChange={(e) => setCuttingForm({ ...cuttingForm, return_l: e.target.value })} /></div>
                              <div className="flex items-center gap-2"><label className="text-xs text-emerald-600">Diameter (Ø)</label><input type="number" readOnly className="w-full h-8 bg-slate-100 border border-emerald-200 rounded px-2 py-1 text-xs text-slate-500" value={cuttingForm.return_d} /></div>
                            </>
                          )}

                          {/* ── SQUARE / FLAT BAR ── */}
                          {selectedItemGroup.includes("BAR") && !selectedItemGroup.includes("ROUND") && !selectedItemGroup.includes("PLATE") && (
                            <>
                              <div className="flex items-center gap-2"><label className="text-xs text-emerald-600">L</label><input type="number" placeholder="L" className="w-full h-8 bg-white border border-emerald-200 rounded px-2 py-1 text-xs" value={cuttingForm.return_l} onChange={(e) => setCuttingForm({ ...cuttingForm, return_l: e.target.value })} /></div>
                              <div className="flex items-center gap-2"><label className="text-xs text-emerald-600">{selectedItemGroup.includes("SQUARE") ? "Side (S1)" : "Width (W)"}</label><input type="number" readOnly className="w-full h-8 bg-slate-100 border border-emerald-200 rounded px-2 py-1 text-xs text-slate-500" value={cuttingForm.return_w} /></div>
                              <div className="flex items-center gap-2"><label className="text-xs text-emerald-600">{selectedItemGroup.includes("SQUARE") ? "Side (S2)" : "Thickness (T)"}</label><input type="number" readOnly className="w-full h-8 bg-slate-100 border border-emerald-200 rounded px-2 py-1 text-xs text-slate-500" value={cuttingForm.return_t || cuttingForm.return_h} /></div>
                            </>
                          )}

                          {/* ── PIPE / TUBE (ROUND) ── */}
                          {(selectedItemGroup.includes("PIPE") || selectedItemGroup.includes("TUBE")) && !selectedItemGroup.includes("SQUARE") && !selectedItemGroup.includes("RECT") && (
                            <>
                              <div className="flex items-center gap-2"><label className="text-xs text-emerald-600">L</label><input type="number" placeholder="L" className="w-full h-8 bg-white border border-emerald-200 rounded px-2 py-1 text-xs" value={cuttingForm.return_l} onChange={(e) => setCuttingForm({ ...cuttingForm, return_l: e.target.value })} /></div>
                              <div className="flex items-center gap-2"><label className="text-xs text-emerald-600">Outer Dia (OD)</label><input type="number" readOnly className="w-full h-8 bg-slate-100 border border-emerald-200 rounded px-2 py-1 text-xs text-slate-500" value={cuttingForm.return_od} /></div>
                              <div className="flex items-center gap-2"><label className="text-xs text-emerald-600">Wall Thk (T)</label><input type="number" readOnly className="w-full h-8 bg-slate-100 border border-emerald-200 rounded px-2 py-1 text-xs text-slate-500" value={cuttingForm.return_t} /></div>
                            </>
                          )}

                          {/* ── SQUARE / RECT TUBE ── */}
                          {(selectedItemGroup.includes("TUBE")) && (selectedItemGroup.includes("SQUARE") || selectedItemGroup.includes("RECT")) && (
                            <>
                              <div className="flex items-center gap-2"><label className="text-xs text-emerald-600">L</label><input type="number" placeholder="L" className="w-full h-8 bg-white border border-emerald-200 rounded px-2 py-1 text-xs" value={cuttingForm.return_l} onChange={(e) => setCuttingForm({ ...cuttingForm, return_l: e.target.value })} /></div>
                              <div className="flex items-center gap-2"><label className="text-xs text-emerald-600">Width (W)</label><input type="number" readOnly className="w-full h-8 bg-slate-100 border border-emerald-200 rounded px-2 py-1 text-xs text-slate-500" value={cuttingForm.return_w || cuttingForm.return_s1} /></div>
                              <div className="flex items-center gap-2"><label className="text-xs text-emerald-600">Height (H)</label><input type="number" readOnly className="w-full h-8 bg-slate-100 border border-emerald-200 rounded px-2 py-1 text-xs text-slate-500" value={cuttingForm.return_h || cuttingForm.return_s2} /></div>
                              <div className="flex items-center gap-2"><label className="text-xs text-emerald-600">Thk (T)</label><input type="number" readOnly className="w-full h-8 bg-slate-100 border border-emerald-200 rounded px-2 py-1 text-xs text-slate-500" value={cuttingForm.return_t} /></div>
                            </>
                          )}

                          {selectedItemGroup.includes("BLOCK") && (
                            <>
                              <div className="flex items-center gap-2"><label className="text-xs text-emerald-600">L</label><input type="number" placeholder="L" className="w-full h-8 bg-white border border-emerald-200 rounded px-2 py-1 text-xs" value={cuttingForm.return_l} onChange={(e) => setCuttingForm({ ...cuttingForm, return_l: e.target.value })} /></div>
                              <div className="flex items-center gap-2"><label className="text-xs text-emerald-600">W</label><input type="number" placeholder="W" className="w-full h-8 bg-white border border-emerald-200 rounded px-2 py-1 text-xs" value={cuttingForm.return_w} onChange={(e) => setCuttingForm({ ...cuttingForm, return_w: e.target.value })} /></div>
                              <div className="flex items-center gap-2"><label className="text-xs text-emerald-600">H</label><input type="number" placeholder="H" className="w-full h-8 bg-white border border-emerald-200 rounded px-2 py-1 text-xs" value={cuttingForm.return_t} onChange={(e) => setCuttingForm({ ...cuttingForm, return_t: e.target.value })} /></div>
                            </>
                          )}

                          {selectedItem && 
                           !selectedItemGroup.includes("PLATE") && 
                           !selectedItemGroup.includes("SHEET") && 
                           !selectedItemGroup.includes("ROUND") && 
                           !selectedItemGroup.includes("BAR") && 
                           !selectedItemGroup.includes("PIPE") && 
                           !selectedItemGroup.includes("TUBE") && 
                           !selectedItemGroup.includes("BLOCK") && 
                           !selectedItemGroup.includes("BEAM") && 
                           !selectedItemGroup.includes("CHANNEL") && 
                           !selectedItemGroup.includes("ANGLE") && (
                            <>
                              <div className="flex items-center gap-2"><label className="text-xs text-emerald-600">Dim 1</label><input type="number" placeholder="Dim 1" className="w-full h-8 bg-white border border-emerald-200 rounded px-2 py-1 text-xs" value={cuttingForm.return_l} onChange={(e) => setCuttingForm({ ...cuttingForm, return_l: e.target.value })} /></div>
                              <div className="flex items-center gap-2"><label className="text-xs text-emerald-600">Dim 2</label><input type="number" placeholder="Dim 2" className="w-full h-8 bg-white border border-emerald-200 rounded px-2 py-1 text-xs" value={cuttingForm.return_w} onChange={(e) => setCuttingForm({ ...cuttingForm, return_w: e.target.value })} /></div>
                              <div className="flex items-center gap-2"><label className="text-xs text-emerald-600">Dim 3</label><input type="number" placeholder="Dim 3" className="w-full h-8 bg-white border border-emerald-200 rounded px-2 py-1 text-xs" value={cuttingForm.return_t} onChange={(e) => setCuttingForm({ ...cuttingForm, return_t: e.target.value })} /></div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Weight Summary & Status (Visual Info Column) */}
                <div className="md:col-span-4 bg-slate-50 dark:bg-slate-800/30 p-2 rounded border border-slate-100 dark:border-slate-800 flex flex-col justify-center min-h-[220px]">
                  {selectedItem && selectedItem.dims && remainingInfo ? (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between mb-1">
                        <h5 className="text-xs text-slate-500  flex items-center gap-2">
                          <div className="w-1 h-3 bg-indigo-500 rounded"></div>
                          Weight Analysis (KG)
                        </h5>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200/60  relative overflow-hidden group transition-all hover:shadow-md">
                          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><Package size={15} className="text-indigo-600" /></div>
                          <span className="text-xs text-slate-400   block mb-1">Current Stock</span>
                          <span className="text-md text-indigo-600  leading-none">{remainingInfo.initialSTWeight.toFixed(3)} KG</span>
                        </div>
                        
                        <div className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200/60  relative overflow-hidden group transition-all hover:shadow-md">
                          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><Scissors size={15} className="text-rose-600" /></div>
                          <span className="text-xs text-slate-400   block mb-1">Used in Job</span>
                          <span className="text-md text-rose-600  leading-none">{remainingInfo.currentWeight.toFixed(3)} KG</span>
                        </div>
                        
                        <div className="bg-emerald-50 col-span-2 dark:bg-emerald-900/20 p-2 rounded border border-emerald-100 dark:border-emerald-900/50 relative overflow-hidden group transition-all hover:shadow-md">
                          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><Activity size={15} className="text-emerald-600" /></div>
                          <span className="text-xs text-emerald-600/70   block mb-1">Available Remainder</span>
                          <span className="text-md text-emerald-600  leading-none">{remainingInfo.weight.toFixed(3)} KG</span>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-200/60 space-y-2">
                        <div className="flex justify-between items-center bg-slate-100/50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-200/30">
                          <span className="text-xs text-slate-500    flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                            Total Absolute Weight
                          </span>
                          <span className="text-xs text-slate-7md">{remainingInfo.absoluteOriginalWeight.toFixed(3)} KG</span>
                        </div>
                        <div className="flex justify-between items-center bg-rose-50/50 dark:bg-rose-900/10 p-2 rounded-lg border border-rose-100/50 dark:border-rose-900/20">
                          <span className="text-xs text-rose-500    flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div>
                            Calculated Scrap Loss
                          </span>
                          <span className="text-xs text-rose-6md">{remainingInfo.scrapWeight.toFixed(3)} KG</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center space-y-4 opacity-40 py-10">
                      <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
                        <Clipboard size={32} className="text-slate-400" />
                      </div>
                      <div className="max-w-[180px]">
                        <p className="text-xs text-slate-500   tracking-wider">Weight Analysis Ready</p>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">Select an item and ST code to calculate job weights</p>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* 2. SUMMARY TABLE (The List) */}
            <div className="bg-white dark:bg-slate-900 rounded border border-slate-200  overflow-hidden min-h-[200px]">
              <div className="px-6 py-3 bg-slate-900 text-white flex justify-between items-center">
                <h4 className="text-xs    flex items-center gap-2"><Clipboard size={14} /> Reported Items Summary</h4>
                <span className="text-xs  bg-white/20 px-3 py-1 rounded-full">{reportEntries.length} Items Configured</span>
              </div>
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs  text-slate-400   border-b">
                  <tr>
                    <th className="px-6 py-3">#</th>
                    <th className="px-6 py-3">Item Details</th>
                    <th className="px-6 py-3">ST Code</th>
                    <th className="px-6 py-3 text-center">Item Group</th>
                    <th className="px-6 py-3 text-center">Material Grade</th>
                    <th className="px-6 py-3 text-center">Cutting Dims (mm)</th>
                    <th className="px-6 py-3 text-center">Weight (KG)</th>
                    <th className="px-6 py-3 text-center">Produced Qty</th>
                    <th className="px-6 py-3 text-center">Scrap (KG)</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 ">
                  {reportEntries.length === 0 ? (
                    <tr><td colSpan="9" className="px-6 py-12 text-center text-slate-400 text-xs  italic">No items added to report yet. Use the form above.</td></tr>
                  ) : (
                    reportEntries.map((entry, idx) => (
                      <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-2 text-xs text-slate-400">{idx + 1}</td>
                        <td className="p-2">
                          <p className="text-xs  text-slate-900 ">{entry.item_name}</p>
                          <p className="text-xs text-slate-400">{entry.item_code}</p>
                        </td>
                        <td className="p-2">
                          <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded text-xs ">
                            {entry.full_data?.selectedSerial}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="text-xs  text-slate-500  ">{entry.item_group}</span>
                        </td>
                        <td className="p-2 text-center">
                          <span className="text-xs  text-slate-500  ">{entry.material_grade}</span>
                        </td>
                        <td className="p-2 text-center text-slate-700 text-xs ">
                          {entry.dims}
                        </td>
                        <td className="p-2 text-center">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-slate-400">
                              Unit: {parseFloat(entry.unit_weight_consumed || (entry.weight || entry.total_weight_consumed || 0) / (parseInt(entry.full_data?.produced_qty || 1))).toFixed(3)} KG
                            </span>
                            <span className="text-xs font-medium text-indigo-600">
                              Total: {parseFloat(entry.weight || entry.total_weight_consumed || 0).toFixed(3)} KG
                            </span>
                          </div>
                        </td>
                        <td className="p-2 text-center">
                          <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded text-xs ">
                            {entry.full_data?.produced_qty} NOS
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium text-red-600">
                              {parseFloat(entry.scrap_weight || 0).toFixed(3)} KG
                            </span>
                            <span className="text-[10px] text-slate-400">
                              ({parseFloat(entry.scrap_percent || 0).toFixed(1)}%)
                            </span>
                          </div>
                        </td>
                        <td className="p-2 text-right">
                          <button
                            onClick={() => setReportEntries(reportEntries.filter(e => e.id !== entry.id))}
                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {reportEntries.length > 0 && (
                  <tfoot className="bg-slate-50 border-t-2 border-slate-100 dark:bg-slate-800/50 dark:border-slate-800">
                    <tr>
                      <td colSpan="8" className="px-6 py-4 text-right">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-4">
                          Total Report Scrap:
                        </span>
                        <span className="text-sm font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-4 py-2 rounded-lg border border-rose-100 dark:border-rose-900/30">
                          {reportEntries.reduce((acc, curr) => acc + (parseFloat(curr.scrap_weight) || 0), 0).toFixed(3)} KG
                        </span>
                      </td>
                      <td colSpan="2"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-3">
          <button onClick={onClose} className="p-2 border border-slate-200 text-slate-600 rounded text-xs    hover:bg-slate-50">Cancel</button>
          <button
            onClick={handleFinalizeMCR}
            disabled={loading || reportEntries.length === 0}
            className="p-2 bg-indigo-600 text-white rounded text-xs shadow-indigo-600/20 hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Finalize Full MCR Report
          </button>
        </div>
      </div>
    </div>
  );
};

const DailyProductionPlanningPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMCRModalOpen, setIsMCRModalOpen] = useState(false);
  const [selectedPlanForMCR, setSelectedPlanForMCR] = useState(null);
  const [modalMode, setModalMode] = useState("create"); // "create", "edit", "view"
  const [selectedPlanData, setSelectedPlanData] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  const [dailyPlans, setDailyPlans] = useState([]);
  const [projects, setProjects] = useState([]);
  const [operators, setOperators] = useState([]);
  const [operations, setOperations] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, projectsRes, opsRes, employeesRes] = await Promise.all([
        axios.get("/production/plans"),
        axios.get("/production/root-cards?assignedOnly=true"),
        axios.get("/production/operations"),
        axios.get("/employee/list")
      ]);

      if (plansRes.data.success) setDailyPlans(plansRes.data.plans);

      // Format projects for SearchableSelect
      const formattedProjects = (projectsRes.data.rootCards || projectsRes.data).map(rc => ({
        value: rc.id,
        label: `${rc.project_name || rc.title} (${rc.id})`,
        id: rc.id,
        name: rc.project_name || rc.title,
        ref: rc.id,
        qty: rc.quantity
      }));
      setProjects(formattedProjects);

      if (opsRes.data.success) {
        const formattedOps = opsRes.data.operations.map(op => ({
          value: op.name,
          label: op.name,
          id: op.id
        }));
        setOperations(formattedOps);
      }

      // Format employees for SearchableSelect
      const formattedEmployees = (employeesRes.data.employees || employeesRes.data).map(e => ({
        value: e.fullName || e.username,
        label: e.fullName || e.username,
        id: e.id
      }));
      setOperators(formattedEmployees);

    } catch (error) {
      console.error("Error fetching production data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenPlan = async (planId, mode = "view") => {
    setLoading(true);
    try {
      const response = await axios.get(`/production/plans/${planId}`);
      if (response.data.success) {
        setSelectedPlanData(response.data);
        setModalMode(mode);
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error("Error fetching plan details:", error);
      toast.error("Failed to load plan details");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (planData) => {
    setModalLoading(true);
    try {
      let planRes;
      if (modalMode === "edit" && selectedPlanData?.plan?.id) {
        planRes = await axios.put(`/production/plans/${selectedPlanData.plan.id}`, {
          plan_date: planData.plan_date,
          assignments: planData.assignments,
          remarks: "Daily plan updated from dashboard"
        });
      } else {
        planRes = await axios.post("/production/plans", {
          plan_date: planData.plan_date,
          assignments: planData.assignments,
          remarks: "Daily plan created from dashboard"
        });
      }

      if (planRes.data.success) {
        toast.success(modalMode === "edit" ? "Daily plan updated successfully" : "Daily plan finalized successfully");
        setIsModalOpen(false);
        setSelectedPlanData(null);
        fetchData();
      }
    } catch (error) {
      console.error("Error saving plan:", error);
      toast.error(error.response?.data?.message || "Failed to save plan");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm("Are you sure you want to delete this production plan? This action cannot be undone.")) return;

    setLoading(true);
    try {
      const response = await axios.delete(`/production/plans/${planId}`);
      if (response.data.success) {
        toast.success("Production plan deleted successfully");
        fetchData();
      }
    } catch (error) {
      console.error("Error deleting plan:", error);
      toast.error(error.response?.data?.message || "Failed to delete production plan");
    } finally {
      setLoading(false);
    }
  };

  const selectedProjectForFilter = useMemo(() =>
    projects.find(p => p.value === projectFilter),
    [projects, projectFilter]
  );

  const filteredPlans = dailyPlans.filter(plan => {
    // Avoid timezone shift by splitting date string
    const planDateStr = plan.plan_date ? plan.plan_date.split('T')[0] : "";

    const matchesSearch = searchTerm === "" ||
      plan.project_names?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.root_card_ids?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      planDateStr.includes(searchTerm.toLowerCase());

    const matchesProject = projectFilter === "" ||
      (plan.root_card_ids && plan.root_card_ids.toLowerCase().includes(String(projectFilter).toLowerCase())) ||
      (plan.project_names && plan.project_names.toLowerCase().includes(String(projectFilter).toLowerCase())) ||
      (selectedProjectForFilter && plan.project_names && plan.project_names.toLowerCase().includes(String(selectedProjectForFilter.name || "").toLowerCase()));

    const matchesDate = dateFilter === "" ||
      planDateStr === dateFilter;

    return matchesSearch && matchesProject && matchesDate;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 ">
      {/* Page Header */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          
          <div>
            <h1 className="text-2xl  text-slate-900 dark:text-white  ">Production Management</h1>
            <p className="text-xs  text-slate-500   mt-1">Daily Workshop Floor Planning & Execution</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setModalMode("create");
              setSelectedPlanData(null);
              setIsModalOpen(true);
            }}
            className="p-2 bg-indigo-600 text-white rounded text-xs     shadow-indigo-600/30 hover:bg-indigo-700 transition-all flex items-center gap-3 group"
          >
            <Plus size={15} className="group-hover:rotate-90 transition-transform duration-300" />
            Create Daily Plan
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
            <p className="text-xs  text-slate-400  ">Loading production data...</p>
          </div>
        ) : (
          <div className="">
            <div className=" border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col lg:flex-row items-center gap-4">
              <div className="relative w-full lg:w-1/3">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder="Quick Search..."
                  className="w-full pl-11 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs  focus:ring-1 focus:ring-indigo-500 outline-none  "
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="w-full lg:w-1/3 flex items-center gap-2">
                <div className="flex-1">
                  <SearchableSelect
                    options={projects}
                    value={projectFilter}
                    onChange={setProjectFilter}
                    placeholder="Filter by Project..."
                    className="w-full"
                  />
                </div>
                {projectFilter && (
                  <button
                    onClick={() => setProjectFilter("")}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    title="Clear Project Filter"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              <div className="w-full lg:w-1/4 flex items-center gap-2">
                <div className="relative flex-1">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="date"
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs  focus:ring-1 focus:ring-indigo-500 outline-none  "
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                  />
                </div>
                {dateFilter && (
                  <button
                    onClick={() => setDateFilter("")}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    title="Clear Date Filter"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto bg-white mt-4">
              <table className="w-full text-left border-collapse bg-white">
                <thead>
                  <tr className="bg-slate-50/30 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                    <th className="p-2 text-xs  text-slate-400  ">Project Name</th>
                    <th className="p-2 text-xs  text-slate-400  ">Plan Date</th>
                    <th className="p-2 text-xs  text-slate-400   text-center">Operators</th>
                    <th className="p-2 text-xs  text-slate-400   text-center">MCR Scrap</th>
                    <th className="p-2 text-xs  text-slate-400   text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPlans.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-slate-500 text-xs   ">No production plans found</td>
                    </tr>
                  ) : (
                    filteredPlans.map((plan) => (
                      <tr key={plan.id} className="hover:bg-indigo-50/10 dark:hover:bg-indigo-900/10 transition-all">
                        <td className="p-2">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded">
                              <Target size={15} />
                            </div>
                            <span className="text-sm  text-slate-900 dark:text-white   truncate max-w-[300px]" title={plan.project_names}>
                              {plan.project_names || "General Plan"}
                            </span>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded">
                              <Calendar size={15} />
                            </div>
                            <span className="text-xs  text-slate-900 dark:text-white ">
                              {new Date(plan.plan_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </td>
                        <td className="p-2 text-center">
                          <span className="text-xs  text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                            {plan.operators_count}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          {plan.mcr_id ? (
                            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded">
                              {parseFloat(plan.total_scrap_weight || 0).toFixed(2)} KG
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300 dark:text-slate-700">-</span>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenPlan(plan.id, "view")}
                              className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                              title="View Plan Details"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => handleOpenPlan(plan.id, "edit")}
                              className="p-2 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                              title="Edit Plan"
                            >
                              <Pencil size={15} />
                            </button>
                            {plan.operation_names?.toLowerCase().includes("cutting") && (
                              plan.mcr_id ? (
                                <button
                                  onClick={() => {
                                    setSelectedPlanForMCR(plan);
                                    setIsMCRModalOpen(true);
                                  }}
                                  className="p-2 text-emerald-500 hover:text-emerald-700 transition-colors"
                                  title="Edit Saved MCR"
                                >
                                  <FileText size={15} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSelectedPlanForMCR(plan);
                                    setIsMCRModalOpen(true);
                                  }}
                                  className="p-2 text-indigo-400 hover:text-indigo-600 transition-colors"
                                  title="Generate MCR"
                                >
                                  <Scissors size={15} />
                                </button>
                              )
                            )}
                            <button
                              onClick={() => handleDeletePlan(plan.id)}
                              className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                              title="Delete Plan"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Planning Modal */}
      <CreatePlanModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPlanData(null);
        }}
        planDate={new Date().toISOString().split('T')[0]}
        projects={projects}
        operators={operators}
        operations={operations}
        onSave={handleCreatePlan}
        loading={modalLoading}
        mode={modalMode}
        initialData={selectedPlanData}
      />

      <MCRReportModal
        isOpen={isMCRModalOpen}
        onClose={() => setIsMCRModalOpen(false)}
        plan={selectedPlanForMCR}
        onRefresh={fetchData}
      />
    </div>
  );
};

export default DailyProductionPlanningPage;