import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "../../utils/api";
import { renderDimensions } from "../../utils/dimensionUtils";
import DataTable from "../../components/ui/DataTable/DataTable";
import { Warehouse, Boxes, RefreshCw, Package, Ban, ShieldCheck, Clock } from "lucide-react";

// Read-only view of Inventory's stock balance for the Production department.
// Same source as Inventory > Stock Balance (/inventory/materials?onlyWithStock=true);
// nothing on this page changes stock.
//
// QC-rejected pieces stay in the stock ledger (a GRN adds everything received, release only
// takes out the accepted pieces), so the ledger balance includes material Production cannot use.
// This page shows usable quantity = ledger balance − rejected pieces, and lists rejected separately.

// QC result of one piece (inventory_serials.inspection_status)
const QC_STATES = {
  accepted: { label: "Accepted", className: "bg-emerald-100 text-emerald-700" },
  pending: { label: "QC Pending", className: "bg-amber-100 text-amber-700" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
  unknown: { label: "Not inspected", className: "bg-slate-100 text-slate-600" },
};

const getPieceQc = (piece) => {
  if (piece.status === "Rejected") return "rejected";
  const s = String(piece.inspection_status || "").toLowerCase();
  // "C"/"CUT" marks a piece cut in an MCR (incl. older off-cuts); only accepted material is released
  // to production for cutting, so these count as QC accepted
  if (s === "accepted" || s === "c" || s === "cut") return "accepted";
  if (s === "rejected") return "rejected";
  if (s === "pending") return "pending";
  return "unknown";
};

const QcBadge = ({ state, count }) => (
  <span className={`px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${QC_STATES[state].className}`}>
    {count !== undefined ? `${count} ` : ""}
    {QC_STATES[state].label}
  </span>
);

// Rejected quantity on a stock line: one per rejected piece for "Nos" items; for weight/length
// items a rejected piece is the whole lot (same all-or-nothing rule as GRN release)
const getRejectedQty = (quantity, unit, availablePieces, rejectedPieces) => {
  if (rejectedPieces.length === 0) return 0;
  if (String(unit).toLowerCase() === "nos") return Math.min(quantity, rejectedPieces.length);
  return availablePieces.length === 0 ? quantity : 0;
};

const formatDate = (value) => {
  if (!value || String(value).startsWith("0000")) return "N/A";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString("en-GB");
};

const formatQty = (value) => parseFloat(value || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });

// Same measurement rules as the Inventory Stock Balance page
const renderMeasurement = (item) => {
  const group = (item.item_group || "").toLowerCase();
  const uom = (item.unit || "").toLowerCase();
  if (group === "bought out" && ["packet", "box", "set"].includes(uom)) {
    return `${parseFloat((item.items_per_packet || 1) * item.quantity)} Items`;
  }
  // Weight of the usable quantity only (ledger total_weight also includes rejected pieces)
  const unitWeight = parseFloat(item.unit_weight || 0);
  const ledgerQty = parseFloat(item.ledgerQty || 0);
  let total = unitWeight > 0 ? unitWeight * item.quantity : parseFloat(item.total_weight || 0);
  if (!(unitWeight > 0) && ledgerQty > 0) total = (total / ledgerQty) * item.quantity;
  const value = parseFloat(total.toFixed(3));
  return group === "paint" || uom === "l" || uom === "liter" ? `${value} L` : `${value} Kg`;
};

const SELECT_CLASS =
  "p-2 text-xs border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

const AvailablePieces = ({ item }) => {
  const pieces = [...item.availablePieces, ...item.rejectedPieces];
  if (pieces.length === 0) {
    return <div className="p-4 text-center text-slate-400 text-xs">No individual pieces tracked for this item</div>;
  }
  return (
    <DataTable
      title="Pieces"
      titleIcon={<Boxes size={14} />}
      titleExtra={
        <div className="flex flex-wrap gap-1">
          {Object.entries(item.qcCounts)
            .filter(([, n]) => n > 0)
            .map(([state, n]) => (
              <QcBadge key={state} state={state} count={n} />
            ))}
        </div>
      }
      showSearch={false}
      data={pieces}
      columns={[
        {
          key: "serial_number",
          label: "ST Number",
          render: (val) => (
            <span className="p-1 bg-cyan-50 text-cyan-700 rounded text-xs border border-cyan-100">{val}</span>
          ),
        },
        {
          key: "inspection_status",
          label: "QC Status",
          render: (_, piece) => <QcBadge state={getPieceQc(piece)} />,
        },
        {
          key: "dimensions",
          label: "Dimensions",
          render: (_, st) => <span className="text-xs text-blue-600 font-mono">{renderDimensions(st)}</span>,
        },
        {
          key: "weight",
          label: "Weight",
          render: (_, st) => `${parseFloat(Number(st.unit_weight || st.total_weight || item.unit_weight || 0).toFixed(3))} Kg`,
        },
      ]}
    />
  );
};

