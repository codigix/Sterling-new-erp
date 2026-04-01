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
  Pencil
} from "lucide-react";
import SearchableSelect from "../../components/ui/SearchableSelect";

// Reuse Accordion component for the Modal structure
const AccordionSection = memo(({ title, section, children, itemCount = 0, expandedSections, toggleSection }) => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-hidden transition-all duration-200 mb-2 shadow-sm">
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
        <h3 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight">
          {title}
        </h3>
        {itemCount > 0 && (
          <span className="text-[9px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-bold">
            {itemCount} Assignments
          </span>
        )}
      </div>
    </div>
    {expandedSections[section] && (
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
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
  const [expandedSections, setExpandedSections] = useState({
    project: true,
    allocation: true,
    summary: true,
  });

  const [newAssignment, setNewAssignment] = useState({
    operation: "",
    operator: "",
    startTime: "09:00",
    endTime: "17:00",
    breakTime: "60",
    remarks: ""
  });

  const [dailyPlan, setDailyPlan] = useState([]);
  const [editingAssignmentId, setEditingAssignmentId] = useState(null);

  // Sync initial data when in edit/view mode
  useEffect(() => {
    if ((mode === "edit" || mode === "view") && initialData?.assignments) {
      const assignments = initialData.assignments.map(a => ({
        ...a,
        id: a.id,
        projectName: a.project_name,
        projectRef: a.root_card_id,
        operation_name: a.operation_name,
        operator_name: a.operator_name,
        start_time: a.start_time?.substring(0, 5),
        end_time: a.end_time?.substring(0, 5),
        total_hours: parseFloat(a.total_hours)
      }));
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
      setDailyPlan([]);
      setSelectedProject(null);
    }
    setEditingAssignmentId(null);
    setSelectedReleaseEntry(null);
  }, [mode, initialData, isOpen, projects]);

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
    const start = new Date(`2000-01-01T${newAssignment.startTime}`);
    const end = new Date(`2000-01-01T${newAssignment.endTime}`);
    if (end <= start) return 0;
    let diffHrs = (end - start) / (1000 * 60 * 60);
    let breakHrs = parseInt(newAssignment.breakTime || 0) / 60;
    return Math.max(0, diffHrs - breakHrs);
  }, [newAssignment.startTime, newAssignment.endTime, newAssignment.breakTime]);

  const handleAddAssignment = () => {
    if (!selectedProject || !newAssignment.operation || !newAssignment.operator) {
      toast.error("Please select project, operation and operator");
      return;
    }

    const start = new Date(`2000-01-01T${newAssignment.startTime}`);
    const end = new Date(`2000-01-01T${newAssignment.endTime}`);
    
    if (end <= start) {
      toast.error("End time must be after start time");
      return;
    }

    let diffHrs = (end - start) / (1000 * 60 * 60);
    let breakHrs = parseInt(newAssignment.breakTime || 0) / 60;
    const totalHours = Math.max(0, diffHrs - breakHrs);

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
      start_time: newAssignment.startTime,
      end_time: newAssignment.endTime,
      break_time: parseInt(newAssignment.breakTime || 0),
      total_hours: totalHours,
      remarks: newAssignment.remarks
    };

    if (editingAssignmentId) {
      setDailyPlan(dailyPlan.map(a => a.id === editingAssignmentId ? entry : a));
      setEditingAssignmentId(null);
      toast.success("Assignment updated");
    } else {
      setDailyPlan([...dailyPlan, entry]);
    }
    
    setNewAssignment({
      operation: "",
      operator: "",
      startTime: "09:00",
      endTime: "17:00",
      breakTime: "60",
      remarks: ""
    });
  };

  const editAssignment = (assignment) => {
    setEditingAssignmentId(assignment.id);
    setNewAssignment({
      operation: assignment.operation_name,
      operator: assignment.operator_name,
      startTime: assignment.start_time,
      endTime: assignment.end_time,
      breakTime: assignment.break_time || "60",
      remarks: assignment.remarks || ""
    });
    // Scroll to form or ensure section is expanded
    setExpandedSections(prev => ({ ...prev, allocation: true }));
  };

  const removeAssignment = (id) => {
    setDailyPlan(dailyPlan.filter(a => a.id !== id));
  };

  const handleFinalize = () => {
    if (dailyPlan.length === 0) {
      toast.error("Add at least one assignment to the plan");
      return;
    }
    onSave({ plan_date: planDate, assignments: dailyPlan });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
      <div className="bg-slate-50 dark:bg-slate-950 w-full max-w-7xl rounded shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[98vh]">
        {/* Modal Header - BOM Style */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-indigo-600 text-white rounded shadow-lg shadow-indigo-600/20">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                {mode === "view" ? "View Production Plan" : mode === "edit" ? "Edit Production Plan" : "Daily Production Planning"}
              </h2>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                {mode === "view" ? "Read-only plan view" : "Planning Workspace"} for {new Date(initialData?.plan?.plan_date || planDate).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors">
              <X size={20} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-4 overflow-y-auto flex-1">
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
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Project</label>
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
                      placeholder="SEARCH PROJECTS..."
                      disabled={mode === "view"}
                    />
                  </div>
                  <div className="md:col-span-4 space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inventory Release (ST#)</label>
                    <SearchableSelect 
                      options={entryOptions}
                      value={selectedReleaseEntry}
                      onChange={(val) => {
                        setSelectedReleaseEntry(val);
                      }}
                      placeholder={selectedProject ? (fetchingMaterials ? "FETCHING..." : "SELECT MATERIAL PIECE...") : "..."}
                      disabled={!selectedProject || mode === "view"}
                    />
                  </div>
                  {selectedProject && (
                    <div className="md:col-span-4 flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/10 rounded border border-indigo-100 dark:border-indigo-900/30">
                      <div className="flex-1">
                        <p className="text-[8px] font-bold text-indigo-600 uppercase tracking-widest mb-1">Project Reference</p>
                        <p className="text-[10px] font-black text-indigo-900 dark:text-indigo-300 truncate tracking-tighter">REF: {selectedProject.ref}</p>
                      </div>
                      <div className="border-l border-indigo-100 dark:border-indigo-900/30 pl-3 flex items-center">
                        <button 
                          onClick={() => setShowReleasedMaterials(true)}
                          className="p-2 bg-white dark:bg-slate-800 text-indigo-600 rounded border border-indigo-200 dark:border-indigo-800 shadow-sm hover:bg-indigo-50 transition-colors group relative"
                          title="View Released History"
                        >
                          <Eye size={16} />
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
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded border border-slate-100 dark:border-slate-800">
                        <div className="space-y-1.5 lg:col-span-1">
                          <label className="text-[9px] font-black text-slate-900 dark:text-slate-200 uppercase tracking-widest">Select Operator</label>
                          <SearchableSelect 
                            options={operators}
                            value={newAssignment.operator}
                            onChange={(val) => setNewAssignment({...newAssignment, operator: val})}
                            placeholder="SELECT OPERATOR..."
                            className="text-xs font-bold text-slate-900"
                          />
                        </div>
                        <div className="space-y-1.5 lg:col-span-1">
                          <label className="text-[9px] font-black text-slate-900 dark:text-slate-200 uppercase tracking-widest">Operation</label>
                          <SearchableSelect 
                            options={operations}
                            value={newAssignment.operation}
                            onChange={(val) => setNewAssignment({...newAssignment, operation: val})}
                            placeholder="SEARCH OPERATION..."
                            className="text-xs font-bold text-slate-900"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2 lg:col-span-2">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Start Time</label>
                            <input 
                              type="time" 
                              className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm font-bold outline-none"
                              value={newAssignment.startTime}
                              onChange={(e) => setNewAssignment({...newAssignment, startTime: e.target.value})}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">End Time</label>
                            <input 
                              type="time" 
                              className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm font-bold outline-none"
                              value={newAssignment.endTime}
                              onChange={(e) => setNewAssignment({...newAssignment, endTime: e.target.value})}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Live Load</label>
                            <div className="w-full px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 rounded text-sm font-black text-indigo-600 flex items-center justify-center">
                              {currentLoad.toFixed(1)}h
                            </div>
                          </div>
                        </div>
                        <div className="flex items-end lg:col-span-1">
                          <button 
                            onClick={handleAddAssignment}
                            className={`w-full h-[38px] ${editingAssignmentId ? "bg-amber-600 hover:bg-amber-700" : "bg-indigo-600 hover:bg-indigo-700"} text-white rounded font-black text-[10px] uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2`}
                          >
                            {editingAssignmentId ? <Save size={14} /> : <Plus size={14} />}
                            {editingAssignmentId ? "Update Item" : "Add to Plan"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Assignments List in this section */}
                    {dailyPlan.length > 0 && (
                      <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800">
                              <th className="px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Project / Ref</th>
                              <th className="px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Operation</th>
                              <th className="px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Operator</th>
                              <th className="px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Load</th>
                              {mode !== "view" && <th className="px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {dailyPlan.map((entry) => (
                              <tr key={entry.id} className="hover:bg-indigo-50/10 transition-all">
                                <td className="px-4 py-3">
                                  <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tighter">{entry.projectName}</p>
                                  <span className="text-[8px] font-bold text-slate-400 uppercase">{entry.projectRef}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded">{entry.operation_name}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight">{entry.operator_name}</span>
                                  <p className="text-[8px] text-slate-400">{entry.start_time} - {entry.end_time}</p>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="text-[10px] font-black text-slate-900 dark:text-white">{entry.total_hours.toFixed(1)}h</span>
                                </td>
                                {mode !== "view" && (
                                  <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button onClick={() => editAssignment(entry)} className="p-1.5 text-slate-300 hover:text-amber-600 transition-colors">
                                        <Pencil size={14} />
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
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1">Project Selection Required</h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Please select a root card above to begin operator allocation</p>
                </div>
              ) : null}
            </div>

            {/* Right Sidebar Info */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-indigo-600 text-white rounded flex items-center justify-center">
                    <Activity size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tighter">Plan Summary</h4>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Live Aggregates</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-100 dark:border-slate-800">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Man-Hours</p>
                    <h4 className="text-3xl font-black text-slate-900 dark:text-white">{dailyPlan.reduce((acc, curr) => acc + (parseFloat(curr.total_hours) || 0), 0).toFixed(1)}<span className="text-sm ml-1 text-slate-400 uppercase tracking-widest">Hrs</span></h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Operators</p>
                      <h5 className="text-lg font-black text-slate-900 dark:text-white">{new Set(dailyPlan.map(p => p.operator_id)).size}</h5>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Projects</p>
                      <h5 className="text-lg font-black text-slate-900 dark:text-white">{new Set(dailyPlan.map(p => p.root_card_id)).size}</h5>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <h5 className="text-[9px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-3 flex items-center gap-2">
                    <AlertCircle size={12} className="text-amber-500" /> Validation Rules
                  </h5>
                  <ul className="space-y-2 text-[9px] font-bold text-slate-500 uppercase tracking-tighter leading-relaxed">
                    <li>• Check for Overlapping Shifts</li>
                    <li>• Verify Operator Availability</li>
                    <li>• Sequence Order Validation</li>
                  </ul>
                </div>
              </div>

              {mode !== "view" && (
                <div className="p-4 bg-indigo-600 rounded shadow-xl shadow-indigo-600/20 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={14} className="fill-current" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">Fast Action</span>
                  </div>
                  <h5 className="text-xs font-black uppercase tracking-tighter leading-tight mb-3">Commit plan to floor execution immediately?</h5>
                  <button 
                    onClick={handleFinalize}
                    disabled={loading}
                    className="w-full py-2 bg-white text-indigo-600 rounded text-[9px] font-black uppercase tracking-[0.15em] hover:bg-slate-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
            {mode === "view" ? "Close Viewer" : "Cancel Workspace"}
          </button>
          {mode !== "view" && (
            <button 
              onClick={handleFinalize}
              disabled={loading}
              className="px-10 py-2.5 bg-indigo-600 text-white rounded text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
              {mode === "edit" ? "Update Today's Plan" : "Finalize Today's Plan"}
            </button>
          )}
        </div>

        {/* Released Materials Detail Modal */}
        {showReleasedMaterials && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-indigo-50/50 dark:bg-indigo-900/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-600 text-white rounded">
                    <Package size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">
                      Released Materials: {selectedProject?.name}
                    </h3>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Inventory Release History for this Project</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowReleasedMaterials(false)}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
                >
                  <X size={18} className="text-slate-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {releasedMaterials.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                      <Package size={32} />
                    </div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No materials released for this project yet</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {releasedMaterials.map((entry) => (
                      <div key={entry.entry_no} className="border border-slate-200 dark:border-slate-800 rounded overflow-hidden shadow-sm">
                        <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2 flex justify-between items-center border-b border-slate-200 dark:border-slate-800">
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{entry.entry_no}</span>
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <Calendar size={12} />
                              <span className="text-[10px] font-bold uppercase">{new Date(entry.entry_date).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{entry.remarks || 'NO REMARKS'}</span>
                        </div>
                        <table className="w-full text-left">
                          <thead>
                            <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                              <th className="px-4 py-2">Item Details</th>
                              <th className="px-4 py-2 text-center">Qty</th>
                              <th className="px-4 py-2 text-center">UOM</th>
                              <th className="px-4 py-2 text-right">ST Numbers</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {entry.items?.map((item, idx) => (
                              <tr key={idx} className="text-[11px] hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center gap-3">
                                    <div className="w-7 h-7 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded flex items-center justify-center">
                                      <Package size={14} />
                                    </div>
                                    <div>
                                      <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">{item.item_name}</p>
                                      <p className="text-[9px] font-bold text-slate-400 uppercase">{item.item_code}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 text-center font-black text-emerald-600">{item.quantity}</td>
                                <td className="px-4 py-2.5 text-center font-bold text-slate-500 uppercase">{item.uom}</td>
                                <td className="px-4 py-2.5 text-right font-bold text-indigo-500">{item.serials?.length || 0} PCS</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-end">
                <button 
                  onClick={() => setShowReleasedMaterials(false)}
                  className="px-6 py-2 bg-slate-900 text-white rounded text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                >
                  Close History
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DailyProductionPlanningPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
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
          label: op.name.toUpperCase(),
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 lg:p-8">
      {/* Page Header */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-sm text-indigo-600">
            <Clipboard size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Production Management</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Daily Workshop Floor Planning & Execution</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              setModalMode("create");
              setSelectedPlanData(null);
              setIsModalOpen(true);
            }}
            className="px-8 py-3 bg-indigo-600 text-white rounded text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all flex items-center gap-3 group"
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
            Create Daily Plan
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading production data...</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col lg:flex-row items-center gap-4">
              <div className="relative w-full lg:w-1/3">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="QUICK SEARCH..." 
                  className="w-full pl-11 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-black focus:ring-1 focus:ring-indigo-500 outline-none uppercase tracking-widest"
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
                    placeholder="FILTER BY PROJECT / ROOT CARD..."
                    className="w-full"
                  />
                </div>
                {projectFilter && (
                  <button 
                    onClick={() => setProjectFilter("")}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    title="Clear Project Filter"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="w-full lg:w-1/4 flex items-center gap-2">
                <div className="relative flex-1">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="date" 
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-black focus:ring-1 focus:ring-indigo-500 outline-none uppercase tracking-widest"
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
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/30 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Project Name</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Plan Date</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Operators</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPlans.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-slate-500 text-[10px] font-black uppercase tracking-widest">No production plans found</td>
                    </tr>
                  ) : (
                    filteredPlans.map((plan) => (
                      <tr key={plan.id} className="hover:bg-indigo-50/10 dark:hover:bg-indigo-900/10 transition-all">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded">
                              <Target size={16} />
                            </div>
                            <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight truncate max-w-[300px]" title={plan.project_names}>
                              {plan.project_names || "General Plan"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded">
                              <Calendar size={16} />
                            </div>
                            <span className="text-xs font-black text-slate-900 dark:text-white uppercase">
                              {new Date(plan.plan_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className="text-xs font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                            {plan.operators_count}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleOpenPlan(plan.id, "view")}
                              className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                              title="View Plan Details"
                            >
                              <Eye size={18} />
                            </button>
                            <button 
                              onClick={() => handleOpenPlan(plan.id, "edit")}
                              className="p-2 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                              title="Edit Plan"
                            >
                              <Pencil size={18} />
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
    </div>
  );
};

export default DailyProductionPlanningPage;