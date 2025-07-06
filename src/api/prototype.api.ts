import apiClient, { ApiResponse } from './client';

export interface Prototype {
  id: string;
  creatorId: string;
  creator: {
    uid: string;
    firstName: string;
    lastName: string;
    displayName: string;
    photoURL?: string;
  };
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
  estimatedTime: number;
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
  size: number;
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
  fileSize: number;
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
  user: {
    uid: string;
    firstName: string;
    lastName: string;
    displayName: string;
    photoURL?: string;
  };
  rating: number;
  comment: string;
  categories: {
    functionality: number;
    design: number;
    performance: number;
    documentation: number;
    originality: number;
  };
  isVerified: boolean;
  isHelpful: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrototypeComment {
  id: string;
  prototypeId: string;
  userId: string;
  user: {
    uid: string;
    firstName: string;
    lastName: string;
    displayName: string;
    photoURL?: string;
  };
  content: string;
  parentId?: string;
  likes: number;
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePrototypeRequest {
  name: string;
  description: string;
  category: string;
  tags?: string[];
  technologies: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime?: number;
  requirements?: string[];
  features?: string[];
  demoUrl?: string;
  sourceCodeUrl?: string;
  documentationUrl?: string;
}

export interface UpdatePrototypeRequest {
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  technologies?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime?: number;
  requirements?: string[];
  features?: string[];
  status?: 'draft' | 'published' | 'archived' | 'featured';
  visibility?: 'public' | 'private' | 'unlisted';
  demoUrl?: string;
  sourceCodeUrl?: string;
  documentationUrl?: string;
}

export interface CreateFeedbackRequest {
  rating: number;
  comment: string;
  categories: {
    functionality: number;
    design: number;
    performance: number;
    documentation: number;
    originality: number;
  };
}

export interface CreateCommentRequest {
  content: string;
  parentId?: string;
}

export interface ForkPrototypeRequest {
  reason?: string;
}

class PrototypeApi {
  private basePath = '/prototypes';

  /**
   * Create a new prototype
   */
  async createPrototype(data: CreatePrototypeRequest): Promise<ApiResponse<Prototype>> {
    return apiClient.post<Prototype>(this.basePath, data);
  }

  /**
   * Get prototype by ID
   */
  async getPrototypeById(id: string): Promise<ApiResponse<Prototype>> {
    return apiClient.get<Prototype>(`${this.basePath}/${id}`);
  }

  /**
   * Get prototypes by creator
   */
  async getPrototypesByCreator(creatorId: string, status?: string): Promise<ApiResponse<Prototype[]>> {
    const params: any = {};
    if (status) params.status = status;

    return apiClient.get<Prototype[]>(`${this.basePath}/creator/${creatorId}`, { params });
  }

  /**
   * Get public prototypes
   */
  async getPublicPrototypes(limit: number = 20, offset: number = 0, category?: string): Promise<ApiResponse<Prototype[]>> {
    const params: any = { limit, offset };
    if (category) params.category = category;

    return apiClient.get<Prototype[]>(`${this.basePath}/public`, { params });
  }

  /**
   * Search prototypes
   */
  async searchPrototypes(query: string, limit: number = 20): Promise<ApiResponse<Prototype[]>> {
    return apiClient.get<Prototype[]>(`${this.basePath}/search`, {
      params: { query, limit }
    });
  }

  /**
   * Update prototype
   */
  async updatePrototype(id: string, data: UpdatePrototypeRequest): Promise<ApiResponse<Prototype>> {
    return apiClient.put<Prototype>(`${this.basePath}/${id}`, data);
  }

  /**
   * Delete prototype
   */
  async deletePrototype(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.basePath}/${id}`);
  }

  /**
   * Add feedback to prototype
   */
  async addFeedback(prototypeId: string, data: CreateFeedbackRequest): Promise<ApiResponse<PrototypeFeedback>> {
    return apiClient.post<PrototypeFeedback>(`${this.basePath}/${prototypeId}/feedback`, data);
  }

  /**
   * Get prototype feedback
   */
  async getPrototypeFeedback(prototypeId: string, limit: number = 20): Promise<ApiResponse<PrototypeFeedback[]>> {
    return apiClient.get<PrototypeFeedback[]>(`${this.basePath}/${prototypeId}/feedback`, {
      params: { limit }
    });
  }

  /**
   * Add comment to prototype
   */
  async addComment(prototypeId: string, data: CreateCommentRequest): Promise<ApiResponse<PrototypeComment>> {
    return apiClient.post<PrototypeComment>(`${this.basePath}/${prototypeId}/comments`, data);
  }

  /**
   * Get prototype comments
   */
  async getPrototypeComments(prototypeId: string, limit: number = 50): Promise<ApiResponse<PrototypeComment[]>> {
    return apiClient.get<PrototypeComment[]>(`${this.basePath}/${prototypeId}/comments`, {
      params: { limit }
    });
  }

  /**
   * Fork prototype
   */
  async forkPrototype(prototypeId: string, data: ForkPrototypeRequest = {}): Promise<ApiResponse<any>> {
    return apiClient.post<any>(`${this.basePath}/${prototypeId}/fork`, data);
  }

  /**
   * Upload prototype files
   */
  async uploadFiles(prototypeId: string, files: File[], onProgress?: (progress: number) => void): Promise<ApiResponse<PrototypeFile[]>> {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append(`files[${index}]`, file);
    });

    return apiClient.uploadFile<PrototypeFile[]>(
      `${this.basePath}/${prototypeId}/files`,
      formData,
      onProgress
    );
  }

  /**
   * Delete prototype file
   */
  async deleteFile(prototypeId: string, fileId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.basePath}/${prototypeId}/files/${fileId}`);
  }

