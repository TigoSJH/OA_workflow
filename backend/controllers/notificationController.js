const Notification = require('../models/Notification');

exports.listMyNotifications = async (req, res) => {
  try {
    const { unreadOnly, type } = req.query;
    const filter = { toUserId: req.user._id };
    if (unreadOnly === 'true') filter.read = false;
    if (type) filter.type = type;
    const items = await Notification.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ notifications: items });
  } catch (e) {
    console.error('获取通知失败:', e);
    res.status(500).json({ error: '获取通知失败' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Notification.findOne({ _id: id, toUserId: req.user._id });
    if (!item) return res.status(404).json({ error: '通知不存在' });
    if (!item.read) {
      item.read = true;
      item.readAt = new Date();
      await item.save();
    }
    res.json({ message: '已读', notification: item });
  } catch (e) {
    console.error('设置已读失败:', e);
    res.status(500).json({ error: '设置已读失败' });
  }
};




