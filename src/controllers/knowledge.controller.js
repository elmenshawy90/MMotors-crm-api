import KnowledgeCategory from '../models/KnowledgeCategory.js';
import KnowledgeItem from '../models/KnowledgeItem.js';
import User from '../models/User.js';
import { Op } from 'sequelize';
import logger from '../utils/logger.js';

class KnowledgeController {

  // ─── CATEGORIES ──────────────────────────────────────────────────────────────

  async getAllCategories(req, res, next) {
    try {
      const { parent_id, include_children, search } = req.query;

      const where = {};

      if (parent_id === 'null' || parent_id === 'root') {
        where.parent_id = null;
      } else if (parent_id) {
        where.parent_id = parent_id;
      }

      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const categories = await KnowledgeCategory.findAll({
        where,
        order: [['order_index', 'ASC'], ['name', 'ASC']],
        include: include_children === 'true' ? [
          {
            model: KnowledgeCategory,
            as: 'children',
            include: [
              {
                model: KnowledgeCategory,
                as: 'children'
              }
            ]
          }
        ] : []
      });

      // Add item count for each category
      const categoriesWithCount = await Promise.all(categories.map(async (cat) => {
        const itemCount = await KnowledgeItem.count({ where: { category_id: cat.id } });
        return { ...cat.toJSON(), item_count: itemCount };
      }));

      res.json({ success: true, data: categoriesWithCount, count: categoriesWithCount.length });
    } catch (error) {
      logger.error('Get knowledge categories error:', error);
      next(error);
    }
  }

  async getCategoryById(req, res, next) {
    try {
      const { id } = req.params;

      const category = await KnowledgeCategory.findByPk(id, {
        include: [
          { model: KnowledgeCategory, as: 'parent', attributes: ['id', 'name', 'icon', 'color'] },
          {
            model: KnowledgeCategory,
            as: 'children',
            include: [{ model: KnowledgeCategory, as: 'children' }]
          }
        ]
      });

      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      const itemCount = await KnowledgeItem.count({ where: { category_id: id } });

      const categoryData = category.toJSON();
      
      // Log branch-specific fields for debugging
      logger.info('Category data:', {
        id: categoryData.id,
        name: categoryData.name,
        branch_address: categoryData.branch_address,
        branch_working_hours_day: categoryData.branch_working_hours_day,
        branch_working_hours_night: categoryData.branch_working_hours_night,
        branch_manager: categoryData.branch_manager,
        branch_phone: categoryData.branch_phone
      });

      res.json({ success: true, data: { ...categoryData, item_count: itemCount } });
    } catch (error) {
      logger.error('Get knowledge category error:', error);
      next(error);
    }
  }

  async createCategory(req, res, next) {
    try {
      const data = { ...req.body, created_by: req.user.id };
      const category = await KnowledgeCategory.create(data);
      logger.info(`Knowledge category created: ${category.name}`);
      res.status(201).json({ success: true, data: category, message: 'Category created successfully' });
    } catch (error) {
      logger.error('Create knowledge category error:', error);
      next(error);
    }
  }

  async updateCategory(req, res, next) {
    try {
      const { id } = req.params;
      const category = await KnowledgeCategory.findByPk(id);
      if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

      await category.update(req.body);
      const updated = await KnowledgeCategory.findByPk(id, {
        include: [{ model: KnowledgeCategory, as: 'parent', attributes: ['id', 'name'] }]
      });

      logger.info(`Knowledge category updated: ${category.name}`);
      res.json({ success: true, data: updated, message: 'Category updated successfully' });
    } catch (error) {
      logger.error('Update knowledge category error:', error);
      next(error);
    }
  }

  async deleteCategory(req, res, next) {
    try {
      const { id } = req.params;
      const category = await KnowledgeCategory.findByPk(id);
      if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

      // Move children to parent
      await KnowledgeCategory.update({ parent_id: category.parent_id }, { where: { parent_id: id } });
      await category.destroy();

      logger.info(`Knowledge category deleted: ${id}`);
      res.json({ success: true, message: 'Category deleted successfully' });
    } catch (error) {
      logger.error('Delete knowledge category error:', error);
      next(error);
    }
  }

