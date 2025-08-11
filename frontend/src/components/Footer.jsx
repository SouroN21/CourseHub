import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../logo.svg';

const Footer = () => (
  <footer className="bg-primary text-white py-8 px-4 mt-10">
    <div className="max-w-6xl mx-auto text-center">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-2 justify-center">
          <img src={logo} alt="EduVerse Logo" className="w-8 h-8" />
          <span className="font-bold text-lg tracking-wide">EduVerse</span>
        </div>
        <div className="space-x-4">
          <Link to="/about" className="hover:text-yellow-300 transition">About</Link>
          <Link to="/contact" className="hover:text-yellow-300 transition">Contact</Link>
          <Link to="/privacy" className="hover:text-yellow-300 transition">Privacy Policy</Link>
        </div>
      </div>
      <p className="text-sm text-white/80">© 2025 EduVerse. All rights reserved.</p>
    </div>
  </footer>
);

export default Footer; 