const mongoose = require('mongoose');

const fundTransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['cash_in', 'cash_out'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  details: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('FundTransaction', fundTransactionSchema);
