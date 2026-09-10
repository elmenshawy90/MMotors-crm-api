import Contact from '../models/Contact.js';
import Branch from '../models/Branch.js';
import User from '../models/User.js';
import Vehicle from '../models/Vehicle.js';
import Appointment from '../models/Appointment.js';
import Helpdesk from '../models/Helpdesk.js';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import logger from '../utils/logger.js';

class ContactController {
  async getAllContacts(req, res) {
    try {
      const { 
        branch_id, 
        type, 
        status, 
        search, 
        sort_by, 
        loyalty_tier,
        date_range,
        custom_start_date,
        custom_end_date,
        year,
        city
      } = req.query;
      
      const where = {};
      
      if (branch_id && branch_id !== 'all') {
        where.branch_id = branch_id;
      }
      
      if (type && type !== 'all') {
        where.type = type;
      }
      
      if (status) {
        where.status = status;
      }

      if (loyalty_tier) {
        where.loyalty_tier = loyalty_tier;
      }

      if (city && city !== 'all') {
        where.city = city;
      }
      
      // Date range filtering
      if (date_range) {
        const now = new Date();
        let startDate, endDate;
        
        switch (date_range) {
          case 'this_month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            break;
          case 'last_month':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
            break;
          case 'this_year':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            break;
          case 'last_year':
            startDate = new Date(now.getFullYear() - 1, 0, 1);
            endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
            break;
          case 'custom':
            if (custom_start_date && custom_end_date) {
              startDate = new Date(custom_start_date);
              endDate = new Date(custom_end_date);
              endDate.setHours(23, 59, 59, 999);
            }
            break;
        }
        
        if (startDate && endDate) {
          where.created_at = {
            [Op.gte]: startDate,
            [Op.lte]: endDate
          };
        }
      }

      // Year filtering
      if (year && year !== 'all') {
        const yearNum = parseInt(year);
        where.created_at = {
          [Op.gte]: new Date(yearNum, 0, 1),
          [Op.lte]: new Date(yearNum, 11, 31, 23, 59, 59, 999)
        };
      }
      
      if (search) {
        const fullName = sequelize.literal(`CONCAT("Contact"."first_name", ' ', "Contact"."last_name")`);
        where[Op.or] = [
          { '$Contact.first_name$': { [Op.iLike]: `%${search}%` } },
          { '$Contact.last_name$': { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
          { phone: { [Op.iLike]: `%${search}%` } },
          { company: { [Op.iLike]: `%${search}%` } },
          sequelize.where(fullName, { [Op.iLike]: `%${search}%` })
        ];
      }
      
      let order = [['created_at', 'DESC']];
      
      if (sort_by === 'name') {
        order = [
          [sequelize.col('Contact.first_name'), 'ASC'],
          [sequelize.col('Contact.last_name'), 'ASC']
        ];
      } else if (sort_by === 'recent') {
        order = [['since', 'DESC']];
      }
      
      const contacts = await Contact.findAll({
        where,
        include: [
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'name', 'code', 'city']
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'first_name', 'last_name', 'email']
          }
        ],
        order
      });
      
      res.json({
        success: true,
        data: contacts,
        count: contacts.length
      });
    } catch (error) {
      logger.error('Get contacts error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getContactById(req, res) {
    try {
      const { id } = req.params;
      
      const contact = await Contact.findByPk(id, {
        include: [
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'name', 'code', 'address', 'phone']
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'first_name', 'last_name', 'email']
          }
        ]
      });
      
      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contact not found'
        });
      }
      
      res.json({
        success: true,
        data: contact
      });
    } catch (error) {
      logger.error('Get contact error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async createContact(req, res) {
    try {
      const contactData = req.body;
      contactData.created_by = req.user.id;
      
      const contact = await Contact.create(contactData);
      
      const contactWithIncludes = await Contact.findByPk(contact.id, {
        include: [
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'name', 'code']
          }
        ]
      });
      
      logger.info(`Contact created: ${contact.first_name} ${contact.last_name}`);
      
      res.status(201).json({
        success: true,
        data: contactWithIncludes,
        message: 'Contact created successfully'
      });
    } catch (error) {
      logger.error('Create contact error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async updateContact(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const contact = await Contact.findByPk(id);
      
      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contact not found'
        });
      }
      
      await contact.update(updateData);
      
      const contactWithIncludes = await Contact.findByPk(id, {
        include: [
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'name', 'code']
          }
        ]
      });
      
      logger.info(`Contact updated: ${id}`);
      
      res.json({
        success: true,
        data: contactWithIncludes,
        message: 'Contact updated successfully'
      });
    } catch (error) {
      logger.error('Update contact error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async deleteContact(req, res) {
    try {
      const { id } = req.params;
      
      const contact = await Contact.findByPk(id);
      
      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contact not found'
        });
      }
      
      await contact.destroy();
      
      logger.info(`Contact deleted: ${id}`);
      
      res.json({
        success: true,
        message: 'Contact deleted successfully'
      });
    } catch (error) {
      logger.error('Delete contact error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get contact statistics
  async getContactStats(req, res) {
    try {
      const { branch_id } = req.query;
      
      const where = {};
      if (branch_id && branch_id !== 'all') {
        where.branch_id = branch_id;
      }
      
      const totalContacts = await Contact.count({ where });
      
      const byType = {
        Individual: await Contact.count({ where: { ...where, type: 'Individual' } }),
        Company: await Contact.count({ where: { ...where, type: 'Company' } }),
        Fleet: await Contact.count({ where: { ...where, type: 'Fleet' } }),
      };
      
      const totalVehicles = await Vehicle.count({
        where: branch_id && branch_id !== 'all' ? { branch_id } : {}
      });
      
      const totalAppointments = await Appointment.count({
        where: branch_id && branch_id !== 'all' ? { branch_id } : {}
      });
      
      const openTickets = await Helpdesk.count({
        where: {
          ...(branch_id && branch_id !== 'all' ? { branch_id } : {}),
          status: { [Op.notIn]: ['resolved', 'closed'] }
        }
      });
      
      const platinumMembers = await Contact.count({
        where: { ...where, loyalty_tier: 'Platinum' }
      });
      
      res.json({
        success: true,
        data: {
          totalContacts,
          byType,
          totalVehicles,
          totalAppointments,
          openTickets,
          platinumMembers
        }
      });
    } catch (error) {
      logger.error('Get contact stats error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Bulk delete contacts
  async bulkDeleteContacts(req, res) {
    try {
      const { ids } = req.body;
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Please provide contact IDs to delete'
        });
      }
      
      const deleted = await Contact.destroy({
        where: {
          id: { [Op.in]: ids }
        }
      });
      
      logger.info(`Bulk deleted ${deleted} contacts`);
      
      res.json({
        success: true,
        message: `Successfully deleted ${deleted} contacts`,
        deleted
      });
    } catch (error) {
      logger.error('Bulk delete contacts error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Bulk update contacts (add tags, update loyalty tier, etc.)
  async bulkUpdateContacts(req, res) {
    try {
      const { ids, updates } = req.body;
      
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Please provide contact IDs to update'
        });
      }
      
      if (!updates || Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Please provide updates to apply'
        });
      }
      
      const [updated] = await Contact.update(updates, {
        where: {
          id: { [Op.in]: ids }
        }
      });
      
      logger.info(`Bulk updated ${updated} contacts`);
      
      res.json({
        success: true,
        message: `Successfully updated ${updated} contacts`,
        updated
      });
    } catch (error) {
      logger.error('Bulk update contacts error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Export contacts to CSV
  async exportContacts(req, res) {
    try {
      const { ids, branch_id, type } = req.query;
      
      const where = {};
      
      if (ids) {
        const idArray = ids.split(',');
        where.id = { [Op.in]: idArray };
      }
      
      if (branch_id && branch_id !== 'all') {
        where.branch_id = branch_id;
      }
      
      if (type && type !== 'all') {
        where.type = type;
      }
      
      const contacts = await Contact.findAll({
        where,
        include: [
          {
            model: Branch,
            as: 'branch',
            attributes: ['name', 'code']
          }
        ]
      });
      
      // Generate CSV
      const headers = ['ID', 'Name', 'Email', 'Phone', 'Company', 'Type', 'Loyalty Tier', 'Branch', 'Since'];
      const rows = contacts.map(c => [
        c.id,
        `${c.first_name} ${c.last_name}`,
        c.email || '',
        c.phone,
        c.company || '',
        c.type,
        c.loyalty_tier || 'Bronze',
        c.branch?.name || '',
        c.since ? c.since.toISOString().split('T')[0] : ''
      ]);
      
      const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=contacts.csv');
      
      res.send(csvContent);
    } catch (error) {
      logger.error('Export contacts error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Add vehicles to contact
  async addVehiclesToContact(req, res) {
    try {
      const { id } = req.params;
      const { vehicle_ids } = req.body;
      
      const contact = await Contact.findByPk(id);
      
      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contact not found'
        });
      }
      
      const currentVehicles = contact.vehicles || [];
      const updatedVehicles = [...new Set([...currentVehicles, ...vehicle_ids])];
      
      await contact.update({ vehicles: updatedVehicles });
      
      logger.info(`Added vehicles to contact ${id}`);
      
      res.json({
        success: true,
        data: contact,
        message: 'Vehicles added successfully'
      });
    } catch (error) {
      logger.error('Add vehicles error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Remove vehicle from contact
  async removeVehicleFromContact(req, res) {
    try {
      const { id } = req.params;
      const { vehicle_id } = req.body;
      
      const contact = await Contact.findByPk(id);
      
      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contact not found'
        });
      }
      
      const updatedVehicles = (contact.vehicles || []).filter(v => v !== vehicle_id);
      
      await contact.update({ vehicles: updatedVehicles });
      
      logger.info(`Removed vehicle from contact ${id}`);
      
      res.json({
        success: true,
        data: contact,
        message: 'Vehicle removed successfully'
      });
    } catch (error) {
      logger.error('Remove vehicle error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Update contact tags
  async updateContactTags(req, res) {
    try {
      const { id } = req.params;
      const { tags } = req.body;
      
      const contact = await Contact.findByPk(id);
      
      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contact not found'
        });
      }
      
      await contact.update({ tags });
      
      logger.info(`Updated tags for contact ${id}`);
      
      res.json({
        success: true,
        data: contact,
        message: 'Tags updated successfully'
      });
    } catch (error) {
      logger.error('Update tags error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get contact activity (appointments and tickets)
  async getContactActivity(req, res) {
    try {
      const { id } = req.params;
      
      const contact = await Contact.findByPk(id);
      
      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contact not found'
        });
      }
      
      const appointments = await Appointment.findAll({
        where: { contact_id: id },
        include: [
          {
            model: Branch,
            as: 'branch',
            attributes: ['name', 'code']
          }
        ],
        order: [['date', 'DESC']],
        limit: 40
      });
      
      const tickets = await Helpdesk.findAll({
        where: { contact_id: id },
        order: [['created_at', 'DESC']],
        limit: 40
      });
      
      res.json({
        success: true,
        data: {
          appointments,
          tickets,
          totalAppointments: appointments.length,
          totalTickets: tickets.length,
          openTickets: tickets.filter(t => t.stage !== 'Solved').length
        }
      });
    } catch (error) {
      logger.error('Get contact activity error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

export default new ContactController();
