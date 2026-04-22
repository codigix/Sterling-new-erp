import React from "react";
import { FileText, Edit2, Trash2 } from "lucide-react";
import DataTable from "../../../ui/DataTable/DataTable";

const getMaterialType = (material) => {
  const typeMap = {
    steelSection: "Steel Sections",
    plateType: "Plates",
    materialGrade: "Material Grades",
    fastenerType: "Fasteners",
    machinedParts: "Machined Parts",
    rollerMovementComponents: "Roller/Movement",
    liftingPullingMechanisms: "Lifting/Pulling",
    electricalAutomation: "Electrical/Automation",
    safetyMaterials: "Safety Materials",
    surfacePrepPainting: "Surface Prep/Paint",
    fabricationConsumables: "Fabrication Consumables",
    hardwareMisc: "Hardware/Misc",
    documentationMaterials: "Documentation",
  };

  for (const [key, label] of Object.entries(typeMap)) {
    if (material[key]) {
      return label;
    }
  }
  return "-";
};

const getMaterialName = (material) => {
  return (
    material.steelSection ||
    material.plateType ||
    material.materialGrade ||
    material.fastenerType ||
    material.machinedParts ||
    material.rollerMovementComponents ||
    material.liftingPullingMechanisms ||
    material.electricalAutomation ||
    material.safetyMaterials ||
    material.surfacePrepPainting ||
    material.fabricationConsumables ||
    material.hardwareMisc ||
    material.documentationMaterials ||
    "-"
  );
};

export default function MaterialTable({
  materials = [],
  employees = [],
  onView,
  onEdit,
  onDelete,
  onAssigneeChange,
}) {
  if (materials.length === 0) {
    return null;
  }

  const columns = [
    {
      key: "name",
      label: "Material Name",
      render: (_, row) => getMaterialName(row),
    },
    {
      key: "type",
      label: "Type",
      render: (_, row) => (
        <span className="text-xs bg-slate-700 text-slate-300 rounded px-2 py-0.5">
          {getMaterialType(row)}
        </span>
      ),
    },
    { key: "quantity", label: "Qty" },
    { key: "unit", label: "Unit", render: (val) => val || "-" },
    {
      key: "source",
      label: "Source",
      render: (val) => (
        val ? (
          <span className="text-xs bg-blue-900 text-blue-200 rounded px-2 py-0.5 capitalize">
            {val}
          </span>
        ) : "-"
      ),
    },
    {
      key: "assignee",
      label: "Assignee",
      render: (val, row) => (
        <select
          value={val || ""}
          onChange={(e) => onAssigneeChange(row.id, e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select Assignee</option>
          {employees.map((emp) => (
            <option key={emp._id || emp.id} value={emp._id || emp.id}>
              {emp.name || emp.employeeName}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      align: "center",
      render: (_, row) => (
        <div className="flex items-center text-xs justify-center gap-2">
          <button
            type="button"
            onClick={() => onView(row)}
            className="w-8 h-8 rounded bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-colors"
            title="View Details"
          >
            <FileText size={15} />
          </button>
          <button
            type="button"
            onClick={() => onEdit(row)}
            className="w-8 h-8 rounded bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors"
            title="Edit"
          >
            <Edit2 size={15} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(row.id)}
            className="w-8 h-8 rounded bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors"
            title="Delete"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="mt-8">
      <DataTable
        title="Material Requirements Table"
        columns={columns}
        data={materials}
        striped={false}
        hover={true}
        rowClassName={() => "border-b border-slate-700"}
      />
    </div>
  );
}
