const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const adminAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No authentication token, access denied'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const admin = await Admin.findOne({ _id: decoded.id, role: 'admin' });

        if (!admin) {
            throw new Error('Not authorized as admin');
        }

        req.admin = admin;
        req.token = token;
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Not authorized as admin'
        });
    }
};

module.exports = adminAuth;