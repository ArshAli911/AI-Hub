import { Platform } from 'react-native';
import apiClient from '../api/client';
import firebaseAuthService from './firebaseService';

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account' | 'sepa_debit' | 'ideal' | 'sofort';
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    fingerprint: string;
    country: string;
  };
  billingDetails: {
    name: string;
    email: string;
    phone?: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
  isDefault: boolean;
  createdAt: Date;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'requires_capture' | 'canceled' | 'succeeded';
  clientSecret: string;
  paymentMethodId?: string;
  description?: string;
  metadata?: Record<string, string>;
  created: Date;
}

export interface Subscription {
  id: string;
  status: 'incomplete' | 'incomplete_expired' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';
  planId: string;
  planName: string;
  planPrice: number;
  planCurrency: string;
  planInterval: 'day' | 'week' | 'month' | 'year';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  metadata?: Record<string, string>;
  createdAt: Date;
}

export interface Invoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  dueDate?: Date;
  paidAt?: Date;
  lines: InvoiceLine[];
  subtotal: number;
  tax: number;
  total: number;
  createdAt: Date;
}

export interface InvoiceLine {
  id: string;
  description: string;
  amount: number;
  quantity: number;
  unitAmount: number;
  currency: string;
}

export interface CreatePaymentIntentRequest {
  amount: number;
  currency: string;
  paymentMethodId?: string;
  description?: string;
  metadata?: Record<string, string>;
  confirm?: boolean;
  captureMethod?: 'automatic' | 'manual';
  setupFutureUsage?: 'off_session' | 'on_session';
}

export interface CreateSubscriptionRequest {
  planId: string;
  paymentMethodId?: string;
  trialPeriodDays?: number;
  metadata?: Record<string, string>;
}

export interface UpdateSubscriptionRequest {
  planId?: string;
  cancelAtPeriodEnd?: boolean;
  metadata?: Record<string, string>;
}

export interface CreatePaymentMethodRequest {
  type: 'card';
  card: {
    number: string;
    expMonth: number;
    expYear: number;
    cvc: string;
  };
  billingDetails: {
    name: string;
    email: string;
    phone?: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
}

class PaymentService {
  private basePath = '/payments';

