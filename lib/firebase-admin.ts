import * as admin from "firebase-admin";

function getAdminDb(): admin.firestore.Firestore {
  if (!admin.apps.length) {
    const serviceAccountRaw = process.env.FIREBASE_ADMIN_SDK_KEY;

    if (!serviceAccountRaw) {
      throw new Error(
        "FIREBASE_ADMIN_SDK_KEY environment variable is not set. " +
          "Generate a service account key from Firebase Console → Project Settings → Service Accounts."
      );
    }

    let serviceAccount: admin.ServiceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountRaw) as admin.ServiceAccount;
    } catch {
      throw new Error(
        "FIREBASE_ADMIN_SDK_KEY is not valid JSON. Make sure the entire JSON is on one line."
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.projectId,
    });
  }

  return admin.firestore();
}

export { getAdminDb };
export default admin;
