import { getFirestore } from 'firebase-admin/firestore';
import { User } from './User';

export interface MarketplaceItem {
  id: string;
  sellerId: string;
  seller: User;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  tags: string[];
  type: 'product' | 'service' | 'template' | 'course' | 'consultation';
  price: number;
  currency: string;
  originalPrice?: number;
  discountPercentage?: number;
  status: 'draft' | 'active' | 'inactive' | 'sold_out' | 'featured';
  visibility: 'public' | 'private' | 'unlisted';
  thumbnailUrl?: string;
  images: string[];
  videos: string[];
  files: MarketplaceFile[];
  demoUrl?: string;
  documentationUrl?: string;
  requirements: string[];
  features: string[];
  specifications: Record<string, any>;
  license: string;
  support: {
    included: boolean;
    duration?: number; // days
    type?: 'email' | 'chat' | 'phone' | 'video';
  };
  delivery: {
    type: 'instant' | 'manual' | 'scheduled';
    estimatedTime?: number; // hours
    instructions?: string;
  };
  stats: MarketplaceItemStats;
  metadata: MarketplaceItemMetadata;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface MarketplaceFile {
  id: string;
  name: string;
  type: 'product' | 'documentation' | 'demo' | 'source' | 'other';
  url: string;
  size: number; // bytes
  mimeType: string;
  isPreview: boolean;
  uploadedAt: Date;
}

export interface MarketplaceItemStats {
  views: number;
  likes: number;
  purchases: number;
  revenue: number;
  reviews: number;
  averageRating: number;
  totalRatings: number;
  shares: number;
  downloads: number;
}

export interface MarketplaceItemMetadata {
  lastModified: Date;
  fileSize: number; // total size in bytes
  language: string;
  compatibility: string[];
  version: string;
  updates: number;
  lastUpdate: Date;
}

export interface MarketplaceReview {
  id: string;
  itemId: string;
  buyerId: string;
  buyer: User;
  orderId: string;
  rating: number; // 1-5
  title: string;
  comment: string;
  categories: {
    quality: number;
    value: number;
    support: number;
    ease_of_use: number;
    documentation: number;
  };
  isVerified: boolean;
  isHelpful: number; // count of helpful votes
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketplaceOrder {
  id: string;
  buyerId: string;
  buyer: User;
  sellerId: string;
  seller: User;
  itemId: string;
  item: MarketplaceItem;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  status: 'pending' | 'paid' | 'processing' | 'delivered' | 'completed' | 'cancelled' | 'refunded';
  paymentMethod: string;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  transactionId?: string;
  deliveryMethod: string;
  deliveryStatus: 'pending' | 'sent' | 'delivered' | 'failed';
  trackingNumber?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
  deliveredAt?: Date;
}

export interface MarketplaceCart {
  id: string;
  userId: string;
  items: CartItem[];
  totalPrice: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartItem {
  itemId: string;
  item: MarketplaceItem;
  quantity: number;
  price: number;
  addedAt: Date;
}

export interface MarketplaceWishlist {
  id: string;
  userId: string;
  itemId: string;
  item: MarketplaceItem;
  addedAt: Date;
}

class MarketplaceModel {
  private db = getFirestore();
  private collection = this.db.collection('marketplace_items');
  private reviewsCollection = this.db.collection('marketplace_reviews');
  private ordersCollection = this.db.collection('marketplace_orders');
  private cartsCollection = this.db.collection('marketplace_carts');
  private wishlistsCollection = this.db.collection('marketplace_wishlists');

