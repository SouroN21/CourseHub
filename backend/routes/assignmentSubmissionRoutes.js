const express = require('express');
const router = express.Router();
const multer = require('multer');
const AssignmentSubmission = require('../models/assignmentSubmissionModel');
const auth = require('../middleware/auth');
const { v2: cloudinary } = require('cloudinary');
const { Readable } = require('stream');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use memory storage for multer to avoid disk writes
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Helper to upload buffer to Cloudinary using stream
function uploadBufferToCloudinary(buffer, folder = '') {
  return new Promise((resolve, reject) => {
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);

    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'auto', folder },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    readable.pipe(stream);
  });
}

// Student submits assignment
router.post('/', auth(), upload.single('file'), async (req, res) => {
  try {
    const { assignmentContentId, comments } = req.body;
    const student = req.user.id;

    if (!req.file) {
      return res.status(400).json({ message: 'File is required' });
    }

    // Upload buffer to Cloudinary
    const uploadRes = await uploadBufferToCloudinary(req.file.buffer, 'assignment-submissions');
    const fileUrl = uploadRes.secure_url;

    // Upsert: allow resubmission (overwrite previous)
    const submission = await AssignmentSubmission.findOneAndUpdate(
      { assignmentContentId, student },
      { fileUrl, comments, submittedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ submission });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Student gets their own submission for an assignment
router.get('/:assignmentContentId', auth(), async (req, res) => {
  try {
    const { assignmentContentId } = req.params;
    const student = req.user.id;
    const submission = await AssignmentSubmission.findOne({ assignmentContentId, student });
    res.json({ submission });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Instructor gets all submissions for an assignment
router.get('/all/:assignmentContentId', auth(['Instructor', 'Admin']), async (req, res) => {
  try {
    const { assignmentContentId } = req.params;
    const submissions = await AssignmentSubmission.find({ assignmentContentId })
      .populate('student', 'firstName lastName email');
    res.json({ submissions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Instructor grades a submission
router.put('/:submissionId/grade', auth(['Instructor', 'Admin']), async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { grade, feedback } = req.body;
    const gradedBy = req.user.id;
    const gradedAt = new Date();

    const submission = await AssignmentSubmission.findByIdAndUpdate(
      submissionId,
      { grade, feedback, gradedBy, gradedAt },
      { new: true }
    );

    res.json({ submission });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
