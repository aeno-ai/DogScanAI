const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const scanRoutes = require('./routes/scans');

const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// CORS configuration for both web and mobile
app.use(cors({
  origin: [
    'http://localhost:3000',  // React web app
    // Android emulator can access localhost via 10.0.2.2
    // Add your computer's local IP for real Android device
    'http://10.0.2.2:3000',
  ],
  credentials: true  // Allow cookies
}));

app.use(express.json());  // Parse JSON bodies
app.use(cookieParser());  // Parse cookies (for web)

// ============================================
// ROUTES
// ============================================

app.use('/api/auth', authRoutes);
app.use('/api/scans', scanRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📱 Android can access via http://10.0.2.2:${PORT}`);
  console.log(`🌐 Web can access via http://localhost:${PORT}`);
});