import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RoleDashboardLayout from './RoleDashboardLayout';
import axios from '@/utils/api';
import {
  Wrench,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  BarChart3,
} from 'lucide-react';

// Dashboard
import DesignEngineerDashboard from '../../pages/roles/DesignEngineerDashboard';

// Drawings
import DesignDrawingManagement from '../../pages/design-engineer/DesignDrawingManagement';

// QAP Review
import DesignQAPReviewPage from '../../pages/design-engineer/DesignQAPReviewPage';

// Tasks
import MyTasksPage from '../../pages/design-engineer/tasks/MyTasksPage';
import ProjectTasksPage from '../../pages/design-engineer/tasks/ProjectTasksPage';
import TaskDetailPage from '../../pages/design-engineer/tasks/TaskDetailPage';

// Reports
import DesignEngineerReportsPage from '../../pages/design-engineer/DesignEngineerReportsPage';

// Project Details
import UniversalRootCardsPage from '../../pages/shared/UniversalRootCardsPage';
import UniversalRootCardDetailPage from '../../pages/shared/UniversalRootCardDetailPage';
import UniversalNewRootCardPage from '../../pages/shared/UniversalNewRootCardPage';

const navigationItems = [
  {
    title: 'Dashboard',
    path: '/design-engineer/dashboard',
    icon: Wrench,
  },
  {
    title: 'Root Cards',
    path: '/design-engineer/root-cards',
    icon: FileText,
  },
  {
    title: 'Drawing Management',
    path: '/design-engineer/drawings',
    icon: FileText,
  },
  {
    title: 'QAP Review',
    path: '/design-engineer/qap-review',
    icon: CheckCircle,
  },
  {
    title: 'Engineering Tasks',
    icon: Clock,
    submenu: [
      { title: 'My Tasks', path: '/design-engineer/tasks/list', icon: Clock },
      { title: 'Project Tasks', path: '/design-engineer/tasks/projects', icon: Wrench },
    ]
  },
  {
    title: 'Reports',
    path: '/design-engineer/reports',
    icon: BarChart3,
  },
];

const DesignEngineerLayout = () => {
  const [qapReviewCount, setQapReviewCount] = useState(0);

  useEffect(() => {
    const fetchQapCount = async () => {
      try {
        const response = await axios.get('/root-cards', { 
          params: { assignedOnly: true } 
        });
        const pendingCount = (response.data.rootCards || []).filter(rc => 
          rc.status === 'DESIGN_QAP_REVIEW'
        ).length;
        setQapReviewCount(pendingCount);
      } catch (error) {
        console.error("Error fetching QAP count:", error);
      }
    };

    fetchQapCount();
    const interval = setInterval(fetchQapCount, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const dynamicNavigation = navigationItems.map(item => {
    if (item.title === 'QAP Review' && qapReviewCount > 0) {
      return { ...item, badge: qapReviewCount };
    }
    return item;
  });

  return (
    <RoleDashboardLayout
      roleNavigation={dynamicNavigation}
      roleName="Design Engineer"
      roleIcon={Wrench}
    >
      <Routes>
        <Route path="dashboard" element={<DesignEngineerDashboard />} />
        <Route path="root-cards" element={<UniversalRootCardsPage />} />
        <Route path="root-cards/new-root-card" element={<UniversalNewRootCardPage />} />
        <Route path="root-cards/:id" element={<UniversalRootCardDetailPage />} />
        
        {/* Drawings Routes */}
        <Route path="drawings" element={<DesignDrawingManagement />} />
        
        {/* QAP Review Route */}
        <Route path="qap-review" element={<DesignQAPReviewPage />} />
        
        {/* Tasks Routes */}
        <Route path="tasks/list" element={<MyTasksPage />} />
        <Route path="tasks/projects" element={<ProjectTasksPage />} />
        <Route path="tasks/detail/:taskId" element={<TaskDetailPage />} />
        
        {/* Reports Route */}
        <Route path="reports" element={<DesignEngineerReportsPage />} />
        
        <Route path="*" element={<Navigate to="/design-engineer/dashboard" replace />} />
      </Routes>
    </RoleDashboardLayout>
  );
};

export default DesignEngineerLayout;
