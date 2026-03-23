const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

router.get('/', notificationController.getNotifications);
router.get('/user/:userId', (req, res) => {
  req.query.userId = req.params.userId;
  notificationController.getNotifications(req, res);
});
router.post('/', notificationController.createNotification);
router.put('/mark-all-read', notificationController.markAllAsRead);
router.patch('/mark-all/read', notificationController.markAllAsRead); // For NotificationCenter.jsx compatibility
router.put('/:id/read', notificationController.markAsRead);
router.patch('/:id/read', notificationController.markAsRead); // For NotificationCenter.jsx compatibility
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
