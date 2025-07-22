import { firestore } from '../config/firebaseAdmin';
import logger from '../services/loggerService';

export interface PrototypeFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: Date;
}

export interface PrototypeFeedback {
  id: string;
  prototypeId: string;
  userId: string;
  content: string;
  rating?: number; // 1-5 stars
  type: 'comment' | 'suggestion' | 'bug_report' | 'feature_request';
  status?: 'pending' | 'acknowledged' | 'resolved';
  createdAt: Date;
  updatedAt: Date;
}

export interface PrototypeVersion {
  id: string;
  version: string;
  description: string;
  files: PrototypeFile[];
  changelog?: string;
  createdAt: Date;
}

export interface Prototype {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: 'web_app' | 'mobile_app' | 'ai_model' | 'api' | 'tool' | 'game' | 'other';
  subcategory?: string;
  tags: string[];
  status: 'draft' | 'published' | 'archived' | 'under_review';
  visibility: 'public' | 'private' | 'unlisted';
  version: string;
  versions: PrototypeVersion[];
  currentVersionId: string;
  thumbnailUrl?: string;
  files: PrototypeFile[];
  images: PrototypeFile[];
  demoUrl?: string;
  repositoryUrl?: string;
  documentationUrl?: string;
  techStack: string[];
  requirements: {
    system?: string[];
    software?: string[];
    hardware?: string[];
  };
  features: string[];
  roadmap?: {
    id: string;
    title: string;
    description: string;
    status: 'planned' | 'in_progress' | 'completed';
    priority: 'low' | 'medium' | 'high';
    estimatedCompletion?: Date;
  }[];
  license: 'mit' | 'apache' | 'gpl' | 'proprietary' | 'other';
  licenseDetails?: string;
  allowComments: boolean;
  allowDuplication: boolean;
  allowCollaboration: boolean;
  collaborators?: {
    userId: string;
    role: 'viewer' | 'contributor' | 'maintainer';
    permissions: string[];
    addedAt: Date;
  }[];
  stats: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    downloads: number;
    forks: number;
    stars: number;
  };
  metadata: {
    aiGenerated?: boolean;
    aiModel?: string;
    complexity: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    estimatedTime?: string; // e.g., "2 hours", "1 week"
    difficulty: number; // 1-10 scale
  };
  originalPrototypeId?: string; // If this is a fork/duplicate
  parentPrototypeId?: string; // If this is a version of another prototype
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  archivedAt?: Date;
}

export interface PrototypeLike {
  id: string;
  prototypeId: string;
  userId: string;
  createdAt: Date;
}

export interface PrototypeShare {
  id: string;
  prototypeId: string;
  userId?: string;
  platform: string;
  ipAddress?: string;
  createdAt: Date;
}

