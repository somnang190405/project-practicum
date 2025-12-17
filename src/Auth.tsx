import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { saveUserToFirestore, getUserFromFirestore } from '../services/firestoreService';
import { useNavigate } from 'react-router-dom';
import * as Types from '../types';
import './Auth.css';

const Auth: React.FC<{ onAuthSuccess: (user: Types.User) => void }> = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSignup = async () => {
    setLoading(true);
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = cred.user;
      const userData: Omit<Types.User, 'id'> = {
        name: name || email.split('@')[0],
        email: firebaseUser.email || email,
        role: isAdmin ? Types.UserRole.ADMIN : Types.UserRole.CUSTOMER,
        avatar: undefined,
      };
      await saveUserToFirestore(firebaseUser.uid, userData);
      const user: Types.User = { id: firebaseUser.uid, ...userData } as Types.User;
      onAuthSuccess(user);
      navigate(isAdmin ? "/admin" : "/home"); // Redirect after signup
    } catch (err: any) {
      setError(err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignin = async () => {
    setLoading(true);
    setError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = cred.user;
      const user = await getUserFromFirestore(firebaseUser.uid);
      if (user) {
        onAuthSuccess(user);
        navigate(user.role === Types.UserRole.ADMIN ? "/admin" : "/home"); // Redirect after login
      } else {
        setError("User data not found. Please contact support or register again.");
      }
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={{ background: '#111', minHeight: '100vh', color: '#fff' }}>
      <h2 style={{ color: '#fff' }}>{isSignup ? 'Sign Up' : 'Sign In'}</h2>
      {error && <div className="error-message">{error}</div>}
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
      {isSignup && (
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
        />
      )}
      {isSignup && (
        <label style={{ color: '#fff' }}>
          <input
            type="checkbox"
            checked={isAdmin}
            onChange={(e) => setIsAdmin(e.target.checked)}
            disabled={loading}
          />
          Register as Admin
        </label>
      )}
      <button onClick={isSignup ? handleSignup : handleSignin} disabled={loading}>
        {loading ? 'Processing...' : isSignup ? 'Sign Up' : 'Sign In'}
      </button>
      <button onClick={() => setIsSignup(!isSignup)} disabled={loading}>
        {isSignup ? 'Switch to Sign In' : 'Switch to Sign Up'}
      </button>
    </div>
  );
};

export default Auth;
