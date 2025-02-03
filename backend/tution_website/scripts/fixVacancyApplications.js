const mongoose = require('mongoose');
const Vacancy = require('../models/Vacancy');
require('dotenv').config();

async function fixVacancyApplications() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get all vacancies
        const vacancies = await Vacancy.find({});
        console.log(`Found ${vacancies.length} vacancies to check`);

        let fixedCount = 0;
        for (const vacancy of vacancies) {
            const oldLength = vacancy.applications.length;
            
            // Keep only applications that have a teacher field
            vacancy.applications = vacancy.applications.filter(app => app.teacher);
            
            if (oldLength !== vacancy.applications.length) {
                await vacancy.save();
                fixedCount++;
                console.log(`Fixed vacancy ${vacancy.title}: Removed ${oldLength - vacancy.applications.length} invalid applications`);
            }
        }

        console.log(`Fixed ${fixedCount} vacancies`);
        console.log('Database cleanup complete!');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing vacancy applications:', error);
        process.exit(1);
    }
}

fixVacancyApplications();