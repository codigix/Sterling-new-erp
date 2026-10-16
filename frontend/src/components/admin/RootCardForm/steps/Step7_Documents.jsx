import React, { useEffect, useMemo, useState } from "react";
import {
  FolderOpen,
  PenTool,
  ShieldCheck,
  ShoppingCart,
  Package,
  Factory,
  ExternalLink,
  Download,
  FileDown,
  Loader2,
  Search,
  RefreshCw,
  File,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
} from "lucide-react";
import FormSection from "../shared/FormSection";
import axios from "../../../../utils/api";
import { getServerUrl, downloadFile } from "../../../../utils/fileUtils";
import { exportChallanToPDF, exportInwardChallanToPDF } from "../../../../utils/challanPdfExport";
import { showError } from "../../../../utils/toastUtils";

const DEPARTMENTS = [
  { key: "design", label: "Design Engineering", icon: PenTool, color: "text-indigo-600" },
  { key: "quality", label: "Quality (QAP / ATP / Tests)", icon: ShieldCheck, color: "text-emerald-600" },
  { key: "procurement", label: "Procurement", icon: ShoppingCart, color: "text-amber-600" },
  { key: "inventory", label: "Inventory", icon: Package, color: "text-sky-600" },
  { key: "production", label: "Production", icon: Factory, color: "text-rose-600" },
];

const statusClass = (status) => {
  const s = String(status || "").toLowerCase();
  if (/(approved|accepted|completed|received|finalized|released|paid)/.test(s)) return "bg-emerald-50 text-emerald-700";
  if (/(rejected|cancel)/.test(s)) return "bg-red-50 text-red-700";
  return "bg-slate-100 text-slate-600";
};

const formatDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const GENERIC_FILE_LABELS = ["File", "Report", "Drawing", "Quotation"];
// CAD files get their own highlighted download buttons on design drawings
const CAD_LABELS = { DWG: "Download DWG", STEP: "Download STEP" };

// e.g. "ashar plate - DWG.dwg"; labels that are already file names are kept as-is
const getDownloadName = (item, file) => {
  const ext = file.path.split(".").pop().toLowerCase();
  if (file.label && file.label.toLowerCase().endsWith(`.${ext}`)) return file.label;
  if (!file.label || GENERIC_FILE_LABELS.includes(file.label)) return item.title;
  return `${item.title} - ${file.label}`;
};

