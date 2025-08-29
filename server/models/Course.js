const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
  topic: {
    type: String,
    required: true,
    unique: true
  },
  links: {
    type: [String],
    required: true
  },
  outline: {
    type: Object
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Course', CourseSchema);
