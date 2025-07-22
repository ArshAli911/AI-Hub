import { Request, Response } from 'express';
import { firestore } from '../config/firebaseAdmin';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { uploadFileToFirebase } from '../services/fileUploadService';
import logger from '../services/loggerService';
import { notificationService } from '../services/notificationService';

// Configure Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Middleware to handle post file uploads
export const postUploadMiddleware = upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'files', maxCount: 5 },
]);

/**
 * Get all posts with pagination and filtering
 */
export const getPosts = async (req: Request, res: Response) => {
  try {
    const {
      category,
      tag,
      userId,
      pinned,
      limit = 20,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    let query = firestore.collection('posts');
    
    // Apply filters
    if (category) {
      query = query.where('category', '==', category);
    }
    
    if (tag) {
      query = query.where('tags', 'array-contains', tag);
    }
    
    if (userId) {
      query = query.where('userId', '==', userId);
    }
    
    if (pinned === 'true') {
      query = query.where('pinned', '==', true);
    }
    
    // Apply sorting
    query = query.orderBy(sortBy as string, sortOrder as 'asc' | 'desc');
    
    // Apply pagination
    query = query.limit(Number(limit)).offset(Number(offset));
    
    const snapshot = await query.get();
    
    // Get posts with user data
    const postsPromises = snapshot.docs.map(async (doc) => {
      const post = doc.data();
      
      // Get user data
      const userDoc = await firestore.collection('users').doc(post.userId).get();
      const userData = userDoc.exists ? userDoc.data() : null;
      
      // Get comment count
      const commentCount = await firestore
        .collection('comments')
        .where('postId', '==', doc.id)
        .count()
        .get();
      
      return {
        id: doc.id,
        ...post,
        user: userData ? {
          id: post.userId,
          displayName: userData.displayName,
          photoURL: userData.photoURL
        } : null,
        commentCount: commentCount.data().count
      };
    });
    
    const posts = await Promise.all(postsPromises);
    
    res.json({
      success: true,
      data: posts,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: posts.length
      }
    });
  } catch (error) {
    logger.error('Error getting posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get posts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get post by ID with comments
 */
export const getPostById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { commentLimit = 20, commentOffset = 0 } = req.query;
    
    // Get post
    const postDoc = await firestore.collection('posts').doc(id).get();
    
    if (!postDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
        message: `No post found with ID: ${id}`
      });
    }
    
    const post = postDoc.data()!;
    
    // Get user data
    const userDoc = await firestore.collection('users').doc(post.userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    
    // Get comments
    const commentsQuery = firestore.collection('comments')
      .where('postId', '==', id)
      .orderBy('createdAt', 'asc')
      .limit(Number(commentLimit))
      .offset(Number(commentOffset));
    
    const commentsSnapshot = await commentsQuery.get();
    
    // Get comments with user data
    const commentsPromises = commentsSnapshot.docs.map(async (doc) => {
      const comment = doc.data();
      
      // Get comment user data
      const commentUserDoc = await firestore.collection('users').doc(comment.userId).get();
      const commentUserData = commentUserDoc.exists ? commentUserDoc.data() : null;
      
      return {
        id: doc.id,
        ...comment,
        user: commentUserData ? {
          id: comment.userId,
          displayName: commentUserData.displayName,
          photoURL: commentUserData.photoURL
        } : null
      };
    });
    
    const comments = await Promise.all(commentsPromises);
    
    // Increment view count
    await postDoc.ref.update({
      viewCount: (post.viewCount || 0) + 1
    });
    
    res.json({
      success: true,
      data: {
        post: {
          id: postDoc.id,
          ...post,
          user: userData ? {
            id: post.userId,
            displayName: userData.displayName,
            photoURL: userData.photoURL
          } : null
        },
        comments,
        commentPagination: {
          limit: Number(commentLimit),
          offset: Number(commentOffset),
          total: comments.length
        }
      }
    });
  } catch (error) {
    logger.error('Error getting post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get post',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Create a new post
 */
export const createPost = async (req: Request, res: Response) => {
  try {
    const {
      userId,
      title,
      content,
      category,
      tags,
      pinned = false,
      allowComments = true
    } = req.body;
    
    // Validate required fields
    if (!userId || !title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'userId, title, and content are required'
      });
    }
    
    // Access files from req.files (after multer middleware)
    const uploadedImages = (req.files as { [fieldname: string]: Express.Multer.File[] })?.images || [];
    const uploadedFiles = (req.files as { [fieldname: string]: Express.Multer.File[] })?.files || [];
    
    // Upload images
    const images = await Promise.all(uploadedImages.map(async (image) => {
      const imageUrl = await uploadFileToFirebase(
        image.buffer,
        image.mimetype!,
        'community/images'
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
    
    // Upload files
    const files = await Promise.all(uploadedFiles.map(async (file) => {
      const fileUrl = await uploadFileToFirebase(
        file.buffer,
        file.mimetype!,
        'community/files'
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
    
    // Create post document
    const postData = {
      userId,
      title,
      content,
      category: category || 'general',
      tags: tags || [],
      pinned,
      allowComments,
      images,
      files,
      likeCount: 0,
      viewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await firestore.collection('posts').add(postData);
    
    // Get user data
    const userDoc = await firestore.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    
    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: {
        id: docRef.id,
        ...postData,
        user: userData ? {
          id: userId,
          displayName: userData.displayName,
          photoURL: userData.photoURL
        } : null
      }
    });
  } catch (error) {
    logger.error('Error creating post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create post',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Update a post
 */
export const updatePost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      category,
      tags,
      pinned,
      allowComments
    } = req.body;
    
    // Check if post exists
    const postRef = firestore.collection('posts').doc(id);
    const doc = await postRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
        message: `No post found with ID: ${id}`
      });
    }
    
    const post = doc.data()!;
    
    // Check if user is the owner or admin
    if (post.userId !== req.user?.uid && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Permission denied',
        message: 'You do not have permission to update this post'
      });
    }
    
    // Access files from req.files (after multer middleware)
    const uploadedImages = (req.files as { [fieldname: string]: Express.Multer.File[] })?.images || [];
    const uploadedFiles = (req.files as { [fieldname: string]: Express.Multer.File[] })?.files || [];
    
    // Upload new images
    const newImages = await Promise.all(uploadedImages.map(async (image) => {
      const imageUrl = await uploadFileToFirebase(
        image.buffer,
        image.mimetype!,
        'community/images'
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
    
    // Upload new files
    const newFiles = await Promise.all(uploadedFiles.map(async (file) => {
      const fileUrl = await uploadFileToFirebase(
        file.buffer,
        file.mimetype!,
        'community/files'
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
    
    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    };
    
    // Only update fields that are provided
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = tags;
    if (pinned !== undefined) updateData.pinned = pinned;
    if (allowComments !== undefined) updateData.allowComments = allowComments;
    
    // Add new images and files if provided
    if (newImages.length > 0) {
      updateData.images = [...(post.images || []), ...newImages];
    }
    
    if (newFiles.length > 0) {
      updateData.files = [...(post.files || []), ...newFiles];
    }
    
    // Update post
    await postRef.update(updateData);
    
    // Get updated post
    const updatedDoc = await postRef.get();
    const updatedPost = updatedDoc.data()!;
    
    // Get user data
    const userDoc = await firestore.collection('users').doc(post.userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    
    res.json({
      success: true,
      message: 'Post updated successfully',
      data: {
        id: updatedDoc.id,
        ...updatedPost,
        user: userData ? {
          id: post.userId,
          displayName: userData.displayName,
          photoURL: userData.photoURL
        } : null
      }
    });
  } catch (error) {
    logger.error('Error updating post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update post',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Delete a post
 */
export const deletePost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if post exists
    const postRef = firestore.collection('posts').doc(id);
    const doc = await postRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
        message: `No post found with ID: ${id}`
      });
    }
    
    const post = doc.data()!;
    
    // Check if user is the owner or admin
    if (post.userId !== req.user?.uid && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Permission denied',
        message: 'You do not have permission to delete this post'
      });
    }
    
    // Delete comments
    const commentsSnapshot = await firestore
      .collection('comments')
      .where('postId', '==', id)
      .get();
    
    const batch = firestore.batch();
    commentsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete likes
    const likesSnapshot = await firestore
      .collection('postLikes')
      .where('postId', '==', id)
      .get();
    
    likesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete post
    batch.delete(postRef);
    
    await batch.commit();
    
    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete post',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Add a comment to a post
 */
export const addComment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, content, parentCommentId } = req.body;
    
    // Validate required fields
    if (!userId || !content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'userId and content are required'
      });
    }
    
    // Check if post exists
    const postRef = firestore.collection('posts').doc(id);
    const postDoc = await postRef.get();
    
    if (!postDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
        message: `No post found with ID: ${id}`
      });
    }
    
    const post = postDoc.data()!;
    
    // Check if comments are allowed
    if (!post.allowComments) {
      return res.status(403).json({
        success: false,
        error: 'Comments disabled',
        message: 'Comments are disabled for this post'
      });
    }
    
    // Check if parent comment exists if provided
    if (parentCommentId) {
      const parentCommentDoc = await firestore.collection('comments').doc(parentCommentId).get();
      
      if (!parentCommentDoc.exists) {
        return res.status(404).json({
          success: false,
          error: 'Parent comment not found',
          message: `No comment found with ID: ${parentCommentId}`
        });
      }
    }
    
    // Create comment document
    const commentData = {
      postId: id,
      userId,
      content,
      parentCommentId: parentCommentId || null,
      likeCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const commentRef = await firestore.collection('comments').add(commentData);
    
    // Get user data
    const userDoc = await firestore.collection('users').doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    
    // Notify post owner if not the same as commenter
    if (post.userId !== userId) {
      // Create notification
      await firestore.collection('notifications').add({
        userId: post.userId,
        title: 'New Comment',
        body: `${userData?.displayName || 'Someone'} commented on your post`,
        data: {
          type: 'new_comment',
          postId: id,
          commentId: commentRef.id
        },
        read: false,
        createdAt: new Date()
      });
    }
    
    // Notify parent comment owner if not the same as commenter
    if (parentCommentId) {
      const parentCommentDoc = await firestore.collection('comments').doc(parentCommentId).get();
      const parentComment = parentCommentDoc.data()!;
      
      if (parentComment.userId !== userId) {
        // Create notification
        await firestore.collection('notifications').add({
          userId: parentComment.userId,
          title: 'New Reply',
          body: `${userData?.displayName || 'Someone'} replied to your comment`,
          data: {
            type: 'new_reply',
            postId: id,
            commentId: commentRef.id,
            parentCommentId
          },
          read: false,
          createdAt: new Date()
        });
      }
    }
    
    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: {
        id: commentRef.id,
        ...commentData,
        user: userData ? {
          id: userId,
          displayName: userData.displayName,
          photoURL: userData.photoURL
        } : null
      }
    });
  } catch (error) {
    logger.error('Error adding comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add comment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Update a comment
 */
export const updateComment = async (req: Request, res: Response) => {
  try {
    const { id, commentId } = req.params;
    const { content } = req.body;
    
    // Validate required fields
    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'content is required'
      });
    }
    
    // Check if comment exists
    const commentRef = firestore.collection('comments').doc(commentId);
    const commentDoc = await commentRef.get();
    
    if (!commentDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found',
        message: `No comment found with ID: ${commentId}`
      });
    }
    
    const comment = commentDoc.data()!;
    
    // Check if comment belongs to the post
    if (comment.postId !== id) {
      return res.status(400).json({
        success: false,
        error: 'Invalid comment',
        message: 'Comment does not belong to this post'
      });
    }
    
    // Check if user is the owner or admin
    if (comment.userId !== req.user?.uid && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Permission denied',
        message: 'You do not have permission to update this comment'
      });
    }
    
    // Update comment
    await commentRef.update({
      content,
      updatedAt: new Date()
    });
    
    // Get updated comment
    const updatedCommentDoc = await commentRef.get();
    const updatedComment = updatedCommentDoc.data()!;
    
    // Get user data
    const userDoc = await firestore.collection('users').doc(comment.userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    
    res.json({
      success: true,
      message: 'Comment updated successfully',
      data: {
        id: commentId,
        ...updatedComment,
        user: userData ? {
          id: comment.userId,
          displayName: userData.displayName,
          photoURL: userData.photoURL
        } : null
      }
    });
  } catch (error) {
    logger.error('Error updating comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update comment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Delete a comment
 */
export const deleteComment = async (req: Request, res: Response) => {
  try {
    const { id, commentId } = req.params;
    
    // Check if comment exists
    const commentRef = firestore.collection('comments').doc(commentId);
    const commentDoc = await commentRef.get();
    
    if (!commentDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found',
        message: `No comment found with ID: ${commentId}`
      });
    }
    
    const comment = commentDoc.data()!;
    
    // Check if comment belongs to the post
    if (comment.postId !== id) {
      return res.status(400).json({
        success: false,
        error: 'Invalid comment',
        message: 'Comment does not belong to this post'
      });
    }
    
    // Check if user is the owner or admin
    if (comment.userId !== req.user?.uid && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Permission denied',
        message: 'You do not have permission to delete this comment'
      });
    }
    
    // Delete comment
    await commentRef.delete();
    
    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete comment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Like a post
 */
