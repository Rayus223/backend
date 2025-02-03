const errorHandler = (err, req, res, next) => {
    console.error(err.stack);

    // Temporarily comment out multer error handling
    /*
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                message: 'File too large. Maximum size is 5MB' 
            });
        }
        return res.status(400).json({ message: err.message });
    }
    */

    if (err.name === 'ValidationError') {
        return res.status(400).json({ 
            message: Object.values(err.errors).map(e => e.message) 
        });
    }

    res.status(500).json({ 
        message: 'Something went wrong on the server' 
    });
};

module.exports = errorHandler;