const emailConfig = require('../config/email.config');
const Contact = require('../models/Contact');
const nodemailer = require('nodemailer');


// Create email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: emailConfig.fromEmail,
        pass: process.env.EMAIL_PASSWORD   
    }
});

exports.submitContact = async (req, res) => {
    try {
        const { name, email, phone, message } = req.body;
        
        // Save to MongoDB
        const contact = new Contact({
            name,
            email,
            phone,
            message
        });
        await contact.save();

        // Prepare email content
        const mailOptions = {
            from: emailConfig.fromEmail,
            to: emailConfig.toEmail,
            subject: `New Contact Form Submission from ${name}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
                    <h2 style="color: #2A9D8F;">New Contact Form Submission</h2>
                    <div style="background: #f5f5f5; padding: 20px; border-radius: 5px;">
                        <p><strong>Name:</strong> ${name}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Phone:</strong> ${phone}</p>
                        <p><strong>Message:</strong></p>
                        <p style="white-space: pre-wrap;">${message}</p>
                    </div>
                    <p style="color: #666; font-size: 12px; margin-top: 20px;">
                        This message was sent from the Dear Sir Home Tuition contact form.
                    </p>
                </div>
            `
        };

        // Send email
        await transporter.sendMail(mailOptions);
        
        res.status(201).json({ 
            success: true, 
            message: 'Message sent successfully! We will get back to you soon.' 
        });
        
    } catch (error) {
        console.error('Contact submission error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send message. Please try again.' 
        });
    }
};