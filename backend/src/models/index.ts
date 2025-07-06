// Export all models
export * from './User';
export * from './Mentor';
export * from './Prototype';
export * from './Marketplace';

// Re-export model instances
export { userModel } from './User';
export { mentorModel } from './Mentor';
export { prototypeModel } from './Prototype';
export { marketplaceModel } from './Marketplace';

// Export common types
export type {
  User,
  UserProfile,
  UserPreferences,
  UserStats
} from './User';

export type {
  Mentor,
  MentorAvailability,
  MentorProfile,
  MentorStats,
  MentorSession,
  SessionFeedback,
  MentorReview
} from './Mentor';

export type {
  Prototype,
  PrototypeFile,
  PrototypeStats,
  PrototypeMetadata,
  PrototypeFeedback,
  PrototypeComment,
  PrototypeCollaborator,
  PrototypeFork
} from './Prototype';

export type {
  MarketplaceItem,
  MarketplaceFile,
  MarketplaceItemStats,
  MarketplaceItemMetadata,
  MarketplaceReview,
  MarketplaceOrder,
  MarketplaceCart,
  CartItem,
  MarketplaceWishlist
} from './Marketplace';

// Export enums
export { UserRole, UserPermission } from './User'; 