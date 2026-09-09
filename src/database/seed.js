import initializeDatabase from './index.js';
import { hashPassword } from '../utils/helpers.js';
import User from '../models/User.js';
import Setting from '../models/Setting.js';
import Branch from '../models/Branch.js';
import { DEFAULT_SETTINGS } from '../constants/index.js';
import logger from '../utils/logger.js';

const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...');
    
    // Seed default settings
    console.log('Seeding default settings...');
    for (const setting of DEFAULT_SETTINGS) {
      await Setting.findOrCreate({
        where: { key: setting.key },
        defaults: setting
      });
    }
    console.log('Default settings seeded successfully.');
    
    // Seed super admin user
    console.log('Seeding super admin user...');
    const adminPassword = await hashPassword('Admin123456');
    const [superAdmin] = await User.findOrCreate({
      where: { email: 'admin@carbranchmanager.com' },
      defaults: {
        email: 'admin@carbranchmanager.com',
        password: adminPassword,
        first_name: 'Super',
        last_name: 'Admin',
        role: 'super_admin',
        status: 'active',
        email_verified: true
      }
    });
    
    if (superAdmin) {
      console.log('Super admin user created/updated successfully.');
      console.log('Email: admin@carbranchmanager.com');
      console.log('Password: Admin123456');
      console.log('⚠️  Please change this password after first login!');
    }
    
    // Seed demo branch
    console.log('Seeding demo branch...');
    const [demoBranch] = await Branch.findOrCreate({
      where: { code: 'MAIN' },
      defaults: {
        name: 'Main Branch',
        code: 'MAIN',
        address: '123 Main Street, Cairo',
        city: 'Cairo',
        country: 'Egypt',
        phone: '+201234567890',
        email: 'main@carbranchmanager.com',
        status: 'active',
        manager_id: superAdmin.id,
        opening_hours: {
          sunday: { open: '09:00', close: '17:00', is_closed: false },
          monday: { open: '09:00', close: '17:00', is_closed: false },
          tuesday: { open: '09:00', close: '17:00', is_closed: false },
          wednesday: { open: '09:00', close: '17:00', is_closed: false },
          thursday: { open: '09:00', close: '17:00', is_closed: false },
          friday: { open: '09:00', close: '17:00', is_closed: false },
          saturday: { open: '09:00', close: '17:00', is_closed: false }
        }
      }
    });
    
    if (demoBranch) {
      console.log('Demo branch created successfully.');
    }
    
    // Seed demo manager
    console.log('Seeding demo manager...');
    const managerPassword = await hashPassword('Manager123456');
    const [demoManager] = await User.findOrCreate({
      where: { email: 'manager@carbranchmanager.com' },
      defaults: {
        email: 'manager@carbranchmanager.com',
        password: managerPassword,
        first_name: 'Demo',
        last_name: 'Manager',
        role: 'manager',
        status: 'active',
        email_verified: true,
        branch_id: demoBranch.id
      }
    });
    
    if (demoManager) {
      console.log('Demo manager user created successfully.');
      console.log('Email: manager@carbranchmanager.com');
      console.log('Password: Manager123456');
    }
    
    // Update branch manager
    await demoBranch.update({ manager_id: demoManager.id });
    
    console.log('Database seeding completed successfully!');
    console.log('\n=== Demo Credentials ===');
    console.log('Super Admin:');
    console.log('  Email: admin@carbranchmanager.com');
    console.log('  Password: Admin123456');
    console.log('\nManager:');
    console.log('  Email: manager@carbranchmanager.com');
    console.log('  Password: Manager123456');
    console.log('========================\n');
    
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    logger.error('Seeding error:', error);
    process.exit(1);
  }
};

export { seedDatabase };

// Run directly if this file is executed
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase();
}
