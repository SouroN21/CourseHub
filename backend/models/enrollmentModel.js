const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  enrolledAt: { type: Date, default: Date.now },
  paymentStatus: { type: String, enum: ['free', 'paid', 'pending'], default: 'free' },
  paymentIntentId: { type: String },
  progress: { type: Number, default: 0 },
  // Array of completed course content IDs for progress tracking
  completedContent: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CourseContent' }],
  certificateIssued: { type: Boolean, default: false },
  // URL to the issued certificate (if any)
  certificateUrl: { type: String },
});

enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });
enrollmentSchema.index({ course: 1 });

module.exports = mongoose.model('Enrollment', enrollmentSchema); 