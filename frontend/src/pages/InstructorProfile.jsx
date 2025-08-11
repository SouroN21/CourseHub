import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import API_CONFIG from '../config/apiConfig';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import EditCourseModal from '../components/EditCourseModal';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

const InstructorProfile = () => {
  const [userData, setUserData] = useState(null);
  const [createdCourses, setCreatedCourses] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    bio: '',
  });
  const [enrolledStudents, setEnrolledStudents] = useState({});
  const [analytics, setAnalytics] = useState([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [courseQuizzes, setCourseQuizzes] = useState({});
  const navigate = useNavigate();

  const fetchCourses = async (token) => {
    try {
      const res = await axios.get(`${API_CONFIG.BASE_URL}/courses/created`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCreatedCourses(res.data.courses);
    } catch {
      setCreatedCourses([]);
    }
  };

  // Fetch students for a course
  const fetchEnrolledStudents = async (courseId, token) => {
    try {
      const res = await axios.get(`${API_CONFIG.BASE_URL}/enrollments/course/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEnrolledStudents((prev) => ({ ...prev, [courseId]: res.data.enrollments.map(e => e.student) }));
    } catch {
      setEnrolledStudents((prev) => ({ ...prev, [courseId]: [] }));
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const decoded = jwtDecode(token);
      if (decoded.role !== 'Instructor') {
        navigate('/profile');
        return;
      }

      // Fetch user profile
      axios
        .get(`${API_CONFIG.BASE_URL}/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          setUserData(res.data.user);
          setFormData({
            firstName: res.data.user.firstName,
            lastName: res.data.user.lastName,
            email: res.data.user.email,
            bio: res.data.user.bio || '',
          });
        })
        .catch(() => {
          toast.error('Failed to load Instructor profile');
          localStorage.removeItem('token');
          navigate('/login');
        });

      // Fetch created courses
      fetchCourses(token).then(() => {
        // After fetching courses, fetch students for each course
        createdCourses.forEach((course) => {
          fetchEnrolledStudents(course._id, token);
        });
      });
    } catch (err) {
      console.error('Invalid token:', err);
      localStorage.removeItem('token');
      navigate('/login');
    }
  }, [navigate]);

  // Fetch analytics when userData is available
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (userData && userData.id) {
      axios
        .get(`${API_CONFIG.BASE_URL}/enrollments/analytics/instructor/${userData.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          setAnalytics(res.data.analytics);
          setTotalEarnings(res.data.totalEarnings || 0);
        })
        .catch(() => {
          setAnalytics([]);
          setTotalEarnings(0);
        });
    }
  }, [userData]);

  // Fetch quizzes for each course after createdCourses is loaded
  useEffect(() => {
    const token = localStorage.getItem('token');
    createdCourses.forEach((course) => {
      axios.get(`${API_CONFIG.BASE_URL}/course-content/course/${course._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => {
        setCourseQuizzes(prev => ({ ...prev, [course._id]: res.data.contents.filter(c => c.type === 'quiz') }));
      }).catch(() => {
        setCourseQuizzes(prev => ({ ...prev, [course._id]: [] }));
      });
    });
  }, [createdCourses]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const response = await axios.put(
        `${API_CONFIG.BASE_URL}/auth/update`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUserData(response.data.user);
      setIsModalOpen(false);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleEditCourse = (course) => {
    setEditingCourse(course);
    setIsModalOpen(true);
  };

  const handleSaveCourse = async (form) => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (value !== null && value !== undefined) formData.append(key, value);
    });
    try {
      await axios.put(`${API_CONFIG.BASE_URL}/courses/${editingCourse._id}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Course updated successfully!');
      setIsModalOpen(false);
      setEditingCourse(null);
      fetchCourses(token);
    } catch (err) {
      toast.error('Failed to update course.');
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API_CONFIG.BASE_URL}/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Course deleted successfully!');
      fetchCourses(token);
    } catch (err) {
      toast.error('Failed to delete course.');
    }
  };

  if (!userData) return null;

  return (
    <section className="px-4 py-12 min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <ToastContainer position="top-center" autoClose={3000} theme="colored" />
      <EditCourseModal
        open={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingCourse(null); }}
        course={editingCourse}
        onSave={handleSaveCourse}
      />
      <div className="mx-auto max-w-7xl">
        {/* Enhanced Header Section */}
        <div className="relative p-8 mb-10 overflow-hidden text-center bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl shadow-2xl">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="relative z-10">
            <div className="flex justify-center items-center mx-auto mb-6 w-32 h-32 bg-white bg-opacity-20 backdrop-blur-sm rounded-full border-4 border-white border-opacity-30">
              <span className="text-4xl font-bold text-white">
              {userData.firstName[0]}{userData.lastName[0]}
            </span>
          </div>
            <h1 className="mb-3 text-4xl font-bold text-white">
            {userData.firstName} {userData.lastName}
          </h1>
            <p className="mb-6 text-xl text-blue-100">Instructor & Course Creator</p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setIsModalOpen(true)}
                className="px-8 py-3 text-blue-600 font-semibold bg-white rounded-full transition-all duration-300 hover:bg-blue-50 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-white focus:ring-opacity-50"
              aria-label="Edit Profile"
            >
                <svg className="inline-block w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              Edit Profile
            </button>
            <Link
              to="/instructor/create-course"
                className="px-8 py-3 text-white font-semibold bg-blue-500 bg-opacity-80 backdrop-blur-sm rounded-full transition-all duration-300 hover:bg-blue-400 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-opacity-50"
              aria-label="Create New Course"
            >
                <svg className="inline-block w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              New Course
            </Link>
            </div>
          </div>
        </div>

        {/* Instructor Statistics Dashboard */}
        <div className="grid grid-cols-1 gap-6 mb-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="p-6 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-100">Total Earnings</p>
                <p className="text-2xl font-bold text-white">${totalEarnings?.toFixed(2) || '0.00'}</p>
              </div>
              <div className="p-3 bg-white bg-opacity-20 rounded-full">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          <div className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-100">Total Courses</p>
                <p className="text-2xl font-bold text-white">{createdCourses.length}</p>
              </div>
              <div className="p-3 bg-white bg-opacity-20 rounded-full">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
          </div>

          <div className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-100">Total Enrollments</p>
                <p className="text-2xl font-bold text-white">{analytics.reduce((sum, c) => sum + c.total, 0)}</p>
              </div>
              <div className="p-3 bg-white bg-opacity-20 rounded-full">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-100">Paid Enrollments</p>
                <p className="text-2xl font-bold text-white">{analytics.reduce((sum, c) => sum + c.paid, 0)}</p>
              </div>
              <div className="p-3 bg-white bg-opacity-20 rounded-full">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Instructor Details */}
        <div className="p-8 mb-10 bg-white rounded-2xl shadow-xl">
          <div className="flex items-center mb-6">
            <div className="p-3 mr-4 bg-blue-100 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Instructor Details</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center mb-2">
                  <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                  <span className="font-semibold text-gray-700">Email</span>
                </div>
                <p className="text-gray-600">{userData.email}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center mb-2">
                  <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  <span className="font-semibold text-gray-700">Earnings</span>
                </div>
                <p className="text-lg font-bold text-green-600">${userData.earnings?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center mb-2">
                  <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="font-semibold text-gray-700">Bio</span>
                </div>
                <p className="text-gray-600">{userData.bio || 'No bio provided.'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center mb-2">
                  <svg className="w-5 h-5 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-semibold text-gray-700">Joined</span>
                </div>
                <p className="text-gray-600">{new Date(userData.createdDate).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Created Courses Section */}
        <div className="p-8 bg-white rounded-2xl shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <div className="p-3 mr-4 bg-indigo-100 rounded-full">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Created Courses</h2>
                <p className="text-gray-600">Manage and monitor your course offerings</p>
              </div>
            </div>
            <Link
              to="/instructor/create-course"
              className="px-6 py-3 text-white font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-300 hover:from-indigo-600 hover:to-purple-700 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-indigo-300 focus:ring-opacity-50"
            >
              <svg className="inline-block w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Course
            </Link>
          </div>

          {createdCourses.length > 0 ? (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {createdCourses.map((course) => (
                <div
                  key={course._id}
                  className="group overflow-hidden bg-white rounded-2xl shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 border border-gray-100"
                >
                  <div className="relative overflow-hidden">
                  <img
                    src={course.coverImage || 'https://via.placeholder.com/300x200?text=Course'}
                    alt={course.title}
                      className="object-cover w-full h-48 transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute top-4 right-4">
                      <span className="px-3 py-1 text-xs font-semibold text-white bg-blue-500 rounded-full">
                        ${course.price.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="mb-3 text-xl font-bold text-gray-800 line-clamp-2">{course.title}</h3>
                    
                    <div className="mb-4 space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c1.1 0 2 .9 2 2v5.5M7 21h5c1.1 0 2-.9 2-2v-5.5" />
                        </svg>
                        <span className="font-medium">Category:</span>
                        <span className="ml-1 text-gray-500">{course.category}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="font-medium">Level:</span>
                        <span className="ml-1 text-gray-500">{course.level}</span>
                      </div>
                    </div>
                    
                    <p className="mb-4 text-sm text-gray-600 line-clamp-3">{course.description}</p>
                    
                    {course.sampleVideo && (
                      <div className="mb-4">
                      <a
                        href={course.sampleVideo}
                        target="_blank"
                        rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 transition-colors"
                        aria-label={`Watch sample video for ${course.title}`}
                      >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        Watch Sample Video
                      </a>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      <button
                        onClick={() => handleEditCourse(course)}
                        className="px-4 py-2 text-sm font-semibold text-yellow-700 bg-yellow-100 rounded-lg transition-colors hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                      >
                        <svg className="inline-block w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(course._id)}
                        className="px-4 py-2 text-sm font-semibold text-red-700 bg-red-100 rounded-lg transition-colors hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-300"
                      >
                        <svg className="inline-block w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                      <Link
                        to={`/instructor/course/${course._id}`}
                        className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg transition-all duration-300 hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                        aria-label={`View ${course.title}`}
                      >
                        <svg className="inline-block w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </Link>
                    </div>
                    
                    {/* Enhanced Enrolled Students Display */}
                    {enrolledStudents[course._id] && enrolledStudents[course._id].length > 0 && (
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center mb-3">
                          <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span className="text-sm font-semibold text-gray-700">
                            Enrolled Students ({enrolledStudents[course._id].length})
                          </span>
                        </div>
                        <div className="space-y-1">
                          {enrolledStudents[course._id].slice(0, 3).map((student) => (
                            <div key={student._id} className="flex items-center text-xs text-gray-600">
                              <div className="w-2 h-2 mr-2 bg-green-400 rounded-full"></div>
                              <span>{student.firstName} {student.lastName}</span>
                            </div>
                          ))}
                          {enrolledStudents[course._id].length > 3 && (
                            <div className="text-xs text-gray-500">
                              +{enrolledStudents[course._id].length - 3} more students
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto mb-6 w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-800">No courses created yet</h3>
              <p className="mb-6 text-gray-600">Start your teaching journey by creating your first course</p>
              <Link
                to="/instructor/create-course"
                className="inline-flex items-center px-6 py-3 text-white font-semibold bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-300 hover:from-blue-600 hover:to-purple-700 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-opacity-50"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Your First Course
              </Link>
            </div>
          )}
        </div>

        {/* Enhanced Edit Profile Modal */}
        {isModalOpen && !editingCourse && (
          <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
            <div className="p-8 w-full max-w-md bg-white rounded-2xl shadow-2xl">
              <div className="flex items-center mb-6">
                <div className="p-3 mr-4 bg-blue-100 rounded-full">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Edit Instructor Profile</h2>
              </div>
              <form onSubmit={handleUpdate} className="space-y-6">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="px-4 py-3 mt-1 w-full rounded-xl border border-gray-300 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    aria-required="true"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="px-4 py-3 mt-1 w-full rounded-xl border border-gray-300 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    aria-required="true"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="px-4 py-3 mt-1 w-full rounded-xl border border-gray-300 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    aria-required="true"
                  />
                </div>
                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    className="px-4 py-3 mt-1 w-full rounded-xl border border-gray-300 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="4"
                    placeholder="Tell us about your expertise and experience"
                  />
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 text-gray-700 font-semibold bg-gray-200 rounded-xl transition-colors hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    aria-label="Cancel"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 text-white font-semibold bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl transition-all duration-300 hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    aria-label="Save Changes"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default InstructorProfile;