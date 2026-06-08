import { useState, useEffect } from "react";
import axios from "../../../../utils/api";
import {
  GitBranch,
  ChevronDown,
  CheckCircle2,
  Clock,
  Circle,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

// Department pipeline in the exact Sterling ERP manufacturing workflow order:
// Admin (RC creation) → Design Eng (drawings + QAP review) → Quality (QAP/ATP + Material QC + Production QC)
// → Production (BOM + Phase-1/2 ops) → Procurement (RFQ + PO) → Inventory (GRN + stock + material release)
const DEPARTMENTS = [
  {
    key: "Admin",
    label: "Admin",
    icon: "🏢",
    color: { bg: "#6366f1", light: "#eef2ff", border: "#c7d2fe", text: "#4338ca" },
    rounds: "Route Card creation & dispatch",
  },
  {
    key: "Design Engineer",
    label: "Design Eng",
    icon: "✏️",
    color: { bg: "#0ea5e9", light: "#e0f2fe", border: "#bae6fd", text: "#0369a1" },
    rounds: "Drawings upload + QAP review & approval",
  },
  {
    key: "Quality",
    label: "Quality",
    icon: "🔍",
    color: { bg: "#8b5cf6", light: "#f5f3ff", border: "#ddd6fe", text: "#6d28d9" },
    rounds: "Round 1: QAP/ATP · Round 2: Material QC · Round 3: Production QC",
  },
  {
    key: "Production",
    label: "Production",
    icon: "⚙️",
    color: { bg: "#f97316", light: "#fff7ed", border: "#fed7aa", text: "#c2410c" },
    rounds: "Round 1: BOM + Material Request · Round 2: Phase-1 & Phase-2 ops",
  },
  {
    key: "Procurement",
    label: "Procurement",
    icon: "🛒",
    color: { bg: "#f59e0b", light: "#fffbeb", border: "#fde68a", text: "#b45309" },
    rounds: "RFQ → Vendor quotation → PO → Vendor",
  },
  {
    key: "Inventory",
    label: "Inventory",
    icon: "📦",
    color: { bg: "#10b981", light: "#ecfdf5", border: "#a7f3d0", text: "#065f46" },
    rounds: "GRN + ST numbers + Stock + Material release to Production",
  },
];


const PertChart = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get("/admin/dept-progress");
      const list = res.data.projects || [];
      setProjects(list);
    } catch (err) {
      console.error("PERT chart fetch error:", err);
      setError("Unable to load department progress data.");
    } finally {
      setLoading(false);
    }
  };

  // Compute department averages for "All Projects" view
  const getAllAverage = () => {
    if (!projects.length) return null;
    const sums = {};
    DEPARTMENTS.forEach((d) => (sums[d.key] = 0));
    projects.forEach((p) => {
      DEPARTMENTS.forEach((d) => {
        sums[d.key] += p.departments[d.key]?.progress || 0;
      });
    });
    const departments = {};
    DEPARTMENTS.forEach((d) => {
      const avg = Math.round(sums[d.key] / projects.length);
      departments[d.key] = {
        progress: avg,
        status: avg === 100 ? "completed" : avg > 0 ? "in_progress" : "pending",
      };
    });
    const totalAvg = Math.round(
      Object.values(departments).reduce((s, v) => s + v.progress, 0) /
        DEPARTMENTS.length
    );
    return {
      id: "all",
      project_name: "All Projects",
      project_code: `${projects.length} projects`,
      overall_progress: totalAvg,
      departments,
    };
  };

  const selectedProject =
    selectedProjectId === "all"
      ? getAllAverage()
      : projects.find((p) => String(p.id) === String(selectedProjectId));

  const getNodeStyle = (dept, deptData) => {
    if (!deptData) return { state: "pending" };
    const { status, progress } = deptData;
    if (status === "completed") return { state: "completed" };
    if (status === "in_progress") return { state: "active", progress };
    return { state: "pending" };
  };

  if (loading) {
    return (
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={styles.cardTitle}>
            <GitBranch style={{ width: 16, height: 16, color: "#10b981" }} />
            Dashboard & Overview
          </span>
        </div>
        <div style={styles.loadingWrap}>
          <div className="animate-spin" style={styles.spinner} />
          <span style={styles.loadingText}>Loading department progress…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={styles.cardTitle}>
            <GitBranch style={{ width: 16, height: 16, color: "#10b981" }} />
            Dashboard & Overview
          </span>
        </div>
        <div style={styles.errorWrap}>
          <AlertCircle style={{ width: 20, height: 20, color: "#ef4444" }} />
          <span style={{ color: "#ef4444", fontSize: 13 }}>{error}</span>
          <button onClick={fetchData} style={styles.retryBtn}>
            <RefreshCw style={{ width: 12, height: 12 }} /> Retry
          </button>
        </div>
      </div>
    );
  }

  const overallPct = selectedProject?.overall_progress || 0;

  return (
    <div style={styles.card}>
      {/* ── Header ── */}
      <div style={styles.cardHeader}>
        <div style={styles.headerLeft}>
          <GitBranch style={{ width: 16, height: 16, color: "#10b981" }} />
          <div>
            <span style={styles.cardTitle}>Dashboard & Overview</span>
            <p style={styles.cardSubtitle}>
              Real-time manufacturing system analytics and KPIs
            </p>
          </div>
        </div>

        {/* Project Selector */}
        <div style={styles.selectorWrap} onClick={() => setIsDropdownOpen((o) => !o)}>
          <span style={styles.selectorLabel}>
            {selectedProject?.project_name || "Select Project"}
            <span style={styles.selectorCode}>{selectedProject?.project_code}</span>
            {selectedProject?.status && selectedProjectId !== "all" && (
              <span style={{ fontSize: 10, color: "#3b82f6", marginTop: 1 }}>
                {selectedProject.status.replace(/_/g, " ")}
              </span>
            )}
          </span>
          <ChevronDown
            style={{
              width: 14,
              height: 14,
              color: "#64748b",
              transform: isDropdownOpen ? "rotate(180deg)" : "none",
              transition: "transform 0.2s",
            }}
          />
          {isDropdownOpen && (
            <div style={styles.dropdown}>
              <div
                style={{
                  ...styles.dropdownItem,
                  ...(selectedProjectId === "all" ? styles.dropdownItemActive : {}),
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedProjectId("all");
                  setIsDropdownOpen(false);
                }}
              >
                <span>All Projects</span>
                <span style={styles.dropdownBadge}>{projects.length} total</span>
              </div>
              {projects.map((p) => (
                <div
                  key={p.id}
                  style={{
                    ...styles.dropdownItem,
                    ...(String(selectedProjectId) === String(p.id)
                      ? styles.dropdownItemActive
                      : {}),
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProjectId(String(p.id));
                    setIsDropdownOpen(false);
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{p.project_name}</span>
                  <span style={styles.dropdownBadge}>{p.project_code}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── PERT Network Diagram ── */}
      <div style={styles.pertWrap}>
        {DEPARTMENTS.map((dept, idx) => {
          const deptData = selectedProject?.departments[dept.key];
          const nodeInfo = getNodeStyle(dept, deptData);
          const isLast = idx === DEPARTMENTS.length - 1;
          const progress = deptData?.progress || 0;

          return (
            <div key={dept.key} style={styles.nodeRow}>
              {/* Node */}
              <div style={styles.nodeContainer} title={dept.rounds}>
                {/* Glow ring for active node */}
                {nodeInfo.state === "active" && (
                  <div
                    style={{
                      ...styles.glowRing,
                      borderColor: dept.color.bg,
                      boxShadow: `0 0 0 6px ${dept.color.bg}22`,
                    }}
                    className="animate-pulse"
                  />
                )}

                {/* Main node circle */}
                <div
                  style={{
                    ...styles.nodeCircle,
                    background:
                      nodeInfo.state === "completed"
                        ? dept.color.bg
                        : nodeInfo.state === "active"
                        ? `linear-gradient(135deg, ${dept.color.bg}cc, ${dept.color.bg})`
                        : "#f1f5f9",
                    border: `2.5px solid ${
                      nodeInfo.state === "completed"
                        ? dept.color.bg
                        : nodeInfo.state === "active"
                        ? dept.color.bg
                        : "#cbd5e1"
                    }`,
                    boxShadow:
                      nodeInfo.state !== "pending"
                        ? `0 4px 14px ${dept.color.bg}44`
                        : "0 2px 6px rgba(0,0,0,0.06)",
                  }}
                >
                  {nodeInfo.state === "completed" ? (
                    <CheckCircle2
                      style={{ width: 20, height: 20, color: "#fff" }}
                    />
                  ) : nodeInfo.state === "active" ? (
                    <span style={{ fontSize: 18 }}>{dept.icon}</span>
                  ) : (
                    <Circle
                      style={{ width: 20, height: 20, color: "#94a3b8" }}
                    />
                  )}
                </div>

                {/* Label below node */}
                <div style={styles.nodeLabel}>
                  <span
                    style={{
                      ...styles.nodeName,
                      color:
                        nodeInfo.state !== "pending"
                          ? dept.color.text
                          : "#94a3b8",
                      fontWeight: nodeInfo.state === "active" ? 600 : 500,
                    }}
                  >
                    {dept.label}
                  </span>
                  <span
                    style={{
                      ...styles.nodePercent,
                      color:
                        nodeInfo.state === "completed"
                          ? "#10b981"
                          : nodeInfo.state === "active"
                          ? dept.color.bg
                          : "#94a3b8",
                    }}
                  >
                    {nodeInfo.state === "active" ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <Clock style={{ width: 10, height: 10 }} />
                        {progress}%
                      </span>
                    ) : nodeInfo.state === "completed" ? (
                      "100%"
                    ) : (
                      "—"
                    )}
                  </span>
                </div>

                {/* Arc progress ring for active node */}
                {nodeInfo.state === "active" && (
                  <svg
                    style={styles.progressRing}
                    viewBox="0 0 60 60"
                  >
                    <circle
                      cx="30"
                      cy="30"
                      r="26"
                      fill="none"
                      stroke={dept.color.border}
                      strokeWidth="3"
                    />
                    <circle
                      cx="30"
                      cy="30"
                      r="26"
                      fill="none"
                      stroke={dept.color.bg}
                      strokeWidth="3"
                      strokeDasharray={`${(progress / 100) * 163.4} 163.4`}
                      strokeLinecap="round"
                      transform="rotate(-90 30 30)"
                      style={{ transition: "stroke-dasharray 1s ease" }}
                    />
                  </svg>
                )}
              </div>

              {/* Connector arrow between nodes */}
              {!isLast && (
                <div style={styles.arrowWrap}>
                  <div
                    style={{
                      ...styles.arrowLine,
                      background:
                        progress === 100 ? "#10b981" : "#e2e8f0",
                    }}
                  />
                  <div
                    style={{
                      ...styles.arrowHead,
                      borderLeftColor:
                        progress === 100 ? "#10b981" : "#cbd5e1",
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Overall Progress Bar ── */}
      <div style={styles.overallWrap}>
        <div style={styles.overallLabelRow}>
          <span style={styles.overallLabel}>Overall Pipeline Progress</span>
          <span style={styles.overallPct}>{overallPct}%</span>
        </div>
        <div style={styles.overallTrack}>
          <div
            style={{
              ...styles.overallFill,
              width: `${overallPct}%`,
              background:
                overallPct === 100
                  ? "linear-gradient(90deg, #10b981, #059669)"
                  : overallPct >= 60
                  ? "linear-gradient(90deg, #3b82f6, #2563eb)"
                  : overallPct >= 30
                  ? "linear-gradient(90deg, #f59e0b, #d97706)"
                  : "linear-gradient(90deg, #6366f1, #4f46e5)",
            }}
          />
        </div>

        {/* Legend */}
        <div style={styles.legend}>
          {[
            { dot: "#10b981", label: "Completed" },
            { dot: "#3b82f6", label: "In Progress" },
            { dot: "#cbd5e1", label: "Pending" },
          ].map((l) => (
            <div key={l.label} style={styles.legendItem}>
              <div style={{ ...styles.legendDot, background: l.dot }} />
              <span style={styles.legendText}>{l.label}</span>
            </div>
          ))}
          <div style={styles.legendItem}>
            <div
              style={{
                ...styles.legendDot,
                background: "transparent",
                border: "2px solid #3b82f6",
                borderRadius: "50%",
              }}
            />
            <span style={styles.legendText}>Active (pulsing)</span>
          </div>
        </div>
      </div>

      {/* ── Mini project status grid with pagination ── */}
      {selectedProjectId === "all" && projects.length > 0 && (() => {
        const totalPages = Math.ceil(projects.length / pageSize);
        const start     = (page - 1) * pageSize;
        const paginated = projects.slice(start, start + pageSize);

        return (
          <div style={styles.miniGrid}>
            {/* Grid header with title + page-size selector */}
            <div style={styles.miniGridHeader}>
              <p style={styles.miniGridTitle}>
                All Projects at a Glance
                <span style={styles.miniGridCount}> — {projects.length} projects</span>
              </p>
              <div style={styles.pageSizeWrap}>
                <span style={styles.pageSizeLabel}>Show:</span>
                {[6, 12, 18].map(n => (
                  <button
                    key={n}
                    style={{
                      ...styles.pageSizeBtn,
                      ...(pageSize === n ? styles.pageSizeBtnActive : {}),
                    }}
                    onClick={() => { setPageSize(n); setPage(1); }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Project cards grid */}
            <div style={styles.miniGridItems}>
              {paginated.map((p) => (
                <div
                  key={p.id}
                  style={{
                    ...styles.miniCard,
                    ...(String(selectedProjectId) === String(p.id) ? styles.miniCardActive : {}),
                  }}
                  onClick={() => setSelectedProjectId(String(p.id))}
                  title={`Click to view PERT: ${p.project_name}`}
                >
                  <div style={styles.miniCardHeader}>
                    <span style={styles.miniCardName}>{p.project_name}</span>
                    <span style={{
                      ...styles.miniCardPct,
                      color: p.overall_progress === 100 ? "#10b981"
                        : p.overall_progress >= 60 ? "#3b82f6"
                        : p.overall_progress >= 30 ? "#f59e0b" : "#6366f1"
                    }}>{p.overall_progress}%</span>
                  </div>
                  <div style={styles.miniTrack}>
                    <div
                      style={{
                        ...styles.miniFill,
                        width: `${p.overall_progress}%`,
                        background:
                          p.overall_progress === 100 ? "#10b981"
                          : p.overall_progress >= 60 ? "#3b82f6"
                          : p.overall_progress >= 30 ? "#f59e0b"
                          : "#6366f1",
                      }}
                    />
                  </div>
                  <span style={styles.miniStatus}>
                    {p.project_code} · {p.status?.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div style={styles.paginationRow}>
                <span style={styles.paginationInfo}>
                  Page {page} of {totalPages} · {projects.length} projects
                </span>
                <div style={styles.paginationBtns}>
                  {/* First page */}
                  <button
                    style={{ ...styles.pgBtn, ...(page === 1 ? styles.pgBtnDisabled : {}) }}
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    title="First page"
                  >«</button>
                  {/* Prev */}
                  <button
                    style={{ ...styles.pgBtn, ...(page === 1 ? styles.pgBtnDisabled : {}) }}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    title="Previous"
                  >‹</button>

                  {/* Page number pills */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                    .reduce((acc, n, idx, arr) => {
                      if (idx > 0 && n - arr[idx - 1] > 1) acc.push('...');
                      acc.push(n);
                      return acc;
                    }, [])
                    .map((n, idx) =>
                      n === '...' ? (
                        <span key={`dots-${idx}`} style={styles.pgDots}>…</span>
                      ) : (
                        <button
                          key={n}
                          style={{ ...styles.pgBtn, ...(page === n ? styles.pgBtnActive : {}) }}
                          onClick={() => setPage(n)}
                        >{n}</button>
                      )
                    )
                  }

                  {/* Next */}
                  <button
                    style={{ ...styles.pgBtn, ...(page === totalPages ? styles.pgBtnDisabled : {}) }}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    title="Next"
                  >›</button>
                  {/* Last page */}
                  <button
                    style={{ ...styles.pgBtn, ...(page === totalPages ? styles.pgBtnDisabled : {}) }}
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                    title="Last page"
                  >»</button>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};

// ── Styles (vanilla CSS-in-JS) ──────────────────────────────────────────────
const styles = {
  card: {
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    overflow: "hidden",
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
  },
  cardHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    padding: "16px 20px",
    background: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
  },
  headerLeft: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
  },
  cardTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    fontWeight: 600,
    color: "#1e293b",
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#64748b",
    margin: "2px 0 0 0",
  },
  // Project selector dropdown
  selectorWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: "6px 12px",
    cursor: "pointer",
    minWidth: 200,
    userSelect: "none",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  selectorLabel: {
    display: "flex",
    flexDirection: "column",
    gap: 1,
    fontSize: 13,
    color: "#334155",
    fontWeight: 500,
    flex: 1,
  },
  selectorCode: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: 400,
  },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 6px)",
    right: 0,
    minWidth: 260,
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
    zIndex: 100,
    maxHeight: 280,
    overflowY: "auto",
    padding: "4px 0",
  },
  dropdownItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 14px",
    fontSize: 13,
    color: "#334155",
    cursor: "pointer",
    transition: "background 0.15s",
  },
  dropdownItemActive: {
    background: "#eff6ff",
    color: "#2563eb",
  },
  dropdownBadge: {
    fontSize: 11,
    color: "#94a3b8",
    background: "#f1f5f9",
    borderRadius: 20,
    padding: "1px 7px",
  },
  // PERT network layout
  pertWrap: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 0,
    padding: "32px 24px 16px",
    overflowX: "auto",
  },
  nodeRow: {
    display: "flex",
    alignItems: "center",
    gap: 0,
  },
  nodeContainer: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    width: 90,
  },
  glowRing: {
    position: "absolute",
    top: -4,
    left: "50%",
    transform: "translateX(-50%)",
    width: 60,
    height: 60,
    borderRadius: "50%",
    border: "2px solid",
    pointerEvents: "none",
    zIndex: 0,
  },
  nodeCircle: {
    position: "relative",
    zIndex: 1,
    width: 52,
    height: 52,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.3s ease",
    cursor: "default",
  },
  progressRing: {
    position: "absolute",
    top: -4,
    left: "50%",
    transform: "translateX(-50%)",
    width: 60,
    height: 60,
    pointerEvents: "none",
    zIndex: 2,
  },
  nodeLabel: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    textAlign: "center",
  },
  nodeName: {
    fontSize: 11,
    fontWeight: 500,
    lineHeight: 1.2,
    textAlign: "center",
    maxWidth: 80,
  },
  nodePercent: {
    fontSize: 11,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: 2,
  },
  // Connector arrow between nodes
  arrowWrap: {
    display: "flex",
    alignItems: "center",
    marginTop: -20, // Align with node circles
    paddingBottom: 42, // account for label space
  },
  arrowLine: {
    width: 28,
    height: 2,
    transition: "background 0.3s",
  },
  arrowHead: {
    width: 0,
    height: 0,
    borderTop: "5px solid transparent",
    borderBottom: "5px solid transparent",
    borderLeft: "7px solid #cbd5e1",
    transition: "border-left-color 0.3s",
  },
  // Overall progress
  overallWrap: {
    padding: "0 24px 20px",
  },
  overallLabelRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  overallLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: 500,
  },
  overallPct: {
    fontSize: 13,
    fontWeight: 700,
    color: "#1e293b",
  },
  overallTrack: {
    width: "100%",
    height: 8,
    background: "#f1f5f9",
    borderRadius: 8,
    overflow: "hidden",
    border: "1px solid #e2e8f0",
  },
  overallFill: {
    height: "100%",
    borderRadius: 8,
    transition: "width 1s ease",
  },
  // Legend
  legend: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    marginTop: 12,
    flexWrap: "wrap",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
  },
  legendText: {
    fontSize: 11,
    color: "#64748b",
  },
  // Mini grid
  miniGrid: {
    borderTop: "1px solid #f1f5f9",
    padding: "16px 24px 20px",
    background: "#fafafa",
  },
  miniGridHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    flexWrap: "wrap",
    gap: 8,
  },
  miniGridTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#475569",
    margin: 0,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  miniGridCount: {
    fontWeight: 400,
    color: "#94a3b8",
    textTransform: "none",
    letterSpacing: 0,
  },
  // Page-size selector
  pageSizeWrap: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  pageSizeLabel: {
    fontSize: 11,
    color: "#94a3b8",
    marginRight: 4,
  },
  pageSizeBtn: {
    fontSize: 11,
    fontWeight: 500,
    color: "#64748b",
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 5,
    padding: "3px 8px",
    cursor: "pointer",
    transition: "all 0.15s",
    lineHeight: 1.6,
  },
  pageSizeBtnActive: {
    background: "#3b82f6",
    color: "#fff",
    borderColor: "#3b82f6",
  },
  // Cards grid
  miniGridItems: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: 10,
    marginBottom: 16,
  },
  miniCard: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: "10px 12px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  miniCardActive: {
    border: "1.5px solid #3b82f6",
    background: "#eff6ff",
    boxShadow: "0 0 0 3px rgba(59,130,246,0.10)",
  },
  miniCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  miniCardName: {
    fontSize: 12,
    fontWeight: 600,
    color: "#1e293b",
    lineHeight: 1.3,
    flex: 1,
    marginRight: 6,
  },
  miniCardPct: {
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  miniTrack: {
    width: "100%",
    height: 4,
    background: "#f1f5f9",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 4,
  },
  miniFill: {
    height: "100%",
    borderRadius: 4,
    transition: "width 0.8s ease",
  },
  miniStatus: {
    fontSize: 10,
    color: "#94a3b8",
    textTransform: "capitalize",
    display: "block",
    marginTop: 2,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  // Pagination row
  paginationRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
    paddingTop: 14,
    borderTop: "1px solid #e2e8f0",
  },
  paginationInfo: {
    fontSize: 11,
    color: "#94a3b8",
  },
  paginationBtns: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  pgBtn: {
    minWidth: 30,
    height: 30,
    padding: "0 8px",
    fontSize: 13,
    fontWeight: 500,
    color: "#334155",
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 6,
    cursor: "pointer",
    transition: "all 0.15s",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
  },
  pgBtnActive: {
    background: "#3b82f6",
    color: "#fff",
    borderColor: "#3b82f6",
    fontWeight: 700,
  },
  pgBtnDisabled: {
    opacity: 0.35,
    cursor: "not-allowed",
    pointerEvents: "none",
  },
  pgDots: {
    fontSize: 13,
    color: "#94a3b8",
    padding: "0 4px",
    lineHeight: "30px",
  },
  // Loading / error
  loadingWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 48,
  },
  spinner: {
    width: 28,
    height: 28,
    border: "3px solid #e2e8f0",
    borderTopColor: "#10b981",
    borderRadius: "50%",
  },
  loadingText: {
    fontSize: 13,
    color: "#94a3b8",
  },
  errorWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    padding: 40,
  },
  retryBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: "#3b82f6",
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: 6,
    padding: "5px 12px",
    cursor: "pointer",
  },
};

export default PertChart;
