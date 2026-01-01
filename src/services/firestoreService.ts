import { db, firebaseApp } from './firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, setDoc, getDoc, onSnapshot, query, where, serverTimestamp, orderBy, limit, runTransaction, arrayUnion, arrayRemove, writeBatch } from 'firebase/firestore';
import * as Types from '../types';

const productsCollection = collection(db, 'products');

const buildKeywords = (p: Partial<Types.Product>): string[] => {
  const text = `${p.name || ''} ${p.category || ''} ${p.description || ''}`
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ');
  const raw = text.split(' ').map((t) => t.trim()).filter(Boolean);
  const out = new Set<string>();
  for (const t of raw) {
    if (t.length < 2) continue;
    out.add(t);
    // cheap singularization so "shirts" can match "shirt"
    if (t.endsWith('s') && t.length > 3) out.add(t.slice(0, -1));
  }
  return Array.from(out.values()).slice(0, 40);
};

const mapUserDoc = (userId: string, data: Partial<Types.User>): Types.User => {
  return {
    id: userId,
    name: data.name ?? "",
    email: data.email ?? "",
    role: data.role ?? Types.UserRole.CUSTOMER,
    avatar: data.avatar,
    wishlist: (data as any).wishlist ?? [],
    cart: (data as any).cart ?? [],
    firstName: data.firstName,
    lastName: data.lastName,
    gender: data.gender,
    address: (data as any).address,
    phoneNumber: (data as any).phoneNumber,
    dateOfBirth: (data as any).dateOfBirth,
    location: (data as any).location,
    country: (data as any).country,
    city: (data as any).city,
    postalCode: (data as any).postalCode,
  };
};

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
  const payload: any = {
    ...product,
    // Support case-insensitive prefix search in Firestore queries
    nameLower: (product.name || '').toString().trim().toLowerCase(),
    keywords: buildKeywords(product),
  };
  const docRef = await addDoc(productsCollection, payload);
  const created: Types.Product = {
    id: docRef.id,
    name: product.name,
    price: product.price,
    promotionPercent: (product as any).promotionPercent,
    category: product.category,
    image: product.image,
    description: product.description,
    stock: product.stock,
    rating: product.rating,
    isNewArrival: product.isNewArrival ?? false,
    colors: (product as any).colors,
  };
  return created;
};

// Upload a product image file to Firebase Storage and return its download URL
export const uploadProductImage = async (file: File, productName: string): Promise<string> => {
  // Lazy-load Firebase Storage so it doesn't bloat the initial customer bundle.
  const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const storage = getStorage(firebaseApp);
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
  const payload: any = { ...updatedProduct };

  // Keep derived search fields consistent when relevant fields change.
  const touchesSearchFields =
    typeof updatedProduct.name === 'string' ||
    typeof updatedProduct.category === 'string' ||
    typeof updatedProduct.description === 'string';

  if (touchesSearchFields) {
    const existingSnap = await getDoc(productDoc);
    const existing = (existingSnap.exists() ? (existingSnap.data() as any) : {}) as Partial<Types.Product>;
    const merged: Partial<Types.Product> = { ...existing, ...updatedProduct };
    payload.nameLower = (merged.name || '').toString().trim().toLowerCase();
    payload.keywords = buildKeywords(merged);
  } else if (typeof updatedProduct.name === 'string') {
    payload.nameLower = updatedProduct.name.trim().toLowerCase();
  }

  await updateDoc(productDoc, payload);
};

// -------------------- Search --------------------
// Firebase-backed prefix search by product name.
// Requires products documents to have `nameLower` (added by create/update above).
export const searchProductsByName = async (termRaw: string, max = 30): Promise<Types.Product[]> => {
  const term = (termRaw || '').trim().toLowerCase();
  if (!term) return [];

  const token = term.split(/\s+/).filter(Boolean)[0] || term;

  // 1) Prefix match on nameLower
  const q1 = query(
    productsCollection,
    orderBy('nameLower'),
    where('nameLower', '>=', term),
    where('nameLower', '<=', term + '\uf8ff'),
    limit(Math.max(1, Math.min(100, max)))
  );

  // 2) Keyword match (works for things like "shirt" even if name doesn't start with it)
  const q2 = query(
    productsCollection,
    where('keywords', 'array-contains', token),
    limit(Math.max(1, Math.min(100, max)))
  );

  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  const merged = new Map<string, Types.Product>();
  for (const d of snap1.docs) merged.set(d.id, { id: d.id, ...(d.data() as Omit<Types.Product, 'id'>) });
  for (const d of snap2.docs) merged.set(d.id, { id: d.id, ...(d.data() as Omit<Types.Product, 'id'>) });

  const out = Array.from(merged.values());
  // If old products lack keywords, fall back to client-side contains for small catalogs.
  if (out.length === 0) {
    const all = await getProducts();
    const needle = term;
    return all
      .filter((p) => {
        const hay = `${p.name || ''} ${p.category || ''} ${p.description || ''}`.toLowerCase();
        return hay.includes(needle);
      })
      .slice(0, Math.max(1, Math.min(100, max)));
  }
  return out.slice(0, Math.max(1, Math.min(100, max)));
};

