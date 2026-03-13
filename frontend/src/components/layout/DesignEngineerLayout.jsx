import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RoleDashboardLayout from './RoleDashboardLayout';
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
  return (
    <RoleDashboardLayout
      roleNavigation={navigationItems}
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
