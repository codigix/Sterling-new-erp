import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  Download,
  Eye,
  Loader2,
  AlertCircle,
  FileCheck,
  Package,
  LayoutGrid,
  List,
  Filter,
  FileCode,
  Box
} from "lucide-react";
import axios from "../../utils/api";
import { getServerUrl, downloadFile } from "../../utils/fileUtils";
import DataTable from "../../components/ui/DataTable/DataTable";

const ProductionDesignDrawings = () => {
  const [searchParams] = useSearchParams();
  const [rootCardId, setRootCardId] = useState(searchParams.get("rootCardId") || "");
  const [rootCards, setRootCards] = useState([]);
  const [drawings, setDrawings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'list'
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchRootCards();
  }, []);

  useEffect(() => {
    fetchDrawings();
  }, [rootCardId]);

  const fetchRootCards = async () => {
    try {
      const response = await axios.get("/root-cards");
      const cards = Array.isArray(response.data) ? response.data : response.data.rootCards || [];
      // Only show root cards that have been sent to Design Engineering (not in RC_CREATED status)
      const filteredCards = cards.filter(card => card.status !== 'RC_CREATED');
      setRootCards(filteredCards);
    } catch (error) {
      console.error("Failed to fetch root cards:", error);
    }
  };

  const fetchDrawings = async () => {
    try {
      setLoading(true);
      const url = rootCardId 
        ? `/design-drawings/root-card/${rootCardId}`
        : `/design-drawings`;
      
      const response = await axios.get(url);
      
      // Filter out only latest approved versions
      const latestDocs = {};
      const drawingsData = response.data.drawings || response.data.documents || [];
      
      drawingsData.forEach(doc => {
        // Use a unique key based on name, type and root_card_id to get latest version for each drawing
        const key = `${doc.root_card_id}-${doc.name}-${doc.type}`;
        if (!latestDocs[key] || doc.version > latestDocs[key].version) {
          latestDocs[key] = doc;
        }
      });
      setDrawings(Object.values(latestDocs));
    } catch (error) {
      console.error("Failed to fetch drawings:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDrawings = drawings.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.project_name && doc.project_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (doc.po_number && doc.po_number.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleDownload = async (doc) => {
    try {
      await downloadFile(doc.file_path, doc.name);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to download file");
    }
  };

  const handleView = (doc) => {
    const fileUrl = getServerUrl(doc.file_path);
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  const drawingColumns = [
    {
      header: "Drawing Name",
      accessor: "name",
      render: (value, doc) => (
        <div className="flex flex-col">
          <div className="text-slate-900 dark:text-white group-hover:text-green-600 transition-colors text-xs font-medium">
            {value}
          </div>
          <div className="text-[10px] text-slate-400 line-clamp-1">
            {doc.description}
          </div>
        </div>
      ),
    },
    {
      header: "Type",
      accessor: "type",
      render: (value) => (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          {value}
        </span>
      ),
    },
    {
      header: "Project / PO",
      accessor: "project_name",
      render: (value, doc) => (
        <div className="flex flex-col">
          <div className="text-[10px] text-slate-600 dark:text-slate-300">
            {value || "-"}
          </div>
          <div className="text-[10px] text-slate-400">{doc.po_number}</div>
        </div>
      ),
    },
    {
      header: "Version",
      accessor: "version",
      render: (value) => (
        <span className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1 rounded text-[10px]">
          v{value}
        </span>
      ),
    },
    {
      header: "Approved Date",
      accessor: "updated_at",
      render: (value) => (
        <span className="text-[10px] text-slate-500">
          {new Date(value).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: "Actions",
      align: "right",
      render: (_, doc) => (
        <div className="flex items-center justify-end gap-1">
          {doc.dwg_path && (
            <button
              onClick={() => downloadFile(doc.dwg_path, `${doc.name}.dwg`)}
              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
              title="Download DWG File"
            >
              <Eye size={14} />
            </button>
          )}
          {doc.step_path && (
            <button
              onClick={() => downloadFile(doc.step_path, `${doc.name}.step`)}
              className="p-1.5 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded transition-colors"
              title="Download STEP File"
            >
              <Eye size={14} />
            </button>
          )}
          <button
            onClick={() => handleView(doc)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
            title="View"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => handleDownload(doc)}
            className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
            title="Download"
          >
            <Download size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl  text-slate-900 dark:text-white flex items-center gap-2">
         Approved Design Drawings
          </h1>
          <p className="text-slate-500 text-xs">Access latest approved designs for production</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-md transition-all ${viewMode === "grid" ? "bg-white dark:bg-slate-700  text-green-600" : "text-slate-500 hover:text-slate-700"}`}
            title="Grid View"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-md transition-all ${viewMode === "list" ? "bg-white dark:bg-slate-700  text-green-600" : "text-slate-500 hover:text-slate-700"}`}
            title="List View"
          >
            <List size={15} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 ">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-4 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search by drawing name, project or PO..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-2 focus:ring-green-500 outline-none transition-all"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <select
            value={rootCardId}
            onChange={(e) => setRootCardId(e.target.value)}
            className="w-full pl-10 pr-4 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs focus:ring-2 focus:ring-green-500 outline-none appearance-none cursor-pointer transition-all"
          >
            <option value="">All Projects (Root Cards)</option>
            {rootCards.map(rc => {
              const baseName = rc.project_name || rc.po_number || "";
              const displayName = baseName.replace(/^RC-\d{4}\s*[-:]\s*/i, '');
              return (
                <option key={rc.id} value={rc.id}>{displayName || baseName || rc.id}</option>
              );
            })}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-4 text-center text-slate-500">
          <Loader2 className="animate-spin inline-block mb-2" size={15} />
          <p>Loading drawings...</p>
        </div>
      ) : drawings.length === 0 ? (
        <div className="p-4 text-center bg-white dark:bg-slate-800 rounded border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-500">
          <Package size={15} className="mx-auto  opacity-20" />
          <p>No approved drawings found</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {filteredDrawings.map((doc) => (
            <div key={doc.id} className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow group">
              <div className="p-2 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="inline-flex items-center p-1 rounded text-xs   bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 ">
                      {doc.type}
                    </span>
                    <h3 className=" text-slate-900 dark:text-white group-hover:text-green-600 transition-colors text-sm">{doc.name}</h3>
                    {doc.project_name && (
                      <p className="text-xs text-slate-400  truncate">
                        Project: {doc.project_name}
                      </p>
                    )}
                  </div>
                  <span className="text-xs  text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-1 rounded">
                    v{doc.version}
                  </span>
                </div>
                
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {doc.description || "No description provided."}
                </p>

                {(doc.dwg_path || doc.step_path) && (
                  <div className="flex gap-2 py-1 border-t border-slate-50 dark:border-slate-700">
                    {doc.dwg_path && (
                      <button 
                        onClick={() => downloadFile(doc.dwg_path, `${doc.name}.dwg`)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px]  rounded border border-blue-200 transition-colors"
                        title="Download DWG File"
                      >
                        <Eye size={12} /> DWG File
                      </button>
                    )}
                    {doc.step_path && (
                      <button 
                        onClick={() => downloadFile(doc.step_path, `${doc.name}.step`)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 text-[10px]  rounded border border-orange-200 transition-colors"
                        title="Download STEP File"
                      >
                        <Eye size={12} /> STEP File
                      </button>
                    )}
                  </div>
                )}

                <div className=" border-t border-slate-50 dark:border-slate-700 flex items-center justify-between pt-2">
                  <div className="text-[10px] text-slate-500">
                    Approved: {new Date(doc.updated_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleView(doc)}
                      className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-[10px] transition-colors"
                    >
                      <Eye size={12} /> View
                    </button>
                    <button 
                      onClick={() => handleDownload(doc)}
                      className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-[10px] transition-colors"
                    >
                      <Download size={12} /> Save
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 overflow-hidden p-2">
          <DataTable
            columns={drawingColumns}
            data={filteredDrawings}
            emptyMessage="No approved drawings found"
            showSearch={false}
          />
        </div>
      )}
    </div>
  );
};

export default ProductionDesignDrawings;
