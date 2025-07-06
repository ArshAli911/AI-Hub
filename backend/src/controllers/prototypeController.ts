import { Request, Response } from 'express';
import { prototypeModel, Prototype, PrototypeFeedback, PrototypeComment } from '../models/Prototype';
import { userModel, UserRole } from '../models/User';
import logger from '../services/loggerService';

export const getPrototypes = (req: Request, res: Response) => {
  // Logic to fetch all prototypes from a service/database
  res.json({ message: 'Get all prototypes (controller placeholder)' });
};

export const getPrototypeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const requestingUser = req.user;

    const prototype = await prototypeModel.getPrototypeById(id);
    if (!prototype) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'Prototype not found'
      });
    }

    // Check visibility permissions
    if (prototype.visibility === 'private' && 
        prototype.creatorId !== requestingUser?.uid && 
        requestingUser?.role !== UserRole.ADMIN) {
      return res.status(403).json({
        error: 'ForbiddenError',
        message: 'Access denied to private prototype'
      });
    }

    // Increment view count
    await prototypeModel.incrementViews(id);

    res.json({
      message: 'Prototype retrieved successfully',
      prototype: {
        id: prototype.id,
        creator: {
          uid: prototype.creator.uid,
          firstName: prototype.creator.firstName,
          lastName: prototype.creator.lastName,
          displayName: prototype.creator.displayName,
          photoURL: prototype.creator.photoURL
        },
        name: prototype.name,
        description: prototype.description,
        category: prototype.category,
        tags: prototype.tags,
        status: prototype.status,
        visibility: prototype.visibility,
        version: prototype.version,
        thumbnailUrl: prototype.thumbnailUrl,
        demoUrl: prototype.demoUrl,
        sourceCodeUrl: prototype.sourceCodeUrl,
        documentationUrl: prototype.documentationUrl,
        technologies: prototype.technologies,
        difficulty: prototype.difficulty,
        estimatedTime: prototype.estimatedTime,
        requirements: prototype.requirements,
        features: prototype.features,
        screenshots: prototype.screenshots,
        videos: prototype.videos,
        files: prototype.files,
        stats: prototype.stats,
        metadata: prototype.metadata,
        createdAt: prototype.createdAt,
        updatedAt: prototype.updatedAt,
        publishedAt: prototype.publishedAt
      }
    });
  } catch (error) {
    logger.error('Error fetching prototype:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to fetch prototype'
    });
  }
};

export const createPrototype = async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      category,
      tags,
      technologies,
      difficulty,
      estimatedTime,
      requirements,
      features,
      screenshots,
      videos,
      files,
      demoUrl,
      sourceCodeUrl,
      documentationUrl
    } = req.body;
    const requestingUser = req.user;

    if (!requestingUser) {
      return res.status(401).json({
        error: 'UnauthorizedError',
        message: 'Authentication required'
      });
    }

    // Validate required fields
    if (!name || !description || !category || !technologies || !difficulty) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Missing required fields: name, description, category, technologies, difficulty'
      });
    }

    // Get user data
    const user = await userModel.getUserById(requestingUser.uid);
    if (!user) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'User not found'
      });
    }

    const prototypeData = {
      creatorId: requestingUser.uid,
      creator: user,
      name,
      description,
      category,
      tags: tags || [],
      technologies,
      difficulty,
      estimatedTime: estimatedTime || 0,
      requirements: requirements || [],
      features: features || [],
      screenshots: screenshots || [],
      videos: videos || [],
      files: files || [],
      demoUrl,
      sourceCodeUrl,
      documentationUrl,
      status: 'draft' as const,
      visibility: 'private' as const,
      version: '1.0.0'
    };

    const prototype = await prototypeModel.createPrototype(prototypeData);

    logger.info(`Prototype created: ${prototype.id} by ${requestingUser.uid}`);

    res.status(201).json({
      message: 'Prototype created successfully',
      prototype: {
        id: prototype.id,
        name: prototype.name,
        description: prototype.description,
        category: prototype.category,
        tags: prototype.tags,
        technologies: prototype.technologies,
        difficulty: prototype.difficulty,
        status: prototype.status,
        visibility: prototype.visibility,
        createdAt: prototype.createdAt
      }
    });
  } catch (error) {
    logger.error('Error creating prototype:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to create prototype'
    });
  }
};

