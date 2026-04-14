import React, { useState } from "react";
import { 
  X, 
  Plus, 
  GripVertical, 
  Trash2, 
  Save, 
  Settings2,
  Clock,
  ShieldCheck
} from "lucide-react";

const OperationPlanModal = ({ isOpen, onClose, project }) => {
  const [operations, setOperations] = useState([
    { id: 1, name: "Cutting", sequence: 1, status: "Pending", qcRequired: true, remarks: "" },
    { id: 2, name: "Drilling", sequence: 2, status: "Pending", qcRequired: true, remarks: "" },
  ]);

  const operationOptions = [
    "Cutting", "Drilling", "Welding", "Grinding", "Machining", 
    "Fabrication", "Assembly", "Powder Coating", "Final Inspection"
  ];

  const addOperation = () => {
    const newOp = {
      id: Date.now(),
      name: operationOptions[0],
      sequence: operations.length + 1,
      status: "Pending",
      qcRequired: true,
      remarks: ""
    };
    setOperations([...operations, newOp]);
  };

  const removeOperation = (id) => {
    setOperations(operations.filter(op => op.id !== id).map((op, idx) => ({
      ...op,
      sequence: idx + 1
    })));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
          <div>
            <h2 className="text-xl  text-slate-900 dark:text-white  tracking-tight">
              Manage Operations Plan
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1   ">
              {project?.name} • {project?.rootCardRef}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs  text-slate-500  ">Manufacturing Sequence</h3>
              <button 
                onClick={addOperation}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg text-xs  hover:bg-blue-100 transition-colors "
              >
                <Plus size={14} /> Add Operation
              </button>
            </div>

            <div className="space-y-2">
              {operations.map((op, index) => (
                <div key={op.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded border border-slate-200 dark:border-slate-700 group hover:border-blue-300 dark:hover:border-blue-800 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="cursor-move text-slate-300 group-hover:text-slate-500 transition-colors">
                      <GripVertical size={20} />
                    </div>
                    <div className="w-8 h-8 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center  text-blue-600 text-sm ">
                      {op.sequence}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1">
                    <div className="md:col-span-4">
                      <select 
                        value={op.name}
                        onChange={(e) => {
                          const newOps = [...operations];
                          newOps[index].name = e.target.value;
                          setOperations(newOps);
                        }}
                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none "
                      >
                        {operationOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-3">
                      <div className="flex items-center gap-2 h-full">
                        <input 
                          type="checkbox" 
                          id={`qc-${op.id}`}
                          checked={op.qcRequired}
                          onChange={(e) => {
                            const newOps = [...operations];
                            newOps[index].qcRequired = e.target.checked;
                            setOperations(newOps);
                          }}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor={`qc-${op.id}`} className="text-xs  text-slate-600 dark:text-slate-400   flex items-center gap-1 cursor-pointer">
                          <ShieldCheck size={14} className="text-emerald-500" />
                          QC Required
                        </label>
                      </div>
                    </div>

                    <div className="md:col-span-5">
                      <input 
                        type="text"
                        placeholder="Remarks / Instructions..."
                        value={op.remarks}
                        onChange={(e) => {
                          const newOps = [...operations];
                          newOps[index].remarks = e.target.value;
                          setOperations(newOps);
                        }}
                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={() => removeOperation(op.id)}
                    className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            {operations.length === 0 && (
              <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                <Settings2 className="mx-auto text-slate-300 mb-4" size={48} />
                <h4 className="text-lg  text-slate-900 dark:text-white">No Operations Defined</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto">
                  Add the first manufacturing stage to begin planning this project.
                </p>
                <button 
                  onClick={addOperation}
                  className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded text-sm  hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                >
                  <Plus size={15} /> Add First Operation
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded text-sm  hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors  "
          >
            Cancel
          </button>
          <button 
            className="px-8 py-2.5 bg-blue-600 text-white rounded text-sm  hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 flex items-center gap-2  "
          >
            <Save size={15} /> Save Sequence
          </button>
        </div>
      </div>
    </div>
  );
};

export default OperationPlanModal;
