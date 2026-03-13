import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from '@/utils/api';
import { showSuccess, showError } from '@/utils/toastUtils';
import RootCardList from '@/components/admin/RootCardList/RootCardList';

const UniversalRootCardsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine base path based on current location (admin, department, design-engineer)
  const getBasePath = () => {
    if (location.pathname.startsWith('/admin')) return '/admin/root-cards';
    if (location.pathname.startsWith('/department')) return '/department/root-cards';
    if (location.pathname.startsWith('/design-engineer')) return '/design-engineer/root-cards';
    return '/department/root-cards'; // default
  };

  const basePath = getBasePath();

  const handleViewRootCard = (order) => {
    navigate(`${basePath}/${order.id}?mode=view`);
  };

  const handleEditRootCard = (order) => {
    navigate(`${basePath}/${order.id}?mode=edit`);
  };

  const handleSendToDesignEngineering = async (order) => {
    try {
      const response = await axios.post(`/root-cards/${order.id}/send-to-design-engineering`);
      showSuccess(`Root card sent to Design Engineering Department. Notifications sent to ${response.data.notificationsSent} design engineers.`);
    } catch (error) {
      console.error('Error sending to Design Engineering:', error);
      showError(error.response?.data?.message || 'Failed to send root card to Design Engineering');
    }
  };

  const handleSendToProduction = async (order) => {
    try {
      const response = await axios.post(`/root-cards/${order.id}/send-to-production`);
      showSuccess(`Root card sent to Production Department.`);
    } catch (error) {
      console.error('Error sending to Production:', error);
      showError(error.response?.data?.message || 'Failed to send root card to Production');
    }
  };

  return (
    <div className="w-full">
      <RootCardList
        onCreateNew={() => navigate(`${basePath}/new-root-card`)}
        onViewRootCard={handleViewRootCard}
        onEditRootCard={handleEditRootCard}
        onSendToDesignEngineering={location.pathname.startsWith('/admin') ? handleSendToDesignEngineering : undefined}
        onSendToProduction={location.pathname.startsWith('/design-engineer') ? handleSendToProduction : undefined}
      />
    </div>
  );
};

export default UniversalRootCardsPage;
