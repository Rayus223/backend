const express = require('express');
const router = express.Router();
const { 
    submitApplication, 
    getAllApplications,
    deleteApplication 
} = require('../controllers/studentApplyController');

// GET all students
router.get('/all', getAllApplications);

// POST new student application
router.post('/', submitApplication);

// DELETE student application
router.delete('/delete/:id', deleteApplication);

module.exports = router;