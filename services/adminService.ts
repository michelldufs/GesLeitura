import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp, collection, query, getDocs, where, DocumentData, orderBy } from "firebase/firestore";
import { auth, db, functions, getSecondaryAuth } from "./firebaseConfig";
import { httpsCallable } from "firebase/functions";
import { UserRole, UserProfile } from "../types";
import { logger } from '../utils/logger';

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
        const q = query(collection(db, "users"));
        const querySnapshot = await getDocs(q);
        const users = querySnapshot.docs.map(doc => {
            return doc.data() as UserProfile;
        });
        
        // Filter by localidade in memory if needed
        let filteredUsers = users;
        if (localidadeId) {
            filteredUsers = users.filter(u => u.allowedLocalidades?.includes(localidadeId));
        }
        
        // Sort by displayName or email in ascending order
        return filteredUsers.sort((a: any, b: any) => {
            const aName = a.displayName || a.email || '';
            const bName = b.displayName || b.email || '';
            return aName.localeCompare(bName);
        });
    },

    async getAuthUsers() {
        // Descontinuado: Usuários inativos foram desativados no Firebase Auth
        // Agora apenas usuários do Firestore collection "users" são utilizados
        return [];
    },

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

    async updateUser(uid: string, data: { name?: string; role?: UserRole; allowedLocalidades?: string[]; allowedDeviceSerial?: string; active?: boolean }) {
        await setDoc(doc(db, "users", uid), data, { merge: true });
    },

    async updateUserPassword(email: string, newPassword: string) {
        // Note: Changing password via client SDK requires re-authentication
        // This is a limitation - ideally use Cloud Function with Admin SDK
        throw new Error('Alteração de senha requer Cloud Function. Use o console Firebase por enquanto.');
    },

    async getLocalidades() {
        try {
            // Buscar todas as localidades sem filtro (evita necessidade de índice composto)
            const q = query(collection(db, "localidades"));
            const querySnapshot = await getDocs(q);
            const allLocs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Filtrar ativas e ordenar em memória
            return allLocs
                .filter((loc: any) => loc.active !== false)
                .sort((a: any, b: any) => (a.nome || '').localeCompare(b.nome || ''));
        } catch (error) {
            logger.error('Erro ao buscar localidades:', error);
            return [];
        }
    }
};
