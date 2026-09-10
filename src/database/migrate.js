
import sequelize from '../config/database.js';
import initializeDatabase from './index.js';
import { seedDatabase } from './seed.js';

const migrate = async () => {
  try {
    console.log('Starting database setup...');

    //  authenticate + defineAssociations
    await initializeDatabase();

    console.log('Creating tables if not exist...');
    await sequelize.sync({ force: false, alter: false });
    console.log('Tables ready.');

    // Seed  
    if (process.argv.includes('--seed')) {
      console.log('Starting database seeding...');
      await seedDatabase();
      console.log('Seeding completed.');
    }

    console.log('Database setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  }
};

migrate();
