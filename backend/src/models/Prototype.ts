import { getFirestore } from 'firebase-admin/firestore';
import { User } from './User';

export interface Prototype {
  id: string;
  creatorId: string;
  creator: User;
  name: string;
  description: string;
  category: string;
  tags: string[];
  status: 'draft' | 'published' | 'archived' | 'featured';
  visibility: 'public' | 'private' | 'unlisted';
  version: string;
  thumbnailUrl?: string;
  demoUrl?: string;
  sourceCodeUrl?: string;
  documentationUrl?: string;
  technologies: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // minutes
  requirements: string[];
  features: string[];
  screenshots: string[];
  videos: string[];
  files: PrototypeFile[];
  stats: PrototypeStats;
  metadata: PrototypeMetadata;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface PrototypeFile {
  id: string;
  name: string;
  type: 'image' | 'video' | 'document' | 'code' | 'other';
  url: string;
  size: number; // bytes
  mimeType: string;
  uploadedAt: Date;
}

export interface PrototypeStats {
  views: number;
  likes: number;
  downloads: number;
  shares: number;
  comments: number;
  averageRating: number;
  totalRatings: number;
  forks: number;
  collaborators: number;
}

export interface PrototypeMetadata {
  lastModified: Date;
  fileSize: number; // total size in bytes
  language: string;
  framework?: string;
  dependencies: string[];
  license: string;
  readme?: string;
}

export interface PrototypeFeedback {
  id: string;
  prototypeId: string;
  userId: string;
  user: User;
  rating: number; // 1-5
  comment: string;
  categories: {
    functionality: number;
    design: number;
    performance: number;
    documentation: number;
    originality: number;
  };
  isVerified: boolean;
  isHelpful: number; // count of helpful votes
  createdAt: Date;
  updatedAt: Date;
}

export interface PrototypeComment {
  id: string;
  prototypeId: string;
  userId: string;
  user: User;
  content: string;
  parentId?: string; // for replies
  likes: number;
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrototypeCollaborator {
  id: string;
  prototypeId: string;
  userId: string;
  user: User;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  permissions: string[];
  joinedAt: Date;
  invitedBy: string;
}

export interface PrototypeFork {
  id: string;
  originalPrototypeId: string;
  forkedPrototypeId: string;
  userId: string;
  user: User;
  reason?: string;
  createdAt: Date;
}

class PrototypeModel {
  private db = getFirestore();
  private collection = this.db.collection('prototypes');
  private feedbackCollection = this.db.collection('prototype_feedback');
  private commentsCollection = this.db.collection('prototype_comments');
  private collaboratorsCollection = this.db.collection('prototype_collaborators');
  private forksCollection = this.db.collection('prototype_forks');

  /**
   * Create a new prototype
   */
  async createPrototype(prototypeData: Omit<Prototype, 'id' | 'creator' | 'createdAt' | 'updatedAt' | 'stats' | 'metadata'> & { creator: User }): Promise<Prototype> {
    try {
      const now = new Date();
      const prototype: Prototype = {
        ...prototypeData,
        id: this.db.collection('dummy').doc().id,
        creator: prototypeData.creator,
        createdAt: now,
        updatedAt: now,
        status: 'draft',
        visibility: 'private',
        version: '1.0.0',
        stats: {
          views: 0,
          likes: 0,
          downloads: 0,
          shares: 0,
          comments: 0,
          averageRating: 0,
          totalRatings: 0,
          forks: 0,
          collaborators: 1
        },
        metadata: {
          lastModified: now,
          fileSize: 0,
          language: 'en',
          dependencies: [],
          license: 'MIT'
        }
      };

      await this.collection.doc(prototype.id).set(prototype);
      
      // Add creator as owner collaborator
      await this.addCollaborator(prototype.id, prototypeData.creatorId, 'owner', []);
      
      return prototype;
    } catch (error) {
      console.error('Error creating prototype:', error);
      throw new Error('Failed to create prototype');
    }
  }

  /**
   * Get prototype by ID
   */
  async getPrototypeById(id: string): Promise<Prototype | null> {
    try {
      const doc = await this.collection.doc(id).get();
      if (!doc.exists) {
        return null;
      }
      return doc.data() as Prototype;
    } catch (error) {
      console.error('Error fetching prototype:', error);
      throw new Error('Failed to fetch prototype');
    }
  }

  /**
   * Get prototypes by creator
   */
  async getPrototypesByCreator(creatorId: string, status?: string): Promise<Prototype[]> {
    try {
      let query = this.collection.where('creatorId', '==', creatorId);
      
      if (status) {
        query = query.where('status', '==', status);
      }

      const snapshot = await query.orderBy('createdAt', 'desc').get();
      return snapshot.docs.map(doc => doc.data() as Prototype);
    } catch (error) {
      console.error('Error fetching prototypes by creator:', error);
      throw new Error('Failed to fetch prototypes by creator');
    }
  }

