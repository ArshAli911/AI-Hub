import { Request, Response } from 'express';
import { mentorModel, Mentor, MentorSession, MentorReview } from '../models/Mentor';
import { userModel, UserRole } from '../models/User';
import logger from '../services/loggerService';

export const createMentor = async (req: Request, res: Response) => {
  try {
    const { uid, specialty, expertise, bio, hourlyRate, currency, availability, profile } = req.body;
    const requestingUser = req.user;

    // Validate required fields
    if (!uid || !specialty || !expertise || !bio || !hourlyRate || !currency) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Missing required fields: uid, specialty, expertise, bio, hourlyRate, currency'
      });
    }

    // Check if user exists and is not already a mentor
    const user = await userModel.getUserById(uid);
    if (!user) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'User not found'
      });
    }

    const existingMentor = await mentorModel.getMentorById(uid);
    if (existingMentor) {
      return res.status(409).json({
        error: 'ConflictError',
        message: 'User is already a mentor'
      });
    }

    // Create mentor
    const mentorData = {
      uid,
      user,
      specialty,
      expertise,
      bio,
      hourlyRate,
      currency,
      availability: availability || [],
      profile
    };

    const mentor = await mentorModel.createMentor(mentorData);

    // Update user role to mentor
    await userModel.updateUserRole(uid, UserRole.MENTOR, ['host_session']);

    logger.info(`Mentor created successfully: ${uid}`);

    res.status(201).json({
      message: 'Mentor created successfully',
      mentor: {
        uid: mentor.uid,
        specialty: mentor.specialty,
        expertise: mentor.expertise,
        bio: mentor.bio,
        hourlyRate: mentor.hourlyRate,
        currency: mentor.currency,
        rating: mentor.rating,
        totalReviews: mentor.totalReviews,
        isActive: mentor.isActive,
        isVerified: mentor.isVerified
      }
    });
  } catch (error) {
    logger.error('Error creating mentor:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to create mentor'
    });
  }
};

export const getMentorById = async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;

    const mentor = await mentorModel.getMentorById(uid);
    if (!mentor || !mentor.isActive) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'Mentor not found or inactive'
      });
    }

    res.json({
      message: 'Mentor retrieved successfully',
      mentor: {
        uid: mentor.uid,
        user: {
          uid: mentor.user.uid,
          firstName: mentor.user.firstName,
          lastName: mentor.user.lastName,
          displayName: mentor.user.displayName,
          photoURL: mentor.user.photoURL,
          bio: mentor.user.bio
        },
        specialty: mentor.specialty,
        expertise: mentor.expertise,
        bio: mentor.bio,
        hourlyRate: mentor.hourlyRate,
        currency: mentor.currency,
        availability: mentor.availability,
        rating: mentor.rating,
        totalReviews: mentor.totalReviews,
        totalSessions: mentor.totalSessions,
        completedSessions: mentor.completedSessions,
        isVerified: mentor.isVerified,
        profile: mentor.profile,
        stats: mentor.stats
      }
    });
  } catch (error) {
    logger.error('Error fetching mentor:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to fetch mentor'
    });
  }
};

export const getActiveMentors = async (req: Request, res: Response) => {
  try {
    const { limit = 20, offset = 0, specialty } = req.query;

    let mentors;
    if (specialty) {
      mentors = await mentorModel.searchMentorsBySpecialty(specialty as string, Number(limit));
    } else {
      mentors = await mentorModel.getActiveMentors(Number(limit), Number(offset));
    }

    res.json({
      message: 'Active mentors retrieved successfully',
      mentors: mentors.map(mentor => ({
        uid: mentor.uid,
        user: {
          uid: mentor.user.uid,
          firstName: mentor.user.firstName,
          lastName: mentor.user.lastName,
          displayName: mentor.user.displayName,
          photoURL: mentor.user.photoURL
        },
        specialty: mentor.specialty,
        expertise: mentor.expertise,
        bio: mentor.bio,
        hourlyRate: mentor.hourlyRate,
        currency: mentor.currency,
        rating: mentor.rating,
        totalReviews: mentor.totalReviews,
        totalSessions: mentor.totalSessions,
        isVerified: mentor.isVerified
      })),
      count: mentors.length,
      limit: Number(limit),
      offset: Number(offset)
    });
  } catch (error) {
    logger.error('Error fetching active mentors:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to fetch active mentors'
    });
  }
};

