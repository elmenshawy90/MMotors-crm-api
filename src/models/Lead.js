import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Lead = sequelize.define('Lead', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  branch_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'branches',
      key: 'id'
    }
  },
  contact_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'contacts',
      key: 'id'
    }
  },
  vehicle_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'vehicles',
      key: 'id'
    }
  },
  assigned_to: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  lead_number: {
    type: DataTypes.STRING(30),
    allowNull: true,
    unique: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Lead title cannot be empty' }
    }
  },
  customer_name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Customer name cannot be empty' }
    }
  },
  customer_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: { msg: 'Please provide a valid email address' }
    }
  },
  customer_phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Customer phone cannot be empty' }
    }
  },
  source: {
    type: DataTypes.ENUM(
      'website',
      'phone_call',
      'walk_in',
      'referral',
      'social_media',
      'email',
      'advertisement',
      'exhibition',
      'other'
    ),
    allowNull: false,
    defaultValue: 'walk_in'
  },
  status: {
    type: DataTypes.ENUM('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'),
    allowNull: false,
    defaultValue: 'new'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    allowNull: false,
    defaultValue: 'medium'
  },
  stage: {
    type: DataTypes.ENUM(
      'initial_contact',
      'needs_analysis',
      'test_drive_scheduled',
      'proposal_sent',
      'negotiation',
      'closed_won',
      'closed_lost'
    ),
    allowNull: false,
    defaultValue: 'initial_contact'
  },
  expected_value: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    defaultValue: 0
  },
  actual_value: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  probability: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: { args: [0], msg: 'Probability must be between 0 and 100' },
      max: { args: [100], msg: 'Probability must be between 0 and 100' }
    }
  },
  interest_level: {
    type: DataTypes.ENUM('very_low', 'low', 'medium', 'high', 'very_high'),
    allowNull: true,
    defaultValue: 'medium'
  },
  vehicle_make: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  vehicle_model: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  vehicle_year: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  budget_min: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  budget_max: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  financing_required: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  trade_in: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  trade_in_vehicle: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  expected_close_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  actual_close_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  last_contact_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  next_follow_up: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  lost_reason: {
    type: DataTypes.ENUM(
      'price_too_high',
      'chose_competitor',
      'not_interested',
      'no_budget',
      'timing',
      'other'
    ),
    allowNull: true
  },
  lost_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    defaultValue: []
  },
  activities: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  }
}, {
  tableName: 'leads',
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['branch_id'] },
    { fields: ['contact_id'] },
    { fields: ['assigned_to'] },
    { fields: ['status'] },
    { fields: ['stage'] },
    { fields: ['priority'] },
    { fields: ['source'] },
    { fields: ['expected_close_date'] },
    { fields: ['next_follow_up'] },
    { fields: ['customer_phone'] }
  ]
});

export default Lead;
