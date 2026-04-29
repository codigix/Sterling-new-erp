import React, { useState, useEffect } from "react";
import { Package, Eye, FileText, Calendar, User, ShoppingCart, CheckCircle, Clock } from "lucide-react";
import FormSection from "../shared/FormSection";
import { useRootCardContext } from "../hooks";
import axios from "../../../../utils/api";
import DataTable from "../../../ui/DataTable/DataTable";
import Badge from "../../../ui/Badge";

const GRNDetailTable = ({ grnId }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const response = await axios.get(`/grn/${grnId}`);
        setDetails(response.data);
      } catch (error) {
        console.error("Error fetching GRN details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [grnId]);

  if (loading) return <div className="p-4 text-center text-xs text-slate-500">Loading items...</div>;
  if (!details) return <div className="p-4 text-center text-xs text-red-500">Failed to load details.</div>;

  return (
    <div className="p-4 bg-slate-50 border-t border-slate-100">
      <h4 className="text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider flex items-center gap-2">
        <FileText size={14} />
        GRN Items
      </h4>
      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-2 text-[10px] text-slate-400 uppercase">Material Name</th>
              <th className="p-2 text-[10px] text-slate-400 uppercase text-center">Ordered</th>
              <th className="p-2 text-[10px] text-slate-400 uppercase text-center">Received</th>
              <th className="p-2 text-[10px] text-slate-400 uppercase">Unit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {details.items?.map((item, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50">
                <td className="p-2">
                  <p className="text-xs font-medium text-slate-700">{item.material_name}</p>
                  <p className="text-[10px] text-slate-400">{item.item_code}</p>
                </td>
                <td className="p-2 text-center text-xs text-slate-500">{item.ordered_qty}</td>
                <td className="p-2 text-center text-xs font-semibold text-blue-600">{item.received_qty}</td>
                <td className="p-2 text-xs text-slate-500">{item.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default function Step5_Inventory({ readOnly = false }) {
  const { state, initialData } = useRootCardContext();
  const rootCardId = initialData?.id || state.createdOrderId;
  const [grns, setGrns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedGrn, setExpandedGrn] = useState(null);

  useEffect(() => {
    if (rootCardId) {
      fetchGRNs();
    }
  }, [rootCardId]);

  const fetchGRNs = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/grn?root_card_id=${rootCardId}`);
      setGrns(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching GRNs:", error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: "grn_number",
      label: "GRN Number",
      render: (val) => (
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded">
            <FileText size={14} />
          </div>
          <span className="font-medium text-slate-900">{val}</span>
        </div>
      ),
    },
    {
      key: "po_number",
      label: "PO Reference",
      render: (val) => (
        <div className="flex items-center gap-2 text-slate-600">
          <ShoppingCart size={13} className="text-slate-400" />
          <span>{val || "N/A"}</span>
        </div>
      ),
    },
    {
      key: "posting_date",
      label: "Received Date",
      render: (val) => (
        <div className="flex items-center gap-2 text-slate-600">
          <Calendar size={13} className="text-slate-400" />
          <span>{val ? new Date(val).toLocaleDateString() : "N/A"}</span>
        </div>
      ),
    },
    {
      key: "vendor_name",
      label: "Supplier",
      render: (val) => (
        <div className="flex items-center gap-2 text-slate-600">
          <User size={13} className="text-slate-400" />
          <span className="truncate max-w-[150px]" title={val}>{val || "N/A"}</span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (val) => (
        <Badge 
          variant={
            val === 'approved' || val === 'qc_completed' ? 'success' : 
            val === 'pending' ? 'warning' : 'info'
          }
          className="capitalize text-[10px]"
        >
          {val?.replace('_', ' ') || 'Pending'}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) => (
        <button
          onClick={() => setExpandedGrn(expandedGrn === row.id ? null : row.id)}
          className={`p-1.5 rounded-md transition-colors ${
            expandedGrn === row.id ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-400'
          }`}
          title="View Items"
        >
          <Eye size={15} />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <FormSection
        title="Inventory Tracking"
        subtitle="Goods Receipt Notes (GRN) for this project"
        icon={Package}
      >
        <div className="bg-white border border-slate-200 rounded overflow-hidden">
          <DataTable
            columns={columns}
            data={grns}
            loading={loading}
            emptyMessage={rootCardId ? "No GRNs found for this project." : "Please save the route card first to track inventory."}
            renderRowDetails={(row) => expandedGrn === row.id && <GRNDetailTable grnId={row.id} />}
          />
        </div>
      </FormSection>

      {!rootCardId && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded flex items-start gap-3">
          <Clock className="text-amber-600 mt-0.5" size={18} />
          <div>
            <p className="text-amber-800 text-sm font-medium">Route Card Not Saved</p>
            <p className="text-amber-700 text-xs">GRNs can only be tracked once the route card is initially saved and has an ID.</p>
          </div>
        </div>
      )}
    </div>
  );
}
