import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import RootCardForm from "@/components/admin/RootCardForm";

const UniversalNewRootCardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine base path based on current location
  const getBasePath = () => {
    if (location.pathname.startsWith('/admin')) return '/admin/root-cards';
    if (location.pathname.startsWith('/department/quality')) return '/department/quality/root-cards';
    if (location.pathname.startsWith('/department/procurement')) return '/department/procurement/root-cards';
    if (location.pathname.startsWith('/department/inventory')) return '/department/inventory/root-cards';
    if (location.pathname.startsWith('/department/production')) return '/department/production/root-cards';
    if (location.pathname.startsWith('/department')) return '/department/root-cards';
    if (location.pathname.startsWith('/design-engineer')) return '/design-engineer/root-cards';
    return '/department/root-cards';
  };

  const basePath = getBasePath();

  const handleBackToList = () => {
    navigate(basePath);
  };

  const handleCreateSuccess = () => {
    navigate(basePath);
  };

  return (
    <div className="w-full p-4">
      <div className="mb-4">
        <button
          onClick={handleBackToList}
          className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Root Cards
        </button>
      </div>
      <RootCardForm
        mode="create"
        onSubmit={handleCreateSuccess}
        onCancel={handleBackToList}
      />
    </div>
  );
};

export default UniversalNewRootCardPage;
