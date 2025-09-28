const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files

// Store latest sensor data
let latestSensorData = {
  temperature: null,
  humidity: null,
  qr_code: null,
  timestamp: null
};

// Store data history (last 50 entries)
let dataHistory = [];

// Endpoint for ESP32 to send data
app.post('/esp-data', (req, res) => {
  const { temperature, humidity, qr_code } = req.body;
  
  // Validate incoming data
  if (temperature === undefined || humidity === undefined) {
    return res.status(400).json({ 
      success: false, 
      error: 'Temperature and humidity are required' 
    });
  }

  // Update latest data
  latestSensorData = {
    temperature: parseFloat(temperature),
    humidity: parseFloat(humidity),
    qr_code: qr_code || null,
    timestamp: new Date().toISOString()
  };

  // Add to history
  dataHistory.unshift(latestSensorData);
  if (dataHistory.length > 50) {
    dataHistory.pop(); // Keep only last 50 entries
  }

  console.log('Received ESP32 data:', latestSensorData);
  
  res.json({ 
    success: true, 
    message: 'Data received successfully',
    data: latestSensorData 
  });
});

// API endpoint for React app to get latest data
app.get('/api/data', (req, res) => {
  res.json(latestSensorData);
});

// API endpoint for React app to get data history
app.get('/api/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  res.json(dataHistory.slice(0, limit));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'running', 
    timestamp: new Date().toISOString(),
    dataReceived: latestSensorData.timestamp !== null
  });
});

// Serve the test page first
app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'test.html'));
});

// Serve the React app (if built)
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  const testPath = path.join(__dirname, 'public', 'test.html');
  
  // Check if index.html exists, otherwise serve test.html
  const fs = require('fs');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else if (fs.existsSync(testPath)) {
    res.sendFile(testPath);
  } else {
    res.send(`
      <h1>ESP32 Dashboard Server</h1>
      <p>Server is running on port ${PORT}</p>
      <p>Create public/index.html or public/test.html to get started</p>
      <ul>
        <li><a href="/api/health">Health Check</a></li>
        <li><a href="/api/data">Current Data</a></li>
        <li><a href="/api/history">Data History</a></li>
      </ul>
    `);
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ESP32 Dashboard Server running on http://localhost:${PORT}`);
  console.log(`📡 ESP32 should POST data to: http://your-ip:${PORT}/esp-data`);
  console.log(`🌐 Dashboard available at: http://localhost:${PORT}`);
});
