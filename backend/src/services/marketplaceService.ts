import { firestoreAdmin } from '../config/firebaseAdmin';
import * as admin from 'firebase-admin'; // Import admin for FieldValue

const marketplaceCollection = firestoreAdmin.collection('marketplaceItems');

export const getMarketplaceItemsService = async () => {
  try {
    const snapshot = await marketplaceCollection.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching marketplace items from Firestore:', error);
    throw error; // Re-throw the error for controller to handle
  }
};

export const getMarketplaceItemByIdService = async (id: string) => {
  try {
    const doc = await marketplaceCollection.doc(id).get();
    if (!doc.exists) {
      return null; // Item not found
    }
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error(`Error fetching marketplace item ${id} from Firestore:`, error);
    throw error;
  }
};

export const createMarketplaceItemService = async (itemData: any) => {
  try {
    const newItem = {
      ...itemData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(), // Add server timestamp
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const docRef = await marketplaceCollection.add(newItem);
    return { id: docRef.id, ...newItem }; // Return item with generated ID
  } catch (error) {
    console.error('Error creating marketplace item in Firestore:', error);
    throw error;
  }
};

export const updateMarketplaceItemService = async (id: string, itemData: any) => {
  try {
    const itemRef = marketplaceCollection.doc(id);
    const doc = await itemRef.get();
    if (!doc.exists) {
      return null; // Item not found for update
    }
    const updatedData = {
      ...itemData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(), // Update timestamp on modification
    };
    await itemRef.update(updatedData);
    return { id, ...updatedData }; // Return updated item
  } catch (error) {
    console.error(`Error updating marketplace item ${id} in Firestore:`, error);
    throw error;
  }
};

export const deleteMarketplaceItemService = async (id: string) => {
  try {
    const itemRef = marketplaceCollection.doc(id);
    const doc = await itemRef.get();
    if (!doc.exists) {
      return null; // Item not found for delete
    }
    await itemRef.delete();
    return { message: `Item ${id} deleted successfully` };
  } catch (error) {
    console.error(`Error deleting marketplace item ${id} from Firestore:`, error);
    throw error;
  }
}; 