  /**
   * Create a new marketplace item
   */
  async createItem(itemData: Omit<MarketplaceItem, 'id' | 'seller' | 'createdAt' | 'updatedAt' | 'stats' | 'metadata'> & { seller: User }): Promise<MarketplaceItem> {
    try {
      const now = new Date();
      const item: MarketplaceItem = {
        ...itemData,
        id: this.db.collection('dummy').doc().id,
        seller: itemData.seller,
        createdAt: now,
        updatedAt: now,
        status: 'draft',
        visibility: 'private',
        stats: {
          views: 0,
          likes: 0,
          purchases: 0,
          revenue: 0,
          reviews: 0,
          averageRating: 0,
          totalRatings: 0,
          shares: 0,
          downloads: 0
        },
        metadata: {
          lastModified: now,
          fileSize: 0,
          language: 'en',
          compatibility: [],
          version: '1.0.0',
          updates: 0,
          lastUpdate: now
        }
      };

      await this.collection.doc(item.id).set(item);
      return item;
    } catch (error) {
      console.error('Error creating marketplace item:', error);
      throw new Error('Failed to create marketplace item');
    }
  }

  /**
   * Get marketplace item by ID
   */
  async getItemById(id: string): Promise<MarketplaceItem | null> {
    try {
      const doc = await this.collection.doc(id).get();
      if (!doc.exists) {
        return null;
      }
      return doc.data() as MarketplaceItem;
    } catch (error) {
      console.error('Error fetching marketplace item:', error);
      throw new Error('Failed to fetch marketplace item');
    }
  }

  /**
   * Get items by seller
   */
  async getItemsBySeller(sellerId: string, status?: string): Promise<MarketplaceItem[]> {
    try {
      let query = this.collection.where('sellerId', '==', sellerId);
      
      if (status) {
        query = query.where('status', '==', status);
      }

      const snapshot = await query.orderBy('createdAt', 'desc').get();
      return snapshot.docs.map(doc => doc.data() as MarketplaceItem);
    } catch (error) {
      console.error('Error fetching items by seller:', error);
      throw new Error('Failed to fetch items by seller');
    }
  }

  /**
   * Get active marketplace items
   */
  async getActiveItems(limit: number = 20, offset: number = 0, category?: string, type?: string): Promise<MarketplaceItem[]> {
    try {
      let query = this.collection
        .where('status', '==', 'active')
        .where('visibility', '==', 'public');

      if (category) {
        query = query.where('category', '==', category);
      }

      if (type) {
        query = query.where('type', '==', type);
      }

      const snapshot = await query
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset)
        .get();

      return snapshot.docs.map(doc => doc.data() as MarketplaceItem);
    } catch (error) {
      console.error('Error fetching active marketplace items:', error);
      throw new Error('Failed to fetch active marketplace items');
    }
  }

  /**
   * Search marketplace items
   */
  async searchItems(query: string, limit: number = 20): Promise<MarketplaceItem[]> {
    try {
      const snapshot = await this.collection
        .where('status', '==', 'active')
        .where('visibility', '==', 'public')
        .orderBy('title')
        .startAt(query)
        .endAt(query + '\uf8ff')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => doc.data() as MarketplaceItem);
    } catch (error) {
      console.error('Error searching marketplace items:', error);
      throw new Error('Failed to search marketplace items');
    }
  }

  /**
   * Update marketplace item
   */
  async updateItem(id: string, updates: Partial<MarketplaceItem>): Promise<MarketplaceItem> {
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
      
      const updatedItem = await this.getItemById(id);
      if (!updatedItem) {
        throw new Error('Marketplace item not found after update');
      }
      
      return updatedItem;
    } catch (error) {
      console.error('Error updating marketplace item:', error);
      throw new Error('Failed to update marketplace item');
    }
  }

  /**
   * Delete marketplace item
   */
  async deleteItem(id: string): Promise<void> {
    try {
      await this.collection.doc(id).delete();
    } catch (error) {
      console.error('Error deleting marketplace item:', error);
      throw new Error('Failed to delete marketplace item');
    }
  }

  /**
   * Add review to marketplace item
   */
  async addReview(reviewData: Omit<MarketplaceReview, 'id' | 'buyer' | 'createdAt' | 'updatedAt'> & { buyer: User }): Promise<MarketplaceReview> {
    try {
      const now = new Date();
      const review: MarketplaceReview = {
        ...reviewData,
        id: this.db.collection('dummy').doc().id,
        buyer: reviewData.buyer,
        createdAt: now,
        updatedAt: now,
        isVerified: false,
        isHelpful: 0
      };

      await this.reviewsCollection.doc(review.id).set(review);
      
      // Update item stats
      await this.updateItemStats(reviewData.itemId);
      
      return review;
    } catch (error) {
      console.error('Error adding review:', error);
      throw new Error('Failed to add review');
    }
  }

