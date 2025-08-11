import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_CONFIG from '../config/apiConfig';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const COLORS = ['#2563eb', '#1e40af', '#22c55e', '#f59e42', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];

const AdminAnalytics = () => {
  const [growth, setGrowth] = useState(null);
  const [roles, setRoles] = useState([]);
  const [revenue, setRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('12');

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const [growthRes, rolesRes, revenueRes] = await Promise.all([
        axios.get(`${API_CONFIG.BASE_URL}/admin/analytics/growth`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_CONFIG.BASE_URL}/admin/analytics/roles`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_CONFIG.BASE_URL}/admin/analytics/revenue`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setGrowth(growthRes.data);
      setRoles(rolesRes.data.roles);
      setRevenue(revenueRes.data.totalRevenue);
    } catch (error) {
      toast.error('Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatMonth = (year, month) => {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateGrowthRate = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const getGrowthColor = (rate) => {
    if (rate > 0) return 'text-green-600';
    if (rate < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getGrowthIcon = (rate) => {
    if (rate > 0) return '↗️';
    if (rate < 0) return '↘️';
    return '→';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!growth) {
    return (
      <div className="text-center text-gray-500 py-8">
        Failed to load analytics data
      </div>
    );
  }

  // Calculate growth rates
  const userGrowthRate = calculateGrowthRate(
    growth.userGrowth[growth.userGrowth.length - 1]?.count || 0,
    growth.userGrowth[growth.userGrowth.length - 2]?.count || 0
  );
  const courseGrowthRate = calculateGrowthRate(
    growth.courseGrowth[growth.courseGrowth.length - 1]?.count || 0,
    growth.courseGrowth[growth.courseGrowth.length - 2]?.count || 0
  );

  // Pie chart for roles
  const totalRoles = roles.reduce((sum, r) => sum + r.count, 0);
  let acc = 0;
  const pieSlices = roles.map((role, i) => {
    const percent = totalRoles ? (role.count / totalRoles) : 0;
    const start = acc;
    const end = acc + percent;
    acc = end;
    const largeArc = percent > 0.5 ? 1 : 0;
    const x1 = Math.cos(2 * Math.PI * start) * 40 + 50;
    const y1 = Math.sin(2 * Math.PI * start) * 40 + 50;
    const x2 = Math.cos(2 * Math.PI * end) * 40 + 50;
    const y2 = Math.sin(2 * Math.PI * end) * 40 + 50;
    return (
      <path
        key={role.role}
        d={`M50,50 L${x1},${y1} A40,40 0 ${largeArc} 1 ${x2},${y2} Z`}
        fill={COLORS[i % COLORS.length]}
      />
    );
  });

  return (
    <div className="space-y-6">
      {/* Header with period selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Analytics Dashboard</h2>
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Time Period:</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="6">Last 6 months</option>
            <option value="12">Last 12 months</option>
          </select>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary-dark transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-3xl font-bold text-green-600">{formatCurrency(revenue)}</p>
            </div>
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-3xl font-bold text-blue-600">
                {roles.reduce((sum, r) => sum + r.count, 0).toLocaleString()}
              </p>
              <p className={`text-sm ${getGrowthColor(userGrowthRate)}`}>
                {getGrowthIcon(userGrowthRate)} {userGrowthRate}% from last month
              </p>
            </div>
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Courses</p>
              <p className="text-3xl font-bold text-purple-600">
                {growth.courseGrowth.reduce((sum, c) => sum + c.count, 0).toLocaleString()}
              </p>
              <p className={`text-sm ${getGrowthColor(courseGrowthRate)}`}>
                {getGrowthIcon(courseGrowthRate)} {courseGrowthRate}% from last month
              </p>
            </div>
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Instructors</p>
              <p className="text-3xl font-bold text-orange-600">
                {roles.find(r => r.role === 'Instructor')?.count || 0}
              </p>
              <p className="text-sm text-gray-500">Creating content</p>
            </div>
            <div className="p-3 rounded-full bg-orange-100 text-orange-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">User Growth Trend</h3>
          <div className="h-64 flex items-end justify-between space-x-1">
            {growth.userGrowth.slice(-parseInt(selectedPeriod)).map((item, idx) => {
              const maxValue = Math.max(...growth.userGrowth.slice(-parseInt(selectedPeriod)).map(d => d.count));
              const height = maxValue > 0 ? (item.count / maxValue) * 100 : 0;
              return (
                <div key={idx} className="flex flex-col items-center flex-1">
                  <div 
                    className="w-full bg-gradient-to-t from-blue-500 to-blue-600 rounded-t transition-all duration-300 hover:from-blue-600 hover:to-blue-700"
                    style={{ height: `${height}%` }}
                  ></div>
                  <div className="text-xs text-gray-500 mt-2 transform rotate-45 origin-left">
                    {formatMonth(item.year, item.month)}
                  </div>
                  <div className="text-xs font-medium text-gray-700 mt-1">{item.count}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Course Growth Chart */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Course Growth Trend</h3>
          <div className="h-64 flex items-end justify-between space-x-1">
            {growth.courseGrowth.slice(-parseInt(selectedPeriod)).map((item, idx) => {
              const maxValue = Math.max(...growth.courseGrowth.slice(-parseInt(selectedPeriod)).map(d => d.count));
              const height = maxValue > 0 ? (item.count / maxValue) * 100 : 0;
              return (
                <div key={idx} className="flex flex-col items-center flex-1">
                  <div 
                    className="w-full bg-gradient-to-t from-purple-500 to-purple-600 rounded-t transition-all duration-300 hover:from-purple-600 hover:to-purple-700"
                    style={{ height: `${height}%` }}
                  ></div>
                  <div className="text-xs text-gray-500 mt-2 transform rotate-45 origin-left">
                    {formatMonth(item.year, item.month)}
                  </div>
                  <div className="text-xs font-medium text-gray-700 mt-1">{item.count}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Role Distribution and Additional Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Role Distribution Pie Chart */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">User Role Distribution</h3>
          <div className="flex items-center justify-center">
            <svg width="200" height="200" viewBox="0 0 100 100" className="mr-8">
              {pieSlices}
            </svg>
            <div className="space-y-3">
              {roles.map((role, i) => (
                <div key={role.role} className="flex items-center gap-3">
                  <span 
                    style={{ background: COLORS[i % COLORS.length] }} 
                    className="inline-block w-4 h-4 rounded-full"
                  ></span>
                  <span className="text-sm font-medium">{role.role}</span>
                  <span className="text-sm text-gray-600">{role.count}</span>
                  <span className="text-sm text-gray-500">
                    ({totalRoles ? ((role.count / totalRoles) * 100).toFixed(1) : 0}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Revenue Insights */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue Insights</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(revenue)}</p>
              </div>
              <div className="text-green-600 text-2xl">💰</div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Avg Revenue/Instructor</p>
                <p className="text-lg font-bold text-blue-600">
                  {formatCurrency(roles.find(r => r.role === 'Instructor')?.count ? revenue / roles.find(r => r.role === 'Instructor').count : 0)}
                </p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Revenue Growth</p>
                <p className="text-lg font-bold text-purple-600">+12.5%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {roles.find(r => r.role === 'Student')?.count || 0}
            </div>
            <div className="text-sm text-gray-600">Active Students</div>
            <div className="text-xs text-gray-500 mt-1">Learning on platform</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {growth.courseGrowth[growth.courseGrowth.length - 1]?.count || 0}
            </div>
            <div className="text-sm text-gray-600">New Courses This Month</div>
            <div className="text-xs text-gray-500 mt-1">Content growth</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {growth.userGrowth[growth.userGrowth.length - 1]?.count || 0}
            </div>
            <div className="text-sm text-gray-600">New Users This Month</div>
            <div className="text-xs text-gray-500 mt-1">User acquisition</div>
          </div>
        </div>
      </div>

      <ToastContainer />
    </div>
  );
};

export default AdminAnalytics; 