export const likePost = async (req: Request, res: Response) => {
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
    
    // Check if post exists
    const postRef = firestore.collection('posts').doc(id);
    const postDoc = await postRef.get();
    
    if (!postDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
        message: `No post found with ID: ${id}`
      });
    }
    
    // Check if user already liked the post
    const likeQuery = firestore.collection('postLikes')
      .where('postId', '==', id)
      .where('userId', '==', userId);
    
    const likeSnapshot = await likeQuery.get();
    
    if (!likeSnapshot.empty) {
      return res.status(400).json({
        success: false,
        error: 'Already liked',
        message: 'User has already liked this post'
      });
    }
    
    // Create like document
    await firestore.collection('postLikes').add({
      postId: id,
      userId,
      createdAt: new Date()
    });
    
    // Update post like count
    await postRef.update({
      likeCount: firestore.FieldValue.increment(1)
    });
    
    res.json({
      success: true,
      message: 'Post liked successfully'
    });
  } catch (error) {
    logger.error('Error liking post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to like post',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Unlike a post
 */
export const unlikePost = async (req: Request, res: Response) => {
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
    
    // Check if post exists
    const postRef = firestore.collection('posts').doc(id);
    const postDoc = await postRef.get();
    
    if (!postDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
        message: `No post found with ID: ${id}`
      });
    }
    
    // Find like document
    const likeQuery = firestore.collection('postLikes')
      .where('postId', '==', id)
      .where('userId', '==', userId);
    
    const likeSnapshot = await likeQuery.get();
    
    if (likeSnapshot.empty) {
      return res.status(400).json({
        success: false,
        error: 'Not liked',
        message: 'User has not liked this post'
      });
    }
    
    // Delete like document
    const batch = firestore.batch();
    likeSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    // Update post like count
    await postRef.update({
      likeCount: firestore.FieldValue.increment(-1)
    });
    
    res.json({
      success: true,
      message: 'Post unliked successfully'
    });
  } catch (error) {
    logger.error('Error unliking post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unlike post',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get categories
 */
export const getCategories = async (req: Request, res: Response) => {
  try {
    const categoriesSnapshot = await firestore.collection('categories').get();
    
    const categories = categoriesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    logger.error('Error getting categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get categories',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get popular tags
 */
export const getPopularTags = async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;
    
    const tagsSnapshot = await firestore.collection('tags')
      .orderBy('count', 'desc')
      .limit(Number(limit))
      .get();
    
    const tags = tagsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({
      success: true,
      data: tags
    });
  } catch (error) {
    logger.error('Error getting popular tags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get popular tags',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Report a post
 */
export const reportPost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, reason, details } = req.body;
    
    // Validate required fields
    if (!userId || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'userId and reason are required'
      });
    }
    
    // Check if post exists
    const postRef = firestore.collection('posts').doc(id);
    const postDoc = await postRef.get();
    
    if (!postDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Post not found',
        message: `No post found with ID: ${id}`
      });
    }
    
    // Create report document
    const reportData = {
      postId: id,
      userId,
      reason,
      details: details || '',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await firestore.collection('reports').add(reportData);
    
    res.status(201).json({
      success: true,
      message: 'Post reported successfully'
    });
  } catch (error) {
    logger.error('Error reporting post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to report post',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};