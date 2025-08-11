import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API_CONFIG from '../config/apiConfig';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';

const CourseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [alreadyEnrolled, setAlreadyEnrolled] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const res = await fetch(`${API_CONFIG.BASE_URL}/courses/${id}`);
        const data = await res.json();
        setCourse(data.course);
      } catch (err) {
        setError('Failed to fetch course details');
      }
    };
    fetchCourse();
  }, [id]);

  const fetchStudentEnrollments = async (userId, token) => {
    try {
      const res = await axios.get(`${API_CONFIG.BASE_URL}/enrollments/student/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.enrollments.some((e) => e.course._id === id)) {
        setAlreadyEnrolled(true);
        setMessage('You are already enrolled in this course.');
      } else {
        setAlreadyEnrolled(false);
      }
    } catch {}
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    let role = '';
    let userId = '';
    try {
      const decoded = jwtDecode(token);
      role = decoded.role;
      userId = decoded.id;
      if (role === 'Student') {
        fetchStudentEnrollments(userId, token);
      }
    } catch (err) {}
  }, [id]);

  const handleEnroll = async () => {
    setMessage('');
    setError('');
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      navigate('/login');
      return;
    }
    let role = '';
    let userId = '';
    try {
      const decoded = jwtDecode(token);
      role = decoded.role;
      userId = decoded.id;
    } catch (err) {
      setLoading(false);
      localStorage.removeItem('token');
      navigate('/login');
      return;
    }
    if (role !== 'Student') {
      setLoading(false);
      setMessage('Only students can enroll in courses.');
      return;
    }
    try {
      if (course.price === 0) {
        await axios.post(
          `${API_CONFIG.BASE_URL}/enrollments`,
          { courseId: id, paymentStatus: 'free' },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMessage('Enrolled successfully!');
        setAlreadyEnrolled(true);
        fetchStudentEnrollments(userId, token);
        setTimeout(() => navigate('/courses'), 1500);
      } else {
        const res = await axios.post(
          `${API_CONFIG.BASE_URL}/courses/purchase/${id}`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data.url) {
          window.location.href = res.data.url;
        } else {
          setError('Failed to initiate payment.');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to enroll.');
    } finally {
      setLoading(false);
    }
  };

  if (error) return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="p-6 text-xl text-red-600 bg-red-50 rounded-lg shadow-lg">
        {error}
      </div>
    </div>
  );

  if (!course) return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="text-xl font-semibold text-blue-600">Loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="relative py-8 text-white bg-gradient-to-r from-blue-700 to-indigo-700">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-4 items-center mb-4">
            <Link
              to="/courses"
              className="inline-flex items-center px-4 py-2 text-white bg-white bg-opacity-20 rounded-full transition-colors duration-300 hover:bg-opacity-30"
            >
              <svg className="mr-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Courses
            </Link>
            <span className="px-4 py-1 text-sm font-medium bg-white bg-opacity-20 rounded-full">{course.category}</span>
            <span className="px-4 py-1 text-sm font-medium bg-white bg-opacity-20 rounded-full">{course.level}</span>
            <span className="px-4 py-1 text-sm font-medium bg-white bg-opacity-20 rounded-full">${course.price}</span>
          </div>
          <div className="flex gap-4 items-center mb-4">
            <div className="p-2 bg-white bg-opacity-20 rounded-full">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold md:text-4xl">{course.title}</h1>
          </div>
          <p className="max-w-3xl text-lg text-gray-100">{course.description}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-12 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Course Content */}
          <div className="space-y-8 lg:col-span-2">
            {/* Course Image */}
            <div className="overflow-hidden bg-white rounded-2xl shadow-lg">
              <img
                src={course.coverImage || 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=600&q=80'}
                alt={course.title}
                className="object-cover w-full h-64"
              />
            </div>

            {/* Course Information */}
            <div className="p-6 bg-white rounded-2xl shadow-lg">
              <div className="flex items-center mb-6">
                <div className="p-2 mr-3 bg-blue-100 rounded-full">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Course Details</h2>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex gap-3 items-center">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c1.1 0 2 .9 2 2v5.5M7 21h5c1.1 0 2-.9 2-2v-5.5" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Category</p>
                      <p className="font-semibold text-gray-800">{course.category}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Level</p>
                      <p className="font-semibold text-gray-800">{course.level}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-3 items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Price</p>
                      <p className="font-semibold text-gray-800">${course.price}</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-center">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Instructor</p>
                      <p className="font-semibold text-gray-800">{course.instructorName || 'Instructor'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sample Video */}
          {course.sampleVideo && (
              <div className="p-6 bg-white rounded-2xl shadow-lg">
                <div className="flex items-center mb-6">
                  <div className="p-2 mr-3 bg-red-100 rounded-full">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">Preview Video</h2>
                </div>
                <video
                  src={course.sampleVideo}
                  controls
                  className="w-full h-80 rounded-lg border border-gray-200"
                />
            </div>
          )}
          </div>

          {/* Right Column - Enrollment Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 p-6 bg-white rounded-2xl shadow-lg">
              <div className="mb-6 text-center">
                <div className="text-3xl font-bold text-gray-800">${course.price}</div>
                <div className="mt-1 text-sm text-gray-500">
                  {course.price === 0 ? 'Free Course' : 'One-time payment'}
                </div>
              </div>

              <div className="mb-6 space-y-3">
                <div className="flex gap-3 items-center p-3 bg-green-50 rounded-lg">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-green-700">Lifetime access</span>
                </div>
                <div className="flex gap-3 items-center p-3 bg-blue-50 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span className="text-sm text-blue-700">Certificate included</span>
                </div>
                <div className="flex gap-3 items-center p-3 bg-purple-50 rounded-lg">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span className="text-sm text-purple-700">30-day money-back guarantee</span>
                </div>
              </div>

          <button
            onClick={handleEnroll}
            disabled={loading || alreadyEnrolled}
                className={`w-full py-3 rounded-lg font-semibold text-white transition-all duration-300 flex items-center justify-center
                  ${alreadyEnrolled ? 'bg-green-500 cursor-not-allowed' : 
                    loading ? 'bg-gray-400 cursor-not-allowed' : 
                    'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 hover:shadow-lg'}`}
              >
                {alreadyEnrolled ? (
                  <>
                    <svg className="mr-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Already Enrolled
                  </>
                ) : loading ? (
                  <>
                    <svg className="mr-2 w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="mr-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Enroll Now
                  </>
                )}
          </button>

              {message && (
                <div className="flex items-center p-3 mt-4 bg-green-50 rounded-lg border border-green-200">
                  <svg className="mr-2 w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-green-700">{message}</p>
                </div>
              )}

              {error && (
                <div className="flex items-center p-3 mt-4 bg-red-50 rounded-lg border border-red-200">
                  <svg className="mr-2 w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <p className="mt-4 text-xs text-center text-gray-500">
                By enrolling, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetails;