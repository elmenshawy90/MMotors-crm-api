import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const KnowledgeCategory = sequelize.define('KnowledgeCategory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Category name cannot be empty' }
    }
  },
  name_ar: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  icon: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'BookOpen'
  },
  color: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: '#6366f1'
  },
  parent_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'knowledge_categories',
      key: 'id'
    }
  },
  order_index: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  is_published: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  // Branch-specific fields
  branch_address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  branch_working_hours_day: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  branch_working_hours_night: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  branch_manager: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  branch_phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  }
}, {
  tableName: 'knowledge_categories',
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['parent_id'] },
    { fields: ['order_index'] },
    { fields: ['is_published'] }
  ]
});

export default KnowledgeCategory;
