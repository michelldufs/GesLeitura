import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp, collection, query, getDocs, where, DocumentData, orderBy } from "firebase/firestore";
import { auth, db, functions, getSecondaryAuth } from "./firebaseConfig";
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
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('Você precisa estar logado para criar usuários.');
        
        // Use secondary auth instance to create user without affecting admin session
        const secondaryAuth = getSecondaryAuth();
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, data.email, data.password);
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

        // Sign out from secondary auth to clean up
        await secondaryAuth.signOut();
        
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
        // Always fetch all users to avoid Firestore index requirements
        console.log('Buscando TODOS os usuários (filtro de localidade desabilitado)');
        const q = query(collection(db, "users"));
        const querySnapshot = await getDocs(q);
        console.log('Documentos encontrados:', querySnapshot.docs.length);
        const users = querySnapshot.docs.map(doc => {
            console.log('Usuário:', doc.id, doc.data());
            return doc.data() as UserProfile;
        });
        
        // Filter by localidade in memory if needed
        let filteredUsers = users;
        if (localidadeId) {
            filteredUsers = users.filter(u => u.allowedLocalidades?.includes(localidadeId));
        }
        
        // Sort in memory by createdAt if available, otherwise by name
        return filteredUsers.sort((a: any, b: any) => {
            if (a.createdAt && b.createdAt) {
                return b.createdAt.seconds - a.createdAt.seconds;
            }
            return (a.name || '').localeCompare(b.name || '');
        });
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
    },

    async updateUser(uid: string, data: { name?: string; role?: UserRole; allowedLocalidades?: string[]; allowedDeviceSerial?: string }) {
        await setDoc(doc(db, "users", uid), data, { merge: true });
    },

    async updateUserPassword(email: string, newPassword: string) {
        // Note: Changing password via client SDK requires re-authentication
        // This is a limitation - ideally use Cloud Function with Admin SDK
        throw new Error('Alteração de senha requer Cloud Function. Use o console Firebase por enquanto.');
    },

    async getLocalidades() {
        const q = query(collection(db, "localidades"), where("active", "==", true), orderBy("nome", "asc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
};
