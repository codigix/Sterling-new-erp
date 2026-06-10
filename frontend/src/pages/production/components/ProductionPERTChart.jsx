import React, { useState, useEffect } from "react";
import axios from "../../../utils/api";
import SearchableSelect from "../../../components/ui/SearchableSelect";
import {
  Layers,
  ShoppingCart,
  Package,
  Sliders,
  Factory,
  Search,
  ClipboardCheck,
  Palette,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  ArrowLeft
} from "lucide-react";

const STEPS_CONFIG = [
  {
    key: "step1",
    label: "BOM Creation",
    number: 1,
    icon: Layers,
    color: { bg: "linear-gradient(135deg, #0ea5e9, #0284c7)", light: "#f0f9ff", text: "#0284c7", glow: "rgba(14, 165, 233, 0.2)" },
    description: "Bill of Materials (BOM) created for the route card/project."
  },
  {
    key: "step2",
    label: "Material Request",
    number: 2,
    icon: ShoppingCart,
    color: { bg: "linear-gradient(135deg, #f59e0b, #d97706)", light: "#fffbeb", text: "#d97706", glow: "rgba(245, 158, 11, 0.2)" },
    description: "Material request sent to the Procurement department."
  },
  {
    key: "step3",
    label: "Material Release",
    number: 3,
    icon: Package,
    color: { bg: "linear-gradient(135deg, #10b981, #059669)", light: "#f0fdf4", text: "#059669", glow: "rgba(16, 185, 129, 0.2)" },
    description: "Materials released by Inventory/Procurement and received in Production."
  },
  {
    key: "step4",
    label: "Operation Selection",
    number: 4,
    icon: Sliders,
    color: { bg: "linear-gradient(135deg, #8b5cf6, #7c3aed)", light: "#f5f3ff", text: "#7c3aed", glow: "rgba(139, 92, 246, 0.2)" },
    description: "Production operations and routing selected for Phase 1 & Phase 2."
  },
  {
    key: "step5",
    label: "Phase 1 Execution",
    number: 5,
    icon: Factory,
    color: { bg: "linear-gradient(135deg, #ec4899, #db2777)", light: "#fdf2f8", text: "#db2777", glow: "rgba(236, 72, 153, 0.2)" },
    description: "Phase 1 fabrication operations (Cutting, Welding, etc.) executed."
  },
  {
    key: "step6",
    label: "Quality Handover 1",
    number: 6,
    icon: Search,
    color: { bg: "linear-gradient(135deg, #14b8a6, #0d9488)", light: "#f0fdfa", text: "#0d9488", glow: "rgba(20, 184, 166, 0.2)" },
    description: "Project fabrication sent to Quality department for Phase 1 testing."
  },
  {
    key: "step7",
    label: "Quality Report 1",
    number: 7,
    icon: ClipboardCheck,
    color: { bg: "linear-gradient(135deg, #3b82f6, #2563eb)", light: "#eff6ff", text: "#2563eb", glow: "rgba(59, 130, 246, 0.2)" },
    description: "Phase 1 Quality Test Report approved and received in Production."
  },
  {
    key: "step8",
    label: "Phase 2 Execution",
    number: 8,
    icon: Palette,
    color: { bg: "linear-gradient(135deg, #a855f7, #9333ea)", light: "#faf5ff", text: "#9333ea", glow: "rgba(168, 85, 247, 0.2)" },
    description: "Phase 2 operations (Painting, Sand Blasting, Surface Prep, etc.) executed."
  },
  {
    key: "step9",
    label: "Quality Handover 2",
    number: 9,
    icon: Search,
    color: { bg: "linear-gradient(135deg, #06b6d4, #0891b2)", light: "#ecfeff", text: "#0891b2", glow: "rgba(6, 182, 212, 0.2)" },
    description: "Project painting/finishing sent to Quality department for final testing."
  },
  {
    key: "step10",
    label: "Quality Report 2",
    number: 10,
    icon: ClipboardCheck,
    color: { bg: "linear-gradient(135deg, #84cc16, #65a30d)", light: "#f7fee7", text: "#65a30d", glow: "rgba(132, 204, 22, 0.2)" },
    description: "Final Phase 2 Quality Test Report approved and available."
  },
  {
    key: "step11",
    label: "Ready for Shipment",
    number: 11,
    icon: CheckCircle2,
    color: { bg: "linear-gradient(135deg, #10b981, #059669)", light: "#f0fdf4", text: "#059669", glow: "rgba(16, 185, 129, 0.2)" },
    description: "Project execution complete, final QC approved, ready for shipment."
  }
];

