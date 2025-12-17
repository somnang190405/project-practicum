import { db, storage } from './firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as Types from '../types';

const productsCollection = collection(db, 'products');

export const getProducts = async (): Promise<Types.Product[]> => {
  const snapshot = await getDocs(productsCollection);
  return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Types.Product, 'id'>) }));
};

// Real-time product listener
export const listenProducts = (cb: (products: Types.Product[]) => void) => {
  const unsubscribe = onSnapshot(productsCollection, (snapshot) => {
    const data = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Types.Product, 'id'>) }));
    cb(data);
  });
  return unsubscribe;
};

export const createProduct = async (product: Omit<Types.Product, 'id'>): Promise<Types.Product> => {
  const docRef = await addDoc(productsCollection, product);
  const created: Types.Product = {
    id: docRef.id,
    name: product.name,
    price: product.price,
    category: product.category,
    image: product.image,
    description: product.description,
    stock: product.stock,
    rating: product.rating,
    isNewArrival: product.isNewArrival ?? false,
  };
  return created;
};

// Upload a product image file to Firebase Storage and return its download URL
export const uploadProductImage = async (file: File, productName: string): Promise<string> => {
  const safeName = productName.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
  const imageRef = ref(storage, `products/${Date.now()}_${safeName}`);
  const metadata = {
    contentType: file.type || 'image/jpeg',
    cacheControl: 'public, max-age=31536000'
  } as any;
  const snapshot = await uploadBytes(imageRef, file, metadata);
  const url = await getDownloadURL(snapshot.ref);
  return url;
};

// Create product with image file upload
export const createProductWithUpload = async (
  data: Omit<Types.Product, 'id' | 'image'>,
  imageFile: File
): Promise<Types.Product> => {
  const imageUrl = await uploadProductImage(imageFile, data.name);
  return await createProduct({ ...data, image: imageUrl });
};

export const updateProduct = async (id: string, updatedProduct: Partial<Types.Product>) => {
  const productDoc = doc(db, 'products', id);
  await updateDoc(productDoc, updatedProduct);
};

export const deleteProduct = async (id: string) => {
  const productDoc = doc(db, 'products', id);
  await deleteDoc(productDoc);
};

// Save user to Firestore
export const saveUserToFirestore = async (userId: string, userData: Omit<Types.User, 'id'>) => {
  try {
    await setDoc(doc(db, "users", userId), { ...userData, id: userId });
    console.log("User saved to Firestore");
  } catch (error) {
    console.error("Error saving user to Firestore:", error);
  }
};

// Get user from Firestore
export const getUserFromFirestore = async (userId: string): Promise<Types.User | null> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      const data = userDoc.data() as Partial<Types.User>;
      return {
        id: userId,
        name: data.name ?? "",
        email: data.email ?? "",
        role: data.role ?? Types.UserRole.CUSTOMER,
        avatar: data.avatar,
      };
    } else {
      // Instead of throwing, just return null and let UI handle it
      return null;
    }
  } catch (error) {
    // Log error, but do not throw
    console.error("Error getting user from Firestore:", error);
    return null;
  }
};

// Get all users
export const getAllUsers = async (): Promise<Types.User[]> => {
  const usersCol = collection(db, 'users');
  const snapshot = await getDocs(usersCol);
  return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Types.User, 'id'>) }));
};

// Update user
export const updateUser = async (id: string, updatedFields: Partial<Types.User>) => {
  const userDoc = doc(db, 'users', id);
  await updateDoc(userDoc, updatedFields);
};

// Delete user
export const deleteUser = async (id: string) => {
  const userDoc = doc(db, 'users', id);
  await deleteDoc(userDoc);
};

// Get all orders
export const getAllOrders = async (): Promise<any[]> => {
  const ordersCol = collection(db, 'orders');
  const snapshot = await getDocs(ordersCol);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// Real-time orders listener
export const listenOrders = (cb: (orders: Types.Order[]) => void) => {
  const ordersCol = collection(db, 'orders');
  const unsubscribe = onSnapshot(ordersCol, (snapshot) => {
    const data = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Partial<Types.Order>) })) as Types.Order[];
    cb(data);
  });
  return unsubscribe;
};

// Update order status
export const updateOrderStatus = async (id: string, status: string) => {
  const orderDoc = doc(db, 'orders', id);
  await updateDoc(orderDoc, { status });
};

// Get sales reports (example: return all orders for now)
export const getSalesReports = async (): Promise<any[]> => {
  // You can aggregate or filter as needed for real reports
  return await getAllOrders();
};

// -------------------- Categories (Persistent) --------------------
export type Category = { id: string; name: string };

export const listenCategories = (cb: (categories: Category[]) => void) => {
  const categoriesCol = collection(db, 'categories');
  const unsubscribe = onSnapshot(categoriesCol, (snapshot) => {
    const data = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Category, 'id'>) })) as Category[];
    cb(data);
  });
  return unsubscribe;
};

export const addCategoryIfNotExists = async (nameRaw: string) => {
  const name = (nameRaw || '').trim();
  if (!name) return;
  const categoriesCol = collection(db, 'categories');
  const snap = await getDocs(categoriesCol);
  const exists = snap.docs.some((d) => (((d.data() as any).name || '').toString().trim().toLowerCase() === name.toLowerCase()));
  if (!exists) {
    await addDoc(categoriesCol, { name });
  }
};

export const ensureCategories = async (names: string[]) => {
  const categoriesCol = collection(db, 'categories');
  const snap = await getDocs(categoriesCol);
  const existing = new Set(snap.docs.map((d) => (((d.data() as any).name || '').toString().trim().toLowerCase())));
  for (const n of names) {
    const key = (n || '').trim().toLowerCase();
    if (!key) continue;
    if (!existing.has(key)) {
      await addDoc(categoriesCol, { name: n.trim() });
    }
  }
};