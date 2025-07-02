const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  enrolledAt: { type: Date, default: Date.now },
  paymentStatus: { type: String, enum: ['free', 'paid', 'pending'], default: 'free' },
  paymentIntentId: { type: String },
  progress: { type: Number, default: 0 },
  certificateIssued: { type: Boolean, default: false }
});

enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });
enrollmentSchema.index({ course: 1 });

module.exports = mongoose.model('Enrollment', enrollmentSchema); 