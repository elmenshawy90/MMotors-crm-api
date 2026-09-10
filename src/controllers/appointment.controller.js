import Appointment from '../models/Appointment.js';
import Branch from '../models/Branch.js';
import Vehicle from '../models/Vehicle.js';
import Contact from '../models/Contact.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import { Op } from 'sequelize';
import logger from '../utils/logger.js';

class AppointmentController {
  async getAllAppointments(req, res, next) {
    try {
      const { branch_id, vehicle_id, contact_id, status, type, kind, date_from, date_to, search } = req.query;
      
      const where = {};
      
      if (branch_id) {
        where.branch_id = branch_id;
      }
      
      if (vehicle_id) {
        where.vehicle_id = vehicle_id;
      }
      
      if (status) {
        where.status = status;
      }
      
      if (type || kind) {
        where.type = type || kind;
      }
      
      if (contact_id) {
        where.contact_id = contact_id;
      }
      
      if (date_from || date_to) {
        where.appointment_date = {};
        if (date_from) {
          where.appointment_date[Op.gte] = date_from;
        }
        if (date_to) {
          where.appointment_date[Op.lte] = date_to;
        }
      }
      
      if (search) {
        where[Op.or] = [
          { customer_name: { [Op.iLike]: `%${search}%` } },
          { customer_phone: { [Op.iLike]: `%${search}%` } },
          { customer_email: { [Op.iLike]: `%${search}%` } },
          { advisor: { [Op.iLike]: `%${search}%` } }
        ];
      }
      
      const appointments = await Appointment.findAll({
        where,
        include: [
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'name', 'code'],
            include: [
              {
                model: Company,
                as: 'company',
                attributes: ['id', 'name', 'code']
              }
            ]
          },
          {
            model: Vehicle,
            as: 'vehicle',
            attributes: ['id', 'make', 'model', 'year', 'license_plate']
          },
          {
            model: Contact,
            as: 'contact',
            attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'first_name', 'last_name', 'email']
          }
        ],
        order: [['appointment_date', 'ASC'], ['appointment_time', 'ASC']]
      });
      
      res.json({
        success: true,
        data: appointments,
        count: appointments.length
      });
    } catch (error) {
      logger.error('Get appointments error:', error);
      next(error);
    }
  }

  async getAppointmentById(req, res, next) {
    try {
      const { id } = req.params;
      
      const appointment = await Appointment.findByPk(id, {
        include: [
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'name', 'code', 'address', 'phone'],
            include: [
              {
                model: Company,
                as: 'company',
                attributes: ['id', 'name', 'code']
              }
            ]
          },
          {
            model: Vehicle,
            as: 'vehicle',
            attributes: ['id', 'make', 'model', 'year', 'license_plate', 'status']
          },
          {
            model: Contact,
            as: 'contact',
            attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'first_name', 'last_name', 'email']
          }
        ]
      });
      
      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: 'Appointment not found'
        });
      }
      
      res.json({
        success: true,
        data: appointment
      });
    } catch (error) {
      logger.error('Get appointment error:', error);
      next(error);
    }
  }

  async createAppointment(req, res, next) {
    try {
      const appointmentData = req.body;
      appointmentData.created_by = req.user.id;
      
      const appointment = await Appointment.create(appointmentData);
      
      const appointmentWithIncludes = await Appointment.findByPk(appointment.id, {
        include: [
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'name', 'code'],
            include: [
              {
                model: Company,
                as: 'company',
                attributes: ['id', 'name', 'code']
              }
            ]
          },
          {
            model: Vehicle,
            as: 'vehicle',
            attributes: ['id', 'make', 'model', 'year', 'license_plate']
          },
          {
            model: Contact,
            as: 'contact',
            attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
          }
        ]
      });
      
      logger.info(`Appointment created: ${appointment.id}`);
      
      res.status(201).json({
        success: true,
        data: appointmentWithIncludes,
        message: 'Appointment created successfully'
      });
    } catch (error) {
      logger.error('Create appointment error:', error);
      next(error);
    }
  }

  async updateAppointment(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const appointment = await Appointment.findByPk(id);
      
      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: 'Appointment not found'
        });
      }
      
      await appointment.update(updateData);
      
      const appointmentWithIncludes = await Appointment.findByPk(id, {
        include: [
          {
            model: Branch,
            as: 'branch',
            attributes: ['id', 'name', 'code'],
            include: [
              {
                model: Company,
                as: 'company',
                attributes: ['id', 'name', 'code']
              }
            ]
          },
          {
            model: Vehicle,
            as: 'vehicle',
            attributes: ['id', 'make', 'model', 'year', 'license_plate']
          },
          {
            model: Contact,
            as: 'contact',
            attributes: ['id', 'first_name', 'last_name', 'email', 'phone']
          }
        ]
      });
      
      logger.info(`Appointment updated: ${id}`);
      
      res.json({
        success: true,
        data: appointmentWithIncludes,
        message: 'Appointment updated successfully'
      });
    } catch (error) {
      logger.error('Update appointment error:', error);
      next(error);
    }
  }

  async deleteAppointment(req, res, next) {
    try {
      const { id } = req.params;
      
      const appointment = await Appointment.findByPk(id);
      
      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: 'Appointment not found'
        });
      }
      
      await appointment.destroy();
      
      logger.info(`Appointment deleted: ${id}`);
      
      res.json({
        success: true,
        message: 'Appointment deleted successfully'
      });
    } catch (error) {
      logger.error('Delete appointment error:', error);
      next(error);
    }
  }
}

export default new AppointmentController();
