const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  instructorName: { type: String, required: true },
  title: { type: String, required: true },
  coverImage: { type: String },
  category: {
    type: String,
    enum: ['Programming', 'Design', 'Business', 'Language', 'Other'],
    required: true,
  },
  price: { type: Number, required: true, min: 0 },
  level: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    required: true,
  },
  description: { type: String, required: true },
  sampleVideo: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Course', courseSchema);