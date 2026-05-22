// ============================================
// server.js — THE MAIN SERVER FILE
// ============================================
// This is the ENTRY POINT of our backend.
// When you run "node server.js", this file runs.
//
// It does 4 things:
// 1. Loads the tools we need (express, cors...)
// 2. Configures the app (middleware)
// 3. Connects all route files
// 4. Starts listening for requests on a port
// ============================================

// Load Express — the framework that handles
// HTTP requests and responses
const express = require('express');

// Load dotenv — reads our .env config file
require('dotenv').config();

// Load CORS — stands for Cross-Origin Resource Sharing
// This allows our frontend (running on one port)
// to communicate with our backend (on another port)
// Without this, the browser BLOCKS the requests
const cors = require('cors');

// Create the Express application
// Think of 'app' as our server object
// We will attach everything to it
const app = express();

// ── MIDDLEWARE SETUP ─────────────────────────
// Middleware = functions that run on EVERY
// request before it reaches our routes.
// Like a security checkpoint at an airport.

// 1. Allow all frontend requests (CORS)
app.use(cors());

// 2. Allow Express to read JSON data
// When the frontend sends data (like a login form),
// it sends it as JSON. This line makes Express
// automatically parse that JSON for us.
// Without this, req.body would be undefined!
app.use(express.json());

// ── ROUTES ───────────────────────────────────
// Routes = the different URLs our backend responds to
// We will ADD them one by one as we build features.


app.use('/api/auth',       require('./routes/auth'));
app.use('/api/patients',      require('./routes/patients'));
app.use('/api/beds',          require('./routes/beds'));
app.use('/api/appointments',  require('./routes/appointments'));
app.use('/api/evaluations',   require('./routes/evaluations'));
app.use('/api/prescriptions', require('./routes/prescriptions'));
app.use('/api/vitals',        require('./routes/vitals'));
 app.use('/api/staff',         require('./routes/staff'));

// ── TEST ROUTE ───────────────────────────────
// This is a simple route to test if the server works.
// 
// What is a route?
// A route is: "when someone visits THIS URL,
// run THIS function and send back a response"
//
// req = the REQUEST coming from the browser/frontend
// res = the RESPONSE we send back
app.get('/', function(req, res) {
  res.json({
    message: 'Hospital Backend is running! ✅',
    status:  'ok'
  });
});

// ── START THE SERVER ─────────────────────────
// Tell Express to start listening for requests
// on the port defined in our .env file (3000)
//
// What is a port?
// Think of your computer like a building.
// The IP address is the building address.
// The port is the specific apartment number.
// Port 3000 = our backend's "apartment"
const PORT = process.env.PORT || 3000;
// The || 3000 means: "if PORT is not in .env, use 3000"

app.listen(PORT, function() {
  // This message appears in the terminal when server starts
  console.log('');
  console.log('✅ Server is running!');
  console.log('🌐 Open this in your browser: http://localhost:' + PORT);
  console.log('📦 Connected to database: ' + process.env.DB_NAME);
  console.log('🔌 Waiting for requests...');
  console.log('');
});