import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDjedGWxU1CvxVgt8jwYEI0mJyZRvBoEzc',
  authDomain: 'mediconnect-776ac.firebaseapp.com',
  projectId: 'mediconnect-776ac',
  storageBucket: 'mediconnect-776ac.firebasestorage.app',
  messagingSenderId: '266884697699',
  appId: '1:266884697699:web:fdb9955c9e6a9e482d3256',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);