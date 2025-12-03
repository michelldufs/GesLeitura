import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../services/firebaseConfig";

/**
 * Generates the next sequential code for a collection.
 * Assumes the collection has a numeric field 'codigo'.
 */
export const getNextCode = async (collectionName: string): Promise<number> => {
  try {
    const q = query(
      collection(db, collectionName),
      orderBy("codigo", "desc"),
      limit(1)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return 1;
    }
    
    const lastDoc = snapshot.docs[0].data();
    return (lastDoc.codigo || 0) + 1;
  } catch (error) {
    console.error("Error generating next code:", error);
    return 0; // Fail safe
  }
};