const mongoose = require('mongoose');

const assignmentSubmissionSchema = new mongoose.Schema({
  assignmentContentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CourseContent',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  comments: {
    type: String
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  grade: {
    type: Number
  },
  feedback: {
    type: String
  },
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  gradedAt: {
    type: Date
  }
});

assignmentSubmissionSchema.index({ assignmentContentId: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('AssignmentSubmission', assignmentSubmissionSchema); 