  /**
   * Get item reviews
   */
  async getItemReviews(itemId: string, limit: number = 20): Promise<MarketplaceReview[]> {
    try {
      const snapshot = await this.reviewsCollection
        .where('itemId', '==', itemId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => doc.data() as MarketplaceReview);
    } catch (error) {
      console.error('Error fetching item reviews:', error);
      throw new Error('Failed to fetch item reviews');
    }
  }

  /**
   * Create order
   */
  async createOrder(orderData: Omit<MarketplaceOrder, 'id' | 'buyer' | 'seller' | 'item' | 'createdAt' | 'updatedAt'> & { buyer: User; seller: User; item: MarketplaceItem }): Promise<MarketplaceOrder> {
    try {
      const now = new Date();
      const order: MarketplaceOrder = {
        ...orderData,
        id: this.db.collection('dummy').doc().id,
        buyer: orderData.buyer,
        seller: orderData.seller,
        item: orderData.item,
        createdAt: now,
        updatedAt: now,
        status: 'pending',
        paymentStatus: 'pending'
      };

      await this.ordersCollection.doc(order.id).set(order);
      return order;
    } catch (error) {
      console.error('Error creating order:', error);
      throw new Error('Failed to create order');
    }
  }

  /**
   * Get user orders
   */
  async getUserOrders(userId: string, role: 'buyer' | 'seller'): Promise<MarketplaceOrder[]> {
    try {
      const field = role === 'buyer' ? 'buyerId' : 'sellerId';
      const snapshot = await this.ordersCollection
        .where(field, '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => doc.data() as MarketplaceOrder);
    } catch (error) {
      console.error('Error fetching user orders:', error);
      throw new Error('Failed to fetch user orders');
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: MarketplaceOrder['status']): Promise<MarketplaceOrder> {
    try {
      const updateData = {
        status,
        updatedAt: new Date()
      };

      if (status === 'paid') {
        updateData.paidAt = new Date();
      } else if (status === 'delivered') {
        updateData.deliveredAt = new Date();
      }

      await this.ordersCollection.doc(orderId).update(updateData);
      
      const doc = await this.ordersCollection.doc(orderId).get();
      if (!doc.exists) {
        throw new Error('Order not found');
      }
      
      return doc.data() as MarketplaceOrder;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw new Error('Failed to update order status');
    }
  }

  /**
   * Get or create user cart
   */
  async getUserCart(userId: string): Promise<MarketplaceCart> {
    try {
      const snapshot = await this.cartsCollection
        .where('userId', '==', userId)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        return snapshot.docs[0].data() as MarketplaceCart;
      }

      // Create new cart
      const now = new Date();
      const cart: MarketplaceCart = {
        id: this.db.collection('dummy').doc().id,
        userId,
        items: [],
        totalPrice: 0,
        currency: 'USD',
        createdAt: now,
        updatedAt: now
      };

      await this.cartsCollection.doc(cart.id).set(cart);
      return cart;
    } catch (error) {
      console.error('Error getting user cart:', error);
      throw new Error('Failed to get user cart');
    }
  }

  /**
   * Add item to cart
   */
  async addToCart(userId: string, itemId: string, quantity: number = 1): Promise<MarketplaceCart> {
    try {
      const cart = await this.getUserCart(userId);
      const item = await this.getItemById(itemId);
      
      if (!item) {
        throw new Error('Item not found');
      }

      const existingItemIndex = cart.items.findIndex(cartItem => cartItem.itemId === itemId);
      
      if (existingItemIndex >= 0) {
        cart.items[existingItemIndex].quantity += quantity;
        cart.items[existingItemIndex].price = item.price * cart.items[existingItemIndex].quantity;
      } else {
        cart.items.push({
          itemId,
          item,
          quantity,
          price: item.price * quantity,
          addedAt: new Date()
        });
      }

      cart.totalPrice = cart.items.reduce((sum, cartItem) => sum + cartItem.price, 0);
      cart.updatedAt = new Date();

      await this.cartsCollection.doc(cart.id).set(cart);
      return cart;
    } catch (error) {
      console.error('Error adding item to cart:', error);
      throw new Error('Failed to add item to cart');
    }
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(userId: string, itemId: string): Promise<MarketplaceCart> {
    try {
      const cart = await this.getUserCart(userId);
      
      cart.items = cart.items.filter(item => item.itemId !== itemId);
      cart.totalPrice = cart.items.reduce((sum, cartItem) => sum + cartItem.price, 0);
      cart.updatedAt = new Date();

      await this.cartsCollection.doc(cart.id).set(cart);
      return cart;
    } catch (error) {
      console.error('Error removing item from cart:', error);
      throw new Error('Failed to remove item from cart');
    }
  }

  /**
   * Add item to wishlist
   */
  async addToWishlist(userId: string, itemId: string): Promise<MarketplaceWishlist> {
    try {
      const item = await this.getItemById(itemId);
      if (!item) {
        throw new Error('Item not found');
      }

      const wishlistItem: MarketplaceWishlist = {
        id: this.db.collection('dummy').doc().id,
        userId,
        itemId,
        item,
        addedAt: new Date()
      };

      await this.wishlistsCollection.doc(wishlistItem.id).set(wishlistItem);
      return wishlistItem;
    } catch (error) {
      console.error('Error adding item to wishlist:', error);
      throw new Error('Failed to add item to wishlist');
    }
  }

  /**
   * Get user wishlist
   */
  async getUserWishlist(userId: string): Promise<MarketplaceWishlist[]> {
    try {
      const snapshot = await this.wishlistsCollection
        .where('userId', '==', userId)
        .orderBy('addedAt', 'desc')
        .get();

      return snapshot.docs.map(doc => doc.data() as MarketplaceWishlist);
    } catch (error) {
      console.error('Error fetching user wishlist:', error);
      throw new Error('Failed to fetch user wishlist');
    }
  }

  /**
   * Update item stats
   */
  async updateItemStats(itemId: string): Promise<void> {
    try {
      const [reviewsSnapshot, ordersSnapshot] = await Promise.all([
        this.reviewsCollection.where('itemId', '==', itemId).get(),
        this.ordersCollection.where('itemId', '==', itemId).where('status', '==', 'completed').get()
      ]);

      const totalRatings = reviewsSnapshot.size;
      const averageRating = totalRatings > 0 
        ? reviewsSnapshot.docs.reduce((sum, doc) => sum + (doc.data() as MarketplaceReview).rating, 0) / totalRatings
        : 0;

      const totalRevenue = ordersSnapshot.docs.reduce((sum, doc) => {
        const order = doc.data() as MarketplaceOrder;
        return sum + order.totalPrice;
      }, 0);

      const stats: MarketplaceItemStats = {
        views: 0, // This would be tracked separately
        likes: 0, // This would be tracked separately
        purchases: ordersSnapshot.size,
        revenue: totalRevenue,
        reviews: totalRatings,
        averageRating,
        totalRatings,
        shares: 0, // This would be tracked separately
        downloads: 0 // This would be tracked separately
      };

      await this.updateItem(id, { stats });
    } catch (error) {
      console.error('Error updating item stats:', error);
      throw new Error('Failed to update item stats');
    }
  }

  /**
   * Increment item view count
   */
  async incrementViews(itemId: string): Promise<void> {
    try {
      const item = await this.getItemById(itemId);
      if (!item) {
        throw new Error('Item not found');
      }

      const updatedStats = {
        ...item.stats,
        views: item.stats.views + 1
      };

      await this.updateItem(itemId, { stats: updatedStats });
    } catch (error) {
      console.error('Error incrementing item views:', error);
      throw new Error('Failed to increment item views');
    }
  }
}

export const marketplaceModel = new MarketplaceModel();
export default marketplaceModel; 