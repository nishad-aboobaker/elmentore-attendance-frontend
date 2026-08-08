const FundTransaction = require('../models/FundTransaction');

exports.getAllTransactions = async (req, res) => {
  try {
    const transactions = await FundTransaction.find()
      .populate('createdBy', 'name')
      .sort({ date: -1 });

    // Calculate total balance
    let totalBalance = 0;
    transactions.forEach(t => {
      if (t.type === 'cash_in') {
        totalBalance += t.amount;
      } else {
        totalBalance -= t.amount;
      }
    });

    res.json({
      transactions,
      totalBalance
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createTransaction = async (req, res) => {
  try {
    const { type, amount, details } = req.body;
    
    if (!type || !amount || !details) {
      return res.status(400).json({ message: 'Please provide type, amount, and details' });
    }

    const transaction = await FundTransaction.create({
      type,
      amount: Number(amount),
      details,
      createdBy: req.user._id
    });

    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
