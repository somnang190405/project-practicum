// src/services/data.ts

import { db } from "../../services/firebase";
import * as Types from "../../types";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  // You may need onSnapshot for real-time updates later
} from "firebase/firestore";

// Define collection references
const productsCollectionRef = collection(db, "products");
const ordersCollectionRef = collection(db, "orders");

export const DataService = {
  // --- Products CRUD Operations ---

  // READ (All Products)
  getProducts: async (): Promise<Types.Product[]> => {
    try {
      const q = query(productsCollectionRef, orderBy("name"));
      const snapshot = await getDocs(q);
      const products: Types.Product[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        // The data() function extracts the fields from the document
        ...(doc.data() as Omit<Types.Product, "id">),
      }));
      return products;
    } catch (error) {
      console.error("Error fetching products:", error);
      return [];
    }
  },

  // CREATE (New Product)
  addProduct: async (newProduct: Omit<Types.Product, "id">): Promise<string> => {
    try {
      // Firebase auto-generates the ID on push
      const docRef = await addDoc(productsCollectionRef, newProduct);
      return docRef.id;
    } catch (error) {
      console.error("Error adding product:", error);
      throw new Error("Failed to add product.");
    }
  },

  // UPDATE (Existing Product)
  updateProduct: async (id: string, updatedFields: Partial<Types.Product>): Promise<void> => {
    try {
      const productDoc = doc(db, "products", id);
      await updateDoc(productDoc, updatedFields);
    } catch (error) {
      console.error("Error updating product:", error);
      throw new Error("Failed to update product.");
    }
  },

  // DELETE (Product)
  deleteProduct: async (id: string): Promise<void> => {
    try {
      const productDoc = doc(db, "products", id);
      await deleteDoc(productDoc);
    } catch (error) {
      console.error("Error deleting product:", error);
      throw new Error("Failed to delete product.");
    }
  },

  // --- Orders (READ Example) ---
  // You would implement the rest of the CRUD operations for Orders here as well
  getOrders: async (): Promise<Types.Order[]> => {
    try {
      const snapshot = await getDocs(ordersCollectionRef);
      const orders: Types.Order[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Types.Order, "id">),
      }));
      return orders;
    } catch (error) {
      console.error("Error fetching orders:", error);
      return [];
    }
  },

  // --- Sales (Placeholder for future implementation) ---
  getSalesStats: async (): Promise<Types.SalesStat[]> => {
    // This often involves fetching and aggregating data, which is more complex.
    // For now, keep the mock in your components until you implement a proper sales collection/logic.
    return [];
  },
};