const ProductionPERTChart = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStep, setSelectedStep] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get("/production/root-cards/all/pert-details");
      if (res.data && res.data.success) {
        setProjects(res.data.projects || []);
      } else {
        setError("Failed to parse production flow details.");
      }
    } catch (err) {
      console.error("PERT chart fetch error:", err);
      setError("Unable to load production flow details.");
    } finally {
      setLoading(false);
    }
  };

  const getAllAverage = () => {
    if (!projects.length) return null;

    const avgSteps = {};
    STEPS_CONFIG.forEach((step) => {
      const totalProgress = projects.reduce((sum, p) => sum + (p.steps[step.key]?.progress || 0), 0);
      const avg = Math.round(totalProgress / projects.length);
      avgSteps[step.key] = {
        progress: avg,
        details: `Average progress across ${projects.length} active projects.`
      };
    });

    const totalAvg = Math.round(
      Object.values(avgSteps).reduce((sum, val) => sum + val.progress, 0) / STEPS_CONFIG.length
    );

    return {
      id: "all",
      project_name: "All Active Projects",
      project_code: `${projects.length} projects`,
      status: "Production Overview",
      overall_progress: totalAvg,
      steps: avgSteps,
      raw: null
    };
  };

  const selectedProject =
    selectedProjectId === "all"
      ? getAllAverage()
      : projects.find((p) => String(p.id) === String(selectedProjectId) || String(p.public_id) === String(selectedProjectId));

  const getNodeState = (stepKey) => {
    if (!selectedProject) return "pending";
    const step = selectedProject.steps[stepKey];
    if (!step) return "pending";
    if (step.progress === 100) return "completed";
    if (step.progress > 0) return "active";
    return "pending";
  };

  useEffect(() => {
    if (selectedProject) {
      setSelectedStep(STEPS_CONFIG[0].key);
    }
  }, [selectedProjectId, projects]);

  if (loading) {
    return (
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={styles.cardTitle}>
            <Factory style={{ width: 18, height: 18, color: "#f97316" }} />
            Production PERT Flow
          </span>
        </div>
        <div style={styles.loadingWrap}>
          <div className="animate-spin" style={styles.spinner} />
          <span style={styles.loadingText}>Loading production workflow progress…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={styles.cardTitle}>
            <Factory style={{ width: 18, height: 18, color: "#f97316" }} />
            Production PERT Flow
          </span>
        </div>
        <div style={styles.errorWrap}>
          <AlertCircle style={{ width: 22, height: 22, color: "#ef4444" }} />
          <span style={{ color: "#ef4444", fontSize: 13, fontWeight: 500 }}>{error}</span>
          <button onClick={fetchData} style={styles.retryBtn}>
            <RefreshCw style={{ width: 13, height: 13 }} /> Retry
          </button>
        </div>
      </div>
    );
  }

  const dropdownOptions = [
    { value: "all", label: "All Active Projects", subLabel: `${projects.length} active` },
    ...projects.map((p) => ({
      value: String(p.id),
      label: p.project_name || "Unnamed Project",
      subLabel: p.project_code || `ID: ${p.id}`
    }))
  ];

  const overallPct = selectedProject?.overall_progress || 0;

  const getLinkColor = (prevStepKey, nextStepKey) => {
    const prevProgress = selectedProject?.steps[prevStepKey]?.progress || 0;
    const nextProgress = selectedProject?.steps[nextStepKey]?.progress || 0;
    if (prevProgress === 100 && nextProgress === 100) return "#10b981";
    if (prevProgress > 0) return "#3b82f6";
    return "#cbd5e1";
  };

  return (
    <div style={styles.card}>
      {/* ── Header ── */}
      <div style={styles.cardHeader}>
        <div style={styles.headerLeft}>
          <div style={styles.headerIconBg}>
            <Factory style={{ width: 20, height: 20, color: "#f97316" }} />
          </div>
          <div>
            <span style={styles.cardTitle}>Production Flow PERT Chart</span>
            <p style={styles.cardSubtitle}>
              Interactive timeline of project execution stages and Quality controls
            </p>
          </div>
        </div>

        {/* Project Selector */}
        <div style={{ minWidth: 260 }}>
          <SearchableSelect
            options={dropdownOptions}
            value={selectedProjectId}
            onChange={(val) => setSelectedProjectId(val || "all")}
            placeholder="Search & Select Project..."
          />
        </div>
      </div>

      {/* ── PERT Layout (Snake S-Curve) ── */}
      <div style={styles.pertContainer}>
        {/* Row 1: Steps 1-6 (Left to Right) */}
        <div style={styles.row}>
          {STEPS_CONFIG.slice(0, 6).map((step, idx) => {
            const state = getNodeState(step.key);
            const StepIcon = step.icon;
            const progress = selectedProject?.steps[step.key]?.progress || 0;
            const isSelected = selectedStep === step.key;

            return (
              <React.Fragment key={step.key}>
                <div
                  style={{
                    ...styles.node,
                    background: isSelected ? "rgba(241, 245, 249, 0.9)" : "transparent",
                    boxShadow: isSelected ? `0 0 0 1px ${step.color.text}44, 0 10px 15px -3px rgba(0,0,0,0.05)` : "none",
                    transform: isSelected ? "translateY(-4px)" : "none",
                  }}
                  onClick={() => setSelectedStep(step.key)}
                >
                  {/* Circle container */}
                  <div style={styles.circleWrap}>
                    {state === "active" && (
                      <div
                        style={{
                          ...styles.glowRing,
                          borderColor: step.color.text,
                          boxShadow: `0 0 0 6px ${step.color.text}1a`,
                        }}
                        className="animate-pulse"
                      />
                    )}
                    <div
                      style={{
                        ...styles.circle,
                        background:
                          state === "completed"
                            ? step.color.bg
                            : state === "active"
                            ? step.color.bg
                            : "#ffffff",
                        border: `2px solid ${
                          state === "completed"
                            ? "#059669"
                            : state === "active"
                            ? step.color.text
                            : "#cbd5e1"
                        }`,
                        boxShadow: state !== "pending" ? `0 4px 10px ${step.color.glow}` : "none"
                      }}
                    >
                      {state === "completed" ? (
                        <CheckCircle2 style={{ width: 18, height: 18, color: "#fff" }} />
                      ) : (
                        <StepIcon
                          style={{
                            width: 18,
                            height: 18,
                            color: state === "active" ? "#fff" : "#64748b"
                          }}
                        />
                      )}
                    </div>
                  </div>

                  <span style={{
                    ...styles.nodeLabel,
                    color: state !== "pending" ? "#0f172a" : "#64748b",
                    fontWeight: state === "active" || isSelected ? 600 : 500
                  }}>
                    {step.label}
                  </span>
                  <span style={{
                    ...styles.nodeProgress,
                    background: state === "completed" ? "#d1fae5" : state === "active" ? "#dbeafe" : "#f1f5f9",
                    color: state === "completed" ? "#065f46" : state === "active" ? "#1e40af" : "#64748b"
                  }}>
                    {progress}%
                  </span>
                </div>
                {idx < 5 && (
                  <div style={styles.connector}>
                    <ArrowRight style={{ width: 16, height: 16, color: getLinkColor(step.key, STEPS_CONFIG[idx + 1].key) }} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Row Connector Line (Right side vertical connector from Step 6 to Step 7) */}
        <div style={styles.rowConnector}>
          <div style={{
            ...styles.verticalLine,
            background: getLinkColor("step6", "step7")
          }} />
          <div style={{
            ...styles.verticalArrow,
            borderTopColor: getLinkColor("step6", "step7")
          }} />
        </div>

        {/* Row 2: Steps 7-11 (Right to Left / Reversed layout) with a dummy spacer on far left for alignment */}
        <div style={styles.row}>
          {/* Col 1 spacer */}
          <div style={{ ...styles.node, cursor: "default", opacity: 0, pointerEvents: "none" }} />

          {STEPS_CONFIG.slice(6, 11).reverse().map((step) => {
            const state = getNodeState(step.key);
            const StepIcon = step.icon;
            const progress = selectedProject?.steps[step.key]?.progress || 0;
            const isSelected = selectedStep === step.key;

            const nextLogicalStep = STEPS_CONFIG.find(s => s.number === step.number + 1);
            const linkColor = nextLogicalStep ? getLinkColor(step.key, nextLogicalStep.key) : "#cbd5e1";

            return (
              <React.Fragment key={step.key}>
                {/* Connector pointing to the left */}
                <div style={styles.connector}>
                  <ArrowLeft style={{ width: 16, height: 16, color: linkColor }} />
                </div>

                <div
                  style={{
                    ...styles.node,
                    background: isSelected ? "rgba(241, 245, 249, 0.9)" : "transparent",
                    boxShadow: isSelected ? `0 0 0 1px ${step.color.text}44, 0 10px 15px -3px rgba(0,0,0,0.05)` : "none",
                    transform: isSelected ? "translateY(-4px)" : "none",
                  }}
                  onClick={() => setSelectedStep(step.key)}
                >
                  {/* Circle container */}
                  <div style={styles.circleWrap}>
                    {state === "active" && (
                      <div
                        style={{
                          ...styles.glowRing,
                          borderColor: step.color.text,
                          boxShadow: `0 0 0 6px ${step.color.text}1a`,
                        }}
                        className="animate-pulse"
                      />
                    )}
                    <div
                      style={{
                        ...styles.circle,
                        background:
                          state === "completed"
                            ? step.color.bg
                            : state === "active"
                            ? step.color.bg
                            : "#ffffff",
                        border: `2px solid ${
                          state === "completed"
                            ? "#059669"
                            : state === "active"
                            ? step.color.text
                            : "#cbd5e1"
                        }`,
                        boxShadow: state !== "pending" ? `0 4px 10px ${step.color.glow}` : "none"
                      }}
                    >
                      {state === "completed" ? (
                        <CheckCircle2 style={{ width: 18, height: 18, color: "#fff" }} />
                      ) : (
                        <StepIcon
                          style={{
                            width: 18,
                            height: 18,
                            color: state === "active" ? "#fff" : "#64748b"
                          }}
                        />
                      )}
                    </div>
                  </div>

                  <span style={{
                    ...styles.nodeLabel,
                    color: state !== "pending" ? "#0f172a" : "#64748b",
                    fontWeight: state === "active" || isSelected ? 600 : 500
                  }}>
                    {step.label}
                  </span>
                  <span style={{
                    ...styles.nodeProgress,
                    background: state === "completed" ? "#d1fae5" : state === "active" ? "#dbeafe" : "#f1f5f9",
                    color: state === "completed" ? "#065f46" : state === "active" ? "#1e40af" : "#64748b"
                  }}>
                    {progress}%
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── Overall Progress Bar & Legend ── */}
      <div style={styles.overallWrap}>
        <div style={styles.overallLabelRow}>
          <span style={styles.overallLabel}>Overall Production Execution Progress</span>
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
            <span style={styles.legendText}>Active Phase (pulsing)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Styles (vanilla CSS-in-JS) ──────────────────────────────────────────────
const styles = {
  card: {
    background: "rgba(255, 255, 255, 0.9)",
    backdropFilter: "blur(12px)",
    borderRadius: 16,
    border: "1px solid rgba(226, 232, 240, 0.8)",
    overflow: "hidden",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03)",
    marginTop: 24
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
    padding: "18px 24px",
    background: "linear-gradient(180deg, #f8fafc, #f1f5f9)",
    borderBottom: "1px solid #e2e8f0",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  headerIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: "#fff",
    border: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 5px rgba(0,0,0,0.03)",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#0f172a",
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#64748b",
    margin: "3px 0 0 0",
  },
  pertContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "32px 24px",
    overflowX: "auto",
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 1020,
    minWidth: 900,
  },
  rowConnector: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    maxWidth: 1020,
    minWidth: 900,
    paddingRight: 48,
    margin: "4px 0",
  },
  verticalLine: {
    width: 3,
    height: 32,
    marginRight: 0,
    alignSelf: "flex-end",
    transition: "background 0.3s ease",
  },
  verticalArrow: {
    width: 0,
    height: 0,
    borderLeft: "5px solid transparent",
    borderRight: "5px solid transparent",
    borderTop: "7px solid #cbd5e1",
    alignSelf: "flex-end",
    marginRight: -3.5,
    marginTop: -2,
    transition: "border-top-color 0.3s ease",
  },
  node: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: 110,
    cursor: "pointer",
    padding: "12px 6px",
    borderRadius: 12,
    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
    border: "2px solid transparent",
  },
  circleWrap: {
    position: "relative",
    width: 48,
    height: 48,
    marginBottom: 10,
  },
  glowRing: {
    position: "absolute",
    top: -3,
    left: -3,
    width: 54,
    height: 54,
    borderRadius: "50%",
    border: "2.5px solid",
    pointerEvents: "none",
  },
  circle: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.25s ease",
  },
  nodeLabel: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 1.3,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    maxWidth: 100,
  },
  nodeProgress: {
    fontSize: 10,
    fontWeight: 700,
    marginTop: 4,
    padding: "1px 6px",
    borderRadius: 20,
  },
  connector: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingBottom: 40,
  },
  detailsArea: {
    background: "#f8fafc",
    padding: "20px 24px",
    borderBottom: "1px solid #e2e8f0",
  },
  detailsHeader: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  detailsIcon: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#0f172a",
    margin: 0,
  },
  detailsDesc: {
    fontSize: 12,
    color: "#475569",
    margin: "3px 0 0 0",
  },
  insightsArea: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 16,
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02)",
  },
  insightHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    borderBottom: "1px dashed #f1f5f9",
    paddingBottom: 8,
  },
  insightTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#1e3a8a",
  },
  insightContent: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  insightText: {
    fontSize: 12,
    color: "#334155",
    margin: 0,
    lineHeight: 1.5,
  },
  rawDetailsList: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: "1px dashed #e2e8f0",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  rawTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  rawItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 10px",
    background: "#f8fafc",
    border: "1px solid #f1f5f9",
    borderRadius: 6,
    fontSize: 12,
  },
  badge: {
    padding: "2px 8px",
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 600,
    textTransform: "capitalize",
  },
  opsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 8,
    marginTop: 6,
  },
  opItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#f8fafc",
    border: "1px solid #f1f5f9",
    padding: "6px 10px",
    borderRadius: 6,
    fontSize: 12,
  },
  overallWrap: {
    padding: "24px",
    background: "#ffffff",
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
    fontWeight: 600,
  },
  overallPct: {
    fontSize: 15,
    fontWeight: 800,
    color: "#0f172a",
  },
  overallTrack: {
    height: 10,
    borderRadius: 5,
    background: "#f1f5f9",
    overflow: "hidden",
    marginBottom: 16,
  },
  overallFill: {
    height: "100%",
    borderRadius: 5,
    transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  legend: {
    display: "flex",
    flexWrap: "wrap",
    gap: 20,
    borderTop: "1px solid #f1f5f9",
    paddingTop: 12,
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
  },
  legendDotPulse: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    border: "2.5px solid #3b82f6",
    background: "transparent",
  },
  legendText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: 500,
  },
  loadingWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 60,
    gap: 14,
  },
  spinner: {
    width: 28,
    height: 28,
    border: "3px solid rgba(249, 115, 22, 0.1)",
    borderTop: "3px solid #f97316",
    borderRadius: "50%",
  },
  loadingText: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: 500,
  },
  errorWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: 40,
    gap: 12,
  },
  retryBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 16px",
    background: "#fff",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    fontSize: 12,
    color: "#334155",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
    transition: "all 0.2s ease",
  }
};

export default ProductionPERTChart;
