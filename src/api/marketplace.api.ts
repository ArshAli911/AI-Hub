import apiClient, { ApiResponse } from './client';

export interface Product {
  id: string;
  sellerId: string;
  seller: {
    uid: string;
    firstName: string;
    lastName: string;
    displayName: string;
    photoURL?: string;
    rating: number;
    totalSales: number;
  };
  name: string;
  description: string;
  category: string;
  subcategory: string;
  tags: string[];
  price: number;
  currency: string;
  originalPrice?: number;
  discountPercentage?: number;
  status: 'draft' | 'active' | 'inactive' | 'sold' | 'featured';
  type: 'digital' | 'physical' | 'service';
  stock: number;
  images: string[];
  thumbnailUrl: string;
  demoUrl?: string;
  documentationUrl?: string;
  requirements: string[];
  features: string[];
  specifications: Record<string, any>;
  files: ProductFile[];
  stats: ProductStats;
  metadata: ProductMetadata;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface ProductFile {
  id: string;
  name: string;
  type: 'image' | 'video' | 'document' | 'code' | 'archive' | 'other';
  url: string;
  size: number;
  mimeType: string;
  isPreview: boolean;
  uploadedAt: Date;
}

export interface ProductStats {
  views: number;
  likes: number;
  sales: number;
  revenue: number;
  reviews: number;
  averageRating: number;
  totalRatings: number;
  shares: number;
  downloads: number;
}

export interface ProductMetadata {
  fileSize: number;
  language?: string;
  framework?: string;
  dependencies?: string[];
  license: string;
  readme?: string;
  version: string;
  lastUpdated: Date;
}

export interface ProductReview {
  id: string;
  productId: string;
  buyerId: string;
  buyer: {
    uid: string;
    firstName: string;
    lastName: string;
    displayName: string;
    photoURL?: string;
  };
  orderId: string;
  rating: number;
  comment: string;
  categories: {
    quality: number;
    value: number;
    support: number;
    easeOfUse: number;
    documentation: number;
  };
  isVerified: boolean;
  isHelpful: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  productId: string;
  product: {
    id: string;
    name: string;
    price: number;
    currency: string;
    thumbnailUrl: string;
  };
  quantity: number;
  totalAmount: number;
  currency: string;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod: string;
  transactionId?: string;
  shippingAddress?: Address;
  billingAddress?: Address;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
}

export interface Address {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  category: string;
  subcategory: string;
  tags?: string[];
  price: number;
  currency: string;
  originalPrice?: number;
  type: 'digital' | 'physical' | 'service';
  stock?: number;
  requirements?: string[];
  features?: string[];
  specifications?: Record<string, any>;
  demoUrl?: string;
  documentationUrl?: string;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  price?: number;
  currency?: string;
  originalPrice?: number;
  type?: 'digital' | 'physical' | 'service';
  stock?: number;
  status?: 'draft' | 'active' | 'inactive' | 'sold' | 'featured';
  requirements?: string[];
  features?: string[];
  specifications?: Record<string, any>;
  demoUrl?: string;
  documentationUrl?: string;
}

export interface CreateReviewRequest {
  rating: number;
  comment: string;
  categories: {
    quality: number;
    value: number;
    support: number;
    easeOfUse: number;
    documentation: number;
  };
}

export interface CreateOrderRequest {
  productId: string;
  quantity: number;
  shippingAddress?: Address;
  billingAddress?: Address;
  notes?: string;
}

export interface PaymentRequest {
  orderId: string;
  paymentMethod: string;
  paymentToken?: string;
}

class MarketplaceApi {
  private basePath = '/marketplace';

  /**
   * Create a new product
   */
  async createProduct(data: CreateProductRequest): Promise<ApiResponse<Product>> {
    return apiClient.post<Product>(`${this.basePath}/products`, data);
  }

  /**
   * Get product by ID
   */
  async getProductById(id: string): Promise<ApiResponse<Product>> {
    return apiClient.get<Product>(`${this.basePath}/products/${id}`);
  }

  /**
   * Get products by seller
   */
  async getProductsBySeller(sellerId: string, status?: string): Promise<ApiResponse<Product[]>> {
    const params: any = {};
    if (status) params.status = status;

    return apiClient.get<Product[]>(`${this.basePath}/products/seller/${sellerId}`, { params });
  }

  /**
   * Get active products
   */
  async getActiveProducts(limit: number = 20, offset: number = 0, category?: string): Promise<ApiResponse<Product[]>> {
    const params: any = { limit, offset };
    if (category) params.category = category;

    return apiClient.get<Product[]>(`${this.basePath}/products`, { params });
  }

