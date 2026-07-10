const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
  return { accessToken, refreshToken };
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, department } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Auto-generate employeeId (EMP001, EMP002, etc.)
    let nextEmployeeId = 'EMP001';
    const lastEmployee = await User.findOne({ role: 'employee', employeeId: /^EMP\d+$/ })
      .sort({ employeeId: -1 });

    if (lastEmployee && lastEmployee.employeeId) {
      const match = lastEmployee.employeeId.match(/^EMP(\d+)$/);
      if (match) {
        const lastNum = parseInt(match[1], 10);
        nextEmployeeId = `EMP${String(lastNum + 1).padStart(3, '0')}`;
      }
    }

    const user = await User.create({
      name,
      email,
      password,
      department,
      employeeId: nextEmployeeId,
      role: 'employee',
      isActive: false // Pending admin approval
    });
    const tokens = generateTokens(user);
    res.status(201).json({ user, ...tokens });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is pending approval. Please contact your administrator.' });
    }
    const tokens = generateTokens(user);
    res.json({ user, ...tokens });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required' });
    }
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    const tokens = generateTokens(user);
    res.json({ ...tokens });
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
};

exports.me = async (req, res) => {
  res.json({ user: req.user });
};
