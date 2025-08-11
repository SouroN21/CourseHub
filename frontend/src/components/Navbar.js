import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [role, setRole] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setRole(decoded.role);
      } catch (error) {
        console.error('Invalid token:', error);
        localStorage.removeItem('token');
        navigate('/login');
      }
    } else {
      setRole(null);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setRole(null);
    navigate('/login', { state: { message: 'Logged out successfully!' } });
  };

  // Determine profile route based on role
  const profileRoute = role === 'Instructor' ? '/instructor/profile' : '/profile';

  return (
    <nav className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-md fixed w-full z-50">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <Link
          to="/"
          className="text-white text-3xl font-extrabold tracking-wide hover:text-yellow-300 transition"
          aria-label="EduVerse Home"
        >
          EduVerse
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-6 text-white font-semibold">
          <Link
            to="/"
            className="hover:text-yellow-300 transition"
            aria-label="Home"
          >
            Home
          </Link>
          <Link
            to="/courses"
            className="hover:text-yellow-300 transition"
            aria-label="Courses"
          >
            Courses
          </Link>

          {role ? (
            <>
              <Link
                to={profileRoute}
                className="hover:text-yellow-300 transition"
                aria-label="Profile"
              >
                Profile
              </Link>
              {role === 'Admin' && (
                <>
                  <Link
                    to="/admin/dashboard"
                    className="hover:text-yellow-300 transition"
                    aria-label="Admin Dashboard"
                  >
                    Admin Dashboard
                  </Link>
                  <Link
                    to="/admin/create"
                    className="hover:text-yellow-300 transition"
                    aria-label="Create Admin"
                  >
                    Create Admin
                  </Link>
                </>
              )}
              <button
                onClick={handleLogout}
                className="ml-4 bg-yellow-400 text-indigo-900 font-bold py-2 px-5 rounded-lg shadow-md hover:bg-yellow-500 transition focus:outline-none focus:ring-4 focus:ring-yellow-300"
                aria-label="Logout"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="hover:text-yellow-300 transition"
                aria-label="Login"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="ml-4 bg-yellow-400 text-indigo-900 font-bold py-2 px-5 rounded-lg shadow-md hover:bg-yellow-500 transition focus:outline-none focus:ring-4 focus:ring-yellow-300"
                aria-label="Signup"
              >
                Signup
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
            className="text-white focus:outline-none focus:ring-2 focus:ring-yellow-300"
          >
            {isOpen ? (
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-indigo-700 text-white shadow-lg">
          <Link
            to="/"
            className="block px-6 py-3 hover:bg-indigo-800 transition"
            aria-label="Home"
            onClick={() => setIsOpen(false)}
          >
            Home
          </Link>
          <Link
            to="/courses"
            className="block px-6 py-3 hover:bg-indigo-800 transition"
            aria-label="Courses"
            onClick={() => setIsOpen(false)}
          >
            Courses
          </Link>

          {role ? (
            <>
              <Link
                to={profileRoute}
                className="block px-6 py-3 hover:bg-indigo-800 transition"
                aria-label="Profile"
                onClick={() => setIsOpen(false)}
              >
                Profile
              </Link>
              {role === 'Admin' && (
                <>
                  <Link
                    to="/admin/dashboard"
                    className="block px-6 py-3 hover:bg-indigo-800 transition"
                    aria-label="Admin Dashboard"
                    onClick={() => setIsOpen(false)}
                  >
                    Admin Dashboard
                  </Link>
                  <Link
                    to="/admin/create"
                    className="block px-6 py-3 hover:bg-indigo-800 transition"
                    aria-label="Create Admin"
                    onClick={() => setIsOpen(false)}
                  >
                    Create Admin
                  </Link>
                </>
              )}
              <button
                onClick={() => {
                  handleLogout();
                  setIsOpen(false);
                }}
                className="w-full text-left px-6 py-3 bg-yellow-400 text-indigo-900 font-bold hover:bg-yellow-500 transition focus:outline-none focus:ring-4 focus:ring-yellow-300"
                aria-label="Logout"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="block px-6 py-3 hover:bg-indigo-800 transition"
                aria-label="Login"
                onClick={() => setIsOpen(false)}
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="block px-6 py-3 bg-yellow-400 text-indigo-900 font-bold hover:bg-yellow-500 transition"
                aria-label="Signup"
                onClick={() => setIsOpen(false)}
              >
                Signup
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;