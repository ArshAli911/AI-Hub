import { create } from 'zustand';
import { Product } from '../types';

interface MarketState {
  products: Product[];
  isLoading: boolean;
  error: string | null;
}

interface MarketActions {
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => void;
  updateProduct: (productId: string, updatedProduct: Partial<Product>) => void;
  deleteProduct: (productId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useMarketStore = create<MarketState & MarketActions>((set) => ({
  products: [],
  isLoading: false,
  error: null,
  setProducts: (products) => set({ products, isLoading: false, error: null }),
  addProduct: (product) =>
    set((state) => ({
      products: [...state.products, product],
    })),
  updateProduct: (productId, updatedProduct) =>
    set((state) => ({
      products: state.products.map((p) =>
        p.id === productId ? { ...p, ...updatedProduct } : p
      ),
    })),
  deleteProduct: (productId) =>
    set((state) => ({
      products: state.products.filter((p) => p.id !== productId),
    })),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),
})); 