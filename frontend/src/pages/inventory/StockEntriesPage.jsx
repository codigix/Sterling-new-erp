import React, { useState, useEffect } from "react";
import axios from "../../utils/api";
import CreateStockEntryModal from "./CreateStockEntryModal";
import { renderDimensions } from "../../utils/dimensionUtils";
import DataTable from "../../components/ui/DataTable/DataTable";
import {
  Package,
  Search,
  Plus,
  ArrowRight,
  TrendingUp,
  Boxes,
  IndianRupee,
  Clock,
  MoreVertical,
  Filter,
  ChevronDown,
  ChevronUp,
  Warehouse,
  Calendar,
  Layers,
  Zap,
} from "lucide-react";

import { toast } from "react-toastify";

const SerialListTable = ({ item }) => {
  if (!item.serials || item.serials.length === 0) {
    return (
      <div className="p-4 text-center text-slate-400 text-xs">
        No individual pieces tracking found for this item
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded overflow-hidden">
      <DataTable
        title="Tracking Serial Numbers (ST Codes)"
        titleIcon={<Boxes size={14} />}
        data={item.serials}
        showSearch={item.serials.length > 5}
        columns={[
          {
            key: "serial_number_short",
            label: "Item Code",
            render: (_, stObj) => {
              const stCode = typeof stObj === 'string' ? stObj : stObj.serial_number;
              return stCode.replace(/^ST-/, "");
            }
          },
          {
            key: "dimensions",
            label: "Dimensions",
            render: (_, stObj) => renderDimensions(stObj)
          },
          {
            key: "weight",
            label: "Weight",
            render: (_, stObj) => {
              const pieceWeight = stObj.unit_weight || stObj.total_weight || item.unit_weight || 0;
              return `${Number(pieceWeight).toFixed(3)} Kg`;
            }
          },
          {
            key: "item_name",
            label: "Name",
            render: () => item.item_name
          },
          {
            key: "serial_number",
            label: "ST Code",
            className: "text-right text-indigo-600",
            render: (val) => val
          }
        ]}
      />
    </div>
  );
};

const ItemBreakdownTable = ({ entry }) => {
  const items = Array.isArray(entry.items) ? entry.items : [];
  
  return (
    <div className="p-2 border-l-4 border-indigo-500 bg-white dark:bg-slate-800 rounded-r-2xl animate-in slide-in-from-top-4 duration-300">
      <div className="overflow-hidden rounded border border-slate-100 dark:border-slate-700">
        <DataTable
          title="Itemized Stock Receipt"
          titleIcon={<Boxes size={14} />}
          titleExtra={
            <div className="text-[10px] text-slate-500 bg-slate-100 p-1 rounded">
              {items.length} materials included
            </div>
          }
          data={items}
          columns={[
            {
              key: "item_code",
              label: "Item Code",
              className: "text-indigo-600"
            },
            {
              key: "item_name",
              label: "Material Name"
            },
            {
              key: "dimensions",
              label: "Dimensions",
              render: (_, item) => (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {renderDimensions(item)}
                </div>
              )
            },
            {
              key: "quantity",
              label: "Qty / UOM",
              className: "text-center",
              render: (val, item) => (
                <div className="flex flex-col items-center">
                  <span className="text-slate-900 dark:text-white">{val}</span>
                  <span className="text-xs text-slate-400">{item.uom}</span>
                </div>
              )
            },
            {
              key: "total_weight",
              label: "Weight (Kg)",
              className: "text-center",
              render: (val, item) => (
                <div className="flex flex-col items-center">
                  <span className="text-slate-900 dark:text-white">{Number(val || 0).toFixed(3)} Kg</span>
                  <span className="text-xs text-slate-400">Unit: {Number(item.unit_weight || 0).toFixed(3)}</span>
                </div>
              )
            },
            {
              key: "serials",
              label: "Serial Tags",
              className: "text-right",
              render: (serials) => (
                <div className="flex flex-wrap justify-end gap-1">
                  {serials && serials.length > 0 ? (
                    <>
                      {serials.slice(0, 3).map((s, si) => (
                        <span key={si} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded text-xs border border-indigo-100 dark:border-indigo-800">
                          {s.serial_number}
                        </span>
                      ))}
                      {serials.length > 3 && (
                        <span className="text-xs text-slate-400 mt-1">+{serials.length - 3} more</span>
                      )}
                    </>
                  ) : (
                    <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-900/30 text-slate-400 rounded text-xs border border-slate-100 dark:border-slate-800">
                      NO SERIALS
                    </span>
                  )}
                </div>
              )
            }
          ]}
          renderRowDetail={(item) => (
            <div className="p-2 bg-slate-50/50 dark:bg-slate-900/20">
              <SerialListTable item={item} />
            </div>
          )}
        />
      </div>

      {entry.remarks && (
        <div className="mt-6 p-2 bg-amber-50/30 border border-amber-100/50 rounded">
          <p className="text-xs text-amber-600 mb-1">Transaction Remarks</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 ">{entry.remarks}</p>
        </div>
      )}
    </div>
  );
};

const StockEntriesPage = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState(null);
  const [expandedItem, setExpandedItem] = useState(null);

  useEffect(() => {
    fetchStockEntries();
  }, []);

  const fetchStockEntries = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/inventory/stock-entries");
      setEntries(response.data.movements || []);
    } catch (error) {
      console.error("Error fetching stock entries:", error);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { title: "TOTAL MOVEMENTS", value: entries.length, icon: TrendingUp, color: "blue" },
    { title: "TOTAL THROUGHPUT", value: entries.reduce((acc, entry) => acc + (entry.items?.length || 0), 0), icon: Boxes, color: "indigo" },
    { title: "INVENTORY VALUE", value: "₹0.02L", icon: IndianRupee, color: "emerald" },
    { title: "PENDING DRAFTS", value: "0", icon: Clock, color: "amber" },
  ];

  return (
    <div className="space-y-4 p-4">
      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-800 p-3 rounded border border-slate-100 dark:border-slate-700 shadow-sm ">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1">{stat.title}</p>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{stat.value}</h3>
              </div>
              <div className={`p-2 rounded bg-${stat.color}-50 dark:bg-${stat.color}-900/20 text-${stat.color}-600 dark:text-${stat.color}-400`}>
                <stat.icon size={18} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Entries Table */}
      <DataTable
        title="Stock Entries"
        titleIcon={<TrendingUp size={16} />}
        titleExtra={
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs transition-all shadow-sm"
          >
            <Plus size={14} /> Create Entry
          </button>
        }
        data={entries}
        loading={loading}
        filters={[
          {
            key: "entry_type",
            label: "All Types",
            options: [
              { label: "Receipt", value: "receipt" },
              { label: "Issue", value: "issue" },
              { label: "Transfer", value: "transfer" },
            ]
          }
        ]}
        columns={[
          {
            key: "entry_no",
            label: "Entry Details",
            render: (val, entry) => (
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-900 dark:text-white  ">{val}</p>
                <div className="flex items-center gap-2">
                  <Calendar size={12} className="text-slate-400" />
                  <p className="text-xs  text-slate-500 ">
                    {new Date(entry.entry_date || entry.created_at).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            )
          },
          {
            key: "project_name",
            label: "Project / Context",
            render: (val, entry) => (
              <div className="flex items-start gap-4">
                <div className="p-2 rounded bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 flex-shrink-0">
                  <Zap size={15} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-900 dark:text-white   leading-tight line-clamp-2">
                    {val || "GENERAL STOCK"}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs  text-slate-400 ">Vendor:</span>
                    <span className="text-xs  text-indigo-600   bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                      {entry.vendor_name || "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            )
          },
          {
            key: "status",
            label: "Status",
            className: "text-center",
            render: (val) => (
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded text-[10px] font-medium shadow-sm">
                {val || 'SUBMITTED'}
              </span>
            )
          },
          {
            key: "items",
            label: "Items",
            className: "text-center",
            render: (val) => (
              <div className="flex items-center justify-center gap-2 text-slate-900 dark:text-white">
                <span className="text-xs font-medium">{Array.isArray(val) ? val.length : 0}</span>
                <Package size={14} className="text-slate-400" />
              </div>
            )
          },
          {
            key: "actions",
            label: "Actions",
            className: "text-right",
            render: () => (
              <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                <MoreVertical size={15} />
              </button>
            )
          }
        ]}
        renderRowDetail={(entry) => (
          <div className="p-2 bg-slate-50/50 dark:bg-slate-900/50">
            <ItemBreakdownTable entry={entry} />
          </div>
        )}
        emptyMessage="No stock entries found"
      />

      <CreateStockEntryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onEntryCreated={fetchStockEntries}
      />
    </div>
  );
};

export default StockEntriesPage;

