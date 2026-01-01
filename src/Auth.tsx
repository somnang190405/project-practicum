import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from './services/firebase';
import { saveUserToFirestore, getUserFromFirestore } from './services/firestoreService';
import { useNavigate, useLocation } from 'react-router-dom';
import * as Types from './types';
import './Auth.css';

const Auth: React.FC<{ onAuthSuccess: (user: Types.User) => void }> = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  // Extended profile fields for signup
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | undefined>(undefined);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [isAdmin] = useState(false); // default to customer; hide admin toggle for clarity
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
    const validateInputs = (isSignupMode: boolean) => {
      const emailOk = /.+@.+\..+/.test(email.trim());
      if (!emailOk) return 'Please enter a valid email address.';
      if (password.length < 6) return 'Password must be at least 6 characters.';
      if (isSignupMode) {
        if (!firstName.trim()) return 'Please enter your first name.';
        if (!lastName.trim()) return 'Please enter your last name.';
        if (!gender) return 'Please select your gender.';
        if (!phoneNumber.trim()) return 'Please enter your mobile number.';
        if (!dateOfBirth.trim()) return 'Please enter your date of birth.';
      }
      return null;
    };
  const parseDobToISO = (input: string) => {
    const v = input.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v; // YYYY-MM-DD
    const m = v.match(/^([0-3]?\d)\/([0-1]?\d)\/(\d{4})$/); // DD/MM/YYYY
    if (m) {
      const dd = m[1].padStart(2, '0');
      const mm = m[2].padStart(2, '0');
      const yyyy = m[3];
      return `${yyyy}-${mm}-${dd}`;
    }
    return v; // fallback
  };

    const friendlyError = (err: any) => {
      const code = err?.code || '';
      switch (code) {
        case 'auth/email-already-in-use': return 'This email is already registered.';
        case 'auth/invalid-email': return 'The email format is invalid.';
        case 'auth/operation-not-allowed': return 'Email/password accounts are disabled in Firebase.';
        case 'auth/weak-password': return 'Password is too weak. Use at least 6 characters.';
        case 'auth/user-not-found': return 'No account found with this email.';
        case 'auth/wrong-password': return 'Incorrect password. Please try again.';
        case 'auth/network-request-failed': return 'Network error. Check your internet connection.';
        default:
          return (err?.message as string) || 'Authentication failed. Please try again.';
      }
    };
  const navigate = useNavigate();
  const location = useLocation();
  const isFirebaseReady = Boolean((auth as any)?.app?.options?.apiKey);
  const getRedirectPath = (fallback: string) => {
    const stateFrom = (location.state as any)?.from as string | undefined;
    if (stateFrom) return stateFrom;
    try {
      const params = new URLSearchParams(location.search);
      const qp = params.get('redirect');
      if (qp) return qp;
    } catch {}
    return fallback;
  };
  const goHome = () => {
    try {
      navigate('/');
    } catch (e) {
      try { window.location.href = '/'; } catch {}
    }
  };

  // Country/City dropdowns removed per request.

  const handleSignup = async () => {
    setLoading(true);
    setError(null);
    const v = validateInputs(true);
    if (v) { setLoading(false); setError(v); return; }
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = cred.user;
      const fullName = `${firstName} ${lastName}`.trim() || (firebaseUser.email || email).split('@')[0];
      const userData: Omit<Types.User, 'id'> = {
        name: fullName,
        email: firebaseUser.email || email,
        role: isAdmin ? Types.UserRole.ADMIN : Types.UserRole.CUSTOMER,
        avatar: undefined,
        firstName,
        lastName,
        gender: (gender as any) || 'Other',
        phoneNumber,
        dateOfBirth: parseDobToISO(dateOfBirth),
      };
      await saveUserToFirestore(firebaseUser.uid, userData);
      const created = await getUserFromFirestore(firebaseUser.uid);
      const user: Types.User = created || ({ id: firebaseUser.uid, ...userData } as Types.User);
      onAuthSuccess(user);
      navigate(getRedirectPath(isAdmin ? "/admin" : "/home")); // Redirect after signup
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignin = async () => {
    setLoading(true);
    setError(null);
    const v = validateInputs(false);
    if (v) { setLoading(false); setError(v); return; }
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = cred.user;
      const user = await getUserFromFirestore(firebaseUser.uid);
      if (user) {
        onAuthSuccess(user);
        navigate(getRedirectPath(user.role === Types.UserRole.ADMIN ? "/admin" : "/home")); // Redirect after login
      } else {
        setError("User data not found. Your account may not be initialized.");
      }
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-tabs">
        <div className={`auth-tab ${!isSignup ? 'active' : ''}`} onClick={()=> setIsSignup(false)}>Login</div>
        <div className={`auth-tab ${isSignup ? 'active' : ''}`} onClick={()=> setIsSignup(true)}>Register</div>
        <div style={{ marginLeft: 'auto' }}>
          <button type="button" className="back-home" onClick={goHome}>✕</button>
        </div>
      </div>
      {!isFirebaseReady && (
        <div className="error-message" style={{ marginBottom: 12 }}>
          Firebase config missing. Please set VITE_FIREBASE_* env vars.
        </div>
      )}
      <h2>{isSignup ? 'Register' : 'Login'}</h2>
      {error && <div className="error-message">{error}</div>}
      {!isSignup && (
        <>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </>
      )}
      {isSignup && (
        <div style={{ width: '100%' }}>
          <div className="auth-label">Profile Information</div>

          <div className="auth-label">Gender</div>
          <div className="auth-radio-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="radio" name="gender" checked={gender === 'Male'} onChange={()=> setGender('Male')} disabled={loading} />
              <span>Male</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="radio" name="gender" checked={gender === 'Female'} onChange={()=> setGender('Female')} disabled={loading} />
              <span>Female</span>
            </label>
          </div>

          <div className="auth-field-row">
            <div>
              <div className="auth-label">First Name</div>
              <input type="text" placeholder="First name" value={firstName} onChange={(e)=> setFirstName(e.target.value)} disabled={loading} />
            </div>
            <div>
              <div className="auth-label">Last Name</div>
              <input type="text" placeholder="Last name" value={lastName} onChange={(e)=> setLastName(e.target.value)} disabled={loading} />
            </div>
          </div>

          <div>
            <div className="auth-label">Mobile Number</div>
            <input type="text" placeholder="Mobile number" value={phoneNumber} onChange={(e)=> setPhoneNumber(e.target.value)} disabled={loading} />
            <div className="auth-hint">Example: 0912345678</div>
          </div>

          <div>
            <div className="auth-label">Email</div>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
          </div>

          {/* Country/City removed per request */}

          <div>
            <div className="auth-label">Date of Birth</div>
            <input type="text" placeholder="Date of birth (DD/MM/YYYY)" value={dateOfBirth} onChange={(e)=> setDateOfBirth(e.target.value)} disabled={loading} />
            <div className="auth-hint">Format: DD/MM/YYYY</div>
          </div>

          <div>
            <div className="auth-label">Password</div>
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
          </div>
        </div>
      )}
      <button onClick={isSignup ? handleSignup : handleSignin} disabled={loading}>
        {loading ? 'Processing...' : isSignup ? 'Create Account' : 'Sign In'}
      </button>
    </div>
  );
};

export default Auth;
