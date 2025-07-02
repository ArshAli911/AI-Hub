export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category?: string;
  sellerId?: string;
  // Add more product-related fields as needed
} 