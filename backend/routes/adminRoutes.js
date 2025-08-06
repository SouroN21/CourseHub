const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const Course = require('../models/courseModel');
const authMiddleware = require('../middleware/auth');
const os = require('os');

// Get all users
router.get('/users', authMiddleware(['Admin']), async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user count
router.get('/users/count', authMiddleware(['Admin']), async (req, res) => {
  try {
    const count = await User.countDocuments();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all courses
router.get('/courses', authMiddleware(['Admin']), async (req, res) => {
  try {
    const courses = await Course.find().populate('instructor', 'firstName lastName email');
    res.json({ courses });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get course count
router.get('/courses/count', authMiddleware(['Admin']), async (req, res) => {
  try {
    const count = await Course.countDocuments();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user role
router.put('/users/:id/role', authMiddleware(['Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!['Admin', 'Instructor', 'Student'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.role = role;
    await user.save();
    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete user
router.delete('/users/:id', authMiddleware(['Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'Admin') return res.status(403).json({ message: 'Cannot delete another Admin' });
    await user.deleteOne();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update course status
router.put('/courses/:id/status', authMiddleware(['Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['draft', 'published', 'archived'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    course.status = status;
    await course.save();
    res.json({ message: 'Course status updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete course
router.delete('/courses/:id', authMiddleware(['Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    await course.deleteOne();
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Enhanced user list with filtering, search, and pagination
router.get('/users', authMiddleware(['Admin']), async (req, res) => {
  try {
    let { page = 1, limit = 10, role, search } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    const totalUsers = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdDate: -1 });
    res.json({
      users,
      pagination: {
        totalUsers,
        usersPerPage: limit,
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Enhanced course list with filtering, search, and pagination
router.get('/courses', authMiddleware(['Admin']), async (req, res) => {
  try {
    let { page = 1, limit = 10, status, search } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    const totalCourses = await Course.countDocuments(query);
    const courses = await Course.find(query)
      .populate('instructor', 'firstName lastName email')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });
    res.json({
      courses,
      pagination: {
        totalCourses,
        coursesPerPage: limit,
        currentPage: page,
        totalPages: Math.ceil(totalCourses / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Analytics: user and course growth (last 12 months)
router.get('/analytics/growth', authMiddleware(['Admin']), async (req, res) => {
  try {
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    }).reverse();
    const userGrowth = await Promise.all(
      months.map(async ({ year, month }) => {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 1);
        const count = await User.countDocuments({ createdDate: { $gte: start, $lt: end } });
        return { year, month, count };
      })
    );
    const courseGrowth = await Promise.all(
      months.map(async ({ year, month }) => {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 1);
        const count = await Course.countDocuments({ createdAt: { $gte: start, $lt: end } });
        return { year, month, count };
      })
    );
    res.json({ userGrowth, courseGrowth });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Analytics: role distribution
router.get('/analytics/roles', authMiddleware(['Admin']), async (req, res) => {
  try {
    const roles = ['Admin', 'Instructor', 'Student'];
    const counts = await Promise.all(roles.map(async role => ({ role, count: await User.countDocuments({ role }) })));
    res.json({ roles: counts });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Analytics: total revenue (sum of all instructor earnings)
router.get('/analytics/revenue', authMiddleware(['Admin']), async (req, res) => {
  try {
    const instructors = await User.find({ role: 'Instructor' });
    const totalRevenue = instructors.reduce((sum, i) => sum + (i.earnings || 0), 0);
    res.json({ totalRevenue });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// System health: server status, uptime, memory, CPU, load
router.get('/system/health', authMiddleware(['Admin']), (req, res) => {
  try {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: os.cpus(),
      load: os.loadavg(),
      platform: os.platform(),
      release: os.release(),
      hostname: os.hostname(),
      arch: os.arch(),
      totalmem: os.totalmem(),
      freemem: os.freemem(),
      nodeVersion: process.version,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// System health: error logs (dummy for now)
router.get('/system/errors', authMiddleware(['Admin']), (req, res) => {
  // In production, integrate with a real log system
  res.json({ logs: [
    { timestamp: new Date(), level: 'info', message: 'System running smoothly.' }
  ] });
});

module.exports = router;