const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { 
    signup, 
    login, 
    checkRegistration, 
    resetPasswordRequest, 
    getProfile,
    acceptTeacherApplication,    
    rejectTeacherApplication,   
    updateVacancyStatus         
} = require('../controllers/teacherApplyController');
const authMiddleware = require('../middleware/auth');

const Vacancy = require('../models/Vacancy');
const Teacher = require('../models/TeacherApply');
const { broadcastUpdate } = require('../server');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');  // Regular fs for sync operations
const fsp = require('fs').promises;  // Promise-based fs for async operations
const mongoose = require('mongoose');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Define allowed file types
const ALLOWED_TYPES = {
    'cv': ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    'certificates': ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']
};

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Ensure uploads directory exists
        const uploadDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

// File filter function
const fileFilter = (req, file, cb) => {
    if (!ALLOWED_TYPES[file.fieldname]) {
        cb(new Error(`Unexpected field: ${file.fieldname}`), false);
        return;
    }

    if (!ALLOWED_TYPES[file.fieldname].includes(file.mimetype)) {
        cb(new Error(`Invalid file type for ${file.fieldname}. Allowed types: ${ALLOWED_TYPES[file.fieldname].join(', ')}`), false);
        return;
    }

    cb(null, true);
};

// Configure multer upload
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  }
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        switch (err.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({
                    success: false,
                    message: 'File size exceeds 2MB limit',
                    error: err.code
                });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({
                    success: false,
                    message: 'Too many files uploaded',
                    error: err.code
                });
            default:
                return res.status(400).json({
                    success: false,
                    message: `Upload error: ${err.message}`,
                    error: err.code
                });
        }
    }
    
    if (err) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    
    next();
};

// Routes
router.post('/signup', 
  upload.fields([
    { name: 'cv', maxCount: 1 },
    { name: 'certificates', maxCount: 5 }
  ]),
  async (req, res) => {
    try {
      console.log('Signup request body:', req.body);
      console.log('Signup files:', req.files);

      // Ensure uploads directory exists
      const uploadDir = path.join(__dirname, '..', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Check for CV
      if (!req.files?.cv?.[0]) {
        return res.status(400).json({
          success: false,
          message: 'CV file is required'
        });
      }

      try {
        // Upload CV to Cloudinary
        const cvResult = await cloudinary.uploader.upload(req.files.cv[0].path, {
          resource_type: 'raw',
          folder: 'teacher_cvs',
        });

        // Upload certificates if any
        const certificateUrls = [];
        if (req.files.certificates) {
          for (const cert of req.files.certificates) {
            const certResult = await cloudinary.uploader.upload(cert.path, {
              resource_type: 'raw',
              folder: 'teacher_certificates',
            });
            certificateUrls.push(certResult.secure_url);
          }
        }

        // Add URLs to request body
        req.body.cvUrl = cvResult.secure_url;
        req.body.certificateUrls = certificateUrls;

        // Call signup controller
        await signup(req, res);

      } catch (uploadError) {
        console.error('File upload error:', uploadError);
        throw new Error('Error uploading files to Cloudinary');
      } finally {
        // Clean up local files
        for (const fileType in req.files) {
          for (const file of req.files[fileType]) {
            try {
              await fs.promises.unlink(file.path);
            } catch (err) {
              console.warn('Failed to delete local file:', err);
            }
          }
        }
      }

    } catch (error) {
      console.error('Route Error:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing signup',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
      });
    }
  }
);

router.post('/login', login);
router.get('/check-registration', checkRegistration);
router.post('/reset-password', resetPasswordRequest);

