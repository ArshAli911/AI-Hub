import { firestore } from '../config/firebaseAdmin';
import logger from '../services/loggerService';

export interface PostFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: Date;
}

export interface Post {
  id: string;
  userId: string;
  title: string;
  content: string;
  category: string;
  subcategory?: string;
  tags: string[];
  type: 'discussion' | 'question' | 'announcement' | 'tutorial' | 'showcase' | 'help';
  status: 'published' | 'draft' | 'archived' | 'deleted' | 'flagged';
  visibility: 'public' | 'private' | 'members_only';
  pinned: boolean;
  locked: boolean;
  featured: boolean;
  allowComments: boolean;
  images: PostFile[];
  files: PostFile[];
  poll?: {
    question: string;
    options: {
      id: string;
      text: string;
      votes: number;
      voters: string[];
    }[];
    allowMultiple: boolean;
    expiresAt?: Date;
  };
  stats: {
    views: number;
    likes: number;
    dislikes: number;
    comments: number;
    shares: number;
    bookmarks: number;
  };
  metadata: {
    editHistory?: {
      editedAt: Date;
      editedBy: string;
      reason?: string;
    }[];
    moderationHistory?: {
      action: 'approved' | 'flagged' | 'removed' | 'locked' | 'unlocked';
      moderatorId: string;
      reason?: string;
      timestamp: Date;
    }[];
    lastActivity: Date;
    lastCommentAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  archivedAt?: Date;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  parentCommentId?: string; // For nested comments
  level: number; // Nesting level (0 = top level, 1 = reply, etc.)
  status: 'published' | 'deleted' | 'flagged' | 'hidden';
  images?: PostFile[];
  mentions?: string[]; // User IDs mentioned in the comment
  stats: {
    likes: number;
    dislikes: number;
    replies: number;
  };
  metadata: {
    editHistory?: {
      editedAt: Date;
      reason?: string;
    }[];
    moderationHistory?: {
      action: 'approved' | 'flagged' | 'removed' | 'hidden';
      moderatorId: string;
      reason?: string;
      timestamp: Date;
    }[];
    ipAddress?: string;
    userAgent?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface PostLike {
  id: string;
  postId: string;
  userId: string;
  type: 'like' | 'dislike';
  createdAt: Date;
}

export interface CommentLike {
  id: string;
  commentId: string;
  userId: string;
  type: 'like' | 'dislike';
  createdAt: Date;
}

export interface PostBookmark {
  id: string;
  postId: string;
  userId: string;
  createdAt: Date;
}

export interface PostShare {
  id: string;
  postId: string;
  userId?: string;
  platform: string;
  ipAddress?: string;
  createdAt: Date;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  slug: string;
  color: string;
  icon?: string;
  parentCategoryId?: string;
  subcategories?: Category[];
  rules?: string[];
  moderators: string[]; // User IDs
  stats: {
    postsCount: number;
    commentsCount: number;
    membersCount: number;
  };
  settings: {
    requireApproval: boolean;
    allowAnonymous: boolean;
    allowPolls: boolean;
    allowFiles: boolean;
    maxFileSize: number;
    allowedFileTypes: string[];
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  count: number; // Number of posts with this tag
  trending: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Report {
  id: string;
  reporterId: string;
  targetType: 'post' | 'comment' | 'user';
  targetId: string;
  reason: 'spam' | 'harassment' | 'inappropriate_content' | 'misinformation' | 'copyright' | 'other';
  description: string;
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string; // Moderator ID
  resolution?: {
    action: 'no_action' | 'warning' | 'content_removed' | 'user_suspended' | 'user_banned';
    reason: string;
    resolvedBy: string;
    resolvedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class CommunityModel {
  private static postsCollection = 'posts';
  private static commentsCollection = 'comments';
  private static postLikesCollection = 'postLikes';
  private static commentLikesCollection = 'commentLikes';
  private static bookmarksCollection = 'postBookmarks';
  private static sharesCollection = 'postShares';
  private static categoriesCollection = 'categories';
  private static tagsCollection = 'tags';
  private static reportsCollection = 'reports';

  /**
   * Create a new post
   */
  static async createPost(postData: Omit<Post, 'id' | 'createdAt' | 'updatedAt'>): Promise<Post> {
    try {
      const now = new Date();
      const post = {
        ...postData,
        metadata: {
          ...postData.metadata,
          lastActivity: now
        },
        createdAt: now,
        updatedAt: now
      };

      const docRef = await firestore.collection(this.postsCollection).add(post);
      
      // Update category stats
      if (postData.category) {
        await this.updateCategoryStats(postData.category, { postsCount: 1 });
      }

      // Update tag counts
      if (postData.tags && postData.tags.length > 0) {
        await this.updateTagCounts(postData.tags, 1);
      }

      const createdPost: Post = {
        id: docRef.id,
        ...post
      };

      logger.info(`Post created: ${createdPost.id}`);
      return createdPost;
    } catch (error) {
      logger.error('Error creating post:', error);
      throw new Error('Failed to create post');
    }
  }

  /**
   * Get post by ID
   */
  static async getPostById(postId: string): Promise<Post | null> {
    try {
      const postDoc = await firestore.collection(this.postsCollection).doc(postId).get();
      
      if (!postDoc.exists) {
        return null;
      }

      return {
        id: postDoc.id,
        ...postDoc.data()
      } as Post;
    } catch (error) {
      logger.error(`Error getting post ${postId}:`, error);
      return null;
    }
  }

  /**
   * Update post
   */
  static async updatePost(postId: string, updates: Partial<Post>): Promise<Post | null> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      await firestore.collection(this.postsCollection).doc(postId).update(updateData);
      
      return await this.getPostById(postId);
    } catch (error) {
      logger.error(`Error updating post ${postId}:`, error);
      throw new Error('Failed to update post');
    }
  }

  /**
   * Delete post
   */
  static async deletePost(postId: string): Promise<void> {
    try {
      const post = await this.getPostById(postId);
      
      if (!post) {
        throw new Error('Post not found');
      }

      await firestore.collection(this.postsCollection).doc(postId).delete();
      
      // Delete related data
      await this.deletePostRelatedData(postId);

      // Update category stats
      if (post.category) {
        await this.updateCategoryStats(post.category, { postsCount: -1 });
      }

      // Update tag counts
      if (post.tags && post.tags.length > 0) {
        await this.updateTagCounts(post.tags, -1);
      }

      logger.info(`Post deleted: ${postId}`);
    } catch (error) {
      logger.error(`Error deleting post ${postId}:`, error);
      throw new Error('Failed to delete post');
    }
  }

  /**
   * Get posts with pagination and filters
   */
  static async getPosts(
    limit: number = 20,
    offset: number = 0,
    filters: {
      userId?: string;
      category?: string;
      tags?: string[];
      type?: Post['type'];
      status?: Post['status'];
      pinned?: boolean;
      featured?: boolean;
      searchQuery?: string;
      sortBy?: 'createdAt' | 'updatedAt' | 'views' | 'likes' | 'lastActivity';
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{ posts: Post[]; total: number }> {
    try {
      let query = firestore.collection(this.postsCollection);

      // Apply filters
      if (filters.userId) {
        query = query.where('userId', '==', filters.userId);
      }

      if (filters.category) {
        query = query.where('category', '==', filters.category);
      }

      if (filters.type) {
        query = query.where('type', '==', filters.type);
      }

      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      if (filters.pinned !== undefined) {
        query = query.where('pinned', '==', filters.pinned);
      }

      if (filters.featured !== undefined) {
        query = query.where('featured', '==', filters.featured);
      }

      if (filters.tags && filters.tags.length > 0) {
        query = query.where('tags', 'array-contains-any', filters.tags);
      }

      // Apply sorting
      const sortBy = filters.sortBy || 'createdAt';
      const sortOrder = filters.sortOrder || 'desc';
      
      if (sortBy.startsWith('stats.') || sortBy.startsWith('metadata.')) {
        query = query.orderBy(sortBy, sortOrder);
      } else {
        query = query.orderBy(sortBy, sortOrder);
      }

      // Apply pagination
      const snapshot = await query.limit(limit).offset(offset).get();

      const posts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];

      // Get total count
      const totalSnapshot = await query.count().get();
      const total = totalSnapshot.data().count;

      // Apply search filter if provided
      let filteredPosts = posts;
      if (filters.searchQuery) {
        const searchLower = filters.searchQuery.toLowerCase();
        filteredPosts = posts.filter(post =>
          post.title.toLowerCase().includes(searchLower) ||
          post.content.toLowerCase().includes(searchLower) ||
          post.tags.some(tag => tag.toLowerCase().includes(searchLower))
        );
      }

      return { posts: filteredPosts, total };
    } catch (error) {
      logger.error('Error getting posts:', error);
      throw new Error('Failed to get posts');
    }
  }

  /**
   * Create comment
   */
  static async createComment(commentData: Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Comment> {
    try {
      const now = new Date();
      const comment = {
        ...commentData,
        createdAt: now,
        updatedAt: now
      };

      const docRef = await firestore.collection(this.commentsCollection).add(comment);
      
      // Update post stats
      await this.updatePostStats(commentData.postId, { comments: 1 });
      
      // Update post last activity
      await this.updatePost(commentData.postId, {
        metadata: {
          lastActivity: now,
          lastCommentAt: now
        }
      });

      // Update parent comment reply count if this is a reply
      if (commentData.parentCommentId) {
        await this.updateCommentStats(commentData.parentCommentId, { replies: 1 });
      }

      const createdComment: Comment = {
        id: docRef.id,
        ...comment
      };

      logger.info(`Comment created: ${createdComment.id}`);
      return createdComment;
    } catch (error) {
      logger.error('Error creating comment:', error);
      throw new Error('Failed to create comment');
    }
  }

  /**
   * Get comments for a post
   */
  static async getPostComments(
    postId: string,
    limit: number = 20,
    offset: number = 0,
    parentCommentId?: string
  ): Promise<Comment[]> {
    try {
      let query = firestore.collection(this.commentsCollection)
        .where('postId', '==', postId)
        .where('status', '==', 'published');

      if (parentCommentId) {
        query = query.where('parentCommentId', '==', parentCommentId);
      } else {
        query = query.where('parentCommentId', '==', null);
      }

      const snapshot = await query
        .orderBy('createdAt', 'asc')
        .limit(limit)
        .offset(offset)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
    } catch (error) {
      logger.error(`Error getting comments for post ${postId}:`, error);
      return [];
    }
  }

  /**
   * Like/Unlike post
   */
  static async togglePostLike(postId: string, userId: string, type: 'like' | 'dislike'): Promise<boolean> {
    try {
      // Check if already liked/disliked
      const existingLike = await firestore
        .collection(this.postLikesCollection)
        .where('postId', '==', postId)
        .where('userId', '==', userId)
        .limit(1)
        .get();

      if (!existingLike.empty) {
        const existingLikeData = existingLike.docs[0].data() as PostLike;
        
        if (existingLikeData.type === type) {
          // Remove like/dislike
          await existingLike.docs[0].ref.delete();
          await this.updatePostStats(postId, { [type + 's']: -1 });
          return false; // Removed
        } else {
          // Change like to dislike or vice versa
          await existingLike.docs[0].ref.update({ type, createdAt: new Date() });
          await this.updatePostStats(postId, { 
            [existingLikeData.type + 's']: -1,
            [type + 's']: 1
          });
          return true; // Changed
        }
      } else {
        // Add new like/dislike
        await firestore.collection(this.postLikesCollection).add({
          postId,
          userId,
          type,
          createdAt: new Date()
        });
        
        await this.updatePostStats(postId, { [type + 's']: 1 });
        return true; // Added
      }
    } catch (error) {
      logger.error('Error toggling post like:', error);
      throw error;
    }
  }

  /**
   * Like/Unlike comment
   */
  static async toggleCommentLike(commentId: string, userId: string, type: 'like' | 'dislike'): Promise<boolean> {
    try {
      // Check if already liked/disliked
      const existingLike = await firestore
        .collection(this.commentLikesCollection)
        .where('commentId', '==', commentId)
        .where('userId', '==', userId)
        .limit(1)
        .get();

      if (!existingLike.empty) {
        const existingLikeData = existingLike.docs[0].data() as CommentLike;
        
        if (existingLikeData.type === type) {
          // Remove like/dislike
          await existingLike.docs[0].ref.delete();
          await this.updateCommentStats(commentId, { [type + 's']: -1 });
          return false; // Removed
        } else {
          // Change like to dislike or vice versa
          await existingLike.docs[0].ref.update({ type, createdAt: new Date() });
          await this.updateCommentStats(commentId, { 
            [existingLikeData.type + 's']: -1,
            [type + 's']: 1
          });
          return true; // Changed
        }
      } else {
        // Add new like/dislike
        await firestore.collection(this.commentLikesCollection).add({
          commentId,
          userId,
          type,
          createdAt: new Date()
        });
        
        await this.updateCommentStats(commentId, { [type + 's']: 1 });
        return true; // Added
      }
    } catch (error) {
      logger.error('Error toggling comment like:', error);
      throw error;
    }
  }

  /**
   * Bookmark/Unbookmark post
   */
  static async togglePostBookmark(postId: string, userId: string): Promise<boolean> {
    try {
      // Check if already bookmarked
      const existingBookmark = await firestore
        .collection(this.bookmarksCollection)
        .where('postId', '==', postId)
        .where('userId', '==', userId)
        .limit(1)
        .get();

      if (!existingBookmark.empty) {
        // Remove bookmark
        await existingBookmark.docs[0].ref.delete();
        await this.updatePostStats(postId, { bookmarks: -1 });
        return false; // Removed
      } else {
        // Add bookmark
        await firestore.collection(this.bookmarksCollection).add({
          postId,
          userId,
          createdAt: new Date()
        });
        
        await this.updatePostStats(postId, { bookmarks: 1 });
        return true; // Added
      }
    } catch (error) {
      logger.error('Error toggling post bookmark:', error);
      throw error;
    }
  }

  /**
   * Share post
   */
  static async sharePost(
    postId: string,
    platform: string,
    userId?: string,
    ipAddress?: string
  ): Promise<void> {
    try {
      await firestore.collection(this.sharesCollection).add({
        postId,
        userId,
        platform,
        ipAddress,
        createdAt: new Date()
      });

      await this.updatePostStats(postId, { shares: 1 });
    } catch (error) {
      logger.error('Error sharing post:', error);
      throw error;
    }
  }

  /**
   * Increment post view count
   */
  static async incrementPostViews(postId: string): Promise<void> {
    try {
      await this.updatePostStats(postId, { views: 1 });
    } catch (error) {
      logger.error('Error incrementing post views:', error);
      throw error;
    }
  }

  /**
   * Create category
   */
  static async createCategory(categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    try {
      const now = new Date();
      const category = {
        ...categoryData,
        createdAt: now,
        updatedAt: now
      };

      const docRef = await firestore.collection(this.categoriesCollection).add(category);
      
      const createdCategory: Category = {
        id: docRef.id,
        ...category
      };

      logger.info(`Category created: ${createdCategory.id}`);
      return createdCategory;
    } catch (error) {
      logger.error('Error creating category:', error);
      throw new Error('Failed to create category');
    }
  }

  /**
   * Get all categories
   */
  static async getCategories(): Promise<Category[]> {
    try {
      const snapshot = await firestore
        .collection(this.categoriesCollection)
        .where('isActive', '==', true)
        .orderBy('name', 'asc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Category[];
    } catch (error) {
      logger.error('Error getting categories:', error);
      return [];
    }
  }

  /**
   * Create or update tag
   */
  static async createOrUpdateTag(name: string, description?: string): Promise<Tag> {
    try {
      const slug = name.toLowerCase().replace(/\s+/g, '-');
      
      // Check if tag exists
      const existingTagSnapshot = await firestore
        .collection(this.tagsCollection)
        .where('slug', '==', slug)
        .limit(1)
        .get();

      if (!existingTagSnapshot.empty) {
        // Update existing tag
        const tagDoc = existingTagSnapshot.docs[0];
        const tagData = tagDoc.data() as Tag;
        
        await tagDoc.ref.update({
          count: firestore.FieldValue.increment(1),
          updatedAt: new Date()
        });

        return {
          id: tagDoc.id,
          ...tagData,
          count: tagData.count + 1
        };
      } else {
        // Create new tag
        const tagData = {
          name,
          slug,
          description,
          count: 1,
          trending: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const docRef = await firestore.collection(this.tagsCollection).add(tagData);
        
        return {
          id: docRef.id,
          ...tagData
        };
      }
    } catch (error) {
      logger.error('Error creating/updating tag:', error);
      throw new Error('Failed to create/update tag');
    }
  }

  /**
   * Get popular tags
   */
  static async getPopularTags(limit: number = 20): Promise<Tag[]> {
    try {
      const snapshot = await firestore
        .collection(this.tagsCollection)
        .orderBy('count', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Tag[];
    } catch (error) {
      logger.error('Error getting popular tags:', error);
      return [];
    }
  }

  /**
   * Create report
   */
  static async createReport(reportData: Omit<Report, 'id' | 'createdAt' | 'updatedAt'>): Promise<Report> {
    try {
      const now = new Date();
      const report = {
        ...reportData,
        createdAt: now,
        updatedAt: now
      };

      const docRef = await firestore.collection(this.reportsCollection).add(report);
      
      const createdReport: Report = {
        id: docRef.id,
        ...report
      };

      logger.info(`Report created: ${createdReport.id}`);
      return createdReport;
    } catch (error) {
      logger.error('Error creating report:', error);
      throw new Error('Failed to create report');
    }
  }

  /**
   * Get trending posts
   */
  static async getTrendingPosts(limit: number = 10): Promise<Post[]> {
    try {
      // Get posts from the last 7 days
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const snapshot = await firestore
        .collection(this.postsCollection)
        .where('status', '==', 'published')
        .where('createdAt', '>=', weekAgo)
        .orderBy('stats.likes', 'desc')
        .limit(limit * 2)
        .get();

      const posts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];

      // Calculate trending score
      const trendingPosts = posts
        .map(post => {
          const hoursOld = (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60);
          const trendingScore = 
            (post.stats.likes * 2) +
            (post.stats.comments * 1.5) +
            (post.stats.shares * 3) +
            (post.stats.views * 0.1) -
            (hoursOld * 0.1);
          
          return { ...post, trendingScore };
        })
        .sort((a, b) => b.trendingScore - a.trendingScore)
        .slice(0, limit);

      return trendingPosts;
    } catch (error) {
      logger.error('Error getting trending posts:', error);
      return [];
    }
  }

  /**
   * Update post stats
   */
  private static async updatePostStats(
    postId: string,
    statUpdates: Partial<Post['stats']>
  ): Promise<void> {
    try {
      const updates: any = { updatedAt: new Date() };
      
      Object.entries(statUpdates).forEach(([key, value]) => {
        if (typeof value === 'number') {
          updates[`stats.${key}`] = firestore.FieldValue.increment(value);
        }
      });

      await firestore.collection(this.postsCollection).doc(postId).update(updates);
    } catch (error) {
      logger.error(`Error updating post stats ${postId}:`, error);
      throw error;
    }
  }

  /**
   * Update comment stats
   */
  private static async updateCommentStats(
    commentId: string,
    statUpdates: Partial<Comment['stats']>
  ): Promise<void> {
    try {
      const updates: any = { updatedAt: new Date() };
      
      Object.entries(statUpdates).forEach(([key, value]) => {
        if (typeof value === 'number') {
          updates[`stats.${key}`] = firestore.FieldValue.increment(value);
        }
      });

      await firestore.collection(this.commentsCollection).doc(commentId).update(updates);
    } catch (error) {
      logger.error(`Error updating comment stats ${commentId}:`, error);
      throw error;
    }
  }

  /**
   * Update category stats
   */
  private static async updateCategoryStats(
    categoryId: string,
    statUpdates: Partial<Category['stats']>
  ): Promise<void> {
    try {
      const updates: any = { updatedAt: new Date() };
      
      Object.entries(statUpdates).forEach(([key, value]) => {
        if (typeof value === 'number') {
          updates[`stats.${key}`] = firestore.FieldValue.increment(value);
        }
      });

      await firestore.collection(this.categoriesCollection).doc(categoryId).update(updates);
    } catch (error) {
      logger.error(`Error updating category stats ${categoryId}:`, error);
    }
  }

  /**
   * Update tag counts
   */
  private static async updateTagCounts(tags: string[], increment: number): Promise<void> {
    try {
      const batch = firestore.batch();
      
      for (const tagName of tags) {
        const slug = tagName.toLowerCase().replace(/\s+/g, '-');
        
        const tagSnapshot = await firestore
          .collection(this.tagsCollection)
          .where('slug', '==', slug)
          .limit(1)
          .get();

        if (!tagSnapshot.empty) {
          const tagRef = tagSnapshot.docs[0].ref;
          batch.update(tagRef, {
            count: firestore.FieldValue.increment(increment),
            updatedAt: new Date()
          });
        }
      }
      
      await batch.commit();
    } catch (error) {
      logger.error('Error updating tag counts:', error);
    }
  }

  /**
   * Delete post related data
   */
  private static async deletePostRelatedData(postId: string): Promise<void> {
    try {
      const batch = firestore.batch();

      // Delete comments
      const commentsSnapshot = await firestore
        .collection(this.commentsCollection)
        .where('postId', '==', postId)
        .get();
      
      commentsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Delete likes
      const likesSnapshot = await firestore
        .collection(this.postLikesCollection)
        .where('postId', '==', postId)
        .get();
      
      likesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Delete bookmarks
      const bookmarksSnapshot = await firestore
        .collection(this.bookmarksCollection)
        .where('postId', '==', postId)
        .get();
      
      bookmarksSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Delete shares
      const sharesSnapshot = await firestore
        .collection(this.sharesCollection)
        .where('postId', '==', postId)
        .get();
      
      sharesSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
    } catch (error) {
      logger.error(`Error deleting related data for post ${postId}:`, error);
    }
  }
}

export const communityModel = CommunityModel;
export default CommunityModel;