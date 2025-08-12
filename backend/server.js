const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const courseRoutes = require('./routes/courseRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const courseContentRoutes = require('./routes/courseContentRoutes');
const quizSubmissionRoutes = require('./routes/quizSubmissionRoutes');
const assignmentSubmissionRoutes = require('./routes/assignmentSubmissionRoutes');
const adminRoutes = require('./routes/adminRoutes');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', userRoutes);
app.use('/api/courses', courseRoutes); // Fixed: Added leading slash
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/course-content', courseContentRoutes);
app.use('/api/quiz-submissions', quizSubmissionRoutes);
app.use('/api/assignment-submissions', assignmentSubmissionRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
    res.send('Hello');
  });

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ message: 'Server is running' });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
