import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

function isAdminContext(context: functions.https.CallableContext) {
  const uid = context.auth?.uid;
  if (!uid) return false;
  return db.doc(`users/${uid}`).get().then(doc => {
    const role = doc.exists ? (doc.data() as any).role : undefined;
    return role === 'admin';
  });
}

export const listAuthUsers = functions.region('us-central1').https.onCall(async (data, context) => {
  const allowed = await isAdminContext(context);
  if (!allowed) {
    throw new functions.https.HttpsError('permission-denied', 'Apenas administradores podem listar usuários.');
  }

  const users: any[] = [];
  let nextPageToken: string | undefined = undefined;
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

export const syncAuthUsersToFirestore = functions.region('us-central1').https.onCall(async (data, context) => {
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
