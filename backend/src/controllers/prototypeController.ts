import { Request, Response } from 'express';
import { firestore, storage } from '../config/firebaseAdmin';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { uploadFileToFirebase } from '../services/fileUploadService';
import logger from '../services/loggerService';

// Configure Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Middleware to handle prototype file uploads
export const prototypeUploadMiddleware = upload.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'files', maxCount: 10 },
  { name: 'images', maxCount: 20 },
]);

/**
 * Get all prototypes
 */
export const getPrototypes = async (req: Request, res: Response) => {
  try {
    const { userId, status, limit = 20, offset = 0 } = req.query;
    
    let query = firestore.collection('prototypes');
    
    // Apply filters
    if (userId) {
      query = query.where('userId', '==', userId);
    }
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    // Apply pagination
    query = query.orderBy('createdAt', 'desc')
      .limit(Number(limit))
      .offset(Number(offset));
    
    const snapshot = await query.get();
    
    const prototypes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({
      success: true,
      data: prototypes,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: prototypes.length
      }
    });
  } catch (error) {
    logger.error('Error getting prototypes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get prototypes',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get prototype by ID
 */
export const getPrototypeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const doc = await firestore.collection('prototypes').doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Prototype not found',
        message: `No prototype found with ID: ${id}`
      });
    }
    
    const prototype = {
      id: doc.id,
      ...doc.data()
    };
    
    res.json({
      success: true,
      data: prototype
    });
  } catch (error) {
    logger.error('Error getting prototype:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get prototype',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Create a new prototype
 */
export const createPrototype = async (req: Request, res: Response) => {
  try {
    const {
      userId,
      title,
      description,
      category,
      tags,
      status = 'draft',
      visibility = 'private',
      version = '1.0.0',
      allowComments = true,
      allowDuplication = false
    } = req.body;
    
    // Validate required fields
    if (!userId || !title) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'userId and title are required'
      });
    }
    
    // Access files from req.files (after multer middleware)
    const uploadedThumbnail = (req.files as { [fieldname: string]: Express.Multer.File[] })?.thumbnail?.[0];
    const uploadedFiles = (req.files as { [fieldname: string]: Express.Multer.File[] })?.files || [];
    const uploadedImages = (req.files as { [fieldname: string]: Express.Multer.File[] })?.images || [];
    
    // Upload thumbnail if provided
    let thumbnailUrl = null;
    if (uploadedThumbnail) {
      thumbnailUrl = await uploadFileToFirebase(
        uploadedThumbnail.buffer,
        uploadedThumbnail.mimetype!,
        'prototypes/thumbnails'
      );
    }
    
    // Upload files
    const files = await Promise.all(uploadedFiles.map(async (file) => {
      const fileUrl = await uploadFileToFirebase(
        file.buffer,
        file.mimetype!,
        'prototypes/files'
      );
      
      return {
        id: uuidv4(),
        name: file.originalname,
        url: fileUrl,
        type: file.mimetype,
        size: file.size,
        uploadedAt: new Date()
      };
    }));
    
    // Upload images
    const images = await Promise.all(uploadedImages.map(async (image) => {
      const imageUrl = await uploadFileToFirebase(
        image.buffer,
        image.mimetype!,
        'prototypes/images'
      );
      
      return {
        id: uuidv4(),
        name: image.originalname,
        url: imageUrl,
        type: image.mimetype,
        size: image.size,
        uploadedAt: new Date()
      };
    }));
    
    // Create prototype document
    const prototypeData = {
      userId,
      title,
      description: description || '',
      category: category || 'other',
      tags: tags || [],
      status,
      visibility,
      version,
      allowComments,
      allowDuplication,
      thumbnailUrl,
      files,
      images,
      stats: {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        downloads: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await firestore.collection('prototypes').add(prototypeData);
    
    res.status(201).json({
      success: true,
      message: 'Prototype created successfully',
      data: {
        id: docRef.id,
        ...prototypeData
      }
    });
  } catch (error) {
    logger.error('Error creating prototype:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create prototype',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Update a prototype
 */
export const updatePrototype = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      category,
      tags,
      status,
      visibility,
      version,
      allowComments,
      allowDuplication
    } = req.body;
    
    // Check if prototype exists
    const prototypeRef = firestore.collection('prototypes').doc(id);
    const doc = await prototypeRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Prototype not found',
        message: `No prototype found with ID: ${id}`
      });
    }
    
    const prototype = doc.data()!;
    
    // Check if user is the owner
    if (prototype.userId !== req.user?.uid) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied',
        message: 'You do not have permission to update this prototype'
      });
    }
    
    // Access files from req.files (after multer middleware)
    const uploadedThumbnail = (req.files as { [fieldname: string]: Express.Multer.File[] })?.thumbnail?.[0];
    const uploadedFiles = (req.files as { [fieldname: string]: Express.Multer.File[] })?.files || [];
    const uploadedImages = (req.files as { [fieldname: string]: Express.Multer.File[] })?.images || [];
    
    // Upload thumbnail if provided
    let thumbnailUrl = prototype.thumbnailUrl;
    if (uploadedThumbnail) {
      thumbnailUrl = await uploadFileToFirebase(
        uploadedThumbnail.buffer,
        uploadedThumbnail.mimetype!,
        'prototypes/thumbnails'
      );
    }
    
    // Upload new files
    const newFiles = await Promise.all(uploadedFiles.map(async (file) => {
      const fileUrl = await uploadFileToFirebase(
        file.buffer,
        file.mimetype!,
        'prototypes/files'
      );
      
      return {
        id: uuidv4(),
        name: file.originalname,
        url: fileUrl,
        type: file.mimetype,
        size: file.size,
        uploadedAt: new Date()
      };
    }));
    
    // Upload new images
    const newImages = await Promise.all(uploadedImages.map(async (image) => {
      const imageUrl = await uploadFileToFirebase(
        image.buffer,
        image.mimetype!,
        'prototypes/images'
      );
      
      return {
        id: uuidv4(),
        name: image.originalname,
        url: imageUrl,
        type: image.mimetype,
        size: image.size,
        uploadedAt: new Date()
      };
    }));
    
    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    };
    
    // Only update fields that are provided
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = tags;
    if (status !== undefined) updateData.status = status;
    if (visibility !== undefined) updateData.visibility = visibility;
    if (version !== undefined) updateData.version = version;
    if (allowComments !== undefined) updateData.allowComments = allowComments;
    if (allowDuplication !== undefined) updateData.allowDuplication = allowDuplication;
    if (thumbnailUrl !== prototype.thumbnailUrl) updateData.thumbnailUrl = thumbnailUrl;
    
    // Add new files and images if provided
    if (newFiles.length > 0) {
      updateData.files = [...(prototype.files || []), ...newFiles];
    }
    
    if (newImages.length > 0) {
      updateData.images = [...(prototype.images || []), ...newImages];
    }
    
    // Update prototype
    await prototypeRef.update(updateData);
    
    // Get updated prototype
    const updatedDoc = await prototypeRef.get();
    const updatedPrototype = {
      id: updatedDoc.id,
      ...updatedDoc.data()
    };
    
    res.json({
      success: true,
      message: 'Prototype updated successfully',
      data: updatedPrototype
    });
  } catch (error) {
    logger.error('Error updating prototype:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update prototype',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Delete a prototype
 */
export const deletePrototype = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if prototype exists
    const prototypeRef = firestore.collection('prototypes').doc(id);
    const doc = await prototypeRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Prototype not found',
        message: `No prototype found with ID: ${id}`
      });
    }
    
    const prototype = doc.data()!;
    
    // Check if user is the owner
    if (prototype.userId !== req.user?.uid) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied',
        message: 'You do not have permission to delete this prototype'
      });
    }
    
    // Delete files from storage
    const bucket = storage.bucket();
    
    // Delete thumbnail
    if (prototype.thumbnailUrl) {
      try {
        const thumbnailPath = new URL(prototype.thumbnailUrl).pathname.split('/').pop();
        await bucket.file(`prototypes/thumbnails/${thumbnailPath}`).delete();
      } catch (error) {
        logger.warn('Error deleting thumbnail:', error);
      }
    }
    
    // Delete files
    if (prototype.files && prototype.files.length > 0) {
      for (const file of prototype.files) {
        try {
          const filePath = new URL(file.url).pathname.split('/').pop();
          await bucket.file(`prototypes/files/${filePath}`).delete();
        } catch (error) {
          logger.warn(`Error deleting file ${file.name}:`, error);
        }
      }
    }
    
    // Delete images
    if (prototype.images && prototype.images.length > 0) {
      for (const image of prototype.images) {
        try {
          const imagePath = new URL(image.url).pathname.split('/').pop();
          await bucket.file(`prototypes/images/${imagePath}`).delete();
        } catch (error) {
          logger.warn(`Error deleting image ${image.name}:`, error);
        }
      }
    }
    
    // Delete prototype document
    await prototypeRef.delete();
    
    res.json({
      success: true,
      message: 'Prototype deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting prototype:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete prototype',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Add feedback to a prototype
 */
export const addFeedback = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, content, rating, type = 'comment' } = req.body;
    
    // Validate required fields
    if (!userId || !content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'userId and content are required'
      });
    }
    
    // Check if prototype exists
    const prototypeRef = firestore.collection('prototypes').doc(id);
    const doc = await prototypeRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Prototype not found',
        message: `No prototype found with ID: ${id}`
      });
    }
    
    const prototype = doc.data()!;
    
    // Check if comments are allowed
    if (!prototype.allowComments) {
      return res.status(403).json({
        success: false,
        error: 'Comments disabled',
        message: 'Comments are disabled for this prototype'
      });
    }
    
    // Create feedback document
    const feedbackData = {
      prototypeId: id,
      userId,
      content,
      rating: rating || null,
      type,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const feedbackRef = await firestore.collection('prototypeFeedback').add(feedbackData);
    
    // Update prototype stats
    await prototypeRef.update({
      'stats.comments': firestore.FieldValue.increment(1),
      updatedAt: new Date()
    });
    
    // Get user data
    const userDoc = await firestore.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    
    res.status(201).json({
      success: true,
      message: 'Feedback added successfully',
      data: {
        id: feedbackRef.id,
        ...feedbackData,
        user: userData ? {
          id: userId,
          displayName: userData.displayName,
          photoURL: userData.photoURL
        } : null
      }
    });
  } catch (error) {
    logger.error('Error adding feedback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add feedback',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get feedback for a prototype
 */
export const getFeedback = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = 20, offset = 0, type } = req.query;
    
    // Check if prototype exists
    const prototypeRef = firestore.collection('prototypes').doc(id);
    const doc = await prototypeRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Prototype not found',
        message: `No prototype found with ID: ${id}`
      });
    }
    
    // Build query
    let query = firestore.collection('prototypeFeedback')
      .where('prototypeId', '==', id);
    
    if (type) {
      query = query.where('type', '==', type);
    }
    
    // Apply pagination
    query = query.orderBy('createdAt', 'desc')
      .limit(Number(limit))
      .offset(Number(offset));
    
    const snapshot = await query.get();
    
    // Get feedback with user data
    const feedbackPromises = snapshot.docs.map(async (feedbackDoc) => {
      const feedback = feedbackDoc.data();
      
      // Get user data
      const userDoc = await firestore.collection('users').doc(feedback.userId).get();
      const userData = userDoc.exists ? userDoc.data() : null;
      
      return {
        id: feedbackDoc.id,
        ...feedback,
        user: userData ? {
          id: feedback.userId,
          displayName: userData.displayName,
          photoURL: userData.photoURL
        } : null
      };
    });
    
    const feedback = await Promise.all(feedbackPromises);
    
    res.json({
      success: true,
      data: feedback,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: feedback.length
      }
    });
  } catch (error) {
    logger.error('Error getting feedback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get feedback',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Like a prototype
 */
export const likePrototype = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    // Validate required fields
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'userId is required'
      });
    }
    
    // Check if prototype exists
    const prototypeRef = firestore.collection('prototypes').doc(id);
    const doc = await prototypeRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Prototype not found',
        message: `No prototype found with ID: ${id}`
      });
    }
    
    // Check if user already liked the prototype
    const likeRef = firestore.collection('prototypeLikes')
      .where('prototypeId', '==', id)
      .where('userId', '==', userId);
    
    const likeSnapshot = await likeRef.get();
    
    if (!likeSnapshot.empty) {
      return res.status(400).json({
        success: false,
        error: 'Already liked',
        message: 'User has already liked this prototype'
      });
    }
    
    // Create like document
    const likeData = {
      prototypeId: id,
      userId,
      createdAt: new Date()
    };
    
    await firestore.collection('prototypeLikes').add(likeData);
    
    // Update prototype stats
    await prototypeRef.update({
      'stats.likes': firestore.FieldValue.increment(1),
      updatedAt: new Date()
    });
    
    res.status(201).json({
      success: true,
      message: 'Prototype liked successfully'
    });
  } catch (error) {
    logger.error('Error liking prototype:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to like prototype',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Unlike a prototype
 */
export const unlikePrototype = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    // Validate required fields
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'userId is required'
      });
    }
    
    // Check if prototype exists
    const prototypeRef = firestore.collection('prototypes').doc(id);
    const doc = await prototypeRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Prototype not found',
        message: `No prototype found with ID: ${id}`
      });
    }
    
    // Find like document
    const likeQuery = firestore.collection('prototypeLikes')
      .where('prototypeId', '==', id)
      .where('userId', '==', userId);
    
    const likeSnapshot = await likeQuery.get();
    
    if (likeSnapshot.empty) {
      return res.status(400).json({
        success: false,
        error: 'Not liked',
        message: 'User has not liked this prototype'
      });
    }
    
    // Delete like document
    const batch = firestore.batch();
    likeSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    // Update prototype stats
    await prototypeRef.update({
      'stats.likes': firestore.FieldValue.increment(-1),
      updatedAt: new Date()
    });
    
    res.json({
      success: true,
      message: 'Prototype unliked successfully'
    });
  } catch (error) {
    logger.error('Error unliking prototype:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unlike prototype',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Increment prototype view count
 */
export const viewPrototype = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if prototype exists
    const prototypeRef = firestore.collection('prototypes').doc(id);
    const doc = await prototypeRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Prototype not found',
        message: `No prototype found with ID: ${id}`
      });
    }
    
    // Update prototype stats
    await prototypeRef.update({
      'stats.views': firestore.FieldValue.increment(1)
    });
    
    res.json({
      success: true,
      message: 'View count incremented'
    });
  } catch (error) {
    logger.error('Error incrementing view count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to increment view count',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Share a prototype
 */
export const sharePrototype = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { platform } = req.body;
    
    // Check if prototype exists
    const prototypeRef = firestore.collection('prototypes').doc(id);
    const doc = await prototypeRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Prototype not found',
        message: `No prototype found with ID: ${id}`
      });
    }
    
    // Update prototype stats
    await prototypeRef.update({
      'stats.shares': firestore.FieldValue.increment(1)
    });
    
    // Log share event
    await firestore.collection('prototypeShares').add({
      prototypeId: id,
      platform: platform || 'unknown',
      createdAt: new Date()
    });
    
    res.json({
      success: true,
      message: 'Share count incremented'
    });
  } catch (error) {
    logger.error('Error incrementing share count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to increment share count',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Duplicate a prototype
 */
export const duplicatePrototype = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, title } = req.body;
    
    // Validate required fields
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'userId is required'
      });
    }
    
    // Check if prototype exists
    const prototypeRef = firestore.collection('prototypes').doc(id);
    const doc = await prototypeRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Prototype not found',
        message: `No prototype found with ID: ${id}`
      });
    }
    
    const prototype = doc.data()!;
    
    // Check if duplication is allowed
    if (!prototype.allowDuplication) {
      return res.status(403).json({
        success: false,
        error: 'Duplication not allowed',
        message: 'This prototype does not allow duplication'
      });
    }
    
    // Create new prototype document
    const newPrototypeData = {
      userId,
      title: title || `Copy of ${prototype.title}`,
      description: prototype.description,
      category: prototype.category,
      tags: prototype.tags,
      status: 'draft',
      visibility: 'private',
      version: '1.0.0',
      allowComments: prototype.allowComments,
      allowDuplication: prototype.allowDuplication,
      thumbnailUrl: prototype.thumbnailUrl,
      files: prototype.files,
      images: prototype.images,
      originalPrototypeId: id,
      stats: {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        downloads: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const newDocRef = await firestore.collection('prototypes').add(newPrototypeData);
    
    res.status(201).json({
      success: true,
      message: 'Prototype duplicated successfully',
      data: {
        id: newDocRef.id,
        ...newPrototypeData
      }
    });
  } catch (error) {
    logger.error('Error duplicating prototype:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to duplicate prototype',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};