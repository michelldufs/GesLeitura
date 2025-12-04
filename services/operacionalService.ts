import { 
  collection, getDocs, addDoc, updateDoc, doc, query, where 
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import { logAction } from "./logService";
import { Cota, Operador } from "../types";

// Generic fetcher for active documents
export const getActiveCollection = async <T>(collectionName: string): Promise<T[]> => {
  const q = query(collection(db, collectionName), where("active", "==", true));
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
  // Ordenar por codigo ou nome crescente se disponível
  data.sort((a: any, b: any) => {
    const aSort = a.codigo || a.nome || '';
    const bSort = b.codigo || b.nome || '';
    return (aSort as string).localeCompare(bSort as string);
  });
  return data;
};

export const saveCota = async (cota: Omit<Cota, 'id'>, userId: string) => {
  const docRef = await addDoc(collection(db, "cotas"), { ...cota, active: true });
  await logAction(userId, 'create', 'cotas', docRef.id, `Nova cota: ${cota.nome}`);
  return docRef.id;
};

export const updateCota = async (id: string, data: Partial<Cota>, userId: string) => {
  const docRef = doc(db, "cotas", id);
  await updateDoc(docRef, data);
  await logAction(userId, 'update', 'cotas', id, `Atualização dados cota`);
};

export const softDelete = async (collectionName: string, id: string, userId: string) => {
  const docRef = doc(db, collectionName, id);
  await updateDoc(docRef, { active: false });
  await logAction(userId, 'soft-delete', collectionName, id, 'Registro desativado');
};