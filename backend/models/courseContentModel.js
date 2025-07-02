const mongoose = require('mongoose');

const courseContentSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  type: {
    type: String,
    enum: ['slide', 'video', 'document', 'live', 'assignment', 'quiz', 'notice', 'poll', 'survey'],
    required: true
  },
  title: { type: String, required: true },
  description: { type: String },
  contentUrl: { type: String }, // For files, videos, docs, links
  // For live sessions
  liveDate: { type: Date },
  // For assignments/quizzes
  dueDate: { type: Date },
  // For quizzes (optional)
  questions: [{
    question: String,
    options: [String],
    answer: String
  }],
  // For notices
  noticeText: { type: String },
  // For assignments
  assignmentFile: { type: String },
  // For external docs
  externalLink: { type: String },
  // For polls
  pollOptions: [{
    option: String,
    votes: { type: Number, default: 0 }
  }],
  // For surveys
  surveyQuestions: [{
    question: String,
    options: [String],
    answerRequired: { type: Boolean, default: false }
  }],
  // Who created/updated
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('CourseContent', courseContentSchema); 