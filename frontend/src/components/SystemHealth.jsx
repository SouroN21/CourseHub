import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_CONFIG from '../config/apiConfig';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const SystemHealth = () => {
  const [systemHealth, setSystemHealth] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    fetchSystemHealth();
    if (autoRefresh) {
      const interval = setInterval(fetchSystemHealth, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchSystemHealth = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const [healthRes, logsRes] = await Promise.all([
        axios.get(`${API_CONFIG.BASE_URL}/admin/system/health`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_CONFIG.BASE_URL}/admin/system/errors`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setSystemHealth(healthRes.data);
      setLogs(logsRes.data.logs);
    } catch (error) {
      toast.error('Failed to fetch system health');
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatBytes = (bytes) => {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!systemHealth) {
    return (
      <div className="text-center text-gray-500 py-8">
        Failed to load system health data
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">System Health</h2>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">Auto-refresh</span>
          </label>
          <button
            onClick={fetchSystemHealth}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-gray-600 text-sm mb-1">Uptime</div>
          <div className="text-2xl font-bold text-green-600">{formatUptime(systemHealth.uptime)}</div>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-gray-600 text-sm mb-1">Memory Usage</div>
          <div className="text-2xl font-bold text-blue-600">{formatBytes(systemHealth.memory.heapUsed)} / {formatBytes(systemHealth.memory.heapTotal)}</div>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-gray-600 text-sm mb-1">CPU Cores</div>
          <div className="text-2xl font-bold text-purple-600">{systemHealth.cpu.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-gray-600 text-sm mb-1">Load Avg (1m)</div>
          <div className="text-2xl font-bold text-orange-600">{systemHealth.load[0].toFixed(2)}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">System Info</h3>
          <div className="space-y-2 text-sm">
            <div><b>Platform:</b> {systemHealth.platform}</div>
            <div><b>Release:</b> {systemHealth.release}</div>
            <div><b>Hostname:</b> {systemHealth.hostname}</div>
            <div><b>Arch:</b> {systemHealth.arch}</div>
            <div><b>Node.js:</b> {systemHealth.nodeVersion}</div>
            <div><b>Total Mem:</b> {formatBytes(systemHealth.totalmem)}</div>
            <div><b>Free Mem:</b> {formatBytes(systemHealth.freemem)}</div>
            <div><b>Timestamp:</b> {new Date(systemHealth.timestamp).toLocaleString()}</div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Error Logs</h3>
          <div className="space-y-2 text-xs max-h-48 overflow-y-auto">
            {logs.map((log, i) => (
              <div key={i} className={`p-2 rounded ${log.level === 'info' ? 'bg-blue-50' : 'bg-red-50'}`}>
                <span className="font-bold">[{log.level.toUpperCase()}]</span> {log.message} <span className="text-gray-400">({new Date(log.timestamp).toLocaleString()})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default SystemHealth; 