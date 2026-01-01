export enum UserRole {
  ADMIN = 'ADMIN',
  CUSTOMER = 'CUSTOMER',
  GUEST = 'GUEST'
}

export enum OrderStatus {
  PENDING = 'Pending',
  SHIPPED = 'Shipped',
  DELIVERED = 'Delivered',
  CANCELLED = 'Cancelled'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  wishlist?: string[];
  cart?: { productId: string; quantity: number }[];
  // Optional extended profile fields
  firstName?: string;
  lastName?: string;
  gender?: 'Male' | 'Female' | 'Other';
  address?: string;
  phoneNumber?: string;
  dateOfBirth?: string; // ISO date string
  location?: string; // City, Country
  country?: string;
  city?: string;
  postalCode?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  // Optional percent discount applied to `price` (0-100)
  promotionPercent?: number;
  category: string;
  image: string;
  description: string;
  stock: number;
  rating: number;
  // Whether this item should appear in the New Arrivals section
  isNewArrival?: boolean;
  // Optional color options (CSS color strings, e.g. "#000000", "brown")
  colors?: string[];
}

export interface CartItem extends Product {
  quantity: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  // Optional: what customer saved (if any)
  originalPrice?: number;
  promotionPercent?: number;
  quantity: number;
  image: string;
}

export interface Order {
  id: string;
  userId: string;
  date: string;
  status: OrderStatus;
  // Payment tracking (optional for backward compatibility)
  paymentStatus?: 'UNPAID' | 'PAID';
  paymentMethod?: 'QR' | 'BANK';
  paidAt?: string; // ISO timestamp
  paymentDetails?: {
    // Store only non-sensitive or masked details.
    bankName?: string;
    accountHolderName?: string;
    accountLast4?: string;
    accountMasked?: string;
    transferReference?: string;
  };
  total: number;
  items: OrderItem[];
}

export interface SalesStat {
  name: string;
  sales: number;
}