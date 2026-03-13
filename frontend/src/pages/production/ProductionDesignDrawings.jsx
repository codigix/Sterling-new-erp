import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  Download,
  Eye,
  Loader2,
  AlertCircle,
  FileCheck,
  Package
} from "lucide-react";
import axios from "../../utils/api";

const ProductionDesignDrawings = () => {
  const [searchParams] = useSearchParams();
  const [rootCardId, setRootCardId] = useState(searchParams.get("rootCardId") || "");
  const [rootCards, setRootCards] = useState([]);
  const [drawings, setDrawings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRootCards();
  }, []);

  useEffect(() => {
    if (rootCardId) {
      fetchDrawings();
    } else {
      setDrawings([]);
      setLoading(false);
    }
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
      const response = await axios.get(`/design-drawings/root-card/${rootCardId}`);
      // Filter out only latest approved versions (Backend already filters for status=Approved for Production)
      const latestDocs = {};
      const drawingsData = response.data.drawings || response.data.documents || [];
      drawingsData.forEach(doc => {
        const key = `${doc.name}-${doc.type}`;
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileCheck className="text-green-600" /> Approved Design Drawings
        </h1>
        <p className="text-slate-500">Access latest approved designs for production</p>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Filter by Root Card</label>
          <select
            value={rootCardId}
            onChange={(e) => setRootCardId(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 outline-none"
          >
            <option value="">Select Root Card...</option>
            {rootCards.map(rc => {
              const baseName = rc.project_name || rc.po_number || "";
              // Remove RC-XXXX pattern from the start of the string if it exists
              const displayName = baseName.replace(/^RC-\d{4}\s*[-:]\s*/i, '');
              return (
                <option key={rc.id} value={rc.id}>{displayName || baseName || rc.id}</option>
              );
            })}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center text-slate-500">
            <Loader2 className="animate-spin inline-block mb-2" size={32} />
            <p>Loading drawings...</p>
          </div>
        ) : drawings.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-500">
            <Package size={48} className="mx-auto mb-4 opacity-20" />
            <p>{rootCardId ? "No approved drawings found for this root card" : "Select a root card to view available designs"}</p>
          </div>
        ) : (
          drawings.map((doc) => (
            <div key={doc.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      {doc.type}
                    </span>
                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-green-600 transition-colors">{doc.name}</h3>
                  </div>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                    v{doc.version}
                  </span>
                </div>
                
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 min-h-[2.5rem]">
                  {doc.description || "No description provided."}
                </p>

                <div className="pt-4 border-t border-slate-50 dark:border-slate-700 flex items-center justify-between">
                  <div className="text-[11px] text-slate-500">
                    Approved on: {new Date(doc.updated_at).toLocaleDateString()}
                  </div>
                  <a 
                    href={`${axios.defaults.baseURL.replace('/api', '')}/${doc.file_path}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                  >
                    <Download size={16} /> Download
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProductionDesignDrawings;
