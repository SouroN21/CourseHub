const mongoose = require('mongoose');
const Course = require('../models/courseModel'); 
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Admin', 'Instructor', 'Student'], required: true },
  createdDate: { type: Date, default: Date.now },

  // ✅ Add this for instructors
  createdCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],

  // For Students
  enrolledCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }], 

  // For Instructors
  bio: { type: String },
  earnings: { type: Number, default: 0 },
});

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
