import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../logo.svg';

const Home = () => {
  return (
    <div className="flex-1 bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary to-secondary text-white py-24 px-4 flex flex-col items-center justify-center min-h-[60vh]">
        <img src={logo} alt="EduVerse Logo" className="w-24 h-24 mb-6 animate-bounce drop-shadow-xl" />
        <h1 className="mb-4 text-5xl font-extrabold text-center md:text-6xl drop-shadow-lg">
          Welcome to <span className="text-yellow-300">EduVerse</span>
        </h1>
        <p className="max-w-2xl mx-auto mb-8 text-lg text-center md:text-2xl text-white/90">
          Unlock your potential with world-class courses, expert instructors, and a vibrant learning community.
        </p>
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            to="/signup"
            className="px-8 py-3 text-lg font-bold text-indigo-900 transition bg-yellow-400 rounded-lg shadow-md hover:bg-yellow-500"
          >
            Get Started
          </Link>
          <Link
            to="/courses"
            className="px-8 py-3 text-lg font-bold transition bg-white rounded-lg shadow-md text-primary hover:bg-gray-200"
          >
            Browse Courses
          </Link>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="mb-12 text-3xl font-bold text-center md:text-4xl text-primary">
            Featured Courses
          </h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: 'Web Development Bootcamp', desc: 'Master HTML, CSS, and JavaScript in 8 weeks.', img: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=600&q=80' },
              { title: 'Data Science Fundamentals', desc: 'Learn Python, Pandas, and Machine Learning basics.', img: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=600&q=80' },
              { title: 'Digital Marketing Mastery', desc: 'Boost your business with SEO and social media strategies.', img: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80' },
            ].map((course, index) => (
              <div
                key={index}
                className="overflow-hidden transition transform bg-white shadow-lg rounded-2xl hover:shadow-2xl hover:-translate-y-2"
              >
                <img src={course.img} alt={course.title} className="object-cover w-full h-48" />
                <div className="p-6">
                  <h3 className="mb-2 text-xl font-semibold text-primary">{course.title}</h3>
                  <p className="mb-4 text-gray-600">{course.desc}</p>
                  <Link
                    to="/courses"
                    className="font-semibold text-primary hover:underline"
                  >
                    Learn More
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-4 py-20 bg-gradient-to-r from-primary to-secondary">
        <div className="max-w-4xl mx-auto">
          <h2 className="mb-12 text-3xl font-bold text-center text-yellow-300 md:text-4xl">
            What Our Users Say
          </h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {[
              { name: 'Sarah L.', role: 'Student', quote: 'EduVerse helped me master Python in just weeks!' },
              { name: 'John M.', role: 'Instructor', quote: 'Teaching on EduVerse is seamless and rewarding.' },
            ].map((testimonial, index) => (
              <div
                key={index}
                className="p-8 transition shadow-lg bg-white/90 rounded-2xl hover:shadow-2xl"
              >
                <p className="mb-4 text-lg italic text-gray-700">"{testimonial.quote}"</p>
                <p className="font-semibold text-primary">{testimonial.name}</p>
                <p className="text-gray-500">{testimonial.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

  
    </div>
  );
};

export default Home;