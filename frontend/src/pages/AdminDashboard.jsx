import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import API_CONFIG from '../config/apiConfig';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import UserManagement from '../components/UserManagement';
import CourseManagement from '../components/CourseManagement';
import AdminAnalytics from '../components/AdminAnalytics';
import SystemHealth from '../components/SystemHealth';

const AdminDashboard = () => {
  const [adminData, setAdminData] = useState(null);
  const [userList, setUserList] = useState([]);
  const [stats, setStats] = useState({ users: 0, courses: 0 });
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const decoded = jwtDecode(token);
      if (decoded.role !== 'Admin') {
        navigate('/');
        return;
      }

      // Fetch admin details
      axios
        .get(`${API_CONFIG.BASE_URL}/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => setAdminData(res.data.user))
        .catch(() => toast.error('Failed to fetch admin details'));

      // Fetch user list
      axios
        .get(`${API_CONFIG.BASE_URL}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => setUserList(res.data.users))
        .catch(() => toast.error('Failed to fetch users'));

      // Fetch stats
      const fetchStats = async () => {
        try {
          const usersRes = await fetch(`${API_CONFIG.BASE_URL}/admin/users/count`);
          const coursesRes = await fetch(`${API_CONFIG.BASE_URL}/admin/courses/count`);
          const users = await usersRes.json();
          const courses = await coursesRes.json();
          setStats({ users: users.count, courses: courses.count });
        } catch (err) {
          setError('Failed to load dashboard stats');
        }
      };
      fetchStats();

    } catch (error) {
      localStorage.removeItem('token');
      navigate('/login');
    }
  }, [navigate]);

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_CONFIG.BASE_URL}/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success('User deleted successfully!');
      setUserList(userList.filter((user) => user._id !== userId));
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  if (error) return <div className="min-h-[60vh] flex items-center justify-center text-red-600 text-xl">{error}</div>;

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'users', name: 'User Management', icon: '👥' },
    { id: 'courses', name: 'Course Management', icon: '📚' },
    { id: 'analytics', name: 'Analytics', icon: '📈' },
    { id: 'system', name: 'System Health', icon: '⚙️' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center">
                <span className="text-5xl font-bold text-primary mb-2">{stats.users}</span>
                <span className="text-gray-600">Total Users</span>
              </div>
              <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center">
                <span className="text-5xl font-bold text-primary mb-2">{stats.courses}</span>
                <span className="text-gray-600">Total Courses</span>
              </div>
              <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center">
                <span className="text-5xl font-bold text-green-600 mb-2">📈</span>
                <span className="text-gray-600">Analytics</span>
              </div>
              <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center">
                <span className="text-5xl font-bold text-blue-600 mb-2">⚙️</span>
                <span className="text-gray-600">System</span>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <button
                  onClick={() => setActiveTab('users')}
                  className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-left"
                >
                  <div className="text-2xl mb-2">👥</div>
                  <div className="font-medium text-gray-800">Manage Users</div>
                  <div className="text-sm text-gray-600">View and manage all users</div>
                </button>
                <button
                  onClick={() => setActiveTab('courses')}
                  className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-left"
                >
                  <div className="text-2xl mb-2">📚</div>
                  <div className="font-medium text-gray-800">Manage Courses</div>
                  <div className="text-sm text-gray-600">View and manage all courses</div>
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-left"
                >
                  <div className="text-2xl mb-2">📈</div>
                  <div className="font-medium text-gray-800">View Analytics</div>
                  <div className="text-sm text-gray-600">System analytics and reports</div>
                </button>
                <button
                  onClick={() => setActiveTab('system')}
                  className="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors text-left"
                >
                  <div className="text-2xl mb-2">⚙️</div>
                  <div className="font-medium text-gray-800">System Health</div>
                  <div className="text-sm text-gray-600">Monitor system status</div>
                </button>
                <Link
                  to="/admin/create"
                  className="p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors text-left"
                >
                  <div className="text-2xl mb-2">👑</div>
                  <div className="font-medium text-gray-800">Create Admin</div>
                  <div className="text-sm text-gray-600">Create new admin account</div>
                </Link>
              </div>
            </div>
          </div>
        );
      case 'users':
        return <UserManagement />;
      case 'courses':
        return <CourseManagement />;
      case 'analytics':
        return <AdminAnalytics />;
      case 'system':
        return <SystemHealth />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-[80vh] bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-extrabold text-primary">Admin Dashboard</h1>
          {adminData && (
            <div className="text-sm text-gray-600">
              Welcome, {adminData.firstName} {adminData.lastName}
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="flex space-x-1 p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </div>
    </div>
  );
};

export default AdminDashboard;
