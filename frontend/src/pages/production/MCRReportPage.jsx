import React, { useState, useEffect } from "react";
import axios from "../../utils/api";
import { toast } from "react-toastify";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  FileText,
  Loader2,
  Calendar,
  Eye,
  Download,
  FileDown,
  Scissors,
  Activity
} from "lucide-react";
import DataTable from "../../components/ui/DataTable/DataTable";
import { Modal, ModalBody } from "../../components/ui/Modal";

const MCRReportPage = () => {
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState([]);
  const [detailData, setDetailData] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [stats, setStats] = useState({
    totalWeight: 0,
    totalScrap: 0,
    avgScrap: 0,
    totalQty: 0
  });

  const formatMCRDimensions = (row) => {
    const group = (row.item_group || "").toUpperCase();
    const formatDim = (val) => (val !== undefined && val !== null && val !== "" && !isNaN(val)) ? parseFloat(val).toString() : "0";
    
    const d = {
      l: row.raw_l || 0,
      w: row.raw_w || 0,
      t: row.raw_t || 0,
      h: row.raw_height || 0,
      d: row.raw_diameter || 0,
      od: row.raw_outer_diameter || 0,
      tw: row.raw_web_thickness || 0,
      tf: row.raw_flange_thickness || 0,
      side1: row.raw_side1 || 0,
      side2: row.raw_side2 || 0,
    };

    if (group.includes("ROUND") && !group.includes("PIPE") && !group.includes("TUBE")) {
      return `Ø${formatDim(d.w || d.d)} x ${formatDim(d.l)}`;
    } else if (group.includes("BAR") && group.includes("SQUARE")) {
      const s1 = d.w || d.side1;
      const s2 = d.side2 || d.t || s1;
      return `${formatDim(s1)}x${formatDim(s2)} x ${formatDim(d.l)}`;
    } else if (group.includes("BAR") && !group.includes("ROUND") && !group.includes("PLATE")) {
      return `${formatDim(d.w)}x${formatDim(d.h || d.t)} x ${formatDim(d.l)}`;
    } else if (group.includes("PIPE") || group.includes("TUBE")) {
      if (group.includes("SQUARE") || group.includes("RECT")) {
        return `${formatDim(d.w)}x${formatDim(d.h || d.t)}x${formatDim(d.t)} x ${formatDim(d.l)}`;
      } else {
        return `Ø${formatDim(d.od || d.w || d.d)}x${formatDim(d.t)} x ${formatDim(d.l)}`;
      }
    } else if (group.includes("BEAM") || group.includes("CHANNEL")) {
      return `${formatDim(d.h)}x${formatDim(d.w)}x${formatDim(d.tw)}x${formatDim(d.tf)} x ${formatDim(d.l)}`;
    } else if (group.includes("ANGLE")) {
      return `${formatDim(d.side1 || d.w)}x${formatDim(d.side2 || d.h)}x${formatDim(d.t)} x ${formatDim(d.l)}`;
    } else {
      return `${formatDim(d.l)}x${formatDim(d.w)}x${formatDim(d.t)}`;
    }
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/production/mcr/summary");
      if (response.data.success) {
        setSummaryData(response.data.summary);
      }
    } catch (error) {
      console.error("Error fetching summary:", error);
      toast.error("Failed to load MCR projects");
    } finally {
      setLoading(false);
    }
  };

  const openMCRDetail = async (project) => {
    setActiveProject(project);
    setIsModalOpen(true);
    setModalLoading(true);
    try {
      const response = await axios.get(`/production/mcr/combined?root_card_id=${project.root_card_id}`);
      if (response.data.success) {
        const data = response.data.report;
        setDetailData(data);
        
        const totalW = data.reduce((acc, curr) => acc + (parseFloat(curr.weight_consumed) || 0), 0);
        const totalS = data.reduce((acc, curr) => acc + (parseFloat(curr.scrap_weight) || 0), 0);
        const totalQ = data.reduce((acc, curr) => acc + (parseInt(curr.produced_qty) || 0), 0);
        
        setStats({
          totalWeight: totalW.toFixed(3),
          totalScrap: totalS.toFixed(3),
          avgScrap: totalW > 0 ? ((totalS / totalW) * 100).toFixed(1) : "0.0",
          totalQty: totalQ
        });
      }
    } catch (error) {
      console.error("Error fetching detail:", error);
      toast.error("Failed to load MCR details");
    } finally {
      setModalLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const formatForExcel = (data) => {
    return data.map(row => {
      const consumed = parseFloat(row.weight_consumed || 0);
      const scrap = parseFloat(row.scrap_weight || 0);
      const scrapPercent = consumed > 0 ? ((scrap / consumed) * 100).toFixed(1) : "0.0";
      
      const date = row.work_date ? new Date(row.work_date) : null;
      const dateStr = date && !isNaN(date.getTime()) ? date.toLocaleDateString('en-IN') : '-';

      const dimsStr = formatMCRDimensions(row);

      return {
        "Date": dateStr,
        "Item Name": row.item_name,
        "Item Code": row.item_code,
        "ST Code": row.serial_number || '-',
        "Item Group": row.item_group || '-',
        "Material Grade": row.material_grade || '-',
        "Cutting Dims (mm)": dimsStr,
        "Weight (KG)": consumed.toFixed(3),
        "Produced Qty": `${row.produced_qty || 0} NOS`,
        "Scrap (KG)": scrap.toFixed(3),
        "Scrap (%)": `${scrapPercent}%`
      };
    });
  };

  const exportToExcel = () => {
    const fileName = `MCR_Report_${activeProject?.project_name}`;
    const formattedData = formatForExcel(detailData);
    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MCR Report");
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // Header - Centered as requested
    doc.setFontSize(20);
    doc.setTextColor(0);
    doc.setFont(undefined, 'bold');
    doc.text("Material cutting report (MCR)", 148, 20, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(50);
    doc.text(`Project Name: ${activeProject?.project_name}`, 14, 32);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(80);
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 14, 38);

    const headers = [["Date", "Item Name", "ST Code", "Group", "Grade", "Cutting Dims (mm)", "Produced", "Weight (KG)", "Scrap (KG)"]];
    const data = detailData.map(row => {
      const date = row.work_date ? new Date(row.work_date) : null;
      const dateStr = date && !isNaN(date.getTime()) ? date.toLocaleDateString('en-IN') : '-';
      
      const dimsStr = formatMCRDimensions(row);

      return [
        dateStr,
        row.item_name,
        row.serial_number || '-',
        row.item_group || '-',
        row.material_grade || '-',
        dimsStr,
        `${row.produced_qty || 0} NOS`,
        parseFloat(row.weight_consumed || 0).toFixed(3),
        parseFloat(row.scrap_weight || 0).toFixed(3)
      ];
    });

    doc.autoTable({
      head: headers,
      body: data,
      startY: 45,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229], fontSize: 9, halign: 'center' },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 'auto' },
        6: { halign: 'center' },
        7: { halign: 'right' },
        8: { halign: 'right' }
      }
    });

    doc.save(`MCR_Report_${activeProject?.project_name}.pdf`);
  };

  const projectFilters = React.useMemo(() => {
    return [
      {
        column: "root_card_id",
        label: "Project",
        options: summaryData.map(p => ({
          label: p.project_name,
          value: p.root_card_id
        }))
      }
    ];
  }, [summaryData]);

  const handleDirectExport = async (project, format) => {
    try {
      const response = await axios.get(`/production/mcr/combined?root_card_id=${project.root_card_id}`);
      if (response.data.success) {
        const data = response.data.report;
        if (format === 'excel') {
          const fileName = `MCR_Report_${project.project_name}`;
          const formattedData = formatForExcel(data);
          const ws = XLSX.utils.json_to_sheet(formattedData);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "MCR Report");
          XLSX.writeFile(wb, `${fileName}.xlsx`);
        } else {
          const doc = new jsPDF('l', 'mm', 'a4');
          
          // Header - Centered as requested
          doc.setFontSize(20);
          doc.setTextColor(0);
          doc.setFont(undefined, 'bold');
          doc.text("Material cutting report (MCR)", 148, 20, { align: 'center' });
          
          doc.setFontSize(11);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(50);
          doc.text(`Project Name: ${project.project_name}`, 14, 32);
          
          doc.setFontSize(10);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(80);
          doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 14, 38);

          const headers = [["Date", "Item Name", "ST Code", "Group", "Grade", "Cutting Dims (mm)", "Produced", "Weight (KG)", "Scrap (KG)"]];
          const exportData = data.map(row => {
            const date = row.work_date ? new Date(row.work_date) : null;
            const dateStr = date && !isNaN(date.getTime()) ? date.toLocaleDateString('en-IN') : '-';
            
            const dimsStr = formatMCRDimensions(row);

            return [
              dateStr,
              row.item_name,
              row.serial_number || '-',
              row.item_group || '-',
              row.material_grade || '-',
              dimsStr,
              `${row.produced_qty || 0} NOS`,
              parseFloat(row.weight_consumed || 0).toFixed(3),
              parseFloat(row.scrap_weight || 0).toFixed(3)
            ];
          });

          doc.autoTable({
            head: headers,
            body: exportData,
            startY: 45,
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229], fontSize: 9, halign: 'center' },
            styles: { fontSize: 8 },
            columnStyles: {
              0: { cellWidth: 20 },
              1: { cellWidth: 'auto' },
              6: { halign: 'center' },
              7: { halign: 'right' },
              8: { halign: 'right' }
            }
          });

          doc.save(`MCR_Report_${project.project_name}.pdf`);
        }
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export report");
    }
  };

  const summaryColumns = [
    {
      header: "Project Name",
      key: "project_name",
      render: (val, row) => (
        <div className="flex flex-col py-1">
          <span className="font-bold text-slate-900 text-base">{val || "Unnamed Project"}</span>
          <span className="text-[11px] text-indigo-500 font-bold tracking-tight uppercase mt-0.5">{row.root_card_id}</span>
        </div>
      )
    },
    {
      header: "Actions",
      key: "actions",
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openMCRDetail(row)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all text-xs font-bold shadow-sm"
          >
            <Eye size={16} />
            View MCR Report
          </button>
          
          <button
            onClick={() => handleDirectExport(row, 'excel')}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-xs font-bold shadow-sm"
            title="Export to Excel"
          >
            <Download size={16} />
            Excel
          </button>

          <button
            onClick={() => handleDirectExport(row, 'pdf')}
            className="flex items-center gap-2 px-3 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-all text-xs font-bold shadow-sm"
            title="Export to PDF"
          >
            <FileDown size={16} />
            PDF
          </button>
        </div>
      )
    }
  ];

  const detailColumns = [
    {
      header: "Date",
      key: "work_date",
      render: (val) => {
        if (!val) return '-';
        const date = new Date(val);
        return isNaN(date.getTime()) ? '-' : (
          <span className="text-[10px] font-medium text-slate-500">
            {date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </span>
        );
      }
    },
    {
      header: "Item Details",
      key: "item_name",
      render: (val, row) => (
        <div>
          <p className="text-[11px] font-bold text-slate-900 leading-tight">{val}</p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{row.item_code}</p>
        </div>
      )
    },
    {
      header: "ST Code",
      key: "serial_number",
      render: (val) => (
        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold border border-indigo-100">
          {val || '-'}
        </span>
      )
    },
    {
      header: "Item Group",
      key: "item_group",
      render: (val) => <span className="text-[10px] font-bold text-slate-500 uppercase">{val || '-'}</span>
    },
    {
      header: "Material Grade",
      key: "material_grade",
      render: (val) => <span className="text-[10px] font-bold text-slate-500 uppercase">{val || '-'}</span>
    },
    {
      header: "Cutting Dims (mm)",
      render: (val, row) => {
        const display = formatMCRDimensions(row);

        return (
          <span className="text-[11px] font-bold text-slate-700">
            {display}
          </span>
        );
      }
    },
    {
      header: "Weight (KG)",
      key: "weight_consumed",
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-400">Unit: {parseFloat(row.unit_weight_consumed || 0).toFixed(3)}</span>
          <span className="text-[11px] font-bold text-blue-700">{parseFloat(val || 0).toFixed(3)} KG</span>
        </div>
      )
    },
    {
      header: "Produced Qty",
      key: "produced_qty",
      align: "center",
      render: (val) => <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">{val || 0} NOS</span>
    },
    {
      header: "Scrap (KG)",
      key: "scrap_weight",
      render: (val, row) => {
        const weight = parseFloat(val || 0);
        const consumed = parseFloat(row.weight_consumed || 0);
        const percent = consumed > 0 ? ((weight / consumed) * 100).toFixed(1) : "0.0";
        return (
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-rose-700">{weight.toFixed(3)} KG</span>
            <span className="text-[9px] text-rose-400">({percent}%)</span>
          </div>
        );
      }
    }
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-8 flex items-center gap-4">
        <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-xl shadow-indigo-600/20">
          <FileText size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">MCR Reports</h1>
          <p className="text-slate-500 font-medium">Project-wise combined Material Cutting Reports</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <DataTable
          data={summaryData}
          columns={summaryColumns}
          loading={loading}
          filters={projectFilters}
          searchPlaceholder="Search project by name or ID..."
        />
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={
          <div className="flex items-center gap-4">
            <div className="p-2 bg-indigo-600 text-white rounded-lg">
              <Scissors size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Material Cutting Report (MCR)</h2>
              <p className="text-sm text-slate-500 font-medium">{activeProject?.project_name}</p>
            </div>
          </div>
        }
        size="full"
      >
        <ModalBody>
          {modalLoading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <Loader2 size={48} className="text-indigo-600 animate-spin" />
              <p className="text-slate-500 font-bold animate-pulse text-lg tracking-wide">Processing Report Data...</p>
            </div>
          ) : (
            <div className="space-y-6 p-6">
              {/* Top Stats Bar */}
              <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg border border-rose-100">
                  <Activity size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Total Scrap: {stats.totalScrap} KG</span>
                </div>
                
                <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                  <div className="px-3 py-1">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Weight Consumed</p>
                    <p className="text-sm font-bold text-slate-700">{stats.totalWeight} KG</p>
                  </div>
                  <div className="px-3 py-1">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Average Scrap</p>
                    <p className="text-sm font-bold text-amber-600">{stats.avgScrap}%</p>
                  </div>
                  <div className="px-3 py-1">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Parts Produced</p>
                    <p className="text-sm font-bold text-emerald-600">{stats.totalQty} NOS</p>
                  </div>
                  <div className="px-3 py-1">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Records</p>
                    <p className="text-sm font-bold text-indigo-600">{detailData.length} Items</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={exportToExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-xs font-bold"
                  >
                    <Download size={14} />
                    Excel
                  </button>
                  <button 
                    onClick={exportToPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-all text-xs font-bold"
                  >
                    <FileDown size={14} />
                    PDF
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                  <FileText size={16} className="text-indigo-500" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Reported Items Summary</h3>
                </div>
                <DataTable
                  data={detailData}
                  columns={detailColumns}
                  pagination={true}
                  pageSize={10}
                  showSearch={true}
                  searchPlaceholder="Search items..."
                />
              </div>
            </div>
          )}
        </ModalBody>
      </Modal>
    </div>
  );
};

export default MCRReportPage;