  // Get full tree (root → children → grandchildren)
  async getTree(req, res, next) {
    try {
      const { search } = req.query;
      const where = { parent_id: null };

      const buildTree = async (parentId) => {
        const itemWhere = parentId === null ? { parent_id: null } : { parent_id: parentId };
        const cats = await KnowledgeCategory.findAll({
          where: itemWhere,
          order: [['order_index', 'ASC'], ['name', 'ASC']]
        });

        return Promise.all(cats.map(async (cat) => {
          const children = await buildTree(cat.id);
          const itemCount = await KnowledgeItem.count({ where: { category_id: cat.id } });
          return { ...cat.toJSON(), item_count: itemCount, children };
        }));
      };

      let tree;
      if (search) {
        // Flat search
        const results = await KnowledgeCategory.findAll({
          where: {
            [Op.or]: [
              { name: { [Op.iLike]: `%${search}%` } },
              { description: { [Op.iLike]: `%${search}%` } }
            ]
          }
        });
        tree = await Promise.all(results.map(async (cat) => {
          const itemCount = await KnowledgeItem.count({ where: { category_id: cat.id } });
          return { ...cat.toJSON(), item_count: itemCount, children: [] };
        }));
      } else {
        tree = await buildTree(null);
      }

      res.json({ success: true, data: tree });
    } catch (error) {
      logger.error('Get knowledge tree error:', error);
      next(error);
    }
  }

  // ─── ITEMS ───────────────────────────────────────────────────────────────────

  async getItemsByCategory(req, res, next) {
    try {
      const { category_id } = req.params;
      const { search, item_type } = req.query;

      const where = { category_id };
      if (item_type) where.item_type = item_type;
      if (search) {
        where[Op.or] = [
          { title: { [Op.iLike]: `%${search}%` } },
          { content: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const items = await KnowledgeItem.findAll({
        where,
        order: [['order_index', 'ASC'], ['created_at', 'DESC']]
      });

      res.json({ success: true, data: items, count: items.length });
    } catch (error) {
      logger.error('Get knowledge items error:', error);
      next(error);
    }
  }

  async getItemById(req, res, next) {
    try {
      const { id } = req.params;
      const item = await KnowledgeItem.findByPk(id, {
        include: [{ model: KnowledgeCategory, as: 'category', attributes: ['id', 'name', 'icon', 'color'] }]
      });
      if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

      // Increment view count
      await item.increment('view_count');

      res.json({ success: true, data: item });
    } catch (error) {
      logger.error('Get knowledge item error:', error);
      next(error);
    }
  }

  async createItem(req, res, next) {
    try {
      const data = { ...req.body, created_by: req.user.id };
      const item = await KnowledgeItem.create(data);
      logger.info(`Knowledge item created: ${item.title}`);
      res.status(201).json({ success: true, data: item, message: 'Item created successfully' });
    } catch (error) {
      logger.error('Create knowledge item error:', error);
      next(error);
    }
  }

  async updateItem(req, res, next) {
    try {
      const { id } = req.params;
      const item = await KnowledgeItem.findByPk(id);
      if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

      await item.update(req.body);
      logger.info(`Knowledge item updated: ${item.title}`);
      res.json({ success: true, data: item, message: 'Item updated successfully' });
    } catch (error) {
      logger.error('Update knowledge item error:', error);
      next(error);
    }
  }

  async deleteItem(req, res, next) {
    try {
      const { id } = req.params;
      const item = await KnowledgeItem.findByPk(id);
      if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

      await item.destroy();
      logger.info(`Knowledge item deleted: ${id}`);
      res.json({ success: true, message: 'Item deleted successfully' });
    } catch (error) {
      logger.error('Delete knowledge item error:', error);
      next(error);
    }
  }

  // Search across everything
  async search(req, res, next) {
    try {
      const { q } = req.query;
      if (!q) return res.json({ success: true, data: { categories: [], items: [] } });

      const [categories, items] = await Promise.all([
        KnowledgeCategory.findAll({
          where: {
            [Op.or]: [
              { name: { [Op.iLike]: `%${q}%` } },
              { description: { [Op.iLike]: `%${q}%` } }
            ]
          },
          limit: 10
        }),
        KnowledgeItem.findAll({
          where: {
            [Op.or]: [
              { title: { [Op.iLike]: `%${q}%` } },
              { content: { [Op.iLike]: `%${q}%` } }
            ]
          },
          include: [{ model: KnowledgeCategory, as: 'category', attributes: ['id', 'name', 'icon', 'color'] }],
          limit: 40
        })
      ]);

      res.json({ success: true, data: { categories, items } });
    } catch (error) {
      logger.error('Knowledge search error:', error);
      next(error);
    }
  }
}

export default new KnowledgeController();
