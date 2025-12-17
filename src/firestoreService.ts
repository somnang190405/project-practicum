// src/services/firestoreService.ts

import { db } from '../services/firebase';
import { collection, getDocs, getDoc, doc, DocumentData, QueryDocumentSnapshot, setDoc } from 'firebase/firestore';
import * as Types from '../types';

// Helper to convert Firestore DocumentSnapshot to our Product type
const productConverter = (doc: QueryDocumentSnapshot<DocumentData>): Types.Product => {
  const data = doc.data();
  // Ensure the fields map correctly to your Product interface from types.ts
  return {
    id: doc.id,
    name: data.name,
    price: data.price,
    category: data.category,
    image: data.image,
    description: data.description,
    stock: data.stock,
    rating: data.rating,
  } as Types.Product;
};

// --- Product CRUD Operations ---

export const getProducts = async (): Promise<Types.Product[]> => {
  console.log("Fetching products from Firestore...");
  // Fetches documents from the 'products' collection
  const productsCollection = collection(db, 'products');
  const snapshot = await getDocs(productsCollection);
  return snapshot.docs.map(productConverter);
};

// --- User Operations (for custom profile data) ---

export const saveUserToFirestore = async (user: Types.User) => {
    console.log(`Saving user ${user.id} to Firestore...`);
    // Uses the user's UID as the document ID in the 'users' collection
    const userRef = doc(db, 'users', user.id);
    await setDoc(userRef, user);
}

export const getUserFromFirestore = async (userId: string): Promise<Types.User | null> => {
    console.log(`Fetching user ${userId} from Firestore...`);
    const userRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
        // Cast the data to the User interface
        return docSnap.data() as Types.User;
    } else {
        return null;
    }
}