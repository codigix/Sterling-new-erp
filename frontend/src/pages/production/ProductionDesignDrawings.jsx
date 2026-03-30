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
  Filter
} from "lucide-react";
import axios from "../../utils/api";
import { getServerUrl, downloadFile } from "../../utils/fileUtils";

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
      setRootCards(Array.isArray(response.data) ? response.data : response.data.rootCards || []);
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

  return (
    <div className="p-6 space-y-6">
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
            className={`p-2 rounded-md transition-all ${viewMode === "grid" ? "bg-white dark:bg-slate-700 shadow-sm text-green-600" : "text-slate-500 hover:text-slate-700"}`}
            title="Grid View"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-md transition-all ${viewMode === "list" ? "bg-white dark:bg-slate-700 shadow-sm text-green-600" : "text-slate-500 hover:text-slate-700"}`}
            title="List View"
          >
            <List size={15} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700 ">
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
      ) : filteredDrawings.length === 0 ? (
        <div className="p-4 text-center bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-500">
          <Package size={15} className="mx-auto  opacity-20" />
          <p>{searchQuery ? "No drawings match your search" : "No approved drawings found"}</p>
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

                <div className=" border-t border-slate-50 dark:border-slate-700 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    Approved on: {new Date(doc.updated_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleView(doc)}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded text-xs  transition-colors"
                    >
                      <Eye size={14} /> View
                    </button>
                    <button 
                      onClick={() => handleDownload(doc)}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white p-2 rounded text-xs  transition-colors"
                    >
                      <Download size={14} /> Download
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="p-2  text-xs  text-slate-500  ">Drawing Name</th>
                  <th className="p-2  text-xs  text-slate-500  ">Type</th>
                  <th className="p-2  text-xs  text-slate-500  ">Project / PO</th>
                  <th className="p-2  text-xs  text-slate-500  ">Version</th>
                  <th className="p-2  text-xs  text-slate-500  ">Approved Date</th>
                  <th className="p-2  text-xs  text-slate-500   text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredDrawings.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors group">
                    <td className="p-2 ">
                      <div className=" text-slate-900 dark:text-white group-hover:text-green-600 transition-colors text-xs">{doc.name}</div>
                      <div className="text-xs text-slate-400 line-clamp-1">{doc.description}</div>
                    </td>
                    <td className="p-2 ">
                      <span className="inline-flex items-center p-1 rounded text-xs   bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 ">
                        {doc.type}
                      </span>
                    </td>
                    <td className="p-2 ">
                      <div className="text-xs text-slate-600 dark:text-slate-300">{doc.project_name || "-"}</div>
                      <div className="text-xs text-slate-400">{doc.po_number}</div>
                    </td>
                    <td className="p-2  text-xs">
                      <span className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20  rounded ">
                        v{doc.version}
                      </span>
                    </td>
                    <td className="p-2  text-xs text-slate-500">
                      {new Date(doc.updated_at).toLocaleDateString()}
                    </td>
                    <td className="p-2  text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleView(doc)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye size={15} />
                        </button>
                        <button 
                          onClick={() => handleDownload(doc)}
                          className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionDesignDrawings;