// GET available vacancies
router.get('/available-vacancies', authMiddleware, async (req, res) => {
  try {
    console.log('Fetching available vacancies...');
    const currentTeacherId = req.user.id;

    const vacancies = await Vacancy.find({ 
      status: 'open',
      // Only get vacancies with less than 5 applications
      $expr: { 
        $lt: [{ $size: '$applications' }, 5]
      },
      // Exclude vacancies where the current teacher has already applied
      'applications.teacher': { $ne: currentTeacherId }
    })
    .select('title subject description requirements salary applications status')
    .lean();
    
    console.log('Found available vacancies:', vacancies.length);
    
    const formattedVacancies = vacancies.map(vacancy => ({
      ...vacancy,
      applicantCount: vacancy.applications?.length || 0
    }));

    res.json({
      success: true,
      data: formattedVacancies
    });

  } catch (error) {
    console.error('Error fetching available vacancies:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching available vacancies',
      error: error.message
    });
  }
});

// Protected routes (auth required)
router.get('/profile', authMiddleware, getProfile);
router.put('/accept/:teacherId/:vacancyId', authMiddleware, acceptTeacherApplication);
router.put('/reject/:teacherId/:vacancyId', authMiddleware, rejectTeacherApplication);
router.put('/vacancy-status/:parentId', authMiddleware, updateVacancyStatus);
router.post('/apply-vacancy/:id', authMiddleware, async (req, res) => {
    try {
        const vacancyId = req.params.id;
        const teacherId = req.user.id;

        // Find the vacancy and populate teacher data
        const existingVacancy = await Vacancy.findOne({
            _id: vacancyId,
            status: 'open'
        }).populate('applications.teacher');

        if (!existingVacancy) {
            return res.status(404).json({
                success: false,
                message: 'Vacancy not found or not open'
            });
        }

        // Check if already applied
        if (existingVacancy.applications.some(app => 
            app.teacher && app.teacher._id.toString() === teacherId.toString()
        )) {
            return res.status(400).json({
                success: false,
                message: 'You have already applied for this vacancy'
            });
        }

        // Add application
        existingVacancy.applications.push({
            teacher: teacherId,
            status: 'pending',
            appliedAt: new Date()
        });

        // Check if vacancy is now full
        if (existingVacancy.applications.length === 5) {
            existingVacancy.status = 'closed';
            console.log('Vacancy reached 5 applications - closing vacancy');
        }

        await existingVacancy.save();

        // Fetch the updated vacancy with populated teacher data
        const updatedVacancy = await Vacancy.findById(vacancyId)
            .populate('applications.teacher');

        console.log('Application submitted successfully');

        res.json({
            success: true,
            message: 'Application submitted successfully',
            vacancyStatus: existingVacancy.status,
            applications: updatedVacancy.applications
        });

    } catch (error) {
        console.error('Error applying for vacancy:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting application',
            error: error.message
        });
    }
});

// Get all teachers (both direct signups and vacancy applications)
router.get('/all', async (req, res) => {
    try {
      const teachers = await Teacher.find()
        .select('-password')
        .sort({ createdAt: -1 });
      
      res.json({
        success: true,
        data: teachers
      });
    } catch (error) {
      console.error('Error fetching teachers:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching teachers',
        error: error.message 
      });
    }
  });
  
  // Get teachers by status
  router.get('/status/:status', async (req, res) => {
    try {
      const { status } = req.params;
      const teachers = await Teacher.find({ status })
        .select('-password')
        .sort({ createdAt: -1 });
      
      res.json({
        success: true,
        data: teachers
      });
    } catch (error) {
      console.error('Error fetching teachers by status:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching teachers',
        error: error.message 
      });
    }
  });
  
  // Add this route to update teacher status
  router.put('/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

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
        data: teacher
      });

    } catch (error) {
      console.error('Error updating teacher status:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating teacher status',
        error: error.message
      });
    }
  });

