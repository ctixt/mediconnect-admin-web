import { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

type LoginPageProps = {
  onAdminLogin: () => void;
};

type FirebaseErrorLike = {
  code?: string;
  message?: string;
};

export default function LoginPage({ onAdminLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');

  const normalizeEmail = (value: string) => {
    return value.trim().toLowerCase();
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setMessage('Ingresa tu correo y contraseña.');
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      const credential = await signInWithEmailAndPassword(
        auth,
        normalizeEmail(email),
        password
      );

      const userSnap = await getDoc(doc(db, 'users', credential.user.uid));

      if (!userSnap.exists()) {
        await signOut(auth);
        setMessage('No se encontró el perfil del usuario en el sistema.');
        return;
      }

      const userData = userSnap.data();

      const role = String(userData.role || '').trim().toLowerCase();

      const accountStatus = String(userData.accountStatus || 'activo')
        .trim()
        .toLowerCase();

      if (
        accountStatus === 'suspendido' ||
        accountStatus === 'desactivado' ||
        accountStatus === 'bloqueado'
      ) {
        await signOut(auth);
        setMessage('Tu cuenta se encuentra suspendida o desactivada.');
        return;
      }

      if (role !== 'admin') {
        await signOut(auth);
        setMessage('Acceso denegado. Esta web es solo para administradores.');
        return;
      }

      onAdminLogin();
    } catch (error: unknown) {
      console.log(error);

      const firebaseError = error as FirebaseErrorLike;

      let errorMessage = 'No se pudo iniciar sesión. Verifica tus datos.';

      if (firebaseError.code === 'auth/invalid-email') {
        errorMessage = 'El correo no tiene un formato válido.';
      }

      if (
        firebaseError.code === 'auth/invalid-credential' ||
        firebaseError.code === 'auth/wrong-password' ||
        firebaseError.code === 'auth/user-not-found'
      ) {
        errorMessage = 'Correo o contraseña incorrectos.';
      }

      if (firebaseError.code === 'auth/too-many-requests') {
        errorMessage =
          'Demasiados intentos fallidos. Intenta nuevamente más tarde.';
      }

      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand-box">
          <div className="brand-icon">+</div>
          <h1>MediConnect Admin</h1>
          <p>Panel web administrativo para supervisión del sistema.</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <h2>Iniciar sesión</h2>
          <p className="form-description">
            Ingresa con una cuenta autorizada como administrador.
          </p>

          {message && <div className="alert-message">{message}</div>}

          <label>
            Correo electrónico
            <input
              type="email"
              placeholder="admin@correo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label>
            Contraseña
            <div className="password-row">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />

              <button
                type="button"
                className="show-button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </label>

          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar al panel'}
          </button>
        </form>
      </section>
    </main>
  );
}