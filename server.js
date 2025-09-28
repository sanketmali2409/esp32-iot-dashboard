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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Store latest sensor data and ESP32-CAM info
let latestSensorData = {
    temperature: null,
    humidity: null,
    qr_code: null,
    timestamp: null,
    device_ip: null,
    stream_url: null,
    capture_url: null
};

// Store data history (last 50 entries)
let dataHistory = [];
let esp32Devices = new Map(); // Track multiple ESP32 devices

// Endpoint for ESP32 to send data (including stream URLs)
app.post('/esp-data', (req, res) => {
    const { 
        device_id,
        temperature, 
        humidity, 
        qr_code, 
        stream_url, 
        capture_url,
        device_ip,
        wifi_signal,
        uptime,
        free_heap
    } = req.body;

    // Validate incoming data
    if (temperature === undefined || humidity === undefined) {
        return res.status(400).json({
            success: false,
            error: 'Temperature and humidity are required'
        });
    }

    // Update latest data
    latestSensorData = {
        device_id: device_id || 'ESP32_CAM_001',
        temperature: parseFloat(temperature),
        humidity: parseFloat(humidity),
        qr_code: qr_code || null,
        timestamp: new Date().toISOString(),
        device_ip: device_ip || null,
        stream_url: stream_url || null,
        capture_url: capture_url || null,
        wifi_signal: wifi_signal || null,
        uptime: uptime || null,
        free_heap: free_heap || null
    };

    // Store device info for stream proxying
    if (device_ip) {
        esp32Devices.set(device_id || 'default', {
            ip: device_ip,
            lastSeen: Date.now(),
            streamUrl: `http://${device_ip}/stream`,
            captureUrl: `http://${device_ip}/capture`,
            statusUrl: `http://${device_ip}/status`
        });
    }

    // Add to history
    dataHistory.unshift(latestSensorData);
    if (dataHistory.length > 50) {
        dataHistory.pop();
    }

    console.log('📡 Received ESP32 data:', {
        device_id: latestSensorData.device_id,
        temp: latestSensorData.temperature,
        humidity: latestSensorData.humidity,
        ip: device_ip
    });

    res.json({
        success: true,
        message: 'Data received successfully',
        data: latestSensorData,
        server_time: new Date().toISOString()
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

// API endpoint to get ESP32 device info
app.get('/api/devices', (req, res) => {
    const devices = Array.from(esp32Devices.entries()).map(([id, info]) => ({
        id,
        ...info,
        online: (Date.now() - info.lastSeen) < 30000 // Online if seen in last 30 seconds
    }));
    
    res.json({
        devices,
        active_device: latestSensorData.device_ip ? {
            ip: latestSensorData.device_ip,
            stream_url: latestSensorData.stream_url,
            capture_url: latestSensorData.capture_url
        } : null
    });
});

// Proxy endpoints for ESP32-CAM streams (if needed)
app.get('/api/stream/:deviceId?', (req, res) => {
    const deviceId = req.params.deviceId || 'default';
    const device = esp32Devices.get(deviceId);
    
    if (!device) {
        return res.status(404).json({
            error: 'Device not found',
            available_devices: Array.from(esp32Devices.keys())
        });
    }

    // Redirect to direct ESP32 stream
    res.redirect(device.streamUrl);
});

// Test if ESP32-CAM is reachable
app.get('/api/test-esp32/:ip', async (req, res) => {
    const ip = req.params.ip;
    
    try {
        const fetch = require('node-fetch');
        const response = await fetch(`http://${ip}/status`, {
            timeout: 5000
        });
        
        if (response.ok) {
            const data = await response.json();
            res.json({
                success: true,
                ip,
                status: 'online',
                device_info: data
            });
        } else {
            res.json({
                success: false,
                ip,
                status: 'unreachable',
                error: `HTTP ${response.status}`
            });
        }
    } catch (error) {
        res.json({
            success: false,
            ip,
            status: 'error',
            error: error.message
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    const activeDevices = Array.from(esp32Devices.entries())
        .filter(([id, info]) => (Date.now() - info.lastSeen) < 30000);

    res.json({
        status: 'running',
        timestamp: new Date().toISOString(),
        data_received: latestSensorData.timestamp !== null,
        active_devices: activeDevices.length,
        total_data_points: dataHistory.length,
        last_data_time: latestSensorData.timestamp,
        esp32_devices: activeDevices.map(([id, info]) => ({
            id,
            ip: info.ip,
            last_seen: new Date(info.lastSeen).toISOString()
        }))
    });
});

// Enhanced dashboard route with stream integration
app.get('/dashboard', (req, res) => {
    const device = latestSensorData.device_ip ? esp32Devices.get('default') : null;
    
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>ESP32-CAM Dashboard</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f0f0f0; }
            .container { max-width: 1200px; margin: 0 auto; }
            .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
            .card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .stream-container { background: white; padding: 20px; border-radius: 10px; text-align: center; }
            .stream-video { max-width: 100%; height: auto; border: 2px solid #ddd; border-radius: 5px; }
            .btn { padding: 10px 20px; margin: 5px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; }
            .btn:hover { background: #0056b3; }
            .status { padding: 5px 10px; border-radius: 15px; font-size: 12px; font-weight: bold; }
            .online { background: #d4edda; color: #155724; }
            .offline { background: #f8d7da; color: #721c24; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>ESP32-CAM Dashboard</h1>
            
            <div class="cards">
                <div class="card">
                    <h3>Temperature</h3>
                    <div style="font-size: 2em; color: #dc3545;">${latestSensorData.temperature || '--'}°C</div>
                    <small>Last update: ${latestSensorData.timestamp || 'Never'}</small>
                </div>
                <div class="card">
                    <h3>Humidity</h3>
                    <div style="font-size: 2em; color: #007bff;">${latestSensorData.humidity || '--'}%</div>
                    <small>Device: ${latestSensorData.device_id || 'Unknown'}</small>
                </div>
                <div class="card">
                    <h3>Device Status</h3>
                    <div class="status ${device ? 'online' : 'offline'}">
                        ${device ? 'ONLINE' : 'OFFLINE'}
                    </div>
                    <small>IP: ${latestSensorData.device_ip || 'Unknown'}</small>
                </div>
                <div class="card">
                    <h3>QR Code</h3>
                    <div style="font-size: 1.5em; color: #28a745;">${latestSensorData.qr_code || 'None'}</div>
                    <small>WiFi: ${latestSensorData.wifi_signal || '--'} dBm</small>
                </div>
            </div>
            
            <div class="stream-container">
                <h2>Live Stream</h2>
                ${device ? 
                    `<img class="stream-video" src="${device.streamUrl}" alt="ESP32-CAM Live Stream">
                     <br><br>
                     <a href="${device.captureUrl}" target="_blank" class="btn">📷 Capture Photo</a>
                     <a href="${device.statusUrl}" target="_blank" class="btn">📊 Device Status</a>` :
                    `<div style="padding: 50px; color: #666;">
                        📹 No ESP32-CAM device connected<br>
                        <small>Waiting for device data...</small>
                     </div>`
                }
                <br><br>
                <button class="btn" onclick="location.reload()">🔄 Refresh</button>
                <a href="/api/health" target="_blank" class="btn">📊 Server Status</a>
            </div>
        </div>
        
        <script>
            // Auto-refresh every 5 seconds
            setTimeout(() => location.reload(), 5000);
        </script>
    </body>
    </html>
    `);
});

// Serve the main route
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    const fs = require('fs');
    
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.redirect('/dashboard');
    }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ESP32 Dashboard Server running on http://localhost:${PORT}`);
    console.log(`📡 ESP32 should POST data to: http://localhost:${PORT}/esp-data`);
    console.log(`📺 Dashboard: http://localhost:${PORT}/dashboard`);
    console.log(`🔧 Health check: http://localhost:${PORT}/api/health`);
    console.log('');
    console.log('📋 API Endpoints:');
    console.log('   POST /esp-data          - Receive sensor data from ESP32');
    console.log('   GET  /api/data          - Get latest sensor data');
    console.log('   GET  /api/devices       - Get ESP32 device info');
    console.log('   GET  /api/health        - Server health status');
    console.log('   GET  /api/test-esp32/:ip - Test ESP32-CAM connectivity');
});