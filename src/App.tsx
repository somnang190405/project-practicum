// src/App.tsx
// src/App.tsx

import React, { useState, useEffect } from "react";
import { CartProvider } from "./components/customer/CartContext";
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation, Link, Navigate } from "react-router-dom";
import CustomerHome from "./customer/CustomerHome";
import LandingPage from "./customer/LandingPage";
import AuthModal from "./components/AuthModal";
import { auth } from "./services/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";
import {
  saveUserToFirestore,
  getUserFromFirestore,
  getProducts,
  updateUser,
  listenUser,
  addToWishlist,
  removeFromWishlist,
  listenUserCartItems,
  syncUserCartItems,
  migrateLegacyCartToCartItemsIfNeeded,
} from "./services/firestoreService";
import { searchProductsByNameOnly } from "./services/firestoreService";
import {
  CheckCircle,
  AlertCircle,
  X,
  ShieldCheck,
  UserIcon,
  LogOut,
  Search,
  Menu,
  LayoutGrid,
  ShoppingCart,
  Heart,
  Package,
} from "lucide-react";
import { User, UserRole, CartItem, Product } from "./types";
import { useCart } from "./components/customer/CartContext";

// Route-level code splitting (improves first load)
const AdminDashboard = React.lazy(() => import("./admin/AdminDashboard"));
const ProductDetails = React.lazy(() => import("./customer/ProductDetails"));
const SearchPage = React.lazy(() => import("./customer/SearchPage"));
const ProfilePage = React.lazy(() => import("./customer/ProfilePage"));
const OrdersPage = React.lazy(() => import("./customer/OrdersPage"));
const PaymentPage = React.lazy(() => import("./customer/PaymentPage"));
const NewArrivalsPage = React.lazy(() => import("./customer/NewArrivalsPage"));
const Wishlist = React.lazy(() => import("./components/customer/Wishlist"));
const Shop = React.lazy(() => import("./components/customer/Shop"));
const Cart = React.lazy(() => import("./components/customer/Cart"));
const Auth = React.lazy(() => import("./Auth"));

// (real components imported above)

// --- Components (Toast and Navbar are included for completeness) ---

