const Teacher = require('../models/TeacherApply');
const Parent = require('../models/Parent_apply');  // Add this import
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.signup = async (req, res) => {
    try {
        console.log('Signup controller received data:', req.body);

        const {
            fullName,
            email,
            phone,
            password,
            grade,
            subjects,
            address,
            latitude,
            longitude,
            agreementAccepted,
            cvUrl
        } = req.body;

        // Validate required fields
        if (!fullName || !email || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Check if email exists
        const existingTeacher = await Teacher.findOne({ email });
        if (existingTeacher) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create teacher with proper error handling
        const teacher = new Teacher({
            fullName,
            email,
            phone,
            password: hashedPassword,
            grade: grade ? parseInt(grade) : undefined,
            subjects: subjects ? JSON.parse(subjects) : [],
            address,
            location: latitude && longitude ? {
                type: 'Point',
                coordinates: [parseFloat(longitude), parseFloat(latitude)]
            } : undefined,
            agreementAccepted: agreementAccepted === 'true',
            cv: cvUrl,
            status: 'pending'
        });

        await teacher.save();

        // Generate token
        const token = jwt.sign(
            { id: teacher._id },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(200).json({
            success: true,
            message: 'Registration successful! Please wait for admin approval.',
            data: {
                teacher: {
                    id: teacher._id,
                    fullName: teacher.fullName,
                    email: teacher.email,
                    status: teacher.status
                },
                token
            }
        });

    } catch (error) {
        console.error('Signup Error:', error);
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: Object.values(error.errors).map(err => err.message).join(', ')
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error creating account',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
        });
    }
};

// ... rest of the controller code (login, checkRegistration, etc.) 

// Teacher login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find teacher
        const teacher = await Teacher.findOne({ email });
        if (!teacher) {
            return res.status(400).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, teacher.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Create token
        const token = jwt.sign(
            { id: teacher._id, role: teacher.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            success: true,
            token,
            teacher: {
                id: teacher._id,
                fullName: teacher.fullName,
                email: teacher.email,
                phone: teacher.phone,
                role: teacher.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error logging in'
        });
    }
};

// Reset password request
exports.resetPasswordRequest = async (req, res) => {
    try {
        const { email } = req.body;
        const teacher = await Teacher.findOne({ email });

        if (!teacher) {
            return res.status(404).json({
                success: false,
                message: 'Email not found'
            });
        }

        // Generate reset token
        const resetToken = jwt.sign(
            { id: teacher._id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // In a real application, you would send this token via email
        // For now, we'll just return it in the response
        res.json({
            success: true,
            message: 'Password reset link has been sent to your email',
            resetToken // Remove this in production
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending reset link'
        });
    }
};

// Add this function to your existing controller
exports.checkRegistration = async (req, res) => {
    try {
        const { email } = req.query;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const teacher = await Teacher.findOne({ email });
        
        res.json({
            success: true,
            isRegistered: !!teacher
        });
    } catch (error) {
        console.error('Check registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking registration'
        });
    }
};

// Add this new method to your controller
exports.getProfile = async (req, res) => {
    try {
        const teacherId = req.user.id;
        
        const teacher = await Teacher.findById(teacherId).select('-password');
        
        if (!teacher) {
            return res.status(404).json({
                success: false,
                message: 'Teacher not found'
            });
        }

        res.json({
            success: true,
            teacher: {
                fullName: teacher.fullName,
                email: teacher.email,
                phone: teacher.phone,
                address: teacher.address,
                location: teacher.location,
                grade: teacher.grade,
                subjects: teacher.subjects,
                cv: teacher.cv,
                certificates: teacher.certificates,
                status: teacher.status,
                agreementAccepted: teacher.agreementAccepted
            }
        });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching profile'
        });
    }
};



exports.acceptTeacherApplication = async (req, res) => {
    try {
        const { teacherId, vacancyId } = req.params;
        const { parentId } = req.body;  // Add parentId in request

        // Update teacher status
        const teacher = await Teacher.findByIdAndUpdate(
            teacherId,
            { status: 'accepted' },
            { new: true }
        );

        if (!teacher) {
            return res.status(404).json({
                success: false,
                message: 'Teacher not found'
            });
        }

        // Update parent application status
        if (parentId) {
            const parent = await Parent.findByIdAndUpdate(
                parentId,
                { 
                    status: 'done',
                    'vacancyDetails.acceptedTeacher': teacherId,
                    'vacancyDetails.vacancyId': vacancyId
                },
                { new: true }
            );
            if (!parent) {
                console.warn('Parent application not found:', parentId);
            }
        }

        res.json({
            success: true,
            message: 'Teacher accepted successfully',
            data: teacher
        });

    } catch (error) {
        console.error('Error accepting teacher:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Add this function to handle teacher rejection
exports.rejectTeacherApplication = async (req, res) => {
    try {
        const { teacherId, vacancyId } = req.params;
        const { parentId } = req.body;

        // Update teacher status
        const teacher = await Teacher.findByIdAndUpdate(
            teacherId,
            { status: 'rejected' },
            { new: true }
        );

        if (!teacher) {
            return res.status(404).json({
                success: false,
                message: 'Teacher not found'
            });
        }

        // Update parent application rejection count
        if (parentId) {
            const parent = await Parent.findById(parentId);
            if (parent) {
                parent.vacancyDetails.rejectedCount = (parent.vacancyDetails.rejectedCount || 0) + 1;
                
                // If 5 rejections, update status to not_done
                if (parent.vacancyDetails.rejectedCount >= 5) {
                    parent.status = 'not_done';
                }

                await parent.save();
            }
        }
        res.json({
            success: true,
            message: 'Teacher rejected successfully',
            data: teacher
        });

    } catch (error) {
        console.error('Error rejecting teacher:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.updateVacancyStatus = async (req, res) => {
    try {
        const { parentId } = req.params;
        const { status } = req.body;

        const parent = await Parent.findByIdAndUpdate(
            parentId,
            { 
                status,
                ...(status === 'pending' && {
                    'vacancyDetails.createdAt': new Date()
                })
            },
            { new: true }
        );

        if (!parent) {
            return res.status(404).json({
                success: false,
                message: 'Parent application not found'
            });
        }

        res.json({
            success: true,
            message: 'Status updated successfully',
            data: parent
        });

    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

