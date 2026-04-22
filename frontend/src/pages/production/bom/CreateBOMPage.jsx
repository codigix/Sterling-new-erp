import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Plus,
  Trash2,
  Save,
  ChevronLeft,
  ChevronDown,
  Edit2,
  Check,
  X,
  Copy,
  FileUp,
  Loader2
} from "lucide-react";
import axios from "../../../utils/api";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import SearchableSelect from "../../../components/ui/SearchableSelect";
import * as XLSX from "xlsx";
import { renderDimensions } from "../../../utils/dimensionUtils";

const initialBOMState = {
  productInfo: {
    rootCardId: null,
    bomNumber: "",
    description: "",
    status: "draft",
    projectId: null,
    // Read-only fields fetched from Root Card
    projectName: "",
    quantity: 0,
  },
  materials: [],
};

const UOMOptions = ["Nos", "Kg", "pcs", "m", "l", "set", "Box", "Packet"];
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
  "Bought Out"
];
const MaterialTypeOptions = [
  { label: "Mild Steel / Carbon Steel", value: "7.85" },
  { label: "Stainless Steel (304/316)", value: "8.00" },
  { label: "Aluminum", value: "2.70" },
  { label: "Copper", value: "8.96" },
  { label: "Chemical", value: "1.10" },
  { label: "Other", value: "other" }
];
const MaterialGradeOptions = [
  "IS:2062-250", "IS:2062-350", "IS:2062-450", "SA-516 Gr.70", "S690QL",
  "EN-8", "EN-19", "EN-24", "17-4 PH", "15-5 PH", "S.S-304", "S.S-316",
  "HE.30", "AL.6061", "AL.2014 T6"
].map(grade => ({ label: grade, value: grade }));
const StatusOptions = [
  { label: "Draft", value: "draft" },
  { label: "Active", value: "active" },
  { label: "Approved", value: "approved" }
];

const AccordionSection = memo(({ title, section, children, itemCount = 0, expandedSections, toggleSection }) => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded  overflow-hidden transition-all duration-200">
    <div className={`p-2 flex items-center justify-between cursor-pointer select-none transition-colors ${expandedSections[section] ? "bg-slate-50/80 dark:bg-slate-800/50" : "hover:bg-slate-50/50 dark:hover:bg-slate-800/30"}`}
      onClick={() => toggleSection(section)}
    >
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded transition-colors ${expandedSections[section] ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
          <ChevronDown
            size={15}
            className={`transition-transform duration-300 ${expandedSections[section] ? "" : "-rotate-90"}`}
          />
        </div>
        <h3 className="text-sm  text-slate-900 dark:text-white">
          {title}
        </h3>
        {itemCount > 0 && (
          <span className="text-xs  bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 p-1 rounded  ">
            {itemCount} Items
          </span>
        )}
      </div>
    </div>
    {expandedSections[section] && (
      <div className="p-2 md:p-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
        {children}
      </div>
    )}
  </div>
));

const CreateBOMPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const taskId = searchParams.get("taskId");
  const [saving, setSaving] = useState(false);
  const [rootCards, setRootCards] = useState([]);
  const [existingBoms, setExistingBoms] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);
  const [editMode] = useState(!!searchParams.get("bomId"));
  const [bomId] = useState(searchParams.get("bomId"));
  const [expandedSections, setExpandedSections] = useState({
    product: true,
    materials: true,
  });
  /* const [isUploading, setIsUploading] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState(null);
  const fileInputRef = React.useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop().toLowerCase();
    if (fileExt === 'pdf') {
      Swal.fire({
        title: 'PDF Upload',
        text: 'Automatic PDF to BOM conversion is currently limited. Please use Excel (.xlsx, .xls) for better results, or continue to try extracting text.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Try PDF extraction',
        cancelButtonText: 'Cancel'
      }).then((result) => {
        if (result.isConfirmed) {
          processPdfFile(file);
        }
      });
      return;
    }

    if (!['xlsx', 'xls', 'csv'].includes(fileExt)) {
      Swal.fire('Error', 'Invalid file type. Please upload an Excel or CSV file.', 'error');
      return;
    }

    processExcelFile(file);
  };

  const processExcelFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        setIsUploading(true);
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) {
          throw new Error("No data found in the Excel file.");
        }

        // Map excel columns to BOM material structure
        // Looking for variations of: Name, Item Name, Quantity, Qty, UOM, Grade, Detail, Remark, Make
        const newMaterials = json.map(row => {
          const findVal = (keys) => {
            const foundKey = Object.keys(row).find(k => 
              keys.some(searchKey => k.toLowerCase().includes(searchKey.toLowerCase()))
            );
            return foundKey ? row[foundKey] : "";
          };

          return {
            id: Date.now() + Math.random(),
            itemName: findVal(["item name", "name", "description", "part"]),
            quantity: parseFloat(findVal(["quantity", "qty", "amount"])) || 0,
            uom: findVal(["uom", "unit", "measure"]) || "Nos",
            itemGroup: findVal(["group", "category"]) || "",
            materialGrade: findVal(["grade", "material grade", "spec"]),
            partDetail: findVal(["detail", "part detail", "dimension"]),
            remark: findVal(["remark", "note", "comment"]),
            make: findVal(["make", "brand", "manufacturer"])
          };
        }).filter(m => m.itemName);

        if (newMaterials.length === 0) {
          throw new Error("Could not find valid material data. Please ensure your Excel has columns like 'Item Name' and 'Quantity'.");
        }

        setBomData(prev => ({
          ...prev,
          materials: [...prev.materials, ...newMaterials]
        }));

        toast.success(`Successfully imported ${newMaterials.length} materials.`);
      } catch (error) {
        console.error("Excel processing error:", error);
        toast.error(error.message || 'Failed to process Excel file');
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const processPdfFile = async (file) => {
    // Basic implementation: use backend if available, or just notify
    Swal.fire('Wait', 'PDF processing requires server-side analysis. Please convert it to Excel first for best results.', 'warning');
  }; */

  const [editingMaterialId, setEditingMaterialId] = useState(null);

  // Entry form states for "Quick Add"
  const [newMaterial, setNewMaterial] = useState({ 
    itemName: "", 
    quantity: 1, 
    uom: "Nos", 
    itemGroup: "", 
    warehouse: "", 
    operation: "",
    materialGrade: "",
    materialType: "",
    densityType: "",
    density: 0,
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
    calculatedWeight: 0
  });

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
    } 
    else if (group.includes("round bar")) {
      const radius = D / 2;
      unitWeight = (Math.PI * Math.pow(radius, 2) * L * density) / 1000000;
    } 
    else if (group.includes("pipe")) {
      const outerRadius = OD / 2;
      const innerRadius = outerRadius - T;
      if (innerRadius >= 0) {
        unitWeight = (Math.PI * (Math.pow(outerRadius, 2) - Math.pow(innerRadius, 2)) * L * density) / 1000000;
      }
    }
    else if (group.includes("square bar")) {
      // Weight = (S1 * S1 * L * density) / 1,000,000
      unitWeight = (S1 * S1 * L * density) / 1000000;
    }
    else if (group.includes("rectangular bar")) {
      // Weight = (W * T * L * density) / 1,000,000
      unitWeight = (W * T * L * density) / 1000000;
    }
    else if (group.includes("square tube")) {
      // Weight = ((S1 * S1) - (S1 - 2*T)^2) * L * density / 1,000,000
      const outerArea = S1 * S1;
      const innerSide = S1 - (2 * T);
      const innerArea = innerSide > 0 ? innerSide * innerSide : 0;
      unitWeight = ((outerArea - innerArea) * L * density) / 1000000;
    }
    else if (group.includes("rectangular tube")) {
      // Weight = ((W * H) - (W - 2*T) * (H - 2*T)) * L * density / 1,000,000
      const outerArea = W * H;
      const innerW = W - (2 * T);
      const innerH = H - (2 * T);
      const innerArea = (innerW > 0 && innerH > 0) ? innerW * innerH : 0;
      unitWeight = ((outerArea - innerArea) * L * density) / 1000000;
    }
    else if (group.includes("angle")) {
      // Weight = ((S1 + S2 - T) * T * L * density) / 1,000,000
      unitWeight = ((S1 + S2 - T) * T * L * density) / 1000000;
    }
    else if (group.includes("c channel")) {
      // Weight = ((W * T) + 2 * (H - T) * T) * L * density / 1,000,000
      // W is web width, H is flange height, T is thickness
      unitWeight = ((W * T) + 2 * (H - T) * T) * L * density / 1000000;
    }
    else if (group.includes("i beam") || group.includes("h beam")) {
      // Weight = ((2 * W * FT) + (H - 2 * FT) * WT) * L * density / 1,000,000
      // H is total height, W is flange width, WT is web thickness, FT is flange thickness
      unitWeight = ((2 * W * FT) + (H - (2 * FT)) * WT) * L * density / 1000000;
    }

    return unitWeight;
  }, []);

  // Update calculated weight whenever dimensions, density or group changes
  useEffect(() => {
    const unitWeight = calculateItemWeight(newMaterial);
    const totalWeight = unitWeight * (parseFloat(newMaterial.quantity) || 0);
    
    if (unitWeight !== newMaterial.calculatedWeight) {
      setNewMaterial(prev => ({ 
        ...prev, 
        calculatedWeight: unitWeight,
        // If UOM is Kg, automatically update quantity to match total weight if it's currently 1 or 0
        quantity: prev.uom === "Kg" && (prev.quantity === 1 || prev.quantity === 0) ? totalWeight.toFixed(3) : prev.quantity
      }));
    }
  }, [
    newMaterial.length, 
    newMaterial.width, 
    newMaterial.thickness, 
    newMaterial.height, 
    newMaterial.diameter, 
    newMaterial.outerDiameter, 
    newMaterial.side1,
    newMaterial.side2,
    newMaterial.webThickness,
    newMaterial.flangeThickness,
    newMaterial.density, 
    newMaterial.itemGroup,
    newMaterial.quantity,
    newMaterial.uom,
    calculateItemWeight
  ]);

  const [bomData, setBomData] = useState({
    ...initialBOMState,
    productInfo: {
      ...initialBOMState.productInfo,
      rootCardId: searchParams.get("rootCardId") || null,
      projectId: searchParams.get("projectId") || null,
    }
  });

  useEffect(() => {
    if (!editMode && !bomData.productInfo.bomNumber) {
      const year = new Date().getFullYear();
      // Generate a random 4-digit number
      const randomNumber = Math.floor(1000 + Math.random() * 9000);
      const generatedNumber = `BOM-${year}-${randomNumber}`;
      
      setBomData(prev => ({
        ...prev,
        productInfo: {
          ...prev.productInfo,
          bomNumber: generatedNumber
        }
      }));
    }
  }, [editMode, bomData.productInfo.bomNumber]);

  const updateTableRow = useCallback((section, id, field, value) => {
    setBomData(prev => ({
      ...prev,
      [section]: prev[section].map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      ),
    }));
  }, []);

  const toggleSection = useCallback((section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  const removeTableRow = useCallback((section, id) => {
    setBomData(prev => ({
      ...prev,
      [section]: prev[section].filter((row) => row.id !== id),
    }));
  }, []);

  const handleAddItem = useCallback((section) => {
    let newItem = null;
    let resetState = null;

    if (section === "materials") {
      if (!newMaterial.itemName) return;
      newItem = { 
        ...newMaterial, 
        id: Date.now(),
        // Save the current weight in the item
        unitWeight: parseFloat(newMaterial.calculatedWeight) || 0,
        totalWeight: (parseFloat(newMaterial.calculatedWeight) || 0) * (parseFloat(newMaterial.quantity) || 0)
      };
      resetState = () => setNewMaterial({ 
        itemName: "", 
        quantity: 1, 
        uom: "Nos", 
        itemGroup: "", 
        warehouse: "", 
        operation: "",
        materialGrade: "",
        materialType: "",
        densityType: "",
        density: 0,
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
        calculatedWeight: 0
      });
    }

    if (newItem) {
      setBomData(prev => ({
        ...prev,
        [section]: [...prev[section], newItem],
      }));
      resetState();
    }
  }, [newMaterial]);

  const loadRootCardContext = useCallback(async (rootCardId) => {
    try {
      const [rcRes, reqRes] = await Promise.all([
        axios.get(`/root-cards/${rootCardId}`),
        axios.get(`/root-cards/requirements/${rootCardId}`).catch(() => ({ data: { success: false } })),
      ]);

      const rootCard = rcRes.data.rootCard || rcRes.data;
      if (!rootCard) throw new Error("Root card not found");

      // Map database step keys to frontend wizard step keys if they differ
      if (rootCard.steps) {
        if (rootCard.steps.client_po) rootCard.steps.step1_clientPO = rootCard.steps.client_po;
        if (rootCard.steps.design_engineering) rootCard.steps.step2_design = rootCard.steps.design_engineering;
        if (rootCard.steps.procurement) rootCard.steps.step3_procurement = rootCard.steps.procurement;
        if (rootCard.steps.production) rootCard.steps.step4_production = rootCard.steps.production;
      }

      // --- REQUIREMENTS ---
      let potentialMaterials = [];
      if (reqRes.data?.success && reqRes.data?.data) {
        potentialMaterials = (reqRes.data.data.materials || []).map(req => ({ ...req, id: req.id || `req-${Date.now()}-${Math.random()}` }));
      }

      // DESIGN ENGINEERING DATA REMOVED AS PER USER REQUEST
      // Only using Material Requirements (Step 3) for strict isolation
      const designEngineering = rootCard.steps?.step2_design || rootCard.designEngineering;
      
      return { rootCard, designEngineering, potentialMaterials };
    } catch (error) {
      console.error("Error loading root card context:", error);
      throw error;
    }
  }, []);

  const fetchBOMData = useCallback(async (id) => {
    try {
      setLoadingMaterials(true);
      console.log(`Fetching BOM data for ID: ${id}`);
      const response = await axios.get(`/engineering/bom/comprehensive/${id}`);
      const bom = response.data.bom || response.data;
      
      if (!bom || !bom.id) {
        throw new Error("Invalid BOM data received from server");
      }

      if (bom.rootCardId) {
        await loadRootCardContext(bom.rootCardId);
      }

      setBomData({
        productInfo: {
          rootCardId: bom.rootCardId,
          bomNumber: bom.bomNumber,
          description: bom.description || "",
          status: bom.status || "draft",
          projectId: bom.projectId,
          projectName: bom.projectName || bom.productName || "N/A",
          quantity: bom.quantity || 0,
        },
        materials: (bom.materials || []).map(m => ({ 
          ...m, 
          id: m.id || Date.now() + Math.random(),
          total: m.totalAmount || m.total || 0
        })),
      });
      console.log("BOM data set successfully", bom);
    } catch (error) {
      console.error("Error fetching BOM details:", error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to fetch BOM details' });
    } finally {
      setLoadingMaterials(false);
    }
  }, [loadRootCardContext]);

  const handleRootCardSelect = useCallback(async (rootCardId) => {
    if (!rootCardId) return;

    try {
      setLoadingMaterials(true);
      
      const { rootCard, designEngineering } = await loadRootCardContext(rootCardId);

      const designData = designEngineering || { bomData: [], operations: [] };

      // Auto-fill product info
      let details = null;
      if (rootCard.steps?.step1_clientPO?.productDetails) {
        details = rootCard.steps.step1_clientPO.productDetails;
      } else if (rootCard.product_details) {
        try {
          details = typeof rootCard.product_details === 'string' ? JSON.parse(rootCard.product_details) : rootCard.product_details;
        } catch (error) {
          console.error("Error parsing product_details:", error);
        }
      }

      let newProductInfo = { 
        ...bomData.productInfo,
        rootCardId: rootCard.id,
        projectId: rootCard.project_id || null,
        description: rootCard.notes || "",
        projectName: rootCard.project_name || rootCard.customer || rootCard.title || "N/A",
      };

      if (details) {
        newProductInfo.quantity = details.quantity || 0;
      } else if (rootCard.items?.[0]) {
        const firstItem = rootCard.items[0];
        newProductInfo.quantity = firstItem.quantity || 0;
      } else {
        newProductInfo.quantity = rootCard.quantity || 0;
      }

      // Map materials and operations from design engineering
      const materials = (designData.bomData || []).map(item => ({
        id: item.id || `rc-mat-${Date.now()}-${Math.random()}`,
        itemName: item.itemName || item.name || "",
        quantity: parseFloat(item.quantity) || 1,
        uom: item.uom || item.unit || "Nos",
        itemGroup: item.category || item.item_group || "Raw Material",
        rate: parseFloat(item.valuationRate || item.valuation_rate || item.sellingRate || item.selling_rate || item.rate || item.unitCost || item.unit_cost || 0),
        warehouse: item.location || item.warehouse || "",
        materialGrade: item.materialGrade || item.material_grade || "",
        partDetail: item.partDetail || item.part_detail || "",
        remark: item.remark || "",
        make: item.make || ""
      }));

      setBomData({
        ...initialBOMState,
        productInfo: newProductInfo,
        materials: materials,
      });
    } catch (error) {
      console.error("Error fetching root card details:", error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to fetch root card details' });
    } finally {
      setLoadingMaterials(false);
    }
  }, [loadRootCardContext]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingMaterials(true);
        const [rootCardsRes, bomsRes] = await Promise.all([
          axios.get("/root-cards").catch(() => ({ data: { rootCards: [] } })),
          axios.get("/engineering/bom/comprehensive").catch(() => ({ data: { boms: [] } })),
        ]);
        
        const rcData = rootCardsRes.data.rootCards || rootCardsRes.data || [];
        setRootCards(Array.isArray(rcData) ? rcData : []);
        setExistingBoms(bomsRes.data.boms || bomsRes.data || []);

        const urlBomId = searchParams.get("bomId");
        if (urlBomId) {
          await fetchBOMData(urlBomId);
        } else {
          // Handle initial rootCardId from URL
          const urlRootCardId = searchParams.get("rootCardId");
          if (urlRootCardId) {
            handleRootCardSelect(urlRootCardId);
          } else {
            setLoadingMaterials(false);
          }
        }
      } catch (error) {
        console.error("Error in initial fetchData:", error);
        setLoadingMaterials(false);
      }
    };

    fetchData();
  }, [searchParams, handleRootCardSelect, fetchBOMData]);

  const itemGroupSelectOptions = useMemo(() => ItemGroupOptions.map((group) => ({
    label: group,
    value: group,
  })), []);

  const UOMSelectOptions = useMemo(() => UOMOptions.map((uom) => ({
    label: uom,
    value: uom,
  })), []);

  const rootCardOptions = useMemo(() => (Array.isArray(rootCards) ? rootCards : []).map((rc) => ({
    label: rc.project_name || rc.customer || rc.title || 'N/A',
    value: rc.id,
  })), [rootCards]);

  const handleSave = useCallback(async () => {
    if (!bomData.productInfo.rootCardId) {
      Swal.fire({
        icon: "warning",
        title: "Required Field",
        text: "Please select a Root Card",
      });
      return;
    }

    try {
      setSaving(true);

      const payload = {
        productInfo: { ...bomData.productInfo },
        materials: bomData.materials.filter((m) => m.itemName),
      };

      let response;
      if (editMode && bomId) {
        response = await axios.put(`/engineering/bom/comprehensive/${bomId}`, payload);
      } else {
        response = await axios.post("/engineering/bom/comprehensive", payload);
      }

      if (response.data.redirect) {
        const result = await Swal.fire({
          icon: "info",
          title: "BOM Already Exists",
          text: "A BOM with this item code already exists. Would you like to view/edit it?",
          showCancelButton: true,
          confirmButtonText: "Yes, Load It",
          cancelButtonText: "No, Continue",
          confirmButtonColor: "#3b82f6",
        });

        if (result.isConfirmed) {
          fetchBOMData(response.data.bomId);
          return;
        }
      }

      if (taskId) {
        try {
          await axios.patch(`/department/portal/tasks/${taskId}`, {
            status: "completed",
          });
          console.log(`Task ${taskId} marked as completed`);
        } catch (taskErr) {
          console.error("Error marking task as completed:", taskErr);
        }
      }

      toast.success(`BOM ${editMode ? "Updated" : "Created"} Successfully`);

      setTimeout(() => {
        navigate("/department/production/bom/view");
      }, 2000);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save BOM");
    } finally {
      setSaving(false);
    }
  }, [bomData, editMode, bomId, navigate, fetchBOMData, taskId]);



  const isRootCardSelected = !!bomData.productInfo.rootCardId;

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 md:p-4 lg:p-4">
      <div className=" mx-auto space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/department/production/bom/view")}
              className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded transition-all"
            >
              <ChevronLeft size={15} className="text-slate-500 dark:text-slate-400" />
            </button>
            <div>
              <h1 className="text-xl md:text-xl  text-slate-900 dark:text-white ">
                {editMode ? "Edit BOM" : "Create BOM"}
              </h1>
              <p className="text-xs  text-slate-500 dark:text-slate-400">Bill of Materials Management</p>
            </div>
          </div>
        </div>

        {/* Accordions Container */}
        <div className="space-y-2">
          {/* Product Information Section */}
          <AccordionSection 
            title="Product Information" 
            section="product"
            expandedSections={expandedSections}
            toggleSection={toggleSection}
          >
            

            <div className="grid grid-cols-1 md:grid-cols-3  gap-3">
              <div className="">
                <SearchableSelect
                  label="Fetch from Root Card"
                  name="rootCardSelect"
                  id="rootCardSelect"
                  options={rootCardOptions}
                  value={bomData.productInfo.rootCardId}
                  onChange={handleRootCardSelect}
                  placeholder="Select a root card to auto-fill details"
                  disabled={loadingMaterials}
                />
                
              </div>
              <div className="space-y-1">
                <label className="block text-xs  text-slate-900 dark:text-slate-100   mb-1.5 ml-1">
                  Project Name
                </label>
                <div className="p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 text-xs  truncate">
                  {bomData.productInfo.projectName || "N/A"}
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="bomNumber" className="block text-xs  text-slate-900 dark:text-slate-100">
                  BOM Number
                </label>
                <input
                  type="text"
                  id="bomNumber"
                  name="bomNumber"
                  value={bomData.productInfo.bomNumber || ""}
                  onChange={(e) =>
                    setBomData({
                      ...bomData,
                      productInfo: { ...bomData.productInfo, bomNumber: e.target.value },
                    })
                  }
                  placeholder="BOM-2024-001"
                  className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none  placeholder:text-slate-400"
                />
              </div>
            </div>
            <p className="text-xs  text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded  bg-blue-500"></span>
                  Selecting a root card will automatically populate product information and link this BOM to its project.
                </p>
          </AccordionSection>

          {/* Raw Materials Section */}
          <AccordionSection 
            title="Raw Materials" 
            section="materials" 
            itemCount={bomData.materials.length}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
          >
            {!isRootCardSelected ? (
              <div className="text-center py-12 bg-slate-50/50 dark:bg-slate-800/20 rounded border-2 border-dashed border-slate-200 dark:border-slate-800">
                <div className="mx-auto w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded  flex items-center justify-center mb-3">
                  <Plus size={15} className="text-slate-400" />
                </div>
                <h4 className="text-sm  text-slate-900 dark:text-white mb-1">No Root Card Selected</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">Please select a Root Card in Product Information to start adding materials.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Quick Add Form */}
                <div className="p-2 bg-emerald-50/30 dark:bg-emerald-900/10 rounded border border-emerald-100/50 dark:border-emerald-900/20">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-sm">
                      <div className="w-3 h-3 rounded  bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                        <Plus size={12} />
                      </div>
                      Add Raw Material
                    </div>
                    {/* <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".xlsx, .xls, .csv, .pdf"
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded text-xs hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50"
                      >
                        {isUploading ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <FileUp size={14} />
                        )}
                        Bulk Upload (Excel/PDF)
                      </button>
                    </div> */}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-3">
                      <label className="block text-xs  text-slate-900 dark:text-slate-100   mb-1.5 ml-1">Item Name *</label>
                      <input
                        type="text"
                        value={newMaterial.itemName}
                        onChange={(e) => setNewMaterial(prev => ({ ...prev, itemName: e.target.value }))}
                        placeholder="Enter item name"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <SearchableSelect
                        label="Item Group"
                        options={itemGroupSelectOptions}
                        value={newMaterial.itemGroup}
                        onChange={(val) => setNewMaterial(prev => ({ 
                          ...prev, 
                          itemGroup: val,
                          uom: val?.toLowerCase() === "bought out" ? "Packet" : prev.uom
                        }))}
                        placeholder="Select group"
                        allowCustom={true}
                      />
                    </div>
                    {newMaterial.itemGroup?.toLowerCase() !== "bought out" && (
                      <>
                        <div className="md:col-span-3">
                          <SearchableSelect
                            label="Material Type (Density)"
                            options={MaterialTypeOptions}
                            value={newMaterial.densityType}
                            onChange={(val) => {
                              if (val === "other") {
                                setNewMaterial(prev => ({ 
                                  ...prev, 
                                  densityType: "other",
                                  density: prev.densityType === "other" ? prev.density : 0,
                                  materialType: "Other"
                                }));
                              } else {
                                const selected = MaterialTypeOptions.find(opt => opt.value === val);
                                setNewMaterial(prev => ({ 
                                  ...prev, 
                                  densityType: val,
                                  density: val,
                                  materialType: selected ? selected.label : ""
                                }));
                              }
                            }}
                            placeholder="Select material"
                          />
                        </div>
                        {newMaterial.densityType === "other" && (
                          <div className="md:col-span-3">
                            <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Custom Density</label>
                            <input
                              type="number"
                              step="0.001"
                              value={newMaterial.density}
                              onChange={(e) => setNewMaterial(prev => ({ ...prev, density: e.target.value }))}
                              placeholder="Enter density"
                              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                            />
                          </div>
                        )}
                        <div className="md:col-span-3">
                          <SearchableSelect
                            label="Material Grade"
                            options={MaterialGradeOptions}
                            value={newMaterial.materialGrade}
                            onChange={(val) => setNewMaterial(prev => ({ ...prev, materialGrade: val }))}
                            placeholder="Select/Type grade"
                            allowCustom={true}
                          />
                        </div>
                      </>
                    )}
                    {newMaterial.itemGroup?.toLowerCase().includes("plate") && (
                      <>
                        <div className="md:col-span-3">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Length (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.length}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, length: e.target.value }))}
                            placeholder="Length"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Width (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.width}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, width: e.target.value }))}
                            placeholder="Width"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Thickness (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.thickness}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, thickness: e.target.value }))}
                            placeholder="Thickness"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                      </>
                    )}

                    {/* Round Bar: Diameter, Length */}
                    {newMaterial.itemGroup?.toLowerCase().includes("round bar") && (
                      <>
                        <div className="md:col-span-3">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Diameter (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.diameter}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, diameter: e.target.value }))}
                            placeholder="Diameter"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Length (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.length}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, length: e.target.value }))}
                            placeholder="Length"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                      </>
                    )}

                    {/* Pipe: Outer Diameter, Thickness, Length */}
                    {newMaterial.itemGroup?.toLowerCase().includes("pipe") && (
                      <>
                        <div className="md:col-span-3">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Outer Diameter (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.outerDiameter}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, outerDiameter: e.target.value }))}
                            placeholder="Outer Diameter"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Thickness (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.thickness}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, thickness: e.target.value }))}
                            placeholder="Thickness"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Length (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.length}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, length: e.target.value }))}
                            placeholder="Length"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                      </>
                    )}

                    {/* Square Bar: Side1, Length */}
                    {newMaterial.itemGroup?.toLowerCase().includes("square bar") && (
                      <>
                        <div className="md:col-span-3">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Side (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.side1}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, side1: e.target.value }))}
                            placeholder="Side"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Length (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.length}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, length: e.target.value }))}
                            placeholder="Length"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                      </>
                    )}

                    {/* Rectangular Bar: Width, Thickness, Length */}
                    {newMaterial.itemGroup?.toLowerCase().includes("rectangular bar") && (
                      <>
                        <div className="md:col-span-3">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Width (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.width}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, width: e.target.value }))}
                            placeholder="Width"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Thickness (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.thickness}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, thickness: e.target.value }))}
                            placeholder="Thickness"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Length (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.length}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, length: e.target.value }))}
                            placeholder="Length"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                      </>
                    )}

                    {/* Square Tube: Side1, Thickness, Length */}
                    {newMaterial.itemGroup?.toLowerCase().includes("square tube") && (
                      <>
                        <div className="md:col-span-3">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Outer Side (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.side1}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, side1: e.target.value }))}
                            placeholder="Side"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Thickness (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.thickness}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, thickness: e.target.value }))}
                            placeholder="Thickness"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Length (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.length}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, length: e.target.value }))}
                            placeholder="Length"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                      </>
                    )}

                    {/* Rectangular Tube: Width, Height, Thickness, Length */}
                    {newMaterial.itemGroup?.toLowerCase().includes("rectangular tube") && (
                      <>
                        <div className="md:col-span-3">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Outer Width (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.width}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, width: e.target.value }))}
                            placeholder="Width"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Outer Height (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.height}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, height: e.target.value }))}
                            placeholder="Height"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Thickness (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.thickness}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, thickness: e.target.value }))}
                            placeholder="Thickness"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Length (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.length}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, length: e.target.value }))}
                            placeholder="Length"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                      </>
                    )}

                    {/* Angle: Side1, Side2, Thickness, Length */}
                    {newMaterial.itemGroup?.toLowerCase().includes("angle") && (
                      <>
                        <div className="md:col-span-3">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Side 1 (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.side1}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, side1: e.target.value }))}
                            placeholder="Side 1"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Side 2 (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.side2}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, side2: e.target.value }))}
                            placeholder="Side 2"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Thickness (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.thickness}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, thickness: e.target.value }))}
                            placeholder="Thickness"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Length (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.length}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, length: e.target.value }))}
                            placeholder="Length"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                      </>
                    )}

                    {/* C Channel: Web Width, Flange Height, Thickness, Length */}
                    {newMaterial.itemGroup?.toLowerCase().includes("c channel") && (
                      <>
                        <div className="md:col-span-3">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Web Width (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.width}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, width: e.target.value }))}
                            placeholder="Width"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Flange Height (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.height}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, height: e.target.value }))}
                            placeholder="Height"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Thickness (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.thickness}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, thickness: e.target.value }))}
                            placeholder="Thickness"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Length (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.length}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, length: e.target.value }))}
                            placeholder="Length"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                      </>
                    )}

                    {/* I/H Beam: Total Height, Flange Width, Web Thickness, Flange Thickness, Length */}
                    {(newMaterial.itemGroup?.toLowerCase().includes("i beam") || newMaterial.itemGroup?.toLowerCase().includes("h beam")) && (
                      <>
                        <div className="md:col-span-2">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Total Height (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.height}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, height: e.target.value }))}
                            placeholder="Height"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Flange Width (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.width}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, width: e.target.value }))}
                            placeholder="Width"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Web Thick (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.webThickness}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, webThickness: e.target.value }))}
                            placeholder="Web T"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Flange Thick (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.flangeThickness}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, flangeThickness: e.target.value }))}
                            placeholder="Flange T"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Length (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.length}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, length: e.target.value }))}
                            placeholder="Length"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                      </>
                    )}

                    {/* Block: Block Length, Width, Height */}
                    {newMaterial.itemGroup?.toLowerCase().includes("block") && (
                      <>
                        <div className="md:col-span-3">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Block Length (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.length}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, length: e.target.value }))}
                            placeholder="Length"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Width (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.width}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, width: e.target.value }))}
                            placeholder="Width"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-xs text-slate-900 dark:text-slate-100 mb-1.5 ml-1">Height (mm)</label>
                          <input
                            type="number"
                            value={newMaterial.height}
                            onChange={(e) => setNewMaterial(prev => ({ ...prev, height: e.target.value }))}
                            placeholder="Height"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                          />
                        </div>
                      </>
                    )}

                    <div className="md:col-span-3">
                      <label className="block text-xs  text-slate-900 dark:text-slate-100   mb-1.5 ml-1">Part Detail</label>
                      <input
                        type="text"
                        value={newMaterial.partDetail}
                        onChange={(e) => setNewMaterial(prev => ({ ...prev, partDetail: e.target.value }))}
                        placeholder="Details"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-xs  text-slate-900 dark:text-slate-100   mb-1.5 ml-1">Qty *</label>
                      <input
                        type="number"
                        value={newMaterial.quantity}
                        onChange={(e) => setNewMaterial(prev => ({ ...prev, quantity: e.target.value === "" ? "" : parseFloat(e.target.value) }))}
                        onBlur={(e) => {
                          if (e.target.value === "") {
                            setNewMaterial(prev => ({ ...prev, quantity: 0 }));
                          }
                        }}
                        onFocus={(e) => e.target.select()}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <SearchableSelect
                        label="UOM"
                        options={UOMSelectOptions}
                        value={newMaterial.uom}
                        onChange={(val) => setNewMaterial(prev => ({ ...prev, uom: val }))}
                        allowCustom={true}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-xs  text-slate-900 dark:text-slate-100   mb-1.5 ml-1">Remark</label>
                      <input
                        type="text"
                        value={newMaterial.remark}
                        onChange={(e) => setNewMaterial(prev => ({ ...prev, remark: e.target.value }))}
                        placeholder="Remarks"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-xs  text-slate-900 dark:text-slate-100   mb-1.5 ml-1">Make</label>
                      <input
                        type="text"
                        value={newMaterial.make}
                        onChange={(e) => setNewMaterial(prev => ({ ...prev, make: e.target.value }))}
                        placeholder="Make"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                      />
                    </div>

                    {newMaterial.calculatedWeight > 0 && (
                      <div className="md:col-span-12 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded border border-blue-100 dark:border-blue-900/20 flex items-center justify-between mb-2">
                        <div className="flex gap-6">
                          <div>
                            <span className="text-xs text-blue-500   block">Unit Weight</span>
                            <span className="text-sm  text-blue-700 dark:text-blue-400">
                              {Number(newMaterial.calculatedWeight.toFixed(3))} Kg
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-blue-500   block">Total Weight</span>
                            <span className="text-sm  text-blue-700 dark:text-blue-400">
                              {Number((newMaterial.calculatedWeight * (parseFloat(newMaterial.quantity) || 0)).toFixed(3))} Kg
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-blue-500   block">Material</span>
                            <span className="text-sm  text-blue-700 dark:text-blue-400">{newMaterial.materialType} ({newMaterial.density})</span>
                          </div>
                        </div>
                        {newMaterial.uom === "Kg" && (
                          <button 
                            type="button"
                            onClick={() => setNewMaterial(prev => ({ ...prev, quantity: Number((prev.calculatedWeight * (parseFloat(prev.quantity) || 1)).toFixed(3)) }))}
                            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
                          >
                            Apply to Qty
                          </button>
                        )}
                      </div>
                    )}

                    <div className="md:col-span-12 flex justify-end">
                      <button 
                        onClick={() => handleAddItem("materials")}
                        className="p-2 bg-emerald-600 hover:bg-emerald-700 text-xs text-white rounded  flex items-center justify-center gap-1.5 transition  active:scale-95"
                      >
                        <Plus size={14} /> Add Material
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end mt-4">
                    
                    
                    
                  </div>
                </div>

                <div className="overflow-hidden border border-slate-100 dark:border-slate-800 rounded ">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-slate-800/50">
                        <th className="p-2  text-slate-500 dark:text-slate-400   w-10">#</th>
                        <th className="p-2  text-slate-500 dark:text-slate-400  ">Item Name / Group</th>
                        <th className="p-2  text-slate-500 dark:text-slate-400  ">Part Detail / Grade</th>
                        <th className="p-2  text-slate-500 dark:text-slate-400  ">Remark / Make</th>
                        <th className="p-2  text-slate-500 dark:text-slate-400   text-center">Weight (Kg)</th>
                        <th className="p-2  text-slate-500 dark:text-slate-400   text-center">Qty</th>
                        <th className="p-2  text-slate-500 dark:text-slate-400  ">UOM</th>
                        <th className="p-2  text-slate-500 dark:text-slate-400   text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {bomData.materials.map((row, index) => {
                        const isEditing = editingMaterialId === row.id;
                        
                        return (
                          <tr key={row.id} className="bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="p-2 text-slate-400 ">{index + 1}</td>
                            <td className="p-2">
                              {isEditing ? (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={row.itemName}
                                    onChange={(e) => updateTableRow("materials", row.id, "itemName", e.target.value)}
                                    placeholder="Item name"
                                    className="w-full .5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                  />
                                  <SearchableSelect
                                    options={itemGroupSelectOptions}
                                    value={row.itemGroup}
                                    onChange={(val) => updateTableRow("materials", row.id, "itemGroup", val)}
                                    placeholder="Group"
                                    allowCustom={true}
                                  />
                                </div>
                              ) : (
                                <div className="flex flex-col">
                                  <span className=" text-slate-700 dark:text-slate-200">{row.itemName}</span>
                                  <span className="text-xs text-blue-600 dark:text-blue-400 ">
                                    Dim: {renderDimensions(row)} mm
                                  </span>
                                  <span className="text-xs  text-slate-500 dark:text-slate-400  ">{row.itemGroup || "NO-GROUP"}</span>
                                </div>
                              )}
                            </td>
                            <td className="p-2">
                              {isEditing ? (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={row.partDetail}
                                    onChange={(e) => updateTableRow("materials", row.id, "partDetail", e.target.value)}
                                    placeholder="Details"
                                    className="w-full  bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none"
                                  />
                                  <SearchableSelect
                                    options={MaterialGradeOptions}
                                    value={row.materialGrade}
                                    onChange={(val) => updateTableRow("materials", row.id, "materialGrade", val)}
                                    placeholder="Grade"
                                    allowCustom={true}
                                  />
                                  
                                  {/* Editable Dimensions in Table */}
                                  {row.itemGroup?.toLowerCase().includes("plate") && (
                                    <div className="grid grid-cols-3 gap-1">
                                      <input type="number" value={row.length} onChange={(e) => updateTableRow("materials", row.id, "length", e.target.value)} placeholder="L" className="w-full p-1 border rounded text-xs" />
                                      <input type="number" value={row.width} onChange={(e) => updateTableRow("materials", row.id, "width", e.target.value)} placeholder="W" className="w-full p-1 border rounded text-xs" />
                                      <input type="number" value={row.thickness} onChange={(e) => updateTableRow("materials", row.id, "thickness", e.target.value)} placeholder="T" className="w-full p-1 border rounded text-xs" />
                                    </div>
                                  )}
                                  {row.itemGroup?.toLowerCase().includes("round bar") && (
                                    <div className="grid grid-cols-2 gap-1">
                                      <input type="number" value={row.diameter} onChange={(e) => updateTableRow("materials", row.id, "diameter", e.target.value)} placeholder="D" className="w-full p-1 border rounded text-xs" />
                                      <input type="number" value={row.length} onChange={(e) => updateTableRow("materials", row.id, "length", e.target.value)} placeholder="L" className="w-full p-1 border rounded text-xs" />
                                    </div>
                                  )}
                                  {row.itemGroup?.toLowerCase().includes("pipe") && (
                                    <div className="grid grid-cols-3 gap-1">
                                      <input type="number" value={row.outerDiameter} onChange={(e) => updateTableRow("materials", row.id, "outerDiameter", e.target.value)} placeholder="OD" className="w-full p-1 border rounded text-xs" />
                                      <input type="number" value={row.thickness} onChange={(e) => updateTableRow("materials", row.id, "thickness", e.target.value)} placeholder="T" className="w-full p-1 border rounded text-xs" />
                                      <input type="number" value={row.length} onChange={(e) => updateTableRow("materials", row.id, "length", e.target.value)} placeholder="L" className="w-full p-1 border rounded text-xs" />
                                    </div>
                                  )}
                                  {row.itemGroup?.toLowerCase().includes("block") && (
                                    <div className="grid grid-cols-3 gap-1">
                                      <input type="number" value={row.length} onChange={(e) => updateTableRow("materials", row.id, "length", e.target.value)} placeholder="L" className="w-full p-1 border rounded text-xs" />
                                      <input type="number" value={row.width} onChange={(e) => updateTableRow("materials", row.id, "width", e.target.value)} placeholder="W" className="w-full p-1 border rounded text-xs" />
                                      <input type="number" value={row.height} onChange={(e) => updateTableRow("materials", row.id, "height", e.target.value)} placeholder="H" className="w-full p-1 border rounded text-xs" />
                                    </div>
                                  )}
                                  {row.itemGroup?.toLowerCase().includes("square bar") && (
                                    <div className="grid grid-cols-2 gap-1">
                                      <input type="number" value={row.side1} onChange={(e) => updateTableRow("materials", row.id, "side1", e.target.value)} placeholder="Side" className="w-full p-1 border rounded text-xs" />
                                      <input type="number" value={row.length} onChange={(e) => updateTableRow("materials", row.id, "length", e.target.value)} placeholder="L" className="w-full p-1 border rounded text-xs" />
                                    </div>
                                  )}
                                  {row.itemGroup?.toLowerCase().includes("rectangular bar") && (
                                    <div className="grid grid-cols-3 gap-1">
                                      <input type="number" value={row.width} onChange={(e) => updateTableRow("materials", row.id, "width", e.target.value)} placeholder="W" className="w-full p-1 border rounded text-xs" />
                                      <input type="number" value={row.thickness} onChange={(e) => updateTableRow("materials", row.id, "thickness", e.target.value)} placeholder="T" className="w-full p-1 border rounded text-xs" />
                                      <input type="number" value={row.length} onChange={(e) => updateTableRow("materials", row.id, "length", e.target.value)} placeholder="L" className="w-full p-1 border rounded text-xs" />
                                    </div>
                                  )}
                                  {row.itemGroup?.toLowerCase().includes("square tube") && (
                                    <div className="grid grid-cols-3 gap-1">
                                      <input type="number" value={row.side1} onChange={(e) => updateTableRow("materials", row.id, "side1", e.target.value)} placeholder="S" className="w-full p-1 border rounded text-xs" />
                                      <input type="number" value={row.thickness} onChange={(e) => updateTableRow("materials", row.id, "thickness", e.target.value)} placeholder="T" className="w-full p-1 border rounded text-xs" />
                                      <input type="number" value={row.length} onChange={(e) => updateTableRow("materials", row.id, "length", e.target.value)} placeholder="L" className="w-full p-1 border rounded text-xs" />
                                    </div>
                                  )}
                                  {row.itemGroup?.toLowerCase().includes("rectangular tube") && (
                                    <div className="grid grid-cols-4 gap-1">
                                      <input type="number" value={row.width} onChange={(e) => updateTableRow("materials", row.id, "width", e.target.value)} placeholder="W" className="w-full p-1 border rounded text-xs" />
                                      <input type="number" value={row.height} onChange={(e) => updateTableRow("materials", row.id, "height", e.target.value)} placeholder="H" className="w-full p-1 border rounded text-xs" />
                                      <input type="number" value={row.thickness} onChange={(e) => updateTableRow("materials", row.id, "thickness", e.target.value)} placeholder="T" className="w-full p-1 border rounded text-xs" />
                                      <input type="number" value={row.length} onChange={(e) => updateTableRow("materials", row.id, "length", e.target.value)} placeholder="L" className="w-full p-1 border rounded text-xs" />
                                    </div>
                                  )}
                                  {row.itemGroup?.toLowerCase().includes("angle") && (
                                    <div className="grid grid-cols-4 gap-1">
                                      <input type="number" value={row.side1} onChange={(e) => updateTableRow("materials", row.id, "side1", e.target.value)} placeholder="S1" className="w-full p-1 border rounded text-xs" />
                                      <input type="number" value={row.side2} onChange={(e) => updateTableRow("materials", row.id, "side2", e.target.value)} placeholder="S2" className="w-full p-1 border rounded text-xs" />
                                      <input type="number" value={row.thickness} onChange={(e) => updateTableRow("materials", row.id, "thickness", e.target.value)} placeholder="T" className="w-full p-1 border rounded text-xs" />
                                      <input type="number" value={row.length} onChange={(e) => updateTableRow("materials", row.id, "length", e.target.value)} placeholder="L" className="w-full p-1 border rounded text-xs" />
                                    </div>
                                  )}
                                  {row.itemGroup?.toLowerCase().includes("c channel") && (
                                    <div className="grid grid-cols-4 gap-1">
                                      <input type="number" value={row.width} onChange={(e) => updateTableRow("materials", row.id, "width", e.target.value)} placeholder="W" className="w-full p-1 border rounded text-xs" />
                                      <input type="number" value={row.height} onChange={(e) => updateTableRow("materials", row.id, "height", e.target.value)} placeholder="H" className="w-full p-1 border rounded text-xs" />
                                      <input type="number" value={row.thickness} onChange={(e) => updateTableRow("materials", row.id, "thickness", e.target.value)} placeholder="T" className="w-full p-1 border rounded text-xs" />
                                      <input type="number" value={row.length} onChange={(e) => updateTableRow("materials", row.id, "length", e.target.value)} placeholder="L" className="w-full p-1 border rounded text-xs" />
                                    </div>
                                  )}
                                  {(row.itemGroup?.toLowerCase().includes("i beam") || row.itemGroup?.toLowerCase().includes("h beam")) && (
                                    <div className="grid grid-cols-5 gap-1">
                                      <input type="number" value={row.height} onChange={(e) => updateTableRow("materials", row.id, "height", e.target.value)} placeholder="H" className="w-full p-1 border rounded text-xs" />
                                      <input type="number" value={row.width} onChange={(e) => updateTableRow("materials", row.id, "width", e.target.value)} placeholder="W" className="w-full p-1 border rounded text-xs" />
                                      <input type="number" value={row.webThickness} onChange={(e) => updateTableRow("materials", row.id, "webThickness", e.target.value)} placeholder="WT" className="w-full p-1 border rounded text-xs" />
                                      <input type="number" value={row.flangeThickness} onChange={(e) => updateTableRow("materials", row.id, "flangeThickness", e.target.value)} placeholder="FT" className="w-full p-1 border rounded text-xs" />
                                      <input type="number" value={row.length} onChange={(e) => updateTableRow("materials", row.id, "length", e.target.value)} placeholder="L" className="w-full p-1 border rounded text-xs" />
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex flex-col">
                                  <span className="text-xs text-slate-700 dark:text-slate-300">
                                    {row.partDetail || "-"}
                                  </span>
                                  <span className="text-xs  text-slate-500 dark:text-slate-400  ">{row.materialGrade || "-"}</span>
                                </div>
                              )}
                            </td>
                            <td className="p-2">
                              {isEditing ? (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={row.remark}
                                    onChange={(e) => updateTableRow("materials", row.id, "remark", e.target.value)}
                                    placeholder="Remark"
                                    className="w-full  bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none"
                                  />
                                  <input
                                    type="text"
                                    value={row.make}
                                    onChange={(e) => updateTableRow("materials", row.id, "make", e.target.value)}
                                    placeholder="Make"
                                    className="w-full  bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs outline-none"
                                  />
                                </div>
                              ) : (
                                <div className="flex flex-col">
                                  <span className="text-xs text-slate-500 italic">{row.remark || "-"}</span>
                                  <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {row.make || "-"}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="p-2 text-center">
                              <div className="flex flex-col items-center">
                                <span className="text-xs  text-slate-700 dark:text-slate-200">
                                  {Number((parseFloat(row.totalWeight || row.total || 0) || (parseFloat(row.calculatedWeight || row.unitWeight || 0) * parseFloat(row.quantity || 0))).toFixed(3))} Kg
                                </span>
                                {(parseFloat(row.unitWeight) > 0 || parseFloat(row.calculatedWeight) > 0) && (
                                  <span className="text-xs text-slate-400">
                                    Unit: {Number(parseFloat(row.unitWeight || row.calculatedWeight || 0).toFixed(3))}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-2 text-center">
                              {isEditing ? (
                                <input
                                  type="number"
                                  name={`mat-qty-${row.id}`}
                                  id={`mat-qty-${row.id}`}
                                  aria-label="Material Quantity"
                                  value={row.quantity}
                                  onChange={(e) => updateTableRow("materials", row.id, "quantity", e.target.value === "" ? "" : parseFloat(e.target.value))}
                                  onBlur={(e) => {
                                    if (e.target.value === "") {
                                      updateTableRow("materials", row.id, "quantity", 0);
                                    }
                                  }}
                                  onFocus={(e) => e.target.select()}
                                  className="w-20 .5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 text-xs text-center focus:ring-2 focus:ring-emerald-500/20 outline-none"
                                />
                              ) : (
                                <span className="text-xs text-slate-500 dark:text-slate-400">{Number(parseFloat(row.quantity || 0))}</span>
                              )}
                            </td>
                            <td className="p-2">
                              {isEditing ? (
                                <SearchableSelect
                                  name={`mat-uom-${row.id}`}
                                  id={`mat-uom-${row.id}`}
                                  aria-label="Material UOM"
                                  options={UOMSelectOptions}
                                  value={row.uom}
                                  onChange={(value) => updateTableRow("materials", row.id, "uom", value)}
                                  placeholder="UOM"
                                  allowCustom={true}
                                />
                              ) : (
                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs  text-slate-500 dark:text-slate-400">{row.uom}</span>
                              )}
                            </td>
                            <td className="p-2">
                              <div className="flex items-center justify-center gap-1">
                                {isEditing ? (
                                  <>
                                    <button
                                      onClick={() => setEditingMaterialId(null)}
                                      className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded transition-colors"
                                      title="Save"
                                    >
                                      <Check size={15} />
                                    </button>
                                    <button
                                      onClick={() => setEditingMaterialId(null)}
                                      className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-colors"
                                      title="Cancel"
                                    >
                                      <X size={15} />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => setEditingMaterialId(row.id)}
                                      className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                      title="Edit Row"
                                    >
                                      <Edit2 size={15} />
                                    </button>
                                    <button
                                      onClick={() => removeTableRow("materials", row.id)}
                                      className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-colors"
                                      title="Delete Row"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {bomData.materials.length === 0 && (
                  <div className="text-center py-6 text-slate-400 text-xs  italic">
                    No materials added yet. Use the form above to add your first material.
                  </div>
                )}
              </div>
            )}
          </AccordionSection>

        </div>

        <div className="mt-6 flex flex-col md:flex-row md:items-center justify-end gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/department/production/bom/view")}
              className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-xs transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving}
              className="p-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded  text-xs shadow-emerald-600/20 transition-all active:scale-95 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded  animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={15} />
                  {editMode ? "Update BOM" : "Create BOM"}
                </>
              )}
            </button>
            {editMode && (
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded  shadow-lg shadow-blue-600/20 transition-all active:scale-95 flex items-center gap-2"
              >
                <Copy size={15} />
                Save as New Revision
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateBOMPage;