  /**
   * Search products
   */
  async searchProducts(query: string, limit: number = 20): Promise<ApiResponse<Product[]>> {
    return apiClient.get<Product[]>(`${this.basePath}/products/search`, {
      params: { query, limit }
    });
  }

  /**
   * Update product
   */
  async updateProduct(id: string, data: UpdateProductRequest): Promise<ApiResponse<Product>> {
    return apiClient.put<Product>(`${this.basePath}/products/${id}`, data);
  }

  /**
   * Delete product
   */
  async deleteProduct(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.basePath}/products/${id}`);
  }

  /**
   * Upload product images
   */
  async uploadImages(productId: string, files: File[], onProgress?: (progress: number) => void): Promise<ApiResponse<ProductFile[]>> {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`images[${index}]`, file);
    });

    return apiClient.uploadFile<ProductFile[]>(
      `${this.basePath}/products/${productId}/images`,
      formData,
      onProgress
    );
  }

  /**
   * Delete product image
   */
  async deleteImage(productId: string, imageId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.basePath}/products/${productId}/images/${imageId}`);
  }

  /**
   * Update product thumbnail
   */
  async updateThumbnail(productId: string, file: File, onProgress?: (progress: number) => void): Promise<ApiResponse<{ thumbnailUrl: string }>> {
    const formData = new FormData();
    formData.append('thumbnail', file);

    return apiClient.uploadFile<{ thumbnailUrl: string }>(
      `${this.basePath}/products/${productId}/thumbnail`,
      formData,
      onProgress
    );
  }

  /**
   * Upload product files
   */
  async uploadFiles(productId: string, files: File[], onProgress?: (progress: number) => void): Promise<ApiResponse<ProductFile[]>> {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`files[${index}]`, file);
    });

    return apiClient.uploadFile<ProductFile[]>(
      `${this.basePath}/products/${productId}/files`,
      formData,
      onProgress
    );
  }

  /**
   * Delete product file
   */
  async deleteFile(productId: string, fileId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.basePath}/products/${productId}/files/${fileId}`);
  }

  /**
   * Add product review
   */
  async addReview(productId: string, data: CreateReviewRequest): Promise<ApiResponse<ProductReview>> {
    return apiClient.post<ProductReview>(`${this.basePath}/products/${productId}/reviews`, data);
  }

  /**
   * Get product reviews
   */
  async getProductReviews(productId: string, limit: number = 20): Promise<ApiResponse<ProductReview[]>> {
    return apiClient.get<ProductReview[]>(`${this.basePath}/products/${productId}/reviews`, {
      params: { limit }
    });
  }

  /**
   * Create order
   */
  async createOrder(data: CreateOrderRequest): Promise<ApiResponse<Order>> {
    return apiClient.post<Order>(`${this.basePath}/orders`, data);
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string): Promise<ApiResponse<Order>> {
    return apiClient.get<Order>(`${this.basePath}/orders/${orderId}`);
  }

  /**
   * Get buyer orders
   */
  async getBuyerOrders(buyerId: string, status?: string): Promise<ApiResponse<Order[]>> {
    const params: any = {};
    if (status) params.status = status;

    return apiClient.get<Order[]>(`${this.basePath}/orders/buyer/${buyerId}`, { params });
  }

  /**
   * Get seller orders
   */
  async getSellerOrders(sellerId: string, status?: string): Promise<ApiResponse<Order[]>> {
    const params: any = {};
    if (status) params.status = status;

    return apiClient.get<Order[]>(`${this.basePath}/orders/seller/${sellerId}`, { params });
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: string): Promise<ApiResponse<Order>> {
    return apiClient.put<Order>(`${this.basePath}/orders/${orderId}/status`, { status });
  }

  /**
   * Process payment
   */
  async processPayment(data: PaymentRequest): Promise<ApiResponse<Order>> {
    return apiClient.post<Order>(`${this.basePath}/orders/payment`, data);
  }

  /**
   * Download digital product
   */
  async downloadProduct(orderId: string, onProgress?: (progress: number) => void): Promise<Blob> {
    return apiClient.downloadFile(`${this.basePath}/orders/${orderId}/download`, undefined, onProgress);
  }

  /**
   * Like product
   */
  async likeProduct(productId: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`${this.basePath}/products/${productId}/like`);
  }

  /**
   * Unlike product
   */
  async unlikeProduct(productId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.basePath}/products/${productId}/like`);
  }

  /**
   * Check if user liked product
   */
  async isLiked(productId: string): Promise<ApiResponse<boolean>> {
    return apiClient.get<boolean>(`${this.basePath}/products/${productId}/liked`);
  }

  /**
   * Share product
   */
  async shareProduct(productId: string, platform: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`${this.basePath}/products/${productId}/share`, { platform });
  }

  /**
   * Get product categories
   */
  async getCategories(): Promise<ApiResponse<string[]>> {
    return apiClient.get<string[]>(`${this.basePath}/categories`);
  }

  /**
   * Get product subcategories
   */
  async getSubcategories(category: string): Promise<ApiResponse<string[]>> {
    return apiClient.get<string[]>(`${this.basePath}/categories/${category}/subcategories`);
  }

  /**
   * Get featured products
   */
  async getFeaturedProducts(limit: number = 10): Promise<ApiResponse<Product[]>> {
    return apiClient.get<Product[]>(`${this.basePath}/products/featured`, {
      params: { limit }
    });
  }

  /**
   * Get trending products
   */
  async getTrendingProducts(limit: number = 10, period: string = '7d'): Promise<ApiResponse<Product[]>> {
    return apiClient.get<Product[]>(`${this.basePath}/products/trending`, {
      params: { limit, period }
    });
  }

  /**
   * Get discounted products
   */
  async getDiscountedProducts(limit: number = 20): Promise<ApiResponse<Product[]>> {
    return apiClient.get<Product[]>(`${this.basePath}/products/discounted`, {
      params: { limit }
    });
  }

  /**
   * Get product recommendations
   */
  async getRecommendations(userId: string, limit: number = 10): Promise<ApiResponse<Product[]>> {
    return apiClient.get<Product[]>(`${this.basePath}/products/recommendations`, {
      params: { userId, limit }
    });
  }

  /**
   * Get seller analytics
   */
  async getSellerAnalytics(sellerId: string, period: string = '30d'): Promise<ApiResponse<any>> {
    return apiClient.get<any>(`${this.basePath}/analytics/seller/${sellerId}`, {
      params: { period }
    });
  }

  /**
   * Get product analytics
   */
  async getProductAnalytics(productId: string, period: string = '30d'): Promise<ApiResponse<any>> {
    return apiClient.get<any>(`${this.basePath}/products/${productId}/analytics`, {
      params: { period }
    });
  }

  /**
   * Update product stats
   */
  async updateProductStats(productId: string, stats: Partial<ProductStats>): Promise<ApiResponse<void>> {
    return apiClient.put<void>(`${this.basePath}/products/${productId}/stats`, { stats });
  }

  /**
   * Get wishlist
   */
  async getWishlist(userId: string): Promise<ApiResponse<Product[]>> {
    return apiClient.get<Product[]>(`${this.basePath}/wishlist/${userId}`);
  }

  /**
   * Add to wishlist
   */
  async addToWishlist(userId: string, productId: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`${this.basePath}/wishlist/${userId}`, { productId });
  }

  /**
   * Remove from wishlist
   */
  async removeFromWishlist(userId: string, productId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.basePath}/wishlist/${userId}/${productId}`);
  }

  /**
   * Check if in wishlist
   */
  async isInWishlist(userId: string, productId: string): Promise<ApiResponse<boolean>> {
    return apiClient.get<boolean>(`${this.basePath}/wishlist/${userId}/${productId}`);
  }

  /**
   * Get cart
   */
  async getCart(userId: string): Promise<ApiResponse<any[]>> {
    return apiClient.get<any[]>(`${this.basePath}/cart/${userId}`);
  }

  /**
   * Add to cart
   */
  async addToCart(userId: string, productId: string, quantity: number = 1): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`${this.basePath}/cart/${userId}`, { productId, quantity });
  }

  /**
   * Update cart item
   */
  async updateCartItem(userId: string, productId: string, quantity: number): Promise<ApiResponse<void>> {
    return apiClient.put<void>(`${this.basePath}/cart/${userId}/${productId}`, { quantity });
  }

  /**
   * Remove from cart
   */
  async removeFromCart(userId: string, productId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.basePath}/cart/${userId}/${productId}`);
  }

  /**
   * Clear cart
   */
  async clearCart(userId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.basePath}/cart/${userId}`);
  }

  /**
   * Checkout cart
   */
  async checkoutCart(userId: string, shippingAddress?: Address, billingAddress?: Address): Promise<ApiResponse<Order[]>> {
    return apiClient.post<Order[]>(`${this.basePath}/cart/${userId}/checkout`, {
      shippingAddress,
      billingAddress
    });
  }
}

export const marketplaceApi = new MarketplaceApi();
export default marketplaceApi; 