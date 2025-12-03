import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp, collection, query, orderBy, getDocs, where } from "firebase/firestore";
import { auth, db, functions } from "./firebaseConfig";
import { httpsCallable } from "firebase/functions";
import { UserRole, UserProfile } from "../types";

export interface CreateUserData {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    allowedDeviceSerial?: string;
    allowedLocalidades?: string[];
}

export const adminService = {
    async createUser(data: CreateUserData) {
        // Save current admin for re-login attempt
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('Você precisa estar logado para criar usuários.');
        
        // Create new user (this will log them in automatically - Firebase limitation)
        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        const newUser = userCredential.user;

        // Create Firestore profile for new user
        await setDoc(doc(db, "users", newUser.uid), {
            uid: newUser.uid,
            name: data.name,
            email: data.email,
            role: data.role,
            allowedDeviceSerial: data.allowedDeviceSerial || null,
            allowedLocalidades: data.allowedLocalidades || [],
            active: true,
            createdAt: serverTimestamp()
        });

        // CRITICAL: Sign out to prevent auto-redirect to new user's role-based route
        // Admin will need to re-login (Firebase client SDK limitation)
        await auth.signOut();
        
        return newUser;
    },

    async createUserProfileOnly(data: Omit<CreateUserData, 'password'> & { uid?: string }) {
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
            allowedLocalidades: data.allowedLocalidades || [],
            active: true,
            createdAt: serverTimestamp()
        });
        return { uid: targetUid } as { uid: string };
    },

    async getUsers(localidadeId?: string) {
        let q;
        if (localidadeId) {
            q = query(
                collection(db, "users"),
                where("allowedLocalidades", "array-contains", localidadeId),
                orderBy("createdAt", "desc")
            );
        } else {
            q = query(collection(db, "users"), orderBy("createdAt", "desc"));
        }
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => doc.data() as UserProfile);
    },

    async getAuthUsers() {
        const callable = httpsCallable(functions, 'listAuthUsers');
        const res: any = await callable();
        return (res.data?.users || []) as Array<{
            uid: string;
            email: string | null;
            displayName?: string | null;
            disabled?: boolean;
            creationTime?: string | null;
            lastSignInTime?: string | null;
        }>;
    }
,
    async bulkSyncProfiles(items: Array<{ uid: string; email: string; name: string; role: UserRole; allowedDeviceSerial?: string; allowedLocalidades?: string[] }>) {
        const results: Array<{ uid: string; ok: boolean; error?: string }> = [];
        for (const item of items) {
            try {
                await setDoc(doc(db, "users", item.uid), {
                    uid: item.uid,
                    name: item.name,
                    email: item.email,
                    role: item.role,
                    allowedDeviceSerial: item.allowedDeviceSerial || null,
                    allowedLocalidades: item.allowedLocalidades || [],
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
