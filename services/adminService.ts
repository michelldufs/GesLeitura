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

    async getUsers() {
        const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => doc.data() as UserProfile);
    }
};
