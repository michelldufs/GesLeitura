"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncAuthUsersToFirestore = exports.listAuthUsers = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
function isAdminContext(context) {
    const uid = context.auth?.uid;
    if (!uid)
        return false;
    return db.doc(`users/${uid}`).get().then(doc => {
        const role = doc.exists ? doc.data().role : undefined;
        return role === 'admin';
    });
}
exports.listAuthUsers = functions.region('us-central1').https.onCall(async (data, context) => {
    const allowed = await isAdminContext(context);
    if (!allowed) {
        throw new functions.https.HttpsError('permission-denied', 'Apenas administradores podem listar usuários.');
    }
    const users = [];
    let nextPageToken = undefined;
    do {
        const result = await admin.auth().listUsers(1000, nextPageToken);
        result.users.forEach(u => users.push({
            uid: u.uid,
            email: u.email || null,
            displayName: u.displayName || null,
            disabled: u.disabled || false,
            creationTime: u.metadata?.creationTime || null,
            lastSignInTime: u.metadata?.lastSignInTime || null,
        }));
        nextPageToken = result.pageToken;
    } while (nextPageToken);
    return { users };
});
exports.syncAuthUsersToFirestore = functions.region('us-central1').https.onCall(async (data, context) => {
    const allowed = await isAdminContext(context);
    if (!allowed) {
        throw new functions.https.HttpsError('permission-denied', 'Apenas administradores podem sincronizar perfis.');
    }
    const batch = db.batch();
    const snapshot = await admin.auth().listUsers(1000);
    snapshot.users.forEach(u => {
        const ref = db.doc(`users/${u.uid}`);
        batch.set(ref, {
            uid: u.uid,
            email: u.email || null,
            name: u.displayName || (u.email ? u.email.split('@')[0] : 'Usuário'),
            role: 'coleta',
            active: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    });
    await batch.commit();
    return { count: snapshot.users.length };
});
//# sourceMappingURL=index.js.map