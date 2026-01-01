import React, { createContext, useContext, useState } from "react";
import { CartItem } from "../../types";

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  hydrateCart: (items: CartItem[]) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (item: Omit<CartItem, "quantity">) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      const stock = Math.max(0, Number((item as any).stock ?? existing?.stock ?? 0));
      if (stock <= 0) return prev;
      if (existing) {
        // Prevent exceeding available stock.
        if (existing.quantity >= stock) return prev;
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: Math.max(1, Math.min(Math.floor(Number(quantity) || 1), Math.max(1, Number((item as any).stock || 1)))),
            }
          : item
      )
    );
  };

  const hydrateCart = (items: CartItem[]) => setCart(items);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, hydrateCart }}>
      {children}
    </CartContext.Provider>
  );
};
