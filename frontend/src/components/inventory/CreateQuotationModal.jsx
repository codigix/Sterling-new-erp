import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  Briefcase,
  FileText,
  Loader2,
  ArrowLeft,
  Check,
  Send,
  Calendar,
  Upload,
  FileCheck,
  File,
  Search,
} from "lucide-react";
import axios from "../../utils/api";
import { toast } from "react-toastify";
import { useRootCardInventoryTask } from "../../hooks/useRootCardInventoryTask";
import { renderDimensions } from "../../utils/dimensionUtils";

const DimensionInput = ({ label, field, placeholder, item, index, handleItemChange }) => (
  <div key={field} className="flex flex-col gap-1 min-w-[70px] max-w-[80px]">
    <label className="text-[10px] text-slate-500 font-medium">{label}</label>
    <input
      type="number"
      value={
        item[field] !== null && item[field] !== undefined
          ? Number(item[field])
          : ""
      }
      onChange={(e) => handleItemChange(index, field, e.target.value)}
      placeholder={placeholder}
      className="w-full p-1 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:border-blue-500 outline-none transition-all"
    />
  </div>
);

const VendorDimensionInput = ({ label, field, placeholder, item, index, handleItemChange }) => (
  <div key={field} className="flex flex-col gap-1 min-w-[70px] max-w-[80px]">
    <label className="text-[10px] text-slate-500 font-medium">{label}</label>
    <input
      type="number"
      value={
        item[`vendor_${field}`] !== null &&
        item[`vendor_${field}`] !== undefined
          ? item[`vendor_${field}`]
          : ""
      }
      onChange={(e) =>
        handleItemChange(index, `vendor_${field}`, e.target.value)
      }
      placeholder={placeholder}
      className="w-full p-1 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:border-blue-500 outline-none transition-all"
    />
  </div>
);

const renderDimensionFields = (item, index, handleItemChange) => {
  const group = (item.item_group || "").toLowerCase();

  let fields = [];

  if (group === "plate" || group === "plates") {
    fields = [
      { label: "L (mm)", field: "length", placeholder: "L" },
      { label: "W (mm)", field: "width", placeholder: "W" },
      { label: "T (mm)", field: "thickness", placeholder: "T" },
    ];
  } else if (group === "round bar") {
    fields = [
      { label: "Dia (mm)", field: "diameter", placeholder: "Dia" },
      { label: "L (mm)", field: "length", placeholder: "L" },
    ];
  } else if (group === "pipe") {
    fields = [
      { label: "OD (mm)", field: "outer_diameter", placeholder: "OD" },
      { label: "T (mm)", field: "thickness", placeholder: "T" },
      { label: "L (mm)", field: "length", placeholder: "L" },
    ];
  } else if (group === "block") {
    fields = [
      { label: "L (mm)", field: "length", placeholder: "L" },
      { label: "W (mm)", field: "width", placeholder: "W" },
      { label: "H (mm)", field: "height", placeholder: "H" },
    ];
  } else if (group.includes("square bar") || group === "sq bar") {
    fields = [
      { label: "S (mm)", field: "side1", placeholder: "S" },
      { label: "L (mm)", field: "length", placeholder: "L" },
    ];
  } else if (group.includes("rectangular bar") || group === "rec bar") {
    fields = [
      { label: "W (mm)", field: "side1", placeholder: "W" },
      { label: "H (mm)", field: "side2", placeholder: "H" },
      { label: "L (mm)", field: "length", placeholder: "L" },
    ];
  } else if (group.includes("square tube") || group === "sq tube") {
    fields = [
      { label: "S (mm)", field: "side1", placeholder: "S" },
      { label: "T (mm)", field: "thickness", placeholder: "T" },
      { label: "L (mm)", field: "length", placeholder: "L" },
    ];
  } else if (group.includes("rectangular tube") || group === "rec tube") {
    fields = [
      { label: "W (mm)", field: "side1", placeholder: "W" },
      { label: "H (mm)", field: "side2", placeholder: "H" },
      { label: "T (mm)", field: "thickness", placeholder: "T" },
      { label: "L (mm)", field: "length", placeholder: "L" },
    ];
  } else if (group.includes("c channel")) {
    fields = [
      { label: "W (mm)", field: "side1", placeholder: "W" },
      { label: "H (mm)", field: "side2", placeholder: "H" },
      { label: "Tw (mm)", field: "web_thickness", placeholder: "Tw" },
      { label: "Tf (mm)", field: "flange_thickness", placeholder: "Tf" },
      { label: "L (mm)", field: "length", placeholder: "L" },
    ];
  } else if (group.includes("angle")) {
    fields = [
      { label: "S1 (mm)", field: "side1", placeholder: "S1" },
      { label: "S2 (mm)", field: "side2", placeholder: "S2" },
      { label: "T (mm)", field: "thickness", placeholder: "T" },
      { label: "L (mm)", field: "length", placeholder: "L" },
    ];
  } else if (group.includes("beam")) {
    fields = [
      { label: "W (mm)", field: "side1", placeholder: "W" },
      { label: "H (mm)", field: "side2", placeholder: "H" },
      { label: "Tw (mm)", field: "web_thickness", placeholder: "Tw" },
      { label: "Tf (mm)", field: "flange_thickness", placeholder: "Tf" },
      { label: "L (mm)", field: "length", placeholder: "L" },
    ];
  }

  if (fields.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded border border-slate-100 dark:border-slate-800 w-fit">
      {fields.map((f) => (
        <DimensionInput
          key={f.field}
          {...f}
          item={item}
          index={index}
          handleItemChange={handleItemChange}
        />
      ))}
    </div>
  );
};

