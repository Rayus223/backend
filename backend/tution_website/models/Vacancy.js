const mongoose = require('mongoose');

const vacancySchema = new mongoose.Schema({
    title: { type: String, required: true },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    requirements: [String],
    salary: { type: String, required: true },
    status: {
        type: String,
        enum: ['open', 'closed', 'pending'],
        default: 'open'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    applications: [{
        teacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TeacherApply',
            required: true
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected'],
            default: 'pending'
        },
        appliedAt: {
            type: Date,
            default: Date.now
        }
    }],
    featured: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

vacancySchema.index({ featured: 1, status: 1 });

module.exports = mongoose.model('Vacancy', vacancySchema);