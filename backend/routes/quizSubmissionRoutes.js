const express = require('express');
const router = express.Router();
const QuizSubmission = require('../models/quizSubmissionModel');
const CourseContent = require('../models/courseContentModel');
const Course = require('../models/courseModel');
const authMiddleware = require('../middleware/auth');
const mongoose = require('mongoose');

// POST /api/quiz-submissions - Student submits answers
router.post('/', authMiddleware(['Student']), async (req, res) => {
  try {
    const { quizContentId, answers } = req.body;
    if (!mongoose.Types.ObjectId.isValid(quizContentId)) {
      return res.status(400).json({ message: 'Invalid quiz ID' });
    }
    const quiz = await CourseContent.findById(quizContentId);
    if (!quiz || quiz.type !== 'quiz') {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    // Auto-grade
    let score = 0;
    const gradedAnswers = (quiz.questions || []).map((q, idx) => {
      const submitted = answers.find(a => a.question === q.question);
      const selected = submitted ? submitted.selected : '';
      const isCorrect = selected === q.answer;
      if (isCorrect) score++;
      return {
        question: q.question,
        selected,
        correct: q.answer,
        isCorrect
      };
    });
    // Allow retake: upsert submission
    const submission = await QuizSubmission.findOneAndUpdate(
      { student: req.user.id, quizContentId },
      {
        student: req.user.id,
        course: quiz.course,
        quizContentId,
        answers: gradedAnswers,
        score,
        submittedAt: new Date()
      },
      { new: true, upsert: true }
    );
    res.status(201).json({ message: 'Quiz submitted', score, answers: gradedAnswers });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/quiz-submissions/:quizContentId - Get student's submission for this quiz
router.get('/:quizContentId', authMiddleware(['Student']), async (req, res) => {
  try {
    const { quizContentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(quizContentId)) {
      return res.status(400).json({ message: 'Invalid quiz ID' });
    }
    const submission = await QuizSubmission.findOne({ student: req.user.id, quizContentId });
    if (!submission) return res.status(404).json({ message: 'No submission found' });
    res.json({ submission });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/quiz-submissions/analytics/:quizContentId - Instructor analytics
router.get('/analytics/:quizContentId', authMiddleware(['Instructor', 'Admin']), async (req, res) => {
  try {
    const { quizContentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(quizContentId)) {
      return res.status(400).json({ message: 'Invalid quiz ID' });
    }
    const quiz = await CourseContent.findById(quizContentId);
    if (!quiz || quiz.type !== 'quiz') {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    const submissions = await QuizSubmission.find({ quizContentId }).populate('student');
    const scores = submissions.map(s => s.score);
    const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    // Per-question stats
    const questionStats = (quiz.questions || []).map((q, idx) => {
      let correct = 0, incorrect = 0;
      const wrongAnswers = {};
      submissions.forEach(sub => {
        const ans = sub.answers.find(a => a.question === q.question);
        if (ans) {
          if (ans.isCorrect) correct++;
          else {
            incorrect++;
            if (ans.selected) wrongAnswers[ans.selected] = (wrongAnswers[ans.selected] || 0) + 1;
          }
        }
      });
      // Find most common wrong answer
      let mostCommonWrong = null, maxWrong = 0;
      Object.entries(wrongAnswers).forEach(([ans, count]) => {
        if (count > maxWrong) {
          mostCommonWrong = ans;
          maxWrong = count;
        }
      });
      return {
        question: q.question,
        correct,
        incorrect,
        mostCommonWrong: mostCommonWrong || null
      };
    });
    res.json({
      totalSubmissions: submissions.length,
      averageScore: avg,
      submissions,
      questionStats
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router; 