  /**
   * Update prototype thumbnail
   */
  async updateThumbnail(prototypeId: string, file: File, onProgress?: (progress: number) => void): Promise<ApiResponse<{ thumbnailUrl: string }>> {
    const formData = new FormData();
    formData.append('thumbnail', file);

    return apiClient.uploadFile<{ thumbnailUrl: string }>(
      `${this.basePath}/${prototypeId}/thumbnail`,
      formData,
      onProgress
    );
  }

  /**
   * Get prototype collaborators
   */
  async getCollaborators(prototypeId: string): Promise<ApiResponse<any[]>> {
    return apiClient.get<any[]>(`${this.basePath}/${prototypeId}/collaborators`);
  }

  /**
   * Add collaborator
   */
  async addCollaborator(prototypeId: string, userId: string, role: string, permissions: string[]): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`${this.basePath}/${prototypeId}/collaborators`, {
      userId,
      role,
      permissions
    });
  }

  /**
   * Remove collaborator
   */
  async removeCollaborator(prototypeId: string, userId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.basePath}/${prototypeId}/collaborators/${userId}`);
  }

  /**
   * Update collaborator role
   */
  async updateCollaboratorRole(prototypeId: string, userId: string, role: string, permissions: string[]): Promise<ApiResponse<void>> {
    return apiClient.put<void>(`${this.basePath}/${prototypeId}/collaborators/${userId}`, {
      role,
      permissions
    });
  }

  /**
   * Get prototype forks
   */
  async getPrototypeForks(prototypeId: string, limit: number = 20): Promise<ApiResponse<any[]>> {
    return apiClient.get<any[]>(`${this.basePath}/${prototypeId}/forks`, {
      params: { limit }
    });
  }

  /**
   * Like prototype
   */
  async likePrototype(prototypeId: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`${this.basePath}/${prototypeId}/like`);
  }

  /**
   * Unlike prototype
   */
  async unlikePrototype(prototypeId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.basePath}/${prototypeId}/like`);
  }

  /**
   * Check if user liked prototype
   */
  async isLiked(prototypeId: string): Promise<ApiResponse<boolean>> {
    return apiClient.get<boolean>(`${this.basePath}/${prototypeId}/liked`);
  }

  /**
   * Share prototype
   */
  async sharePrototype(prototypeId: string, platform: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`${this.basePath}/${prototypeId}/share`, { platform });
  }

  /**
   * Download prototype
   */
  async downloadPrototype(prototypeId: string, onProgress?: (progress: number) => void): Promise<Blob> {
    return apiClient.downloadFile(`${this.basePath}/${prototypeId}/download`, undefined, onProgress);
  }

  /**
   * Get prototype categories
   */
  async getCategories(): Promise<ApiResponse<string[]>> {
    return apiClient.get<string[]>(`${this.basePath}/categories`);
  }

  /**
   * Get prototype technologies
   */
  async getTechnologies(): Promise<ApiResponse<string[]>> {
    return apiClient.get<string[]>(`${this.basePath}/technologies`);
  }

  /**
   * Get featured prototypes
   */
  async getFeaturedPrototypes(limit: number = 10): Promise<ApiResponse<Prototype[]>> {
    return apiClient.get<Prototype[]>(`${this.basePath}/featured`, {
      params: { limit }
    });
  }

  /**
   * Get trending prototypes
   */
  async getTrendingPrototypes(limit: number = 10, period: string = '7d'): Promise<ApiResponse<Prototype[]>> {
    return apiClient.get<Prototype[]>(`${this.basePath}/trending`, {
      params: { limit, period }
    });
  }

  /**
   * Get recent prototypes
   */
  async getRecentPrototypes(limit: number = 20): Promise<ApiResponse<Prototype[]>> {
    return apiClient.get<Prototype[]>(`${this.basePath}/recent`, {
      params: { limit }
    });
  }

  /**
   * Get prototype recommendations
   */
  async getRecommendations(userId: string, limit: number = 10): Promise<ApiResponse<Prototype[]>> {
    return apiClient.get<Prototype[]>(`${this.basePath}/recommendations`, {
      params: { userId, limit }
    });
  }

  /**
   * Get prototype analytics
   */
  async getPrototypeAnalytics(prototypeId: string, period: string = '30d'): Promise<ApiResponse<any>> {
    return apiClient.get<any>(`${this.basePath}/${prototypeId}/analytics`, {
      params: { period }
    });
  }

  /**
   * Update prototype stats
   */
  async updatePrototypeStats(prototypeId: string, stats: Partial<PrototypeStats>): Promise<ApiResponse<void>> {
    return apiClient.put<void>(`${this.basePath}/${prototypeId}/stats`, { stats });
  }

  /**
   * Get prototype versions
   */
  async getPrototypeVersions(prototypeId: string): Promise<ApiResponse<any[]>> {
    return apiClient.get<any[]>(`${this.basePath}/${prototypeId}/versions`);
  }

  /**
   * Create new version
   */
  async createVersion(prototypeId: string, version: string, changes: string): Promise<ApiResponse<any>> {
    return apiClient.post<any>(`${this.basePath}/${prototypeId}/versions`, {
      version,
      changes
    });
  }

  /**
   * Get prototype activity
   */
  async getPrototypeActivity(prototypeId: string, limit: number = 20): Promise<ApiResponse<any[]>> {
    return apiClient.get<any[]>(`${this.basePath}/${prototypeId}/activity`, {
      params: { limit }
    });
  }
}

export const prototypeApi = new PrototypeApi();
export default prototypeApi; 