const Student = require('../models/Student');

// Get all students
exports.getStudents = async (req, res) => {
    try {
        const students = await Student.find();
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Add new student
exports.addStudent = async (req, res) => {
    const student = new Student({
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        grade: req.body.grade,
        subjects: req.body.subjects
    });

    try {
        const newStudent = await student.save();
        res.status(201).json(newStudent);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};