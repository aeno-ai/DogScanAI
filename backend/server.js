const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Import routes
const authRoutes = require("./routes/auth");
const scanRoutes = require("./routes/scans");
const breedsRoutes = require("./routes/breeds.routes");
const adminUsersRoutes = require("./routes/admin.users");
const adminContributionsRoutes = require("./routes/admin.contributions");
const adminContributorsRoutes = require("./routes/admin.contributors");
const adminDashboardRoutes = require("./routes/admin.dashboard");
const profileRoutes = require("./routes/profile");
const assistantRoutes = require("./routes/assistant");
const contributorsRoutes = require("./routes/contributors");

const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// CORS configuration for both web and mobile
const corsAllowList = new Set([
  "http://localhost:5000", // React web app (old port)
  "http://localhost:5173", // React web app (Vite dev port)
  "http://localhost:5174", // React web app (Vite dev port)
  // Android emulator can access localhost via 10.0.2.2
  // Add your computer's local IP for real Android device
  "http://10.0.2.2:3000",
  "http://10.0.2.2:5173",
  "http://10.0.2.2:5174",
]);
const localhostOriginPattern = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/i;

const extraOrigins = new Set();
const rawAllowList = process.env.CORS_ALLOW_ORIGINS || "";
rawAllowList
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean)
  .forEach((origin) => extraOrigins.add(origin));

const urlSources = [process.env.FRONTEND_URL, process.env.RESET_PASSWORD_URL];
urlSources.forEach((value) => {
  if (!value) return;
  try {
    extraOrigins.add(new URL(value).origin);
  } catch {
    // ignore invalid URLs
  }
});

extraOrigins.forEach((origin) => corsAllowList.add(origin));

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow server-to-server or native app requests without Origin header.
      if (!origin) return cb(null, true);
      if (corsAllowList.has(origin) || localhostOriginPattern.test(origin)) {
        return cb(null, true);
      }
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true, // Allow cookies
  }),
);

app.use(express.json()); // Parse JSON bodies
app.use(cookieParser()); // Parse cookies (for web)
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use('/images', express.static(path.join(__dirname, '..', 'frontend', 'public', 'image', 'breed_library_images')));

app.use('/images', express.static(path.join(__dirname, '..', 'frontend', 'public', 'image', 'breed_library_images')));


// ============================================
// ROUTES
// ============================================

app.use("/api/auth", authRoutes);
app.use("/api/scans", scanRoutes);
app.use("/api", breedsRoutes);
app.use("/api/admin/users", adminUsersRoutes);
app.use("/api/admin/contributions", adminContributionsRoutes);
app.use("/api/admin/contributors", adminContributorsRoutes);
app.use("/api/admin/dashboard", adminDashboardRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/assistant", assistantRoutes);
app.use("/api/contributors", contributorsRoutes);


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

// 404 handler (keep this last so it does not shadow real routes)
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
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
