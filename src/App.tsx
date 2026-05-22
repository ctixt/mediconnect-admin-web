import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './config/firebase';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import './App.css';

function App() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          setIsAdmin(false);
          setCheckingSession(false);
          return;
        }

        const userSnap = await getDoc(doc(db, 'users', user.uid));

        if (!userSnap.exists()) {
          await signOut(auth);
          setIsAdmin(false);
          setCheckingSession(false);
          return;
        }

        const userData = userSnap.data();
        const role = String(userData.role || '').trim().toLowerCase();

        const accountStatus = String(userData.accountStatus || 'activo')
          .trim()
          .toLowerCase();

        if (
          role !== 'admin' ||
          accountStatus === 'suspendido' ||
          accountStatus === 'desactivado' ||
          accountStatus === 'bloqueado'
        ) {
          await signOut(auth);
          setIsAdmin(false);
          setCheckingSession(false);
          return;
        }

        setIsAdmin(true);
        setCheckingSession(false);
      } catch (error) {
        console.log(error);
        await signOut(auth);
        setIsAdmin(false);
        setCheckingSession(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (checkingSession) {
    return (
      <div className="app-loading">
        <div className="loader-card">
          <div className="loader-icon">+</div>
          <p>Verificando sesión administrativa...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <LoginPage onAdminLogin={() => setIsAdmin(true)} />;
  }

  return <DashboardPage onLogout={() => setIsAdmin(false)} />;
}

export default App;