import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { 
  useParams, 
  useNavigate 
} from "react-router-dom";
import { 
  ChevronLeft, 
  Printer, 
  Download, 
  Edit2, 
  FileText, 
  Layers, 
  PackageCheck, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Boxes,
  Hammer,
  Trash2,
  CheckCircle2,
  Send
} from "lucide-react";
import axios from "../../../utils/api";
import Badge from "../../../components/ui/Badge";
import Card, { CardContent, CardHeader } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import DataTable from "../../../components/ui/DataTable/DataTable";
import { useReactToPrint } from "react-to-print";
import MaterialRequestModal from "./MaterialRequestModal";

const BOMDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bom, setBom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const printRef = useRef();

  const fetchBOMDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/engineering/bom/comprehensive/${id}`);
      setBom(response.data.bom || response.data);
    } catch (err) {
      console.error("Failed to fetch BOM details:", err);
      setError("Failed to load BOM details. It might have been deleted.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBOMDetails();
  }, [fetchBOMDetails]);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });

  const handleExportPDF = () => {
    if (!bom) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text("Bill of Materials", pageWidth / 2, 15, { align: "center" });

    doc.setFontSize(10);
    doc.text(`BOM ID: ${bom.bomNumber}`, 14, 25);
    doc.text(`Product: ${bom.productName}`, 14, 30);
    doc.text(`Revision: ${bom.revision}`, 14, 35);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 14, 25, { align: "right" });

    let currentY = 45;

    // Costs Summary
    doc.setFontSize(12);
    doc.text("Cost Summary", 14, currentY);
    currentY += 5;

    doc.autoTable({
      startY: currentY,
      head: [['Category', 'Cost']],
      body: [
        ['Operation Cost', `INR ${bom.costs.operationCost.toLocaleString()}`],
        ['Total BOM Cost', `INR ${bom.costs.totalBOMCost.toLocaleString()}`]
      ],
      theme: 'grid',
      headStyles: { fillGray: true }
    });

    currentY = doc.lastAutoTable.finalY + 10;

    // Materials Table
    if (bom.materials?.length > 0) {
      doc.setFontSize(12);
      doc.text("Materials Breakdown", 14, currentY);
      currentY += 5;
      
      doc.autoTable({
        startY: currentY,
        head: [['Item Name', 'Group', 'Grade/Detail', 'Remark/Make', 'Qty', 'Unit']],
        body: bom.materials.map(m => [
          m.itemName,
          m.itemGroup || "N/A",
          `${m.materialGrade || "-"}\n${m.partDetail || "-"}`,
          `${m.remark || "-"}\n${m.make || "-"}`,
          m.quantity,
          m.uom
        ]),
        theme: 'striped',
        styles: { fontSize: 8 }
      });
      currentY = doc.lastAutoTable.finalY + 10;
    }

    // Components Table
    if (bom.components?.length > 0) {
      if (currentY > 250) { doc.addPage(); currentY = 15; }
      doc.setFontSize(12);
      doc.text("Components / Sub-Assemblies", 14, currentY);
      currentY += 5;
      
      doc.autoTable({
        startY: currentY,
        head: [['Component Code', 'Qty', 'Unit', 'Rate', 'Loss %', 'Total']],
        body: bom.components.map(c => [
          c.componentCode,
          c.quantity,
          c.uom,
          c.rate,
          `${c.lossPercent}%`,
          (c.quantity * c.rate).toFixed(2)
        ]),
        theme: 'striped'
      });
      currentY = doc.lastAutoTable.finalY + 10;
    }

    // Operations Table
    if (bom.operations?.length > 0) {
      if (currentY > 250) { doc.addPage(); currentY = 15; }
      doc.setFontSize(12);
      doc.text("Operations Breakdown", 14, currentY);
      currentY += 5;
      
      doc.autoTable({
        startY: currentY,
        head: [['Operation', 'Workstation', 'Cycle (min)', 'Setup (min)', 'Hourly Rate', 'Cost']],
        body: bom.operations.map(o => [
          o.operationName,
          o.workstation,
          o.cycleTime,
          o.setupTime,
          o.hourlyRate,
          o.cost
        ]),
        theme: 'striped'
      });
    }

    doc.save(`BOM_${bom.itemCode}_Rev${bom.revision}.pdf`);
  };

  const stats = useMemo(() => {
    if (!bom || !bom.costs) return [];
    return [
      { label: "Operation Cost", value: `₹${bom.costs.operationCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: Hammer, color: "amber" },
      { label: "Total BOM Cost", value: `₹${bom.costs.totalBOMCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: "purple" },
    ];
  }, [bom]);

  const materialColumns = [
    { key: "itemName", label: "Item Name", className: "" },
    { key: "itemGroup", label: "Group", render: (val) => <Badge variant="gray">{val || "NO-GROUP"}</Badge> },
    { key: "partDetail", label: "Part Details / Grade", render: (val, row) => (
      <div className="flex flex-col">
        <span className="text-xs">{val || "-"}</span>
        <span className="text-xs text-slate-500 ">{row.materialGrade || "-"}</span>
      </div>
    )},
    { key: "warehouse", label: "WH / Operations", render: (val, row) => (
      <div className="flex flex-col">
        <span className="text-xs text-blue-600 ">{val || "-"}</span>
        <span className="text-xs text-amber-600  italic">{row.operation || "-"}</span>
      </div>
    )},
    { key: "remark", label: "Remark / Make", render: (val, row) => (
      <div className="flex flex-col">
        <span className="text-xs text-slate-500 italic">{val || "-"}</span>
        <span className="text-xs">{row.make || "-"}</span>
      </div>
    )},
    { key: "quantity", label: "Oty", render: (val, row) => `${val} ${row.uom}` },
  ];

  const componentColumns = [
    { key: "componentCode", label: "Componant Code", className: "" },
    { key: "quantity", label: "Qty", render: (val, row) => `${val} ${row.uom}` },
    { key: "rate", label: "Rate", render: (val) => `₹${parseFloat(val).toLocaleString()}` },
    { key: "lossPercent", label: "Loss %", render: (val) => `${val}%` },
    { key: "total", label: "Total", render: (_, row) => `₹${(row.quantity * row.rate).toLocaleString()}` },
  ];

  const operationColumns = [
    { key: "operationName", label: "Operations", className: "" },
    { key: "type", label: "EXECUTION", render: (val) => (
      <Badge variant={val === 'outsource' ? 'warning' : 'info'} className="capitalize">
        {val || 'in-house'}
      </Badge>
    )},
    { key: "workstation", label: "Worktations / Vendor", render: (val, row) => (
      <div className="flex flex-col">
        <span className="text-xs  text-slate-700">{row.type === 'outsource' ? (row.vendorName || '-') : (val || '-')}</span>
        {row.type === 'outsource' && row.subcontractWarehouse && (
          <span className="text-xs text-slate-500 italic">Wh: {row.subcontractWarehouse}</span>
        )}
      </div>
    )},
    { key: "targetWarehouse", label: "Target WH", render: (val) => val || '-' },
    { key: "cycleTime", label: "Time (Min)", render: (val, row) => (
      <div className="flex flex-col text-xs">
        <span>Cycle: {val}m</span>
        <span>Setup: {row.setupTime}m</span>
      </div>
    )},
    { key: "hourlyRate", label: "Rate", render: (val, row) => (
      <div className="flex flex-col text-right">
        <span className="text-xs">₹{parseFloat(row.type === 'outsource' ? row.vendorRatePerUnit : val).toLocaleString()}</span>
        <span className="text-xs text-slate-400">{row.type === 'outsource' ? '/ Unit' : '/ Hr'}</span>
      </div>
    )},
    { key: "cost", label: "Total Cost", render: (val) => (
      <span className=" text-slate-900">₹{parseFloat(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
    )},
  ];

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded  h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !bom) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded flex items-center gap-3">
          <AlertCircle size={20} />
          <p>{error || "BOM not found"}</p>
        </div>
        <Button 
          variant="secondary" 
          className="mt-4" 
          icon={ChevronLeft}
          onClick={() => navigate("/department/production/bom/view")}
        >
          Back to BOMs
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-2 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate("/department/production/bom/view")}
            className="p-2 hover:bg-white rounded  transition-colors border border-transparent hover:border-slate-200"
          >
            <ChevronLeft size={15} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl  text-slate-900">{bom.productName} <span className="text-slate-500 font-normal">({bom.productCode})</span></h2>
              <Badge 
                variant={bom.status === 'active' ? 'success' : bom.status === 'approved' ? 'primary' : 'warning'}
                className="capitalize px-3 py-1 text-xs"
              >
                {bom.status}
              </Badge>
            </div>
            <p className="text-slate-500 text-xs ">
              BOM ID: <span className="text-slate-900 text-xs">{bom.bomNumber}</span> • Revision: {bom.revision}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={Printer} onClick={handlePrint}>Print</Button>
          <Button variant="secondary" icon={Download} onClick={handleExportPDF}>Export PDF</Button>
          <Button 
            variant="info" 
            icon={Send} 
            onClick={() => setIsRequestModalOpen(true)}
          >
            Send Material Request
          </Button>
          <Button 
            variant="primary" 
            icon={Edit2}
            onClick={() => navigate(`/department/production/bom/create?bomId=${bom.id}`)}
          >
            Edit BOM
          </Button>
        </div>
      </div>

      <MaterialRequestModal 
        isOpen={isRequestModalOpen} 
        onClose={() => setIsRequestModalOpen(false)} 
        bom={bom} 
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 my-5 gap-2">
        {stats.map((stat, idx) => (
          <Card key={idx} className="border-none  overflow-hidden relative">
            <CardContent className="p-2 flex items-center gap-4">
              <div className={`p-3 rounded bg-${stat.color}-50 text-${stat.color}-600`}>
                <stat.icon size={15} />
              </div>
              <div>
                <p className="text-xs  text-slate-500">{stat.label}</p>
                <p className="text-xl  text-slate-900">{stat.value}</p>
              </div>
            </CardContent>
            <div className={`absolute top-0 left-0 w-1 h-full bg-${stat.color}-500`} />
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: BOM Info & Summary */}
        <div className="lg:col-span-1 space-y-2">
          <Card className="border-none">
            <CardHeader className="border-b border-slate-100 bg-white p-2">
              <h3 className=" text-slate-900 flex items-center gap-2 text-sm">
                <FileText size={15} className="text-blue-600" />
                General Information
              </h3>
            </CardHeader>
            <CardContent className="p-2 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs   text-slate-400 mb-1">Item Group</p>
                  <p className="text-sm  text-slate-700">{bom.itemGroup || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs   text-slate-400 mb-1">Quantity</p>
                  <p className="text-sm  text-slate-700">{bom.quantity} {bom.uom}</p>
                </div>
                <div>
                  <p className="text-xs   text-slate-400 mb-1">Created By</p>
                  <p className="text-sm  text-slate-700">{bom.createdByName || 'System'}</p>
                </div>
                <div>
                  <p className="text-xs   text-slate-400 mb-1">Date</p>
                  <p className="text-sm  text-slate-700">{new Date(bom.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div>
                <p className="text-xs   text-slate-400 mb-1">Description</p>
                <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 italic">
                  {bom.description || "No description provided."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none ">
            <CardHeader className="border-b border-slate-100 bg-white p-2">
              <h3 className=" text-slate-900 flex items-center gap-2 text-sm">
                <CheckCircle2 size={15} className="text-green-600" />
                BOM Status
              </h3>
            </CardHeader>
            <CardContent className="p-2">
              <div className="flex items-center gap-2 mb-2">
                <div className={`h-10 w-10 rounded flex items-center justify-center ${
                  bom.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                }`}>
                  {bom.status === 'active' ? <CheckCircle2 size={15} /> : <Clock size={15} />}
                </div>
                <div>
                  <p className="text-sm  text-slate-900 capitalize">{bom.status} Status</p>
                  <p className="text-xs text-slate-500">
                    {bom.status === 'active' ? 'This BOM is currently active and can be used in production.' : 'This BOM is in draft mode and needs approval.'}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Is Active</span>
                  <Badge variant={bom.isActive ? "success" : "gray"}>{bom.isActive ? "Yes" : "No"}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Tables */}
        <div className="lg:col-span-2 space-y-2">
          {/* Materials Table */}
          <Card className="border-none ">
            <CardHeader className="border-b border-slate-100 bg-white flex justify-between items-center">
              <h3 className=" text-slate-900 flex items-center gap-2 text-sm">
                <Boxes size={15} className="text-blue-600" />
                Raw Materials
              </h3>
              <Badge variant="primary" className="text-xs">{bom.materials?.length || 0} Items</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable 
                columns={materialColumns}
                data={bom.materials || []}
                emptyMessage="No raw materials added to this BOM."
              />
            </CardContent>
          </Card>

          {/* Operations Table */}
          <Card className="border-none ">
            <CardHeader className="border-b border-slate-100 bg-white  flex justify-between items-center">
              <h3 className=" text-slate-900 flex items-center gap-2 text-sm">
                <Hammer size={15} className="text-amber-600" />
                Manufacturing Operations
              </h3>
              <Badge variant="primary" className="text-xs">{bom.operations?.length || 0} Operations</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable 
                columns={operationColumns}
                data={bom.operations || []}
                emptyMessage="No operations added to this BOM."
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Hidden Print Content */}
      <div className="hidden">
        <div ref={printRef} className="p-10 text-slate-900">
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
            <div>
              <h1 className="text-3xl   er">Bill of Materials</h1>
              <p className="text-sm  mt-1">Sterling ERP Solutions</p>
            </div>
            <div className="text-right">
              <p className="text-sm ">BOM NO: {bom.bomNumber}</p>
              <p className="text-sm">REVISION: {bom.revision}</p>
              <p className="text-sm">DATE: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h4 className="text-xs   text-slate-500 mb-2">Product Information</h4>
              <p className="text-lg ">{bom.productName} ({bom.productCode})</p>
              <p className="text-sm">Group: {bom.itemGroup}</p>
              <p className="text-sm">Quantity: {bom.quantity} {bom.uom}</p>
            </div>
            <div>
              <h4 className="text-xs   text-slate-500 mb-2">Cost Summary</h4>
              <p className="text-lg  mt-2">Total BOM Cost: ₹{bom.costs?.totalBOMCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="space-y-8">
            <section>
              <h4 className="text-sm   border-b border-slate-300 pb-1 mb-3">Raw Materials</h4>
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-2">Item</th>
                    <th className="py-2 text-right">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {bom.materials?.map((m, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-2">
                        <div className="flex flex-col">
                          <span>{m.itemName}</span>
                          <span className="text-xs text-slate-500">{m.itemGroup}</span>
                        </div>
                      </td>
                      <td className="py-2 text-right">{m.quantity} {m.uom}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section>
              <h4 className="text-sm   border-b border-slate-300 pb-1 mb-3">Operations</h4>
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-2">Operation</th>
                    <th className="py-2">Workstation / Vendor</th>
                    <th className="py-2 text-right">Cycle Time</th>
                    <th className="py-2 text-right">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {bom.operations?.map((o, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-2">{o.operationName}</td>
                      <td className="py-2">{o.type === 'outsource' ? o.vendorName : o.workstation}</td>
                      <td className="py-2 text-right">{o.cycleTime}m</td>
                      <td className="py-2 text-right">₹{parseFloat(o.cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>

          <div className="mt-20 flex justify-between">
            <div className="text-center w-48">
              <div className="border-b border-slate-900 mb-2"></div>
              <p className="text-xs ">PREPARED BY</p>
            </div>
            <div className="text-center w-48">
              <div className="border-b border-slate-900 mb-2"></div>
              <p className="text-xs ">APPROVED BY</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BOMDetailsPage;
