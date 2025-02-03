const Admin = require('../models/Admin');
const Teacher = require('../models/TeacherApply');
const Vacancy = require('../models/Vacancy');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
            expiresIn: '1d'
        });

        res.json({ success: true, token });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        const [totalApplications, activeVacancies, approvedTeachers] = await Promise.all([
            Teacher.countDocuments({ status: 'pending' }),
            Vacancy.countDocuments({ status: 'open' }),
            Teacher.countDocuments({ status: 'approved' })
        ]);

        res.json({
            totalApplications,
            activeVacancies,
            approvedTeachers
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching dashboard stats' });
    }
};

exports.getApplications = async (req, res) => {
    try {
        const applications = await Teacher.find()
            .sort({ createdAt: -1 });
        res.json({ applications });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching applications' });
    }
};

exports.updateApplicationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const application = await Teacher.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );

        res.json({ success: true, application });
    } catch (error) {
        res.status(500).json({ message: 'Error updating application' });
    }
};

exports.getVacancies = async (req, res) => {
    try {
        const vacancies = await Vacancy.find().sort({ createdAt: -1 });
        res.json({ vacancies });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching vacancies' });
    }
};

exports.createVacancy = async (req, res) => {
    try {
        const vacancy = new Vacancy(req.body);
        await vacancy.save();
        res.json({ success: true, vacancy });
    } catch (error) {
        res.status(500).json({ message: 'Error creating vacancy' });
    }
};

exports.updateVacancy = async (req, res) => {
    try {
        const { id } = req.params;
        const vacancy = await Vacancy.findByIdAndUpdate(
            id,
            req.body,
            { new: true }
        );
        res.json({ success: true, vacancy });
    } catch (error) {
        res.status(500).json({ message: 'Error updating vacancy' });
    }
};

exports.deleteVacancy = async (req, res) => {
    try {
        const { id } = req.params;
        await Vacancy.findByIdAndDelete(id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting vacancy' });
    }
};

exports.getTeachers = async (req, res) => {
    try {
        const teachers = await Teacher.find({ status: 'approved' })
            .sort({ createdAt: -1 });
        res.json({ teachers });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching teachers' });
    }
};