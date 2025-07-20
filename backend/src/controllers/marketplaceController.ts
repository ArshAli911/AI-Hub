import { Request, Response } from 'express';
import { marketplaceModel, MarketplaceFile, MarketplaceItem } from '../models/Marketplace';
import { userModel } from '../models/User';
import logger from '../services/loggerService';
import multer from 'multer';
import { uploadFileToFirebase } from '../services/fileUploadService';

// Configure Multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Middleware to handle marketplace item file uploads
export const marketplaceUploadMiddleware = upload.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'images', maxCount: 10 },
  { name: 'videos', maxCount: 5 },
  { name: 'files', maxCount: 20 },
]);

export const getMarketplaceItems = async (req: Request, res: Response) => {
  try {
    const { limit = 20, offset = 0, category, type } = req.query;
    const items = await marketplaceModel.getActiveItems(
      Number(limit),
      Number(offset),
      category as string,
      type as MarketplaceItem['type']
    );
    res.json({ message: 'Marketplace items retrieved successfully', items });
  } catch (error) {
    logger.error('Error fetching marketplace items:', error);
    res.status(500).json({ error: 'InternalServerError', message: 'Failed to fetch marketplace items' });
  }
};

export const getMarketplaceItemById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await marketplaceModel.getItemById(id);
    if (!item) {
      return res.status(404).json({ error: 'NotFoundError', message: 'Marketplace item not found' });
    }
    res.json({ message: 'Marketplace item retrieved successfully', item });
  } catch (error) {
    logger.error('Error fetching marketplace item:', error);
    res.status(500).json({ error: 'InternalServerError', message: 'Failed to fetch marketplace item' });
  }
};

export const createMarketplaceItem = async (req: Request, res: Response) => {
  try {
    const {
      sellerId,
      title,
      description,
      category,
      subcategory,
      tags,
      type,
      price,
      currency,
      originalPrice,
      discountPercentage,
      license,
      requirements,
      features,
      specifications,
      support,
      delivery,
      demoUrl,
      documentationUrl
    } = req.body;

    // Access files from req.files (after multer middleware)
    const uploadedThumbnail = (req.files as { [fieldname: string]: Express.Multer.File[] })?.thumbnail?.[0];
    const uploadedImages = (req.files as { [fieldname: string]: Express.Multer.File[] })?.images || [];
    const uploadedVideos = (req.files as { [fieldname: string]: Express.Multer.File[] })?.videos || [];
    const uploadedFiles = (req.files as { [fieldname: string]: Express.Multer.File[] })?.files || [];

    // Validate required fields
    if (!sellerId || !title || !description || !category || !type || !price || !currency) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Missing required fields: sellerId, title, description, category, type, price, currency'
      });
    }

    const seller = await userModel.getUserById(sellerId);
    if (!seller) {
      return res.status(404).json({ error: 'NotFoundError', message: 'Seller not found' });
    }

    // Helper to determine marketplace file type based on mimetype
    const getMarketplaceFileType = (mimetype: string): MarketplaceFile['type'] => {
      if (mimetype.startsWith('image/')) return 'product';
      if (mimetype.startsWith('video/')) return 'demo';
      if (mimetype.includes('document') || mimetype.includes('pdf')) return 'documentation';
      return 'other';
    };

    // Upload files to Firebase Storage and map to MarketplaceFile interface
    const processMarketplaceFiles = async (files: Express.Multer.File[], folder: string, isPreview: boolean = false): Promise<MarketplaceFile[]> => {
      return Promise.all(files.map(async (file) => {
        const fileUrl = await uploadFileToFirebase(file.buffer, file.mimetype!, `marketplace/${folder}`);
        return {
          id: Math.random().toString(36).substring(2, 15), // Simple unique ID
          name: file.originalname,
          type: getMarketplaceFileType(file.mimetype!),
          url: fileUrl,
          size: file.size,
          mimeType: file.mimetype!,
          isPreview: isPreview,
          uploadedAt: new Date(),
        };
      }));
    };

    let thumbnailUrl = uploadedThumbnail ? await uploadFileToFirebase(uploadedThumbnail.buffer, uploadedThumbnail.mimetype!, 'marketplace/thumbnails') : undefined;
    const imageFiles = await processMarketplaceFiles(uploadedImages, 'images', true);
    const videoFiles = await processMarketplaceFiles(uploadedVideos, 'videos', true);
    const otherFiles = await processMarketplaceFiles(uploadedFiles, 'files');

    const itemData: Omit<MarketplaceItem, 'id' | 'seller' | 'createdAt' | 'updatedAt' | 'stats' | 'metadata'> & { seller: any } = {
      sellerId,
      seller,
      title,
      description,
      category,
      subcategory,
      tags: tags || [],
      type: type as MarketplaceItem['type'],
      price,
      currency,
      originalPrice: originalPrice || price,
      discountPercentage: discountPercentage || 0,
      status: 'draft',
      visibility: 'public',
      thumbnailUrl,
      images: imageFiles.map(f => f.url),
      videos: videoFiles.map(f => f.url),
      files: otherFiles,
      demoUrl,
      documentationUrl,
      requirements: requirements || [],
      features: features || [],
      specifications: specifications || {},
      license,
      support: support || { included: false },
      delivery: delivery || { type: 'instant' },
    };

    const newItem = await marketplaceModel.createItem(itemData as any);

    logger.info(`Marketplace item created: ${newItem.id} by ${sellerId}`);

    res.status(201).json({
      message: 'Marketplace item created successfully',
      item: newItem,
    });
  } catch (error) {
    logger.error('Error creating marketplace item:', error);
    res.status(500).json({ error: 'InternalServerError', message: 'Failed to create marketplace item' });
  }
};

