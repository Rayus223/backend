const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String,
        required: true
    },
    grade: {
        type: String,
        required: true
    },
    subjects: [{
        type: String
    }],
    joinedDate: {
        type: Date,
        default: Date.now
    }
});
const Student = mongoose.model('Student', studentSchema);
module.exports = Student;