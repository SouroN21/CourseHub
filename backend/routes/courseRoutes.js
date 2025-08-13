require('dotenv').config(); // Load .env FIRST!

const express = require('express');
const router = express.Router();
const User = require('../models/userModel.js');
const Course = require('../models/courseModel');
const Enrollment = require('../models/enrollmentModel');
const authMiddleware = require('../middleware/auth');
const mongoose = require('mongoose');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Multer memory storage config for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 104857600 }, // 100MB max
  fileFilter: (req, file, cb) => {
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    const allowedVideoTypes = ['video/mp4', 'video/webm'];
    if (
      (file.fieldname === 'coverImage' && allowedImageTypes.includes(file.mimetype)) ||
      (file.fieldname === 'sampleVideo' && allowedVideoTypes.includes(file.mimetype))
    ) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  },
});

// Helper: Upload buffer to Cloudinary (returns Promise)
const uploadBufferToCloudinary = (buffer, resourceType, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: resourceType, folder },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });

// Helper: Extract Cloudinary public ID from URL (safe)
const getCloudinaryPublicId = (url) => {
  if (!url) return null;
  try {
    // Get last segment of URL path, remove extension and query string
    const pathname = new URL(url).pathname; 
    const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
    return filename.split('.')[0];
  } catch {
    return null;
  }
};

// --- ROUTES ---

