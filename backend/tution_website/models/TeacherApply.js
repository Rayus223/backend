const mongoose = require('mongoose');

const teacherApplySchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Please add a name']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
    },
    phone: {
        type: String,
        required: [true, 'Please add a phone number']
    },
    password: {
        type: String,
        required: [true, 'Please add a password']
    },
    address: {
        type: String,
        required: [true, 'Please add an address']
    },
    location: {
        type: {
            type: String,
            enum: ['Point']
        },
        coordinates: {
            type: [Number],
            required: true
        }
    },
    grade: {
        type: Number,
        required: [true, 'Please select a grade']
    },
    subjects: {
        type: [String],
        required: [true, 'Please select at least one subject']
    },
    agreementAccepted: {
        type: Boolean,
        required: [true, 'Please accept the agreement']
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    cv: {
        type: String,
        required: [true, 'Please upload your CV']
    },
    certificates: {
        type: [String],
        default: []
    }
}, { timestamps: true });

// Add index for location-based queries
teacherApplySchema.index({ location: '2dsphere' });

module.exports = mongoose.model('TeacherApply', teacherApplySchema);