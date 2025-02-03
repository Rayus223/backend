const mongoose = require('mongoose');

const parentSchema = new mongoose.Schema({
    parentName: {
        applicationNumber: {
            type: Number,
            required: true
        },
        type: String,
        required: [true, 'Parent name is required']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required']
    },
    address: {
        type: String,
        required: [true, 'Address is required']
    },
    preferredTeacher: {
        type: String,
        enum: ['male', 'female', 'any'],
        required: [true, 'Preferred teacher gender is required']
    },
    grade: {
        type: String,
        required: [true, 'Grade is required']
    },
    subjects: {
        type: [String],
        required: [true, 'At least one subject is required'],
        validate: {
            validator: function(v) {
                return v.length > 0 && v.length <= 3;
            },
            message: 'Please select between 1 and 3 subjects'
        }
    },
    preferredTime: {
        type: String,
        required: [true, 'Preferred time is required']
    },
    submissionDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['new', 'pending', 'done', 'not_done'],
        default: 'new'
    },
    vacancyDetails: {
        vacancyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vacancy',
            default: null
        },
        rejectedCount: {
            type: Number,
            default: 0
        },
        createdAt: Date
    }
});

// Remove any existing indexes
parentSchema.index({ email: 1 }, { unique: false, sparse: true });

parentSchema.pre('save', async function(next) {
    try {
        if (!this.applicationNumber) {
            const lastParent = await this.constructor.findOne({}).sort({ applicationNumber: -1 });
            this.applicationNumber = lastParent ? lastParent.applicationNumber + 1 : 1;
            console.log('Generated application number:', this.applicationNumber); // Debug log
        }
        next();
    } catch (error) {
        console.error('Error in pre-save:', error);
        next(error);
    }
});

module.exports = mongoose.model('Parent', parentSchema);