  /**
   * Create a payment intent
   */
  async createPaymentIntent(data: CreatePaymentIntentRequest): Promise<PaymentIntent> {
    try {
      const response = await apiClient.post<PaymentIntent>(`${this.basePath}/intents`, data);
      return response.data;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  /**
   * Confirm a payment intent
   */
  async confirmPaymentIntent(intentId: string, paymentMethodId: string): Promise<PaymentIntent> {
    try {
      const response = await apiClient.post<PaymentIntent>(`${this.basePath}/intents/${intentId}/confirm`, {
        paymentMethodId
      });
      return response.data;
    } catch (error) {
      console.error('Error confirming payment intent:', error);
      throw error;
    }
  }

  /**
   * Cancel a payment intent
   */
  async cancelPaymentIntent(intentId: string, reason?: string): Promise<PaymentIntent> {
    try {
      const response = await apiClient.post<PaymentIntent>(`${this.basePath}/intents/${intentId}/cancel`, {
        reason
      });
      return response.data;
    } catch (error) {
      console.error('Error canceling payment intent:', error);
      throw error;
    }
  }

  /**
   * Get payment intent by ID
   */
  async getPaymentIntent(intentId: string): Promise<PaymentIntent> {
    try {
      const response = await apiClient.get<PaymentIntent>(`${this.basePath}/intents/${intentId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting payment intent:', error);
      throw error;
    }
  }

  /**
   * Create a payment method
   */
  async createPaymentMethod(data: CreatePaymentMethodRequest): Promise<PaymentMethod> {
    try {
      const response = await apiClient.post<PaymentMethod>(`${this.basePath}/methods`, data);
      return response.data;
    } catch (error) {
      console.error('Error creating payment method:', error);
      throw error;
    }
  }

  /**
   * Get user's payment methods
   */
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const response = await apiClient.get<PaymentMethod[]>(`${this.basePath}/methods`);
      return response.data;
    } catch (error) {
      console.error('Error getting payment methods:', error);
      throw error;
    }
  }

  /**
   * Update payment method
   */
  async updatePaymentMethod(methodId: string, data: Partial<PaymentMethod>): Promise<PaymentMethod> {
    try {
      const response = await apiClient.put<PaymentMethod>(`${this.basePath}/methods/${methodId}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating payment method:', error);
      throw error;
    }
  }

  /**
   * Delete payment method
   */
  async deletePaymentMethod(methodId: string): Promise<void> {
    try {
      await apiClient.delete<void>(`${this.basePath}/methods/${methodId}`);
    } catch (error) {
      console.error('Error deleting payment method:', error);
      throw error;
    }
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(methodId: string): Promise<void> {
    try {
      await apiClient.put<void>(`${this.basePath}/methods/${methodId}/default`);
    } catch (error) {
      console.error('Error setting default payment method:', error);
      throw error;
    }
  }

  /**
   * Create a subscription
   */
  async createSubscription(data: CreateSubscriptionRequest): Promise<Subscription> {
    try {
      const response = await apiClient.post<Subscription>(`${this.basePath}/subscriptions`, data);
      return response.data;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  /**
   * Get user's subscriptions
   */
  async getSubscriptions(): Promise<Subscription[]> {
    try {
      const response = await apiClient.get<Subscription[]>(`${this.basePath}/subscriptions`);
      return response.data;
    } catch (error) {
      console.error('Error getting subscriptions:', error);
      throw error;
    }
  }

  /**
   * Get subscription by ID
   */
  async getSubscription(subscriptionId: string): Promise<Subscription> {
    try {
      const response = await apiClient.get<Subscription>(`${this.basePath}/subscriptions/${subscriptionId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting subscription:', error);
      throw error;
    }
  }

  /**
   * Update subscription
   */
  async updateSubscription(subscriptionId: string, data: UpdateSubscriptionRequest): Promise<Subscription> {
    try {
      const response = await apiClient.put<Subscription>(`${this.basePath}/subscriptions/${subscriptionId}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string, atPeriodEnd: boolean = true): Promise<Subscription> {
    try {
      const response = await apiClient.post<Subscription>(`${this.basePath}/subscriptions/${subscriptionId}/cancel`, {
        atPeriodEnd
      });
      return response.data;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  }

  /**
   * Reactivate subscription
   */
  async reactivateSubscription(subscriptionId: string): Promise<Subscription> {
    try {
      const response = await apiClient.post<Subscription>(`${this.basePath}/subscriptions/${subscriptionId}/reactivate`);
      return response.data;
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      throw error;
    }
  }

  /**
   * Get available plans
   */
  async getPlans(): Promise<any[]> {
    try {
      const response = await apiClient.get<any[]>(`${this.basePath}/plans`);
      return response.data;
    } catch (error) {
      console.error('Error getting plans:', error);
      throw error;
    }
  }

  /**
   * Get user's invoices
   */
  async getInvoices(limit: number = 20): Promise<Invoice[]> {
    try {
      const response = await apiClient.get<Invoice[]>(`${this.basePath}/invoices`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting invoices:', error);
      throw error;
    }
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<Invoice> {
    try {
      const response = await apiClient.get<Invoice>(`${this.basePath}/invoices/${invoiceId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting invoice:', error);
      throw error;
    }
  }

  /**
   * Download invoice PDF
   */
  async downloadInvoice(invoiceId: string): Promise<Blob> {
    try {
      return await apiClient.downloadFile(`${this.basePath}/invoices/${invoiceId}/pdf`);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      throw error;
    }
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(limit: number = 20): Promise<any[]> {
    try {
      const response = await apiClient.get<any[]>(`${this.basePath}/history`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting payment history:', error);
      throw error;
    }
  }

  /**
   * Process refund
   */
  async processRefund(paymentIntentId: string, amount?: number, reason?: string): Promise<any> {
    try {
      const response = await apiClient.post<any>(`${this.basePath}/refunds`, {
        paymentIntentId,
        amount,
        reason
      });
      return response.data;
    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  }

  /**
   * Get refund by ID
   */
  async getRefund(refundId: string): Promise<any> {
    try {
      const response = await apiClient.get<any>(`${this.basePath}/refunds/${refundId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting refund:', error);
      throw error;
    }
  }

  /**
   * Get payment analytics
   */
  async getPaymentAnalytics(period: string = '30d'): Promise<any> {
    try {
      const response = await apiClient.get<any>(`${this.basePath}/analytics`, {
        params: { period }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting payment analytics:', error);
      throw error;
    }
  }

  /**
   * Setup payment for session
   */
  async setupSessionPayment(sessionId: string, amount: number, currency: string = 'usd'): Promise<PaymentIntent> {
    try {
      const response = await apiClient.post<PaymentIntent>(`${this.basePath}/sessions/${sessionId}/payment`, {
        amount,
        currency
      });
      return response.data;
    } catch (error) {
      console.error('Error setting up session payment:', error);
      throw error;
    }
  }

  /**
   * Process marketplace order payment
   */
  async processOrderPayment(orderId: string, paymentMethodId: string): Promise<PaymentIntent> {
    try {
      const response = await apiClient.post<PaymentIntent>(`${this.basePath}/orders/${orderId}/payment`, {
        paymentMethodId
      });
      return response.data;
    } catch (error) {
      console.error('Error processing order payment:', error);
      throw error;
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string): Promise<{ status: string; details?: any }> {
    try {
      const response = await apiClient.get<{ status: string; details?: any }>(`${this.basePath}/status/${paymentId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting payment status:', error);
      throw error;
    }
  }

  /**
   * Validate payment method
   */
  async validatePaymentMethod(paymentMethodId: string): Promise<boolean> {
    try {
      const response = await apiClient.post<{ valid: boolean }>(`${this.basePath}/methods/${paymentMethodId}/validate`);
      return response.data.valid;
    } catch (error) {
      console.error('Error validating payment method:', error);
      return false;
    }
  }

  /**
   * Get supported currencies
   */
  async getSupportedCurrencies(): Promise<string[]> {
    try {
      const response = await apiClient.get<string[]>(`${this.basePath}/currencies`);
      return response.data;
    } catch (error) {
      console.error('Error getting supported currencies:', error);
      throw error;
    }
  }

  /**
   * Get exchange rates
   */
  async getExchangeRates(baseCurrency: string = 'usd'): Promise<Record<string, number>> {
    try {
      const response = await apiClient.get<Record<string, number>>(`${this.basePath}/exchange-rates`, {
        params: { base: baseCurrency }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting exchange rates:', error);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();
export default paymentService; 