export const updateMentor = async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const requestingUser = req.user;
    const updates = req.body;

    // Check if user is updating their own mentor profile or has admin permissions
    if (requestingUser?.uid !== uid && requestingUser?.role !== UserRole.ADMIN) {
      return res.status(403).json({
        error: 'ForbiddenError',
        message: 'Insufficient permissions to update this mentor'
      });
    }

    const mentor = await mentorModel.getMentorById(uid);
    if (!mentor) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'Mentor not found'
      });
    }

    const updatedMentor = await mentorModel.updateMentor(uid, updates);

    logger.info(`Mentor updated successfully: ${uid}`);

    res.json({
      message: 'Mentor updated successfully',
      mentor: {
        uid: updatedMentor.uid,
        specialty: updatedMentor.specialty,
        expertise: updatedMentor.expertise,
        bio: updatedMentor.bio,
        hourlyRate: updatedMentor.hourlyRate,
        currency: updatedMentor.currency,
        availability: updatedMentor.availability,
        rating: updatedMentor.rating,
        totalReviews: updatedMentor.totalReviews,
        isActive: updatedMentor.isActive,
        isVerified: updatedMentor.isVerified,
        profile: updatedMentor.profile,
        updatedAt: updatedMentor.updatedAt
      }
    });
  } catch (error) {
    logger.error('Error updating mentor:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to update mentor'
    });
  }
};

export const createSession = async (req: Request, res: Response) => {
  try {
    const { mentorId, scheduledAt, duration, sessionType, notes } = req.body;
    const requestingUser = req.user;

    if (!requestingUser) {
      return res.status(401).json({
        error: 'UnauthorizedError',
        message: 'Authentication required'
      });
    }

    // Validate required fields
    if (!mentorId || !scheduledAt || !duration || !sessionType) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Missing required fields: mentorId, scheduledAt, duration, sessionType'
      });
    }

    // Get mentor and student data
    const [mentor, student] = await Promise.all([
      mentorModel.getMentorById(mentorId),
      userModel.getUserById(requestingUser.uid)
    ]);

    if (!mentor || !mentor.isActive) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'Mentor not found or inactive'
      });
    }

    if (!student) {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'Student not found'
      });
    }

    // Check availability
    const isAvailable = await mentorModel.checkAvailability(mentorId, new Date(scheduledAt), duration);
    if (!isAvailable) {
      return res.status(409).json({
        error: 'ConflictError',
        message: 'Mentor is not available at the requested time'
      });
    }

    // Calculate price
    const price = (mentor.hourlyRate / 60) * duration;

    // Create session
    const sessionData = {
      mentorId,
      studentId: requestingUser.uid,
      scheduledAt: new Date(scheduledAt),
      duration,
      sessionType,
      price,
      currency: mentor.currency,
      notes
    };

    const session = await mentorModel.createSession(sessionData);

    logger.info(`Session created: ${session.id} between ${mentorId} and ${requestingUser.uid}`);

    res.status(201).json({
      message: 'Session created successfully',
      session: {
        id: session.id,
        mentorId: session.mentorId,
        studentId: session.studentId,
        scheduledAt: session.scheduledAt,
        duration: session.duration,
        sessionType: session.sessionType,
        price: session.price,
        currency: session.currency,
        status: session.status,
        notes: session.notes
      }
    });
  } catch (error) {
    logger.error('Error creating session:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to create session'
    });
  }
};

export const getMentorSessions = async (req: Request, res: Response) => {
  try {
    const { mentorId } = req.params;
    const { status } = req.query;
    const requestingUser = req.user;

    // Check if user is the mentor or has admin permissions
    if (requestingUser?.uid !== mentorId && requestingUser?.role !== UserRole.ADMIN) {
      return res.status(403).json({
        error: 'ForbiddenError',
        message: 'Insufficient permissions to view mentor sessions'
      });
    }

    const sessions = await mentorModel.getMentorSessions(mentorId, status as string);

    res.json({
      message: 'Mentor sessions retrieved successfully',
      sessions: sessions.map(session => ({
        id: session.id,
        mentorId: session.mentorId,
        studentId: session.studentId,
        scheduledAt: session.scheduledAt,
        duration: session.duration,
        sessionType: session.sessionType,
        price: session.price,
        currency: session.currency,
        status: session.status,
        notes: session.notes,
        meetingLink: session.meetingLink,
        createdAt: session.createdAt
      })),
      count: sessions.length
    });
  } catch (error) {
    logger.error('Error fetching mentor sessions:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to fetch mentor sessions'
    });
  }
};

export const getStudentSessions = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const { status } = req.query;
    const requestingUser = req.user;

    // Check if user is the student or has admin permissions
    if (requestingUser?.uid !== studentId && requestingUser?.role !== UserRole.ADMIN) {
      return res.status(403).json({
        error: 'ForbiddenError',
        message: 'Insufficient permissions to view student sessions'
      });
    }

    const sessions = await mentorModel.getStudentSessions(studentId, status as string);

    res.json({
      message: 'Student sessions retrieved successfully',
      sessions: sessions.map(session => ({
        id: session.id,
        mentorId: session.mentorId,
        studentId: session.studentId,
        scheduledAt: session.scheduledAt,
        duration: session.duration,
        sessionType: session.sessionType,
        price: session.price,
        currency: session.currency,
        status: session.status,
        notes: session.notes,
        meetingLink: session.meetingLink,
        createdAt: session.createdAt
      })),
      count: sessions.length
    });
  } catch (error) {
    logger.error('Error fetching student sessions:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to fetch student sessions'
    });
  }
};

