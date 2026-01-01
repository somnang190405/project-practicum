// Updated import to use named exports
import * as Types from '../types';

// --- Initial Mock Data ---

const MOCK_PRODUCTS: Types.Product[] = [
  {
    id: '1',
    name: 'Adidas X Pop Polo Shirt',
    price: 69.99,
    category: 'Men',
    image: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&q=80&w=800',
    description: 'Classic polo with a modern twist. Breathable fabric perfect for summer.',
    stock: 25,
    rating: 4.5
  },
  {
    id: '2',
    name: 'Vintage TRX Runners',
    price: 89.99,
    category: 'Shoes',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800',
    description: 'Retro style meets modern comfort. Great for city walking.',
    stock: 12,
    rating: 4.8
  },
  {
    id: '3',
    name: 'Beckenbauer Track Jacket',
    price: 120.00,
    category: 'Men',
    image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&q=80&w=800',
    description: 'Iconic track jacket style. Durable and stylish.',
    stock: 2,
    rating: 4.2
  },
  {
    id: '4',
    name: 'Urban Pop Classic Tee',
    price: 35.00,
    category: 'Men',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800',
    description: 'Soft cotton essential tee for everyday wear.',
    stock: 100,
    rating: 4.0
  },
  {
    id: '5',
    name: 'Butter Yard Hoodie',
    price: 120.00,
    category: 'Women',
    image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&q=80&w=800',
    description: 'Oversized comfort in a premium denim blue wash.',
    stock: 18,
    rating: 4.9
  },
  {
    id: '6',
    name: 'City Chic Handbag',
    price: 150.00,
    category: 'Bags',
    image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=800',
    description: 'Elegant design for the modern professional.',
    stock: 8,
    rating: 4.7
  },
  {
    id: '7',
    name: 'Summer Breeze Dress',
    price: 75.00,
    category: 'Women',
    image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&q=80&w=800',
    description: 'Lightweight floral dress.',
    stock: 30,
    rating: 4.6
  },
  {
    id: '8',
    name: 'Leather Weekend Bag',
    price: 210.00,
    category: 'Bags',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=800',
    description: 'Premium leather travel companion.',
    stock: 0,
    rating: 5.0
  }
];

const MOCK_USERS: Types.User[] = [
  { id: 'admin1', name: 'Admin User', email: 'admin@tinhme.com', role: Types.UserRole.ADMIN, avatar: 'https://i.pravatar.cc/150?u=admin' },
  { id: 'user1', name: 'John Doe', email: 'user@tinhme.com', role: Types.UserRole.CUSTOMER, avatar: 'https://i.pravatar.cc/150?u=user' }
];

const MOCK_ORDERS: Types.Order[] = [
  {
    id: 'ORD-001',
    userId: 'user1',
    date: '2023-10-25',
    status: Types.OrderStatus.DELIVERED,
    total: 159.99,
    items: [
      { productId: '1', name: 'Adidas X Pop Polo Shirt', price: 69.99, quantity: 1, image: '' },
      { productId: '2', name: 'Vintage TRX Runners', price: 89.99, quantity: 1, image: '' }
    ]
  },
  {
    id: 'ORD-002',
    userId: 'user1',
    date: '2023-10-28',
    status: Types.OrderStatus.SHIPPED,
    total: 35.00,
    items: [
      { productId: '4', name: 'Urban Pop Classic Tee', price: 35.00, quantity: 1, image: '' }
    ]
  },
  {
    id: 'ORD-003',
    userId: 'guest',
    date: '2023-10-29',
    status: Types.OrderStatus.PENDING,
    total: 120.00,
    items: [
       { productId: '5', name: 'Butter Yard Hoodie', price: 120.00, quantity: 1, image: '' }
    ]
  }
];

// --- Service Class ---

class MockBackendService {
  private products: Types.Product[] = [...MOCK_PRODUCTS];
  private orders: Types.Order[] = [...MOCK_ORDERS];
  private users: Types.User[] = [...MOCK_USERS];

