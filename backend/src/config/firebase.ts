import admin from 'firebase-admin';
import path from 'path';

const serviceAccountPath = path.join(__dirname, '../../firebase-admin-key.json');

try {
  const serviceAccount = require(serviceAccountPath);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error);
  process.exit(-1);
}

export const auth = admin.auth();
export default admin;