const Toast = ({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl transform transition-all duration-300 animate-slide-up ${
        type === "success" ? "bg-black text-white" : "bg-red-500 text-white"
      }`}
    >
      {type === "success" ? (
        <CheckCircle size={20} className="text-green-400" />
      ) : (
        <AlertCircle size={20} />
      )}
      <p className="font-medium text-sm">{message}</p>
      <button onClick={onClose} className="ml-2 hover:opacity-70">
        <X size={16} />
      </button>
    </div>
  );
};

const Navbar = ({
  user,
  onLoginClick,
  onLogoutClick,
  onRequireAuth,
  wishlistCount = 0,
}: {
  user: User | null;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onRequireAuth?: (redirectTo: string) => void;
  wishlistCount?: number;
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [navQuery, setNavQuery] = React.useState("");
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const { cart } = useCart();
  const showNavSearch = location.pathname !== '/shop';
  React.useEffect(() => {
    const close = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('#user-menu')) setMenuOpen(false);
      if (!t.closest('#nav-search')) setShowSuggestions(false);
    };
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  // Debounced name-only suggestions
  React.useEffect(() => {
    let alive = true;
    const q = navQuery.trim();
    if (q.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    const t = window.setTimeout(async () => {
      try {
        const res = await searchProductsByNameOnly(q, 6);
        if (!alive) return;
        setSuggestions(res);
        setShowSuggestions(res.length > 0);
      } catch {
        if (!alive) return;
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 180);
    return () => { alive = false; window.clearTimeout(t); };
  }, [navQuery]);
  const cartCount = React.useMemo(() => cart.reduce((sum, i) => sum + i.quantity, 0), [cart]);
  return (
    <nav className="w-full py-2 px-6 flex items-center justify-between shadow-sm" style={{ position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'saturate(180%) blur(6px)', background: 'rgba(255,255,255,0.9)' }}>
      {/* Logo */}
      <div className="flex items-center cursor-pointer" onClick={() => navigate('/') }>
        <div className="bg-black rounded-xl w-12 h-12 flex items-center justify-center mr-2">
          <span className="text-white text-2xl font-bold">T</span>
        </div>
        <span className="text-3xl font-serif font-bold text-gray-900">TinhMe</span>
      </div>
      {/* Center: Nav links + search */}
      <div className="flex-1 flex items-center justify-center gap-6">
        <div className="flex items-center gap-6 shrink-0">
          <button onClick={() => navigate('/')} className="text-base md:text-lg font-medium text-gray-600 hover:text-black whitespace-nowrap">Home</button>
          <button onClick={() => navigate('/shop')} className="text-base md:text-lg font-medium text-gray-600 hover:text-black whitespace-nowrap">Shop</button>
          <button onClick={() => navigate('/shop?category=bags')} className="hidden md:inline text-base md:text-lg font-medium text-gray-600 hover:text-black whitespace-nowrap">Bags</button>
          <button onClick={() => navigate('/shop?category=accessory')} className="hidden md:inline text-base md:text-lg font-medium text-gray-600 hover:text-black whitespace-nowrap">Accessory</button>
        </div>
        {/* Keep existing navbar search behavior (hide on /shop where page already has search/filters) */}
        {showNavSearch && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigate(`/search?q=${encodeURIComponent(navQuery)}`);
            }}
            id="nav-search"
            className="flex items-center w-full max-w-[520px]"
            style={{ minWidth: 240 }}
          >
            <div style={{ position:'relative', width:'100%' }}>
              <input
                value={navQuery}
                onChange={(e)=> setNavQuery(e.target.value)}
                placeholder="Search for products..."
                className="w-full bg-white border border-gray-300 rounded-2xl py-2.5 pl-4 pr-10 text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-gray-400"
              />
              <button
                type="submit"
                aria-label="Search"
                style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)' }}
                className="text-gray-500 hover:text-black"
              >
                <Search size={18} />
              </button>
              {showSuggestions && (
                <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-30">
                  {suggestions.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => {
                        navigate(`/product/${p.id}`);
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-3"
                    >
                      <img src={p.image} alt={p.name} className="w-8 h-8 object-cover rounded" onError={(e)=>{(e.currentTarget as HTMLImageElement).style.visibility='hidden';}} />
                      <span className="text-sm text-gray-700 truncate">{p.name}</span>
                    </button>
                  ))}
                  <div className="border-t border-gray-100" />
                  <button
                    type="submit"
                    className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                    onClick={() => setShowSuggestions(false)}
                  >
                    See all results for "{navQuery}"
                  </button>
                </div>
              )}
            </div>
          </form>
        )}
      </div>
      {/* Right: user chip + icons */}
      <div className="flex items-center space-x-6">
        <button
          className="relative text-gray-600 hover:text-black"
          onClick={() => {
            if (!user) {
              if (onRequireAuth) onRequireAuth('/orders');
              else onLoginClick();
              return;
            }
            navigate('/orders');
          }}
          aria-label="My orders"
        >
          <Package size={22} />
        </button>
        <button className="relative text-gray-600 hover:text-black" onClick={() => navigate('/wishlist')}>
          <Heart size={22} />
          {wishlistCount > 0 && (
            <span className="absolute -top-1 -right-2 bg-black text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">
              {wishlistCount}
            </span>
          )}
        </button>
        <button className="relative text-gray-600 hover:text-black" onClick={() => navigate('/cart')}>
          <ShoppingCart size={22} />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-2 bg-black text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">
              {cartCount}
            </span>
          )}
        </button>
        {user ? (
          <div id="user-menu" className="relative">
            <button onClick={(e)=>{ e.stopPropagation(); setMenuOpen(v=>!v); }} className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg px-3 py-1.5">
              <UserIcon size={18} />
              <span className="text-sm font-medium" style={{ maxWidth: 160, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user.name || user.email}</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-100 p-3 z-50">
                <div className="flex items-center gap-3 p-2">
                  <div className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center"><UserIcon size={16} /></div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{user.name || 'User'}</div>
                    <div className="text-xs text-gray-500 truncate">{user.email}</div>
                    <div className="text-[11px] text-gray-400 uppercase">{user.role}</div>
                  </div>
                </div>
                <div className="h-px bg-gray-100 my-2" />
                <Link to="/profile" className="block w-full text-left px-3 py-2 rounded hover:bg-gray-50">View Profile</Link>
                {user.role === UserRole.ADMIN && (
                  <button className="w-full text-left px-3 py-2 rounded hover:bg-gray-50" onClick={()=>navigate('/admin')}>Admin Dashboard</button>
                )}
                <button className="w-full text-left px-3 py-2 rounded hover:bg-gray-50" onClick={onLogoutClick}>Logout</button>
              </div>
            )}
          </div>
        ) : (
          <button className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg px-3 py-1.5" onClick={onLoginClick}>
            <UserIcon size={18} />
            <span className="text-sm font-medium">Sign In</span>
          </button>
        )}
      </div>
    </nav>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isRegister, setIsRegister] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  // Store wishlist as array of product IDs
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [authLoading, setAuthLoading] = useState(true); // New state for initial auth check
  const [page, setPage] = useState("Home");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [postAuthRedirect, setPostAuthRedirect] = useState<string | null>(null);
  const requireAuth = (redirectTo: string) => {
    setPostAuthRedirect(redirectTo);
    setShowAuthModal(true);
  };

  const friendlyAuthError = (err: any) => {
    const code = err?.code || '';
    switch (code) {
      case 'auth/email-already-in-use': return 'This email is already registered.';
      case 'auth/invalid-email': return 'The email format is invalid.';
      case 'auth/operation-not-allowed': return 'Enable Email/Password sign-in in Firebase Auth → Sign-in method.';
      case 'auth/weak-password': return 'Password is too weak. Use at least 6 characters.';
      case 'auth/user-not-found': return 'No account found with this email.';
      case 'auth/wrong-password': return 'Incorrect password. Please try again.';
      case 'auth/network-request-failed': return 'Network error. Check your internet connection.';
      case 'auth/invalid-api-key':
      case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
        return 'Firebase config is invalid. Check VITE_FIREBASE_* env vars.';
      default:
        return (err?.message as string) || 'Authentication failed. Please try again.';
    }
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
  };

  const isAdminEmail = (email: string | null | undefined) => {
    const raw = (import.meta as any)?.env?.VITE_ADMIN_EMAILS as string | undefined;
    const list = (raw || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (!list.length) return false;
    return !!email && list.includes(email.trim().toLowerCase());
  };

  // --- Firebase Auth State Listener & User Profile Fetch ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const uid = firebaseUser.uid;
          const email = firebaseUser.email || '';
          const fallbackName = firebaseUser.displayName || email.split('@')[0] || 'User';

          let profile = await getUserFromFirestore(uid);

          // If profile is missing, attempt to create it (common when users were created in Auth only).
          if (!profile) {
            const role = isAdminEmail(firebaseUser.email) ? UserRole.ADMIN : UserRole.CUSTOMER;
            await saveUserToFirestore(uid, {
              name: fallbackName,
              email,
              role,
            });
            profile = await getUserFromFirestore(uid);
          }

          // If Firestore read still fails (rules/network), keep the app usable with a fallback user.
          const resolvedUser: User = profile || {
            id: uid,
            name: fallbackName,
            email,
            role: isAdminEmail(firebaseUser.email) ? UserRole.ADMIN : UserRole.CUSTOMER,
            wishlist: [],
            cart: [],
          };

          // Optional: if email is in admin allowlist, force ADMIN in UI (and try to persist).
          if (isAdminEmail(firebaseUser.email) && resolvedUser.role !== UserRole.ADMIN) {
            resolvedUser.role = UserRole.ADMIN;
            void updateUser(uid, { role: UserRole.ADMIN }).catch(() => {});
          }

          setUser(resolvedUser);
          setWishlist(resolvedUser.wishlist || []);

          // Do not auto-redirect based on role; keep current route.
          const onAdminRoute = window.location.pathname.startsWith('/admin');
          setPage(onAdminRoute && resolvedUser.role === UserRole.ADMIN ? 'Admin' : 'Home');
        } catch (error) {
          console.error("Error fetching user data:", error);
          // Keep UI usable if Firestore is unavailable but Auth is signed in.
          const email = firebaseUser.email || '';
          const fallbackName = firebaseUser.displayName || email.split('@')[0] || 'User';
          setUser({
            id: firebaseUser.uid,
            name: fallbackName,
            email,
            role: isAdminEmail(firebaseUser.email) ? UserRole.ADMIN : UserRole.CUSTOMER,
            wishlist: [],
            cart: [],
          });
        }
      } else {
        setUser(null);
        // Land on Home without opening Auth modal by default
        setPage("Home");
        setShowAuthModal(false);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Realtime sync of user profile (wishlist/cart/etc) when signed in
  useEffect(() => {
    if (!user?.id) return;
    const unsub = listenUser(user.id, (u) => {
      if (!u) return;
      setUser((prev) => ({ ...(prev || u), ...u }));
      setWishlist(u.wishlist || []);
    });
    return () => {
      try { unsub && unsub(); } catch {}
    };
  }, [user?.id]);

  // --- Product Fetching (Replacing mockBackend) ---
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // USE FIRESTORE SERVICE
        const productList = await getProducts();
        setProducts(productList);
        showToast("Products loaded from Firebase!", "success");
      } catch (error) {
        console.error("Error fetching products:", error);
        showToast(
          "Failed to load products from Firebase. Check your console for details.",
          "error"
        );
      }
    };
    fetchProducts();
  }, []); // Run only once on mount


  const handleLogout = () => {
    // Firebase Logout
    auth.signOut();
    showToast("Logged out successfully.", "success");
    setPage("Home");
  };

  // --- Cart/Wishlist Handlers (remain the same) ---

  const findProduct = (productId: string, products: Product[]) =>
    products.find((p: Product) => p.id === productId);

  // Renaming the helper function to avoid conflict
  const updateCartItems = (prevItems: CartItem[], productId: string) => {
    const existingItem = prevItems.find((item: CartItem) => item.id === productId);
    if (existingItem) {
      return prevItems.map((item: CartItem) =>
        item.id === productId ? { ...item, quantity: item.quantity + 1 } : item
      );
    }
    return [...prevItems, { id: productId, quantity: 1 }];
  };

  // Cart actions come from CartContext inside pages; keep toast only for wishlist here

  const handleToggleWishlist = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setWishlist((prev) => {
      const exists = prev.includes(productId);
      if (exists) {
        showToast(`${product.name} removed from wishlist.`, "success");
        const next = prev.filter((id) => id !== productId);
        // Persist to Firestore if signed in (atomic)
        if (user) void removeFromWishlist(user.id, productId).catch(() => {});
        return next;
      } else {
        showToast(`${product.name} added to wishlist.`, "success");
        const next = [...prev, productId];
        if (user) void addToWishlist(user.id, productId).catch(() => {});
        return next;
      }
    });
  };

  // Listen for global wishlist toggle events emitted by ProductCard when no handler is provided
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ id: string }>;
      if (custom?.detail?.id) handleToggleWishlist(custom.detail.id);
    };
    window.addEventListener('wishlist:toggle', handler as EventListener);
    return () => window.removeEventListener('wishlist:toggle', handler as EventListener);
  }, [user, products]);

  // Auth handler for modal
  const handleAuth = async (
    payload:
      | { isSignUp: false; email: string; password: string }
      | {
          isSignUp: true;
          gender: 'Male' | 'Female' | 'Other';
          firstName: string;
          lastName: string;
          email: string;
          phoneNumber: string;
          dateOfBirth?: string;
          password: string;
        }
  ) => {
    setAuthLoading(true);
    try {
      if (payload.isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, payload.email, payload.password);
        const fullName = `${payload.firstName} ${payload.lastName}`.trim();
        await saveUserToFirestore(userCredential.user.uid, {
          name: fullName || payload.email.split('@')[0],
          firstName: payload.firstName,
          lastName: payload.lastName,
          gender: payload.gender,
          phoneNumber: payload.phoneNumber,
          dateOfBirth: payload.dateOfBirth,
          email: payload.email,
          role: UserRole.CUSTOMER,
        });
        showToast("Account created!", "success");
      } else {
        await signInWithEmailAndPassword(auth, payload.email, payload.password);
        showToast("Signed in successfully!", "success");
      }
      setShowAuthModal(false);
      const redirectTo = postAuthRedirect;
      setPostAuthRedirect(null);
      if (redirectTo) {
        try { window.location.href = redirectTo; } catch {}
      }
    } catch (error: any) {
      showToast(friendlyAuthError(error), "error");
    } finally {
      setAuthLoading(false);
    }
  };

  // --- Render Logic ---
  // Only show loading spinner on initial auth check (first mount)
  const [initialAuthChecked, setInitialAuthChecked] = useState(false);
  useEffect(() => {
    if (!authLoading) setInitialAuthChecked(true);
  }, [authLoading]);

  if (!initialAuthChecked) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <p className="text-xl font-medium text-gray-700">Connecting to Backend...</p>
      </div>
    );
  }

  const isCustomerView = user?.role !== UserRole.ADMIN || page !== "Admin";

  // Router-aware scaffold to hide Navbar on admin and control layout padding
  const RouteScaffold: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const isAdminRoute = location.pathname.startsWith("/admin");
    const isFullBleedRoute = ["/", "/home"].includes(location.pathname);

    // Read one-time toast from navigation state and clear it
    React.useEffect(() => {
      const st = (location.state as any) || null;
      const toastPayload = st && st.toast;
      if (toastPayload) {
        const { message = 'Success', type = 'success' } = toastPayload || {};
        showToast(String(message), type === 'error' ? 'error' : 'success');
        // Clear state so toast doesn't repeat on navigation history
        navigate(location.pathname + location.search, { replace: true, state: null });
      }
    }, [location.pathname, location.search, location.state]);
    return (
      <>
        {!isAdminRoute && (
          <Navbar 
            user={user} 
            onLoginClick={() => {
              setPostAuthRedirect(null);
              setShowAuthModal(true);
            }}
            onLogoutClick={async () => {
              try {
                await auth.signOut();
                setUser(null);
                setPage('Home');
                showToast('Logged out successfully.', 'success');
                // Redirect to home after logout
                try { window.location.href = '/'; } catch {}
              } catch (e) {
                showToast('Failed to logout. Try again.', 'error');
              }
            }}
            wishlistCount={wishlist.length}
            onRequireAuth={requireAuth}
          />
        )}
        <main className={isAdminRoute ? "p-0" : (isFullBleedRoute ? "p-0" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8") }>
          {children}
        </main>
      </>
    );
  };

  return (
    <CartProvider>
      <div className="App">
        <Router>
          <RouteScaffold>
            <React.Suspense
              fallback={
                <div className="flex justify-center items-center min-h-[50vh] text-gray-600">
                  Loading…
                </div>
              }
            >
              <Routes>
                <Route
                  path="/"
                  element={<CustomerHome wishlist={wishlist} toggleWishlist={handleToggleWishlist} />}
                />
                <Route
                  path="/home"
                  element={<CustomerHome wishlist={wishlist} toggleWishlist={handleToggleWishlist} />}
                />
                <Route
                  path="/admin"
                  element={(user && user.role === UserRole.ADMIN) ? (<AdminDashboard />) : (<LandingPage />)}
                />
                <Route
                  path="/product/:id"
                  element={<ProductDetails wishlist={wishlist} toggleWishlist={handleToggleWishlist} />}
                />
                <Route path="/login" element={<Navigate to="/" replace />} />
                <Route
                  path="/profile"
                  element={<ProfilePage onRequireAuth={requireAuth} />}
                />
                <Route
                  path="/wishlist"
                  element={
                    <Wishlist
                      wishlist={wishlist}
                      toggleWishlist={handleToggleWishlist}
                      setView={(view) => {
                        if (view === 'shop') window.location.href = '/shop';
                      }}
                    />
                  }
                />
                <Route path="/cart" element={<CartPage user={user} />} />
                <Route path="/search" element={<SearchPage wishlist={wishlist} toggleWishlist={handleToggleWishlist} />} />
                <Route path="/shop" element={<Shop wishlist={wishlist} toggleWishlist={handleToggleWishlist} />} />
                <Route path="/new-arrivals" element={<NewArrivalsPage wishlist={wishlist} toggleWishlist={handleToggleWishlist} />} />
                <Route path="/orders" element={<OrdersPage user={user} onRequireAuth={requireAuth} />} />
                <Route path="/payment" element={<PaymentPage user={user} onRequireAuth={requireAuth} />} />
              </Routes>
            </React.Suspense>
          </RouteScaffold>
        </Router>
        {/* Sync cart with Firestore user profile */}
        <CartSync user={user} products={products} />
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuth={handleAuth}
          loading={authLoading}
        />
      </div>
    </CartProvider>
  );
};

const Login = ({
  onLogin,
  onSignUp,
}: {
  onLogin: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div>
      <h1>Login</h1>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={() => onLogin(email, password)}>Login</button>
      <button onClick={() => onSignUp(email, password)}>Sign Up</button>
    </div>
  );
};

const Home = ({ user }: { user: User | null }) => (
  <div>
    <h1>Welcome {user ? user.email : "Guest"}</h1>
  </div>
);

// Add placeholder functions for missing imports
const handleLogin = async (email: string, password: string) => {
  console.log("Login with", email, password);
};

const handleSignUp = async (email: string, password: string) => {
  console.log("Sign up with", email, password);
};

// Wrapper component to use CartContext hooks within the provider tree
const CartPage: React.FC<{ user: User | null }> = ({ user }) => {
  const { cart, updateQuantity, removeFromCart } = useCart();
  return (
    <Cart
      cart={cart}
      updateCartQty={updateQuantity}
      removeFromCart={removeFromCart}
      user={user}
      setView={(view) => {
        if (view === 'shop') window.location.href = '/shop';
      }}
    />
  );
};

// Sync cart to Firestore and hydrate from user profile
const CartSync: React.FC<{ user: User | null; products: Product[] }> = ({ user, products }) => {
  const { cart, hydrateCart } = useCart();
  const fsTimerRef = React.useRef<number | null>(null);
  const lastWriteRef = React.useRef<string>('');
  const [remoteCart, setRemoteCart] = React.useState<{ productId: string; quantity: number }[]>([]);
  const migratedRef = React.useRef<boolean>(false);
  const hydratedFromRemoteRef = React.useRef<string | null>(null);

  const compactFromCartItems = React.useCallback((items: CartItem[]) => {
    return items
      .map(i => ({ productId: i.id, quantity: i.quantity }))
      .sort((a, b) => a.productId.localeCompare(b.productId));
  }, []);

  // Listen to cartItems subcollection for atomic per-item cart sync.
  useEffect(() => {
    if (!user?.id) {
      setRemoteCart([]);
      hydratedFromRemoteRef.current = null;
      return;
    }
    // Reset hydration flag when user changes.
    hydratedFromRemoteRef.current = null;
    const unsub = listenUserCartItems(user.id, (items) => {
      setRemoteCart(items);
    });
    return () => {
      try { unsub && unsub(); } catch {}
    };
  }, [user?.id]);

  // Migrate legacy cart array -> cartItems once, only if the new cart is empty.
  useEffect(() => {
    if (!user?.id) return;
    if (migratedRef.current) return;
    if (remoteCart.length > 0) {
      migratedRef.current = true;
      return;
    }
    if (!Array.isArray(user.cart) || user.cart.length === 0) {
      migratedRef.current = true;
      return;
    }

    migratedRef.current = true;
    void migrateLegacyCartToCartItemsIfNeeded(user.id).catch(() => {});
  }, [user?.id, user?.cart, remoteCart.length]);

  // Persist cart on change
  useEffect(() => {
    if (!user) return;
    const compact = compactFromCartItems(cart);
    const compactJson = JSON.stringify(compact);
    const remoteJson = JSON.stringify(remoteCart);

    // Avoid write loops when remote already matches
    if (compactJson === remoteJson) return;
    if (compactJson === lastWriteRef.current) return;

    if (fsTimerRef.current) window.clearTimeout(fsTimerRef.current);
    fsTimerRef.current = window.setTimeout(() => {
      lastWriteRef.current = compactJson;
      void syncUserCartItems(user.id, compact, remoteCart).catch(() => {});
    }, 200);

    return () => {
      if (fsTimerRef.current) window.clearTimeout(fsTimerRef.current);
      fsTimerRef.current = null;
    };
  }, [cart, user, compactFromCartItems, remoteCart]);

  // Hydrate cart from cartItems when available
  useEffect(() => {
    if (!user || remoteCart.length === 0 || products.length === 0) return;
    // Hydrate only once per user session.
    if (hydratedFromRemoteRef.current === user.id) return;
    // Don't clobber a non-empty local cart.
    if (cart.length) return;
    const resolved = remoteCart.map(ci => {
      const p = products.find(pr => pr.id === ci.productId);
      if (!p) return null;
      return { ...p, quantity: Math.max(1, ci.quantity || 1) } as CartItem;
    }).filter(Boolean) as CartItem[];
    if (resolved.length) {
      hydrateCart(resolved);
      hydratedFromRemoteRef.current = user.id;
    }
  }, [user, products, hydrateCart, remoteCart, cart.length]);
  return null;
};

export default App;