const renderVendorDimensionFields = (item, index, handleItemChange) => {
  const group = (item.item_group || "").toLowerCase();

  let fields = [];

  if (group === "plate" || group === "plates") {
    fields = [
      { label: "L (mm)", field: "length", placeholder: "L" },
      { label: "W (mm)", field: "width", placeholder: "W" },
      { label: "T (mm)", field: "thickness", placeholder: "T" },
    ];
  } else if (group === "round bar") {
    fields = [
      { label: "Dia (mm)", field: "diameter", placeholder: "Dia" },
      { label: "L (mm)", field: "length", placeholder: "L" },
    ];
  } else if (group === "pipe") {
    fields = [
      { label: "OD (mm)", field: "outer_diameter", placeholder: "OD" },
      { label: "T (mm)", field: "thickness", placeholder: "T" },
      { label: "L (mm)", field: "length", placeholder: "L" },
    ];
  } else if (group === "block") {
    fields = [
      { label: "L (mm)", field: "length", placeholder: "L" },
      { label: "W (mm)", field: "width", placeholder: "W" },
      { label: "H (mm)", field: "height", placeholder: "H" },
    ];
  } else if (group.includes("square bar") || group === "sq bar") {
    fields = [
      { label: "S (mm)", field: "side1", placeholder: "S" },
      { label: "L (mm)", field: "length", placeholder: "L" },
    ];
  } else if (group.includes("rectangular bar") || group === "rec bar") {
    fields = [
      { label: "W (mm)", field: "side1", placeholder: "W" },
      { label: "H (mm)", field: "side2", placeholder: "H" },
      { label: "L (mm)", field: "length", placeholder: "L" },
    ];
  } else if (group.includes("square tube") || group === "sq tube") {
    fields = [
      { label: "S (mm)", field: "side1", placeholder: "S" },
      { label: "T (mm)", field: "thickness", placeholder: "T" },
      { label: "L (mm)", field: "length", placeholder: "L" },
    ];
  } else if (group.includes("rectangular tube") || group === "rec tube") {
    fields = [
      { label: "W (mm)", field: "side1", placeholder: "W" },
      { label: "H (mm)", field: "side2", placeholder: "H" },
      { label: "T (mm)", field: "thickness", placeholder: "T" },
      { label: "L (mm)", field: "length", placeholder: "L" },
    ];
  } else if (group.includes("c channel")) {
    fields = [
      { label: "W (mm)", field: "side1", placeholder: "W" },
      { label: "H (mm)", field: "side2", placeholder: "H" },
      { label: "Tw (mm)", field: "web_thickness", placeholder: "Tw" },
      { label: "Tf (mm)", field: "flange_thickness", placeholder: "Tf" },
      { label: "L (mm)", field: "length", placeholder: "L" },
    ];
  } else if (group.includes("angle")) {
    fields = [
      { label: "S1 (mm)", field: "side1", placeholder: "S1" },
      { label: "S2 (mm)", field: "side2", placeholder: "S2" },
      { label: "T (mm)", field: "thickness", placeholder: "T" },
      { label: "L (mm)", field: "length", placeholder: "L" },
    ];
  } else if (group.includes("beam")) {
    fields = [
      { label: "W (mm)", field: "side1", placeholder: "W" },
      { label: "H (mm)", field: "side2", placeholder: "H" },
      { label: "Tw (mm)", field: "web_thickness", placeholder: "Tw" },
      { label: "Tf (mm)", field: "flange_thickness", placeholder: "Tf" },
      { label: "L (mm)", field: "length", placeholder: "L" },
    ];
  }

  if (fields.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded border border-slate-100 dark:border-slate-800 w-fit">
      {fields.map((f) => (
        <VendorDimensionInput
          key={f.field}
          {...f}
          item={item}
          index={index}
          handleItemChange={handleItemChange}
        />
      ))}
    </div>
  );
};

const renderDimensionsText = (item) => {
  const dims = renderDimensions(item);
  if (dims === "-") return null;
  return (
    <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-0.5">
      Dim: {dims} mm
    </div>
  );
};

