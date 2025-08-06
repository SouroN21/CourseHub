const express = require('express');
const router = express.Router();
const Enrollment = require('../models/enrollmentModel');
const User = require('../models/userModel');
const Course = require('../models/courseModel');
const authMiddleware = require('../middleware/auth');
const mongoose = require('mongoose');

// POST /api/enrollments - Enroll a student in a course
router.post('/', authMiddleware(['Student']), async (req, res) => {
  const { courseId, paymentStatus, paymentIntentId } = req.body;
  try {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: 'Invalid course ID' });
    }
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    // Upsert enrollment (no duplicates)
    const enrollment = await Enrollment.findOneAndUpdate(
      { student: req.user.id, course: courseId },
      {
        $setOnInsert: {
          enrolledAt: new Date(),
        },
        paymentStatus: paymentStatus || (course.price === 0 ? 'free' : 'paid'),
        paymentIntentId: paymentIntentId || null,
      },
      { new: true, upsert: true }
    );
    res.status(201).json({ message: 'Enrolled successfully', enrollment });
  } catch (error) {
    console.error('Enroll error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/enrollments/student/:studentId - Get all courses for a student
router.get('/student/:studentId', authMiddleware(['Student', 'Instructor', 'Admin']), async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: 'Invalid student ID' });
    }
    const enrollments = await Enrollment.find({ student: studentId }).populate({
      path: 'course',
      populate: { path: 'instructor', select: 'firstName lastName name email' }
    });
    res.json({ enrollments });
  } catch (error) {
    console.error('Get student enrollments error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/enrollments/course/:courseId - Get all students in a course
router.get('/course/:courseId', authMiddleware(['Instructor', 'Admin']), async (req, res) => {
  try {
    const { courseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: 'Invalid course ID' });
    }
    const enrollments = await Enrollment.find({ course: courseId }).populate('student');
    res.json({ enrollments });
  } catch (error) {
    console.error('Get course enrollments error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/enrollments/analytics/instructor/:instructorId
router.get('/analytics/instructor/:instructorId', authMiddleware(['Instructor', 'Admin']), async (req, res) => {
  try {
    const { instructorId } = req.params;
    const courses = await Course.find({ instructor: instructorId });
    const courseIds = courses.map(c => c._id);
    const enrollments = await Enrollment.find({ course: { $in: courseIds } });

    // Group enrollments by course
    const enrollmentsByCourse = {};
    enrollments.forEach(e => {
      const cid = e.course.toString();
      if (!enrollmentsByCourse[cid]) enrollmentsByCourse[cid] = [];
      enrollmentsByCourse[cid].push(e);
    });

    let totalEarnings = 0;
    const analytics = [];
    for (const course of courses) {
      const courseEnrollments = enrollmentsByCourse[course._id.toString()] || [];
      const paid = courseEnrollments.filter(e => e.paymentStatus === 'paid').length;
      const free = courseEnrollments.filter(e => e.paymentStatus === 'free').length;
      const earnings = paid * course.price;
      totalEarnings += earnings;
      // Group by day
      const dailyMap = {};
      courseEnrollments.forEach(e => {
        const day = e.enrolledAt.toISOString().slice(0, 10);
        dailyMap[day] = (dailyMap[day] || 0) + 1;
      });
      const dailyEnrollments = Object.entries(dailyMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
      analytics.push({
        courseId: course._id,
        title: course.title,
        total: courseEnrollments.length,
        paid,
        free,
        earnings,
        price: course.price,
        dailyEnrollments,
        recent: courseEnrollments
          .sort((a, b) => b.enrolledAt - a.enrolledAt)
          .slice(0, 5)
          .map(e => ({
            student: e.student,
            enrolledAt: e.enrolledAt,
            paymentStatus: e.paymentStatus,
          })),
      });
    }
    res.json({ analytics, totalEarnings });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/enrollments/analytics/course/:courseId - Per-course analytics
router.get('/analytics/course/:courseId', authMiddleware(['Instructor', 'Admin']), async (req, res) => {
  try {
    const { courseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: 'Invalid course ID' });
    }
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    const enrollments = await Enrollment.find({ course: courseId }).populate('student');
    const paid = enrollments.filter(e => e.paymentStatus === 'paid').length;
    const free = enrollments.filter(e => e.paymentStatus === 'free').length;
    const earnings = paid * course.price;
    // Group by day
    const dailyMap = {};
    enrollments.forEach(e => {
      const day = e.enrolledAt.toISOString().slice(0, 10);
      dailyMap[day] = (dailyMap[day] || 0) + 1;
    });
    const dailyEnrollments = Object.entries(dailyMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    // Revenue over time
    const dailyRevenueMap = {};
    enrollments.forEach(e => {
      const day = e.enrolledAt.toISOString().slice(0, 10);
      if (e.paymentStatus === 'paid') {
        dailyRevenueMap[day] = (dailyRevenueMap[day] || 0) + course.price;
      }
    });
    const dailyRevenue = Object.entries(dailyRevenueMap)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));
    // Student list
    const students = enrollments.map(e => ({
      id: e.student._id,
      name: `${e.student.firstName} ${e.student.lastName}`,
      email: e.student.email,
      enrolledAt: e.enrolledAt,
      paymentStatus: e.paymentStatus,
      country: e.student.country || null,
      progress: e.progress || 0,
      certificateIssued: e.certificateIssued || false
    }));
    // Completion rate (if progress tracked)
    const completed = students.filter(s => s.progress >= 100 || s.certificateIssued).length;
    const completionRate = students.length > 0 ? (completed / students.length) * 100 : 0;
    res.json({
      courseId,
      title: course.title,
      total: enrollments.length,
      paid,
      free,
      earnings,
      price: course.price,
      dailyEnrollments,
      dailyRevenue,
      students,
      completionRate
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/enrollments/:courseId/complete/:contentId - Mark content as complete, update progress, and issue certificate
router.post('/:courseId/complete/:contentId', authMiddleware(['Student']), async (req, res) => {
  const { courseId, contentId } = req.params;
  const userId = req.user.id;
  try {
    if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(contentId)) {
      return res.status(400).json({ message: 'Invalid course or content ID' });
    }
    // Find enrollment
    const enrollment = await Enrollment.findOne({ student: userId, course: courseId });
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }
    // Add contentId to completedContent if not already present
    if (!enrollment.completedContent) enrollment.completedContent = [];
    if (!enrollment.completedContent.map(id => id.toString()).includes(contentId)) {
      enrollment.completedContent.push(contentId);
    }
    // Count total course contents
    const CourseContent = require('../models/courseContentModel');
    const totalContents = await CourseContent.countDocuments({ course: courseId });
    // Update progress
    enrollment.progress = totalContents > 0 ? Math.round((enrollment.completedContent.length / totalContents) * 100) : 0;
    // Issue certificate if 100% complete
    if (enrollment.progress === 100 && !enrollment.certificateIssued) {
      enrollment.certificateIssued = true;
      // Generate a certificate URL (placeholder, replace with real logic if needed)
      enrollment.certificateUrl = `/certificates/${enrollment._id}.pdf`;
    }
    await enrollment.save();
    res.json({ message: 'Progress updated', progress: enrollment.progress, certificateIssued: enrollment.certificateIssued, certificateUrl: enrollment.certificateUrl });
  } catch (error) {
    console.error('Mark content complete error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 