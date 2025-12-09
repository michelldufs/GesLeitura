import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { AuditLog } from "../types";
import { logger } from '../utils/logger';

export const logAction = async (
  userId: string,
  action: AuditLog['action'],
  collectionName: string,
  docId: string,
  details: string
) => {
  try {
    const logData: AuditLog = {
      timestamp: serverTimestamp(),
      userId,
      action,
      collection: collectionName,
      docId,
      details
    };
    await addDoc(collection(db, "audit_logs"), logData);
  } catch (error) {
    logger.error("Critical: Failed to write audit log", error);
    // In a real production app, this might trigger a dedicated alert
  }
};