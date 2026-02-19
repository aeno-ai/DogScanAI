const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require('dotenv').config();

// Import routes
const authRoutes = require("./routes/auth");
const scanRoutes = require("./routes/scans");
const breedsRoutes = require("./routes/breeds.routes");

const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// CORS configuration for both web and mobile
app.use(
  cors({
    origin: [
      "http://localhost:5000", // React web app (old port)
      "http://localhost:5173", // React web app (Vite dev port)
      "http://localhost:5174", // React web app (Vite dev port)
      // Android emulator can access localhost via 10.0.2.2
      // Add your computer's local IP for real Android device
      "http://10.0.2.2:3000",
      "http://10.0.2.2:5173",
      "http://10.0.2.2:5174",
    ],
    credentials: true, // Allow cookies
  }),
);

app.use(express.json()); // Parse JSON bodies
app.use(cookieParser()); // Parse cookies (for web)
app.use(express.urlencoded({ extended: true }));


// ============================================
// ROUTES
// ============================================

app.use("/api/auth", authRoutes);
app.use("/api/scans", scanRoutes);
app.use("/api", breedsRoutes);


// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "Server is running!" });
});

// testing ng endpoints
app.get('/', (req, res) => {
  res.json({ 
    message: 'Dog Breeds API is running!',
    endpoints: {
      allBreeds: '/api/breeds',
      singleBreed: '/api/breeds/:id'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});


// Add this right after your routes section in server.js
app.get('/api/test-db', async (req, res) => {
  const pool = require('./config/database');
  try {
    const result = await pool.query('SELECT COUNT(*) FROM breeds');
    res.json({ 
      success: true, 
      count: result.rows[0].count 
    });
  } catch (error) {
    res.json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    });
  }
});
// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📱 Android can access via http://10.0.2.2:${PORT}`);
  console.log(`🌐 Web can access via http://localhost:${PORT}`);
});
