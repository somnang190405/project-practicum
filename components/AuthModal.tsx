import React, { useState } from "react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuth: (name: string, email: string, password: string, isSignUp: boolean) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuth }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md relative flex flex-col items-center">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-black text-xl"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-2xl font-serif font-bold mb-2 text-center">
          {isSignUp ? "Join TinhMe" : "Welcome Back"}
        </h2>
        <p className="text-gray-500 mb-6 text-center">
          {isSignUp ? "Create an account to start shopping" : "Sign in to access your account"}
        </p>
        {isSignUp && (
          <input
            type="text"
            placeholder="Full Name"
            className="w-full mb-4 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        )}
        <input
          type="email"
          placeholder="Email Address"
          className="w-full mb-4 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full mb-4 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <button
          className="w-full bg-black text-white py-3 rounded-lg font-semibold mb-3 hover:bg-gray-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSignUp ? !(name && email && password && password.length >= 6) : !(email && password)}
          onClick={() => onAuth(name, email, password, isSignUp)}
        >
          {isSignUp ? "Create Account" : "Sign In"}
        </button>
        <div className="flex justify-between w-full text-sm text-gray-500 mt-2">
          <span>
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <button
              className="text-black font-medium hover:underline ml-1"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </span>
          <span className="ml-2 cursor-pointer text-xs text-gray-400 hover:text-black">Admin Access</span>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
