import sequelize from '../config/database.js';
import User from '../models/User.js';
import Setting from '../models/Setting.js';
import Branch from '../models/Branch.js';
import Vehicle from '../models/Vehicle.js';
import Appointment from '../models/Appointment.js';
import Contact from '../models/Contact.js';
import PhoneCall from '../models/PhoneCall.js';
import Helpdesk from '../models/Helpdesk.js';
import Company from '../models/Company.js';
import Station from '../models/Station.js';
import Employee from '../models/Employee.js';
import WarrantyPackage from '../models/WarrantyPackage.js';
import MailGroup from '../models/MailGroup.js';
import Definition from '../models/Definition.js';
import Role from '../models/Role.js';
import Permission from '../models/Permission.js';
import PageAccess from '../models/PageAccess.js';
import KnowledgeCategory from '../models/KnowledgeCategory.js';
import KnowledgeItem from '../models/KnowledgeItem.js';
import Lead from '../models/Lead.js';

// Ensure all models are imported before defining associations

// Define associations
const defineAssociations = () => {
  // User associations
  User.hasMany(Setting, { foreignKey: 'created_by', as: 'createdSettings' });
  User.hasMany(Branch, { foreignKey: 'manager_id', as: 'managedBranches' });
  User.hasMany(Appointment, { foreignKey: 'created_by', as: 'createdAppointments' });
  User.hasMany(Contact, { foreignKey: 'created_by', as: 'createdContacts' });
  User.hasMany(PhoneCall, { foreignKey: 'created_by', as: 'createdPhoneCalls' });
  User.hasMany(Helpdesk, { foreignKey: 'created_by', as: 'createdHelpdeskTickets' });

  // Branch associations
  Branch.belongsTo(User, { foreignKey: 'manager_id', as: 'manager' });
  Branch.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
  Branch.hasMany(User, { foreignKey: 'branch_id', as: 'users' });
  Branch.hasMany(Vehicle, { foreignKey: 'branch_id', as: 'vehicles' });
  Branch.hasMany(Appointment, { foreignKey: 'branch_id', as: 'appointments' });
  Branch.hasMany(Contact, { foreignKey: 'branch_id', as: 'contacts' });
  Branch.hasMany(PhoneCall, { foreignKey: 'branch_id', as: 'phoneCalls' });
  Branch.hasMany(Helpdesk, { foreignKey: 'branch_id', as: 'helpdeskTickets' });
  Branch.hasMany(Station, { foreignKey: 'branch_id', as: 'stations' });
  Branch.hasMany(Employee, { foreignKey: 'branch_id', as: 'employees' });

  // Vehicle associations
  Vehicle.hasMany(Appointment, { foreignKey: 'vehicle_id', as: 'appointments' });
  Vehicle.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
  Vehicle.belongsTo(Contact, { foreignKey: 'owner_id', as: 'owner' });

  // Appointment associations
  Appointment.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
  Appointment.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
  Appointment.belongsTo(Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });
  Appointment.belongsTo(Contact, { foreignKey: 'contact_id', as: 'contact' });

  // Contact associations
  Contact.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
  Contact.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
  Contact.hasMany(Vehicle, { foreignKey: 'owner_id', as: 'ownedVehicles' });
  Contact.hasMany(Appointment, { foreignKey: 'contact_id', as: 'appointments' });
  Contact.hasMany(PhoneCall, { foreignKey: 'contact_id', as: 'phoneCalls' });

  // PhoneCall associations
  PhoneCall.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
  PhoneCall.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
  PhoneCall.belongsTo(Contact, { foreignKey: 'contact_id', as: 'contact' });

  // Helpdesk associations
  Helpdesk.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
  Helpdesk.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignedUser' });
  Helpdesk.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });

  // Setting associations
  Setting.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

  // Company associations
  Company.hasMany(Branch, { foreignKey: 'company_id', as: 'branches' });
  Company.hasMany(Station, { foreignKey: 'company_id', as: 'stations' });
  Company.hasMany(Employee, { foreignKey: 'company_id', as: 'employees' });
  Company.hasMany(WarrantyPackage, { foreignKey: 'company_id', as: 'warrantyPackages' });
  Company.hasMany(MailGroup, { foreignKey: 'company_id', as: 'mailGroups' });

  // Station associations
  Station.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
  Station.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

  // Employee associations
  Employee.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
  Employee.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

  // WarrantyPackage associations
  WarrantyPackage.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

  // MailGroup associations
  MailGroup.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

  // Role associations
  Role.hasMany(User, { foreignKey: 'role_id', as: 'users' });
  Role.hasMany(PageAccess, { foreignKey: 'role_id', as: 'pageAccess' });

  // Permission associations
  Permission.hasMany(Role, { foreignKey: 'permission_id', as: 'roles' });

  // PageAccess associations
  PageAccess.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });

  // Knowledge associations (self-referencing tree)
  KnowledgeCategory.hasMany(KnowledgeCategory, { foreignKey: 'parent_id', as: 'children' });
  KnowledgeCategory.belongsTo(KnowledgeCategory, { foreignKey: 'parent_id', as: 'parent' });
  KnowledgeCategory.hasMany(KnowledgeItem, { foreignKey: 'category_id', as: 'items' });
  KnowledgeItem.belongsTo(KnowledgeCategory, { foreignKey: 'category_id', as: 'category' });

  // Lead associations
  Lead.belongsTo(Branch,  { foreignKey: 'branch_id',   as: 'branch'       });
  Lead.belongsTo(Contact, { foreignKey: 'contact_id',  as: 'contact'      });
  Lead.belongsTo(Vehicle, { foreignKey: 'vehicle_id',  as: 'vehicle'      });
  Lead.belongsTo(User,    { foreignKey: 'assigned_to', as: 'assignedUser' });
  Lead.belongsTo(User,    { foreignKey: 'created_by',  as: 'creator'      });
  Branch.hasMany(Lead,    { foreignKey: 'branch_id',   as: 'leads'        });
  Contact.hasMany(Lead,   { foreignKey: 'contact_id',  as: 'leads'        });
  User.hasMany(Lead,      { foreignKey: 'assigned_to', as: 'assignedLeads'});
  User.hasMany(Lead,      { foreignKey: 'created_by',  as: 'createdLeads' });
};

const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    defineAssociations();

    console.log('Database initialized (schema managed via migrations).');

    return sequelize;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
};

export default initializeDatabase;
