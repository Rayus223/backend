const StudentApply = require('../models/StudentApply');

// Submit student application
const submitApplication = async (req, res) => {
    try {
        const student = new StudentApply({
            fullName: req.body.fullName,
            dateOfBirth: req.body.dateOfBirth,
            gender: req.body.gender,
            email: req.body.email,
            phone: req.body.phone,
            address: req.body.address,
            previousSchool: req.body.previousSchool,
            grade: req.body.grade
        });

        await student.save();
        res.status(201).json({
            success: true,
            message: 'Student application submitted successfully',
            data: student
        });
    } catch (error) {
        console.error('Student application error:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// Get all student applications
const getAllApplications = async (req, res) => {
    try {
        const students = await StudentApply.find({});
        res.status(200).json({
            success: true,
            data: students
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete student application
const deleteApplication = async (req, res) => {
    try {
        const student = await StudentApply.findById(req.params.id);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student application not found'
            });
        }

        await student.deleteOne();
        res.json({
            success: true,
            message: 'Student application deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    submitApplication,
    getAllApplications,
    deleteApplication
};