const AvailableStockPage = () => {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projectFilter, setProjectFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [showRejected, setShowRejected] = useState(false);

  const fetchStock = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get("/inventory/materials?onlyWithStock=true");
      const materials = response.data.materials || [];
      setStock(
        materials.map((item) => {
          const firstSerial = item.serials?.[0] || {};
          const dim = (field) => Number(item[field] || firstSerial[field] || 0);
          const ledgerQty = Number(item.total_stock) || 0;
          const unit = item.unit || "Nos";
          const availablePieces = (item.serials || []).filter((s) => s.status === "Available");
          const rejectedPieces = (item.serials || []).filter((s) => s.status === "Rejected");
          const rejectedQty = getRejectedQty(ledgerQty, unit, availablePieces, rejectedPieces);
          const qcCounts = { accepted: 0, pending: 0, rejected: 0, unknown: 0 };
          [...availablePieces, ...rejectedPieces].forEach((p) => {
            qcCounts[getPieceQc(p)] += 1;
          });
          return {
            id: item.id,
            name: String(item.itemName || item.item_name || "N/A").trim() || "N/A",
            code: String(item.item_code || item.code || "N/A").trim() || "N/A",
            ledgerQty,
            rejectedQty,
            quantity: Math.max(0, ledgerQty - rejectedQty),
            availablePieces,
            rejectedPieces,
            qcCounts,
            unit,
            project_name: item.project_name || "General Stock",
            vendor_name: item.vendor_name || "-",
            item_group: (item.item_group || "").toUpperCase(),
            unit_weight: item.unit_weight || 0,
            total_weight: item.total_weight || 0,
            items_per_packet: item.items_per_packet || 1,
            lastUpdated: item.updatedAt,
            length: dim("length"),
            width: dim("width"),
            thickness: dim("thickness"),
            diameter: dim("diameter"),
            outer_diameter: dim("outer_diameter"),
            height: dim("height"),
            side_s: dim("side_s"),
            side1: dim("side1"),
            side2: dim("side2"),
            web_thickness: dim("web_thickness"),
            flange_thickness: dim("flange_thickness"),
            serials: item.serials || [],
          };
        })
      );
    } catch (err) {
      console.error("Error fetching available stock:", err);
      setError(err.response?.data?.message || "Failed to load available stock");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  const projects = useMemo(() => [...new Set(stock.map((s) => s.project_name))].sort(), [stock]);
  const groups = useMemo(() => [...new Set(stock.map((s) => s.item_group).filter(Boolean))].sort(), [stock]);

  const visibleStock = useMemo(
    () =>
      stock.filter(
        (s) =>
          (showRejected || s.quantity > 0) &&
          (projectFilter === "all" || s.project_name === projectFilter) &&
          (groupFilter === "all" || s.item_group === groupFilter)
      ),
    [stock, projectFilter, groupFilter, showRejected]
  );

  // Lines whose whole balance is QC-rejected material (hidden unless "Show rejected" is on)
  const rejectedOnlyLines = useMemo(() => stock.filter((s) => s.quantity === 0 && s.rejectedQty > 0).length, [stock]);

  const summary = useMemo(() => {
    const total = (state) => stock.reduce((sum, s) => sum + s.qcCounts[state], 0);
    return {
      lines: visibleStock.filter((s) => s.quantity > 0).length,
      accepted: total("accepted"),
      pending: total("pending") + total("unknown"),
      rejected: total("rejected"),
    };
  }, [visibleStock, stock]);

  const columns = [
    {
      key: "name",
      label: "Material",
      render: (_, item) => (
        <div className="space-y-1">
          <p className="text-xs text-slate-900 dark:text-white leading-tight">{item.name}</p>
          <div className="text-[10px] text-blue-600 font-mono">{renderDimensions(item)}</div>
        </div>
      ),
    },
    { key: "code", label: "Item Code", render: (val) => <span className="font-mono text-slate-500 text-xs">{val}</span> },
    {
      key: "item_group",
      label: "Group",
      render: (val) =>
        val ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">{val}</span>
        ) : (
          "-"
        ),
    },
    // Stock is shared by all projects; this is only the project it was originally bought for
    { key: "project_name", label: "Purchased for", render: (val) => <span className="text-xs text-slate-700">{val}</span> },
    { key: "vendor_name", label: "Vendor", render: (val) => <span className="text-xs text-slate-500">{val}</span> },
    {
      key: "quantity",
      label: "Usable Qty",
      className: "text-right",
      render: (val, item) => (
        <span className={`text-sm font-semibold ${val > 0 ? "text-emerald-700" : "text-slate-400"}`}>
          {formatQty(val)} <span className="text-xs font-normal text-slate-500">{item.unit}</span>
        </span>
      ),
    },
    {
      key: "qcCounts",
      label: "QC Status",
      render: (counts) => {
        const states = Object.entries(counts).filter(([, n]) => n > 0);
        if (states.length === 0) return <span className="text-[10px] text-slate-400">No QC record</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {states.map(([state, n]) => (
              <QcBadge key={state} state={state} count={n} />
            ))}
          </div>
        );
      },
    },
    {
      key: "rejectedQty",
      label: "Rejected (in stock)",
      className: "text-right",
      render: (val, item) =>
        val > 0 ? (
          <span className="text-xs font-medium text-red-600" title="Rejected in QC, still counted in the Inventory stock ledger">
            {formatQty(val)} {item.unit}
          </span>
        ) : (
          <span className="text-xs text-slate-300">-</span>
        ),
    },
    {
      key: "total_weight",
      label: "Measurement / Weight",
      className: "text-center",
      render: (_, item) => <span className="text-xs text-slate-700">{renderMeasurement(item)}</span>,
    },
    { key: "lastUpdated", label: "Last Movement", render: (val) => <span className="text-xs text-slate-500">{formatDate(val)}</span> },
  ];

  const summaryCards = [
    { label: "Usable Stock Lines", value: summary.lines, icon: Package, color: "text-blue-600 bg-blue-50" },
    { label: "QC Accepted Pieces", value: summary.accepted, icon: ShieldCheck, color: "text-emerald-600 bg-emerald-50" },
    { label: "QC Pending Pieces", value: summary.pending, icon: Clock, color: "text-amber-600 bg-amber-50" },
    { label: "Rejected Pieces (not usable)", value: summary.rejected, icon: Ban, color: "text-red-600 bg-red-50" },
  ];

  return (
    <div className="w-full space-y-4 p-4">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h1 className="text-xl text-left">Available Stock</h1>
        </div>
        <button
          type="button"
          onClick={fetchStock}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded text-xs text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="flex items-center justify-between p-4 rounded border border-slate-200 bg-white dark:bg-slate-900">
              <div>
                <p className="text-xs text-slate-500">{card.label}</p>
                <p className="text-2xl text-slate-900 dark:text-white">{card.value}</p>
              </div>
              <div className={`p-2 rounded ${card.color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>}

      <DataTable
        title="Stock Balance"
        titleIcon={<Warehouse size={15} />}
        titleExtra={
          <div className="flex flex-wrap items-center gap-2">
            <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className={SELECT_CLASS}>
              <option value="all">Purchased for: All Projects</option>
              {projects.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className={SELECT_CLASS}>
              <option value="all">All Groups</option>
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-xs text-slate-600 whitespace-nowrap">
              <input type="checkbox" checked={showRejected} onChange={(e) => setShowRejected(e.target.checked)} />
              Show rejected-only lines ({rejectedOnlyLines})
            </label>
          </div>
        }
        columns={columns}
        data={visibleStock}
        loading={loading}
        striped={true}
        hover={true}
        emptyMessage="No material is currently in stock for this selection."
        renderRowDetail={(item) => (
          <div className="p-2 bg-slate-50/50 dark:bg-slate-900/50">
            <AvailablePieces item={item} />
          </div>
        )}
      />
    </div>
  );
};

export default AvailableStockPage;