export const submitFeedback = (req: Request, res: Response) => {
  const { id } = req.params;
  // Logic to submit feedback for a prototype via a service/database
  res.json({ message: `Submit feedback for prototype ${id} (controller placeholder)`, data: req.body });
};

export const getPrototypesByCreator = async (req: Request, res: Response) => {
  try {
    const { creatorId } = req.params;
    const { status } = req.query;
    const requestingUser = req.user;

    // Check if user is requesting their own prototypes or has admin permissions
    if (requestingUser?.uid !== creatorId && requestingUser?.role !== UserRole.ADMIN) {
      return res.status(403).json({
        error: 'ForbiddenError',
        message: 'Insufficient permissions to view these prototypes'
      });
    }

    const prototypes = await prototypeModel.getPrototypesByCreator(creatorId, status as string);

    res.json({
      message: 'Prototypes retrieved successfully',
      prototypes: prototypes.map(prototype => ({
        id: prototype.id,
        name: prototype.name,
        description: prototype.description,
        category: prototype.category,
        tags: prototype.tags,
        status: prototype.status,
        visibility: prototype.visibility,
        technologies: prototype.technologies,
        difficulty: prototype.difficulty,
        stats: prototype.stats,
        createdAt: prototype.createdAt,
        updatedAt: prototype.updatedAt
      })),
      count: prototypes.length
    });
  } catch (error) {
    logger.error('Error fetching prototypes by creator:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to fetch prototypes by creator'
    });
  }
};

export const getPublicPrototypes = async (req: Request, res: Response) => {
  try {
    const { limit = 20, offset = 0, category } = req.query;

    const prototypes = await prototypeModel.getPublicPrototypes(
      Number(limit),
      Number(offset),
      category as string
    );

    res.json({
      message: 'Public prototypes retrieved successfully',
      prototypes: prototypes.map(prototype => ({
        id: prototype.id,
        creator: {
          uid: prototype.creator.uid,
          firstName: prototype.creator.firstName,
          lastName: prototype.creator.lastName,
          displayName: prototype.creator.displayName,
          photoURL: prototype.creator.photoURL
        },
        name: prototype.name,
        description: prototype.description,
        category: prototype.category,
        tags: prototype.tags,
        technologies: prototype.technologies,
        difficulty: prototype.difficulty,
        thumbnailUrl: prototype.thumbnailUrl,
        stats: prototype.stats,
        createdAt: prototype.createdAt
      })),
      count: prototypes.length,
      limit: Number(limit),
      offset: Number(offset)
    });
  } catch (error) {
    logger.error('Error fetching public prototypes:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to fetch public prototypes'
    });
  }
};

export const searchPrototypes = async (req: Request, res: Response) => {
  try {
    const { query, limit = 20 } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Search query is required'
      });
    }

    const prototypes = await prototypeModel.searchPrototypes(query, Number(limit));

    res.json({
      message: 'Prototype search completed',
      prototypes: prototypes.map(prototype => ({
        id: prototype.id,
        creator: {
          uid: prototype.creator.uid,
          firstName: prototype.creator.firstName,
          lastName: prototype.creator.lastName,
          displayName: prototype.creator.displayName,
          photoURL: prototype.creator.photoURL
        },
        name: prototype.name,
        description: prototype.description,
        category: prototype.category,
        tags: prototype.tags,
        technologies: prototype.technologies,
        difficulty: prototype.difficulty,
        thumbnailUrl: prototype.thumbnailUrl,
        stats: prototype.stats,
        createdAt: prototype.createdAt
      })),
      count: prototypes.length,
      query
    });
  } catch (error) {
    logger.error('Error searching prototypes:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to search prototypes'
    });
  }
};