// Strict name-only search (no keywords/category text). Useful when you only
// want results that match the product name. Uses the same Firestore `nameLower`
// prefix strategy and falls back to client-side filter on name only.
export const searchProductsByNameOnly = async (termRaw: string, max = 30): Promise<Types.Product[]> => {
  const term = (termRaw || '').trim().toLowerCase();
  if (!term) return [];

  const q1 = query(
    productsCollection,
    orderBy('nameLower'),
    where('nameLower', '>=', term),
    where('nameLower', '<=', term + '\uf8ff'),
    limit(Math.max(1, Math.min(100, max)))
  );

  const snap = await getDocs(q1);
  const out = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Types.Product, 'id'>) }));
  if (out.length > 0) return out.slice(0, Math.max(1, Math.min(100, max)));

  // Fallback: client-side filter by name only (helps old docs missing `nameLower`).
  const all = await getProducts();
  const needle = term;
  return all
    .filter((p) => String(p.name || '').toLowerCase().includes(needle))
    .slice(0, Math.max(1, Math.min(100, max)));
};

// Backfill/repair derived search fields for all products.
// Writes `nameLower` and `keywords` in batches (Firestore batch limit is 500).
export const reindexAllProductsSearchFields = async (): Promise<number> => {
  const snap = await getDocs(productsCollection);
  if (snap.empty) return 0;

  const docs = snap.docs;
  const chunkSize = 450;
  let updated = 0;

  for (let i = 0; i < docs.length; i += chunkSize) {
    const batch = writeBatch(db);
    const slice = docs.slice(i, i + chunkSize);
    for (const d of slice) {
      const data = (d.data() as any) || {};
      const name = String(data?.name || '').trim();
      const category = String(data?.category || '').trim();
      const description = String(data?.description || '').trim();
      const merged = { name, category, description } as Partial<Types.Product>;
      batch.update(d.ref, {
        nameLower: name.toLowerCase(),
        keywords: buildKeywords(merged),
      } as any);
      updated += 1;
    }
    await batch.commit();
  }

  return updated;
};

// -------------------- Wishlist (Users) --------------------
export const addToWishlist = async (userId: string, productId: string) => {
  if (!userId || !productId) return;
  await updateDoc(doc(db, 'users', userId), { wishlist: arrayUnion(productId) } as any);
};

export const removeFromWishlist = async (userId: string, productId: string) => {
  if (!userId || !productId) return;
  await updateDoc(doc(db, 'users', userId), { wishlist: arrayRemove(productId) } as any);
};

// -------------------- Cart (Users) --------------------
// Transaction-safe cart item upsert.
export const setCartItemQuantity = async (userId: string, productId: string, quantity: number) => {
  if (!userId || !productId) return;
  const qty = Math.max(0, Math.floor(Number(quantity) || 0));
  const userRef = doc(db, 'users', userId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    const data = (snap.exists() ? (snap.data() as any) : {}) as any;
    const prevCart: { productId: string; quantity: number }[] = Array.isArray(data.cart) ? data.cart : [];

    const nextCart = prevCart
      .map((ci) => ({ productId: String(ci.productId), quantity: Math.max(1, Number(ci.quantity || 1)) }))
      .filter((ci) => ci.productId && ci.productId !== productId);

    if (qty > 0) nextCart.push({ productId, quantity: qty });
    nextCart.sort((a, b) => a.productId.localeCompare(b.productId));

    tx.set(userRef, { cart: nextCart }, { merge: true });
  });
};

export type CartLine = { productId: string; quantity: number };

// Cart V2: store cart items in a subcollection for per-item atomic updates.
// Path: users/{uid}/cartItems/{productId}
export const listenUserCartItems = (userId: string, cb: (items: CartLine[]) => void) => {
  if (!userId) {
    cb([]);
    return () => {};
  }
  const cartCol = collection(db, 'users', userId, 'cartItems');
  const unsub = onSnapshot(
    cartCol,
    (snap) => {
      const items = snap.docs
        .map((d) => {
          const data = d.data() as any;
          const productId = String(data?.productId || d.id);
          const quantity = Math.max(1, Number(data?.quantity || 1));
          if (!productId) return null;
          return { productId, quantity } as CartLine;
        })
        .filter(Boolean) as CartLine[];
      items.sort((a, b) => a.productId.localeCompare(b.productId));
      cb(items);
    },
    (err) => {
      console.error('Error listening to cartItems:', err);
      cb([]);
    }
  );
  return unsub;
};

