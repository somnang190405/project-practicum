import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { listenProducts, listenOrders, createProduct, updateProduct, deleteProduct, listenCategories, addCategoryIfNotExists, ensureCategories } from "../services/firestoreService";
import { storage } from "../services/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Product, Order } from "../types";
import "./AdminDashboard.css";
import UserManagement from "./UserManagement";
import OrderManagement from "./OrderManagement";
import SalesReports from "./SalesReports";
import { auth } from "../services/firebase";

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [newProduct, setNewProduct] = useState<Omit<Product, "id">>({
    name: "",
    price: 0,
    category: "",
    image: "",
    description: "",
    stock: 0,
    rating: 0,
    isNewArrival: false,
  });
  const [imageMode, setImageMode] = useState<'url' | 'upload'>('url');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewError, setImagePreviewError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<"dashboard" | "products" | "orders" | "users" | "sales">("dashboard");
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const defaultCategories = ["Men", "Women", "Accessory"];
  const [categories, setCategories] = useState<string[]>(defaultCategories);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [addingCategoryEdit, setAddingCategoryEdit] = useState(false);
  const [newCategoryEdit, setNewCategoryEdit] = useState("");
  const [formErrors, setFormErrors] = useState<{ name?: string; price?: string; stock?: string; category?: string; image?: string }>({});
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const [optimizing, setOptimizing] = useState(false);
  // Upload-related states removed as we now use a URL input
  // Edit modal image handling
  const [editImageMode, setEditImageMode] = useState<'url' | 'upload'>('url');
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreviewError, setEditImagePreviewError] = useState<string | null>(null);
  const [editUploadProgress, setEditUploadProgress] = useState<number | null>(null);

  // Downscale + compress images client-side for faster uploads
  const downscaleImage = async (
    file: File,
    maxEdge = 1280,
    targetMaxBytes = 1500000,
    qualityStart = 0.82
  ): Promise<Blob> => {
    try {
      const createBitmap = (f: File) => (window as any).createImageBitmap ? (createImageBitmap as any)(f) : Promise.reject('no-bitmap');
      const bitmap = await createBitmap(file).catch(async () => {
        // Fallback via HTMLImageElement
        const url = URL.createObjectURL(file);
        try {
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const i = new Image();
            i.onload = () => resolve(i);
            i.onerror = reject;
            i.src = url;
          });
          return img as unknown as ImageBitmap;
        } finally {
          URL.revokeObjectURL(url);
        }
      });
      const width = (bitmap as any).width || (bitmap as any).naturalWidth;
      const height = (bitmap as any).height || (bitmap as any).naturalHeight;
      const scale = Math.min(1, maxEdge / Math.max(width, height));
      const targetW = Math.round(width * scale);
      const targetH = Math.round(height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;
      (ctx as any).imageSmoothingQuality = 'high';
      ctx.drawImage(bitmap as any, 0, 0, targetW, targetH);

      // Produce JPEG blob; if too large, iteratively reduce quality
      let q = qualityStart;
      let out: Blob | null = null;
      const toBlobOnce = (qual: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', qual));
      out = await toBlobOnce(q);
      if (!out) return file;
      while (out.size > targetMaxBytes && q > 0.5) {
        q = Math.max(0.5, q - 0.1);
        const next = await toBlobOnce(q);
        if (!next) break;
        out = next;
      }
      return out || file;
    } catch {
      return file;
    }
  };

  // Upload with progress + timeout
  const uploadToStorage = async (blob: Blob, path: string, onProgress?: (p: number) => void): Promise<string> => {
    const imageRef = ref(storage, path);
    return new Promise<string>((resolve, reject) => {
      const metadata = {
        contentType: (blob as any).type || 'image/jpeg',
        cacheControl: 'public, max-age=31536000'
      } as any;
      const task = uploadBytesResumable(imageRef, blob, metadata);
      const timeoutId = setTimeout(() => {
        try { task.cancel(); } catch {}
        reject(new Error('Upload timeout'));
      }, 45000);
      task.on('state_changed', (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        onProgress?.(pct);
      }, (err) => {
        clearTimeout(timeoutId);
        reject(err);
      }, () => {
        clearTimeout(timeoutId);
        // Wrap getDownloadURL in try/catch to avoid hanging on errors
        getDownloadURL(imageRef)
          .then((url) => resolve(url))
          .catch((err) => reject(err));
      });
    });
  };

  const titleCase = (s: string) => s
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  useEffect(() => {
    const unsubProducts = listenProducts(setProducts);
    const unsubOrders = listenOrders(setOrders);
    // ensure default categories exist
    ensureCategories(defaultCategories).catch(() => {});
    const unsubCategories = listenCategories((cats) => {
      const names = cats.map(c => c.name).filter(Boolean);
      // Always include defaults at least once
      const merged = Array.from(new Set([...
        defaultCategories,
        ...names
      ]));
      setCategories(merged);
    });
    return () => {
      unsubProducts && unsubProducts();
      unsubOrders && unsubOrders();
      unsubCategories && unsubCategories();
    };
  }, []);

  const handleCreateProduct = async () => {
    const errors: typeof formErrors = {};
    if (!newProduct.name.trim()) errors.name = "Product name is required";
    if (!newProduct.price || newProduct.price <= 0) errors.price = "Enter a valid price";
    if (newProduct.stock < 0) errors.stock = "Stock cannot be negative";
    if (!newProduct.category.trim()) errors.category = "Select a category";
    if (imageMode === 'url') {
      if (!newProduct.image || !/^https?:\/\//i.test(newProduct.image)) errors.image = "Enter a valid image URL";
    } else {
      if (!imageFile) errors.image = "Please choose an image file";
    }
    setFormErrors(errors);
    if (Object.keys(errors).length) {
      setToast({ message: "Please fix the form errors.", type: "error" });
      return;
    }
    try {
      setSaving(true);
      setToast(null);
      // Resolve imageUrl based on chosen mode
      let imageUrl = newProduct.image.trim();
      if (imageMode === 'upload' && imageFile) {
        setUploadProgress(0);
        setOptimizing(true);
        const optimized = await downscaleImage(imageFile, 1280, 1500000, 0.82);
        setOptimizing(false);
        const safeName = newProduct.name.trim().replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
        const path = `products/${Date.now()}_${safeName}.jpg`;
        imageUrl = await uploadToStorage(optimized, path, setUploadProgress);
      }

      await createProduct({
        name: newProduct.name.trim(),
        price: newProduct.price,
        category: newProduct.category.trim(),
        image: imageUrl,
        description: newProduct.description || "",
        stock: newProduct.stock,
        rating: 0,
        isNewArrival: !!newProduct.isNewArrival,
      });
      setToast({ message: "Product added successfully.", type: "success" });
      setShowAddModal(false);
      setNewProduct({ name: "", price: 0, category: "", image: "", description: "", stock: 0, rating: 0, isNewArrival: false });
      setImageFile(null);
      setImagePreviewError(null);
      setImageMode('url');
      setUploadProgress(null);
      setFormErrors({});
      // Navigate to homepage to view the product in real time
      navigate("/", { state: { addedProductName: newProduct.name.trim() } });
    } catch (e: any) {
      console.error(e);
      const code = e?.code || e?.name || '';
      const msg =
        code.includes('storage/unauthorized')
          ? 'Upload denied by Storage rules. Allow authenticated writes or adjust rules.'
          : code.includes('storage/retry-limit')
          ? 'Network issue while uploading. Please try again.'
          : e?.message || 'Failed to add product.';
      setToast({ message: `Failed to add product: ${msg}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasteOrDrop = async (data: DataTransfer | null, textFallback?: string) => {
    if (data) {
      // Prefer image file
      const fileItem = Array.from(data.items || []).find(i => i.kind === 'file');
      if (fileItem) {
        const file = fileItem.getAsFile();
        if (file) {
          setImageMode('upload');
          setImageFile(file);
          setImagePreviewError(null);
          return;
        }
      }
      // Or handle pasted text/URL
      const textItem = Array.from(data.items || []).find(i => i.kind === 'string' && i.type === 'text/plain');
      if (textItem) {
        textItem.getAsString((s) => {
          if (/^https?:\/\//i.test(s.trim())) {
            setImageMode('url');
            setNewProduct(prev => ({ ...prev, image: s.trim() }));
          }
        });
        return;
      }
    }
    if (textFallback && /^https?:\/\//i.test(textFallback.trim())) {
      setImageMode('url');
      setNewProduct(prev => ({ ...prev, image: textFallback.trim() }));
    }
  };

  const handleUpdateProduct = async (id: string, updatedFields: Partial<Product>) => {
    await updateProduct(id, updatedFields);
    setProducts(products.map((p) => (p.id === id ? { ...p, ...updatedFields } : p)));
    setToast({ message: "Product updated.", type: "success" });
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await deleteProduct(id);
    setProducts(products.filter((p) => p.id !== id));
    setToast({ message: "Product deleted.", type: "success" });
  };

  return (
    <div className="admin-dashboard-root light">
      <aside className="admin-sidebar light">
        <div className="brand">
          <span className="brand-icon">🛡️</span>
          <span className="brand-name">TinhMe Admin Console</span>
        </div>
        <nav className="side-nav">
          <button className={`nav-item ${activeView === "dashboard" ? "active" : ""}`} onClick={() => setActiveView("dashboard")}>
            <span className="nav-icon">🏠</span>
            <span>Dashboard</span>
          </button>
          <button className={`nav-item ${activeView === "products" ? "active" : ""}`} onClick={() => setActiveView("products")}>
            <span className="nav-icon">📦</span>
            <span>Products</span>
          </button>
          <button className={`nav-item ${activeView === "orders" ? "active" : ""}`} onClick={() => setActiveView("orders")}>
            <span className="nav-icon">🛒</span>
            <span>Orders</span>
          </button>
          <button className={`nav-item ${activeView === "users" ? "active" : ""}`} onClick={() => setActiveView("users")}>
            <span className="nav-icon">👥</span>
            <span>Users</span>
          </button>
          <button className={`nav-item ${activeView === "sales" ? "active" : ""}`} onClick={() => setActiveView("sales")}>
            <span className="nav-icon">📈</span>
            <span>Reports</span>
          </button>
        </nav>
      </aside>
      <main className="admin-main light">
        <header className="topbar">
          <h1 className="page-title">
            {activeView === "dashboard" && "Overview"}
            {activeView === "products" && "Products"}
            {activeView === "orders" && "Order Management"}
            {activeView === "users" && "User Management"}
            {activeView === "sales" && "Sales Reports"}
          </h1>
          <button className="logout-btn" onClick={() => { navigate("/"); }}>Back Home</button>
        </header>

        {activeView === "dashboard" && (
          <div className="overview-grid">
            {orders.length > 0 && (
              <>
                <div className="card metric">
                  <div className="metric-icon">💵</div>
                  <div>
                    <div className="metric-label">Total Revenue</div>
                    <div className="metric-value">
                      ${orders.reduce((sum, o) => sum + (o.total || 0), 0).toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="card metric">
                  <div className="metric-icon">🧾</div>
                  <div>
                    <div className="metric-label">Pending Orders</div>
                    <div className="metric-value">{orders.filter(o => String(o.status).toLowerCase() === 'pending').length}</div>
                  </div>
                </div>
                <div className="card metric">
                  <div className="metric-icon">📈</div>
                  <div>
                    <div className="metric-label">Sales Growth</div>
                    <div className="metric-value">{orders.length > 1 ? '+12.5%' : '+0%'}</div>
                  </div>
                </div>
              </>
            )}

            {orders.length > 0 && (
              <div className="card chart">
                <div className="card-title">Sales Report</div>
                <div className="bar-chart">
                  {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => {
                    const monthTotal = orders
                      .filter(o => {
                        const d = new Date(o.date);
                        return d.getMonth() === i;
                      })
                      .reduce((sum, o) => sum + (o.total || 0), 0);
                    const max = Math.max(1, ...[0, ...orders.map(o => o.total || 0)]);
                    const h = Math.min(180, (monthTotal / max) * 180);
                    return (
                      <div key={m} className="bar">
                        <div className="bar-fill" style={{ height: `${h}px` }} />
                        <span className="bar-label">{m}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {products.some(p => p.stock <= 5) && (
              <div className="card alerts">
                <div className="card-title">Low Stock Alert</div>
                <ul className="low-stock-list">
                  {products.filter(p => p.stock <= 5).slice(0,5).map(p => (
                    <li key={p.id}>
                      {p.image && (
                        <img
                          src={p.image}
                          data-src={p.image}
                          alt={p.name}
                          onError={(e)=>{
                            const img = e.currentTarget as HTMLImageElement;
                            const orig = img.getAttribute('data-src') || img.src;
                            if (!img.dataset.fallback) { img.dataset.fallback='proxy'; img.src = `https://images.weserv.nl/?url=${encodeURIComponent(orig)}`; }
                            else { img.src = 'https://via.placeholder.com/40x40?text=?'; }
                          }}
                        />
                      )}
                      <div>
                        <div className="item-name">{p.name}</div>
                        <div className="item-remaining danger">{p.stock} remaining</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeView === "products" && (
          <section className="products-section">
            <div className="section-header">
              <button className="primary-btn" onClick={() => setShowAddModal(true)}>+ Add Product</button>
            </div>
            <div className="product-list card">
              <div className="product-table">
                <div className="product-row header">
                  <span>Product</span>
                  <span>Price</span>
                  <span>Stock</span>
                  <span>Category</span>
                  <span>Actions</span>
                </div>
                {products.map((product) => (
                  <div className="product-row" key={product.id}>
                    <span className="product-cell name">
                      <img
                        src={product.image}
                        data-src={product.image}
                        alt={product.name}
                        onError={(e)=>{
                          const img = e.currentTarget as HTMLImageElement;
                          const orig = img.getAttribute('data-src') || img.src;
                          if (!img.dataset.fallback) { img.dataset.fallback='proxy'; img.src = `https://images.weserv.nl/?url=${encodeURIComponent(orig)}`; }
                          else { img.src = 'https://via.placeholder.com/64x64?text=?'; }
                        }}
                      />
                      {product.name}
                    </span>
                    <span>${product.price.toFixed(2)}</span>
                    <span>
                      <span className={`stock-badge ${product.stock <= 2 ? "danger" : product.stock < 10 ? "warn" : "ok"}`}>{product.stock}</span>
                    </span>
                    <span>{product.category}</span>
                    <span className="actions">
                      <button className="icon-btn" onClick={() => { 
                        setEditTarget(product); 
                        setShowEditModal(true); 
                        setEditImageMode('url');
                        setEditImageFile(null);
                        setEditImagePreviewError(null);
                        setEditUploadProgress(null);
                      }}>✏️</button>
                      <button className="icon-btn" onClick={() => handleDeleteProduct(product.id)}>🗑️</button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {activeView === "orders" && (
          <section>
            <OrderManagement />
          </section>
        )}

        {activeView === "users" && (
          <section>
            <UserManagement />
          </section>
        )}

        {activeView === "sales" && (
          <section>
            <SalesReports />
          </section>
        )}
      </main>
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">New Product</div>
            <div className="modal-body">
              <div className="form-grid">
                <label className="form-label">Product Name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Product Name"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                />
                {formErrors.name && <div className="field-error">{formErrors.name}</div>}

                <label className="form-label">Price</label>
                <input
                  className="input"
                  type="number"
                  placeholder="Price"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value || "0") })}
                />
                {formErrors.price && <div className="field-error">{formErrors.price}</div>}

                <label className="form-label">Stock</label>
                <input
                  className="input"
                  type="number"
                  placeholder="Stock"
                  value={newProduct.stock}
                  onChange={(e) => setNewProduct({ ...newProduct, stock: parseInt(e.target.value || "0") })}
                />
                {formErrors.stock && <div className="field-error">{formErrors.stock}</div>}

                <label className="form-label">Category</label>
                <select
                  className="input"
                  value={addingCategory ? "__add__" : (newProduct.category || "")}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "__add__") {
                      setAddingCategory(true);
                      setNewProduct({ ...newProduct, category: "" });
                    } else {
                      setAddingCategory(false);
                      setNewProduct({ ...newProduct, category: val });
                    }
                  }}
                >
                  <option value="" disabled>Select category</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="__add__">+ Add new category…</option>
                </select>
                {addingCategory && (
                  <div className="add-cat-row">
                    <input className="input" type="text" placeholder="New category" value={newCategory} onChange={(e)=>setNewCategory(e.target.value)} />
                    <button className="btn" onClick={async () => {
                      const c = titleCase(newCategory);
                      if (!c) { setToast({message: 'Enter a category name', type: 'error'}); return; }
                      await addCategoryIfNotExists(c);
                      setNewProduct({ ...newProduct, category: c });
                      setNewCategory("");
                      setAddingCategory(false);
                    }}>Add</button>
                  </div>
                )}
                {formErrors.category && <div className="field-error">{formErrors.category}</div>}

                <label className="form-label">Image Source</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <label><input type="radio" name="imgsrc" checked={imageMode==='url'} onChange={()=>{ setImageMode('url'); setImageFile(null); }} /> URL</label>
                  <label><input type="radio" name="imgsrc" checked={imageMode==='upload'} onChange={()=>{ setImageMode('upload'); if (!newProduct.image) setImagePreviewError(null); }} /> Upload</label>
                </div>

                {imageMode === 'url' && (
                  <>
                    <input
                      className="input"
                      type="url"
                      placeholder="https://..."
                      value={newProduct.image}
                      onChange={(e) => { setNewProduct({ ...newProduct, image: e.target.value }); setImagePreviewError(null); }}
                    />
                    {formErrors.image && <div className="field-error">{formErrors.image}</div>}
                    {newProduct.image && (
                      <div className="image-preview">
                        <img
                          src={newProduct.image}
                          data-src={newProduct.image}
                          alt="preview"
                          crossOrigin="anonymous"
                          onError={(e)=>{
                            const img = e.currentTarget as HTMLImageElement;
                            const orig = img.getAttribute('data-src') || img.src;
                            if (!img.dataset.fallback) {
                              img.dataset.fallback = 'proxy';
                              img.src = `https://images.weserv.nl/?url=${encodeURIComponent(orig)}`;
                              setImagePreviewError(null);
                            } else {
                              setImagePreviewError('Cannot load image. Check the URL.');
                            }
                          }}
                        />
                      </div>
                    )}
                    {imagePreviewError && <div className="field-error">{imagePreviewError}</div>}
                  </>
                )}
                {imageMode === 'upload' && (
                  <>
                    <div
                      style={{ padding: 8, border: '1px dashed #ccc', borderRadius: 8 }}
                      onDrop={(e)=>{ e.preventDefault(); handlePasteOrDrop(e.dataTransfer); }}
                      onDragOver={(e)=> e.preventDefault()}
                      onPaste={(e)=> handlePasteOrDrop(e.clipboardData)}
                    >
                      <input
                        className="input"
                        type="file"
                        accept="image/*"
                        onChange={(e)=>{
                          const f = e.target.files ? e.target.files[0] : null;
                          if (f && !allowedImageTypes.includes(f.type)) {
                            setImageFile(null);
                            setFormErrors((prev)=>({ ...prev, image: 'Unsupported image type. Use JPG, PNG, or WEBP.' }));
                            setImagePreviewError('Unsupported image type. Use JPG, PNG, or WEBP.');
                          } else {
                            setImageFile(f);
                            setFormErrors((prev)=>({ ...prev, image: undefined }));
                            setImagePreviewError(null);
                          }
                        }}
                      />
                      <div style={{fontSize:12,color:'#6b7280',marginTop:6}}>Tip: paste an image or drop a file here</div>
                    </div>
                    {formErrors.image && <div className="field-error">{formErrors.image}</div>}
                    {imageFile && (
                      <div className="image-preview">
                        <img src={URL.createObjectURL(imageFile)} alt="preview" />
                      </div>
                    )}
                    {saving && optimizing && (
                      <div style={{marginTop:8, fontSize:12, color:'#6b7280'}}>Optimizing image…</div>
                    )}
                    {typeof uploadProgress === 'number' && saving && (
                      <div style={{marginTop:8}}>
                        <div style={{height:6, background:'#eee', borderRadius:6}}>
                          <div style={{height:6, width:`${uploadProgress}%`, background:'#3b82f6', borderRadius:6}} />
                        </div>
                        <div style={{fontSize:12, color:'#6b7280', marginTop:4}}>Uploading… {uploadProgress}%</div>
                      </div>
                    )}
                  </>
                )}
                <label className="form-label">Mark as New Arrival</label>
                <div>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={!!newProduct.isNewArrival}
                      onChange={(e) => setNewProduct({ ...newProduct, isNewArrival: e.target.checked })}
                    />
                    <span>Show in New Arrivals</span>
                  </label>
                </div>

                <label className="form-label">Description</label>
                <textarea
                  className="input textarea"
                  placeholder="Description"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button
                className="btn primary"
                disabled={
                  saving ||
                  !newProduct.name.trim() ||
                  !(newProduct.price > 0) ||
                  newProduct.stock < 0 ||
                  !newProduct.category.trim() ||
                  (imageMode==='url' ? !newProduct.image.trim() : !imageFile)
                }
                onClick={async () => { await handleCreateProduct(); }}
              >{saving ? (typeof uploadProgress === 'number' ? `Saving… ${uploadProgress}%` : 'Saving…') : "Save"}</button>
              
            </div>
          </div>
        </div>
      )}
      {showEditModal && editTarget && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">Edit Product</div>
            <div className="modal-body">
              <div className="form-grid">
                <label className="form-label">Product Name</label>
                <input
                  className="input"
                  type="text"
                  value={editTarget.name}
                  onChange={(e) => setEditTarget({ ...editTarget, name: e.target.value })}
                />
                <label className="form-label">Price</label>
                <input
                  className="input"
                  type="number"
                  value={editTarget.price}
                  onChange={(e) => setEditTarget({ ...editTarget, price: parseFloat(e.target.value || "0") })}
                />
                <label className="form-label">Stock</label>
                <input
                  className="input"
                  type="number"
                  value={editTarget.stock}
                  onChange={(e) => setEditTarget({ ...editTarget, stock: parseInt(e.target.value || "0") })}
                />
                <label className="form-label">Category</label>
                <select
                  className="input"
                  value={addingCategoryEdit ? "__add__" : (editTarget.category || "")}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "__add__") {
                      setAddingCategoryEdit(true);
                      setEditTarget({ ...editTarget, category: "" });
                    } else {
                      setAddingCategoryEdit(false);
                      setEditTarget({ ...editTarget, category: val });
                    }
                  }}
                >
                  <option value="" disabled>Select category</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="__add__">+ Add new category…</option>
                </select>
                {addingCategoryEdit && (
                  <div className="add-cat-row">
                    <input className="input" type="text" placeholder="New category" value={newCategoryEdit} onChange={(e)=>setNewCategoryEdit(e.target.value)} />
                    <button className="btn" onClick={async () => {
                      const c = titleCase(newCategoryEdit);
                      if (!c) { setToast({message: 'Enter a category name', type: 'error'}); return; }
                      await addCategoryIfNotExists(c);
                      setEditTarget({ ...editTarget, category: c });
                      setNewCategoryEdit("");
                      setAddingCategoryEdit(false);
                    }}>Add</button>
                  </div>
                )}
                <label className="form-label">Image Source</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <label><input type="radio" name="imgsrc_edit" checked={editImageMode==='url'} onChange={()=>{ setEditImageMode('url'); setEditImageFile(null); }} /> URL</label>
                  <label><input type="radio" name="imgsrc_edit" checked={editImageMode==='upload'} onChange={()=>{ setEditImageMode('upload'); if (!editTarget.image) setEditImagePreviewError(null); }} /> Upload</label>
                </div>

                {editImageMode === 'url' && (
                  <>
                    <input
                      className="input"
                      type="url"
                      placeholder="https://..."
                      value={editTarget.image}
                      onChange={(e) => { setEditTarget({ ...editTarget, image: e.target.value }); setEditImagePreviewError(null); }}
                    />
                    {editTarget.image && (
                      <div className="image-preview">
                        <img src={editTarget.image} alt="preview" crossOrigin="anonymous" onError={()=>setEditImagePreviewError('Cannot load image. Check the URL.')} />
                      </div>
                    )}
                    {editImagePreviewError && <div className="field-error">{editImagePreviewError}</div>}
                  </>
                )}
                {editImageMode === 'upload' && (
                  <>
                    <div
                      style={{ padding: 8, border: '1px dashed #ccc', borderRadius: 8 }}
                      onDrop={(e)=>{ e.preventDefault(); handlePasteOrDrop(null); const dt=e.dataTransfer; if (dt) { const f=dt.files && dt.files[0]; if (f) { setEditImageFile(f); setEditImagePreviewError(null);} } }}
                      onDragOver={(e)=> e.preventDefault()}
                      onPaste={(e)=>{ const dt=e.clipboardData; if (dt) { const fileItem=Array.from(dt.items).find(i=>i.kind==='file'); if (fileItem) { const f=fileItem.getAsFile(); if (f){ setEditImageFile(f); setEditImagePreviewError(null);} } else { const ti=Array.from(dt.items).find(i=>i.kind==='string'&&i.type==='text/plain'); if (ti) ti.getAsString(s=>{ if(/^https?:\/\//i.test(s.trim())){ setEditImageMode('url'); setEditTarget({...editTarget, image:s.trim()}); } }); } } }}
                    >
                      <input
                        className="input"
                        type="file"
                        accept="image/*"
                        onChange={(e)=>{
                          const f = e.target.files ? e.target.files[0] : null;
                          setEditImageFile(f);
                          setEditImagePreviewError(null);
                        }}
                      />
                      <div style={{fontSize:12,color:'#6b7280',marginTop:6}}>Tip: paste an image or drop a file here</div>
                    </div>
                    {editImageFile && (
                      <div className="image-preview">
                        <img src={URL.createObjectURL(editImageFile)} alt="preview" />
                      </div>
                    )}
                    {typeof editUploadProgress === 'number' && saving && (
                      <div style={{marginTop:8}}>
                        <div style={{height:6, background:'#eee', borderRadius:6}}>
                          <div style={{height:6, width:`${editUploadProgress}%`, background:'#3b82f6', borderRadius:6}} />
                        </div>
                        <div style={{fontSize:12, color:'#6b7280', marginTop:4}}>Uploading… {editUploadProgress}%</div>
                      </div>
                    )}
                  </>
                )}
                <label className="form-label">Mark as New Arrival</label>
                <div>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={!!editTarget.isNewArrival}
                      onChange={(e) => setEditTarget({ ...editTarget, isNewArrival: e.target.checked })}
                    />
                    <span>Show in New Arrivals</span>
                  </label>
                </div>

                <textarea
                  className="input textarea"
                  placeholder="Description"
                  value={editTarget.description}
                  onChange={(e) => setEditTarget({ ...editTarget, description: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn ghost" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button
                className="btn primary"
                disabled={saving}
                onClick={async () => {
                  if (!editTarget) return;
                  try {
                    setSaving(true);
                    let imageUrl = editTarget.image;
                    if (editImageMode === 'upload' && editImageFile) {
                      setEditUploadProgress(0);
                      const optimized = await downscaleImage(editImageFile);
                      const safeName = editTarget.name.trim().replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
                      const path = `products/${Date.now()}_${safeName}.jpg`;
                      imageUrl = await uploadToStorage(optimized, path, setEditUploadProgress);
                    }
                    await handleUpdateProduct(editTarget.id, {
                      name: editTarget.name,
                      price: editTarget.price,
                      stock: editTarget.stock,
                      category: editTarget.category,
                      image: imageUrl,
                      description: editTarget.description,
                      isNewArrival: !!editTarget.isNewArrival,
                    });
                    setShowEditModal(false);
                    setEditImageFile(null);
                    setEditImagePreviewError(null);
                    setEditUploadProgress(null);
                    setEditImageMode('url');
                  } catch (e:any) {
                    console.error(e);
                    setToast({ message: 'Failed to save product.', type: 'error' });
                  } finally {
                    setSaving(false);
                  }
                }}
              >{saving ? (typeof editUploadProgress === 'number' ? `Saving… ${editUploadProgress}%` : 'Saving…') : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className={`inline-toast ${toast.type}`}>{toast.message}</div>
      )}
    </div>
  );
};

export default AdminDashboard;