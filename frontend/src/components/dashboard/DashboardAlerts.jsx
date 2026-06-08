import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from '../../utils/api';
import { AlertTriangle, X, ArrowRight } from 'lucide-react';

const DashboardAlerts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const fetchAlerts = async () => {
      if (!user) return;
      try {
        const response = await axios.get(
          `/notifications?userId=${user.id}&department=${user.department}&role=${user.role}`
        );
        const notifs = response.data.notifications || [];
        // Filter for unread notifications of type 'warning' or with title containing 'Deadline'
        const warningAlerts = notifs.filter(
          (n) => !n.read_status && (n.type === 'warning' || n.alert_type === 'warning' || n.title?.toLowerCase().includes('deadline'))
        );
        setAlerts(warningAlerts);
      } catch (error) {
        console.error('Error fetching dashboard alerts:', error);
      }
    };

    fetchAlerts();
    // Poll alerts every 60 seconds
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const handleDismiss = async (e, id) => {
    e.stopPropagation();
    try {
      await axios.put(`/notifications/${id}/read`);
      setAlerts(alerts.filter((alert) => alert.id !== id));
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const handleAlertClick = async (alert) => {
    try {
      await axios.put(`/notifications/${alert.id}/read`);
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
    if (alert.link) {
      navigate(alert.link);
    }
  };

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3 mb-6 w-full animate-in fade-in duration-300">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          onClick={() => handleAlertClick(alert)}
          className="relative flex items-start justify-between p-4 bg-amber-50 dark:bg-amber-955/20 border-l-4 border-amber-500 rounded-r shadow-sm hover:shadow-md cursor-pointer transition duration-150"
        >
          <div className="flex gap-3 pr-8">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                {alert.title || 'Timeline Alert'}
              </h4>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                {alert.message}
              </p>
              {alert.link && (
                <div className="flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 hover:text-amber-900 mt-2">
                  <span>Take action</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          </div>
          <button
            onClick={(e) => handleDismiss(e, alert.id)}
            className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 p-1 hover:bg-amber-100/50 dark:hover:bg-amber-955/40 rounded transition"
            title="Dismiss Alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default DashboardAlerts;
