import React, { useState, useEffect } from 'react';
import { Thermometer, Droplets, QrCode, Wifi, WifiOff, Clock } from 'lucide-react';

const ESP32Dashboard = () => {
  const [sensorData, setSensorData] = useState({
    temperature: null,
    humidity: null,
    qr_code: null,
    timestamp: null
  });
  const [isConnected, setIsConnected] = useState(false);
  const [dataHistory, setDataHistory] = useState([]);

  // Simulate receiving data from ESP32 (since we can't run a real server here)
  useEffect(() => {
    const simulateESP32Data = () => {
      const newData = {
        temperature: (20 + Math.random() * 15).toFixed(1),
        humidity: (40 + Math.random() * 40).toFixed(1),
        qr_code: Math.random() > 0.7 ? `QR${Math.floor(Math.random() * 10000)}` : null,
        timestamp: new Date().toISOString()
      };
      
      setSensorData(newData);
      setIsConnected(true);
      
      setDataHistory(prev => {
        const updated = [newData, ...prev].slice(0, 10);
        return updated;
      });
    };

    // Initial data
    simulateESP32Data();
    
    // Simulate ESP32 sending data every 5 seconds
    const interval = setInterval(simulateESP32Data, 5000);
    
    // Simulate connection status
    const connectionCheck = setInterval(() => {
      setIsConnected(prev => Math.random() > 0.1 ? true : prev);
    }, 2000);

    return () => {
      clearInterval(interval);
      clearInterval(connectionCheck);
    };
  }, []);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getTemperatureColor = (temp) => {
    const t = parseFloat(temp);
    if (t < 20) return 'text-blue-600';
    if (t < 30) return 'text-green-600';
    return 'text-red-600';
  };

  const getHumidityColor = (humidity) => {
    const h = parseFloat(humidity);
    if (h < 30) return 'text-orange-600';
    if (h < 60) return 'text-blue-600';
    return 'text-indigo-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">ESP32 CAM Dashboard</h1>
          <div className="flex items-center justify-center gap-2">
            {isConnected ? (
              <>
                <Wifi className="text-green-400" size={20} />
                <span className="text-green-400">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="text-red-400" size={20} />
                <span className="text-red-400">Disconnected</span>
              </>
            )}
          </div>
        </div>

        {/* Real-time Data Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Temperature Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <Thermometer className="text-red-400" size={24} />
              <h3 className="text-xl font-semibold text-white">Temperature</h3>
            </div>
            <div className={`text-3xl font-bold ${getTemperatureColor(sensorData.temperature)}`}>
              {sensorData.temperature ? `${sensorData.temperature}°C` : '--°C'}
            </div>
            <p className="text-gray-300 text-sm mt-2">
              {sensorData.timestamp ? `Updated: ${formatTime(sensorData.timestamp)}` : 'No data'}
            </p>
          </div>

          {/* Humidity Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <Droplets className="text-blue-400" size={24} />
              <h3 className="text-xl font-semibold text-white">Humidity</h3>
            </div>
            <div className={`text-3xl font-bold ${getHumidityColor(sensorData.humidity)}`}>
              {sensorData.humidity ? `${sensorData.humidity}%` : '--%'}
            </div>
            <p className="text-gray-300 text-sm mt-2">
              {sensorData.timestamp ? `Updated: ${formatTime(sensorData.timestamp)}` : 'No data'}
            </p>
          </div>

          {/* QR Code Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <QrCode className="text-green-400" size={24} />
              <h3 className="text-xl font-semibold text-white">QR Code</h3>
            </div>
            <div className="text-3xl font-bold text-green-400">
              {sensorData.qr_code || 'No QR Code'}
            </div>
            <p className="text-gray-300 text-sm mt-2">
              {sensorData.qr_code ? `Scanned: ${formatTime(sensorData.timestamp)}` : 'Waiting for scan...'}
            </p>
          </div>
        </div>

        {/* Data History */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="text-purple-400" size={24} />
            <h3 className="text-xl font-semibold text-white">Recent Data History</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-white">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-3 px-2">Time</th>
                  <th className="text-left py-3 px-2">Temperature</th>
                  <th className="text-left py-3 px-2">Humidity</th>
                  <th className="text-left py-3 px-2">QR Code</th>
                </tr>
              </thead>
              <tbody>
                {dataHistory.length > 0 ? (
                  dataHistory.map((data, index) => (
                    <tr key={index} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-2 text-gray-300">
                        {formatTime(data.timestamp)}
                      </td>
                      <td className={`py-3 px-2 font-semibold ${getTemperatureColor(data.temperature)}`}>
                        {data.temperature}°C
                      </td>
                      <td className={`py-3 px-2 font-semibold ${getHumidityColor(data.humidity)}`}>
                        {data.humidity}%
                      </td>
                      <td className="py-3 px-2 text-green-400">
                        {data.qr_code || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="py-6 text-center text-gray-400">
                      No data received yet...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 mt-6">
          <h3 className="text-xl font-semibold text-white mb-4">Setup Instructions</h3>
          <div className="text-gray-300 space-y-2">
            <p>1. Update your ESP32 code to send POST requests to: <code className="bg-black/30 px-2 py-1 rounded">http://your-server:3000/esp-data</code></p>
            <p>2. Set up a Node.js server with Express to handle the POST requests</p>
            <p>3. Use WebSockets or Server-Sent Events to push data to this React dashboard in real-time</p>
            <p>4. Current demo shows simulated data - replace with actual API calls in production</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ESP32Dashboard;