  // Product Methods
  getProducts(): Promise<Types.Product[]> {
    return Promise.resolve([...this.products]);
  }

  getProductById(id: string): Promise<Types.Product | undefined> {
    return Promise.resolve(this.products.find(p => p.id === id));
  }

  addProduct(product: Omit<Types.Product, 'id'>): Promise<Types.Product> {
    const newProduct = { ...product, id: Math.random().toString(36).substr(2, 9) };
    this.products.push(newProduct);
    return Promise.resolve(newProduct);
  }

  updateProduct(id: string, data: Partial<Types.Product>): Promise<Types.Product> {
    const index = this.products.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Product not found');
    this.products[index] = { ...this.products[index], ...data };
    return Promise.resolve(this.products[index]);
  }

  deleteProduct(id: string): Promise<void> {
    this.products = this.products.filter(p => p.id !== id);
    return Promise.resolve();
  }

  // Order Methods
  getOrders(): Promise<Types.Order[]> {
    return Promise.resolve([...this.orders]);
  }

  getUserOrders(userId: string): Promise<Types.Order[]> {
    return Promise.resolve(this.orders.filter(o => o.userId === userId));
  }

  createOrder(userId: string, items: any[], total: number): Promise<Types.Order> {
    const newOrder: Types.Order = {
      id: `ORD-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
      userId,
      date: new Date().toISOString().split('T')[0],
      status: Types.OrderStatus.PENDING,
      total,
      items
    };
    this.orders.unshift(newOrder); // Add to top

    // Deduct stock immediately at checkout.
    items.forEach(item => {
      const product = this.products.find(p => p.id === item.productId);
      if (product) {
        const qty = Math.max(1, Number(item.quantity || 1));
        product.stock = Math.max(0, product.stock - qty);
      }
    });
    
    return Promise.resolve(newOrder);
  }

  updateOrderStatus(orderId: string, status: Types.OrderStatus): Promise<Types.Order> {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) throw new Error("Order not found");
    const prevStatus = order.status;
    order.status = status;

    // Restore stock only if the order is cancelled.
    const cancelled = Types.OrderStatus.CANCELLED;
    const wasDeducted = true;
    const alreadyRestored = Boolean((order as any).stockRestored);
    if (status === cancelled && wasDeducted && !alreadyRestored && Array.isArray(order.items)) {
      order.items.forEach((item: any) => {
        const product = this.products.find(p => p.id === item.productId);
        if (!product) return;
        const qty = Math.max(1, Number(item.quantity || 1));
        product.stock = product.stock + qty;
      });
      (order as any).stockRestored = true;
    }

    (order as any).previousStatus = prevStatus;
    return Promise.resolve(order);
  }

  // Analytics
  getSalesReport(): Promise<Types.SalesStat[]> {
    const data = [
      { name: 'Jan', sales: 4000 },
      { name: 'Feb', sales: 3000 },
      { name: 'Mar', sales: 2000 },
      { name: 'Apr', sales: 2780 },
      { name: 'May', sales: 1890 },
      { name: 'Jun', sales: 2390 },
      { name: 'Jul', sales: 3490 },
    ];
    return Promise.resolve(data);
  }

  // Auth
  login(email: string): Promise<Types.User | null> {
    const user = this.users.find(u => u.email === email);
    return Promise.resolve(user || null);
  }

  signup(name: string, email: string, role: Types.UserRole = Types.UserRole.CUSTOMER): Promise<Types.User> {
      const newUser: Types.User = {
          id: Math.random().toString(36).substr(2, 9),
          name,
          email,
          role,
          avatar: `https://ui-avatars.com/api/?name=${name.replace(' ', '+')}&background=0D8ABC&color=fff`
      };
      this.users.push(newUser);
      return Promise.resolve(newUser);
  }

  // User Management
  getUsers(): Promise<Types.User[]> {
      return Promise.resolve([...this.users]);
  }

  deleteUser(id: string): Promise<void> {
      this.users = this.users.filter(u => u.id !== id);
      return Promise.resolve();
  }
}

export const api = new MockBackendService();