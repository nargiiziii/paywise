const pool = require('../config/database');

exports.getNotifications = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30`,
      [req.user.userId]
    );
    const unread = r.rows.filter(n => !n.is_read).length;
    res.json({ notifications: r.rows, unread_count: unread });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    await pool.query(`UPDATE notifications SET is_read=true WHERE user_id=$1`, [req.user.userId]);
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.markRead = async (req, res) => {
  try {
    await pool.query(`UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2`, [req.params.id, req.user.userId]);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
