import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const PhoneCall = sequelize.define('PhoneCall', {
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
  caller_name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Caller name cannot be empty'
      }
    }
  },
  caller_phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'Caller phone cannot be empty'
      }
    }
  },
  call_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  call_duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Duration in seconds'
  },
  direction: {
    type: DataTypes.ENUM('inbound', 'outbound'),
    allowNull: false,
    defaultValue: 'inbound'
  },
  status: {
    type: DataTypes.ENUM('missed', 'completed', 'cancelled', 'voicemail'),
    allowNull: false,
    defaultValue: 'completed'
  },
  purpose: {
    type: DataTypes.ENUM('inquiry', 'appointment', 'complaint', 'support', 'sales', 'follow_up', 'other'),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  follow_up_required: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  follow_up_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  follow_up_date_2: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Auto: +1 day from follow_up_date'
  },
  follow_up_date_3: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Auto: +3 days from follow_up_date'
  },
  recording_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'phone_calls',
  timestamps: true,
  paranoid: true,
  indexes: [
    {
      fields: ['branch_id']
    },
    {
      fields: ['contact_id']
    },
    {
      fields: ['call_date']
    },
    {
      fields: ['direction']
    },
    {
      fields: ['status']
    },
    {
      fields: ['purpose']
    },
    {
      fields: ['caller_phone']
    }
  ]
});

export default PhoneCall;
