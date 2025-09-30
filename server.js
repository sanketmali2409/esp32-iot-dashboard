// const express = require('express');
// const cors = require('cors');
// const path = require('path');

// const app = express();
// const PORT = 3000;

// app.use(cors());
// app.use(express.json());
// app.use(express.static('public'));

// let latestSensorData = {
//   temperature: null,
//   humidity: null,
//   qr_code: null,
//   timestamp: null
// };

// let dataHistory = [];

// app.post('/esp-data', (req, res) => {
//   const { temperature, humidity, qr_code } = req.body;
  
//   if (temperature === undefined || humidity === undefined) {
//     return res.status(400).json({ 
//       success: false, 
//       error: 'Temperature and humidity are required' 
//     });
//   }

//   latestSensorData = {
//     temperature: parseFloat(temperature),
//     humidity: parseFloat(humidity),
//     qr_code: qr_code || null,
//     timestamp: new Date().toISOString()
//   };

//   dataHistory.unshift(latestSensorData);
//   if (dataHistory.length > 50) {
//     dataHistory.pop();
//   }

//   console.log('Received ESP32 data:', latestSensorData);
  
//   res.json({ 
//     success: true, 
//     message: 'Data received successfully',
//     data: latestSensorData 
//   });
// });

// app.get('/api/data', (req, res) => {
//   res.json(latestSensorData);
// });

// app.get('/api/history', (req, res) => {
//   const limit = parseInt(req.query.limit) || 10;
//   res.json(dataHistory.slice(0, limit));
// });

// app.get('/api/health', (req, res) => {
//   res.json({ 
//     status: 'running', 
//     timestamp: new Date().toISOString(),
//     dataReceived: latestSensorData.timestamp !== null
//   });
// });

// app.get('/test', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'test.html'));
// });

// app.get('/', (req, res) => {
//   const indexPath = path.join(__dirname, 'public', 'index.html');
//   const testPath = path.join(__dirname, 'public', 'test.html');
  
//   const fs = require('fs');
//   if (fs.existsSync(indexPath)) {
//     res.sendFile(indexPath);
//   } else if (fs.existsSync(testPath)) {
//     res.sendFile(testPath);
//   } else {
//     res.send(`
//       <h1>ESP32 Dashboard Server</h1>
//       <p>Server is running on port ${PORT}</p>
//       <p>Create public/index.html or public/test.html to get started</p>
//       <ul>
//         <li><a href="/api/health">Health Check</a></li>
//         <li><a href="/api/data">Current Data</a></li>
//         <li><a href="/api/history">Data History</a></li>
//       </ul>
//     `);
//   }
// });

// app.listen(PORT, '0.0.0.0', () => {
//   console.log(`🚀 ESP32 Dashboard Server running on http://localhost:${PORT}`);
//   console.log(`📡 ESP32 should POST data to: http://your-ip:${PORT}/esp-data`);
//   console.log(`🌐 Dashboard available at: http://localhost:${PORT}`);
// });



const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Storage for sensor data
let latestSensorData = {
  temperature: null,
  humidity: null,
  qr_code: null,
  timestamp: null,
  wifi_signal: null,
  device_id: null
};
let dataHistory = [];

// Storage for commands (in-memory queue)
let deviceCommands = {};

// ============= SENSOR DATA ENDPOINTS =============

// ESP32 sends sensor data here
app.post('/esp-data', (req, res) => {
  const { temperature, humidity, qr_code, device_id, wifi_signal } = req.body;
  
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
    wifi_signal: wifi_signal || null,
    device_id: device_id || 'ESP32_CAM_001',
    timestamp: new Date().toISOString()
  };

  dataHistory.unshift(latestSensorData);
  if (dataHistory.length > 50) {
    dataHistory.pop();
  }

  console.log('📊 Received ESP32 data:', latestSensorData);

  res.json({
    success: true,
    message: 'Data received successfully',
    data: latestSensorData
  });
});

// Dashboard gets current sensor data
app.get('/api/data', (req, res) => {
  res.json(latestSensorData);
});

// Dashboard gets data history
app.get('/api/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  res.json(dataHistory.slice(0, limit));
});

