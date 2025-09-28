const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

let latestSensorData = {
  temperature: null,
  humidity: null,
  qr_code: null,
  timestamp: null
};

let dataHistory = [];

app.post('/esp-data', (req, res) => {
  const { temperature, humidity, qr_code } = req.body;
  
  if (temperature === undefined || humidity === undefined) {
    return res.status(400).json({ 
      success: false, 
      error: 'Temperature and humidity are required' 
    });
  }

  latestSensorData = {
    temperature: parseFloat(temperature),
    humidity: parseFloat(humidity),
    qr_code: qr_code || null,
    timestamp: new Date().toISOString()
  };

  dataHistory.unshift(latestSensorData);
  if (dataHistory.length > 50) {
    dataHistory.pop();
  }

  console.log('Received ESP32 data:', latestSensorData);
  
  res.json({ 
    success: true, 
    message: 'Data received successfully',
    data: latestSensorData 
  });
});

app.get('/api/data', (req, res) => {
  res.json(latestSensorData);
});

app.get('/api/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  res.json(dataHistory.slice(0, limit));
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'running', 
    timestamp: new Date().toISOString(),
    dataReceived: latestSensorData.timestamp !== null
  });
});

app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'test.html'));
});

app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  const testPath = path.join(__dirname, 'public', 'test.html');
  
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ESP32 Dashboard Server running on http://localhost:${PORT}`);
  console.log(`📡 ESP32 should POST data to: http://your-ip:${PORT}/esp-data`);
  console.log(`🌐 Dashboard available at: http://localhost:${PORT}`);
});


