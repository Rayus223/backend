const jwt = require('jsonwebtoken');
const Teacher = require('../models/Teacher');

const teacherAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const teacher = await Teacher.findById(decoded.id);

        if (!teacher) {
            throw new Error('Teacher not found');
        }

        req.teacher = teacher;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Please authenticate' });
    }
};

module.exports = teacherAuth;