export const updateSessionStatus = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { status } = req.body;
    const requestingUser = req.user;

    if (!requestingUser) {
      return res.status(401).json({
        error: 'UnauthorizedError',
        message: 'Authentication required'
      });
    }

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Invalid status'
      });
    }

    const session = await mentorModel.updateSessionStatus(sessionId, status);

    logger.info(`Session status updated: ${sessionId} -> ${status}`);

    res.json({
      message: 'Session status updated successfully',
      session: {
        id: session.id,
        mentorId: session.mentorId,
        studentId: session.studentId,
        scheduledAt: session.scheduledAt,
        duration: session.duration,
        sessionType: session.sessionType,
        price: session.price,
        currency: session.currency,
        status: session.status,
        notes: session.notes,
        updatedAt: session.updatedAt
      }
    });
  } catch (error) {
    logger.error('Error updating session status:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to update session status'
    });
  }
};

export const addSessionFeedback = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
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

    const feedback = {
      rating,
      comment,
      categories: {
        communication: categories?.communication || rating,
        expertise: categories?.expertise || rating,
        helpfulness: categories?.helpfulness || rating,
        punctuality: categories?.punctuality || rating
      }
    };

    await mentorModel.addSessionFeedback(sessionId, feedback);

    logger.info(`Session feedback added: ${sessionId} by ${requestingUser.uid}`);

    res.json({
      message: 'Session feedback added successfully'
    });
  } catch (error) {
    logger.error('Error adding session feedback:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to add session feedback'
    });
  }
};

export const createReview = async (req: Request, res: Response) => {
  try {
    const { mentorId, sessionId, rating, comment, categories } = req.body;
    const requestingUser = req.user;

    if (!requestingUser) {
      return res.status(401).json({
        error: 'UnauthorizedError',
        message: 'Authentication required'
      });
    }

    // Validate required fields
    if (!mentorId || !sessionId || !rating || !comment) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Missing required fields: mentorId, sessionId, rating, comment'
      });
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Rating must be between 1 and 5'
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

    const reviewData = {
      mentorId,
      reviewerId: requestingUser.uid,
      sessionId,
      rating,
      comment,
      categories: {
        communication: categories?.communication || rating,
        expertise: categories?.expertise || rating,
        helpfulness: categories?.helpfulness || rating,
        punctuality: categories?.punctuality || rating
      },
      user
    };

    const review = await mentorModel.createReview(reviewData);

    logger.info(`Review created: ${review.id} for mentor ${mentorId}`);

    res.status(201).json({
      message: 'Review created successfully',
      review: {
        id: review.id,
        mentorId: review.mentorId,
        reviewerId: review.reviewerId,
        sessionId: review.sessionId,
        rating: review.rating,
        comment: review.comment,
        categories: review.categories,
        isVerified: review.isVerified,
        createdAt: review.createdAt
      }
    });
  } catch (error) {
    logger.error('Error creating review:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to create review'
    });
  }
};

export const getMentorReviews = async (req: Request, res: Response) => {
  try {
    const { mentorId } = req.params;
    const { limit = 20 } = req.query;

    const reviews = await mentorModel.getMentorReviews(mentorId, Number(limit));

    res.json({
      message: 'Mentor reviews retrieved successfully',
      reviews: reviews.map(review => ({
        id: review.id,
        mentorId: review.mentorId,
        reviewerId: review.reviewerId,
        sessionId: review.sessionId,
        rating: review.rating,
        comment: review.comment,
        categories: review.categories,
        isVerified: review.isVerified,
        isHelpful: review.isHelpful,
        createdAt: review.createdAt
      })),
      count: reviews.length
    });
  } catch (error) {
    logger.error('Error fetching mentor reviews:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to fetch mentor reviews'
    });
  }
};

export const checkAvailability = async (req: Request, res: Response) => {
  try {
    const { mentorId } = req.params;
    const { date, duration } = req.query;

    if (!date || !duration) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Missing required fields: date, duration'
      });
    }

    const isAvailable = await mentorModel.checkAvailability(
      mentorId,
      new Date(date as string),
      Number(duration)
    );

    res.json({
      message: 'Availability check completed',
      mentorId,
      date: new Date(date as string),
      duration: Number(duration),
      isAvailable
    });
  } catch (error) {
    logger.error('Error checking availability:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to check availability'
    });
  }
}; 