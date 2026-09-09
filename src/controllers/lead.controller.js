import Lead from '../models/Lead.js';
import Branch from '../models/Branch.js';
import Contact from '../models/Contact.js';
import Vehicle from '../models/Vehicle.js';
import User from '../models/User.js';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import logger from '../utils/logger.js';

// Auto-generate a lead number like LEAD-2026-00042
const generateLeadNumber = async () => {
  const year = new Date().getFullYear();
  const count = await Lead.count({ paranoid: false });
  const seq = String(count + 1).padStart(5, '0');
  return `LEAD-${year}-${seq}`;
};

class LeadController {
  // ─── GET ALL ──────────────────────────────────────────────────────────────
  async getAllLeads(req, res, next) {
    try {
      const {
        branch_id,
        contact_id,
        assigned_to,
        status,
        stage,
        priority,
        source,
        search,
        date_from,
        date_to,
        follow_up_from,
        follow_up_to,
        financing_required,
        trade_in,
        page = 1,
        limit = 100
      } = req.query;

      const where = {};

      if (branch_id)   where.branch_id   = branch_id;
      if (contact_id)  where.contact_id  = contact_id;
      if (assigned_to) where.assigned_to = assigned_to;
      if (status)      where.status      = status;
      if (stage)       where.stage       = stage;
      if (priority)    where.priority    = priority;
      if (source)      where.source      = source;

      if (financing_required !== undefined) {
        where.financing_required = financing_required === 'true';
      }
      if (trade_in !== undefined) {
        where.trade_in = trade_in === 'true';
      }

      if (date_from || date_to) {
        where.created_at = {};
        if (date_from) where.created_at[Op.gte] = date_from;
        if (date_to)   where.created_at[Op.lte] = date_to;
      }

      if (follow_up_from || follow_up_to) {
        where.next_follow_up = {};
        if (follow_up_from) where.next_follow_up[Op.gte] = follow_up_from;
        if (follow_up_to)   where.next_follow_up[Op.lte] = follow_up_to;
      }

      if (search) {
        where[Op.or] = [
          { customer_name:  { [Op.iLike]: `%${search}%` } },
          { customer_phone: { [Op.iLike]: `%${search}%` } },
          { customer_email: { [Op.iLike]: `%${search}%` } },
          { title:          { [Op.iLike]: `%${search}%` } },
          { lead_number:    { [Op.iLike]: `%${search}%` } },
          { vehicle_make:   { [Op.iLike]: `%${search}%` } },
          { vehicle_model:  { [Op.iLike]: `%${search}%` } }
        ];
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { count, rows: leads } = await Lead.findAndCountAll({
        where,
        include: [
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'name', 'code']
          },
          {
            model: Contact,
            as: 'contact',
            attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'loyalty_tier']
          },
          {
            model: Vehicle,
            as: 'vehicle',
            attributes: ['id', 'make', 'model', 'year', 'license_plate', 'price']
          },
          {
            model: User,
            as: 'assignedUser',
            attributes: ['id', 'first_name', 'last_name', 'email']
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'first_name', 'last_name']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset
      });

      res.json({
        success: true,
        data: leads,
        count,
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / parseInt(limit))
      });
    } catch (error) {
      logger.error('Get leads error:', error);
      next(error);
    }
  }

  // ─── GET BY ID ────────────────────────────────────────────────────────────
  async getLeadById(req, res, next) {
    try {
      const { id } = req.params;

      const lead = await Lead.findByPk(id, {
        include: [
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'name', 'code', 'address', 'phone', 'email']
          },
          {
            model: Contact,
            as: 'contact',
            attributes: [
              'id', 'first_name', 'last_name', 'email', 'phone',
              'mobile', 'company', 'loyalty_tier', 'total_spent', 'tags'
            ]
          },
          {
            model: Vehicle,
            as: 'vehicle',
            attributes: [
              'id', 'make', 'model', 'year', 'license_plate',
              'price', 'color', 'fuel_type', 'transmission', 'status'
            ]
          },
          {
            model: User,
            as: 'assignedUser',
            attributes: ['id', 'first_name', 'last_name', 'email', 'avatar']
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'first_name', 'last_name', 'email']
          }
        ]
      });

      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      res.json({ success: true, data: lead });
    } catch (error) {
      logger.error('Get lead error:', error);
      next(error);
    }
  }

  // ─── CREATE ───────────────────────────────────────────────────────────────
  async createLead(req, res, next) {
    try {
      const leadData = { ...req.body };
      leadData.created_by = req.user.id;
      leadData.lead_number = await generateLeadNumber();

      const lead = await Lead.create(leadData);

      const leadWithIncludes = await Lead.findByPk(lead.id, {
        include: [
          { model: Branch,  as: 'branch',       attributes: ['id', 'name', 'code'] },
          { model: Contact, as: 'contact',       attributes: ['id', 'first_name', 'last_name', 'phone'] },
          { model: Vehicle, as: 'vehicle',       attributes: ['id', 'make', 'model', 'year'] },
          { model: User,    as: 'assignedUser',  attributes: ['id', 'first_name', 'last_name', 'email'] }
        ]
      });

      logger.info(`Lead created: ${lead.id} (${lead.lead_number})`);

      res.status(201).json({
        success: true,
        data: leadWithIncludes,
        message: 'Lead created successfully'
      });
    } catch (error) {
      logger.error('Create lead error:', error);
      next(error);
    }
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────────
  async updateLead(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };

      // Protect immutable fields
      delete updateData.id;
      delete updateData.lead_number;
      delete updateData.created_by;

      // Auto-set close date when status becomes won/lost
      if (updateData.status === 'won' || updateData.status === 'lost') {
        if (!updateData.actual_close_date) {
          updateData.actual_close_date = new Date();
        }
        if (updateData.status === 'won') {
          updateData.stage = 'closed_won';
        } else {
          updateData.stage = 'closed_lost';
        }
      }

      const lead = await Lead.findByPk(id);

      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      await lead.update(updateData);

      const updatedLead = await Lead.findByPk(id, {
        include: [
          { model: Branch,  as: 'branch',       attributes: ['id', 'name', 'code'] },
          { model: Contact, as: 'contact',       attributes: ['id', 'first_name', 'last_name', 'phone'] },
          { model: Vehicle, as: 'vehicle',       attributes: ['id', 'make', 'model', 'year'] },
          { model: User,    as: 'assignedUser',  attributes: ['id', 'first_name', 'last_name', 'email'] }
        ]
      });

      logger.info(`Lead updated: ${id}`);

      res.json({
        success: true,
        data: updatedLead,
        message: 'Lead updated successfully'
      });
    } catch (error) {
      logger.error('Update lead error:', error);
      next(error);
    }
  }

  // ─── UPDATE STATUS ONLY ───────────────────────────────────────────────────
  async updateLeadStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, lost_reason, lost_notes } = req.body;

      const lead = await Lead.findByPk(id);

      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      const updatePayload = { status };

      if (status === 'won') {
        updatePayload.actual_close_date = new Date();
        updatePayload.stage = 'closed_won';
        updatePayload.probability = 100;
      } else if (status === 'lost') {
        updatePayload.actual_close_date = new Date();
        updatePayload.stage = 'closed_lost';
        updatePayload.probability = 0;
        if (lost_reason) updatePayload.lost_reason = lost_reason;
        if (lost_notes)  updatePayload.lost_notes  = lost_notes;
      }

      await lead.update(updatePayload);

      logger.info(`Lead status updated: ${id} → ${status}`);

      res.json({
        success: true,
        data: lead,
        message: `Lead marked as ${status}`
      });
    } catch (error) {
      logger.error('Update lead status error:', error);
      next(error);
    }
  }

  // ─── ADD ACTIVITY ─────────────────────────────────────────────────────────
  async addActivity(req, res, next) {
    try {
      const { id } = req.params;
      const { type, note, next_follow_up } = req.body;

      const lead = await Lead.findByPk(id);

      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      const activity = {
        id: `act_${Date.now()}`,
        type,      // call | email | meeting | note | demo | other
        note,
        created_by: req.user.id,
        created_by_name: `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim(),
        created_at: new Date().toISOString()
      };

      const currentActivities = lead.activities || [];
      const updatedActivities = [activity, ...currentActivities];

      const updatePayload = {
        activities: updatedActivities,
        last_contact_date: new Date()
      };

      if (next_follow_up) {
        updatePayload.next_follow_up = next_follow_up;
      }

      await lead.update(updatePayload);

      logger.info(`Activity added to lead: ${id}`);

      res.json({
        success: true,
        data: lead,
        message: 'Activity logged successfully'
      });
    } catch (error) {
      logger.error('Add activity error:', error);
      next(error);
    }
  }

  // ─── STATS ────────────────────────────────────────────────────────────────
  async getLeadStats(req, res, next) {
    try {
      const { branch_id } = req.query;
      const where = {};
      if (branch_id) where.branch_id = branch_id;

      const [
        total,
        byStatus,
        bySource,
        byPriority,
        totalValue,
        wonValue,
        overdueFollowUps
      ] = await Promise.all([
        Lead.count({ where }),
        Lead.findAll({
          where,
          attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
          group: ['status'],
          raw: true
        }),
        Lead.findAll({
          where,
          attributes: ['source', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
          group: ['source'],
          raw: true
        }),
        Lead.findAll({
          where,
          attributes: ['priority', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
          group: ['priority'],
          raw: true
        }),
        Lead.sum('expected_value', { where }),
        Lead.sum('actual_value', { where: { ...where, status: 'won' } }),
        Lead.count({
          where: {
            ...where,
            next_follow_up: { [Op.lt]: new Date() },
            status: { [Op.notIn]: ['won', 'lost'] }
          }
        })
      ]);

      res.json({
        success: true,
        data: {
          total,
          byStatus: byStatus.reduce((acc, r) => { acc[r.status] = parseInt(r.count); return acc; }, {}),
          bySource: bySource.reduce((acc, r) => { acc[r.source] = parseInt(r.count); return acc; }, {}),
          byPriority: byPriority.reduce((acc, r) => { acc[r.priority] = parseInt(r.count); return acc; }, {}),
          pipeline_value: parseFloat(totalValue) || 0,
          won_value: parseFloat(wonValue) || 0,
          overdue_follow_ups: overdueFollowUps
        }
      });
    } catch (error) {
      logger.error('Get lead stats error:', error);
      next(error);
    }
  }

  // ─── DELETE ───────────────────────────────────────────────────────────────
  async deleteLead(req, res, next) {
    try {
      const { id } = req.params;

      const lead = await Lead.findByPk(id);

      if (!lead) {
        return res.status(404).json({
          success: false,
          message: 'Lead not found'
        });
      }

      await lead.destroy();

      logger.info(`Lead deleted: ${id}`);

      res.json({
        success: true,
        message: 'Lead deleted successfully'
      });
    } catch (error) {
      logger.error('Delete lead error:', error);
      next(error);
    }
  }
}

export default new LeadController();
