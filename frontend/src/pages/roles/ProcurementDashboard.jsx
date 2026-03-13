import React, { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Link, Routes, Route, Navigate } from "react-router-dom";
import axios from "../../utils/api";
import {
  Package,
  Truck,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Boxes,
  RefreshCw,
  Download,
  Clock,
  BarChart3,
  FileText,
  Loader2,
  ClipboardList,
  Activity,
  ShoppingCart,
  Layers
} from "lucide-react";

// Lazy load sub-pages
const MaterialRequestsPage = lazy(() => import("../production/MaterialRequestsPage"));
const QuotationsPage = lazy(() => import("../inventory/QuotationsPage"));
const PurchaseOrderPage = lazy(() => import("../inventory/PurchaseOrderPage"));
const PurchaseOrderDetailPage = lazy(() => import("../inventory/PurchaseOrderDetailPage"));
const PurchaseOrderEditPage = lazy(() => import("../inventory/PurchaseOrderEditPage"));
const VendorsPage = lazy(() => import("../inventory/VendorsPage"));
const ProcurementTasksPage = lazy(() => import("../procurement/ProcurementTasksPage"));
const UniversalRootCardsPage = lazy(() => import("../shared/UniversalRootCardsPage"));
const UniversalRootCardDetailPage = lazy(() => import("../shared/UniversalRootCardDetailPage"));

const ProcurementDashboard = () => {
  const navigationItems = React.useMemo(() => [
    {
      title: "Dashboard",
      path: "/department/procurement/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Root Cards",
      path: "/department/procurement/root-cards",
      icon: Layers,
    },
    {
      title: "Material Requests",
      path: "/department/procurement/material-requests",
      icon: ClipboardList,
    },
    {
      title: "Quotations",
      path: "/department/procurement/quotations",
      icon: FileText,
    },
    {
      title: "Purchase Orders",
      path: "/department/procurement/purchase-orders",
      icon: ShoppingCart,
    },
    {
      title: "Vendors",
      path: "/department/procurement/vendors",
      icon: Truck,
    },
  ], []);

  return (
    <div className="p-0">
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        </div>
      }>
        <Routes>
          <Route path="/" element={<ProcurementTasksPage />} />
          <Route path="dashboard" element={<ProcurementTasksPage />} />
          <Route path="root-cards" element={<UniversalRootCardsPage />} />
          <Route path="root-cards/:id" element={<UniversalRootCardDetailPage />} />
          <Route path="material-requests" element={<MaterialRequestsPage />} />
          <Route path="vendors" element={<VendorsPage />} />
          <Route path="quotations" element={<Navigate to="sent" replace />} />
          <Route path="quotations/sent" element={<QuotationsPage defaultTab="outbound" />} />
          <Route path="quotations/received" element={<QuotationsPage defaultTab="inbound" />} />
          <Route path="purchase-orders" element={<PurchaseOrderPage />} />
          <Route path="purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
          <Route path="purchase-orders/edit/:id" element={<PurchaseOrderEditPage />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
};

import { LayoutDashboard } from "lucide-react";

export default ProcurementDashboard;