// Batch-sync cartItems using a known previous snapshot (recommended to avoid extra reads).
export const syncUserCartItems = async (userId: string, desired: CartLine[], previous?: CartLine[]) => {
  if (!userId) return;
  const cartCol = collection(db, 'users', userId, 'cartItems');

  const prev = Array.isArray(previous) ? previous : [];
  const prevMap = new Map(prev.map((i) => [i.productId, i.quantity]));
  const desiredClean = (desired || [])
    .map((i) => ({ productId: String(i.productId), quantity: Math.max(1, Number(i.quantity || 1)) }))
    .filter((i) => i.productId);
  const desiredMap = new Map(desiredClean.map((i) => [i.productId, i.quantity]));

  const batch = writeBatch(db);

  // Deletes
  for (const productId of prevMap.keys()) {
    if (!desiredMap.has(productId)) {
      batch.delete(doc(cartCol, productId));
    }
  }

  // Upserts
  for (const [productId, quantity] of desiredMap.entries()) {
    batch.set(
      doc(cartCol, productId),
      { productId, quantity, updatedAt: serverTimestamp() } as any,
      { merge: true }
    );
  }

  await batch.commit();
};

// One-time migration: if a user still has the legacy `users/{uid}.cart` array,
// copy it into the cartItems subcollection (only when cartItems is empty).
export const migrateLegacyCartToCartItemsIfNeeded = async (userId: string) => {
  if (!userId) return;

  const userRef = doc(db, 'users', userId);
  const cartCol = collection(db, 'users', userId, 'cartItems');

  // If cartItems already has data, do nothing.
  const existing = await getDocs(query(cartCol, limit(1)));
  if (!existing.empty) return;

  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;
  const data = userSnap.data() as any;
  const legacy: any[] = Array.isArray(data?.cart) ? data.cart : [];
  if (!legacy.length) return;

  const desired: CartLine[] = legacy
    .map((ci: any) => ({ productId: String(ci?.productId || ''), quantity: Math.max(1, Number(ci?.quantity || 1)) }))
    .filter((ci) => ci.productId);
  if (!desired.length) return;

  const batch = writeBatch(db);
  for (const item of desired) {
    batch.set(doc(cartCol, item.productId), { ...item, updatedAt: serverTimestamp() } as any, { merge: true });
  }
  // Clear legacy array to avoid future confusion (best-effort).
  batch.set(userRef, { cart: [] } as any, { merge: true });
  await batch.commit();
};