// POST /api/courses/purchase/:id - Purchase or enroll in a course
router.post('/purchase/:id', authMiddleware(['Student']), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid course ID' });

    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const student = await User.findById(req.user.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const instructor = await User.findOne({ createdCourses: course._id });
    if (!instructor) return res.status(404).json({ message: 'Instructor not found' });

    if (course.price === 0) {
      // Free course: enroll directly & send emails
      await transporter.sendMail({
        from: `"CourseHub" <${process.env.EMAIL_USER}>`,
        to: student.email,
        subject: `Enrollment Confirmation: ${course.title}`,
        html: `
          <h2>Enrollment Successful!</h2>
          <p>Dear ${student.firstName} ${student.lastName},</p>
          <p>You have successfully enrolled in <strong>${course.title}</strong> (Free).</p>
          <p>Start learning now!</p>
          <p>Best regards,<br>CourseHub Team</p>
        `,
      });
      await transporter.sendMail({
        from: `"CourseHub" <${process.env.EMAIL_USER}>`,
        to: instructor.email,
        subject: `New Enrollment in ${course.title}`,
        html: `
          <h2>New Student Enrollment</h2>
          <p>Dear ${instructor.firstName} ${instructor.lastName},</p>
          <p>A student (${student.firstName} ${student.lastName}) has enrolled in your course <strong>${course.title}</strong>.</p>
          <p>Best regards,<br>CourseHub Team</p>
        `,
      });

      return res.json({ message: 'Enrolled successfully' });
    }

    // Paid course: create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: course.title, description: course.description },
          unit_amount: Math.round(course.price * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `https://course-hub-front-green.vercel.app/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://course-hub-front-green.vercel.app/courses/${course._id}`,
      metadata: { course_id: course._id.toString(), student_id: student._id.toString() },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Purchase course error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/courses/purchase-success - Confirm purchase and enroll
router.post('/purchase-success', authMiddleware(['Student']), async (req, res) => {
  const { sessionId } = req.body;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') return res.status(400).json({ message: 'Payment not completed.' });

    const course_id = session.metadata.course_id;
    const student_id = session.metadata.student_id;
    if (!mongoose.Types.ObjectId.isValid(course_id) || !mongoose.Types.ObjectId.isValid(student_id)) {
      return res.status(400).json({ message: 'Invalid course or student ID' });
    }

    const course = await Course.findById(course_id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const student = await User.findById(student_id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    if (req.user.id !== student_id) return res.status(403).json({ message: 'Unauthorized' });

    await Enrollment.findOneAndUpdate(
      { student: student_id, course: course_id },
      {
        $setOnInsert: { enrolledAt: new Date() },
        paymentStatus: 'paid',
        paymentIntentId: session.payment_intent,
      },
      { upsert: true }
    );

    // Send emails
    await transporter.sendMail({
      from: `"CourseHub" <${process.env.EMAIL_USER}>`,
      to: student.email,
      subject: `Enrollment Confirmation: ${course.title}`,
      html: `
        <h2>Purchase Successful!</h2>
        <p>Dear ${student.firstName} ${student.lastName},</p>
        <p>You have successfully purchased and enrolled in <strong>${course.title}</strong> for $${course.price.toFixed(2)}.</p>
        <p>Start learning now!</p>
        <p>Best regards,<br>CourseHub Team</p>
      `,
    });

    const instructor = await User.findOne({ createdCourses: course_id });
    if (instructor) {
      await transporter.sendMail({
        from: `"CourseHub" <${process.env.EMAIL_USER}>`,
        to: instructor.email,
        subject: `New Enrollment in ${course.title}`,
        html: `
          <h2>New Student Enrollment</h2>
          <p>Dear ${instructor.firstName} ${instructor.lastName},</p>
          <p>A student (${student.firstName} ${student.lastName}) has purchased and enrolled in your course <strong>${course.title}</strong> for $${course.price.toFixed(2)}.</p>
          <p>Best regards,<br>CourseHub Team</p>
        `,
      });
    }

    res.json({ message: 'Enrollment confirmed' });
  } catch (error) {
    console.error('Purchase success error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/courses - View all courses (public)
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find().select('instructorName title coverImage category price level description sampleVideo createdAt');
    res.json({ courses });
  } catch (error) {
    console.error('Get all courses error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/courses/created - Fetch courses created by the authenticated Instructor
router.get('/created', authMiddleware(['Instructor']), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('createdCourses', 'instructorName title coverImage category price level description sampleVideo createdAt');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ courses: user.createdCourses });
  } catch (error) {
    console.error('Created courses error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/courses/:id - View a single course by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid course ID' });
    const course = await Course.findById(id).select('instructorName title coverImage category price level description sampleVideo createdAt');
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json({ course });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/courses/create - Create a new course (Instructor-only)
router.post('/create', authMiddleware(['Instructor']), upload.fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'sampleVideo', maxCount: 1 },
]), async (req, res) => {
  const { title, category, price, level, description } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    let coverImageUrl = '';
    let sampleVideoUrl = '';

    if (req.files?.coverImage?.[0]) {
      const result = await uploadBufferToCloudinary(req.files.coverImage[0].buffer, 'image', 'edaverse/courses/coverImages');
      coverImageUrl = result.secure_url;
    }

    if (req.files?.sampleVideo?.[0]) {
      const result = await uploadBufferToCloudinary(req.files.sampleVideo[0].buffer, 'video', 'edaverse/courses/sampleVideos');
      sampleVideoUrl = result.secure_url;
    }

    const course = new Course({
      instructorName: `${user.firstName} ${user.lastName}`,
      instructor: req.user.id,
      title,
      coverImage: coverImageUrl,
      category,
      price: parseFloat(price),
      level,
      description,
      sampleVideo: sampleVideoUrl,
    });

    await course.save();

    user.createdCourses.push(course._id);
    await user.save();

    res.status(201).json({ message: 'Course created successfully', course });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/courses/:id - Update a course by ID (Instructor who created it or Admin)
router.put('/:id', authMiddleware(['Instructor', 'Admin']), upload.fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'sampleVideo', maxCount: 1 },
]), async (req, res) => {
  const { title, category, price, level, description } = req.body;
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid course ID' });

    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    if (req.user.role === 'Instructor') {
      if (!course.instructor) return res.status(400).json({ message: 'Course instructor not set. Please contact admin.' });
      if (!course.instructor.equals(req.user.id)) return res.status(403).json({ message: 'Unauthorized to update this course' });
    }

    let coverImageUrl = course.coverImage;
    let sampleVideoUrl = course.sampleVideo;

    // Delete old and upload new coverImage if provided
    if (req.files?.coverImage?.[0]) {
      const publicId = getCloudinaryPublicId(coverImageUrl);
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(`edaverse/courses/coverImages/${publicId}`, { resource_type: 'image' });
        } catch (e) {
          console.warn('Failed to delete old cover image:', e.message);
        }
      }
      const result = await uploadBufferToCloudinary(req.files.coverImage[0].buffer, 'image', 'edaverse/courses/coverImages');
      coverImageUrl = result.secure_url;
    }

    // Delete old and upload new sampleVideo if provided
    if (req.files?.sampleVideo?.[0]) {
      const publicId = getCloudinaryPublicId(sampleVideoUrl);
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(`edaverse/courses/sampleVideos/${publicId}`, { resource_type: 'video' });
        } catch (e) {
          console.warn('Failed to delete old sample video:', e.message);
        }
      }
      const result = await uploadBufferToCloudinary(req.files.sampleVideo[0].buffer, 'video', 'edaverse/courses/sampleVideos');
      sampleVideoUrl = result.secure_url;
    }

    course.instructorName = `${req.user.firstName} ${req.user.lastName}`;
    course.title = title || course.title;
    course.coverImage = coverImageUrl;
    course.category = category || course.category;
    course.price = price !== undefined ? parseFloat(price) : course.price;
    course.level = level || course.level;
    course.description = description || course.description;
    course.sampleVideo = sampleVideoUrl;

    await course.save();

    res.json({ message: 'Course updated successfully', course });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/courses/:id - Delete a course by ID (Instructor who created it or Admin)
router.delete('/:id', authMiddleware(['Instructor', 'Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid course ID' });

    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    if (req.user.role === 'Instructor') {
      if (!course.instructor) return res.status(400).json({ message: 'Course instructor not set. Please contact admin.' });
      if (!course.instructor.equals(req.user.id)) return res.status(403).json({ message: 'Unauthorized to delete this course' });
    }

    // Delete images/videos from Cloudinary
    const coverImagePublicId = getCloudinaryPublicId(course.coverImage);
    if (coverImagePublicId) {
      try {
        await cloudinary.uploader.destroy(`edaverse/courses/coverImages/${coverImagePublicId}`, { resource_type: 'image' });
      } catch (e) {
        console.warn('Failed to delete cover image:', e.message);
      }
    }
    const sampleVideoPublicId = getCloudinaryPublicId(course.sampleVideo);
    if (sampleVideoPublicId) {
      try {
        await cloudinary.uploader.destroy(`edaverse/courses/sampleVideos/${sampleVideoPublicId}`, { resource_type: 'video' });
      } catch (e) {
        console.warn('Failed to delete sample video:', e.message);
      }
    }

    await Course.deleteOne({ _id: id });

    await User.updateMany(
      { createdCourses: id },
      { $pull: { createdCourses: id } }
    );

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
