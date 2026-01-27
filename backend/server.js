// **What each package does:**
// - `express`: Web server framework
// - `bcryptjs`: Encrypts passwords
// - `jsonwebtoken`: Creates secure tokens for logged-in users
// - `@supabase/supabase-js`: Connects to Supabase
// - `dotenv`: Manages environment variables (secrets)
// - `cors`: Allows frontend to talk to backend
// - `cookie-parser`: Reads cookies from requests

// assigning packages into variables
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config(); // access sa .env files

// importing routes
const authRoutes = require('./routes/auth');

// express
const app = express();

app.use(cors({
    origin: 'https//localhost:3000',
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// routes
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=>{
    console.log(`Ang server ay tumatakbo sa ${PORT}`);
});