// Add this route before module.exports
router.get('/my-applications', authMiddleware, async (req, res) => {
  try {
    console.log('Fetching applications for teacher:', req.user._id);
    
    // Find all vacancies where this teacher has applied
    const vacancies = await Vacancy.find({
      'applications.teacher': req.user._id
    })
    .select('title subject description requirements salary status applications')
    .lean();

    console.log('Found vacancies:', vacancies.length);

    // Format the applications data
    const applications = vacancies.map(vacancy => {
      const application = vacancy.applications.find(
        app => app.teacher.toString() === req.user._id.toString()
      );

      return {
        id: application._id,
        vacancy: {
          id: vacancy._id,
          title: vacancy.title,
          subject: vacancy.subject,
          description: vacancy.description,
          requirements: vacancy.requirements,
          salary: vacancy.salary,
          status: vacancy.status
        },
        status: application.status,
        appliedAt: application.appliedAt
      };
    });

    console.log('Formatted applications:', applications.length);

    res.json({
      success: true,
      applications: applications
    });

  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching applications',
      error: error.message
    });
  }
});

// Add this route before module.exports
router.put('/update-profile', authMiddleware, upload.single('cv'), async (req, res) => {
  try {
    const { fullName, email, phone, subjects, fees } = req.body;
    const updates = {
      fullName,
      email,
      phone,
      subjects: subjects.split(',').map(s => s.trim()),
      fees
    };

    // If a new CV was uploaded
    if (req.file) {
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: 'raw',
        folder: 'teacher_cvs',
      });
      
      // Add CV URL to updates
      updates.cv = result.secure_url;

      // Delete local file
      await fsp.unlink(req.file.path);
    }

    const teacher = await Teacher.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true }
    ).select('-password');

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      teacher
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
});

// Create uploads directory at startup
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
console.log('Uploads directory verified:', uploadDir);

// Add this route to check featured vacancies
router.get('/check-featured', async (req, res) => {
  try {
    const count = await Vacancy.countDocuments({
      featured: true,
      status: 'active'
    });

    console.log('Featured vacancies count:', count);

    res.json({
      success: true,
      count: count
    });
  } catch (error) {
    console.error('Error checking featured vacancies:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking featured vacancies'
    });
  }
});

// Update the route to get vacancy applicants
router.get('/vacancy-applicants/:id', authMiddleware, async (req, res) => {
    try {
        const vacancy = await Vacancy.findById(req.params.id)
            .populate({
                path: 'applications.teacher',
                select: 'fullName email phone subjects cv status'
            });

        if (!vacancy) {
            return res.status(404).json({
                success: false,
                message: 'Vacancy not found'
            });
        }

        res.json({
            success: true,
            data: vacancy.applications
        });

    } catch (error) {
        console.error('Error fetching vacancy applicants:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching applicants',
            error: error.message
        });
    }
});

// Update the application status route
router.put('/application-status/:applicationId', authMiddleware, async (req, res) => {
    try {
        const { applicationId } = req.params;
        const { status } = req.body;

        // Find and update the vacancy with the application
        const vacancy = await Vacancy.findOneAndUpdate(
            { 'applications._id': applicationId },
            { 
                $set: { 
                    'applications.$.status': status,
                    // If status is 'accepted', close the vacancy
                    ...(status === 'accepted' ? { status: 'closed' } : {})
                } 
            },
            { new: true }
        ).populate({
            path: 'applications.teacher',
            select: 'fullName email phone subjects cv status'
        });

        if (!vacancy) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }

        // If application was accepted, reject all other pending applications
        if (status === 'accepted') {
            await Vacancy.updateOne(
                { _id: vacancy._id },
                {
                    $set: {
                        'applications.$[elem].status': 'rejected'
                    }
                },
                {
                    arrayFilters: [
                        { 
                            'elem._id': { $ne: applicationId },
                            'elem.status': 'pending'
                        }
                    ]
                }
            );
        }

        res.json({
            success: true,
            message: `Application ${status} successfully`,
            data: vacancy.applications
        });

    } catch (error) {
        console.error('Error updating application status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating application status',
            error: error.message
        });
    }
});

module.exports = router;