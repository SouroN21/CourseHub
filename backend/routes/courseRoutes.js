require('dotenv').config(); // Load .env FIRST!

const express = require('express');
const router = express.Router();
const User = require('../models/userModel.js');
const Course = require('../models/courseModel');
const authMiddleware = require('../middleware/auth');
const mongoose = require('mongoose'); // Add mongoose for ObjectId validation
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

// Configure Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 104857600, // 100MB max for videos
  },
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

// POST /api/courses/purchase/:id - Purchase or enroll in a course
router.post('/purchase/:id', authMiddleware(['Student']), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid course ID' });
    }
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const student = await User.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check if already enrolled
    if (student.enrolledCourses.includes(id)) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }

    // Find instructor
    const instructor = await User.findOne({ createdCourses: course._id });
    if (!instructor) {
      return res.status(404).json({ message: 'Instructor not found' });
    }

    // Free course: Enroll directly
    if (course.price === 0) {
      student.enrolledCourses.push(course._id);
      await student.save();

      // Send email to student
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

      // Send email to instructor
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

    // Paid course: Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: course.title,
              description: course.description,
            },
            unit_amount: Math.round(course.price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `http://localhost:3000/purchase-success?course_id=${course._id}&student_id=${student._id}`,
      cancel_url: `http://localhost:3000/courses/${course._id}`,
      metadata: {
        course_id: course._id.toString(),
        student_id: student._id.toString(),
      },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Purchase course error:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/courses/purchase-success - Confirm purchase and enroll
router.post('/purchase-success', authMiddleware(['Student']), async (req, res) => {
  const { course_id, student_id } = req.body;

  try {
    if (!mongoose.Types.ObjectId.isValid(course_id) || !mongoose.Types.ObjectId.isValid(student_id)) {
      return res.status(400).json({ message: 'Invalid course or student ID' });
    }

    const course = await Course.findById(course_id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const student = await User.findById(student_id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (req.user.id !== student_id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Enroll student
    if (!student.enrolledCourses.includes(course_id)) {
      student.enrolledCourses.push(course_id);
      await student.save();

      // Send email to student
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

      // Find instructor
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
    }

    res.json({ message: 'Enrollment confirmed' });
  } catch (error) {
    console.error('Purchase success error:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/courses - View all courses (public)
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find().select('instructorName title coverImage category price level description sampleVideo createdAt');
    res.json({ courses });
  } catch (error) {
    console.error('Get all courses error:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/courses/created - Fetch courses created by the authenticated Instructor
router.get('/created', authMiddleware(['Instructor']), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('createdCourses', 'instructorName title coverImage category price level description sampleVideo createdAt');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ courses: user.createdCourses });
  } catch (error) {
    console.error('Created courses error:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/courses/:id - View a single course by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid course ID' });
    }
    const course = await Course.findById(id).select('instructorName title coverImage category price level description sampleVideo createdAt');
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.json({ course });
  } catch (error) {
    console.error('Get course error:', { message: error.message, stack: error.stack });
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
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let coverImageUrl = '';
    let sampleVideoUrl = '';

    if (req.files && req.files.coverImage) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'image', folder: 'edaverse/courses/coverImages' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.files.coverImage[0].buffer);
      });
      coverImageUrl = result.secure_url;
    }

    if (req.files && req.files.sampleVideo) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'video', folder: 'edaverse/courses/sampleVideos' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.files.sampleVideo[0].buffer);
      });
      sampleVideoUrl = result.secure_url;
    }

    const course = new Course({
      instructorName: `${user.firstName} ${user.lastName}`,
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
    console.error('Create course error:', { message: error.message, stack: error.stack });
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
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid course ID' });
    }
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (req.user.role === 'Instructor' && course.instructorName !== `${req.user.firstName} ${req.user.lastName}`) {
      return res.status(403).json({ message: 'Unauthorized to update this course' });
    }

    let coverImageUrl = course.coverImage;
    let sampleVideoUrl = course.sampleVideo;

    if (req.files && req.files.coverImage) {
      if (course.coverImage) {
        const publicId = course.coverImage.split('/').slice(-1)[0].split('.')[0];
        await cloudinary.uploader.destroy(`edaverse/courses/coverImages/${publicId}`, { resource_type: 'image' });
      }
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'image', folder: 'edaverse/courses/coverImages' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.files.coverImage[0].buffer);
      });
      coverImageUrl = result.secure_url;
    }

    if (req.files && req.files.sampleVideo) {
      if (course.sampleVideo) {
        const publicId = course.sampleVideo.split('/').slice(-1)[0].split('.')[0];
        await cloudinary.uploader.destroy(`edaverse/courses/sampleVideos/${publicId}`, { resource_type: 'video' });
      }
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'video', folder: 'edaverse/courses/sampleVideos' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.files.sampleVideo[0].buffer);
      });
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
    console.error('Update course error:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/courses/:id - Delete a course by ID (Instructor who created it or Admin)
router.delete('/:id', authMiddleware(['Instructor', 'Admin']), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid course ID' });
    }
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (req.user.role === 'Instructor' && course.instructorName !== `${req.user.firstName} ${req.user.lastName}`) {
      return res.status(403).json({ message: 'Unauthorized to delete this course' });
    }

    if (course.coverImage) {
      const publicId = course.coverImage.split('/').slice(-1)[0].split('.')[0];
      await cloudinary.uploader.destroy(`edaverse/courses/coverImages/${publicId}`, { resource_type: 'image' });
    }
    if (course.sampleVideo) {
      const publicId = course.sampleVideo.split('/').slice(-1)[0].split('.')[0];
      await cloudinary.uploader.destroy(`edaverse/courses/sampleVideos/${publicId}`, { resource_type: 'video' });
    }

    await Course.deleteOne({ _id: id });

    await User.updateMany(
      { createdCourses: id },
      { $pull: { createdCourses: id } }
    );

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;