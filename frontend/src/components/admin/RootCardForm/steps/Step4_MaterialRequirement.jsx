import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Package, Plus, Trash2, Edit2, Search, Tag, X, FileText, Send, Receipt, ShoppingCart, List } from "lucide-react";
import Input from "../../../ui/Input";
import FormSection from "../shared/FormSection";
import FormRow from "../shared/FormRow";
import AssigneeField from "../shared/AssigneeField";
import Button from "../../../ui/Button";
import Modal from "../../../ui/Modal";
import Select from "../../../ui/Select";
import SearchableSelect from "../../../ui/SearchableSelect";
import { useFormData, useRootCardContext } from "../hooks";
import axios from "../../../../utils/api";
import Swal from "sweetalert2";
import { showSuccess, showError } from "../../../../utils/toastUtils";
import Tabs from "../../../ui/Tabs";
import DataTable from "../../../ui/DataTable/DataTable";
import Badge from "../../../ui/Badge";

const UOM_OPTIONS = [
  "Acre", "Acre (US)", "Are", "Area", "Arshin", "Atmosphere", "Bar", "Barleycorn", "Barrel (Oil)", "Barrel(Beer)", 
  "Box", "Btu (It)", "Btu (Mean)", "Btu (Th)", "Btu/Hour", "Btu/Minutes", "Btu/Seconds", "Bushel (UK)", 
  "Bushel (US Dry Level)", "Caballeria", "Cable Length", "Cable Length (UK)", "Cable Length (US)", "Calibre", 
  "Calorie (Food)", "Calorie (It)", "Calorie (Mean)", "Calorie (Th)", "Calorie/Seconds", "Carat", "Cental", 
  "Centiarea", "Centigram/Litre", "Centilitre", "Centimeter", "Chain", "Cubic Centimeter", "Cubic Decimeter", 
  "Cubic Foot", "Cubic Inch", "Cubic Meter", "Cubic Millimeter", "Cubic Yard", "Cup", "Day", "Decigram/Litre", 
  "Decilitre", "Decimeter", "Dekagram/Litre", "Dram", "Dyne", "Ells (UK)", "Ems(Pica)", "Erg", "Fathom", 
  "Fluid Ounce (UK)", "Fluid Ounce (US)", "Foot", "Foot Of Water", "Foot/Minute", "Foot/Second", "Furlong", 
  "Gallon (UK)", "Gallon Dry (US)", "Gallon Liquid (US)", "Grain", "Grain/Cubic Foot", "Grain/Gallon (UK)", 
  "Grain/Gallon (US)", "Gram", "Gram-Force", "Gram/Cubic Centimeter", "Gram/Cubic Meter", "Gram/Cubic Millimeter", 
  "Gram/Litre", "Hand", "Hect hectare", "Hectogram/Litre", "Hectometer", "Hectopascal", "Horsepower", 
  "Horsepower-Hours", "Hour", "Hundredweight (UK)", "Hundredweight (US)", "Inch", "Inch Pound-Force", 
  "Inch/Minute", "Inch/Second", "Inches Of Mercury", "Inches Of Water", "Joule", "Joule/Meter", "Kg", 
  "Kilocalorie", "Kilogram-Force", "Kilogram/Cubic Centimeter", "Kilogram/Cubic Meter", "Kilogram/Litre", 
  "Kilojoule", "Kilometer", "Kilometer/Hour", "Kilopascal", "Kilopond", "Kilopound-Force", "Kilowatt", 
  "Kilowatt-Hour", "Kip", "Knot", "Link", "Litre", "Litre-Atmosphere", "Manzana", "Medio Metro", "Megagram/Litre", 
  "Megajoule", "Megawatt", "Meter", "Meter Of Water", "Meter/Second", "Microbar", "Microgram", "Microgram/Litre", 
  "Micrometer", "Microsecond", "Mile", "Mile (Nautical)", "Mile/Hour", "Mile/Minute", "Mile/Second", "Millibar", 
  "Milligram", "Milligram/Cubic Centimeter", "Milligram/Cubic Meter", "Milligram/Cubic Millimeter", "Milligram/Litre", 
  "Millilitre", "Millimeter", "Millimeter Of Mercury", "Millimeter Of Water", "Millisecond", "Minute", 
  "Nanogram/Litre", "Nanometer", "Nanosecond", "Newton", "Nos", "Ounce", "Ounce-Force", "Ounce/Cubic Foot", 
  "Ounce/Cubic Inch", "Ounce/Gallon (UK)", "Ounce/Gallon (US)", "Pair", "Pascal", "Peck", "Pint (UK)", 
  "Pint, Dry (US)", "Pint, Liquid (US)", "Pond", "Pood", "Pound", "Pound-Force", "Pound/Cubic Foot", 
  "Pound/Cubic Inch", "Pound/Cubic Yard", "Pound/Gallon (UK)", "Pound/Gallon (US)", "Poundal", "Quart (UK)", 
  "Quart Dry (US)", "Quart Liquid (US)", "Quintal", "Rod", "Sazhen", "Second", "Set", "Slug", "Square Centimeter", 
  "Square Foot", "Square Inch", "Square Kilometer", "Square Meter", "Square Mile", "Square Yard", "Stone", 
  "Tablespoon (US)", "Teaspoon", "Technical Atmosphere", "Ton-Force (UK)", "Ton-Force (US)", "Tonne", 
  "Tonne-Force(Metric)", "Torr", "Unit", "Vara", "Versta", "Volt-Ampere", "Watt", "Watt-Hour", "Week", "Yard"
].sort().map(unit => ({ value: unit, label: unit }));

