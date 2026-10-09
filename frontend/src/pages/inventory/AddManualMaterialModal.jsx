import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Plus,
  Trash2,
  Package,
  Layers,
  Calculator,
  Warehouse,
  Sparkles,
  Save,
  Loader2,
  Calendar,
  CheckCircle2,
  Info
} from "lucide-react";
import axios from "../../utils/api";
import Swal from "sweetalert2";
import toastUtils from "../../utils/toastUtils";
import SearchableSelect from "../../components/ui/SearchableSelect";
import { renderDimensions } from "../../utils/dimensionUtils";

const ItemGroupOptions = [
  "Plates",
  "Round Bar",
  "Pipe",
  "Square Bar",
  "Rectangular Bar",
  "Square Tube",
  "Rectangular Tube",
  "C Channel",
  "Angle",
  "I Beam",
  "H Beam",
  "Paint",
  "Block",
  "Bought Out",
];

const MaterialTypeOptions = [
  { label: "Mild Steel / Carbon Steel", value: "7.85" },
  { label: "Stainless Steel (304/316)", value: "8.00" },
  { label: "Aluminum", value: "2.70" },
  { label: "Copper", value: "8.96" },
  { label: "Chemical", value: "1.10" },
  { label: "Other", value: "other" },
];

const MaterialGradeOptions = [
  "IS:2062-250",
  "IS:2062-350",
  "IS:2062-450",
  "SA-516 Gr.70",
  "S690QL",
  "EN-8",
  "EN-19",
  "EN-24",
  "17-4 PH",
  "15-5 PH",
  "S.S-304",
  "S.S-316",
  "HE.30",
  "AL.6061",
  "AL.2014 T6",
].map((grade) => ({ label: grade, value: grade }));

const UOMOptions = ["Nos", "Kg", "pcs", "m", "l", "set", "Box", "Packet"];

const itemGroupSelectOptions = ItemGroupOptions.map((g) => ({ label: g, value: g }));
const uomSelectOptions = UOMOptions.map((u) => ({ label: u, value: u }));

const emptyMaterialState = {
  itemName: "",
  itemCode: "",
  quantity: 1,
  uom: "Nos",
  itemGroup: "Plates",
  materialGrade: "IS:2062-250",
  materialType: "Mild Steel / Carbon Steel",
  densityType: "7.85",
  density: 7.85,
  partDetail: "",
  remark: "",
  make: "",
  length: "",
  width: "",
  thickness: "",
  diameter: "",
  outerDiameter: "",
  height: "",
  side1: "",
  side2: "",
  webThickness: "",
  flangeThickness: "",
  calculatedWeight: 0,
  itemsPerPacket: 1,
  valuationRate: 0,
};

