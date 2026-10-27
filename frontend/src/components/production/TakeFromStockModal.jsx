import { useState, useEffect, useMemo } from "react";
import axios from "../../utils/api";
import { renderDimensions } from "../../utils/dimensionUtils";
import { X, Warehouse, Loader2, Search, PackagePlus, Info } from "lucide-react";

// Picker used inside the MCR: choose QC-accepted pieces from inventory stock to use in this report.
// Choosing only adds them to the MCR form — nothing leaves stock here. The pieces are stocked out
// when the MCR is finalized, and only if they were used in the report.

const SELECT_CLASS =
  "p-2 text-xs border border-slate-200 rounded bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

const TakeFromStockModal = ({ isOpen, onClose, projectNames = [], excludeSerials = [], onAdd }) => {
  const [pieces, setPieces] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [targetProject, setTargetProject] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setSelected(new Set());
    setSearch("");
    setGroupFilter("all");
    setTargetProject(projectNames[0] || "");
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get("/production/mcr/stock-pieces", {
          params: { project_names: projectNames.join(",") },
        });
        setPieces(res.data.pieces || []);
        setProjects(res.data.projects || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load stock");
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Pieces already added to this MCR are not offered again
  const available = useMemo(
    () => pieces.filter((p) => !excludeSerials.includes(p.serial_number)),
    [pieces, excludeSerials]
  );

  const groups = useMemo(
    () => [...new Set(available.map((p) => (p.item_group || "").toUpperCase()).filter(Boolean))].sort(),
    [available]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return available.filter(
      (p) =>
        (groupFilter === "all" || (p.item_group || "").toUpperCase() === groupFilter) &&
        (!q ||
          [p.serial_number, p.item_name, p.source_project, p.item_group]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q)))
    );
  }, [available, search, groupFilter]);

  const toggle = (sn) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sn)) next.delete(sn);
      else next.add(sn);
      return next;
    });

  const allVisibleSelected = visible.length > 0 && visible.every((p) => selected.has(p.serial_number));
  const toggleAllVisible = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      visible.forEach((p) => (allVisibleSelected ? next.delete(p.serial_number) : next.add(p.serial_number)));
      return next;
    });

  // Stock is a common pool: any project can use any QC-accepted piece (no warnings)
  const selectedPieces = available.filter((p) => selected.has(p.serial_number));

  const handleAdd = () => {
    if (!targetProject || selectedPieces.length === 0) return;
    const rootCardId = projects.find((p) => p.project_name === String(targetProject).trim())?.root_card_id || null;
    onAdd?.(selectedPieces, targetProject, rootCardId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50">
      <div className="bg-white w-full max-w-4xl rounded shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="p-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded">
              <Warehouse size={15} />
            </div>
            <div>
              <h3 className="text-base text-slate-900">Take Material from Stock</h3>
              <p className="text-xs text-slate-500">QC-accepted pieces in Inventory. Selected pieces are added to this MCR's material list.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full" aria-label="Close">
            <X size={15} className="text-slate-400" />
          </button>
        </div>

        <div className="px-3 py-2 bg-indigo-50 border-b border-indigo-100 text-[11px] text-indigo-800 flex items-center gap-2">
          <Info size={13} className="flex-shrink-0" />
          Stock is reduced only when you <b>finalize the MCR</b>, and only for pieces actually used in the report. Pieces you add but don't use stay in stock.
        </div>

        <div className="p-3 flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60">
          <label className="text-xs text-slate-500">Use for project</label>
          <select value={targetProject} onChange={(e) => setTargetProject(e.target.value)} className={SELECT_CLASS}>
            {projectNames.map((p) => (
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
          <div className="relative ml-auto">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ST, material, project..."
              className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded w-60 focus:outline-none focus:border-indigo-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" /> Loading stock...
            </div>
          ) : error ? (
            <div className="m-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
          ) : visible.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">
              No QC-accepted pieces in stock{search || groupFilter !== "all" ? " for this filter" : ""}.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 sticky top-0">
                <tr>
                  <th className="p-2 w-8">
                    <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} aria-label="Select all" />
                  </th>
                  <th className="p-2 text-left">ST Number</th>
                  <th className="p-2 text-left">Material</th>
                  <th className="p-2 text-left">Group</th>
                  <th className="p-2 text-right">Weight</th>
                  <th className="p-2 text-left">Purchased for</th>
                  <th className="p-2 text-left">QC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((p) => (
                  <tr
                    key={p.serial_number}
                    onClick={() => toggle(p.serial_number)}
                    className={`cursor-pointer ${selected.has(p.serial_number) ? "bg-indigo-50" : "hover:bg-slate-50"}`}
                  >
                    <td className="p-2 text-center">
                      <input
                        type="checkbox"
                        checked={selected.has(p.serial_number)}
                        onChange={() => toggle(p.serial_number)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select ${p.serial_number}`}
                      />
                    </td>
                    <td className="p-2">
                      <span className="p-1 bg-cyan-50 text-cyan-700 rounded border border-cyan-100">{p.serial_number}</span>
                    </td>
                    <td className="p-2">
                      <div className="text-slate-900">{p.item_name}</div>
                      <div className="text-[10px] text-blue-600 font-mono">{renderDimensions(p)}</div>
                    </td>
                    <td className="p-2 text-slate-600">{(p.item_group || "-").toUpperCase()}</td>
                    <td className="p-2 text-right text-slate-700">
                      {parseFloat(Number(p.unit_weight || p.total_weight || 0).toFixed(3))} Kg
                    </td>
                    <td className="p-2 text-slate-600">{p.source_project || "General stock"}</td>
                    <td className="p-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">Accepted</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/60">
          <span className="text-xs text-slate-600">{selectedPieces.length} piece(s) selected</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 border border-slate-300 text-xs text-slate-700 rounded hover:bg-white">
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={selectedPieces.length === 0 || !targetProject}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs rounded flex items-center gap-2"
            >
              <PackagePlus size={14} />
              Add to MCR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TakeFromStockModal;
