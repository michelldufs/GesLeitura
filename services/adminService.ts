import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp, collection, query, orderBy, getDocs } from "firebase/firestore";
import { auth, db } from "./firebaseConfig";
import { UserRole, UserProfile } from "../types";

export interface CreateUserData {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    allowedDeviceSerial?: string;
}

export const adminService = {
    async createUser(data: CreateUserData) {
        // WARNING: This will sign in the new user immediately in the client SDK.
        // In a real production app, use Firebase Admin SDK via Cloud Functions.
        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            name: data.name,
            email: data.email,
            role: data.role,
            allowedDeviceSerial: data.allowedDeviceSerial || null,
            active: true,
            createdAt: serverTimestamp()
        });

        return user;
    },

    async createUserProfileOnly(data: Omit<CreateUserData, 'password'> & { uid?: string }) {
        // Creates or updates only the Firestore profile document without creating Auth user.
        // If uid is provided, it will be used; otherwise, it will create a doc with a generated id (not ideal).
        // Prefer passing the real Firebase Auth UID when available.
        const targetUid = data.uid || undefined;
        if (!targetUid) {
            throw new Error('UID do usuário é obrigatório para sincronizar perfil existente.');
        }

        await setDoc(doc(db, "users", targetUid), {
            uid: targetUid,
            name: data.name,
            email: data.email,
            role: data.role,
            allowedDeviceSerial: data.allowedDeviceSerial || null,
            active: true,
            createdAt: serverTimestamp()
        });
        return { uid: targetUid } as { uid: string };
    },

    async getUsers() {
        const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => doc.data() as UserProfile);
    }
,
    async bulkSyncProfiles(items: Array<{ uid: string; email: string; name: string; role: UserRole; allowedDeviceSerial?: string }>) {
        const results: Array<{ uid: string; ok: boolean; error?: string }> = [];
        for (const item of items) {
            try {
                await setDoc(doc(db, "users", item.uid), {
                    uid: item.uid,
                    name: item.name,
                    email: item.email,
                    role: item.role,
                    allowedDeviceSerial: item.allowedDeviceSerial || null,
                    active: true,
                    createdAt: serverTimestamp()
                });
                results.push({ uid: item.uid, ok: true });
            } catch (e: any) {
                results.push({ uid: item.uid, ok: false, error: e?.message || String(e) });
            }
        }
        return results;
    }
};