  /**
   * Get public prototypes
   */
  async getPublicPrototypes(limit: number = 20, offset: number = 0, category?: string): Promise<Prototype[]> {
    try {
      let query = this.collection
        .where('status', '==', 'published')
        .where('visibility', '==', 'public');

      if (category) {
        query = query.where('category', '==', category);
      }

      const snapshot = await query
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset)
        .get();

      return snapshot.docs.map(doc => doc.data() as Prototype);
    } catch (error) {
      console.error('Error fetching public prototypes:', error);
      throw new Error('Failed to fetch public prototypes');
    }
  }

  /**
   * Search prototypes
   */
  async searchPrototypes(query: string, limit: number = 20): Promise<Prototype[]> {
    try {
      // Note: Firestore doesn't support full-text search natively
      // This is a simple search on name and description
      const snapshot = await this.collection
        .where('status', '==', 'published')
        .where('visibility', '==', 'public')
        .orderBy('name')
        .startAt(query)
        .endAt(query + '\uf8ff')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => doc.data() as Prototype);
    } catch (error) {
      console.error('Error searching prototypes:', error);
      throw new Error('Failed to search prototypes');
    }
  }

  /**
   * Update prototype
   */
  async updatePrototype(id: string, updates: Partial<Prototype>): Promise<Prototype> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date(),
        metadata: {
          ...updates.metadata,
          lastModified: new Date()
        }
      };

      await this.collection.doc(id).update(updateData);
      
      const updatedPrototype = await this.getPrototypeById(id);
      if (!updatedPrototype) {
        throw new Error('Prototype not found after update');
      }
      
      return updatedPrototype;
    } catch (error) {
      console.error('Error updating prototype:', error);
      throw new Error('Failed to update prototype');
    }
  }

  /**
   * Delete prototype
   */
  async deletePrototype(id: string): Promise<void> {
    try {
      await this.collection.doc(id).delete();
    } catch (error) {
      console.error('Error deleting prototype:', error);
      throw new Error('Failed to delete prototype');
    }
  }

  /**
   * Add feedback to prototype
   */
  async addFeedback(feedbackData: Omit<PrototypeFeedback, 'id' | 'user' | 'createdAt' | 'updatedAt'> & { user: User }): Promise<PrototypeFeedback> {
    try {
      const now = new Date();
      const feedback: PrototypeFeedback = {
        ...feedbackData,
        id: this.db.collection('dummy').doc().id,
        user: feedbackData.user,
        createdAt: now,
        updatedAt: now,
        isVerified: false,
        isHelpful: 0
      };

      await this.feedbackCollection.doc(feedback.id).set(feedback);
      
      // Update prototype stats
      await this.updatePrototypeStats(feedbackData.prototypeId);
      
      return feedback;
    } catch (error) {
      console.error('Error adding feedback:', error);
      throw new Error('Failed to add feedback');
    }
  }

  /**
   * Get prototype feedback
   */
  async getPrototypeFeedback(prototypeId: string, limit: number = 20): Promise<PrototypeFeedback[]> {
    try {
      const snapshot = await this.feedbackCollection
        .where('prototypeId', '==', prototypeId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => doc.data() as PrototypeFeedback);
    } catch (error) {
      console.error('Error fetching prototype feedback:', error);
      throw new Error('Failed to fetch prototype feedback');
    }
  }

  /**
   * Add comment to prototype
   */
  async addComment(commentData: Omit<PrototypeComment, 'id' | 'user' | 'createdAt' | 'updatedAt'> & { user: User }): Promise<PrototypeComment> {
    try {
      const now = new Date();
      const comment: PrototypeComment = {
        ...commentData,
        id: this.db.collection('dummy').doc().id,
        user: commentData.user,
        createdAt: now,
        updatedAt: now,
        likes: 0,
        isEdited: false
      };

      await this.commentsCollection.doc(comment.id).set(comment);
      
      // Update prototype stats
      await this.updatePrototypeStats(commentData.prototypeId);
      
      return comment;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw new Error('Failed to add comment');
    }
  }

  /**
   * Get prototype comments
   */
  async getPrototypeComments(prototypeId: string, limit: number = 50): Promise<PrototypeComment[]> {
    try {
      const snapshot = await this.commentsCollection
        .where('prototypeId', '==', prototypeId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => doc.data() as PrototypeComment);
    } catch (error) {
      console.error('Error fetching prototype comments:', error);
      throw new Error('Failed to fetch prototype comments');
    }
  }

  /**
   * Add collaborator to prototype
   */
  async addCollaborator(prototypeId: string, userId: string, role: string, permissions: string[]): Promise<PrototypeCollaborator> {
    try {
      const now = new Date();
      const collaborator: PrototypeCollaborator = {
        id: this.db.collection('dummy').doc().id,
        prototypeId,
        userId,
        user: {} as User, // Will be populated when needed
        role: role as any,
        permissions,
        joinedAt: now,
        invitedBy: userId
      };

      await this.collaboratorsCollection.doc(collaborator.id).set(collaborator);
      return collaborator;
    } catch (error) {
      console.error('Error adding collaborator:', error);
      throw new Error('Failed to add collaborator');
    }
  }

  /**
   * Get prototype collaborators
   */
  async getPrototypeCollaborators(prototypeId: string): Promise<PrototypeCollaborator[]> {
    try {
      const snapshot = await this.collaboratorsCollection
        .where('prototypeId', '==', prototypeId)
        .get();

      return snapshot.docs.map(doc => doc.data() as PrototypeCollaborator);
    } catch (error) {
      console.error('Error fetching prototype collaborators:', error);
      throw new Error('Failed to fetch prototype collaborators');
    }
  }

  /**
   * Fork a prototype
   */
  async forkPrototype(originalPrototypeId: string, userId: string, user: User, reason?: string): Promise<PrototypeFork> {
    try {
      const originalPrototype = await this.getPrototypeById(originalPrototypeId);
      if (!originalPrototype) {
        throw new Error('Original prototype not found');
      }

      // Create forked prototype
      const forkedPrototypeData = {
        ...originalPrototype,
        creatorId: userId,
        creator: user,
        name: `${originalPrototype.name} (Fork)`,
        status: 'draft' as const,
        visibility: 'private' as const,
        version: '1.0.0',
        stats: {
          views: 0,
          likes: 0,
          downloads: 0,
          shares: 0,
          comments: 0,
          averageRating: 0,
          totalRatings: 0,
          forks: 0,
          collaborators: 1
        }
      };

      const forkedPrototype = await this.createPrototype(forkedPrototypeData);

      // Create fork record
      const fork: PrototypeFork = {
        id: this.db.collection('dummy').doc().id,
        originalPrototypeId,
        forkedPrototypeId: forkedPrototype.id,
        userId,
        user,
        reason,
        createdAt: new Date()
      };

      await this.forksCollection.doc(fork.id).set(fork);
      
      // Update original prototype stats
      await this.updatePrototypeStats(originalPrototypeId);
      
      return fork;
    } catch (error) {
      console.error('Error forking prototype:', error);
      throw new Error('Failed to fork prototype');
    }
  }

  /**
   * Update prototype stats
   */
  async updatePrototypeStats(prototypeId: string): Promise<void> {
    try {
      const [feedbackSnapshot, commentsSnapshot, forksSnapshot] = await Promise.all([
        this.feedbackCollection.where('prototypeId', '==', prototypeId).get(),
        this.commentsCollection.where('prototypeId', '==', prototypeId).get(),
        this.forksCollection.where('originalPrototypeId', '==', prototypeId).get()
      ]);

      const totalRatings = feedbackSnapshot.size;
      const averageRating = totalRatings > 0 
        ? feedbackSnapshot.docs.reduce((sum, doc) => sum + (doc.data() as PrototypeFeedback).rating, 0) / totalRatings
        : 0;

      const stats: PrototypeStats = {
        views: 0, // This would be tracked separately
        likes: 0, // This would be tracked separately
        downloads: 0, // This would be tracked separately
        shares: 0, // This would be tracked separately
        comments: commentsSnapshot.size,
        averageRating,
        totalRatings,
        forks: forksSnapshot.size,
        collaborators: 0 // This would be calculated from collaborators collection
      };

      await this.updatePrototype(prototypeId, { stats });
    } catch (error) {
      console.error('Error updating prototype stats:', error);
      throw new Error('Failed to update prototype stats');
    }
  }

  /**
   * Increment prototype view count
   */
  async incrementViews(prototypeId: string): Promise<void> {
    try {
      const prototype = await this.getPrototypeById(prototypeId);
      if (!prototype) {
        throw new Error('Prototype not found');
      }

      const updatedStats = {
        ...prototype.stats,
        views: prototype.stats.views + 1
      };

      await this.updatePrototype(prototypeId, { stats: updatedStats });
    } catch (error) {
      console.error('Error incrementing prototype views:', error);
      throw new Error('Failed to increment prototype views');
    }
  }
}

export const prototypeModel = new PrototypeModel();
export default prototypeModel; 