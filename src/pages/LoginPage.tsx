import { useState } from 'react';
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');

  const normalizeEmail = (value: string) => {
    return value.trim().toLowerCase();
  };

  const validateAdminAccess = async (uid: string) => {
    const userSnap = await getDoc(doc(db, 'users', uid));

    if (!userSnap.exists()) {
      await signOut(auth);
      setMessage('No se encontró el perfil del usuario en el sistema.');
      return false;
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
      return false;
    }

    if (role !== 'admin') {
      await signOut(auth);
      setMessage('Acceso denegado. Esta web es solo para administradores.');
      return false;
    }

    return true;
  };

  const getFriendlyErrorMessage = (error: unknown) => {
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

    if (firebaseError.code === 'auth/popup-closed-by-user') {
      errorMessage = 'Cerraste la ventana de Google antes de completar el inicio de sesión.';
    }

    if (firebaseError.code === 'auth/popup-blocked') {
      errorMessage =
        'El navegador bloqueó la ventana emergente de Google. Permite pop-ups para esta página.';
    }

    if (firebaseError.code === 'auth/account-exists-with-different-credential') {
      errorMessage =
        'Este correo ya existe con otro método de inicio de sesión. Intenta ingresar con correo y contraseña.';
    }

    if (firebaseError.code === 'auth/unauthorized-domain') {
      errorMessage =
        'Este dominio no está autorizado en Firebase Authentication. Agrega el dominio de Vercel en Authorized domains.';
    }

    return errorMessage;
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

      const hasAdminAccess = await validateAdminAccess(credential.user.uid);

      if (!hasAdminAccess) return;

      onAdminLogin();
    } catch (error: unknown) {
      console.log(error);
      setMessage(getFriendlyErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setMessage('');

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account',
      });

      const credential = await signInWithPopup(auth, provider);

      const hasAdminAccess = await validateAdminAccess(credential.user.uid);

      if (!hasAdminAccess) return;

      onAdminLogin();
    } catch (error: unknown) {
      console.log(error);
      setMessage(getFriendlyErrorMessage(error));
    } finally {
      setGoogleLoading(false);
    }
  };

  const isBusy = loading || googleLoading;

  return (
    <main className="login-page login-page-premium">
      <section className="login-card login-card-premium">
        <div className="brand-box login-brand-panel">
          <div className="brand-badge">Panel administrativo seguro</div>
          <div className="brand-icon brand-icon-premium">+</div>
          <h1>MediConnect Admin</h1>
          <p>
            Supervisa usuarios, donaciones, solicitudes, validadores y reportes
            desde un panel web conectado en tiempo real con Firebase.
          </p>

          <div className="login-feature-list">
            <div><strong>✓</strong><span>Acceso exclusivo para administradores</span></div>
            <div><strong>✓</strong><span>Datos sincronizados con la app móvil</span></div>
            <div><strong>✓</strong><span>Reportes y control operativo del sistema</span></div>
          </div>
        </div>

        <form onSubmit={handleLogin} className="login-form login-form-premium">
          <div className="login-form-header">
            <span className="login-kicker">Bienvenido</span>
            <h2>Iniciar sesión</h2>
            <p className="form-description">
              Ingresa con una cuenta autorizada como administrador.
            </p>
          </div>

          {message && <div className="alert-message">{message}</div>}

          <button
            type="button"
            className="google-button google-button-premium"
            onClick={handleGoogleLogin}
            disabled={isBusy}
          >
            <span className="google-icon">G</span>
            {googleLoading ? 'Conectando con Google...' : 'Continuar con Google'}
          </button>

          <div className="login-divider">
            <span></span>
            <p>o ingresa con correo</p>
            <span></span>
          </div>

          <label>
            Correo electrónico
            <input
              type="email"
              placeholder="admin@correo.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isBusy}
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
                disabled={isBusy}
              />

              <button
                type="button"
                className="show-button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isBusy}
              >
                {showPassword ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </label>

          <button type="submit" className="primary-button primary-button-premium" disabled={isBusy}>
            {loading ? 'Ingresando...' : 'Ingresar al panel'}
          </button>

          <p className="login-helper-text">
            Si tu cuenta no tiene rol de administrador, el sistema cerrará la sesión automáticamente.
          </p>
        </form>
      </section>
    </main>
  );
}