// Backwards-compatible cart clear: clears both the legacy users/{uid}.cart array and the new cartItems subcollection.
export const clearUserCart = async (userId: string) => {
  if (!userId) return;
  // Best-effort legacy clear
  try {
    await updateDoc(doc(db, 'users', userId), { cart: [] } as any);
  } catch {}

  // Clear cartItems
  const cartCol = collection(db, 'users', userId, 'cartItems');
  const snap = await getDocs(cartCol);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
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
      return mapUserDoc(userId, data);
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

// Real-time user profile listener (cart/wishlist/etc)
export const listenUser = (userId: string, cb: (user: Types.User | null) => void) => {
  const userRef = doc(db, 'users', userId);
  const unsub = onSnapshot(
    userRef,
    (snap) => {
      if (!snap.exists()) {
        cb(null);
        return;
      }
      cb(mapUserDoc(userId, snap.data() as Partial<Types.User>));
    },
    (err) => {
      console.error('Error listening to user:', err);
      cb(null);
    }
  );
  return unsub;
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

export const createOrder = async (order: Omit<Types.Order, 'id'>): Promise<Types.Order> => {
  const ordersCol = collection(db, 'orders');
  const payload: any = {
    ...order,
    // keep a server timestamp for reliable sorting, and keep date as a readable string/iso
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(ordersCol, payload);
  return { id: docRef.id, ...(order as any) } as Types.Order;
};

// Create an order and decrement product stock in a single transaction.
// This prevents overselling and keeps stock accurate immediately after payment.
export const createOrderAndDecrementStock = async (order: Omit<Types.Order, 'id'>): Promise<Types.Order> => {
  const ordersCol = collection(db, 'orders');
  const orderRef = doc(ordersCol);

  await runTransaction(db, async (tx) => {
    const items = Array.isArray((order as any)?.items) ? (order as any).items : [];

    // Aggregate quantities per productId (and ensure Firestore transaction rule: all reads before writes).
    const qtyByProductId = new Map<string, number>();
    for (const it of items) {
      const productId = String(it?.productId || '');
      const qty = Math.max(1, Number(it?.quantity || 1));
      if (!productId) continue;
      qtyByProductId.set(productId, (qtyByProductId.get(productId) || 0) + qty);
    }

    const productRefs = Array.from(qtyByProductId.keys()).map((productId) => doc(db, 'products', productId));

    // 1) READS
    const stockByProductId = new Map<string, number>();
    for (const ref of productRefs) {
      const snap = await tx.get(ref);
      if (!snap.exists()) {
        throw new Error('Product not found');
      }
      const p = (snap.data() as any) || {};
      stockByProductId.set(ref.id, Math.max(0, Number(p?.stock || 0)));
    }

    // 2) VALIDATE
    for (const [productId, qty] of qtyByProductId.entries()) {
      const prevStock = stockByProductId.get(productId) ?? 0;
      if (prevStock < qty) {
        throw new Error('Out of stock');
      }
    }

    // 3) WRITES
    for (const [productId, qty] of qtyByProductId.entries()) {
      const prevStock = stockByProductId.get(productId) ?? 0;
      tx.update(doc(db, 'products', productId), { stock: prevStock - qty } as any);
    }

    tx.set(
      orderRef,
      {
        ...order,
        createdAt: serverTimestamp(),
        // Track that stock has already been deducted at checkout.
        stockAdjusted: true,
      } as any,
      { merge: true }
    );
  });

  return { id: orderRef.id, ...(order as any) } as Types.Order;
};

// Real-time orders listener for a specific user (more efficient than listening to all orders)
export const listenOrdersByUser = (userId: string, cb: (orders: Types.Order[]) => void) => {
  const ordersCol = collection(db, 'orders');
  const q = query(ordersCol, where('userId', '==', userId));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const data = snapshot.docs
      .map((d) => ({ id: d.id, ...(d.data() as Partial<Types.Order>) })) as Types.Order[];
    // Sort client-side to avoid needing composite indexes and handle older docs without createdAt.
    data.sort((a: any, b: any) => {
      const ad = (a?.createdAt?.toMillis?.() ?? Date.parse(String(a?.date || '')) ?? 0) as number;
      const bd = (b?.createdAt?.toMillis?.() ?? Date.parse(String(b?.date || '')) ?? 0) as number;
      return bd - ad;
    });
    cb(data);
  });
  return unsubscribe;
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
  const orderRef = doc(db, 'orders', id);
  const nextStatus = String(status);

  await runTransaction(db, async (tx) => {
    const orderSnap = await tx.get(orderRef);
    if (!orderSnap.exists()) return;

    const order = (orderSnap.data() as any) || {};
    const prevStatus = String(order.status || '');
    const items = Array.isArray(order.items) ? order.items : [];
    const wasDeductedAtCheckout = Boolean(order.stockAdjusted);
    const alreadyRestored = Boolean(order.stockRestored);

    const cancelled = String(Types.OrderStatus.CANCELLED);
    const shouldRestore = nextStatus === cancelled && wasDeductedAtCheckout && !alreadyRestored;

    if (shouldRestore && items.length) {
      const qtyByProductId = new Map<string, number>();
      for (const it of items) {
        const productId = String(it?.productId || '');
        const qty = Math.max(1, Number(it?.quantity || 1));
        if (!productId) continue;
        qtyByProductId.set(productId, (qtyByProductId.get(productId) || 0) + qty);
      }

      const productRefs = Array.from(qtyByProductId.keys()).map((productId) => doc(db, 'products', productId));

      // 1) READS
      const stockByProductId = new Map<string, number>();
      for (const ref of productRefs) {
        const productSnap = await tx.get(ref);
        if (!productSnap.exists()) continue;
        const p = (productSnap.data() as any) || {};
        stockByProductId.set(ref.id, Math.max(0, Number(p?.stock || 0)));
      }

      // 2) WRITES
      for (const [productId, qty] of qtyByProductId.entries()) {
        const prevStock = stockByProductId.get(productId);
        if (prevStock == null) continue;
        tx.update(doc(db, 'products', productId), { stock: prevStock + qty } as any);
      }
    }

    tx.update(orderRef, {
      status: nextStatus,
      statusUpdatedAt: serverTimestamp(),
      previousStatus: prevStatus,
      stockAdjusted: shouldRestore ? false : wasDeductedAtCheckout,
      stockRestored: shouldRestore ? true : alreadyRestored,
    } as any);
  });
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