export interface PrototypeDownload {
  id: string;
  prototypeId: string;
  userId?: string;
  fileId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export class PrototypeModel {
  private static collection = 'prototypes';
  private static feedbackCollection = 'prototypeFeedback';
  private static likesCollection = 'prototypeLikes';
  private static sharesCollection = 'prototypeShares';
  private static downloadsCollection = 'prototypeDownloads';

  /**
   * Create a new prototype
   */
  static async createPrototype(prototypeData: Omit<Prototype, 'id' | 'createdAt' | 'updatedAt'>): Promise<Prototype> {
    try {
      const now = new Date();
      const prototypeDoc = {
        ...prototypeData,
        createdAt: now,
        updatedAt: now
      };

      const docRef = await firestore.collection(this.collection).add(prototypeDoc);
      
      const prototype: Prototype = {
        id: docRef.id,
        ...prototypeDoc
      };

      logger.info(`Prototype created: ${prototype.id}`);
      return prototype;
    } catch (error) {
      logger.error('Error creating prototype:', error);
      throw new Error('Failed to create prototype');
    }
  }

  /**
   * Get prototype by ID
   */
  static async getPrototypeById(prototypeId: string): Promise<Prototype | null> {
    try {
      const prototypeDoc = await firestore.collection(this.collection).doc(prototypeId).get();
      
      if (!prototypeDoc.exists) {
        return null;
      }

      return {
        id: prototypeDoc.id,
        ...prototypeDoc.data()
      } as Prototype;
    } catch (error) {
      logger.error(`Error getting prototype ${prototypeId}:`, error);
      return null;
    }
  }

  /**
   * Update prototype
   */
  static async updatePrototype(prototypeId: string, updates: Partial<Prototype>): Promise<Prototype | null> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      await firestore.collection(this.collection).doc(prototypeId).update(updateData);
      
      return await this.getPrototypeById(prototypeId);
    } catch (error) {
      logger.error(`Error updating prototype ${prototypeId}:`, error);
      throw new Error('Failed to update prototype');
    }
  }

  /**
   * Delete prototype
   */
  static async deletePrototype(prototypeId: string): Promise<void> {
    try {
      await firestore.collection(this.collection).doc(prototypeId).delete();
      
      // Delete related data
      await this.deletePrototypeRelatedData(prototypeId);

      logger.info(`Prototype deleted: ${prototypeId}`);
    } catch (error) {
      logger.error(`Error deleting prototype ${prototypeId}:`, error);
      throw new Error('Failed to delete prototype');
    }
  }

  /**
   * Get prototypes with pagination and filters
   */
  static async getPrototypes(
    limit: number = 20,
    offset: number = 0,
    filters: {
      userId?: string;
      category?: string;
      status?: Prototype['status'];
      visibility?: Prototype['visibility'];
      tags?: string[];
      searchQuery?: string;
      sortBy?: 'createdAt' | 'updatedAt' | 'views' | 'likes' | 'title';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{ prototypes: Prototype[]; total: number }> {
    try {
      let query = firestore.collection(this.collection);

      // Apply filters
      if (filters.userId) {
        query = query.where('userId', '==', filters.userId);
      }

      if (filters.category) {
        query = query.where('category', '==', filters.category);
      }

      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      if (filters.visibility) {
        query = query.where('visibility', '==', filters.visibility);
      }

      if (filters.tags && filters.tags.length > 0) {
        query = query.where('tags', 'array-contains-any', filters.tags);
      }

      // Apply sorting
      const sortBy = filters.sortBy || 'createdAt';
      const sortOrder = filters.sortOrder || 'desc';
      
      if (sortBy.startsWith('stats.')) {
        query = query.orderBy(sortBy, sortOrder);
      } else {
        query = query.orderBy(sortBy, sortOrder);
      }

      // Apply pagination
      const snapshot = await query.limit(limit).offset(offset).get();

      const prototypes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Prototype[];

      // Get total count
      const totalSnapshot = await query.count().get();
      const total = totalSnapshot.data().count;

      // Apply search filter if provided (client-side filtering for simplicity)
      let filteredPrototypes = prototypes;
      if (filters.searchQuery) {
        const searchLower = filters.searchQuery.toLowerCase();
        filteredPrototypes = prototypes.filter(prototype =>
          prototype.title.toLowerCase().includes(searchLower) ||
          prototype.description.toLowerCase().includes(searchLower) ||
          prototype.tags.some(tag => tag.toLowerCase().includes(searchLower))
        );
      }

      return { prototypes: filteredPrototypes, total };
    } catch (error) {
      logger.error('Error getting prototypes:', error);
      throw new Error('Failed to get prototypes');
    }
  }

  /**
   * Add feedback to prototype
   */
  static async addFeedback(feedbackData: Omit<PrototypeFeedback, 'id' | 'createdAt' | 'updatedAt'>): Promise<PrototypeFeedback> {
    try {
      const now = new Date();
      const feedback = {
        ...feedbackData,
        createdAt: now,
        updatedAt: now
      };

      const docRef = await firestore.collection(this.feedbackCollection).add(feedback);
      
      // Update prototype stats
      await this.updatePrototypeStats(feedbackData.prototypeId, { comments: 1 });

      return {
        id: docRef.id,
        ...feedback
      };
    } catch (error) {
      logger.error('Error adding feedback:', error);
      throw new Error('Failed to add feedback');
    }
  }

  /**
   * Get prototype feedback
   */
  static async getPrototypeFeedback(
    prototypeId: string,
    limit: number = 20,
    offset: number = 0,
    type?: PrototypeFeedback['type']
  ): Promise<PrototypeFeedback[]> {
    try {
      let query = firestore.collection(this.feedbackCollection)
        .where('prototypeId', '==', prototypeId);

      if (type) {
        query = query.where('type', '==', type);
      }

      const snapshot = await query
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PrototypeFeedback[];
    } catch (error) {
      logger.error(`Error getting feedback for prototype ${prototypeId}:`, error);
      return [];
    }
  }

  /**
   * Like prototype
   */
  static async likePrototype(prototypeId: string, userId: string): Promise<void> {
    try {
      // Check if already liked
      const existingLike = await firestore
        .collection(this.likesCollection)
        .where('prototypeId', '==', prototypeId)
        .where('userId', '==', userId)
        .limit(1)
        .get();

      if (!existingLike.empty) {
        throw new Error('Prototype already liked by user');
      }

      // Add like
      await firestore.collection(this.likesCollection).add({
        prototypeId,
        userId,
        createdAt: new Date()
      });

      // Update prototype stats
      await this.updatePrototypeStats(prototypeId, { likes: 1 });
    } catch (error) {
      logger.error('Error liking prototype:', error);
      throw error;
    }
  }

  /**
   * Unlike prototype
   */
  static async unlikePrototype(prototypeId: string, userId: string): Promise<void> {
    try {
      // Find and delete like
      const likeSnapshot = await firestore
        .collection(this.likesCollection)
        .where('prototypeId', '==', prototypeId)
        .where('userId', '==', userId)
        .limit(1)
        .get();

      if (likeSnapshot.empty) {
        throw new Error('Prototype not liked by user');
      }

      await likeSnapshot.docs[0].ref.delete();

      // Update prototype stats
      await this.updatePrototypeStats(prototypeId, { likes: -1 });
    } catch (error) {
      logger.error('Error unliking prototype:', error);
      throw error;
    }
  }

  /**
   * Share prototype
   */
  static async sharePrototype(
    prototypeId: string,
    platform: string,
    userId?: string,
    ipAddress?: string
  ): Promise<void> {
    try {
      await firestore.collection(this.sharesCollection).add({
        prototypeId,
        userId,
        platform,
        ipAddress,
        createdAt: new Date()
      });

      // Update prototype stats
      await this.updatePrototypeStats(prototypeId, { shares: 1 });
    } catch (error) {
      logger.error('Error sharing prototype:', error);
      throw error;
    }
  }

  /**
   * Download prototype
   */
  static async downloadPrototype(
    prototypeId: string,
    fileId?: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await firestore.collection(this.downloadsCollection).add({
        prototypeId,
        userId,
        fileId,
        ipAddress,
        userAgent,
        createdAt: new Date()
      });

      // Update prototype stats
      await this.updatePrototypeStats(prototypeId, { downloads: 1 });
    } catch (error) {
      logger.error('Error downloading prototype:', error);
      throw error;
    }
  }

  /**
   * Increment view count
   */
  static async incrementViewCount(prototypeId: string): Promise<void> {
    try {
      await this.updatePrototypeStats(prototypeId, { views: 1 });
    } catch (error) {
      logger.error('Error incrementing view count:', error);
      throw error;
    }
  }

  /**
   * Fork prototype
   */
  static async forkPrototype(
    originalPrototypeId: string,
    userId: string,
    title?: string
  ): Promise<Prototype> {
    try {
      const originalPrototype = await this.getPrototypeById(originalPrototypeId);
      
      if (!originalPrototype) {
        throw new Error('Original prototype not found');
      }

      if (!originalPrototype.allowDuplication) {
        throw new Error('Prototype duplication not allowed');
      }

      // Create forked prototype
      const forkedPrototype = await this.createPrototype({
        ...originalPrototype,
        userId,
        title: title || `Fork of ${originalPrototype.title}`,
        status: 'draft',
        visibility: 'private',
        originalPrototypeId,
        stats: {
          views: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          downloads: 0,
          forks: 0,
          stars: 0
        }
      });

      // Update original prototype fork count
      await this.updatePrototypeStats(originalPrototypeId, { forks: 1 });

      return forkedPrototype;
    } catch (error) {
      logger.error('Error forking prototype:', error);
      throw error;
    }
  }

  /**
   * Add collaborator
   */
  static async addCollaborator(
    prototypeId: string,
    userId: string,
    role: 'viewer' | 'contributor' | 'maintainer',
    permissions: string[]
  ): Promise<void> {
    try {
      const prototype = await this.getPrototypeById(prototypeId);
      
      if (!prototype) {
        throw new Error('Prototype not found');
      }

      const collaborators = prototype.collaborators || [];
      
      // Check if user is already a collaborator
      const existingCollaborator = collaborators.find(c => c.userId === userId);
      if (existingCollaborator) {
        throw new Error('User is already a collaborator');
      }

      // Add collaborator
      collaborators.push({
        userId,
        role,
        permissions,
        addedAt: new Date()
      });

      await this.updatePrototype(prototypeId, { collaborators });
    } catch (error) {
      logger.error('Error adding collaborator:', error);
      throw error;
    }
  }

  /**
   * Remove collaborator
   */
  static async removeCollaborator(prototypeId: string, userId: string): Promise<void> {
    try {
      const prototype = await this.getPrototypeById(prototypeId);
      
      if (!prototype) {
        throw new Error('Prototype not found');
      }

      const collaborators = (prototype.collaborators || []).filter(c => c.userId !== userId);
      
      await this.updatePrototype(prototypeId, { collaborators });
    } catch (error) {
      logger.error('Error removing collaborator:', error);
      throw error;
    }
  }

  /**
   * Create new version
   */
  static async createVersion(
    prototypeId: string,
    version: string,
    description: string,
    files: PrototypeFile[],
    changelog?: string
  ): Promise<void> {
    try {
      const prototype = await this.getPrototypeById(prototypeId);
      
      if (!prototype) {
        throw new Error('Prototype not found');
      }

      const newVersion: PrototypeVersion = {
        id: firestore.collection('temp').doc().id,
        version,
        description,
        files,
        changelog,
        createdAt: new Date()
      };

      const versions = [...prototype.versions, newVersion];
      
      await this.updatePrototype(prototypeId, {
        version,
        versions,
        currentVersionId: newVersion.id,
        files
      });
    } catch (error) {
      logger.error('Error creating version:', error);
      throw error;
    }
  }

  /**
   * Get popular prototypes
   */
  static async getPopularPrototypes(
    limit: number = 10,
    timeframe: 'day' | 'week' | 'month' | 'all' = 'week'
  ): Promise<Prototype[]> {
    try {
      let query = firestore.collection(this.collection)
        .where('status', '==', 'published')
        .where('visibility', '==', 'public');

      // Filter by timeframe if not 'all'
      if (timeframe !== 'all') {
        const now = new Date();
        let startDate: Date;
        
        switch (timeframe) {
          case 'day':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(0);
        }
        
        query = query.where('publishedAt', '>=', startDate);
      }

      const snapshot = await query
        .orderBy('stats.likes', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Prototype[];
    } catch (error) {
      logger.error('Error getting popular prototypes:', error);
      return [];
    }
  }

  /**
   * Get trending prototypes
   */
  static async getTrendingPrototypes(limit: number = 10): Promise<Prototype[]> {
    try {
      // This is a simplified trending algorithm
      // In production, you might want to use a more sophisticated scoring system
      const snapshot = await firestore.collection(this.collection)
        .where('status', '==', 'published')
        .where('visibility', '==', 'public')
        .orderBy('stats.views', 'desc')
        .limit(limit * 2) // Get more to filter by recent activity
        .get();

      const prototypes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Prototype[];

      // Sort by a combination of views, likes, and recency
      const trendingPrototypes = prototypes
        .map(prototype => {
          const daysSincePublished = prototype.publishedAt 
            ? (Date.now() - prototype.publishedAt.getTime()) / (1000 * 60 * 60 * 24)
            : 999;
          
          const trendingScore = 
            (prototype.stats.views * 0.3) +
            (prototype.stats.likes * 0.4) +
            (prototype.stats.comments * 0.2) +
            (prototype.stats.shares * 0.1) -
            (daysSincePublished * 0.1); // Penalize older prototypes
          
          return { ...prototype, trendingScore };
        })
        .sort((a, b) => b.trendingScore - a.trendingScore)
        .slice(0, limit);

      return trendingPrototypes;
    } catch (error) {
      logger.error('Error getting trending prototypes:', error);
      return [];
    }
  }

  /**
   * Update prototype stats
   */
  private static async updatePrototypeStats(
    prototypeId: string,
    statUpdates: Partial<Prototype['stats']>
  ): Promise<void> {
    try {
      const updates: any = { updatedAt: new Date() };
      
      Object.entries(statUpdates).forEach(([key, value]) => {
        if (typeof value === 'number') {
          updates[`stats.${key}`] = firestore.FieldValue.increment(value);
        }
      });

      await firestore.collection(this.collection).doc(prototypeId).update(updates);
    } catch (error) {
      logger.error(`Error updating prototype stats ${prototypeId}:`, error);
      throw error;
    }
  }

  /**
   * Delete prototype related data
   */
  private static async deletePrototypeRelatedData(prototypeId: string): Promise<void> {
    try {
      const batch = firestore.batch();

      // Delete feedback
      const feedbackSnapshot = await firestore
        .collection(this.feedbackCollection)
        .where('prototypeId', '==', prototypeId)
        .get();
      
      feedbackSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Delete likes
      const likesSnapshot = await firestore
        .collection(this.likesCollection)
        .where('prototypeId', '==', prototypeId)
        .get();
      
      likesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Delete shares
      const sharesSnapshot = await firestore
        .collection(this.sharesCollection)
        .where('prototypeId', '==', prototypeId)
        .get();
      
      sharesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Delete downloads
      const downloadsSnapshot = await firestore
        .collection(this.downloadsCollection)
        .where('prototypeId', '==', prototypeId)
        .get();
      
      downloadsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
    } catch (error) {
      logger.error(`Error deleting related data for prototype ${prototypeId}:`, error);
    }
  }

  /**
   * Get prototype statistics
   */
  static async getPrototypeStatistics(): Promise<{
    totalPrototypes: number;
    publishedPrototypes: number;
    draftPrototypes: number;
    prototypesByCategory: Record<string, number>;
    totalViews: number;
    totalLikes: number;
    totalDownloads: number;
  }> {
    try {
      // Get total prototypes
      const totalSnapshot = await firestore.collection(this.collection).count().get();
      
      // Get published prototypes
      const publishedSnapshot = await firestore
        .collection(this.collection)
        .where('status', '==', 'published')
        .count()
        .get();
      
      // Get draft prototypes
      const draftSnapshot = await firestore
        .collection(this.collection)
        .where('status', '==', 'draft')
        .count()
        .get();

      // Get all prototypes for aggregation
      const allPrototypesSnapshot = await firestore.collection(this.collection).get();
      const prototypes = allPrototypesSnapshot.docs.map(doc => doc.data() as Prototype);

      // Calculate aggregated stats
      const prototypesByCategory: Record<string, number> = {};
      let totalViews = 0;
      let totalLikes = 0;
      let totalDownloads = 0;

      prototypes.forEach(prototype => {
        // Count by category
        prototypesByCategory[prototype.category] = (prototypesByCategory[prototype.category] || 0) + 1;
        
        // Sum stats
        totalViews += prototype.stats.views || 0;
        totalLikes += prototype.stats.likes || 0;
        totalDownloads += prototype.stats.downloads || 0;
      });

      return {
        totalPrototypes: totalSnapshot.data().count,
        publishedPrototypes: publishedSnapshot.data().count,
        draftPrototypes: draftSnapshot.data().count,
        prototypesByCategory,
        totalViews,
        totalLikes,
        totalDownloads
      };
    } catch (error) {
      logger.error('Error getting prototype statistics:', error);
      throw new Error('Failed to get prototype statistics');
    }
  }
}

export const prototypeModel = PrototypeModel;
export default PrototypeModel;