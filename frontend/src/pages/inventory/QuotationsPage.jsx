import { useState, useCallback, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  FileText,
  Search,
  Plus,
  Filter,
  Download,
  Eye,
  Check,
  CheckCircle,
  X,
  Calendar,
  IndianRupee,
  Trash2,
  Briefcase,
  Loader2,
  Save,
  ArrowLeft,
  Send,
  Mail,
  MessageSquare,
  Paperclip,
  PlusCircle,
  ChevronDown,
} from "lucide-react";
import axios from "../../utils/api";
import useRootCardInventoryTask from "../../hooks/useRootCardInventoryTask";
import CreatePurchaseOrderModal from "./CreatePurchaseOrderModal";
import CreateQuotationModal from "../../components/inventory/CreateQuotationModal";
import { renderDimensions } from "../../utils/dimensionUtils";

const QuotationsPage = ({ defaultTab }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { completeCurrentTask, isFromDepartmentTasks } = useRootCardInventoryTask();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState(defaultTab || location.state?.activeTab || "outbound");
  const basePath = location.pathname.includes('/procurement') ? '/department/procurement' : '/department/inventory';

  // Sync tab state when defaultTab prop changes (navigation between routes)
  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  useEffect(() => {
    const mrId = searchParams.get("materialRequestId") || searchParams.get("mrId");
    const action = searchParams.get("action");
    
    if (location.state?.openModal && !location.state?.modalProcessed) {
      if (location.state.initialData) {
        setInitialData(location.state.initialData);
      }
      setShowAddModal(true);
      
      // Mark as processed in local state or navigation state
      navigate(location.pathname + location.search, { 
        replace: true, 
        state: { ...location.state, modalProcessed: true } 
      });
    } else if (mrId && !showAddModal && !location.state?.modalProcessed) {
      if (activeTab === "outbound" && action !== "record") {
        if (action === "send") {
          axios.get(`${basePath}/quotations?material_request_id=${mrId}&type=outbound`).then(response => {
            const existingQuotes = response.data;
            if (existingQuotes && existingQuotes.length > 0) {
              handleSendEmail(existingQuotes[0]);
            } else {
              fetchMRAndOpenAddModal(mrId, "outbound");
            }
          }).catch(err => console.error("Error finding quote:", err));
        } else if (action === "create") {
          fetchMRAndOpenAddModal(mrId, "outbound");
        }
      } else if (activeTab === "inbound" && action === "record") {
        axios.get(`${basePath}/quotations?material_request_id=${mrId}&type=outbound`).then(response => {
          const existingQuotes = response.data;
          if (existingQuotes && existingQuotes.length > 0) {
            const quote = existingQuotes.find(q => q.status === "sent") || existingQuotes[0];
            handleRecordResponse(quote);
          } else {
            fetchMRAndOpenAddModal(mrId, "inbound");
          }
        }).catch(err => console.error("Error finding quote:", err));
      }
    }
  }, [searchParams, activeTab, location.pathname, location.search]); // Simplified dependencies

  const fetchMRAndOpenAddModal = (mrId, type = "outbound") => {
    axios.get(`/department/procurement/material-requests/${mrId}`).then(response => {
      const mr = response.data.materialRequest;
      if (mr && mr.items) {
        const items = Array.isArray(mr.items) ? mr.items : JSON.parse(mr.items || "[]");
        
        const preFilled = items.map(item => ({
          item_name: item.item_name || item.material_name || item.description || "",
          quantity: item.quantity || item.required_quantity || 0,
          unit: item.unit || item.uom || "",
          unit_price: 0,
          total_weight: item.total_weight ? Number(parseFloat(item.total_weight).toFixed(3)) : (item.totalWeight ? Number(parseFloat(item.totalWeight).toFixed(3)) : 0),
          unit_weight: item.unit_weight ? Number(parseFloat(item.unit_weight).toFixed(3)) : (item.unitWeight ? Number(parseFloat(item.unitWeight).toFixed(3)) : 0),
          item_group: item.item_group || "",
          material_grade: item.material_grade || "",
          part_detail: item.part_detail || "",
          make: item.make || "",
          remark: item.remark || "",
          length: item.length || null,
          width: item.width || null,
          thickness: item.thickness || null,
          diameter: item.diameter || null,
          outer_diameter: item.outer_diameter || null,
          height: item.height || null,
          side1: item.side1 || null,
          side2: item.side2 || null,
          web_thickness: item.web_thickness || null,
          flange_thickness: item.flange_thickness || null
        }));

        setInitialData({
          material_request_id: mr.id,
          root_card_id: mr.sales_order_id || mr.root_card_id || "",
          items: preFilled,
          type: type
        });
        setShowAddModal(true);
      }
    }).catch(err => console.error("Error fetching MR for Quotation:", err));
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const searchString = location.search;
    if (tab === "outbound") {
      navigate(`${basePath}/quotations/sent${searchString}`);
    } else {
      navigate(`${basePath}/quotations/received${searchString}`);
    }
  };
  const [stats, setStats] = useState({});
  const [error, setError] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [rootCards, setRootCards] = useState([]);
  const [materialRequests, setMaterialRequests] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [initialData, setInitialData] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailData, setEmailData] = useState({
    quotationId: null,
    quotationNumber: "",
    email: "",
    subject: "",
    message: "",
  });
  const [showCommunicationsModal, setShowCommunicationsModal] = useState(false);
  const [selectedQuotationForComms, setSelectedQuotationForComms] = useState(null);
  const [communications, setCommunications] = useState([]);
  const [loadingCommunications, setLoadingCommunications] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [quotationToApprove, setQuotationToApprove] = useState(null);

  const fetchQuotations = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter !== "all") params.append("status", statusFilter);
      
      const mrId = searchParams.get("materialRequestId") || searchParams.get("mrId");
      if (mrId) params.append("material_request_id", mrId);
      
      params.append("type", activeTab);

      const response = await axios.get(`${basePath}/quotations?${params}`);
      setQuotations(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching quotations:", err);
      setError("Failed to fetch quotations");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, activeTab, searchParams]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get(`${basePath}/quotations/stats`);
      setStats(response.data);
    } catch (err) {
      console.error("Error fetching quotation stats:", err);
    }
  }, []);

  const fetchVendors = useCallback(async () => {
    try {
      const response = await axios.get(`${basePath}/vendors`);
      setVendors(response.data);
    } catch (err) {
      console.error("Error fetching vendors:", err);
    }
  }, []);

  const fetchRootCards = useCallback(async () => {
    try {
      const response = await axios.get("/root-cards/requirements");
      setRootCards(response.data.data || []);
    } catch (err) {
      console.error("Error fetching rootCards:", err);
    }
  }, []);

  const fetchMaterialRequests = useCallback(async () => {
    try {
      const response = await axios.get("/department/procurement/material-requests");
      setMaterialRequests(response.data.materialRequests || response.data || []);
    } catch (err) {
      console.error("Error fetching material requests:", err);
    }
  }, []);

  useEffect(() => {
    fetchQuotations();
    fetchStats();
    fetchVendors();
    fetchRootCards();
    fetchMaterialRequests();
  }, [fetchQuotations, fetchStats, fetchVendors, fetchRootCards, fetchMaterialRequests]);

  // Auto-refresh notifications and stats every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // We only refresh quotations and stats to check for new replies/updates
      // without showing the full loader to avoid flickering
      const silentFetch = async () => {
        try {
          const params = new URLSearchParams();
          if (searchQuery) params.append("search", searchQuery);
          if (statusFilter !== "all") params.append("status", statusFilter);
          
          const mrId = searchParams.get("materialRequestId") || searchParams.get("mrId");
          if (mrId) params.append("material_request_id", mrId);
          
          params.append("type", activeTab);

          const [qRes, sRes] = await Promise.all([
            axios.get(`${basePath}/quotations?${params}`),
            axios.get(`${basePath}/quotations/stats`)
          ]);
          setQuotations(qRes.data);
          setStats(sRes.data);
        } catch (err) {
          console.error("Silent refresh failed:", err);
        }
      };
      silentFetch();
    }, 30000);
    return () => clearInterval(interval);
  }, [searchQuery, statusFilter, activeTab, searchParams]);

  // Auto-refresh communications when modal is open
  useEffect(() => {
    let interval;
    if (showCommunicationsModal && selectedQuotationForComms) {
      interval = setInterval(async () => {
        try {
          const response = await axios.get(
            `${basePath}/quotations/${selectedQuotationForComms.id}/communications`
          );
          setCommunications(response.data || []);
        } catch (error) {
          console.error("Error refreshing communications:", error);
        }
      }, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showCommunicationsModal, selectedQuotationForComms]);

  const handleQuotationCreated = () => {
    fetchQuotations();
    fetchStats();
    
    // Complete task based on active tab
    if (activeTab === "outbound") {
      completeCurrentTask("RFQ quotation created");
    } else if (activeTab === "inbound") {
      completeCurrentTask("Vendor quotation received and recorded");
    }
  };

  const handleViewQuotation = async (quotation) => {
    try {
      const response = await axios.get(`${basePath}/quotations/${quotation.id}`);
      const fullQuotation = response.data;
      const doc = await generateQuotationPDF(fullQuotation);
      window.open(doc.output("bloburl"), "_blank");
    } catch (err) {
      console.error("Error viewing quotation detail:", err);
      toast.error("Failed to load quotation details");
    }
  };

  const handleViewReceivedQuotation = async (quotationId) => {
    try {
      const response = await axios.get(
        `${basePath}/quotations/${quotationId}/download`,
        {
          responseType: "blob",
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      window.open(url, "_blank");
    } catch (error) {
      console.error("Error viewing quotation:", error);
      toast.error("Failed to view quotation PDF");
    }
  };

  const loadImage = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = reject;
    });
  };

  const generateQuotationPDF = async (quotation) => {
    const doc = new jsPDF();

    try {
      const logo = await loadImage("/logo.png");
      doc.addImage(logo, "PNG", 14, 5, 50, 15);
    } catch (error) {
      console.warn("Logo not found or failed to load:", error);
    }

    doc.setFontSize(20);
    doc.text("QUOTATION REQUEST", 105, 30, { align: "center" });

    doc.setFontSize(10);
    doc.text(`Quotation No: ${quotation.quotation_number}`, 14, 45);
    doc.text(
      `Date: ${new Date(quotation.created_at || Date.now()).toLocaleDateString()}`,
      14,
      50
    );
    doc.text(`Vendor: ${quotation.vendor_name || "N/A"}`, 14, 55);

    if (quotation.mr_number) {
      doc.text(`Material Request: ${quotation.mr_number}`, 14, 60);
    }

    if (quotation.rfq_number) {
      doc.text(`Reference RFQ: ${quotation.rfq_number}`, 14, quotation.mr_number ? 65 : 60);
    }

    if (quotation.valid_until) {
      let yPos = 60;
      if (quotation.mr_number && quotation.rfq_number) yPos = 70;
      else if (quotation.mr_number || quotation.rfq_number) yPos = 65;
      
      doc.text(
        `Valid Until: ${new Date(quotation.valid_until).toLocaleDateString()}`,
        14,
        yPos
      );
    }

    const tableColumn = quotation.type === "inbound" ? [
      "Material Name", // Replaced with vendor name if different
      "Qty",
      "UOM",
      "Rate/Kg",
      "Weight (Kg)",
      "Total"
    ] : [
      "Item Name",
      "Group",
      "Grade",
      "Part Detail",
      "Make",
      "Remark",
      "Weight (Kg)",
      "Qty",
      "Unit",
    ];

    const tableRows = (quotation.items || []).map((item) => {
      // Helper for dimension text
      const getDimText = (item) => {
        const dims = renderDimensions(item);
        return dims !== "-" ? `\nDim: ${dims} mm` : "";
      };

      if (quotation.type === "inbound") {
        const dimText = getDimText(item);
        return [
          (item.vendor_item_name || item.item_name || "N/A") + dimText,
          item.quantity ? parseFloat(item.quantity).toString() : "0",
          item.unit || "N/A",
          `INR ${Number(item.rate_per_kg || 0).toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`,
          `${Number(item.total_weight || 0).toFixed(3)}`,
          `INR ${Number(item.total_weight * item.rate_per_kg || 0).toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`
        ];
      } else {
        const dimText = getDimText(item);
        return [
          (item.item_name || "N/A") + dimText,
          item.item_group || "N/A",
          item.material_grade || "N/A",
          item.part_detail || "N/A",
          item.make || "N/A",
          item.remark || "N/A",
          item.total_weight ? `${parseFloat(item.total_weight).toFixed(3)}` : "0.000",
          item.quantity ? parseFloat(item.quantity).toString() : "0",
          item.unit || "N/A",
        ];
      }
    });

    let startY = 70;
    if (quotation.valid_until && quotation.mr_number && quotation.rfq_number) startY = 80;
    else if (quotation.valid_until && (quotation.mr_number || quotation.rfq_number)) startY = 75;
    else if (quotation.mr_number && quotation.rfq_number) startY = 75;

    const columnStyles = quotation.type === "inbound" ? {
      0: { cellWidth: "auto" }, // Material Name
      1: { cellWidth: 20 }, // Qty
      2: { cellWidth: 20 }, // UOM
      3: { cellWidth: 25 }, // Rate/Kg
      4: { cellWidth: 25 }, // Weight
      5: { cellWidth: 30 }, // Total
    } : {
      0: { cellWidth: "auto" }, // Item Name
      1: { cellWidth: 15 }, // Group
      2: { cellWidth: 15 }, // Grade
      3: { cellWidth: 15 }, // Part Detail
      4: { cellWidth: 15 }, // Make
      5: { cellWidth: 15 }, // Remark
      6: { cellWidth: 20 }, // Weight
      7: { cellWidth: 12 }, // Qty
      8: { cellWidth: 12 }, // Unit
    };

    autoTable(doc, {
      startY: startY,
      head: [tableColumn],
      body: tableRows,
      theme: "grid",
      headStyles: { fillColor: [66, 139, 202] },
      styles: { fontSize: 7, cellPadding: 2 }, 
      columnStyles: columnStyles,
    });

    const finalY = doc.lastAutoTable.finalY + 10;

    if (quotation.type === "inbound" && quotation.total_amount) {
      doc.setFontSize(12);
      doc.text(
        `Total Amount: INR ${quotation.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`,
        140,
        finalY
      );
    }

    // Add Notes if present, filtering out Root Card references as requested
    if (quotation.notes) {
      const filteredNotes = quotation.notes
        .split('\n')
        .filter(line => !line.toLowerCase().includes('root card'))
        .join('\n')
        .trim();

      if (filteredNotes) {
        const nextY = (quotation.type === "inbound" && quotation.total_amount) ? finalY + 15 : finalY;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Notes:", 14, nextY);
        doc.setFont("helvetica", "normal");
        doc.text(filteredNotes, 14, nextY + 7);
      }
    }

    return doc;
  };

  const handleSendEmail = (quotation) => {
    const vendor = vendors.find((v) => v.id === quotation.vendor_id);
    setEmailData({
      quotationId: quotation.id,
      quotationNumber: quotation.quotation_number,
      email: vendor?.email || "",
      subject: `Quotation Request ${quotation.quotation_number}`,
      message: `Dear ${
        vendor?.name || "Vendor"
      },\n\nPlease find attached quotation request ${
        quotation.quotation_number
      }.\n\nBest regards,\nSterling ERP`,
    });
    setShowEmailModal(true);
  };

  const handleViewCommunications = async (quotation) => {
    setSelectedQuotationForComms(quotation);
    setShowCommunicationsModal(true);
    setLoadingCommunications(true);
    try {
      const response = await axios.get(
        `${basePath}/quotations/${quotation.id}/communications`
      );
      setCommunications(response.data || []);
    } catch (error) {
      console.error("Error fetching communications:", error);
      setCommunications([]);
    } finally {
      setLoadingCommunications(false);
    }
  };

  const handleCloseCommunications = () => {
    setShowCommunicationsModal(false);
    setReplyMessage("");
    fetchQuotations();
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim()) return;

    try {
      setSendingReply(true);
      const vendor = vendors.find((v) => v.id === selectedQuotationForComms.vendor_id);
      
      await axios.post(`${basePath}/quotations/${selectedQuotationForComms.id}/email`, {
        email: vendor?.email,
        subject: `RE: Quotation Request ${selectedQuotationForComms.quotation_number}`,
        message: replyMessage,
      });

      setReplyMessage("");
      // Refresh communications
      const response = await axios.get(
        `${basePath}/quotations/${selectedQuotationForComms.id}/communications`
      );
      setCommunications(response.data || []);
      
      toast.success("Reply sent successfully");
    } catch (error) {
      console.error("Error sending reply:", error);
      toast.error("Failed to send reply");
    } finally {
      setSendingReply(false);
    }
  };

  const handleDownloadAttachment = async (attachmentId, fileName) => {
    try {
      const response = await axios.get(
        `${basePath}/quotations/communications/attachment/${attachmentId}`,
        {
          responseType: "blob",
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.parentElement.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading attachment:", error);
      toast.error("Failed to download attachment");
    }
  };

  const submitEmail = async (e) => {
    e.preventDefault();
    if (!emailData.email) {
      toast.warning("Please enter an email address");
      return;
    }

    setSendingEmail(true);
    try {
      // Fetch full quotation details including items
      const response = await axios.get(`${basePath}/quotations/${emailData.quotationId}`);
      const fullQuotation = response.data;
      
      if (!fullQuotation) throw new Error("Quotation not found");

      const doc = await generateQuotationPDF(fullQuotation);
      const pdfBase64 = doc.output("datauristring");

      await axios.post(`${basePath}/quotations/${fullQuotation.id}/email`, {
        email: emailData.email,
        subject: emailData.subject,
        message: emailData.message,
        pdfBase64,
      });

      await axios.patch(`${basePath}/quotations/${fullQuotation.id}/status`, {
        status: "sent",
      });

      await completeCurrentTask("Quotation sent to vendor via email");

      toast.success("Quotation sent successfully!");
      setShowEmailModal(false);
      fetchQuotations();
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error(
        "Failed to send quotation: " +
          (error.response?.data?.message || error.message)
      );
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDeleteQuotation = async (id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (!result.isConfirmed) return;

    try {
      await axios.delete(`${basePath}/quotations/${id}`);
      fetchQuotations();
      fetchStats();
      toast.success("Quotation deleted successfully.");
    } catch (err) {
      console.error("Error deleting quotation:", err);
      toast.error("Failed to delete quotation");
    }
  };

  const handleInlineStatusUpdate = async (quoteOrId, newStatus) => {
    const quote = typeof quoteOrId === 'object' ? quoteOrId : quotations.find(q => q.id === quoteOrId);
    const quoteId = typeof quoteOrId === 'object' ? quote.id : quoteOrId;

    if (newStatus === "approved") {
      setQuotationToApprove(quote);
      setShowUploadModal(true);
      return;
    }

    try {
      setUpdatingStatusId(quoteId);
      await axios.patch(`${basePath}/quotations/${quoteId}/status`, {
        status: newStatus,
      });
      
      // Update local state immediately for better UX
      setQuotations(prev => prev.map(q => q.id === quoteId ? { ...q, status: newStatus } : q));
      
      // Refresh stats in background
      fetchStats();
      
      if (newStatus === "approved") {
        toast.success("Quotation approved successfully");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
      fetchQuotations(); // Revert on error
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleUploadAndApprove = async () => {
    if (!selectedFile) {
      toast.error("Please select a PDF file");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("status", "approved");
      formData.append("received_quotation", selectedFile);

      await axios.patch(`${basePath}/quotations/${quotationToApprove.id}/status`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Quotation approved and PDF uploaded successfully");
      
      // Update local state
      setQuotations(prev => prev.map(q => q.id === quotationToApprove.id ? { ...q, status: "approved" } : q));
      
      // Reset state and close modal
      setShowUploadModal(false);
      setSelectedFile(null);
      setQuotationToApprove(null);
      fetchStats();
    } catch (error) {
      console.error("Error uploading quotation:", error);
      toast.error("Failed to upload and approve quotation");
    } finally {
      setUploading(false);
    }
  };

  const handleCreatePOFromQuote = (quote) => {
    navigate("/department/procurement/purchase-orders", { 
      state: { quotation: quote } 
    });
  };

  const handleRecordResponse = (quote) => {
    setInitialData({
      vendor_id: quote.vendor_id,
      root_card_id: quote.root_card_id || "",
      material_request_id: quote.material_request_id || null,
      total_amount: 0,
      valid_until: "",
      items: (quote.items || []).map((item) => ({
        item_name: item.item_name,
        vendor_item_name: item.vendor_item_name || "",
        category: item.category || item.materialType || "",
        quantity: item.quantity,
        unit: item.unit || "",
        unit_price: 0,
        item_group: item.item_group || "",
        part_detail: item.part_detail || "",
        material_grade: item.material_grade || "",
        make: item.make || "",
        remark: item.remark || "",
        length: item.length || null,
        width: item.width || null,
        thickness: item.thickness || null,
        diameter: item.diameter || null,
        outer_diameter: item.outer_diameter || null,
        height: item.height || null,
        side1: item.side1 || null,
        side2: item.side2 || null,
        web_thickness: item.web_thickness || null,
        flange_thickness: item.flange_thickness || null,
        total_weight: item.total_weight ? Number(parseFloat(item.total_weight).toFixed(3)) : (item.totalWeight ? Number(parseFloat(item.totalWeight).toFixed(3)) : 0),
        unit_weight: item.unit_weight ? Number(parseFloat(item.unit_weight).toFixed(3)) : (item.unitWeight ? Number(parseFloat(item.unitWeight).toFixed(3)) : 0),
      })),
      notes: `Response to ${quote.quotation_number}`,
      type: "inbound",
      reference_id: quote.id,
      rfq_id: quote.id,
      rfq_number: quote.quotation_number,
    });
    setShowAddModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "sent":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "responded":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  const isExpired = (validUntil) => {
    if (!validUntil) return false;
    const today = new Date();
    const expiry = new Date(validUntil);
    return expiry < today;
  };

  const getDaysValid = (validUntil) => {
    if (!validUntil) return "N/A";
    const today = new Date();
    const expiry = new Date(validUntil);
    const days = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const formatCurrency = (value) => {
    if (!value) return "₹0";
    return `₹${(value / 100000).toFixed(2)}L`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN");
  };

  return (
    <div className="space-y-2 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-md  text-slate-900 dark:text-white  flex items-center gap-2">
            
            Vendor Quotations
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs">
            Manage and compare vendor quotes
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => {
              setInitialData({
                vendor_id: "",
                root_card_id: "",
                total_amount: 0,
                valid_until: "",
                items: [],
                notes: "",
                type: activeTab,
                reference_id: null,
              });
              setShowAddModal(true);
            }}
            className={`flex items-center text-xs gap-2 p-2 text-white rounded transition-colors  ${
              activeTab === "outbound"
                ? "bg-indigo-600 hover:bg-indigo-700"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {activeTab === "outbound" ? <Send size={15} /> : <Plus size={15} />}
            {activeTab === "outbound" ? "Request Quote" : "Record Quote"}
          </button>
          <button className="flex items-center text-xs gap-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors ">
            <Download size={15} />
            Export Report
          </button>
        </div>
      </div>

      {isFromDepartmentTasks() && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded p-4 flex items-start gap-3">
          <div className="flex-1">
            <p className="text-xs  text-blue-900 dark:text-blue-300">
              📋 Inventory Task Context
            </p>
            <p className="text-xs text-blue-800 dark:text-blue-400 mt-1">
              You're working on a task from the Department Tasks workflow. When you complete actions here, the task status will be automatically updated.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex my-5 border-b border-slate-200 dark:border-slate-700">
        <button
          className={`p-2  text-xs transition-colors relative ${
            activeTab === "outbound"
              ? "text-blue-600 dark:text-blue-400"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
          onClick={() => handleTabChange("outbound")}
        >
          Sent Requests (RFQ)
          {activeTab === "outbound" && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400" />
          )}
        </button>
        <button
          className={`p-2  text-xs transition-colors relative ${
            activeTab === "inbound"
              ? "text-blue-600 dark:text-blue-400"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
          onClick={() => handleTabChange("inbound")}
        >
          Received Quotes
          {activeTab === "inbound" && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400" />
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="dark:border-slate-700 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search 
              size={15}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search quote, vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white  text-xs"
          >
            <option value="all">All Quotations</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <button className="flex items-center text-xs justify-center gap-2 p-2 border border-slate-300 dark:border-slate-600 rounded text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <Filter size={15} />
            Advanced Filter
          </button>
        </div>
      </div>

      {/* Quotations Table */}
      <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-2 text-center">
              <p className="text-slate-500 dark:text-slate-400">
                Loading quotations...
              </p>
            </div>
          ) : error ? (
            <div className="p-2 text-center">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          ) : quotations.length === 0 ? (
            <div className="p-2 text-center">
              <p className="text-slate-500 dark:text-slate-400">
                No quotations found
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                  <th className="p-2 text-left text-xs  text-slate-900 dark:text-white">
                    Quote No.
                  </th>
                  <th className="p-2 text-left text-xs  text-slate-900 dark:text-white">
                    Vendor
                  </th>
                  <th className="p-2 text-left text-xs  text-slate-900 dark:text-white">
                    Project
                  </th>
                  {activeTab === "inbound" && (
                    <th className="p-2 text-right text-xs   text-slate-900 dark:text-white">
                      Total Amount
                    </th>
                  )}
                  <th className="p-2 text-left text-xs  text-slate-900 dark:text-white">
                    Valid Till
                  </th>
                  <th className="p-2 text-center text-xs  text-slate-900 dark:text-white">
                    Status
                  </th>
                  <th className="p-2 text-center text-xs  text-slate-900 dark:text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
                {quotations.map((quote) => (
                  <tr
                    key={quote.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
                      isExpired(quote.valid_until)
                        ? "bg-red-50 dark:bg-red-900/20"
                        : ""
                    }`}
                  >
                    <td className="p-2">
                      <p className=" text-slate-900 text-xs dark:text-white">
                        {quote.quotation_number}
                      </p>
                      {quote.reference_id && (
                        <p className="text-xs text-slate-500">
                          Ref: {quote.reference_number}
                        </p>
                      )}
                      {quote.mr_number && (
                        <p className="text-xs text-blue-600   ">
                          MR: {quote.mr_number}
                        </p>
                      )}
                      {quote.rfq_number && (
                        <p className="text-xs text-purple-600   ">
                          RFQ: {quote.rfq_number}
                        </p>
                      )}
                    </td>
                    <td className="p-2 text-xs text-slate-700 dark:text-slate-300 ">
                      {quote.vendor_name}
                    </td>
                    <td className="p-2 text-xs text-slate-700 dark:text-slate-300 ">
                      {quote.project_name || "N/A"}
                    </td>
                    {activeTab === "inbound" && (
                      <td className="p-2 text-right">
                        <p className=" text-slate-900 dark:text-white text-xs flex items-center justify-end gap-1">
                          <IndianRupee size={14} />
                          {quote.total_amount
                            ? quote.total_amount.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })
                            : "0.000"}
                        </p>
                      </td>
                    )}
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-500" />
                        <div>
                          <p className="text-xs  text-slate-900 dark:text-white">
                            {formatDate(quote.valid_until)}
                          </p>
                          <p
                            className={`text-xs ${
                              isExpired(quote.valid_until)
                                ? "text-red-600 "
                                : getDaysValid(quote.valid_until) <= 3
                                ? "text-yellow-600"
                                : "text-green-600"
                            }`}
                          >
                            {isExpired(quote.valid_until)
                              ? "Expired"
                              : getDaysValid(quote.valid_until) + " days valid"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      <span
                        className={`inline-flex items-center p-1 rounded text-xs  ${getStatusColor(
                          quote.status
                        )}`}
                      >
                        {quote.status.charAt(0).toUpperCase() +
                          quote.status.slice(1)}
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex justify-center gap-2">
                        {activeTab === "outbound" && (
                          <button
                            onClick={() => handleRecordResponse(quote)}
                            className="p-2 hover:bg-green-100 dark:hover:bg-green-900 text-green-600 dark:text-green-400 rounded transition-colors"
                            title="Record Vendor Quote"
                          >
                            <Plus size={15} />
                          </button>
                        )}
                        {activeTab === "outbound" && quote.status !== "sent" && (
                          <button
                            onClick={() => handleSendEmail(quote)}
                            className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 rounded transition-colors"
                            title="Send to Vendor"
                          >
                            <Mail size={15} />
                          </button>
                        )}
                        {activeTab === "outbound" && quote.status === "sent" && (
                          <button
                            onClick={() => handleViewCommunications(quote)}
                            className={`p-2 rounded transition-colors relative ${
                              quote.unread_communication_count > 0 
                                ? "bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 animate-pulse" 
                                : "hover:bg-purple-100 dark:hover:bg-purple-900 text-purple-600 dark:text-purple-400"
                            }`}
                            title="View Communications"
                          >
                            <MessageSquare size={15} />
                            {quote.unread_communication_count > 0 && (
                              <>
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 animate-ping rounded bg-red-400 opacity-75"></span>
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded bg-red-500 text-xs  text-white border-2 border-white dark:border-slate-800 ">
                                  {quote.unread_communication_count}
                                </span>
                              </>
                            )}
                          </button>
                        )}
                        {activeTab === "inbound" && quote.status === "pending" && (
                          <button
                            onClick={() => handleInlineStatusUpdate(quote, "approved")}
                            className="p-2 hover:bg-green-100 dark:hover:bg-green-900 text-green-600 dark:text-green-400 rounded transition-colors"
                            title="Quick Approve"
                          >
                            <CheckCircle size={15} />
                          </button>
                        )}
                        {activeTab === "inbound" && (
                          <>
                            {quote.status === "approved" && (
                              <>
                                <button
                                  onClick={() => handleCreatePOFromQuote(quote)}
                                  className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 rounded transition-colors"
                                  title="Create Purchase Order"
                                >
                                  <Plus size={15} />
                                </button>
                                <button
                                  onClick={() => handleViewReceivedQuotation(quote.id)}
                                  className="p-2 hover:bg-purple-100 dark:hover:bg-purple-900 text-purple-600 dark:text-purple-400 rounded transition-colors"
                                  title="View Received Quotation PDF"
                                >
                                  <FileText size={15} />
                                </button>
                              </>
                            )}
                          </>
                        )}

                        <button
                          onClick={() => handleViewQuotation(quote)}
                          className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 rounded transition-colors"
                          title="View"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteQuotation(quote.id)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>


      {/* Add Quotation Modal */}
      <CreateQuotationModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setInitialData(null);
          // Clear action param but keep others (like taskId)
          const params = new URLSearchParams(window.location.search);
          params.delete('action');
          const newSearch = params.toString();
          window.history.replaceState(null, '', window.location.pathname + (newSearch ? '?' + newSearch : ''));
        }}
        onQuotationCreated={handleQuotationCreated}
        preFilledMaterials={location.state?.preFilledMaterials}
        vendors={vendors}
        rootCards={rootCards}
        materialRequests={materialRequests}
        initialData={initialData || {
          type: activeTab,
          reference_id: location.state?.reference_id,
          material_request_id: location.state?.material_request_id
        }}
      />

      {/* Email Modal */}
      {showEmailModal && (
        <div
          className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowEmailModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-slate-700 dark:to-slate-800 flex justify-between items-center px-8 py-6 border-b border-slate-200 dark:border-slate-600">
              <div>
                <h3 className="text-2xl  text-slate-900 dark:text-white text-sm">
                  Send Quotation
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 text-xs">
                  Email quotation {emailData.quotationNumber} to vendor
                </p>
              </div>
              <button
                onClick={() => setShowEmailModal(false)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
              >
                <X size={15} className="text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            <form onSubmit={submitEmail} className="px-8 py-6 space-y-4">
              <div>
                <label className="block text-sm  text-slate-700 dark:text-slate-300 mb-2">
                  Vendor Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={emailData.email}
                  onChange={(e) =>
                    setEmailData({ ...emailData, email: e.target.value })
                  }
                  placeholder="vendor@example.com"
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm  text-slate-700 dark:text-slate-300 mb-2">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={emailData.subject}
                  onChange={(e) =>
                    setEmailData({ ...emailData, subject: e.target.value })
                  }
                  placeholder="Email subject"
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm  text-slate-700 dark:text-slate-300 mb-2">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={emailData.message}
                  onChange={(e) =>
                    setEmailData({ ...emailData, message: e.target.value })
                  }
                  placeholder="Email message"
                  rows="5"
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-6 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors "
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingEmail}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded transition-colors "
                >
                  {sendingEmail ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail size={15} />
                      Send Email
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCommunicationsModal && selectedQuotationForComms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded  w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-2 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div>
                <h3 className="text-md  text-slate-900 dark:text-white">
                  Communications
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 ">
                  RFQ: {selectedQuotationForComms?.quotation_number}
                </p>
              </div>
              <button
                onClick={handleCloseCommunications}
                className="text-slate-400 hover:text-slate-500 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {loadingCommunications ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="animate-spin text-blue-600" size={32} />
                </div>
              ) : communications.length === 0 ? (
                <div className="text-center p-2 text-slate-500 dark:text-slate-400">
                  <MessageSquare
                    size={15}
                    className="mx-auto mb-4 opacity-20"
                  />
                  <p>No communications found for this quotation.</p>
                  <p className="text-sm mt-2">
                    Replies to emails with subject "{selectedQuotationForComms?.quotation_number}"
                    will appear here.
                  </p>
                  <p className="text-xs mt-4 opacity-75 italic">
                    Note: The system checks for new vendor replies every 30 seconds.
                  </p>
                </div>
              ) : (
                communications
                  .filter(comm => comm.sender_id === null) // Only show messages received from vendor
                  .map((comm) => (
                  <div
                    key={comm.id}
                    className={`rounded p-2 border transition-all ${
                      comm.sender_id 
                        ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 ml-8" 
                        : "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30 mr-8"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs   p-1 rounded ${
                          comm.sender_id 
                            ? "bg-blue-600 text-white" 
                            : "bg-emerald-600 text-white"
                        }`}>
                          {comm.sender_id ? "Sent" : "Received"}
                        </span>
                        <div>
                          <span className=" text-slate-900 dark:text-white text-xs">
                            {comm.sender_email}
                          </span>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(comm.received_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {comm.has_attachments && (
                        <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs  rounded ">
                          PDF Attachment
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap  p-3 rounded bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 ">
                      {comm.content_text || "No message content"}
                    </div>

                    {comm.attachments && comm.attachments.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {comm.attachments.map((att) => (
                          <button
                            key={att.id}
                            onClick={() =>
                              handleDownloadAttachment(att.id, att.file_name)
                            }
                            className="flex items-center gap-2 px-3 py-1.5 text-xs  text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-600 border border-slate-300 dark:border-slate-500 rounded hover:bg-slate-50 dark:hover:bg-slate-500 transition-colors"
                          >
                            <Paperclip size={14} />
                            {att.file_name}
                            <span className="text-slate-400 dark:text-slate-400 ml-1">
                              ({Math.round(att.file_size / 1024)} KB)
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl  w-full max-w-md p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl  text-slate-900 dark:text-white">
                Upload Received Quotation
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-500 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-4">
              {quotationToApprove && (
                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500   er">Project Name:</span>
                    <span className="text-slate-900 dark:text-white ">{quotationToApprove.project_name || "N/A"}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500   er">Material Request No:</span>
                    <span className="text-slate-900 dark:text-white ">{quotationToApprove.mr_number || "N/A"}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500   er">Reference RFQ No:</span>
                    <span className="text-slate-900 dark:text-white ">{quotationToApprove.rfq_number || "N/A"}</span>
                  </div>
                  <div className="flex justify-between text-xs pt-1 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500   er">Current Quote No:</span>
                    <span className="text-slate-900 dark:text-white  text-sm">{quotationToApprove.quotation_number}</span>
                  </div>
                </div>
              )}

              <p className="text-sm text-slate-500 dark:text-slate-400">
                Please upload the PDF file received from the vendor to approve this quotation.
              </p>

              <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded p-8 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors relative">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center">
                  <FileText
                    size={40}
                    className={
                      selectedFile ? "text-blue-500" : "text-slate-400"
                    }
                  />
                  <span className="mt-2 text-sm  text-slate-700 dark:text-slate-300">
                    {selectedFile ? selectedFile.name : "Click to select PDF"}
                  </span>
                  <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Max size: 5MB (PDF only)
                  </span>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-8 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-6 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors "
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadAndApprove}
                  disabled={uploading || !selectedFile}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded transition-colors "
                >
                  {uploading ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={15} />
                      Approve & Upload
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationsPage;