const CreateQuotationModal = ({
  isOpen,
  onClose,
  onQuotationCreated,
  initialData = null,
  preFilledMaterials = null,
  vendors = [],
  rootCards = [],
  materialRequests = [],
}) => {
  const { completeCurrentTask } = useRootCardInventoryTask();
  const [submitting, setSubmitting] = useState(false);
  const [analysisMode, setAnalysisMode] = useState(false);
  const [rootCardMaterials, setRootCardMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [savingRequirements, setSavingRequirements] = useState(false);
  const [rootCardQuotations, setRootCardQuotations] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");

  const [formData, setFormData] = useState({
    vendor_id: "",
    root_card_id: "",
    total_amount: 0,
    valid_until: "",
    items: [],
    notes: "",
    type: "outbound",
    reference_id: null,
    rfq_id: null,
    material_request_id: null,
    document_path: "",
  });

  useEffect(() => {
    if (isOpen) {
      // Create initial form data state from props
      const initialFormState = {
        vendor_id: "",
        root_card_id: "",
        total_amount: 0,
        valid_until: "",
        items: [],
        notes: "",
        type: "outbound",
        reference_id: null,
        rfq_id: null,
        material_request_id: null,
        document_path: "",
      };

      if (initialData) {
        Object.assign(initialFormState, initialData);

        // If material_request_id is provided, automatically load its items
        if (
          initialData.material_request_id &&
          (!initialData.items || initialData.items.length === 0)
        ) {
          handleMaterialRequestChange({
            target: { value: initialData.material_request_id },
          });
        }
      }

      if (preFilledMaterials) {
        initialFormState.items = preFilledMaterials.map((m) => ({
          item_name: m.item_name || m.material_name || m.itemName || "",
          vendor_item_name: "",
          material_id: m._id || m.id,
          quantity: m.quantity || m.requiredQuantity || 0,
          unit_price: 0,
          unit: m.unit || "",
          rate_per_kg: 0,
          total_weight: 0,
        }));
        initialFormState.root_card_id =
          preFilledMaterials[0]?.rootCardId || initialFormState.root_card_id;
        initialFormState.material_request_id =
          preFilledMaterials[0]?.material_request_id ||
          initialFormState.material_request_id;
      }

      setFormData(initialFormState);
      setAnalysisMode(false);
      setRootCardMaterials([]);
      setUploadedFileName("");
    }
  }, [isOpen]); // Only run when modal opens/closes

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          item_name: "",
          vendor_item_name: "",
          item_group: "",
          part_detail: "",
          material_grade: "",
          make: "",
          remark: "",
          quantity: "",
          unit: "",
          unit_price: "",
          total_weight: "",
          rate_per_kg: "",
          length: "",
          width: "",
          thickness: "",
          diameter: "",
          outer_diameter: "",
          height: "",
          side1: "",
          side2: "",
          web_thickness: "",
          flange_thickness: "",
          vendor_length: "",
          vendor_width: "",
          vendor_thickness: "",
          vendor_diameter: "",
          vendor_outer_diameter: "",
          vendor_height: "",
          vendor_side1: "",
          vendor_side2: "",
          vendor_web_thickness: "",
          vendor_flange_thickness: "",
        },
      ],
    }));
  };

  const handleRemoveItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData((prev) => {
      const newItems = prev.items.map((item, i) => {
        if (i === index) {
          const stringFields = [
            "item_name",
            "vendor_item_name",
            "unit",
            "item_group",
            "part_detail",
            "material_grade",
            "make",
            "remark",
          ];
          const numberFields = [
            "quantity",
            "unit_price",
            "total_weight",
            "rate_per_kg",
            "length",
            "width",
            "thickness",
            "diameter",
            "outer_diameter",
            "height",
            "side1",
            "side2",
            "web_thickness",
            "flange_thickness",
            "vendor_length",
            "vendor_width",
            "vendor_thickness",
            "vendor_diameter",
            "vendor_outer_diameter",
            "vendor_height",
            "vendor_side1",
            "vendor_side2",
            "vendor_web_thickness",
            "vendor_flange_thickness",
          ];
          return {
            ...item,
            [field]: stringFields.includes(field)
              ? value
              : numberFields.includes(field)
                ? value === ""
                  ? ""
                  : parseFloat(value) || 0
                : value,
          };
        }
        return item;
      });

      const newTotal = newItems.reduce((sum, item) => {
        if (formData.type === "inbound") {
          // Strictly Weight * Rate per kg for inbound
          const itemTotal = item.total_weight * item.rate_per_kg || 0;
          return sum + itemTotal;
        }
        const itemTotal = item.quantity * item.unit_price || 0;
        return sum + itemTotal;
      }, 0);
      return {
        ...prev,
        items: newItems,
        total_amount: Number(newTotal.toFixed(3)),
      };
    });
  };

  const handleAnalyzeFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadedFileName(file.name);

    const analysisFormData = new FormData();
    analysisFormData.append("file", file);
    analysisFormData.append("items", JSON.stringify(formData.items));

    try {
      setAnalyzing(true);
      const response = await axios.post(
        "/department/procurement/quotations/analyze",
        analysisFormData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      setFormData((prev) => ({
        ...prev,
        items: response.data.items,
        total_amount: Number(parseFloat(response.data.total_amount).toFixed(3)),
        // We don't set document_path because we aren't storing the file permanently
        // until the user actually records the quote, but since the user said
        // "dont store the uploaded file", we might skip storing it entirely if requested.
        // For now, we just fill the prices.
      }));

      const missingData = response.data.items.filter((item) =>
        formData.type === "inbound"
          ? item.rate_per_kg === 0 || item.total_weight === 0
          : item.unit_price === 0,
      ).length;

      if (missingData > 0) {
        toast.info(
          `Data extracted for some items, but ${missingData} items could not be automatically matched. Please enter them manually.`,
        );
      } else {
        toast.success("Details fetched successfully from the document!");
      }
    } catch (error) {
      console.error("Error analyzing quotation:", error);
      toast.error(
        error.response?.data?.message || "Failed to analyze document",
      );
    } finally {
      setAnalyzing(false);
      // e.target.value = ''; // Keep it if we want to show it's "selected"
    }
  };

  const handleRootCardChange = async (e) => {
    const selectedRootCardId = e.target.value;

    setFormData((prev) => ({
      ...prev,
      root_card_id: selectedRootCardId,
      reference_id: null,
      items: [],
    }));

    if (!selectedRootCardId) {
      setRootCardMaterials([]);
      setRootCardQuotations([]);
      setAnalysisMode(false);
      return;
    }

    try {
      if (formData.type === "outbound") {
        setLoadingMaterials(true);
        const reqResponse = await axios.get(
          `/root-cards/requirements/${selectedRootCardId}`,
        );
        const reqData = reqResponse.data.data;

        let parsedMaterials = reqData.materials || [];
        if (typeof parsedMaterials === "string") {
          parsedMaterials = JSON.parse(parsedMaterials);
        }

        const initializedMaterials = parsedMaterials.map((m) => ({
          ...m,
          selected:
            (parseFloat(m.requiredQuantity) || 0) >
            (parseFloat(m.currentStock) || 0),
        }));

        setRootCardMaterials(initializedMaterials);
        setAnalysisMode(true);
      } else {
        const quotesResponse = await axios.get(
          `/department/procurement/quotations/root-card/${selectedRootCardId}`,
        );
        setRootCardQuotations(quotesResponse.data);
      }
    } catch (error) {
      console.error("Error fetching root card data:", error);
      toast.error("Failed to load root card details");
    } finally {
      setLoadingMaterials(false);
    }
  };

  const handleMaterialRequestChange = async (e) => {
    const mrId = e.target.value;
    if (!mrId) {
      setFormData((prev) => ({
        ...prev,
        reference_id: null,
        material_request_id: null,
        items: [],
      }));
      return;
    }

    try {
      setLoadingMaterials(true);
      const response = await axios.get(
        `/department/procurement/material-requests/${mrId}`,
      );
      const mr = response.data.materialRequest;

      if (mr) {
        let items = mr.items || [];
        if (typeof items === "string") {
          try {
            items = JSON.parse(items);
          } catch (e) {
            console.error("Error parsing MR items:", e);
            items = [];
          }
        }

        setFormData((prev) => ({
          ...prev,
          reference_id: null,
          material_request_id: mr.id,
          root_card_id: mr.sales_order_id || prev.root_card_id,
          items: (Array.isArray(items) ? items : []).map((item) => ({
            item_name:
              item.item_name ||
              item.material_name ||
              item.description ||
              item.itemName ||
              "",
            vendor_item_name: "",
            quantity: item.required_quantity || item.quantity || 0,
            unit: item.uom || item.unit || "",
            unit_price: 0,
            rate_per_kg: 0,
            total_weight: item.total_weight
              ? Number(parseFloat(item.total_weight).toFixed(3))
              : item.totalWeight
                ? Number(parseFloat(item.totalWeight).toFixed(3))
                : 0,
            unit_weight: item.unit_weight
              ? Number(parseFloat(item.unit_weight).toFixed(3))
              : item.unitWeight
                ? Number(parseFloat(item.unitWeight).toFixed(3))
                : 0,
            item_group: item.item_group || "",
            material_grade: item.material_grade || "",
            part_detail: item.part_detail || "",
            make: item.make || "",
            remark: item.remark || "",
            length: item.length || null,
            width: parseFloat(item.width) || parseFloat(item.side1) || null,
            thickness: item.thickness || null,
            diameter: item.diameter || null,
            outer_diameter: item.outer_diameter || null,
            height: parseFloat(item.height) || parseFloat(item.side2) || null,
            side1: parseFloat(item.side1) || parseFloat(item.width) || null,
            side2: parseFloat(item.side2) || parseFloat(item.height) || null,
            web_thickness: item.web_thickness || null,
            flange_thickness: item.flange_thickness || null,
            vendor_length: null,
            vendor_width: null,
            vendor_thickness: null,
            vendor_diameter: null,
            vendor_outer_diameter: null,
            vendor_height: null,
            vendor_side1: null,
            vendor_side2: null,
            vendor_web_thickness: null,
            vendor_flange_thickness: null,
          })),
        }));
      }
    } catch (error) {
      console.error("Error fetching material request details:", error);
      toast.error("Failed to load material request details");
    } finally {
      setLoadingMaterials(false);
    }
  };

  const handleOutboundQuotationSelect = (e) => {
    const quoteId = e.target.value;
    if (!quoteId) return;

    const selectedQuote = rootCardQuotations.find(
      (q) => q.id.toString() === quoteId,
    );
    if (selectedQuote) {
      setFormData((prev) => ({
        ...prev,
        reference_id: selectedQuote.id,
        rfq_id: selectedQuote.id,
        vendor_id: selectedQuote.vendor_id,
        root_card_id: selectedQuote.root_card_id,
        material_request_id: selectedQuote.material_request_id,
        items: (selectedQuote.items || []).map((item) => ({
          item_name: item.item_name || item.description,
          vendor_item_name: item.vendor_item_name || "",
          quantity: item.quantity,
          unit: item.unit || "",
          unit_price: 0,
          item_group: item.item_group || "",
          part_detail: item.part_detail || "",
          material_grade: item.material_grade || "",
          make: item.make || "",
          remark: item.remark || "",
          total_weight: item.total_weight
            ? Number(parseFloat(item.total_weight).toFixed(3))
            : 0,
          unit_weight: item.unit_weight
            ? Number(parseFloat(item.unit_weight).toFixed(3))
            : 0,
          rate_per_kg: item.rate_per_kg || 0,
          length: item.length || null,
          width: parseFloat(item.width) || parseFloat(item.side1) || null,
          thickness: item.thickness || null,
          diameter: item.diameter || null,
          outer_diameter: item.outer_diameter || null,
          height: parseFloat(item.height) || parseFloat(item.side2) || null,
          side1: parseFloat(item.side1) || parseFloat(item.width) || null,
          side2: parseFloat(item.side2) || parseFloat(item.height) || null,
          web_thickness: item.web_thickness || null,
          flange_thickness: item.flange_thickness || null,
          vendor_length: null,
          vendor_width: null,
          vendor_thickness: null,
          vendor_diameter: null,
          vendor_outer_diameter: null,
          vendor_height: null,
          vendor_side1: null,
          vendor_side2: null,
          vendor_web_thickness: null,
          vendor_flange_thickness: null,
        })),
        notes: `Response to ${selectedQuote.quotation_number}`,
      }));
    }
  };

  const handleRequirementChange = (index, field, value) => {
    setRootCardMaterials((prev) => {
      const newMaterials = [...prev];
      newMaterials[index] = { ...newMaterials[index], [field]: value };

      if (field === "requiredQuantity") {
        const required = parseFloat(value) || 0;
        const stock = parseFloat(newMaterials[index].currentStock) || 0;
        newMaterials[index].selected = required > stock;
      }

      return newMaterials;
    });
  };

  const handleSaveRequirements = async () => {
    if (!formData.root_card_id) return;

    try {
      setSavingRequirements(true);
      await axios.post(`/root-cards/requirements/${formData.root_card_id}`, {
        materials: rootCardMaterials.map((m) => {
          const rest = { ...m };
          delete rest.selected;
          return rest;
        }),
        procurementStatus: "pending",
      });

      const selectedItems = rootCardMaterials.filter((m) => m.selected);
      const items = selectedItems.map((m) => ({
        item_name: m.itemName || m.item_name || "Unnamed Material",
        quantity: Math.max(
          0,
          (parseFloat(m.requiredQuantity) || 0) -
            (parseFloat(m.currentStock) || 0),
        ),
        unit: m.unit || "",
        unit_price: 0,
        item_group: m.itemGroupName || m.itemGroup || m.category || "",
        material_grade: m.materialGrade || m.material_grade || "",
        part_detail: m.partDetail || m.part_detail || "",
        make: m.make || "",
        remark: m.remark || "",
      }));

      setFormData((prev) => ({ ...prev, items }));
      setAnalysisMode(false);
    } catch (error) {
      console.error("Error saving requirements:", error);
      toast.error("Failed to save requirements");
    } finally {
      setSavingRequirements(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.vendor_id) {
      toast.warning("Please select a vendor");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        root_card_id: formData.root_card_id || null,
        reference_id:
          formData.type === "inbound" &&
          formData.reference_id &&
          !isNaN(formData.reference_id)
            ? parseInt(formData.reference_id)
            : null,
        notes: formData.notes,
        total_amount: formData.total_amount || 0,
        items: formData.items || [],
      };

      await axios.post("/department/procurement/quotations", payload);

      if (formData.type === "inbound") {
        await completeCurrentTask("Vendor quotation response recorded");
        toast.success("Vendor quote recorded successfully!");
      } else if (formData.type === "outbound") {
        await completeCurrentTask("RFQ Quotation (RFQ) created");
        toast.success("Quotation request (RFQ) created successfully!");
      }

      if (onQuotationCreated) {
        onQuotationCreated(formData);
      }

      onClose();
    } catch (err) {
      console.error("Error creating quotation:", err);
      toast.error(err.response?.data?.message || "Failed to create quotation");
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value && value !== 0) return "₹0.000";
    return `₹${Number(value).toLocaleString("en-IN", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    })}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN");
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={`bg-white dark:bg-slate-800 rounded w-full ${formData.type === "outbound" ? "max-w-6xl" : "max-w-[80vw]"} max-h-[95vh] overflow-hidden flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-2 border-b border-slate-200 dark:border-slate-600">
          <div className="flex items-center gap-3">
            {analysisMode && (
              <button
                onClick={() => setAnalysisMode(false)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition"
              >
                <ArrowLeft
                  size={15}
                  className="text-slate-500 dark:text-slate-400"
                />
              </button>
            )}
            <div>
              <h3 className="text-md  text-slate-900 dark:text-white">
                {analysisMode
                  ? "Material Analysis"
                  : formData.type === "inbound"
                    ? "Record Vendor Quote"
                    : "Create Quote Request (RFQ)"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 ">
                {analysisMode
                  ? "Review root card stock availability"
                  : formData.type === "inbound"
                    ? "Record details from vendor response"
                    : "Create a new vendor quotation request"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
          >
            <X size={15} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {analysisMode ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-2">
              {loadingMaterials ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-blue-600" size={32} />
                </div>
              ) : rootCardMaterials.length === 0 ? (
                <p className="text-center py-8 text-slate-500">
                  No materials found for this root card.
                </p>
              ) : (
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                      <tr>
                        <th className="p-2 text-left text-xs  text-slate-500  border-b border-slate-200 dark:border-slate-700">
                          Include
                        </th>
                        <th className="p-2 text-left text-xs  text-slate-500  border-b border-slate-200 dark:border-slate-700">
                          Material
                        </th>
                        <th className="p-2 text-left text-xs  text-slate-500  border-b border-slate-200 dark:border-slate-700">
                          Current Stock
                        </th>
                        <th className="p-2 text-left text-xs  text-slate-500  border-b border-slate-200 dark:border-slate-700">
                          Required Qty
                        </th>
                        <th className="p-2 text-left text-xs  text-slate-500  border-b border-slate-200 dark:border-slate-700">
                          Shortage
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {rootCardMaterials.map((material, idx) => {
                        const required =
                          parseFloat(material.requiredQuantity) || 0;
                        const stock = parseFloat(material.currentStock) || 0;
                        const shortage = Math.max(0, required - stock);

                        return (
                          <tr
                            key={idx}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition ${
                              shortage > 0
                                ? "bg-red-50/30 dark:bg-red-900/10"
                                : ""
                            }`}
                          >
                            <td className="p-2">
                              <input
                                type="checkbox"
                                checked={material.selected || false}
                                onChange={(e) =>
                                  handleRequirementChange(
                                    idx,
                                    "selected",
                                    e.target.checked,
                                  )
                                }
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="p-2">
                              <div className="text-sm  text-slate-900 dark:text-white text-xs">
                                {material.itemName}
                              </div>
                              <div className="text-xs text-slate-500">
                                {material.category || material.materialType}
                              </div>
                            </td>
                            <td className="p-2 text-sm text-slate-700 dark:text-slate-300">
                              {stock}
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="0"
                                value={material.requiredQuantity}
                                onChange={(e) =>
                                  handleRequirementChange(
                                    idx,
                                    "requiredQuantity",
                                    e.target.value,
                                  )
                                }
                                className="w-24  text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                              />
                            </td>
                            <td className="p-2">
                              <span
                                className={`text-sm  ${
                                  shortage > 0
                                    ? "text-red-600"
                                    : "text-green-600"
                                }`}
                              >
                                {shortage}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="p-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
              <button
                onClick={() => setAnalysisMode(false)}
                className="px-6 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded hover:bg-white dark:hover:bg-slate-800 transition-colors "
              >
                Skip Analysis
              </button>
              <button
                onClick={handleSaveRequirements}
                disabled={savingRequirements || rootCardMaterials.length === 0}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors  flex items-center gap-2 disabled:opacity-50"
              >
                {savingRequirements ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Check size={15} />
                )}
                Save & Continue
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex-1 overflow-hidden flex flex-col"
          >
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              <div className="space-y-2">
                {!preFilledMaterials && (
                  <div>
                    <label className="block text-xs  text-slate-700 dark:text-slate-300 mb-2">
                      Select Material Request (Optional)
                    </label>
                    <div className="relative">
                      {loadingMaterials ? (
                        <Loader2
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 animate-spin"
                          size={15}
                        />
                      ) : (
                        <FileText
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                          size={15}
                        />
                      )}
                      <select
                        value={formData.material_request_id || ""}
                        onChange={handleMaterialRequestChange}
                        disabled={loadingMaterials}
                        className="w-full p-2 pl-11 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      >
                        <option value="">
                          Select Material Request to Load Items
                        </option>
                        {materialRequests.map((mr) => (
                          <option key={mr.id} value={mr.id}>
                            {mr.request_number || mr.mr_number} -{" "}
                            {mr.department} ({formatDate(mr.created_at)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {formData.type === "inbound" && (
                  <div>
                    {formData.rfq_id ? (
                      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded p-4">
                        <label className="block text-xs  text-purple-700 dark:text-purple-400   ">
                          Reference RFQ
                        </label>
                        <p className="text-xs  text-slate-900 dark:text-white flex items-center gap-2">
                          <FileText size={15} className="text-purple-500" />
                          {formData.rfq_number || "Referenced RFQ"}
                        </p>
                      </div>
                    ) : (
                      formData.root_card_id && (
                        <div>
                          {rootCardQuotations.length > 0 ? (
                            <div>
                              <label className="block text-xs  text-slate-700 dark:text-slate-300 mb-2">
                                Select Outbound Quotation (RFQ){" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={formData.rfq_id || ""}
                                onChange={handleOutboundQuotationSelect}
                                className="w-full p-2 border text-xs border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                              >
                                <option value="">-- Select Quotation --</option>
                                {rootCardQuotations.map((q) => (
                                  <option key={q.id} value={q.id}>
                                    {q.quotation_number} ({q.vendor_name}) -{" "}
                                    {formatDate(q.created_at)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded">
                              <p className="text-sm text-amber-800 dark:text-amber-200">
                                ℹ️ No RFQs found for this root card. Create an
                                RFQ from the "Sent Requests" tab first.
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs  text-slate-700 dark:text-slate-300 mb-2">
                      Vendor <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="vendor_id"
                      value={formData.vendor_id}
                      onChange={handleFormChange}
                      required
                      disabled={
                        formData.type === "inbound" && formData.reference_id
                      }
                      className={`w-full text-xs p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                        formData.type === "inbound" && formData.reference_id
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      <option value="">-- Select a Vendor --</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.name}{" "}
                          {vendor.vendor_type
                            ? `(${vendor.vendor_type
                                .replace("_", " ")
                                .toUpperCase()})`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs  text-slate-700 dark:text-slate-300 mb-2">
                      Valid Until
                    </label>
                    <input
                      type="date"
                      name="valid_until"
                      value={formData.valid_until}
                      onChange={handleFormChange}
                      className="w-full p-2 border text-xs border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                </div>

                {/* {formData.root_card_id && !preFilledMaterials && (
                  <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-100 dark:border-blue-800">
                    <span className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
                      <Check size={15} />
                      Materials loaded from root card analysis
                    </span>
                    <button
                      type="button"
                      onClick={() => setAnalysisMode(true)}
                        className="text-xs  text-blue-600 hover:text-blue-700 underline"
                    >
                      Re-Analyze
                    </button>
                  </div>
                )} */}

                {formData.type === "inbound" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm  text-slate-700 dark:text-slate-300 mb-2">
                        Total Amount (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-3 text-slate-500 dark:text-slate-400 ">
                          ₹
                        </span>
                        <input
                          type="text"
                          name="total_amount"
                          value={Number(formData.total_amount || 0).toFixed(3)}
                          onChange={handleFormChange}
                          placeholder="0.000"
                          disabled
                          className="w-full pl-8 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition opacity-75 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {/* <div className="flex flex-col">
                      <label className="block text-sm  text-slate-700 dark:text-slate-300 mb-2">
                        Quotation Document (PDF/Image)
                      </label>
                      <div className="relative w-full h-full">
                        <input
                          type="file"
                          id="quotation-upload"
                          className="hidden"
                          accept=".pdf,image/*"
                          onChange={handleAnalyzeFile}
                          disabled={analyzing}
                        />
                        <label
                          htmlFor="quotation-upload"
                          className={`flex items-center justify-center gap-3 p-2 border-2 border-dashed rounded cursor-pointer transition-all w-full h-[50px] ${
                            uploadedFileName
                              ? "border-green-500 bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400"
                              : "border-slate-300 dark:border-slate-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {analyzing ? (
                            <>
                              <Loader2 size={15} className="animate-spin" />
                              <span className="text-xs ">Analyzing...</span>
                            </>
                          ) : uploadedFileName ? (
                            <>
                              <FileCheck size={15} />
                              <span className="text-xs  truncate max-w-[200px]">
                                {uploadedFileName}
                              </span>
                            </>
                          ) : (
                            <>
                              <Upload size={15} />
                              <span className="text-xs ">Click to upload for auto-fill</span>
                            </>
                          )}
                        </label>
                      </div>
                    </div> */}
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm  text-slate-700 dark:text-slate-300">
                      Line Items
                    </label>
                    {!preFilledMaterials && (
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="flex items-center gap-1 text-xs p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors  whitespace-nowrap"
                      >
                        <Plus size={14} />
                        Add Item
                      </button>
                    )}
                  </div>

                  {formData.items.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center bg-slate-50 dark:bg-slate-700/50 rounded border border-dashed border-slate-300 dark:border-slate-600">
                      No items added yet. Click "Add Item" to include line items
                      in this quotation.
                    </p>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded">
                      <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                          <tr>
                            <th className="p-2 text-center text-xs   text-slate-500  border-b border-slate-200 dark:border-slate-700 w-12">
                              #
                            </th>
                            <th className="p-2 text-left text-xs   text-slate-500  border-b border-slate-200 dark:border-slate-700 w-1/4">
                              Item Name / Group
                            </th>
                            {formData.type === "inbound" && (
                              <th className="p-2 text-left text-xs   text-slate-500  border-b border-slate-200 dark:border-slate-700 w-1/4">
                                Vendor Material Name
                              </th>
                            )}
                            {formData.type === "outbound" && (
                              <>
                                <th className="p-2 text-left text-xs   text-slate-500  border-b border-slate-200 dark:border-slate-700 w-1/4">
                                  Part Detail / Grade
                                </th>
                                <th className="p-2 text-left text-xs   text-slate-500  border-b border-slate-200 dark:border-slate-700">
                                  Remark / Make
                                </th>
                                <th className="p-2 text-center text-xs   text-slate-500  border-b border-slate-200 dark:border-slate-700 w-24">
                                  Weight (Kg)
                                </th>
                              </>
                            )}
                            <th className="p-2 text-center text-xs   text-slate-500  border-b border-slate-200 dark:border-slate-700 w-24">
                              Qty
                            </th>
                            <th className="p-2 text-center text-xs   text-slate-500  border-b border-slate-200 dark:border-slate-700 w-20">
                              UOM
                            </th>
                            {formData.type === "inbound" && (
                              <>
                                <th className="p-2 text-right text-xs   text-slate-500  border-b border-slate-200 dark:border-slate-700 ">
                                  Rate/Kg
                                </th>
                                <th className="p-2 text-right text-xs   text-slate-500  border-b border-slate-200 dark:border-slate-700 ">
                                  Weight (Kg)
                                </th>
                                <th className="p-2 text-right text-xs   text-slate-500  border-b border-slate-200 dark:border-slate-700 ">
                                  Total
                                </th>
                              </>
                            )}
                            {!preFilledMaterials && (
                              <th className="p-2 text-center text-xs   text-slate-500  border-b border-slate-200 dark:border-slate-700 w-12"></th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                          {formData.items.map((item, index) => (
                            <tr
                              key={index}
                              className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition group"
                            >
                              <td className="p-2 text-center text-xs  text-slate-400">
                                {index + 1}
                              </td>
                              <td className="p-2">
                                <div className="flex flex-col gap-1">
                                  <input
                                    type="text"
                                    value={item.item_name}
                                    onChange={(e) =>
                                      handleItemChange(
                                        index,
                                        "item_name",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Item name"
                                    disabled
                                    className="w-full  text-xs p-1  text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded bg-slate-50 dark:bg-slate-900 transition-all disabled:opacity-80"
                                  />
                                  <input
                                    type="text"
                                    value={item.item_group}
                                    onChange={(e) =>
                                      handleItemChange(
                                        index,
                                        "item_group",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Group"
                                    disabled
                                    className="w-full p-1 text-xs  text-slate-500  border-none bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all disabled:opacity-80"
                                  />
                                  {(formData.type === "outbound" ||
                                    formData.type === "inbound") &&
                                    renderDimensionsText(item)}
                                </div>
                              </td>
                              {formData.type === "inbound" && (
                                <td className="p-2">
                                  <div className="flex flex-col gap-2">
                                    <input
                                      type="text"
                                      value={item.vendor_item_name}
                                      onChange={(e) =>
                                        handleItemChange(
                                          index,
                                          "vendor_item_name",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="Vendor Material Name (if different)"
                                      className="w-full p-2 text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded bg-white dark:bg-slate-900 transition-all"
                                    />
                                    {renderVendorDimensionFields(
                                      item,
                                      index,
                                      handleItemChange,
                                    )}
                                  </div>
                                </td>
                              )}
                              {formData.type === "outbound" && (
                                <>
                                  <td className="p-2">
                                    <div className="flex flex-col gap-1">
                                      <input
                                        type="text"
                                        value={item.part_detail}
                                        onChange={(e) =>
                                          handleItemChange(
                                            index,
                                            "part_detail",
                                            e.target.value,
                                          )
                                        }
                                        placeholder="Part Detail"
                                        disabled={preFilledMaterials}
                                        className="w-full  text-xs text-slate-700 p-1 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded bg-white dark:bg-slate-900 transition-all disabled:opacity-80"
                                      />
                                      <input
                                        type="text"
                                        value={item.material_grade}
                                        onChange={(e) =>
                                          handleItemChange(
                                            index,
                                            "material_grade",
                                            e.target.value,
                                          )
                                        }
                                        placeholder="Grade"
                                        disabled={preFilledMaterials}
                                        className="w-full p-1 text-xs  text-slate-500  border-none bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all disabled:opacity-80"
                                      />
                                    </div>
                                  </td>
                                  <td className="p-2">
                                    <div className="flex flex-col gap-1">
                                      <input
                                        type="text"
                                        value={item.remark}
                                        onChange={(e) =>
                                          handleItemChange(
                                            index,
                                            "remark",
                                            e.target.value,
                                          )
                                        }
                                        placeholder="Remark"
                                        disabled={preFilledMaterials}
                                        className="w-full  text-xs italic text-slate-500 p-1 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded bg-white dark:bg-slate-900 transition-all disabled:opacity-80"
                                      />
                                      <input
                                        type="text"
                                        value={item.make}
                                        onChange={(e) =>
                                          handleItemChange(
                                            index,
                                            "make",
                                            e.target.value,
                                          )
                                        }
                                        placeholder="Make"
                                        disabled={preFilledMaterials}
                                        className="w-full p-1 text-xs text-slate-500 dark:text-slate-400 border-none bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all disabled:opacity-80"
                                      />
                                    </div>
                                  </td>
                                </>
                              )}
                              {formData.type === "outbound" && (
                                <td className="p-2 text-center w-24">
                                  <div className="flex flex-col items-center">
                                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                                      {parseFloat(
                                        item.total_weight || 0,
                                      ).toFixed(3)}{" "}
                                      Kg
                                    </span>
                                    {parseFloat(item.unit_weight) > 0 && (
                                      <span className="text-xs text-slate-400">
                                        Unit:{" "}
                                        {Number(
                                          parseFloat(
                                            item.unit_weight || 0,
                                          ).toFixed(3),
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </td>
                              )}
                              <td className="p-2 w-24">
                                <input
                                  type="number"
                                  value={
                                    item.quantity !== undefined &&
                                    item.quantity !== null
                                      ? parseFloat(item.quantity).toString()
                                      : ""
                                  }
                                  onChange={(e) =>
                                    handleItemChange(
                                      index,
                                      "quantity",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="0"
                                  min="0"
                                  step="any"
                                  disabled={preFilledMaterials}
                                  className="w-full p-1 text-xs  text-center text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded bg-white dark:bg-slate-900 transition-all disabled:opacity-80"
                                />
                              </td>
                              <td className="p-2 w-20">
                                <input
                                  type="text"
                                  value={item.unit}
                                  onChange={(e) =>
                                    handleItemChange(
                                      index,
                                      "unit",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Unit"
                                  disabled={preFilledMaterials}
                                  className="w-full p-1 text-xs  text-center text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-none rounded  disabled:opacity-80"
                                />
                              </td>
                              {formData.type === "inbound" && (
                                <>
                                  <td className="p-2 ">
                                    <input
                                      type="number"
                                      value={item.rate_per_kg}
                                      onChange={(e) =>
                                        handleItemChange(
                                          index,
                                          "rate_per_kg",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="0.00"
                                      min="0"
                                      step="0.01"
                                      className="w-full p-1 text-xs  text-right text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded bg-white dark:bg-slate-900 transition-all"
                                    />
                                  </td>
                                  <td className="p-2 ">
                                    <input
                                      type="number"
                                      value={
                                        item.total_weight !== null &&
                                        item.total_weight !== undefined
                                          ? Number(
                                              parseFloat(item.total_weight),
                                            ).toFixed(3)
                                          : ""
                                      }
                                      onChange={(e) =>
                                        handleItemChange(
                                          index,
                                          "total_weight",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="0.000"
                                      min="0"
                                      step="0.001"
                                      className="w-full p-1 text-xs  text-right text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded bg-white dark:bg-slate-900 transition-all"
                                    />
                                  </td>
                                  <td className="p-2 text-right ">
                                    <span className="text-xs  text-emerald-600">
                                      ₹
                                      {Number(
                                        item.total_weight * item.rate_per_kg ||
                                          0,
                                      ).toLocaleString(undefined, {
                                        minimumFractionDigits: 3,
                                        maximumFractionDigits: 3,
                                      })}
                                    </span>
                                  </td>
                                </>
                              )}
                              {!preFilledMaterials && (
                                <td className="p-2 text-center w-12">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItem(index)}
                                    className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                        {formData.type === "inbound" && (
                          <tfoot className="bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                              <td
                                colSpan="5"
                                className="p-2 text-right text-xs  text-slate-500 "
                              >
                                Grand Total
                              </td>
                              <td className="p-2 text-right">
                                <span className="text-lg  text-blue-600 dark:text-blue-400">
                                  {formatCurrency(formData.total_amount)}
                                </span>
                              </td>
                              {!preFilledMaterials && <td></td>}
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs  text-slate-700 dark:text-slate-300 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleFormChange}
                    rows="3"
                    placeholder="Add any additional notes or terms..."
                    className="w-full p-2 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
              </div>
            </div>

            <div className="p-2 border-t border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="p-2 border text-xs border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded hover:bg-white dark:hover:bg-slate-800 transition-colors "
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || formData.items.length === 0}
                className="p-2 bg-green-600 text-xs hover:bg-green-700 text-white rounded transition-colors  shadow-lg shadow-green-500/20 flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Send size={15} />
                )}
                {formData.type === "inbound"
                  ? "Record Quote"
                  : "Create Quotation"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreateQuotationModal;
