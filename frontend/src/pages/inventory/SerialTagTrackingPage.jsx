import React, { useState, useEffect, useMemo } from "react";
import {
  Package,
  Search,
  Filter,
  Download,
  Barcode,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Calendar,
  FileText,
  Truck,
  ArrowUpDown
} from "lucide-react";
import axios from "../../utils/api";
import toastUtils from "../../utils/toastUtils";
import DataTable from "../../components/ui/DataTable/DataTable";

const SerialTagTrackingPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serials, setSerials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSerials();
  }, []);

  const fetchSerials = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/department/inventory/purchase-orders/receipts/serials");
      setSerials(response.data || []);
    } catch (error) {
      console.error("Error fetching serials:", error);
      toastUtils.error("Failed to load Serial Tags");
    } finally {
      setLoading(false);
    }
  };

  const filteredData = serials.filter(
    (item) =>
      (item.serial_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       item.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       item.po_number?.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (statusFilter === "all" || item.status?.toLowerCase() === statusFilter.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "available":
        return "bg-emerald-50 text-emerald-600 border-emerald-100";
      case "issued":
        return "bg-blue-50 text-blue-600 border-blue-100";
      case "consumed":
        return "bg-slate-50 text-slate-500 border-slate-100";
      default:
        return "bg-amber-50 text-amber-600 border-amber-100";
    }
  };

  const stats = [
    { title: "Total Serial Tags", value: serials.length, icon: Barcode, color: "blue" },
    { title: "Available Stock", value: serials.filter(s => s.status === 'Available').length, icon: CheckCircle, color: "emerald" },
    { title: "In Consumption", value: serials.filter(s => s.status === 'Consumed').length, icon: Truck, color: "amber" },
    { title: "Recent Tags (24h)", value: serials.filter(s => new Date(s.created_at) > new Date(Date.now() - 86400000)).length, icon: Clock, color: "indigo" },
  ];

  const columns = useMemo(() => [
    {
      key: "serial_number",
      label: "ST Number",
      sortable: true,
      render: (val) => (
        <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">
          {val}
        </span>
      )
    },
    {
      key: "item_name",
      label: "Material Name",
      sortable: true,
      render: (val, item) => (
        <div>
          <p className="text-xs font-medium text-slate-900 dark:text-white">{val}</p>
          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-mono mt-0.5">
            {item.length || item.width || item.thickness || item.diameter || item.outer_diameter || item.height ? (
              <>
                {item.length ? `L:${Number(item.length)} ` : ''}
                {item.width ? `W:${Number(item.width)} ` : ''}
                {item.thickness ? `T:${Number(item.thickness)} ` : ''}
                {item.diameter ? `D:${Number(item.diameter)} ` : ''}
                {item.outer_diameter ? `OD:${Number(item.outer_diameter)} ` : ''}
                {item.height ? `H:${Number(item.height)} ` : ''}
              </>
            ) : null}
          </div>
          <p className="text-[9px] text-slate-400 uppercase tracking-tighter">ID: {item.id}</p>
        </div>
      )
    },
    {
      key: "po_number",
      label: "Source Document",
      sortable: true,
      render: (val, item) => (
        <div className="flex flex-col">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
            <FileText size={12} className="text-slate-400" /> {val || 'Internal Transfer'}
          </span>
          <span className="text-[10px] text-slate-400">
            Receipt: {item.receipt_number || 'Direct Entry'}
          </span>
        </div>
      )
    },
    {
      key: "receipt_date",
      label: "Receipt Date",
      sortable: true,
      align: "center",
      render: (val, item) => {
        const date = new Date(val || item.created_at);
        return (
          <div className="flex flex-col items-center">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{date.toLocaleDateString()}</span>
            <span className="text-[10px] text-slate-400">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        );
      }
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      align: "center",
      render: (val) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(val)}`}>
          {val}
        </span>
      )
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: () => (
        <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-blue-600">
          <FileText size={15} />
        </button>
      )
    }
  ], []);

  return (
    <div className="space-y-4 p-4">
      <DataTable
        title="Serial Tag Tracking"
        titleIcon={<Barcode size={15} />}
        titleExtra={
          <div className="flex items-center gap-2 ml-4">
            <button 
              onClick={fetchSerials}
              className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-500 hover:bg-slate-50 transition-all"
            >
              <Clock size={14} />
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-all shadow-sm">
              <Download size={14} /> Export List
            </button>
          </div>
        }
        filters={[
          {
            key: "status",
            label: "Status",
            options: [
              { label: "Available", value: "Available" },
              { label: "Issued", value: "Issued" },
              { label: "Consumed", value: "Consumed" },
            ]
          }
        ]}
        columns={columns}
        data={serials}
        loading={loading}
        emptyMessage="No serial tags found matching your search."
      />
    </div>
  );
};

export default SerialTagTrackingPage;
