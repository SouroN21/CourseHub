const express = require('express');
const router = express.Router();
const User = require('../models/userModel.js');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth.js');

// Signup
router.post('/signup', async (req, res) => {
  const { firstName, lastName, email, password, role, bio, earnings } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    user = new User({
      firstName,
      lastName,
      email,
      password,
      role: ['Admin', 'Instructor', 'Student'].includes(role) ? role : 'Student',
      bio: role === 'Instructor' ? bio : undefined,
      earnings: role === 'Instructor' ? (earnings || 0) : undefined,
      enrolledCourses: role === 'Student' ? [] : undefined,
    });

    await user.save();

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Signup error:', { message: error.message, stack: error.stack, email });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        bio: user.bio,
        earnings: user.earnings,
        enrolledCourses: user.enrolledCourses,
      },
    });
  } catch (error) {
    console.error('Login error:', { message: error.message, stack: error.stack, email });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Logout (client-side, just return success)
router.post('/logout', authMiddleware(['Admin', 'Instructor', 'Student']), (req, res) => {
  // Client clears token from localStorage
  res.json({ message: 'Logged out successfully' });
});

// Update Account
router.put('/update', authMiddleware(['Admin', 'Instructor', 'Student']), async (req, res) => {
  const { firstName, lastName, email, bio } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.email = email || user.email;
    if (user.role === 'Instructor') {
      user.bio = bio || user.bio;
    }

    await user.save();

    res.json({
      message: 'Account updated successfully',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        bio: user.bio,
        earnings: user.earnings,
        enrolledCourses: user.enrolledCourses,
      },
    });
  } catch (error) {
    console.error('Update account error:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete Account
router.delete('/delete', authMiddleware(['Admin', 'Instructor', 'Student']), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.deleteOne();
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete User (Admin only)
router.delete('/delete/:id', authMiddleware(['Admin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'Admin') {
      return res.status(403).json({ message: 'Cannot delete another Admin' });
    }

    await user.deleteOne();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// View Profile
router.get('/profile', authMiddleware(['Admin', 'Instructor', 'Student']), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').populate('enrolledCourses', 'title image');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        createdDate: user.createdDate,
        bio: user.bio,
        earnings: user.earnings,
        enrolledCourses: user.enrolledCourses,
      },
    });
  } catch (error) {
    console.error('View profile error:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;