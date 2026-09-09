export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
  VIEWER: 'viewer'
};

export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended'
};

export const BRANCH_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  CLOSED: 'closed'
};

export const VEHICLE_STATUS = {
  AVAILABLE: 'available',
  RESERVED: 'reserved',
  IN_SERVICE: 'in_service',
  SOLD: 'sold',
  MAINTENANCE: 'maintenance',
  OUT_OF_SERVICE: 'out_of_service'
};

export const VEHICLE_FUEL_TYPE = {
  PETROL: 'petrol',
  DIESEL: 'diesel',
  ELECTRIC: 'electric',
  HYBRID: 'hybrid',
  LPG: 'lpg',
  OTHER: 'other'
};

export const VEHICLE_TRANSMISSION = {
  MANUAL: 'manual',
  AUTOMATIC: 'automatic',
  CVT: 'cvt',
  SEMI_AUTOMATIC: 'semi-automatic'
};

export const APPOINTMENT_STATUS = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show'
};

export const APPOINTMENT_TYPE = {
  TEST_DRIVE: 'test_drive',
  SERVICE: 'service',
  CONSULTATION: 'consultation',
  DELIVERY: 'delivery',
  PICKUP: 'pickup',
  OTHER: 'other'
};

export const CONTACT_TYPE = {
  CUSTOMER: 'customer',
  SUPPLIER: 'supplier',
  PARTNER: 'partner',
  EMPLOYEE: 'employee',
  OTHER: 'other'
};

export const CONTACT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  BLACKLISTED: 'blacklisted'
};

export const PHONE_CALL_DIRECTION = {
  INBOUND: 'inbound',
  OUTBOUND: 'outbound'
};

export const PHONE_CALL_STATUS = {
  MISSED: 'missed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  VOICEMAIL: 'voicemail'
};

export const PHONE_CALL_PURPOSE = {
  INQUIRY: 'inquiry',
  APPOINTMENT: 'appointment',
  COMPLAINT: 'complaint',
  SUPPORT: 'support',
  SALES: 'sales',
  FOLLOW_UP: 'follow_up',
  OTHER: 'other'
};

export const HELPDESK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

export const HELPDESK_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  PENDING: 'pending',
  RESOLVED: 'resolved',
  CLOSED: 'closed'
};

export const HELPDESK_CATEGORY = {
  TECHNICAL: 'technical',
  BILLING: 'billing',
  GENERAL: 'general',
  FEATURE_REQUEST: 'feature_request',
  BUG_REPORT: 'bug_report',
  OTHER: 'other'
};

export const SETTING_CATEGORY = {
  GENERAL: 'general',
  BRANCH: 'branch',
  VEHICLE: 'vehicle',
  APPOINTMENT: 'appointment',
  CONTACT: 'contact',
  HELPDESK: 'helpdesk',
  SYSTEM: 'system',
  NOTIFICATION: 'notification'
};

export const SETTING_VALUE_TYPE = {
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  JSON: 'json',
  DATE: 'date'
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 40,
  MAX_LIMIT: 100
};

export const DEFAULT_SETTINGS = [
  {
    key: 'app_name',
    value: 'Car Branch Manager',
    value_type: 'string',
    category: 'general',
    description: 'Application name',
    is_public: true,
    is_editable: true
  },
  {
    key: 'app_timezone',
    value: 'UTC',
    value_type: 'string',
    category: 'general',
    description: 'Application timezone',
    is_public: true,
    is_editable: true
  },
  {
    key: 'date_format',
    value: 'YYYY-MM-DD',
    value_type: 'string',
    category: 'general',
    description: 'Default date format',
    is_public: true,
    is_editable: true
  },
  {
    key: 'time_format',
    value: 'HH:mm',
    value_type: 'string',
    category: 'general',
    description: 'Default time format',
    is_public: true,
    is_editable: true
  },
  {
    key: 'currency',
    value: 'USD',
    value_type: 'string',
    category: 'general',
    description: 'Default currency',
    is_public: true,
    is_editable: true
  },
  {
    key: 'language',
    value: 'en',
    value_type: 'string',
    category: 'general',
    description: 'Default language',
    is_public: true,
    is_editable: true
  },
  {
    key: 'items_per_page',
    value: '20',
    value_type: 'number',
    category: 'general',
    description: 'Number of items per page in lists',
    is_public: true,
    is_editable: true
  },
  {
    key: 'session_timeout',
    value: '30',
    value_type: 'number',
    category: 'system',
    description: 'Session timeout in minutes',
    is_public: false,
    is_editable: true
  },
  {
    key: 'max_upload_size',
    value: '5242880',
    value_type: 'number',
    category: 'system',
    description: 'Maximum file upload size in bytes',
    is_public: false,
    is_editable: true
  },
  {
    key: 'enable_notifications',
    value: 'true',
    value_type: 'boolean',
    category: 'notification',
    description: 'Enable system notifications',
    is_public: true,
    is_editable: true
  },
  {
    key: 'enable_email_notifications',
    value: 'true',
    value_type: 'boolean',
    category: 'notification',
    description: 'Enable email notifications',
    is_public: true,
    is_editable: true
  },
  {
    key: 'enable_sms_notifications',
    value: 'false',
    value_type: 'boolean',
    category: 'notification',
    description: 'Enable SMS notifications',
    is_public: true,
    is_editable: true
  }
];