export const updatePrototype = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const requestingUser = req.user;
    const updates = req.body;

    if (!requestingUser) {
      return res.status(401).json({
        error: 'UnauthorizedError',
        message: 'Authentication required'
      });
    }

    const prototype = await prototypeModel.getPrototypeById(id);
    if (!prototype) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'Prototype not found'
      });
    }

    // Check if user is the creator or has admin permissions
    if (prototype.creatorId !== requestingUser.uid && requestingUser.role !== UserRole.ADMIN) {
      return res.status(403).json({
        error: 'ForbiddenError',
        message: 'Insufficient permissions to update this prototype'
      });
    }

    const updatedPrototype = await prototypeModel.updatePrototype(id, updates);

    logger.info(`Prototype updated: ${id} by ${requestingUser.uid}`);

    res.json({
      message: 'Prototype updated successfully',
      prototype: {
        id: updatedPrototype.id,
        name: updatedPrototype.name,
        description: updatedPrototype.description,
        category: updatedPrototype.category,
        tags: updatedPrototype.tags,
        status: updatedPrototype.status,
        visibility: updatedPrototype.visibility,
        technologies: updatedPrototype.technologies,
        difficulty: updatedPrototype.difficulty,
        updatedAt: updatedPrototype.updatedAt
      }
    });
  } catch (error) {
    logger.error('Error updating prototype:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to update prototype'
    });
  }
};

export const deletePrototype = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const requestingUser = req.user;

    if (!requestingUser) {
      return res.status(401).json({
        error: 'UnauthorizedError',
        message: 'Authentication required'
      });
    }

    const prototype = await prototypeModel.getPrototypeById(id);
    if (!prototype) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'Prototype not found'
      });
    }

    // Check if user is the creator or has admin permissions
    if (prototype.creatorId !== requestingUser.uid && requestingUser.role !== UserRole.ADMIN) {
      return res.status(403).json({
        error: 'ForbiddenError',
        message: 'Insufficient permissions to delete this prototype'
      });
    }

    await prototypeModel.deletePrototype(id);

    logger.info(`Prototype deleted: ${id} by ${requestingUser.uid}`);

    res.json({
      message: 'Prototype deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting prototype:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to delete prototype'
    });
  }
};

export const addFeedback = async (req: Request, res: Response) => {
  try {
    const { prototypeId } = req.params;
    const { rating, comment, categories } = req.body;
    const requestingUser = req.user;

    if (!requestingUser) {
      return res.status(401).json({
        error: 'UnauthorizedError',
        message: 'Authentication required'
      });
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Rating must be between 1 and 5'
      });
    }

    // Check if prototype exists and is public
    const prototype = await prototypeModel.getPrototypeById(prototypeId);
    if (!prototype || prototype.visibility !== 'public') {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'Prototype not found or not accessible'
      });
    }

    // Get user data
    const user = await userModel.getUserById(requestingUser.uid);
    if (!user) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'User not found'
      });
    }

    const feedbackData = {
      prototypeId,
      userId: requestingUser.uid,
      rating,
      comment,
      categories: {
        functionality: categories?.functionality || rating,
        design: categories?.design || rating,
        performance: categories?.performance || rating,
        documentation: categories?.documentation || rating,
        originality: categories?.originality || rating
      },
      isVerified: false,
      isHelpful: 0,
      user
    };

    const feedback = await prototypeModel.addFeedback(feedbackData);

    logger.info(`Feedback added: ${feedback.id} for prototype ${prototypeId}`);

    res.status(201).json({
      message: 'Feedback added successfully',
      feedback: {
        id: feedback.id,
        prototypeId: feedback.prototypeId,
        userId: feedback.userId,
        rating: feedback.rating,
        comment: feedback.comment,
        categories: feedback.categories,
        isVerified: feedback.isVerified,
        isHelpful: feedback.isHelpful,
        createdAt: feedback.createdAt
      }
    });
  } catch (error) {
    logger.error('Error adding feedback:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to add feedback'
    });
  }
};

export const getPrototypeFeedback = async (req: Request, res: Response) => {
  try {
    const { prototypeId } = req.params;
    const { limit = 20 } = req.query;

    const feedback = await prototypeModel.getPrototypeFeedback(prototypeId, Number(limit));

    res.json({
      message: 'Prototype feedback retrieved successfully',
      feedback: feedback.map(f => ({
        id: f.id,
        userId: f.userId,
        user: {
          uid: f.user.uid,
          firstName: f.user.firstName,
          lastName: f.user.lastName,
          displayName: f.user.displayName,
          photoURL: f.user.photoURL
        },
        rating: f.rating,
        comment: f.comment,
        categories: f.categories,
        isVerified: f.isVerified,
        isHelpful: f.isHelpful,
        createdAt: f.createdAt
      })),
      count: feedback.length
    });
  } catch (error) {
    logger.error('Error fetching prototype feedback:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to fetch prototype feedback'
    });
  }
};