const AddManualMaterialModal = ({ isOpen, onClose, onSuccess }) => {
  const [submitting, setSubmitting] = useState(false);

  // Current material input state (BOM style)
  const [material, setMaterial] = useState({ ...emptyMaterialState });
  
  // Staged materials list
  const [stagedMaterials, setStagedMaterials] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setMaterial((prev) => ({
        ...prev,
        itemGroup: prev.itemGroup || "Plates",
        materialGrade: prev.materialGrade || "IS:2062-250",
        materialType: prev.materialType || "Mild Steel / Carbon Steel",
        densityType: prev.densityType || "7.85",
        density: prev.density || 7.85,
      }));
    }
  }, [isOpen]);

  // Weight Calculation - exact same algorithm as CreateBOMPage
  const calculateItemWeight = useCallback((item) => {
    const group = item.itemGroup?.toLowerCase() || "";
    const density = parseFloat(item.density) || 0;
    let unitWeight = 0;

    if (density <= 0) return 0;

    const L = parseFloat(item.length) || 0;
    const W = parseFloat(item.width) || 0;
    const T = parseFloat(item.thickness) || 0;
    const D = parseFloat(item.diameter) || 0;
    const OD = parseFloat(item.outerDiameter) || 0;
    const H = parseFloat(item.height) || 0;
    const S1 = parseFloat(item.side1) || 0;
    const S2 = parseFloat(item.side2) || 0;
    const WT = parseFloat(item.webThickness) || 0;
    const FT = parseFloat(item.flangeThickness) || 0;

    if (group.includes("plate") || group.includes("block")) {
      const thick = group.includes("plate") ? T : H;
      unitWeight = (L * W * thick * density) / 1000000;
    } else if (group.includes("round bar")) {
      const radius = D / 2;
      unitWeight = (Math.PI * Math.pow(radius, 2) * L * density) / 1000000;
    } else if (group.includes("pipe")) {
      const outerRadius = OD / 2;
      const innerRadius = outerRadius - T;
      if (innerRadius >= 0) {
        unitWeight =
          (Math.PI *
            (Math.pow(outerRadius, 2) - Math.pow(innerRadius, 2)) *
            L *
            density) /
          1000000;
      }
    } else if (group.includes("square bar")) {
      unitWeight = (S1 * S1 * L * density) / 1000000;
    } else if (group.includes("rectangular bar")) {
      unitWeight = (W * T * L * density) / 1000000;
    } else if (group.includes("square tube")) {
      const outerArea = S1 * S1;
      const innerSide = S1 - 2 * T;
      const innerArea = innerSide > 0 ? innerSide * innerSide : 0;
      unitWeight = ((outerArea - innerArea) * L * density) / 1000000;
    } else if (group.includes("rectangular tube")) {
      const outerArea = W * H;
      const innerW = W - 2 * T;
      const innerH = H - 2 * T;
      const innerArea = innerW > 0 && innerH > 0 ? innerW * innerH : 0;
      unitWeight = ((outerArea - innerArea) * L * density) / 1000000;
    } else if (group.includes("angle")) {
      unitWeight = ((S1 + S2 - T) * T * L * density) / 1000000;
    } else if (group.includes("c channel")) {
      unitWeight = ((W * T + 2 * (H - T) * T) * L * density) / 1000000;
    } else if (group.includes("i beam") || group.includes("h beam")) {
      unitWeight = ((2 * W * FT + (H - 2 * FT) * WT) * L * density) / 1000000;
    }

    return unitWeight;
  }, []);

  // Update calculated weight on dimension / density changes
  useEffect(() => {
    const unitWeight = calculateItemWeight(material);
    const totalWeight = unitWeight * (parseFloat(material.quantity) || 0);

    if (unitWeight !== material.calculatedWeight) {
      setMaterial((prev) => ({
        ...prev,
        calculatedWeight: unitWeight,
        quantity:
          prev.uom === "Kg" && (prev.quantity === 1 || prev.quantity === 0)
            ? totalWeight.toFixed(3)
            : prev.quantity,
      }));
    }
  }, [
    material.length,
    material.width,
    material.thickness,
    material.height,
    material.diameter,
    material.outerDiameter,
    material.side1,
    material.side2,
    material.webThickness,
    material.flangeThickness,
    material.density,
    material.itemGroup,
    material.quantity,
    material.uom,
    calculateItemWeight,
  ]);

  // Auto-generate suggested name if user hasn't explicitly set a custom one
  const autoSuggestedName = useMemo(() => {
    const group = (material.itemGroup || "").toLowerCase();
    const L = material.length;
    const W = material.width;
    const T = material.thickness;
    const D = material.diameter;
    const OD = material.outerDiameter;
    const H = material.height;
    const S1 = material.side1;
    const S2 = material.side2;

    if (group.includes("plate") && L && W && T) {
      return `${L}×${W}×${T} mm Plate`;
    }
    if (group.includes("round bar") && D && L) {
      return `Ø${D}×${L} mm long`;
    }
    if (group.includes("pipe") && OD && T && L) {
      return `OD${OD}×${T} thk x${L} mm Pipe`;
    }
    if (group.includes("square bar") && S1 && L) {
      return `${S1}×${S1}×${L} mm Sq Bar`;
    }
    if (group.includes("rectangular bar") && W && T && L) {
      return `${W}×${T}×${L} mm Rect Bar`;
    }
    if (group.includes("square tube") && S1 && T && L) {
      return `${S1}×${S1}×${T} thk x${L} mm Sq Tube`;
    }
    if (group.includes("rectangular tube") && W && H && T && L) {
      return `${W}×${H}×${T} thk x${L} mm Rect Tube`;
    }
    if (group.includes("angle") && S1 && (S2 || S1) && T && L) {
      return `${S1}×${S2 || S1}×${T} mm Angle`;
    }
    if (group.includes("c channel") && W && H && T && L) {
      return `${W}×${H}×${T} mm Channel`;
    }
    if ((group.includes("i beam") || group.includes("h beam")) && H && W && L) {
      return `${H}×${W}×${L} mm Beam`;
    }
    if (group.includes("block") && L && W && H) {
      return `${L}×${W}×${H} mm Block`;
    }
    return "";
  }, [
    material.itemGroup,
    material.length,
    material.width,
    material.thickness,
    material.diameter,
    material.outerDiameter,
    material.height,
    material.side1,
    material.side2,
  ]);

  const handleStageMaterial = () => {
    const finalName = (material.itemName || autoSuggestedName || "").trim();
    if (!finalName) {
      toastUtils.error("Please enter or generate an Item Name");
      return;
    }

    const qty = parseFloat(material.quantity);
    if (!qty || qty <= 0) {
      toastUtils.error("Please enter a valid Quantity greater than 0");
      return;
    }

    const newStagedItem = {
      ...material,
      id: Date.now() + Math.random(),
      itemName: finalName,
      unitWeight: parseFloat(material.calculatedWeight) || 0,
      totalWeight:
        (parseFloat(material.calculatedWeight) || 0) * (parseFloat(material.quantity) || 1),
    };

    setStagedMaterials((prev) => [...prev, newStagedItem]);
    toastUtils.success(`Added ${finalName} to list`);

    // Reset current form to blank for next item
    setMaterial({
      ...emptyMaterialState,
      itemGroup: material.itemGroup,
      materialType: material.materialType,
      densityType: material.densityType,
      density: material.density,
      materialGrade: material.materialGrade,
    });
  };

  const handleRemoveStagedItem = (id) => {
    setStagedMaterials((prev) => prev.filter((item) => item.id !== id));
  };

  const handleFinalSubmit = async () => {
    let itemsToSubmit = [...stagedMaterials];

    // If no staged items yet, check if current active form has valid data to submit directly
    if (itemsToSubmit.length === 0) {
      const finalName = (material.itemName || autoSuggestedName || "").trim();
      const qty = parseFloat(material.quantity);

      if (finalName && qty > 0) {
        itemsToSubmit.push({
          ...material,
          itemName: finalName,
          unitWeight: parseFloat(material.calculatedWeight) || 0,
          totalWeight:
            (parseFloat(material.calculatedWeight) || 0) * (parseFloat(material.quantity) || 1),
        });
      }
    }

    if (itemsToSubmit.length === 0) {
      toastUtils.error("Please add at least one material to submit to stock");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        entry_date: new Date().toISOString().split("T")[0],
        warehouse: "Main Store",
        location: "Main Store",
        project_name: null,
        vendor_name: null,
        remarks: "Direct stock addition from inventory",
        items: itemsToSubmit.map((item) => ({
          item_name: item.itemName,
          item_code: item.itemCode || null,
          item_group: item.itemGroup,
          material_type: item.materialType,
          material_grade: item.materialGrade,
          density: item.density,
          quantity: parseFloat(item.quantity) || 1,
          uom: item.uom || "Nos",
          unit_weight: parseFloat(item.unitWeight || item.calculatedWeight) || 0,
          total_weight: parseFloat(item.totalWeight) || 0,
          length: item.length || null,
          width: item.width || null,
          thickness: item.thickness || null,
          diameter: item.diameter || null,
          outer_diameter: item.outerDiameter || null,
          height: item.height || null,
          web_thickness: item.webThickness || null,
          flange_thickness: item.flangeThickness || null,
          side1: item.side1 || null,
          side2: item.side2 || null,
          items_per_packet: item.itemsPerPacket || 1,
          valuation_rate: parseFloat(item.valuationRate) || 0,
          part_detail: item.partDetail || null,
          remark: item.remark || null,
          make: item.make || null,
        })),
      };

      const response = await axios.post("/inventory/manual-stock", payload);

      if (response.data?.success) {
        // Reset and close immediately so user is never blocked
        setStagedMaterials([]);
        setMaterial({ ...emptyMaterialState });
        onClose();
        if (onSuccess) onSuccess();

        toastUtils.success(`Material Added! Created Entry: ${response.data.entry_no}`);

        Swal.fire({
          icon: "success",
          title: "Material Added to Stock!",
          html: `<p class="text-sm">Created Entry: <b>${response.data.entry_no}</b> with <b>${response.data.items?.length || itemsToSubmit.length}</b> material(s).</p>
                 <p class="text-xs text-slate-500 mt-2">Available ST serial tracking pieces have been registered into the live ledger.</p>`,
          confirmButtonColor: "#4f46e5",
          timer: 3500,
          timerProgressBar: true,
        });
      } else {
        toastUtils.error(response.data?.message || "Failed to add material to stock");
      }
    } catch (error) {
      console.error("Error submitting manual stock:", error);
      toastUtils.error(
        error.response?.data?.message || error.message || "Failed to add material to stock"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const totalStagedQty = stagedMaterials.reduce(
    (sum, m) => sum + (parseFloat(m.quantity) || 0),
    0
  );
  const totalStagedWeight = stagedMaterials.reduce(
    (sum, m) => sum + (parseFloat(m.totalWeight) || 0),
    0
  );

  return createPortal(
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-[9000] animate-in fade-in duration-200">
      <div className="rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Package size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Add Material Manually to Stock
                </h2>
                <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                  Live Inventory
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                BOM-style raw material specification with auto dimensions, weight calculation & ST serial creation.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4">

          {/* BOM-Style Raw Material Input Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 sm:p-4">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded">
                  <Layers size={14} />
                </span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Raw Material Specification (BOM Standard)
                </span>
              </div>
              {autoSuggestedName && (
                <button
                  type="button"
                  onClick={() =>
                    setMaterial((prev) => ({ ...prev, itemName: autoSuggestedName }))
                  }
                  className="text-[11px] flex items-center gap-1 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium"
                >
                  <Sparkles size={12} />
                  <span>Use Dimension Name: "{autoSuggestedName}"</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              {/* Item Name */}
              <div className="md:col-span-4">
                <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={material.itemName}
                  onChange={(e) =>
                    setMaterial((prev) => ({ ...prev, itemName: e.target.value }))
                  }
                  placeholder={autoSuggestedName || "Enter material name"}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                />
              </div>

              {/* Item Group */}
              <div className="md:col-span-3">
                <SearchableSelect
                  label="Item Group"
                  options={itemGroupSelectOptions}
                  value={material.itemGroup}
                  portalZIndex={100050}
                  onChange={(val) =>
                    setMaterial((prev) => ({
                      ...prev,
                      itemGroup: val,
                      uom: val?.toLowerCase() === "bought out" ? "Packet" : prev.uom,
                      length: "",
                      width: "",
                      thickness: "",
                      diameter: "",
                      outerDiameter: "",
                      height: "",
                      side1: "",
                      side2: "",
                      webThickness: "",
                      flangeThickness: "",
                      calculatedWeight: 0,
                    }))
                  }
                  placeholder="Select group"
                  allowCustom={true}
                />
              </div>

              {/* Material Type (Density) */}
              {material.itemGroup?.toLowerCase() !== "bought out" && (
                <>
                  <div className="md:col-span-3">
                    <SearchableSelect
                      label="Material Type (Density)"
                      options={MaterialTypeOptions}
                      value={material.densityType}
                      portalZIndex={100050}
                      onChange={(val) => {
                        if (val === "other") {
                          setMaterial((prev) => ({
                            ...prev,
                            densityType: "other",
                            density: prev.densityType === "other" ? prev.density : 0,
                            materialType: "Other",
                          }));
                        } else {
                          const selected = MaterialTypeOptions.find((opt) => opt.value === val);
                          setMaterial((prev) => ({
                            ...prev,
                            densityType: val,
                            density: val,
                            materialType: selected ? selected.label : "",
                          }));
                        }
                      }}
                      placeholder="Select material"
                    />
                  </div>

                  {material.densityType === "other" && (
                    <div className="md:col-span-2">
                      <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                        Custom Density
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={material.density}
                        onChange={(e) =>
                          setMaterial((prev) => ({
                            ...prev,
                            density: e.target.value,
                          }))
                        }
                        placeholder="Density"
                        className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                      />
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <SearchableSelect
                      label="Material Grade"
                      options={MaterialGradeOptions}
                      value={material.materialGrade}
                      portalZIndex={100050}
                      onChange={(val) =>
                        setMaterial((prev) => ({
                          ...prev,
                          materialGrade: val,
                        }))
                      }
                      placeholder="Select/Type grade"
                      allowCustom={true}
                    />
                  </div>
                </>
              )}

              {/* Dynamic Dimension Inputs */}
              {!material.itemGroup && (
                <div className="md:col-span-12 p-3 bg-amber-50/70 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                  <Info size={14} className="flex-shrink-0" />
                  <span>Please select an <b>Item Group</b> from the dropdown above (e.g. Plates, Round Bar, Pipe...) to enter dimensional specifications.</span>
                </div>
              )}

              {/* Plate: Length, Width, Thickness */}
              {material.itemGroup?.toLowerCase().includes("plate") && (
                <>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Length (mm)
                    </label>
                    <input
                      type="number"
                      value={material.length}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, length: e.target.value }))
                      }
                      placeholder="Length"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Width (mm)
                    </label>
                    <input
                      type="number"
                      value={material.width}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, width: e.target.value }))
                      }
                      placeholder="Width"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Thickness (mm)
                    </label>
                    <input
                      type="number"
                      value={material.thickness}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, thickness: e.target.value }))
                      }
                      placeholder="Thickness"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                </>
              )}

              {/* Round Bar: Diameter, Length */}
              {material.itemGroup?.toLowerCase().includes("round bar") && (
                <>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Diameter (mm)
                    </label>
                    <input
                      type="number"
                      value={material.diameter}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, diameter: e.target.value }))
                      }
                      placeholder="Diameter"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Length (mm)
                    </label>
                    <input
                      type="number"
                      value={material.length}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, length: e.target.value }))
                      }
                      placeholder="Length"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                </>
              )}

              {/* Pipe: Outer Diameter, Thickness, Length */}
              {material.itemGroup?.toLowerCase().includes("pipe") && (
                <>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Outer Diameter (mm)
                    </label>
                    <input
                      type="number"
                      value={material.outerDiameter}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, outerDiameter: e.target.value }))
                      }
                      placeholder="Outer Diameter"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Thickness (mm)
                    </label>
                    <input
                      type="number"
                      value={material.thickness}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, thickness: e.target.value }))
                      }
                      placeholder="Thickness"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Length (mm)
                    </label>
                    <input
                      type="number"
                      value={material.length}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, length: e.target.value }))
                      }
                      placeholder="Length"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                </>
              )}

              {/* Square Bar */}
              {material.itemGroup?.toLowerCase().includes("square bar") && (
                <>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Side (mm)
                    </label>
                    <input
                      type="number"
                      value={material.side1}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, side1: e.target.value }))
                      }
                      placeholder="Side"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Length (mm)
                    </label>
                    <input
                      type="number"
                      value={material.length}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, length: e.target.value }))
                      }
                      placeholder="Length"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                </>
              )}

              {/* Rectangular Bar */}
              {material.itemGroup?.toLowerCase().includes("rectangular bar") && (
                <>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Width (mm)
                    </label>
                    <input
                      type="number"
                      value={material.width}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, width: e.target.value }))
                      }
                      placeholder="Width"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Thickness (mm)
                    </label>
                    <input
                      type="number"
                      value={material.thickness}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, thickness: e.target.value }))
                      }
                      placeholder="Thickness"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Length (mm)
                    </label>
                    <input
                      type="number"
                      value={material.length}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, length: e.target.value }))
                      }
                      placeholder="Length"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                </>
              )}

              {/* Square Tube */}
              {material.itemGroup?.toLowerCase().includes("square tube") && (
                <>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Outer Side (mm)
                    </label>
                    <input
                      type="number"
                      value={material.side1}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, side1: e.target.value }))
                      }
                      placeholder="Side"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Thickness (mm)
                    </label>
                    <input
                      type="number"
                      value={material.thickness}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, thickness: e.target.value }))
                      }
                      placeholder="Thickness"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Length (mm)
                    </label>
                    <input
                      type="number"
                      value={material.length}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, length: e.target.value }))
                      }
                      placeholder="Length"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                </>
              )}

              {/* Rectangular Tube */}
              {material.itemGroup?.toLowerCase().includes("rectangular tube") && (
                <>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Outer Width (mm)
                    </label>
                    <input
                      type="number"
                      value={material.width}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, width: e.target.value }))
                      }
                      placeholder="Width"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Outer Height (mm)
                    </label>
                    <input
                      type="number"
                      value={material.height}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, height: e.target.value }))
                      }
                      placeholder="Height"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Thickness (mm)
                    </label>
                    <input
                      type="number"
                      value={material.thickness}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, thickness: e.target.value }))
                      }
                      placeholder="Thickness"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Length (mm)
                    </label>
                    <input
                      type="number"
                      value={material.length}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, length: e.target.value }))
                      }
                      placeholder="Length"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                </>
              )}

              {/* Angle */}
              {material.itemGroup?.toLowerCase().includes("angle") && (
                <>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Side 1 (mm)
                    </label>
                    <input
                      type="number"
                      value={material.side1}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, side1: e.target.value }))
                      }
                      placeholder="Side 1"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Side 2 (mm)
                    </label>
                    <input
                      type="number"
                      value={material.side2}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, side2: e.target.value }))
                      }
                      placeholder="Side 2"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Thickness (mm)
                    </label>
                    <input
                      type="number"
                      value={material.thickness}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, thickness: e.target.value }))
                      }
                      placeholder="Thickness"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Length (mm)
                    </label>
                    <input
                      type="number"
                      value={material.length}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, length: e.target.value }))
                      }
                      placeholder="Length"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                </>
              )}

              {/* C Channel */}
              {material.itemGroup?.toLowerCase().includes("c channel") && (
                <>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Web Width (mm)
                    </label>
                    <input
                      type="number"
                      value={material.width}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, width: e.target.value }))
                      }
                      placeholder="Width"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Flange Height (mm)
                    </label>
                    <input
                      type="number"
                      value={material.height}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, height: e.target.value }))
                      }
                      placeholder="Height"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Thickness (mm)
                    </label>
                    <input
                      type="number"
                      value={material.thickness}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, thickness: e.target.value }))
                      }
                      placeholder="Thickness"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Length (mm)
                    </label>
                    <input
                      type="number"
                      value={material.length}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, length: e.target.value }))
                      }
                      placeholder="Length"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                </>
              )}

              {/* I/H Beam */}
              {(material.itemGroup?.toLowerCase().includes("i beam") ||
                material.itemGroup?.toLowerCase().includes("h beam")) && (
                <>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Total Height (mm)
                    </label>
                    <input
                      type="number"
                      value={material.height}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, height: e.target.value }))
                      }
                      placeholder="Height"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Flange Width (mm)
                    </label>
                    <input
                      type="number"
                      value={material.width}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, width: e.target.value }))
                      }
                      placeholder="Width"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Web Thick (mm)
                    </label>
                    <input
                      type="number"
                      value={material.webThickness}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, webThickness: e.target.value }))
                      }
                      placeholder="Web T"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Flange Thick (mm)
                    </label>
                    <input
                      type="number"
                      value={material.flangeThickness}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, flangeThickness: e.target.value }))
                      }
                      placeholder="Flange T"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Length (mm)
                    </label>
                    <input
                      type="number"
                      value={material.length}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, length: e.target.value }))
                      }
                      placeholder="Length"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                </>
              )}

              {/* Block */}
              {material.itemGroup?.toLowerCase().includes("block") && (
                <>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Block Length (mm)
                    </label>
                    <input
                      type="number"
                      value={material.length}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, length: e.target.value }))
                      }
                      placeholder="Length"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Width (mm)
                    </label>
                    <input
                      type="number"
                      value={material.width}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, width: e.target.value }))
                      }
                      placeholder="Width"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Height (mm)
                    </label>
                    <input
                      type="number"
                      value={material.height}
                      onChange={(e) =>
                        setMaterial((prev) => ({ ...prev, height: e.target.value }))
                      }
                      placeholder="Height"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                </>
              )}

              {/* Part Detail */}
              <div className="md:col-span-3">
                <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                  Part Detail
                </label>
                <input
                  type="text"
                  value={material.partDetail}
                  onChange={(e) =>
                    setMaterial((prev) => ({ ...prev, partDetail: e.target.value }))
                  }
                  placeholder="Details"
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                />
              </div>

              {/* Quantity */}
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                  Qty *
                </label>
                <input
                  type="number"
                  value={material.quantity}
                  onChange={(e) =>
                    setMaterial((prev) => ({
                      ...prev,
                      quantity: e.target.value === "" ? "" : parseFloat(e.target.value),
                    }))
                  }
                  onBlur={(e) => {
                    if (e.target.value === "") {
                      setMaterial((prev) => ({ ...prev, quantity: 1 }));
                    }
                  }}
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                />
              </div>

              {/* UOM */}
              <div className="md:col-span-3">
                <SearchableSelect
                  label="UOM"
                  options={uomSelectOptions}
                  value={material.uom}
                  onChange={(val) => setMaterial((prev) => ({ ...prev, uom: val }))}
                  allowCustom={true}
                />
              </div>

              {/* Items per Packet if Bought Out */}
              {material.itemGroup?.toLowerCase() === "bought out" &&
                ["packet", "box", "set"].includes(material.uom?.toLowerCase()) && (
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                      Qty per {material.uom}
                    </label>
                    <input
                      type="number"
                      value={material.itemsPerPacket}
                      onChange={(e) =>
                        setMaterial((prev) => ({
                          ...prev,
                          itemsPerPacket: parseFloat(e.target.value) || 1,
                        }))
                      }
                      placeholder="Per packet"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                    />
                  </div>
                )}

              {/* Make / Brand */}
              <div className="md:col-span-4">
                <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                  Make / Brand
                </label>
                <input
                  type="text"
                  value={material.make}
                  onChange={(e) =>
                    setMaterial((prev) => ({ ...prev, make: e.target.value }))
                  }
                  placeholder="Make / Brand"
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                />
              </div>

              {/* Remark */}
              <div className="md:col-span-5">
                <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1">
                  Remark / Note
                </label>
                <input
                  type="text"
                  value={material.remark}
                  onChange={(e) =>
                    setMaterial((prev) => ({ ...prev, remark: e.target.value }))
                  }
                  placeholder="Remarks"
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                />
              </div>

              {/* Live Weight Info Card (Matching BOM) */}
              {material.calculatedWeight > 0 && (
                <div className="md:col-span-12 p-3 bg-blue-50/60 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30 flex flex-wrap items-center justify-between gap-4 mt-1">
                  <div className="flex flex-wrap items-center gap-6">
                    <div>
                      <span className="text-[11px] text-blue-500 block">Unit Weight</span>
                      <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                        {Number(material.calculatedWeight.toFixed(3))} Kg
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-blue-500 block">Total Weight</span>
                      <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                        {Number(
                          (
                            material.calculatedWeight * (parseFloat(material.quantity) || 0)
                          ).toFixed(3)
                        )}{" "}
                        Kg
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-blue-500 block">Material & Density</span>
                      <span className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                        {material.materialType} ({material.density})
                      </span>
                    </div>
                  </div>

                  {material.uom === "Kg" && (
                    <button
                      type="button"
                      onClick={() =>
                        setMaterial((prev) => ({
                          ...prev,
                          quantity: Number(
                            (
                              prev.calculatedWeight * (parseFloat(prev.quantity) || 1)
                            ).toFixed(3)
                          ),
                        }))
                      }
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded transition-colors shadow-sm"
                    >
                      Apply to Qty
                    </button>
                  )}
                </div>
              )}

              {/* Add Material to List Button */}
              <div className="md:col-span-12 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleStageMaterial}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                >
                  <Plus size={14} />
                  <span>Add Material to List</span>
                </button>
              </div>
            </div>
          </div>

          {/* Staged Materials Table (If any items staged) */}
          {stagedMaterials.length > 0 && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
              <div className="p-3 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Staged Materials to Add ({stagedMaterials.length})
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-slate-500">
                    Total Qty: <strong className="text-slate-800 dark:text-white">{totalStagedQty}</strong>
                  </span>
                  <span className="text-slate-500">
                    Total Weight: <strong className="text-slate-800 dark:text-white">{totalStagedWeight.toFixed(2)} Kg</strong>
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/60 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400">
                      <th className="p-2.5 w-10 text-center">#</th>
                      <th className="p-2.5">Item Name / Group</th>
                      <th className="p-2.5">Dimensions</th>
                      <th className="p-2.5">Grade / Detail</th>
                      <th className="p-2.5 text-center">Unit Wt (Kg)</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5">UOM</th>
                      <th className="p-2.5 text-center">Total Wt (Kg)</th>
                      <th className="p-2.5 text-center w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {stagedMaterials.map((item, idx) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="p-2.5 text-center text-slate-400">{idx + 1}</td>
                        <td className="p-2.5">
                          <div className="font-medium text-slate-800 dark:text-white">
                            {item.itemName}
                          </div>
                          <div className="text-[10px] text-slate-400">{item.itemGroup}</div>
                        </td>
                        <td className="p-2.5">
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">
                            {renderDimensions(item)}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <div className="text-slate-700 dark:text-slate-300">
                            {item.materialGrade || "-"}
                          </div>
                          {item.partDetail && (
                            <div className="text-[10px] text-slate-400">{item.partDetail}</div>
                          )}
                        </td>
                        <td className="p-2.5 text-center font-mono">
                          {item.unitWeight ? Number(item.unitWeight).toFixed(3) : "-"}
                        </td>
                        <td className="p-2.5 text-center font-semibold text-slate-800 dark:text-white">
                          {item.quantity}
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-300">{item.uom}</td>
                        <td className="p-2.5 text-center font-mono font-medium text-indigo-600 dark:text-indigo-400">
                          {item.totalWeight ? Number(item.totalWeight).toFixed(3) : "-"}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveStagedItem(item.id)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                            title="Remove"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Info size={14} className="text-slate-400" />
            <span>
              {stagedMaterials.length > 0
                ? `${stagedMaterials.length} material(s) ready to insert into stock ledger`
                : "Add materials above or directly submit current specification"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-xs transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={submitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded text-xs font-medium flex items-center gap-2 transition-all shadow-md active:scale-95"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Adding to Stock...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>
                    {stagedMaterials.length > 0
                      ? `Confirm & Save ${stagedMaterials.length} Material(s) to Stock`
                      : "Save Material to Stock"}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AddManualMaterialModal;
