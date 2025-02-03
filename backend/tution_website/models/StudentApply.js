const mongoose = require('mongoose');

const studentApplySchema = new mongoose.Schema({  // Fixed schema name
    fullName: {
        type: String,
        required: [true, 'Full name is required']
    },
    dateOfBirth: {
        type: Date,
        required: [true, 'Date of birth is required']
    },
    gender: {
        type: String,
        required: [true, 'Gender is required'],
        enum: ['male', 'female', 'other']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required']
    },
    address: {
        type: String,
        required: [true, 'Address is required']
    },
    previousSchool: {
        type: String
    },
    grade: {
        type: String,
        required: [true, 'Grade is required']
    },
    submissionDate: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('StudentApply', studentApplySchema);  // Fixed model name