export const addComment = async (req: Request, res: Response) => {
  try {
    const { prototypeId } = req.params;
    const { content, parentId } = req.body;
    const requestingUser = req.user;

    if (!requestingUser) {
      return res.status(401).json({
        error: 'UnauthorizedError',
        message: 'Authentication required'
      });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Comment content is required'
      });
    }

    // Check if prototype exists and is accessible
    const prototype = await prototypeModel.getPrototypeById(prototypeId);
    if (!prototype) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'Prototype not found'
      });
    }

    // Get user data
    const user = await userModel.getUserById(requestingUser.uid);
    if (!user) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'User not found'
      });
    }

    const commentData = {
      prototypeId,
      userId: requestingUser.uid,
      content: content.trim(),
      parentId,
      likes: 0,
      isEdited: false,
      user
    };

    const comment = await prototypeModel.addComment(commentData);

    logger.info(`Comment added: ${comment.id} for prototype ${prototypeId}`);

    res.status(201).json({
      message: 'Comment added successfully',
      comment: {
        id: comment.id,
        prototypeId: comment.prototypeId,
        userId: comment.userId,
        user: {
          uid: comment.user.uid,
          firstName: comment.user.firstName,
          lastName: comment.user.lastName,
          displayName: comment.user.displayName,
          photoURL: comment.user.photoURL
        },
        content: comment.content,
        parentId: comment.parentId,
        likes: comment.likes,
        isEdited: comment.isEdited,
        createdAt: comment.createdAt
      }
    });
  } catch (error) {
    logger.error('Error adding comment:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to add comment'
    });
  }
};

export const getPrototypeComments = async (req: Request, res: Response) => {
  try {
    const { prototypeId } = req.params;
    const { limit = 50 } = req.query;

    const comments = await prototypeModel.getPrototypeComments(prototypeId, Number(limit));

    res.json({
      message: 'Prototype comments retrieved successfully',
      comments: comments.map(comment => ({
        id: comment.id,
        userId: comment.userId,
        user: {
          uid: comment.user.uid,
          firstName: comment.user.firstName,
          lastName: comment.user.lastName,
          displayName: comment.user.displayName,
          photoURL: comment.user.photoURL
        },
        content: comment.content,
        parentId: comment.parentId,
        likes: comment.likes,
        isEdited: comment.isEdited,
        createdAt: comment.createdAt
      })),
      count: comments.length
    });
  } catch (error) {
    logger.error('Error fetching prototype comments:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to fetch prototype comments'
    });
  }
};

export const forkPrototype = async (req: Request, res: Response) => {
  try {
    const { prototypeId } = req.params;
    const { reason } = req.body;
    const requestingUser = req.user;

    if (!requestingUser) {
      return res.status(401).json({
        error: 'UnauthorizedError',
        message: 'Authentication required'
      });
    }

    // Check if prototype exists and is public
    const originalPrototype = await prototypeModel.getPrototypeById(prototypeId);
    if (!originalPrototype || originalPrototype.visibility !== 'public') {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'Prototype not found or not accessible'
      });
    }

    // Get user data
    const user = await userModel.getUserById(requestingUser.uid);
    if (!user) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'User not found'
      });
    }

    const fork = await prototypeModel.forkPrototype(prototypeId, requestingUser.uid, user, reason);

    logger.info(`Prototype forked: ${prototypeId} -> ${fork.forkedPrototypeId} by ${requestingUser.uid}`);

    res.status(201).json({
      message: 'Prototype forked successfully',
      fork: {
        id: fork.id,
        originalPrototypeId: fork.originalPrototypeId,
        forkedPrototypeId: fork.forkedPrototypeId,
        reason: fork.reason,
        createdAt: fork.createdAt
      }
    });
  } catch (error) {
    logger.error('Error forking prototype:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to fork prototype'
    });
  }
}; 