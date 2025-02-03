const express = require('express');
const router = express.Router();
const Vacancy = require('../models/Vacancy');
const adminAuth = require('../middleware/adminAuth');

// GET featured vacancies - MOVED TO TOP
router.get('/featured', async (req, res) => {
  try {
    console.log('Fetching featured vacancies...');
    const vacancies = await Vacancy.find({ 
      status: 'open',  // Changed from 'active' to match your schema
      featured: true 
    })
    .select('title subject description requirements salary _id featured status')
    .lean();
   
    console.log('Found featured vacancies:', vacancies.length);

    res.json({
      success: true,
      data: vacancies
    });
  } catch (error) {
    console.error('Error fetching featured vacancies:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching featured vacancies'
    });
  }
});

// Get all vacancies
router.get('/', async (req, res) => {
    try {
        const vacancies = await Vacancy.find()
            .populate('applications.teacher')
            .sort({ createdAt: -1 });
        res.json(vacancies);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create new vacancy
router.post('/', adminAuth, async (req, res) => {
    try {
        const vacancy = new Vacancy({
            ...req.body,
            createdBy: req.admin.id // From adminAuth middleware
        });
        const newVacancy = await vacancy.save();
        res.status(201).json(newVacancy);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update vacancy
router.put('/:id', adminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        const vacancy = await Vacancy.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!vacancy) {
            return res.status(404).json({
                success: false,
                message: 'Vacancy not found'
            });
        }

        res.json({
            success: true,
            vacancy
        });
    } catch (error) {
        console.error('Error updating vacancy:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating vacancy'
        });
    }
});

// Delete vacancy
router.delete('/:id', adminAuth, async (req, res) => {
    try {
        const vacancy = await Vacancy.findByIdAndDelete(req.params.id);
        if (!vacancy) {
            return res.status(404).json({ message: 'Vacancy not found' });
        }
        res.json({ message: 'Vacancy deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get vacancy by ID
router.get('/:id', async (req, res) => {
    try {
        const vacancy = await Vacancy.findById(req.params.id)
            .populate('applications.teacher');
        if (!vacancy) {
            return res.status(404).json({ message: 'Vacancy not found' });
        }
        res.json(vacancy);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update vacancy status
router.patch('/:id/status', adminAuth, async (req, res) => {
    try {
        const { status } = req.body;
        console.log('Updating vacancy status:', { id: req.params.id, status }); // Add debug log
        
        if (!['open', 'closed'].includes(status.toLowerCase())) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid status. Must be either "open" or "closed"' 
            });
        }

        const vacancy = await Vacancy.findByIdAndUpdate(
            req.params.id,
            { status: status.toLowerCase() },
            { new: true }
        );
        
        if (!vacancy) {
            return res.status(404).json({ 
                success: false,
                message: 'Vacancy not found' 
            });
        }
        
        res.json({
            success: true,
            data: vacancy
        });
    } catch (error) {
        console.error('Error updating vacancy status:', error);
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
});

router.get('/:id/applicants', adminAuth, async (req, res) => {
    try {
        const vacancyId = req.params.id;
        console.log('Fetching applicants for vacancy:', vacancyId);
        
        const vacancy = await Vacancy.findById(vacancyId)
            .populate({
                path: 'applications.teacher',
                select: 'fullName email phone status cv fees subjects'
            });

        console.log('Found vacancy:', vacancy);
        console.log('Raw applications:', vacancy.applications);

        if (!vacancy) {
            console.log('No vacancy found with ID:', vacancyId);
            return res.json([]);
        }

        const applicants = vacancy.applications
            .filter(app => app && app.teacher)
            .map(app => ({
                _id: app.teacher._id,
                fullName: app.teacher.fullName,
                email: app.teacher.email,
                phone: app.teacher.phone,
                status: app.status,
                cv: app.teacher.cv,
                fees: app.teacher.fees,
                subjects: app.teacher.subjects,
                appliedAt: app.appliedAt
            }));

        console.log('Processed applicants:', applicants);
        res.json(applicants);
    } catch (error) {
        console.error('Error fetching applicants:', error);
        res.status(500).json({ message: error.message });
    }
});

// Add this route before the module.exports
router.put('/:vacancyId/applications/:applicationId/status', async (req, res) => {
    try {
        const { vacancyId, applicationId } = req.params;
        const { status } = req.body;

        const vacancy = await Vacancy.findOneAndUpdate(
            {
                _id: vacancyId,
                'applications._id': applicationId
            },
            {
                $set: {
                    'applications.$.status': status
                }
            },
            { new: true }
        );

        if (!vacancy) {
            return res.status(404).json({
                success: false,
                message: 'Vacancy or application not found'
            });
        }

        res.json({
            success: true,
            message: 'Application status updated successfully'
        });
    } catch (error) {
        console.error('Error updating application status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating application status'
        });
    }
});

// Add this new route for available vacancies
router.get('/available-vacancies', async (req, res) => {
    try {
        const vacancies = await Vacancy.find({ 
            status: 'open',
            // Only get vacancies with less than 5 applications
            $expr: { 
                $lt: [{ $size: "$applications" }, 5]
            }
        })
        .select('title subject description requirements salary applications status')
        .lean();

        res.json({
            success: true,
            data: vacancies
        });
    } catch (error) {
        console.error('Error fetching available vacancies:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching available vacancies'
        });
    }
});

// Add this route for applying to a vacancy
router.post('/apply-vacancy/:id', async (req, res) => {
    try {
        const vacancyId = req.params.id;
        const teacherId = req.teacher.id; // From auth middleware

        // Check if vacancy exists and is open
        const vacancy = await Vacancy.findOne({ 
            _id: vacancyId,
            status: 'open'
        });

        if (!vacancy) {
            return res.status(404).json({
                success: false,
                message: 'Vacancy not found or not open'
            });
        }

        // Check if already applied
        const alreadyApplied = vacancy.applications.some(
            app => app.teacher.toString() === teacherId
        );

        if (alreadyApplied) {
            return res.status(400).json({
                success: false,
                message: 'You have already applied for this vacancy'
            });
        }

        // Check if vacancy has less than 5 applications
        if (vacancy.applications.length >= 5) {
            return res.status(400).json({
                success: false,
                message: 'This vacancy has reached maximum applications'
            });
        }

        // Add application
        vacancy.applications.push({
            teacher: teacherId,
            status: 'pending'
        });

        await vacancy.save();

        res.json({
            success: true,
            message: 'Application submitted successfully'
        });

    } catch (error) {
        console.error('Error applying to vacancy:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting application'
        });
    }
});

module.exports = router;