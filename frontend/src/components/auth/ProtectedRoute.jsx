import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * ProtectedRoute component to restrict access based on authentication and roles.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - The component to render if authorized
 * @param {Array<string>} props.allowedRoles - Array of roles allowed to access this route
 * @param {Array<string>} props.allowedDepartments - Array of departments allowed to access this route
 */
const ProtectedRoute = ({ children, allowedRoles, allowedDepartments }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Helper to normalize strings for comparison (lowercase + underscore to space)
  const normalize = (str) => (str || '').toLowerCase().replace(/_/g, ' ');

  // Check roles if specified
  if (allowedRoles && allowedRoles.length > 0) {
    const userRoleNormalized = normalize(user.role);
    const hasRole = allowedRoles.some(role => 
      userRoleNormalized === normalize(role)
    );
    
    if (!hasRole) {
      // If we're already at login, don't redirect again (though this shouldn't happen with children)
      if (location.pathname === '/login') return children;
      return <Navigate to="/login" replace />;
    }
  }

  // Check departments if specified
  if (allowedDepartments && allowedDepartments.length > 0) {
    const userDeptNormalized = normalize(user.department);
    const userRoleNormalized = normalize(user.role);
    
    const hasDept = allowedDepartments.some(dept => {
      const deptNormalized = normalize(dept);
      return userDeptNormalized.includes(deptNormalized) || 
             userRoleNormalized.includes(deptNormalized);
    });
    
    if (!hasDept) {
      if (location.pathname === '/login') return children;
      return <Navigate to="/login" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