export const updateMarketplaceItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const item = await marketplaceModel.getItemById(id);
    if (!item) {
      return res.status(404).json({ error: 'NotFoundError', message: 'Marketplace item not found' });
    }

    // Handle file updates (similar to create, but selectively update based on incoming files)
    // For simplicity, this example assumes new files overwrite old ones or are added.
    // A more robust solution would track deletions/additions more precisely.
    const uploadedThumbnail = (req.files as { [fieldname: string]: Express.Multer.File[] })?.thumbnail?.[0];
    const uploadedImages = (req.files as { [fieldname: string]: Express.Multer.File[] })?.images || [];
    const uploadedVideos = (req.files as { [fieldname: string]: Express.Multer.File[] })?.videos || [];
    const uploadedFiles = (req.files as { [fieldname: string]: Express.Multer.File[] })?.files || [];

    const getMarketplaceFileType = (mimetype: string): MarketplaceFile['type'] => {
      if (mimetype.startsWith('image/')) return 'product';
      if (mimetype.startsWith('video/')) return 'demo';
      if (mimetype.includes('document') || mimetype.includes('pdf')) return 'documentation';
      return 'other';
    };

    const processMarketplaceFiles = async (files: Express.Multer.File[], folder: string, isPreview: boolean = false): Promise<MarketplaceFile[]> => {
      return Promise.all(files.map(async (file) => {
        const fileUrl = await uploadFileToFirebase(file.buffer, file.mimetype!, `marketplace/${folder}`);
        return {
          id: Math.random().toString(36).substring(2, 15), // Simple unique ID
          name: file.originalname,
          type: getMarketplaceFileType(file.mimetype!),
          url: fileUrl,
          size: file.size,
          mimeType: file.mimetype!,
          isPreview: isPreview,
          uploadedAt: new Date(),
        };
      }));
    };

    if (uploadedThumbnail) {
      updates.thumbnailUrl = await uploadFileToFirebase(uploadedThumbnail.buffer, uploadedThumbnail.mimetype!, 'marketplace/thumbnails');
    }
    if (uploadedImages.length > 0) {
      const newImageFiles = await processMarketplaceFiles(uploadedImages, 'images', true);
      updates.images = [...item.images, ...newImageFiles.map(f => f.url)];
    }
    if (uploadedVideos.length > 0) {
      const newVideoFiles = await processMarketplaceFiles(uploadedVideos, 'videos', true);
      updates.videos = [...item.videos, ...newVideoFiles.map(f => f.url)];
    }
    if (uploadedFiles.length > 0) {
      const newOtherFiles = await processMarketplaceFiles(uploadedFiles, 'files');
      updates.files = [...item.files, ...newOtherFiles];
    }

    const updatedItem = await marketplaceModel.updateItem(id, updates);

    logger.info(`Marketplace item updated: ${updatedItem.id}`);
    res.json({ message: 'Marketplace item updated successfully', item: updatedItem });
  } catch (error) {
    logger.error('Error updating marketplace item:', error);
    res.status(500).json({ error: 'InternalServerError', message: 'Failed to update marketplace item' });
  }
};

export const deleteMarketplaceItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Implement deletion logic, possibly including deleting files from Firebase Storage
    await marketplaceModel.deleteItem(id);
    logger.info(`Marketplace item deleted: ${id}`);
    res.json({ message: 'Marketplace item deleted successfully' });
  } catch (error) {
    logger.error('Error deleting marketplace item:', error);
    res.status(500).json({ error: 'InternalServerError', message: 'Failed to delete marketplace item' });
  }
}; 