import React, { useEffect, useRef, useState } from "react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuth: (
    payload:
      | { isSignUp: false; email: string; password: string }
      | {
          isSignUp: true;
          gender: "Male" | "Female" | "Other";
          firstName: string;
          lastName: string;
          email: string;
          phoneNumber: string;
          dateOfBirth?: string;
          password: string;
        }
  ) => void;
  loading?: boolean;
}

const parseDobToISO = (input: string): string => {
  const v = input.trim();
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v; // YYYY-MM-DD
  const m = v.match(/^([0-3]?\d)\/([0-1]?\d)\/(\d{4})$/); // DD/MM/YYYY
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    const yyyy = m[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  return v;
};

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuth, loading = false }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(true);

  const [gender, setGender] = useState<"Male" | "Female" | "Other" | "">("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [error, setError] = useState<string>("");
  const emailRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Focus email when modal opens
      setTimeout(() => emailRef.current?.focus(), 0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const resetError = () => setError("");
  const validate = () => {
    const emailOk = /.+@.+\..+/.test(email.trim());
    if (!emailOk) return "Please enter a valid email.";
    if (!password || password.length < 6) return "Password must be at least 6 characters.";
    if (isSignUp) {
      if (!gender) return "Please select gender.";
      if (!firstName.trim()) return "Please enter first name.";
      if (!lastName.trim()) return "Please enter last name.";
      if (!phoneNumber.trim()) return "Please enter mobile number.";
    }
    return "";
  };

  const submit = () => {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError("");
    if (isSignUp) {
      onAuth({
        isSignUp: true,
        gender: (gender as any) || "Other",
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        dateOfBirth: parseDobToISO(dateOfBirth.trim()) || undefined,
        password,
      });
    } else {
      onAuth({ isSignUp: false, email: email.trim(), password });
    }
  };

  const isDisabled = loading || (isSignUp
    ? !(gender && firstName.trim() && lastName.trim() && phoneNumber.trim() && email && password && password.length >= 6)
    : !(email && password));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-6 w-full max-w-md relative flex flex-col items-center">
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
          <div className="w-full mb-4">
            <div className="mb-5">
              <div className="text-sm text-gray-600 mb-2">Gender (required)</div>
              <div className="flex gap-3 flex-wrap">
                {["Male", "Female", "Other"].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      setGender(g as any);
                      resetError();
                    }}
                    className={`px-4 py-2 rounded-full border text-sm font-medium transition ${
                      gender === g
                        ? "bg-black text-white border-black"
                        : "bg-white text-gray-900 border-gray-200 hover:border-black"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 mb-2 block">First name</label>
                <input
                  type="text"
                  placeholder="First name"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    resetError();
                  }}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-2 block">Last name</label>
                <input
                  type="text"
                  placeholder="Last name"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    resetError();
                  }}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="text-sm text-gray-600 mb-2 block">Mobile number</label>
              <input
                type="text"
                placeholder="Enter phone number"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  resetError();
                }}
              />
            </div>

            <button
              type="button"
              className="mt-4 text-sm text-gray-600 hover:text-black"
              onClick={() => setShowMore((v) => !v)}
            >
              {showMore ? "Hide details" : "More details"}
            </button>

            {showMore && (
              <div className="mt-4">
                <label className="text-sm text-gray-600 mb-2 block">Date of birth (YYYY-MM-DD or DD/MM/YYYY)</label>
                <input
                  type="text"
                  placeholder="YYYY-MM-DD"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        <input
          ref={emailRef}
          type="email"
          placeholder="Email Address"
          className="w-full mb-4 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            resetError();
          }}
          autoFocus
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full mb-4 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            resetError();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading) submit();
          }}
        />
        <button
          className="mt-6 w-full bg-black text-white py-3.5 rounded-xl font-bold uppercase tracking-wide hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={isDisabled}
          onClick={submit}
        >
          {loading
            ? isSignUp
              ? "CREATING…"
              : "SIGNING IN…"
            : isSignUp
            ? "CREATE NEW ACCOUNT"
            : "Sign In"}
        </button>
        {error && <div className="w-full mt-3 text-sm text-red-600">{error}</div>}
        <div className="flex justify-between w-full text-sm text-gray-500 mt-2">
          <span>
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <button
              className="text-black font-medium hover:underline ml-1"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
              }}
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
