const Newsletter = require('../models/Newsletter');

exports.subscribe = async (req, res) => {
    try {
        const { email } = req.body;

        // Check if email already exists
        const existingSubscriber = await Newsletter.findOne({ email });
        if (existingSubscriber) {
            return res.status(400).json({ 
                success: false, 
                message: 'This email is already subscribed!' 
            });
        }

        // Create new subscriber
        const subscriber = new Newsletter({ email });
        await subscriber.save();

        res.status(201).json({
            success: true,
            message: 'Thank you for subscribing to our newsletter!'
        });

    } catch (error) {
        console.error('Newsletter subscription error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to subscribe. Please try again.'
        });
    }
};