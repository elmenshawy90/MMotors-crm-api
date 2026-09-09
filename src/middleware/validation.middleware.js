export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const validateId = (req, res, next) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'ID parameter is required'
    });
  }
  
  // Check if it's a valid UUID format (basic check)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }
  
  next();
};

export const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 40;
  const offset = (page - 1) * limit;
  
  if (page < 1) {
    return res.status(400).json({
      success: false,
      message: 'Page must be greater than 0'
    });
  }
  
  if (limit < 1 || limit > 100) {
    return res.status(400).json({
      success: false,
      message: 'Limit must be between 1 and 100'
    });
  }
  
  req.pagination = {
    page,
    limit,
    offset
  };
  
  next();
};

export const validateSort = (req, res, next, allowedFields = []) => {
  const sortBy = req.query.sort_by || 'created_at';
  const sortOrder = req.query.sort_order || 'DESC';
  
  if (allowedFields.length > 0 && !allowedFields.includes(sortBy)) {
    return res.status(400).json({
      success: false,
      message: `Invalid sort field. Allowed fields: ${allowedFields.join(', ')}`
    });
  }
  
  if (!['ASC', 'DESC'].includes(sortOrder.toUpperCase())) {
    return res.status(400).json({
      success: false,
      message: 'Sort order must be ASC or DESC'
    });
  }
  
  req.sort = {
    field: sortBy,
    order: sortOrder.toUpperCase()
  };
  
  next();
};
