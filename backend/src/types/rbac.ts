export enum UserRole {
  USER = 'user',
  MENTOR = 'mentor',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

export enum Permission {
  // User permissions
  READ_OWN_PROFILE = 'read_own_profile',
  UPDATE_OWN_PROFILE = 'update_own_profile',
  
  // Marketplace permissions
  READ_MARKETPLACE = 'read_marketplace',
  CREATE_PRODUCT = 'create_product',
  UPDATE_OWN_PRODUCT = 'update_own_product',
  DELETE_OWN_PRODUCT = 'delete_own_product',
  
  // Mentor permissions
  READ_MENTORS = 'read_mentors',
  CREATE_MENTOR_PROFILE = 'create_mentor_profile',
  UPDATE_OWN_MENTOR_PROFILE = 'update_own_mentor_profile',
  BOOK_SESSION = 'book_session',
  
  // Community permissions
  READ_COMMUNITY = 'read_community',
  CREATE_POST = 'create_post',
  UPDATE_OWN_POST = 'update_own_post',
  DELETE_OWN_POST = 'delete_own_post',
  MODERATE_POSTS = 'moderate_posts',
  
  // Prototype permissions
  READ_PROTOTYPES = 'read_prototypes',
  CREATE_PROTOTYPE = 'create_prototype',
  UPDATE_OWN_PROTOTYPE = 'update_own_prototype',
  DELETE_OWN_PROTOTYPE = 'delete_own_prototype',
  SUBMIT_FEEDBACK = 'submit_feedback',
  
  // Admin permissions
  MANAGE_USERS = 'manage_users',
  MANAGE_ALL_PRODUCTS = 'manage_all_products',
  MANAGE_ALL_POSTS = 'manage_all_posts',
  MANAGE_ALL_PROTOTYPES = 'manage_all_prototypes',
  VIEW_AUDIT_LOGS = 'view_audit_logs',
  MANAGE_SYSTEM = 'manage_system'
}

export interface RolePermissions {
  [UserRole.USER]: Permission[];
  [UserRole.MENTOR]: Permission[];
  [UserRole.MODERATOR]: Permission[];
  [UserRole.ADMIN]: Permission[];
  [UserRole.SUPER_ADMIN]: Permission[];
}

export interface UserClaims {
  role: UserRole;
  permissions: Permission[];
  userId: string;
  email: string;
  isActive: boolean;
  createdAt: number;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: number;
  success: boolean;
  errorMessage?: string;
} 