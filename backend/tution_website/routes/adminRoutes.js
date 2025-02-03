const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Admin Login
// Admin Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Add request logging
        console.log('Login attempt for username:', username);
        
        if (!username || !password) {
            console.log('Missing credentials');
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        const admin = await Admin.findOne({ username });
        console.log('Admin found:', admin ? 'Yes' : 'No');

        if (!admin) {
            console.log('No admin found with username:', username);
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        console.log('Password match:', isMatch);

        if (!isMatch) {
            console.log('Password mismatch for username:', username);
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const token = jwt.sign(
            { id: admin._id, role: admin.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        console.log('Login successful for:', username);

        res.json({
            success: true,
            token,
            admin: {
                id: admin._id,
                username: admin.username,
                email: admin.email,
                role: admin.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Protected Routes
router.get('/dashboard/stats', adminAuth, async (req, res) => {
    try {
        const stats = {
            students: await StudentApply.countDocuments(),
            parents: await Parent.countDocuments(),
            teachers: {
                total: await TeacherApply.countDocuments(),
                pending: await TeacherApply.countDocuments({ status: 'pending' }),
                approved: await TeacherApply.countDocuments({ status: 'approved' }),
                rejected: await TeacherApply.countDocuments({ status: 'rejected' })
            }
        };
        res.json(stats);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching stats'
        });
    }
});

router.get('/teachers', adminAuth, async (req, res) => {
    try {
        const { status } = req.query;
        const query = status ? { status } : {};
        
        const teachers = await Teacher.find(query)
            .select('fullName email phone subjects fees cv certificates status createdAt')
            .sort({ createdAt: -1 });
         res.json({
            success: true,
            data: teachers
        });
    } catch (error) {
        console.error('Error fetching teachers:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching teachers'
        });
    }
});

// Add route to update teacher status
router.put('/teacher/:id/status', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const teacher = await Teacher.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        if (!teacher) {
            return res.status(404).json({
                success: false,
                message: 'Teacher not found'
            });
        }

        res.json({
            success: true,
            message: `Teacher status updated to ${status}`,
            teacher
        });
    } catch (error) {
        console.error('Error updating teacher status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating teacher status'
        });
    }
});

module.exports = router;