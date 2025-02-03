require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const setupAdmin = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // First, remove any existing admin accounts (optional)
        await Admin.deleteMany({});
        console.log('Cleared existing admin accounts');

        // Create the specific admin account
        const admin = new Admin({
            username: 'Dear Sir Tuition',
            email: 'dearsir.tuition@gmail.com',
            password: '223Hi223',
            role: 'admin'
        });

        await admin.save();
        
        console.log('----------------------------------------');
        console.log('Admin account created successfully!');
        console.log('Login Credentials:');
        console.log('Username: Dear Sir Tuition');
        console.log('Password: 223Hi223');
        console.log('----------------------------------------');

    } catch (error) {
        console.error('Error setting up admin:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

setupAdmin();