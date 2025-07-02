const express = require('express');
const router = express.Router();
const CourseContent = require('../models/courseContentModel');
const Course = require('../models/courseModel');
const Enrollment = require('../models/enrollmentModel');
const authMiddleware = require('../middleware/auth');
const mongoose = require('mongoose');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');

// Assume multer/cloudinary config is set up elsewhere
const upload = multer({ dest: 'uploads/' });

// Create content (Instructor only)
router.post('/', authMiddleware(['Instructor']), upload.single('file'), async (req, res) => {
  try {
    const { course, type, title, description, liveDate, dueDate, questions, noticeText, externalLink } = req.body;
    if (!mongoose.Types.ObjectId.isValid(course)) {
      return res.status(400).json({ message: 'Invalid course ID' });
    }
    // Check instructor owns the course
    const foundCourse = await Course.findById(course);
    if (!foundCourse || foundCourse.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    let contentUrl = undefined;
    let assignmentFile = undefined;
    if (req.file) {
      // Upload file to cloudinary
      const uploadRes = await cloudinary.uploader.upload(req.file.path, { resource_type: 'auto' });
      if (type === 'assignment') assignmentFile = uploadRes.secure_url;
      else contentUrl = uploadRes.secure_url;
    }
    const content = new CourseContent({
      course,
      type,
      title,
      description,
      contentUrl,
      liveDate,
      dueDate,
      questions: questions ? JSON.parse(questions) : undefined,
      noticeText,
      assignmentFile,
      externalLink,
      createdBy: req.user.id,
      pollOptions: req.body.pollOptions ? JSON.parse(req.body.pollOptions) : undefined,
      surveyQuestions: req.body.surveyQuestions ? JSON.parse(req.body.surveyQuestions) : undefined
    });
    await content.save();
    res.status(201).json({ message: 'Content created', content });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// List all content for a course (Instructor or enrolled Student)
router.get('/course/:courseId', authMiddleware(['Instructor', 'Student', 'Admin']), async (req, res) => {
  try {
    const { courseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ message: 'Invalid course ID' });
    }
    // If student, check enrollment
    if (req.user.role === 'Student') {
      const enrolled = await Enrollment.findOne({ student: req.user.id, course: courseId });
      if (!enrolled) return res.status(403).json({ message: 'Not enrolled' });
    }
    const contents = await CourseContent.find({ course: courseId }).sort({ createdAt: 1 });
    res.json({ contents });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single content item
router.get('/:id', authMiddleware(['Instructor', 'Student', 'Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid content ID' });
    }
    const content = await CourseContent.findById(id);
    if (!content) return res.status(404).json({ message: 'Not found' });
    res.json({ content });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update content (Instructor only, must own course)
router.put('/:id', authMiddleware(['Instructor']), upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid content ID' });
    }
    const content = await CourseContent.findById(id);
    if (!content) return res.status(404).json({ message: 'Not found' });
    const course = await Course.findById(content.course);
    if (!course || course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    let contentUrl = content.contentUrl;
    let assignmentFile = content.assignmentFile;
    if (req.file) {
      const uploadRes = await cloudinary.uploader.upload(req.file.path, { resource_type: 'auto' });
      if (content.type === 'assignment') assignmentFile = uploadRes.secure_url;
      else contentUrl = uploadRes.secure_url;
    }
    const update = {
      ...req.body,
      contentUrl,
      assignmentFile,
      questions: req.body.questions ? JSON.parse(req.body.questions) : content.questions,
      pollOptions: req.body.pollOptions ? JSON.parse(req.body.pollOptions) : content.pollOptions,
      surveyQuestions: req.body.surveyQuestions ? JSON.parse(req.body.surveyQuestions) : content.surveyQuestions
    };
    const updated = await CourseContent.findByIdAndUpdate(id, update, { new: true });
    res.json({ message: 'Content updated', content: updated });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete content (Instructor only, must own course)
router.delete('/:id', authMiddleware(['Instructor']), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid content ID' });
    }
    const content = await CourseContent.findById(id);
    if (!content) return res.status(404).json({ message: 'Not found' });
    const course = await Course.findById(content.course);
    if (!course || course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    await CourseContent.findByIdAndDelete(id);
    res.json({ message: 'Content deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 