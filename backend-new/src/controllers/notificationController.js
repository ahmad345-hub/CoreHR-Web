const { Op } = require('sequelize');
const { Notification } = require('../models');

exports.list = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Notification.findAndCountAll({
      where: { user_id: req.user.id },
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']],
    });

    // Return array directly (frontend expects res.data to be an array)
    return res.json(rows);
  } catch (err) {
    console.error('Notifications list error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.unreadCount = async (req, res) => {
  try {
    const count = await Notification.count({
      where: { user_id: req.user.id, is_read: false },
    });

    return res.json({ data: { count } });
  } catch (err) {
    console.error('Unread count error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    await notification.update({ is_read: true });
    return res.json({ message: 'Notification marked as read.' });
  } catch (err) {
    console.error('Mark read error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.update(
      { is_read: true },
      { where: { user_id: req.user.id, is_read: false } }
    );

    return res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Mark all read error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.remove = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, user_id: req.user.id },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    await notification.destroy();
    return res.json({ message: 'Notification deleted.' });
  } catch (err) {
    console.error('Delete notification error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
