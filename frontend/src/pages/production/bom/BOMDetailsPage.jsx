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
  Boxes,
  Hammer,
  Trash2,
  Send
} from "lucide-react";
import axios from "../../../utils/api";
import Badge from "../../../components/ui/Badge";
import Card, { CardContent, CardHeader } from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import DataTable from "../../../components/ui/DataTable/DataTable";
import { useReactToPrint } from "react-to-print";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
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
        head: [['Component Code', 'Qty', 'Unit', 'Loss %']],
        body: bom.components.map(c => [
          c.componentCode,
          c.quantity,
          c.uom,
          `${c.lossPercent}%`,
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
        head: [['Operation', 'Cycle (min)', 'Setup (min)']],
        body: bom.operations.map(o => [
          o.operationName,
          o.cycleTime,
          o.setupTime,
        ]),
        theme: 'striped'
      });
    }

    doc.save(`BOM_${bom.itemCode}_Rev${bom.revision}.pdf`);
  };

  const materialColumns = [
    { key: "itemName", label: "Item Name", className: "" },
    { key: "itemGroup", label: "Group", render: (val) => <Badge variant="gray">{val || "NO-GROUP"}</Badge> },
    { key: "partDetail", label: "Dimensions / Grade", render: (val, row) => {
      const dims = [];
      if (parseFloat(row.length) > 0) dims.push(`L: ${parseFloat(row.length)}`);
      if (parseFloat(row.width) > 0) dims.push(`W: ${parseFloat(row.width)}`);
      if (parseFloat(row.thickness) > 0) dims.push(`T: ${parseFloat(row.thickness)}`);
      if (parseFloat(row.height) > 0) dims.push(`H: ${parseFloat(row.height)}`);
      if (parseFloat(row.diameter) > 0) dims.push(`D: ${parseFloat(row.diameter)}`);
      if (parseFloat(row.outerDiameter) > 0) dims.push(`OD: ${parseFloat(row.outerDiameter)}`);
      if (parseFloat(row.side1) > 0) dims.push(`S1: ${parseFloat(row.side1)}`);
      if (parseFloat(row.side2) > 0) dims.push(`S2: ${parseFloat(row.side2)}`);
      if (parseFloat(row.webThickness) > 0) dims.push(`WT: ${parseFloat(row.webThickness)}`);
      if (parseFloat(row.flangeThickness) > 0) dims.push(`FT: ${parseFloat(row.flangeThickness)}`);
      
      return (
        <div className="flex flex-col">
          {dims.length > 0 && (
            <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-1 rounded border border-blue-100 mb-1 w-fit">
              {dims.join(" x ")}
            </span>
          )}
          <span className="text-xs text-slate-500 ">{row.materialGrade || (val || "-")}</span>
        </div>
      );
    }},
    { key: "unitWeight", label: "Weight (Kg)", render: (val, row) => (
      <div className="flex flex-col">
        <span className="text-xs">Unit: {Number(parseFloat(val || 0).toFixed(3))}</span>
        <span className="text-xs font-medium text-emerald-600">Total: {Number(parseFloat(row.totalWeight || 0).toFixed(3))}</span>
      </div>
    )},
    { key: "remark", label: "Remark / Make", render: (val, row) => (
      <div className="flex flex-col">
        <span className="text-xs text-slate-500 italic">{val || "-"}</span>
        <span className="text-xs">{row.make || "-"}</span>
      </div>
    )},
    { key: "quantity", label: "Qty", render: (val, row) => `${Number(parseFloat(val || 0))} ${row.uom}` },
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
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl  text-slate-900 break-words max-w-2xl">{bom.productName} <span className="text-slate-500 font-normal">({bom.productCode})</span></h2>
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

      <div className="space-y-2">
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
                    <th className="py-2 text-right">Cycle Time</th>
                  </tr>
                </thead>
                <tbody>
                  {bom.operations?.map((o, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-2">{o.operationName}</td>
                      <td className="py-2 text-right">{o.cycleTime}m</td>
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
