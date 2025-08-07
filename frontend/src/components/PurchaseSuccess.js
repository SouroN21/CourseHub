import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import API_CONFIG from '../config/apiConfig';

const PurchaseSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [message, setMessage] = useState('Enrolling you in the course...');
  const [error, setError] = useState('');

  useEffect(() => {
    const enroll = async () => {
      const params = new URLSearchParams(location.search);
      const session_id = params.get('session_id');
      const token = localStorage.getItem('token');
      if (!session_id || !token) {
        setError('Invalid enrollment request.');
        setMessage('');
        return;
      }
      try {
        const res = await fetch(`${API_CONFIG.BASE_URL}/courses/purchase-success`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ sessionId: session_id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to enroll.');
        setMessage('You have successfully enrolled in the course. Start learning now!');
        setError('');
      } catch (err) {
        setError(err.message || 'Failed to enroll.');
        setMessage('');
      }
    };
    enroll();
  }, [location.search]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-10 flex flex-col items-center max-w-md w-full">
        <svg className="w-20 h-20 text-green-500 mb-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M8 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h1 className="text-3xl font-extrabold text-primary mb-4 text-center">Purchase Successful!</h1>
        {message && <p className="text-gray-700 mb-6 text-center">{message}</p>}
        {error && <p className="text-red-600 mb-6 text-center">{error}</p>}
        <Link to="/profile" className="bg-primary text-white px-6 py-3 rounded-lg font-bold hover:bg-secondary transition text-lg">Go to My Profile</Link>
      </div>
    </div>
  );
};

export default PurchaseSuccess;