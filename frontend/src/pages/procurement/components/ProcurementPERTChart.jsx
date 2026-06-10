import React, { useState, useEffect } from "react";
import axios from "../../../utils/api";
import SearchableSelect from "../../../components/ui/SearchableSelect";
import {
  ClipboardList,
  CheckCircle2,
  FileText,
  Send,
  RefreshCw,
  ShoppingCart,
  MessageSquare,
  Package,
  Clock,
  RefreshCw as ResetIcon,
  AlertCircle,
  ArrowRight,
  ArrowLeft
} from "lucide-react";

const STEPS_CONFIG = [
  {
    key: "step1",
    label: "Material Request Received",
    number: 1,
    icon: ClipboardList,
    color: { bg: "linear-gradient(135deg, #3b82f6, #1d4ed8)", light: "#eff6ff", text: "#1d4ed8", glow: "rgba(59, 130, 246, 0.2)" },
    description: "Material request has been generated and received by the procurement team."
  },
  {
    key: "step2",
    label: "Request Approved",
    number: 2,
    icon: CheckCircle2,
    color: { bg: "linear-gradient(135deg, #10b981, #047857)", light: "#f0fdf4", text: "#047857", glow: "rgba(16, 185, 129, 0.2)" },
    description: "Procurement team approved the material request to proceed with sourcing."
  },
  {
    key: "step3",
    label: "RFQ Created",
    number: 3,
    icon: FileText,
    color: { bg: "linear-gradient(135deg, #f59e0b, #b45309)", light: "#fffbeb", text: "#b45309", glow: "rgba(245, 158, 11, 0.2)" },
    description: "Request for Quotation (RFQ) document generated in the system."
  },
  {
    key: "step4",
    label: "RFQ Sent to Vendor",
    number: 4,
    icon: Send,
    color: { bg: "linear-gradient(135deg, #8b5cf6, #6d28d9)", light: "#f5f3ff", text: "#6d28d9", glow: "rgba(139, 92, 246, 0.2)" },
    description: "RFQ document sent to selected vendor email(s) for bidding."
  },
  {
    key: "step5",
    label: "Quotation Received",
    number: 5,
    icon: RefreshCw,
    color: { bg: "linear-gradient(135deg, #14b8a6, #0f766e)", light: "#f0fdfa", text: "#0f766e", glow: "rgba(20, 184, 166, 0.2)" },
    description: "Vendor quotation received and recorded in the system."
  },
  {
    key: "step6",
    label: "Quotation Approved",
    number: 6,
    icon: CheckCircle2,
    color: { bg: "linear-gradient(135deg, #10b981, #047857)", light: "#f0fdf4", text: "#047857", glow: "rgba(16, 185, 129, 0.2)" },
    description: "Best vendor quotation reviewed, compared, and approved by management."
  },
  {
    key: "step7",
    label: "Purchase Order Created",
    number: 7,
    icon: ShoppingCart,
    color: { bg: "linear-gradient(135deg, #6366f1, #4338ca)", light: "#eef2ff", text: "#4338ca", glow: "rgba(99, 102, 241, 0.2)" },
    description: "Purchase Order (PO) created against the approved quotation."
  },
  {
    key: "step8",
    label: "PO Sent to Vendor",
    number: 8,
    icon: Send,
    color: { bg: "linear-gradient(135deg, #ec4899, #be185d)", light: "#fdf2f8", text: "#be185d", glow: "rgba(236, 72, 153, 0.2)" },
    description: "Purchase Order document sent to the vendor via email."
  },
  {
    key: "step9",
    label: "Vendor PO Response",
    number: 9,
    icon: MessageSquare,
    color: { bg: "linear-gradient(135deg, #06b6d4, #0e7490)", light: "#ecfeff", text: "#0e7490", glow: "rgba(6, 182, 212, 0.2)" },
    description: "Vendor response or confirmation received against the Purchase Order."
  },
  {
    key: "step10",
    label: "Sent to Inventory",
    number: 10,
    icon: Package,
    color: { bg: "linear-gradient(135deg, #84cc16, #4d7c0f)", light: "#f7fee7", text: "#4d7c0f", glow: "rgba(132, 204, 22, 0.2)" },
    description: "PO released to the Inventory department for material receipt and GRN."
  }
];

const ProcurementPERTChart = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get("/production/root-cards/all/procurement-pert-details");
      if (res.data && res.data.success) {
        setProjects(res.data.projects || []);
      } else {
        setError("Failed to parse procurement flow details.");
      }
    } catch (err) {
      console.error("Procurement PERT chart fetch error:", err);
      setError("Unable to load procurement flow details.");
    } finally {
      setLoading(false);
    }
  };

  const getAllAverage = () => {
    if (!projects.length) return null;

    const avgSteps = {};
    STEPS_CONFIG.forEach((step) => {
      const totalProgress = projects.reduce((sum, p) => {
        const stepData = p.steps && p.steps[step.number - 1];
        return sum + (stepData ? stepData.progress : 0);
      }, 0);
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
      status: "Procurement Overview",
      overall_progress: totalAvg,
      steps: avgSteps,
    };
  };

  const selectedProject = (() => {
    if (selectedProjectId === "all") {
      return getAllAverage();
    }
    const found = projects.find((p) => String(p.id) === String(selectedProjectId) || String(p.public_id) === String(selectedProjectId));
    if (!found) return null;

    // Map the steps array to key-based object structure matching production PERT
    const stepMap = {};
    STEPS_CONFIG.forEach((s) => {
      const dbStep = found.steps && found.steps[s.number - 1];
      stepMap[s.key] = dbStep || { progress: 0, details: "Awaiting preceding stages" };
    });

    const overallPct = Math.round(
      Object.values(stepMap).reduce((sum, val) => sum + val.progress, 0) / STEPS_CONFIG.length
    );

    return {
      ...found,
      overall_progress: overallPct,
      steps: stepMap
    };
  })();

  const getNodeState = (stepKey) => {
    if (!selectedProject) return "pending";
    const step = selectedProject.steps[stepKey];
    if (!step) return "pending";
    if (step.progress === 100) return "completed";
    if (step.progress > 0) return "active";
    return "pending";
  };



  if (loading) {
    return (
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={styles.cardTitle}>
            <ShoppingCart style={{ width: 18, height: 18, color: "#4f46e5" }} />
            Procurement PERT Flow
          </span>
        </div>
        <div style={styles.loadingWrap}>
          <div className="animate-spin" style={styles.spinner} />
          <span style={styles.loadingText}>Loading procurement workflow progress…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={styles.cardTitle}>
            <ShoppingCart style={{ width: 18, height: 18, color: "#4f46e5" }} />
            Procurement PERT Flow
          </span>
        </div>
        <div style={styles.errorWrap}>
          <AlertCircle style={{ width: 22, height: 22, color: "#ef4444" }} />
          <span style={{ color: "#ef4444", fontSize: 13, fontWeight: 500 }}>{error}</span>
          <button onClick={fetchData} style={styles.retryBtn}>
            <ResetIcon style={{ width: 13, height: 13 }} /> Retry
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
    if (prevProgress > 0) return "#4f46e5";
    return "#cbd5e1";
  };

  return (
    <div style={styles.card}>
      {/* ── Header ── */}
      <div style={styles.cardHeader}>
        <div style={styles.headerLeft}>
          <div style={styles.headerIconBg}>
            <ShoppingCart style={{ width: 20, height: 20, color: "#4f46e5" }} />
          </div>
          <div>
            <span style={styles.cardTitle}>Procurement Flow PERT Chart</span>
            <p style={styles.cardSubtitle}>
              Interactive timeline of sourcing, vendor quotes, purchase orders, and inventory handovers
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
        {/* Row 1: Steps 1-5 (Left to Right) */}
        <div style={styles.row}>
          {STEPS_CONFIG.slice(0, 5).map((step, idx) => {
            const state = getNodeState(step.key);
            const StepIcon = step.icon;
            const progress = selectedProject?.steps[step.key]?.progress || 0;

            return (
              <React.Fragment key={step.key}>
                <div
                  style={styles.node}
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
                        <CheckCircle2 style={{ width: 14, height: 14, color: "#fff" }} />
                      ) : (
                        <StepIcon
                          style={{
                            width: 14,
                            height: 14,
                            color: state === "active" ? "#fff" : "#64748b"
                          }}
                        />
                      )}
                    </div>
                  </div>

                  <span style={{
                    ...styles.nodeLabel,
                    color: state !== "pending" ? "#0f172a" : "#64748b",
                    fontWeight: state === "active" ? 600 : 500
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
                {idx < 4 && (
                  <div style={styles.connector}>
                    <ArrowRight style={{ width: 14, height: 14, color: getLinkColor(step.key, STEPS_CONFIG[idx + 1].key) }} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Row Connector Line (Right side vertical connector from Step 5 to Step 6) */}
        <div style={styles.rowConnector}>
          <div style={{
            ...styles.verticalLine,
            background: getLinkColor("step5", "step6")
          }} />
          <div style={{
            ...styles.verticalArrow,
            borderTopColor: getLinkColor("step5", "step6")
          }} />
        </div>

        {/* Row 2: Steps 6-10 (Right to Left / Reversed layout) */}
        <div style={styles.row}>
          {STEPS_CONFIG.slice(5, 10).reverse().map((step, idx) => {
            const state = getNodeState(step.key);
            const StepIcon = step.icon;
            const progress = selectedProject?.steps[step.key]?.progress || 0;

            const nextLogicalStep = STEPS_CONFIG.find(s => s.number === step.number + 1);
            const linkColor = nextLogicalStep ? getLinkColor(step.key, nextLogicalStep.key) : "#cbd5e1";

            return (
              <React.Fragment key={step.key}>
                <div
                  style={styles.node}
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
                        <CheckCircle2 style={{ width: 14, height: 14, color: "#fff" }} />
                      ) : (
                        <StepIcon
                          style={{
                            width: 14,
                            height: 14,
                            color: state === "active" ? "#fff" : "#64748b"
                          }}
                        />
                      )}
                    </div>
                  </div>

                  <span style={{
                    ...styles.nodeLabel,
                    color: state !== "pending" ? "#0f172a" : "#64748b",
                    fontWeight: state === "active" ? 600 : 500
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
                {idx < 4 && (
                  <div style={styles.connector}>
                    <ArrowLeft style={{ width: 14, height: 14, color: linkColor }} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>



      {/* ── Overall Progress Bar & Legend ── */}
      <div style={styles.overallWrap}>
        <div style={styles.overallLabelRow}>
          <span style={styles.overallLabel}>Overall Procurement Sourcing Progress</span>
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
                  ? "linear-gradient(90deg, #4f46e5, #4338ca)"
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
            { dot: "#4f46e5", label: "In Progress" },
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
                border: "2px solid #4f46e5",
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

const styles = {
  card: {
    background: "rgba(255, 255, 255, 0.9)",
    backdropFilter: "blur(12px)",
    borderRadius: 12,
    border: "1px solid rgba(226, 232, 240, 0.8)",
    overflow: "hidden",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03)",
    marginTop: 12
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    padding: "10px 16px",
    background: "linear-gradient(180deg, #f8fafc, #f1f5f9)",
    borderBottom: "1px solid #e2e8f0",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  headerIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
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
    padding: "14px 16px",
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
    paddingRight: 38,
    margin: "2px 0",
  },
  verticalLine: {
    width: 2.5,
    height: 24,
    marginRight: 0,
    alignSelf: "flex-end",
    transition: "background 0.3s ease",
  },
  verticalArrow: {
    width: 0,
    height: 0,
    borderLeft: "4px solid transparent",
    borderRight: "4px solid transparent",
    borderTop: "6px solid #cbd5e1",
    alignSelf: "flex-end",
    marginRight: -2.8,
    marginTop: -2,
    transition: "border-top-color 0.3s ease",
  },
  node: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: 110,
    cursor: "default",
    padding: "8px 4px",
    borderRadius: 10,
    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
    border: "2px solid transparent",
  },
  circleWrap: {
    position: "relative",
    width: 36,
    height: 36,
    marginBottom: 8,
  },
  glowRing: {
    position: "absolute",
    top: -3,
    left: -3,
    width: 42,
    height: 42,
    borderRadius: "50%",
    border: "2px solid",
    pointerEvents: "none",
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.25s ease",
  },
  nodeLabel: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 1.25,
    height: 28,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    maxWidth: 100,
  },
  nodeProgress: {
    fontSize: 9,
    fontWeight: 700,
    marginTop: 2,
    padding: "0.5px 5px",
    borderRadius: 20,
  },
  connector: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingBottom: 32,
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
  overallWrap: {
    padding: "14px 18px",
    background: "#ffffff",
  },
  overallLabelRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  overallLabel: {
    fontSize: 11.5,
    color: "#64748b",
    fontWeight: 600,
  },
  overallPct: {
    fontSize: 14,
    fontWeight: 800,
    color: "#0f172a",
  },
  overallTrack: {
    height: 8,
    borderRadius: 4,
    background: "#f1f5f9",
    overflow: "hidden",
    marginBottom: 10,
  },
  overallFill: {
    height: "100%",
    borderRadius: 4,
    transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
  },
  legend: {
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
    borderTop: "1px solid #f1f5f9",
    paddingTop: 10,
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
    border: "3px solid rgba(79, 70, 229, 0.1)",
    borderTop: "3px solid #4f46e5",
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

export default ProcurementPERTChart;
