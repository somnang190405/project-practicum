// src/App.tsx
// src/App.tsx

import React, { useState, useEffect } from "react";
import { CartProvider } from "./components/customer/CartContext";
import Cart from "./components/customer/Cart";
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import CustomerHome from "./customer/CustomerHome";
import AdminDashboard from "./admin/AdminDashboard";
import Auth from "./src/Auth";
import ProductDetails from "./customer/ProductDetails";
import SearchPage from "./customer/SearchPage";
import ProfilePage from "./customer/ProfilePage";
import LandingPage from "./customer/LandingPage";
import NewArrivalsPage from "./customer/NewArrivalsPage";
import Wishlist from "./components/customer/Wishlist";
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
} from "./services/firestoreService";
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
} from "lucide-react";
import { User, UserRole, CartItem, Product } from "./types";
import AuthModal from "./components/AuthModal";
import Shop from "./components/customer/Shop";

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

const Navbar = ({ user, onLoginClick, onLogoutClick }: { user: User | null, onLoginClick: () => void, onLogoutClick: () => void }) => {
  const navigate = useNavigate();
  const [navQuery, setNavQuery] = React.useState("");
  const [menuOpen, setMenuOpen] = React.useState(false);
  React.useEffect(() => {
    const close = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('#user-menu')) setMenuOpen(false);
    };
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);
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
      <div className="flex-1 flex items-center justify-center gap-8">
        <div className="hidden md:flex space-x-10">
          <button onClick={() => navigate('/')} className="text-lg font-medium text-gray-600 hover:text-black">Home</button>
          <button onClick={() => navigate('/shop')} className="text-lg font-medium text-gray-600 hover:text-black">Shop</button>
          <button onClick={() => navigate('/new-arrivals')} className="text-lg font-medium text-gray-600 hover:text-black">New Arrivals</button>
        </div>
        {/* Search (rounded like screenshot) */}
        <form
          onSubmit={(e)=>{ e.preventDefault(); navigate(`/search?q=${encodeURIComponent(navQuery)}`); }}
          className="hidden lg:flex items-center"
          style={{ minWidth: 360 }}
        >
          <div style={{ position:'relative', width:'100%' }}>
            <input
              value={navQuery}
              onChange={(e)=> setNavQuery(e.target.value)}
              placeholder="Search for products..."
              className="w-full bg-white border border-gray-300 rounded-2xl py-2.5 pl-4 pr-10 text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-gray-400"
            />
            <button type="submit" style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)' }} className="text-gray-500 hover:text-black">
              <Search size={18} />
            </button>
          </div>
        </form>
      </div>
      {/* Right: user chip + icons */}
      <div className="flex items-center space-x-6">
        <button className="text-gray-600 hover:text-black" onClick={() => navigate('/wishlist')}><Heart size={22} /></button>
        <button className="text-gray-600 hover:text-black" onClick={() => navigate('/cart')}><ShoppingCart size={22} /></button>
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
                <button className="w-full text-left px-3 py-2 rounded hover:bg-gray-50" onClick={()=>navigate('/profile')}>View Profile</button>
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
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  // Store wishlist as array of product IDs
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [authLoading, setAuthLoading] = useState(true); // New state for initial auth check
  const [page, setPage] = useState("Home");
  const [showAuthModal, setShowAuthModal] = useState(false);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
  };

  // --- Firebase Auth State Listener & User Profile Fetch ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const user = await getUserFromFirestore(firebaseUser.uid);
          if (user) {
            setUser(user);
            // Redirect based on role
            if (user.role === UserRole.ADMIN) {
              window.history.replaceState({}, '', '/admin');
              setPage('Admin');
            } else {
              window.history.replaceState({}, '', '/');
              setPage('Home');
            }
          } else {
            console.warn("User data not found in Firestore. Please register again.");
            setUser(null);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUser(null);
        }
      } else {
        setUser(null);
        setPage("Home");
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

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

  const handleAddToCart = (productId: string) => {
    if (!user) {
      showToast("Please sign in to add items to your cart.", "error");
      setPage("Auth");
      return;
    }

    const product = findProduct(productId, products);
    if (!product) return;

    setCartItems((prevItems: CartItem[]) => {
      const existingItem = prevItems.find((item: CartItem) => item.id === productId);
      if (existingItem) {
        return prevItems.map((item: CartItem) =>
          item.id === productId ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        showToast(`${product.name} added to cart.`, "success");
        return [...prevItems, { ...product, quantity: 1 }];
      }
    });
  };

  const handleRemoveFromCart = (productId: string, removeAll: boolean = false) => {
    const product = findProduct(productId, products);
    if (!product) return;

    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === productId);

      if (removeAll || existingItem?.quantity === 1) {
        showToast(`${product.name} removed from cart.`, "success");
        return prevItems.filter((item) => item.id !== productId);
      } else if (existingItem) {
        return prevItems.map((item) =>
          item.id === productId ? { ...item, quantity: existingItem.quantity - 1 } : item
        );
      }
      return prevItems;
    });
  };

  const handleToggleWishlist = (productId: string) => {
    if (!user) {
      showToast("Please sign in to manage your wishlist.", "error");
      setPage("Auth");
      return;
    }

    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setWishlist((prev) => {
      const exists = prev.includes(productId);
      if (exists) {
        showToast(`${product.name} removed from wishlist.`, "success");
        return prev.filter((id) => id !== productId);
      } else {
        showToast(`${product.name} added to wishlist.`, "success");
        return [...prev, productId];
      }
    });
  };

  // Auth handler for modal
  const handleAuth = async (name: string, email: string, password: string, isSignUp: boolean) => {
    setAuthLoading(true);
    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await saveUserToFirestore(userCredential.user.uid, {
          name: name || email.split('@')[0],
          email,
          role: UserRole.CUSTOMER,
        });
        showToast("Account created!", "success");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        showToast("Signed in successfully!", "success");
      }
      setShowAuthModal(false);
    } catch (error: any) {
      showToast(error.message || "Authentication failed", "error");
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
    const isAdminRoute = location.pathname.startsWith("/admin");
    const isFullBleedRoute = ["/", "/home", "/new-arrivals"].includes(location.pathname);
    return (
      <>
        {!isAdminRoute && (
          <Navbar 
            user={user} 
            onLoginClick={() => setShowAuthModal(true)}
            onLogoutClick={async () => {
              try {
                await auth.signOut();
                setUser(null);
                setPage('Home');
                showToast('Logged out successfully.', 'success');
              } catch (e) {
                showToast('Failed to logout. Try again.', 'error');
              }
            }}
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
            <Routes>
              <Route path="/" element={<CustomerHome />} />
              <Route path="/home" element={<CustomerHome />} />
              <Route path="/admin" element={
                (user && user.role === UserRole.ADMIN) ? (
                  <AdminDashboard />
                ) : (
                  <LandingPage />
                )
              } />
              <Route path="/product/:id" element={<ProductDetails wishlist={wishlist} toggleWishlist={handleToggleWishlist} />} />
              <Route path="/login" element={<Auth onAuthSuccess={setUser} />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/wishlist" element={
                <Wishlist
                  wishlist={wishlist}
                  toggleWishlist={handleToggleWishlist}
                  setView={(view) => {
                    if (view === 'shop') window.location.href = '/shop';
                  }}
                />
              } />
              <Route path="/cart" element={
                <Cart
                  cart={cartItems}
                  updateCartQty={(id, qty) => {
                    setCartItems((prev) => prev.map(item => item.id === id ? { ...item, quantity: qty } : item));
                  }}
                  removeFromCart={(id) => {
                    setCartItems((prev) => prev.filter(item => item.id !== id));
                  }}
                  user={user}
                  setView={(view) => {
                    if (view === 'shop') window.location.href = '/shop';
                  }}
                />
              } />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/shop" element={<Shop wishlist={wishlist} toggleWishlist={handleToggleWishlist} />} />
              <Route path="/new-arrivals" element={<NewArrivalsPage />} />
            </Routes>
          </RouteScaffold>
        </Router>
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuth={handleAuth}
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

export default App;