export default function Step7_Documents({ rootCardId }) {
  const [sections, setSections] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeDept, setActiveDept] = useState("all");
  const [search, setSearch] = useState("");
  const [busyKey, setBusyKey] = useState(null);
  // Sections start closed; this holds the keys that are currently collapsed
  const [collapsed, setCollapsed] = useState(() => new Set(DEPARTMENTS.map((d) => d.key)));

  const toggleSection = (key) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const fetchDocuments = React.useCallback(async () => {
    if (!rootCardId) return;
    try {
      setLoading(true);
      const response = await axios.get(`/root-cards/${rootCardId}/documents`);
      setSections(response.data.sections || {});
    } catch (err) {
      console.error("Error loading route card documents:", err);
      showError(err.response?.data?.message || "Failed to load documents");
      setSections({});
    } finally {
      setLoading(false);
    }
  }, [rootCardId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const filteredSections = useMemo(() => {
    const term = search.trim().toLowerCase();
    const result = {};
    DEPARTMENTS.forEach(({ key }) => {
      const items = sections?.[key] || [];
      result[key] = term
        ? items.filter((item) =>
            [item.title, item.subtitle, item.category, item.status]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(term))
          )
        : items;
    });
    return result;
  }, [sections, search]);

  const totalCount = DEPARTMENTS.reduce((sum, { key }) => sum + (sections?.[key]?.length || 0), 0);

  const handleDownload = async (item, file) => {
    const key = `${item.key}-${file.path}`;
    try {
      setBusyKey(key);
      await downloadFile(file.path, getDownloadName(item, file));
    } catch {
      showError("File could not be downloaded. It may have been moved or deleted.");
    } finally {
      setBusyKey(null);
    }
  };

  // Challans are not stored as files; they are generated from their record, same as the Production screens
  const handleGenerate = async (item) => {
    const { type, id } = item.generate;
    try {
      setBusyKey(item.key);
      const isOutward = type === "outward_challan";
      const response = await axios.get(`/production/${isOutward ? "outward" : "inward"}-challans/${id}`);
      if (!response.data.success) throw new Error("Challan not found");
      const exporter = isOutward ? exportChallanToPDF : exportInwardChallanToPDF;
      await exporter(response.data.challan, response.data.items || []);
    } catch (err) {
      console.error("Error generating challan PDF:", err);
      showError("Failed to generate challan PDF");
    } finally {
      setBusyKey(null);
    }
  };

  const visibleDepartments = DEPARTMENTS.filter((d) => activeDept === "all" || d.key === activeDept);
  const allCollapsed = visibleDepartments.every((d) => collapsed.has(d.key));

  const toggleAll = () => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      visibleDepartments.forEach(({ key }) => (allCollapsed ? next.delete(key) : next.add(key)));
      return next;
    });
  };

  return (
    <div className="space-y-2">
      <FormSection
        title="Project Documents"
        subtitle="All documents from every department linked to this route card"
        icon={FolderOpen}
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveDept("all")}
            className={`px-3 py-1.5 rounded text-xs transition-colors ${
              activeDept === "all" ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            All ({totalCount})
          </button>
          {DEPARTMENTS.map(({ key, label, icon }) => {
            const Icon = icon;
            return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveDept(key)}
              className={`px-3 py-1.5 rounded text-xs flex items-center gap-1.5 transition-colors ${
                activeDept === key ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Icon size={13} />
              {label.split(" (")[0]} ({sections?.[key]?.length || 0})
            </button>
            );
          })}

          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search documents..."
                className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:border-purple-400 w-56"
              />
            </div>
            <button
              type="button"
              onClick={toggleAll}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
              title={allCollapsed ? "Expand all sections" : "Collapse all sections"}
            >
              {allCollapsed ? <ChevronsUpDown size={15} /> : <ChevronsDownUp size={15} />}
              {allCollapsed ? "Expand all" : "Collapse all"}
            </button>
            <button
              type="button"
              onClick={fetchDocuments}
              disabled={loading}
              className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </FormSection>

      {loading && !sections ? (
        <div className="flex items-center justify-center py-16 text-slate-500 text-sm gap-2">
          <Loader2 size={18} className="animate-spin" />
          Loading documents...
        </div>
      ) : (
        visibleDepartments.map(({ key, label, icon, color }) => {
          const Icon = icon;
          const items = filteredSections[key] || [];
          const isOpen = !collapsed.has(key);
          return (
            <FormSection key={key}>
              <button
                type="button"
                onClick={() => toggleSection(key)}
                aria-expanded={isOpen}
                className="w-full flex items-center gap-2 text-left text-sm text-slate-900 rounded hover:bg-slate-50 -m-1 p-1"
              >
                <Icon size={15} className={color} />
                {label}
                <span className="text-xs text-slate-400">({items.length})</span>
                <ChevronDown
                  size={16}
                  className={`ml-auto text-slate-400 transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`}
                />
              </button>

              {!isOpen ? null : items.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-3 text-center bg-slate-50 rounded border border-dashed border-slate-200">
                  {search ? "No matching documents." : "No documents available yet."}
                </p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded bg-white">
                  {items.map((item) => (
                    <div key={item.key} className="flex flex-col md:flex-row md:items-center gap-2 p-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-2 bg-purple-50 rounded text-purple-600 shrink-0">
                          <File size={16} />
                        </div>
                        <div className="min-w-0 text-left">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm text-slate-900 truncate">{item.title}</span>
                            <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">{item.category}</span>
                            {item.status && (
                              <span className={`text-xs px-1.5 py-0.5 rounded ${statusClass(item.status)}`}>
                                {item.status}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-x-3">
                            {item.subtitle && <span>{item.subtitle}</span>}
                            {item.date && <span>{formatDate(item.date)}</span>}
                            {item.amount != null && Number(item.amount) > 0 && (
                              <span>₹ {Number(item.amount).toLocaleString("en-IN")}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
                        {item.files?.map((file) => {
                          const fileKey = `${item.key}-${file.path}`;
                          // DWG/STEP can't be previewed in a browser, so they only get a download button
                          if (CAD_LABELS[file.label]) {
                            return (
                              <button
                                key={fileKey}
                                type="button"
                                onClick={() => handleDownload(item, file)}
                                disabled={busyKey === fileKey}
                                className="flex items-center gap-1 text-xs px-2 py-1.5 border border-indigo-200 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100"
                                title={`Download .${file.path.split(".").pop()} file`}
                              >
                                {busyKey === fileKey ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                {CAD_LABELS[file.label]}
                              </button>
                            );
                          }
                          return (
                            <div key={fileKey} className="flex items-center border border-slate-200 rounded">
                              <span className="text-xs text-slate-600 px-2 max-w-[160px] truncate" title={file.label}>
                                {file.label}
                              </span>
                              <a
                                href={getServerUrl(file.path)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border-l border-slate-200"
                                title="View"
                              >
                                <ExternalLink size={14} />
                              </a>
                              <button
                                type="button"
                                onClick={() => handleDownload(item, file)}
                                disabled={busyKey === fileKey}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 border-l border-slate-200"
                                title="Download"
                              >
                                {busyKey === fileKey ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                              </button>
                            </div>
                          );
                        })}

                        {item.generate && (
                          <button
                            type="button"
                            onClick={() => handleGenerate(item)}
                            disabled={busyKey === item.key}
                            className="flex items-center gap-1 text-xs px-2 py-1.5 border border-slate-200 rounded text-slate-600 hover:text-purple-600 hover:bg-purple-50"
                          >
                            {busyKey === item.key ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                            Download PDF
                          </button>
                        )}

                        {!item.generate && (!item.files || item.files.length === 0) && (
                          <span className="text-xs text-slate-400 italic">No file attached</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </FormSection>
          );
        })
      )}
    </div>
  );
}
