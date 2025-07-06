import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

// Validation schemas
export const schemas = {
  // User creation schema
  createUser: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    displayName: Joi.string().min(2).max(50).optional(),
    customClaims: Joi.object().optional(),
  }),

  // Set custom claims schema
  setCustomClaims: Joi.object({
    uid: Joi.string().required(),
    customClaims: Joi.object().required(),
  }),

  // Marketplace item schema
  marketplaceItem: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().min(1).max(1000).optional(),
    price: Joi.number().positive().optional(),
    category: Joi.string().min(1).max(50).optional(),
    imageUrl: Joi.string().uri().optional(),
  }),

  // Mentor booking schema
  mentorBooking: Joi.object({
    mentorId: Joi.string().required(),
    userId: Joi.string().required(),
    requestedTime: Joi.date().greater('now').required(),
    sessionType: Joi.string().valid('chat', 'video').required(),
    notes: Joi.string().max(500).optional(),
  }),

  // Prototype schema
  prototype: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    description: Joi.string().min(1).max(1000).required(),
    creatorId: Joi.string().required(),
    imageUrl: Joi.string().uri().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
  }),

  // Feedback schema
  feedback: Joi.object({
    userId: Joi.string().required(),
    userName: Joi.string().min(1).max(50).required(),
    comment: Joi.string().min(1).max(1000).required(),
    rating: Joi.number().integer().min(1).max(5).required(),
  }),

  // Notification schema
  notification: Joi.object({
    token: Joi.string().when('topic', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),
    topic: Joi.string().when('token', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),
    title: Joi.string().min(1).max(100).required(),
    body: Joi.string().min(1).max(500).required(),
    data: Joi.object().optional(),
  }),
};

// Validation middleware factory
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all validation errors
      stripUnknown: true, // Remove unknown properties
    });

    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(', ');
      return res.status(400).json({
        error: 'Validation failed',
        message: errorMessage,
        details: error.details,
      });
    }

    // Replace req.body with validated data
    req.body = value;
    next();
  };
};

// URL parameter validation middleware
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(', ');
      return res.status(400).json({
        error: 'Invalid parameters',
        message: errorMessage,
        details: error.details,
      });
    }

    req.params = value;
    next();
  };
};

// Query parameter validation middleware
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(', ');
      return res.status(400).json({
        error: 'Invalid query parameters',
        message: errorMessage,
        details: error.details,
      });
    }

    req.query = value;
    next();
  };
}; 