// ============= COMMAND ENDPOINTS =============

// ESP32 polls for commands (GET)
app.get('/esp-command', (req, res) => {
  const { device_id } = req.query;
  
  if (!device_id) {
    return res.status(400).json({ error: 'device_id required' });
  }

  // Get command for this device
  const command = deviceCommands[device_id] || '';
  
  // Clear command after retrieval (single execution)
  if (command) {
    delete deviceCommands[device_id];
    console.log(`📤 Command sent to ${device_id}: ${command}`);
  }

  // Return just the command string
  res.status(200).send(command);
});

// Dashboard sends commands to ESP32 (POST)
app.post('/esp-command', (req, res) => {
  const { device_id, command } = req.body;

  if (!device_id || !command) {
    return res.status(400).json({ 
      error: 'device_id and command required' 
    });
  }

  // Queue command for the device
  deviceCommands[device_id] = command;
  console.log(`📥 Command queued for ${device_id}: ${command}`);

  res.json({ 
    success: true, 
    message: `Command "${command}" queued for ${device_id}` 
  });
});

// Get list of pending commands (for debugging)
app.get('/api/commands', (req, res) => {
  res.json({
    pending_commands: deviceCommands,
    count: Object.keys(deviceCommands).length
  });
});

// ============= UTILITY ENDPOINTS =============

app.get('/api/health', (req, res) => {
  res.json({
    status: 'running',
    timestamp: new Date().toISOString(),
    dataReceived: latestSensorData.timestamp !== null,
    pendingCommands: Object.keys(deviceCommands).length
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
      <!DOCTYPE html>
      <html>
      <head>
        <title>ESP32 Dashboard Server</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            max-width: 800px; 
            margin: 50px auto; 
            padding: 20px;
            background: #f5f5f5;
          }
          .card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
          }
          h1 { color: #333; }
          ul { list-style: none; padding: 0; }
          li { margin: 10px 0; }
          a { 
            color: #667eea; 
            text-decoration: none; 
            font-weight: 600;
          }
          a:hover { text-decoration: underline; }
          .status { 
            display: inline-block;
            padding: 4px 12px;
            background: #43e97b;
            color: white;
            border-radius: 20px;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🚀 ESP32 Dashboard Server</h1>
          <p><span class="status">● RUNNING</span> Port ${PORT}</p>
        </div>
        
        <div class="card">
          <h2>📡 API Endpoints</h2>
          <ul>
            <li>📊 <a href="/api/health">Health Check</a></li>
            <li>📈 <a href="/api/data">Current Sensor Data</a></li>
            <li>📜 <a href="/api/history?limit=10">Data History</a></li>
            <li>🎛️ <a href="/api/commands">Pending Commands</a></li>
          </ul>
        </div>

        <div class="card">
          <h2>🔧 Setup Instructions</h2>
          <ol>
            <li>Create <code>public/index.html</code> with your dashboard</li>
            <li>ESP32 POST data to: <code>http://your-ip:${PORT}/esp-data</code></li>
            <li>ESP32 GET commands from: <code>http://your-ip:${PORT}/esp-command?device_id=ESP32_CAM_001</code></li>
            <li>Dashboard POST commands to: <code>http://your-ip:${PORT}/esp-command</code></li>
          </ol>
        </div>
      </body>
      </html>
    `);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║  🚀 ESP32 Dashboard Server                            ║
╠═══════════════════════════════════════════════════════╣
║  📡 Server running on: http://localhost:${PORT}        ║
║  🌐 Dashboard: http://localhost:${PORT}                ║
║                                                       ║
║  ESP32 Endpoints:                                     ║
║  ├─ POST /esp-data (send sensor data)                ║
║  └─ GET  /esp-command?device_id=X (get commands)     ║
║                                                       ║
║  Dashboard Endpoints:                                 ║
║  ├─ GET  /api/data (get sensor data)                 ║
║  ├─ GET  /api/history (get data history)             ║
║  └─ POST /esp-command (send commands to ESP32)       ║
╚═══════════════════════════════════════════════════════╝
  `);
});