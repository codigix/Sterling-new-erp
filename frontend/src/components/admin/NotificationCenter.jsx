import React, { useState, useEffect } from 'react';
import axios from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './NotificationCenter.css';

const NotificationCenter = ({ onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const response = await axios.get('notifications', {
        params: {
          userId: user.id,
          department: user.department,
          role: user.role
        }
      });
      setNotifications(response.data.notifications || []);
      
      const unread = (response.data.notifications || []).filter(n => !n.read_status).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read_status) {
      await markAsRead(notification.id);
    }
    
    if (notification.link) {
      navigate(notification.link);
      onClose();
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`notifications/${notificationId}/read`, {});
      // Update local state to avoid full re-fetch
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, read_status: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put('notifications/mark-all-read', {
        userId: user.id,
        department: user.department,
        role: user.role
      });
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (e, notificationId) => {
    e.stopPropagation();
    try {
      await axios.delete(`notifications/${notificationId}`);
      fetchNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'success': return '✓';
      case 'warning': return '⚠';
      case 'error': return '✕';
      case 'alert': return '!';
      default: return 'ℹ';
    }
  };

  const getNotificationColor = (type) => {
    switch(type) {
      case 'success': return '#4CAF50';
      case 'warning': return '#FF9800';
      case 'error': return '#F44336';
      case 'alert': return '#F44336';
      default: return '#2196F3';
    }
  };

  return (
    <div className="notification-center">
      <div className="notification-header">
        <h2>Notifications ({unreadCount})</h2>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      {unreadCount > 0 && (
        <button className="mark-all-btn" onClick={markAllAsRead}>
          Mark All as Read
        </button>
      )}

      <div className="notifications-list">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="no-notifications">No notifications</div>
        ) : (
          notifications.map(notification => (
            <div 
              key={notification.id} 
              className={`notification-item ${!notification.read_status ? 'unread' : ''}`}
              onClick={() => handleNotificationClick(notification)}
              style={{ cursor: notification.link ? 'pointer' : 'default' }}
            >
              <div 
                className="notification-icon"
                style={{ backgroundColor: getNotificationColor(notification.type) }}
              >
                {getNotificationIcon(notification.type)}
              </div>
              <div className="notification-content">
                <p>{notification.message}</p>
                <small>{new Date(notification.created_at).toLocaleString()}</small>
              </div>
              <div className="notification-actions">
                {!notification.read_status && (
                  <button 
                    className="read-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(notification.id);
                    }}
                  >
                    Mark Read
                  </button>
                )}
                <button 
                  className="delete-btn"
                  onClick={(e) => deleteNotification(e, notification.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