export default function Step4_MaterialRequirement({ readOnly = false }) {
  const { formData, updateField } = useFormData();
  const { state, initialData } = useRootCardContext();
  const rootCardId = initialData?.id || state.createdOrderId;
  const materials = useMemo(() => formData.materials || [], [formData.materials]);
  
  // Procurement Data
  const [materialRequests, setMaterialRequests] = useState([]);
  const [rfqs, setRfqs] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loadingProcurement, setLoadingProcurement] = useState(false);

  // Inventory Data
  const [itemGroups, setItemGroups] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);

  const fetchProcurementData = useCallback(async () => {
    if (!rootCardId) return;
    try {
      setLoadingProcurement(true);
      const [mrRes, rfqRes, qtnRes, poRes] = await Promise.all([
        axios.get("/department/procurement/material-requests", { params: { rootCardId } }),
        axios.get("/department/procurement/quotations", { params: { root_card_id: rootCardId, type: 'rfq' } }),
        axios.get("/department/procurement/quotations", { params: { root_card_id: rootCardId, type: 'quotation' } }),
        axios.get("/department/procurement/purchase-orders", { params: { root_card_id: rootCardId } })
      ]);
      setMaterialRequests(mrRes.data.data || []);
      setRfqs(rfqRes.data || []);
      setQuotations(qtnRes.data || []);
      setPurchaseOrders(poRes.data || []);
    } catch (error) {
      console.error("Error fetching procurement data:", error);
    } finally {
      setLoadingProcurement(false);
    }
  }, [rootCardId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [groupsRes, itemsRes] = await Promise.all([
          axios.get("/inventory/item-groups"),
          axios.get("/inventory/materials")
        ]);
        setItemGroups(groupsRes.data);
        setInventoryItems(itemsRes.data.materials || []);
      } catch (error) {
        console.error("Error fetching inventory data:", error);
      }
    };
    fetchData();
    fetchProcurementData();
  }, [fetchProcurementData]);

  const fetchInventoryData = useCallback(async () => {
    try {
      const [groupsRes, itemsRes] = await Promise.all([
        axios.get("/inventory/item-groups"),
        axios.get("/inventory/materials")
      ]);
      setItemGroups(groupsRes.data);
      setInventoryItems(itemsRes.data.materials || []);
    } catch (error) {
      console.error("Error fetching inventory data:", error);
    }
  }, []);

  const mrColumns = [
    { key: "request_number", label: "MR NUMBER", render: (val) => <span className="font-bold text-blue-600">{val}</span> },
    { key: "department", label: "DEPARTMENT" },
    { key: "priority", label: "PRIORITY", render: (val) => (
      <Badge variant={val === 'urgent' ? 'danger' : val === 'high' ? 'warning' : 'info'}>{val}</Badge>
    )},
    { key: "status", label: "STATUS", render: (val) => (
      <Badge variant={val === 'pending' ? 'warning' : val === 'approved' ? 'success' : 'secondary'}>{val}</Badge>
    )},
    { key: "created_at", label: "DATE", render: (val) => new Date(val).toLocaleDateString() }
  ];

  const rfqColumns = [
    { key: "quotation_number", label: "RFQ NUMBER", render: (val) => <span className="font-bold text-blue-600">{val}</span> },
    { key: "vendor_name", label: "VENDOR" },
    { key: "status", label: "STATUS", render: (val) => (
      <Badge variant={val === 'sent' ? 'info' : 'secondary'}>{val}</Badge>
    )},
    { key: "valid_until", label: "VALID UNTIL", render: (val) => val ? new Date(val).toLocaleDateString() : '-' }
  ];

  const quotationColumns = [
    { key: "quotation_number", label: "QTN NUMBER", render: (val) => <span className="font-bold text-blue-600">{val}</span> },
    { key: "vendor_name", label: "VENDOR" },
    { key: "total_amount", label: "TOTAL AMOUNT", render: (val) => `₹${parseFloat(val).toLocaleString()}` },
    { key: "status", label: "STATUS", render: (val) => (
      <Badge variant={val === 'approved' ? 'success' : val === 'rejected' ? 'danger' : 'warning'}>{val}</Badge>
    )}
  ];

  const poColumns = [
    { key: "po_number", label: "PO NUMBER", render: (val) => <span className="font-bold text-blue-600">{val}</span> },
    { key: "vendor_name", label: "VENDOR" },
    { key: "total_amount", label: "TOTAL AMOUNT", render: (val) => `₹${parseFloat(val).toLocaleString()}` },
    { key: "status", label: "STATUS", render: (val) => (
      <Badge variant={val === 'approved' ? 'success' : 'warning'}>{val}</Badge>
    )},
    { key: "created_at", label: "DATE", render: (val) => new Date(val).toLocaleDateString() }
  ];

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);

  // Forms
  const [newItem, setNewItem] = useState({
    itemCode: "",
    itemName: "",
    itemGroupId: "",
    category: "Raw Material",
    unit: "Nos",
    valuationRate: 0,
    sellingRate: 0,
    noOfCavity: 1,
    weightPerUnit: 0,
    weightUom: "kg",
    gstPercent: 0,
    quantity: 1,
  });

  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
  });

  const [editingGroup, setEditingGroup] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editingRequirementId, setEditingRequirementId] = useState(null);

  const handleCreateGroup = useCallback(async (e) => {
    e.preventDefault();
    try {
      if (editingGroup) {
        await axios.put(`/inventory/item-groups/${editingGroup.id}`, newGroup);
        setEditingGroup(null);
      } else {
        await axios.post("/inventory/item-groups", newGroup);
      }
      setNewGroup({ name: "", description: "" });
      showSuccess(editingGroup ? "Item group updated successfully!" : "Item group created successfully!");
      fetchInventoryData();
    } catch (error) {
      showError(error.response?.data?.message || "Error processing item group");
    }
  }, [editingGroup, newGroup, fetchInventoryData]);

  const handleDeleteGroup = useCallback(async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!"
    });

    if (result.isConfirmed) {
      try {
        await axios.delete(`/inventory/item-groups/${id}`);
        showSuccess("Item group deleted successfully!");
        fetchInventoryData();
      } catch (error) {
        showError(error.response?.data?.message || "Error deleting group");
      }
    }
  }, [fetchInventoryData]);

  const handleEditGroup = useCallback((group) => {
    setEditingGroup(group);
    setNewGroup({ name: group.name, description: group.description || "" });
  }, []);

  const handleCreateItem = useCallback(async (e) => {
    e.preventDefault();
    try {
      let finalGroupId = newItem.itemGroupId;
      
      // Check if it's a new group (string name instead of ID)
      if (newItem.itemGroupId && !itemGroups.find(g => String(g.id) === String(newItem.itemGroupId))) {
        // Try to find if a group with this name already exists
        const existingGroup = itemGroups.find(g => g.name.toLowerCase() === String(newItem.itemGroupId).toLowerCase());
        
        if (existingGroup) {
          finalGroupId = existingGroup.id;
        } else {
          try {
            const groupRes = await axios.post("/inventory/item-groups", { name: newItem.itemGroupId });
            finalGroupId = groupRes.data.id;
          } catch (groupError) {
            console.error("Error creating new group:", groupError);
            // If it failed but might exist, we'll just use the name as is or let it fail gracefully
          }
        }
      }

      if (editingItem || editingRequirementId) {
        // Update item in project materials
        const updatedMaterials = materials.map(m => {
          if ((editingItem && m.materialId === editingItem.id) || (editingRequirementId && m.id === editingRequirementId)) {
            const valuationRate = parseFloat(newItem.valuationRate) || 0;
            const sellingRate = parseFloat(newItem.sellingRate) || 0;
            const noOfCavity = parseInt(newItem.noOfCavity) || 1;
            const weightPerUnit = parseFloat(newItem.weightPerUnit) || 0;
            const quantity = parseFloat(newItem.quantity) || 1;
            const gstPercent = parseFloat(newItem.gstPercent) || 0;

            return { 
              ...m, 
              name: newItem.itemName, 
              item_name: newItem.itemName,
              itemName: newItem.itemName,
              itemCode: newItem.itemCode, 
              item_code: newItem.itemCode,
              unit: newItem.unit, 
              default_uom: newItem.unit,
              defaultUom: newItem.unit,
              category: newItem.category,
              material_type: newItem.category,
              materialType: newItem.category,
              itemGroupId: finalGroupId,
              item_group_id: finalGroupId,
              itemGroupName: itemGroups.find(g => String(g.id) === String(finalGroupId))?.name || newItem.itemGroupId,
              item_group_name: itemGroups.find(g => String(g.id) === String(finalGroupId))?.name || newItem.itemGroupId,
              gstPercent: gstPercent,
              gst_percent: gstPercent,
              quantity: quantity,
              valuationRate: valuationRate,
              valuation_rate: valuationRate,
              sellingRate: sellingRate,
              selling_rate: sellingRate,
              noOfCavity: noOfCavity,
              no_of_cavity: noOfCavity,
              weightPerUnit: weightPerUnit,
              weight_per_unit: weightPerUnit,
              weightUom: newItem.weightUom,
              weight_uom: newItem.weightUom
            };
          }
          return m;
        });
        updateField("materials", updatedMaterials);
        setEditingItem(null);
        setEditingRequirementId(null);
        setShowItemModal(false);
      } else {
        // Automatically add to project materials (WITHOUT adding to inventory table)
        // We no longer search for existingItem to ensure total isolation between root cards.
        const valuationRate = parseFloat(newItem.valuationRate) || 0;
        const sellingRate = parseFloat(newItem.sellingRate) || 0;
        const noOfCavity = parseInt(newItem.noOfCavity) || 1;
        const weightPerUnit = parseFloat(newItem.weightPerUnit) || 0;
        const quantity = parseFloat(newItem.quantity) || 1;
        const gstPercent = parseFloat(newItem.gstPercent) || 0;

        const newEntry = {
          id: Date.now() + Math.random(),
          materialId: null, // Always null to keep it independent for this project
          name: newItem.itemName,
          itemName: newItem.itemName,
          item_name: newItem.itemName,
          category: newItem.category,
          materialType: newItem.category,
          material_type: newItem.category,
          quantity: quantity, 
          unit: newItem.unit,
          default_uom: newItem.unit,
          defaultUom: newItem.unit,
          itemCode: newItem.itemCode,
          item_code: newItem.itemCode,
          itemGroupId: finalGroupId,
          item_group_id: finalGroupId,
          itemGroupName: itemGroups.find(g => String(g.id) === String(finalGroupId))?.name || newItem.itemGroupId,
          item_group_name: itemGroups.find(g => String(g.id) === String(finalGroupId))?.name || newItem.itemGroupId,
          gstPercent: gstPercent,
          gst_percent: gstPercent,
          valuationRate: valuationRate,
          valuation_rate: valuationRate,
          sellingRate: sellingRate,
          selling_rate: sellingRate,
          noOfCavity: noOfCavity,
          no_of_cavity: noOfCavity,
          weightPerUnit: weightPerUnit,
          weight_per_unit: weightPerUnit,
          weightUom: newItem.weightUom,
          weight_uom: newItem.weightUom,
          isNewInventoryItem: true
        };
        
        const updated = [...materials, newEntry];
        updateField("materials", updated);
        showSuccess("Material added to project requirements!");
        setShowItemModal(false);
      }
      
      setNewItem({
        itemCode: "",
        itemName: "",
        itemGroupId: "",
        category: "Raw Material",
        unit: "Nos",
        valuationRate: 0,
        sellingRate: 0,
        noOfCavity: 1,
        weightPerUnit: 0,
        weightUom: "kg",
        gstPercent: 0,
        quantity: 1,
      });
      fetchInventoryData();
    } catch (error) {
      console.error("Error processing item:", error);
      showError("Error processing item");
    }
  }, [newItem, itemGroups, inventoryItems, editingItem, editingRequirementId, materials, updateField, fetchInventoryData]);

  const handleEditRequirement = useCallback((material) => {
    console.log('[Step3] Editing material:', material);
    
    // Try to find in inventory first
    const item = inventoryItems.find(i => i.id === material.materialId) || material;
    
    setEditingItem(material.materialId ? item : null);
    setEditingRequirementId(material.id);
    
    // Helper to get value with multiple key fallbacks and handling 0 as valid
    const getVal = (obj1, obj2, keys, defaultVal = "") => {
      for (const key of keys) {
        if (obj1 && obj1[key] !== undefined && obj1[key] !== null) return obj1[key];
      }
      for (const key of keys) {
        if (obj2 && obj2[key] !== undefined && obj2[key] !== null) return obj2[key];
      }
      return defaultVal;
    };

    // Explicitly map all fields from the project-specific material record
    // using multiple fallbacks to handle both camelCase and snake_case from different sources
    setNewItem({
      itemCode: getVal(material, item, ["itemCode", "item_code", "code"]),
      itemName: getVal(material, item, ["name", "itemName", "item_name"]),
      itemGroupId: getVal(material, item, ["itemGroupId", "item_group_id", "itemGroup", "item_group", "itemGroupName", "item_group_name"]),
      category: getVal(material, item, ["category", "materialType", "material_type"], "Raw Material"),
      unit: getVal(material, item, ["unit", "defaultUom", "default_uom"], "Nos"),
      valuationRate: getVal(material, item, ["valuationRate", "valuation_rate", "rate", "cost"], 0),
      sellingRate: getVal(material, item, ["sellingRate", "selling_rate", "price"], 0),
      noOfCavity: getVal(material, item, ["noOfCavity", "no_of_cavity", "cavity"], 1),
      weightPerUnit: getVal(material, item, ["weightPerUnit", "weight_per_unit", "weight"], 0),
      weightUom: getVal(material, item, ["weightUom", "weight_uom", "weight_unit"], "kg"),
      gstPercent: getVal(material, item, ["gstPercent", "gst_percent", "gst"], 0),
      quantity: getVal(material, item, ["quantity"], 1),
    });
    
    setShowItemModal(true);
  }, [inventoryItems]);

  const generateItemCode = useCallback((name, groupId) => {
    if (!name) return "";
    
    let prefix = "ITEM";
    const group = itemGroups.find(g => String(g.id) === String(groupId)) || { name: String(groupId) };
    
    if (group && group.name) {
      const groupName = group.name.toLowerCase();
      if (groupName.includes("raw material") || groupName.includes("rm")) prefix = "RM";
      else if (groupName.includes("finished good") || groupName.includes("fg")) prefix = "FG";
      else if (groupName.includes("sub assemblies") || groupName.includes("sub-assemblies") || groupName.includes("s-")) prefix = "S";
      else if (groupName.includes("scrap")) prefix = "S";
    }
    
    const random = Math.floor(Math.random() * 9000) + 1000;
    return `${prefix}-${name.substring(0, 3).toUpperCase()}-${random}`;
  }, [itemGroups]);

  const handleDeleteRequirement = useCallback((id) => {
    const updated = materials.filter(m => m.id !== id);
    updateField("materials", updated);
    showSuccess("Requirement removed from project");
  }, [materials, updateField]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <FormSection 
        title="Procurement & Material Status" 
        icon={ShoppingCart}
        description="Track material requests, RFQs, quotations, and purchase orders for this project"
      >
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <Tabs
            tabs={[
              {
                label: "Material Requirements",
                icon: List,
                content: (
                  <div className="p-4 space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-slate-800">Project BOM / Requirements</h3>
                      {!readOnly && (
                        <div className="flex gap-2">
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => setShowGroupModal(true)}
                            className="flex items-center gap-2"
                          >
                            <Tag size={16} />
                            Manage Groups
                          </Button>
                          <Button 
                            variant="primary" 
                            size="sm" 
                            onClick={() => {
                              setEditingItem(null);
                              setEditingRequirementId(null);
                              setNewItem({
                                itemCode: "",
                                itemName: "",
                                itemGroupId: "",
                                category: "Raw Material",
                                unit: "Nos",
                                valuationRate: 0,
                                sellingRate: 0,
                                noOfCavity: 1,
                                weightPerUnit: 0,
                                weightUom: "kg",
                                gstPercent: 0,
                                quantity: 1,
                              });
                              setShowItemModal(true);
                            }}
                            className="flex items-center gap-2"
                          >
                            <Plus size={16} />
                            Add Material
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-700 uppercase text-xs">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Code</th>
                            <th className="px-4 py-3 font-semibold">Item Name</th>
                            <th className="px-4 py-3 font-semibold">Group</th>
                            <th className="px-4 py-3 font-semibold text-right">Qty</th>
                            <th className="px-4 py-3 font-semibold">Unit</th>
                            <th className="px-4 py-3 font-semibold text-right">Est. Cost</th>
                            {!readOnly && <th className="px-4 py-3 font-semibold text-center">Actions</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {materials.length === 0 ? (
                            <tr>
                              <td colSpan={readOnly ? 6 : 7} className="px-4 py-8 text-center text-slate-500 italic">
                                No materials added yet.
                              </td>
                            </tr>
                          ) : (
                            materials.map((mat) => (
                              <tr key={mat.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 font-mono text-xs text-slate-600">{mat.itemCode || mat.item_code || '-'}</td>
                                <td className="px-4 py-3 font-medium text-slate-900">{mat.itemName || mat.item_name || mat.name}</td>
                                <td className="px-4 py-3 text-slate-600">
                                  <span className="px-2 py-0.5 bg-slate-100 rounded-full text-[10px] font-medium uppercase">
                                    {mat.itemGroupName || mat.item_group_name || 'Uncategorized'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-blue-600">{mat.quantity}</td>
                                <td className="px-4 py-3 text-slate-600 uppercase text-xs">{mat.unit || mat.default_uom || mat.defaultUom}</td>
                                <td className="px-4 py-3 text-right text-slate-600">
                                  ₹{((parseFloat(mat.valuationRate || mat.valuation_rate || 0)) * (parseFloat(mat.quantity))).toLocaleString()}
                                </td>
                                {!readOnly && (
                                  <td className="px-4 py-3">
                                    <div className="flex justify-center gap-2">
                                      <button 
                                        onClick={() => handleEditRequirement(mat)}
                                        className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                      >
                                        <Edit2 size={14} />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteRequirement(mat.id)}
                                        className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            ))
                          )}
                        </tbody>
                        {materials.length > 0 && (
                          <tfoot className="bg-slate-50 font-bold">
                            <tr>
                              <td colSpan={5} className="px-4 py-3 text-right text-slate-700">Total Est. Material Cost:</td>
                              <td className="px-4 py-3 text-right text-blue-700">
                                ₹{materials.reduce((sum, mat) => sum + (parseFloat(mat.valuationRate || mat.valuation_rate || 0) * parseFloat(mat.quantity)), 0).toLocaleString()}
                              </td>
                              {!readOnly && <td></td>}
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                )
              },
              {
                label: "Material Requests",
                icon: FileText,
                content: (
                  <div className="p-4">
                    <DataTable 
                      columns={mrColumns} 
                      data={materialRequests} 
                      loading={loadingProcurement}
                      emptyMessage="No material requests found for this project"
                    />
                  </div>
                )
              },
              {
                label: "RFQs (Sent)",
                icon: Send,
                content: (
                  <div className="p-4">
                    <DataTable 
                      columns={rfqColumns} 
                      data={rfqs} 
                      loading={loadingProcurement}
                      emptyMessage="No RFQs sent for this project"
                    />
                  </div>
                )
              },
              {
                label: "Quotations",
                icon: Receipt,
                content: (
                  <div className="p-4">
                    <DataTable 
                      columns={quotationColumns} 
                      data={quotations} 
                      loading={loadingProcurement}
                      emptyMessage="No quotations received for this project"
                    />
                  </div>
                )
              },
              {
                label: "Purchase Orders",
                icon: ShoppingCart,
                content: (
                  <div className="p-4">
                    <DataTable 
                      columns={poColumns} 
                      data={purchaseOrders} 
                      loading={loadingProcurement}
                      emptyMessage="No purchase orders issued for this project"
                    />
                  </div>
                )
              }
            ]}
          />
        </div>
      </FormSection>

      <div className="mt-8">
        <AssigneeField 
          label="Assign to Inventory Manager"
          department="Inventory Management"
          value={formData.inventoryManager || "Inventory (Default)"}
          onChange={(val) => updateField("inventoryManager", val)}
          description="This person will receive notifications for all materialRequirements updates"
          readOnly={readOnly}
        />
      </div>

      {/* Item Add/Edit Modal */}
      <Modal 
        isOpen={showItemModal} 
        onClose={() => setShowItemModal(false)}
        title={editingItem || editingRequirementId ? "Edit Project Material" : "Add Material to Project"}
        size="lg"
      >
        <form onSubmit={handleCreateItem} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Item Name *</label>
              <div className="relative">
                <Input
                  value={newItem.itemName}
                  onChange={(e) => {
                    const name = e.target.value;
                    setNewItem(prev => ({ 
                      ...prev, 
                      itemName: name,
                      itemCode: prev.itemCode || generateItemCode(name, prev.itemGroupId)
                    }));
                  }}
                  placeholder="Enter item name"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Item Group *</label>
              <div className="flex gap-2">
                <SearchableSelect
                  options={itemGroups.map(g => ({ value: g.id, label: g.name }))}
                  value={newItem.itemGroupId}
                  onChange={(val) => setNewItem(prev => ({ ...prev, itemGroupId: val }))}
                  placeholder="Select or type to create"
                  isCreatable={true}
                  className="flex-1"
                />
              </div>
            </div>

            <Input
              label="Item Code"
              value={newItem.itemCode}
              onChange={(e) => setNewItem(prev => ({ ...prev, itemCode: e.target.value }))}
              placeholder="Auto-generated or manual"
            />

            <Select
              label="Category"
              options={[
                { value: "Raw Material", label: "Raw Material" },
                { value: "Component", label: "Component" },
                { value: "Sub Assembly", label: "Sub Assembly" },
                { value: "Hardware", label: "Hardware" },
                { value: "Consumable", label: "Consumable" },
              ]}
              value={newItem.category}
              onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
            />

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Quantity Required *"
                type="number"
                step="any"
                value={newItem.quantity}
                onChange={(e) => setNewItem(prev => ({ ...prev, quantity: e.target.value }))}
                required
              />
              <Select
                label="UOM *"
                options={UOM_OPTIONS}
                value={newItem.unit}
                onChange={(e) => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
                required
              />
            </div>

            <Input
              label="Valuation Rate (₹) *"
              type="number"
              step="any"
              value={newItem.valuationRate}
              onChange={(e) => setNewItem(prev => ({ ...prev, valuationRate: e.target.value }))}
              required
            />

            <Input
              label="GST %"
              type="number"
              value={newItem.gstPercent}
              onChange={(e) => setNewItem(prev => ({ ...prev, gstPercent: e.target.value }))}
            />

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Weight/Unit"
                type="number"
                step="any"
                value={newItem.weightPerUnit}
                onChange={(e) => setNewItem(prev => ({ ...prev, weightPerUnit: e.target.value }))}
              />
              <Select
                label="Weight UOM"
                options={[
                  { value: "kg", label: "KG" },
                  { value: "gm", label: "Gram" },
                  { value: "ton", label: "Tonne" },
                ]}
                value={newItem.weightUom}
                onChange={(e) => setNewItem(prev => ({ ...prev, weightUom: e.target.value }))}
              />
            </div>

            <Input
              label="No. of Cavity (if applicable)"
              type="number"
              value={newItem.noOfCavity}
              onChange={(e) => setNewItem(prev => ({ ...prev, noOfCavity: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="secondary" onClick={() => setShowItemModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary">
              {editingItem || editingRequirementId ? "Update Material" : "Add to Project"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Group Management Modal */}
      <Modal
        isOpen={showGroupModal}
        onClose={() => {
          setShowGroupModal(false);
          setEditingGroup(null);
          setNewGroup({ name: "", description: "" });
        }}
        title="Manage Item Groups"
      >
        <div className="space-y-6">
          <form onSubmit={handleCreateGroup} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h4 className="text-sm font-bold text-slate-900 mb-3">
              {editingGroup ? "Edit Group" : "Create New Group"}
            </h4>
            <div className="space-y-3">
              <Input
                label="Group Name *"
                value={newGroup.name}
                onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Raw Materials"
                required
              />
              <Input
                label="Description"
                value={newGroup.description}
                onChange={(e) => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
              />
              <div className="flex justify-end gap-2">
                {editingGroup && (
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => {
                      setEditingGroup(null);
                      setNewGroup({ name: "", description: "" });
                    }}
                  >
                    Cancel
                  </Button>
                )}
                <Button type="submit" variant="primary" size="sm">
                  {editingGroup ? "Update Group" : "Create Group"}
                </Button>
              </div>
            </div>
          </form>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {itemGroups.map(group => (
              <div key={group.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">{group.name}</p>
                  {group.description && <p className="text-xs text-slate-500">{group.description}</p>}
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => handleEditGroup(group)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => handleDeleteGroup(group.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
