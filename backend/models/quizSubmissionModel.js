const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  question: String,
  selected: String,
  correct: String,
  isCorrect: Boolean
}, { _id: false });

const quizSubmissionSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  quizContentId: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseContent', required: true },
  answers: [answerSchema],
  score: { type: Number, required: true },
  submittedAt: { type: Date, default: Date.now }
});

quizSubmissionSchema.index({ student: 1, quizContentId: 1 }, { unique: true });

module.exports = mongoose.model('QuizSubmission', quizSubmissionSchema); 