const GroupMessage = require('../models/GroupMessage');

exports.getGlobalMessages = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    const messages = await GroupMessage.find()
      .populate('sender', 'name _id role department')
      .sort({ createdAt: -1 })
      .limit(limit);
      
    // Sort ascending for chat UI display (oldest to newest)
    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
