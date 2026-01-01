import React, { useEffect, useState } from 'react';
import { getProducts, createProduct, updateProduct, deleteProduct, createProductWithUpload } from '../../services/firestoreService';
import { Product } from '../../types';
import { Edit, Trash2, Plus } from 'lucide-react';

const AdminProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});

  const parseColors = (raw: string): string[] => {
    return (raw || '')
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)
      .slice(0, 12);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = () => getProducts().then(setProducts);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await deleteProduct(id);
      loadProducts();
    }
  };

  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const promotionPercent = Math.max(0, Math.min(100, Number((editForm as any).promotionPercent) || 0));
    const colors = parseColors(String((editForm as any).colorsRaw || '') || '').length
      ? parseColors(String((editForm as any).colorsRaw || '') || '')
      : (Array.isArray((editForm as any).colors) ? ((editForm as any).colors as string[]) : []);

    const normalized: Partial<Product> = {
      ...editForm,
      promotionPercent,
      colors,
    };

    if (isEditing === 'new') {
      if (imageFile) {
        await createProductWithUpload({
          name: normalized.name!,
          price: normalized.price!,
          category: normalized.category!,
          description: normalized.description || '',
          stock: normalized.stock || 0,
          rating: normalized.rating || 0,
          promotionPercent: (normalized as any).promotionPercent,
          colors: (normalized as any).colors,
        }, imageFile);
      } else {
        await createProduct(normalized as Omit<Product, 'id'>);
      }
    } else if (isEditing) {
      // If a new image file is provided during edit, upload and set new URL
      if (imageFile) {
        // Create a temporary product to leverage upload helper, then update image only
        const urlProduct = await createProductWithUpload({
          name: normalized.name || 'temp',
          price: normalized.price || 0,
          category: normalized.category || 'uncategorized',
          description: normalized.description || '',
          stock: normalized.stock || 0,
          rating: normalized.rating || 0,
          promotionPercent: (normalized as any).promotionPercent,
          colors: (normalized as any).colors,
        }, imageFile);
        await deleteProduct(urlProduct.id);
        await updateProduct(isEditing, { ...normalized, image: urlProduct.image });
      } else {
        await updateProduct(isEditing, normalized);
      }
    }
    setIsEditing(null);
    setEditForm({});
    setImageFile(null);
    loadProducts();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Products</h2>
        <button
          onClick={() => { setIsEditing('new'); setEditForm({}); }}
          className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus size={18} /> Add Product
        </button>
      </div>

      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{isEditing === 'new' ? 'New Product' : 'Edit Product'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <input
                placeholder="Product Name"
                className="w-full border p-2 rounded"
                value={editForm.name || ''}
                onChange={e => setEditForm({...editForm, name: e.target.value})}
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number" placeholder="Price"
                  className="w-full border p-2 rounded"
                  value={editForm.price || ''}
                  onChange={e => setEditForm({...editForm, price: parseFloat(e.target.value)})}
                  required
                />
                 <input
                  type="number" placeholder="Stock"
                  className="w-full border p-2 rounded"
                  value={editForm.stock || ''}
                  onChange={e => setEditForm({...editForm, stock: parseInt(e.target.value)})}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Promotion % (0-100)"
                  className="w-full border p-2 rounded"
                  value={(editForm as any).promotionPercent ?? ''}
                  onChange={e => setEditForm({ ...editForm, promotionPercent: Math.max(0, Math.min(100, Number(e.target.value || 0))) } as any)}
                />
                <input
                  placeholder="Colors (comma separated)"
                  className="w-full border p-2 rounded"
                  value={String((editForm as any).colorsRaw ?? ((editForm as any).colors || []).join(', '))}
                  onChange={e => setEditForm({ ...editForm, colorsRaw: e.target.value } as any)}
                />
              </div>
              <input
                placeholder="Category"
                className="w-full border p-2 rounded"
                value={editForm.category || ''}
                onChange={e => setEditForm({...editForm, category: e.target.value})}
                required
              />
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Product Image</label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full border p-2 rounded"
                  onChange={e => setImageFile(e.target.files?.[0] || null)}
                />
                {!imageFile && isEditing !== 'new' && (
                  <input
                    placeholder="Image URL (optional)"
                    className="w-full border p-2 rounded"
                    value={editForm.image || ''}
                    onChange={e => setEditForm({...editForm, image: e.target.value})}
                  />
                )}
              </div>
              <textarea
                placeholder="Description"
                className="w-full border p-2 rounded"
                value={editForm.description || ''}
                onChange={e => setEditForm({...editForm, description: e.target.value})}
              />
              <div className="flex gap-2 justify-end mt-4">
                <button type="button" onClick={() => setIsEditing(null)} className="px-4 py-2 text-gray-600">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-black text-white rounded">
                  {isEditing === 'new' ? 'Add Product' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-4 font-semibold text-gray-600">Product</th>
              <th className="p-4 font-semibold text-gray-600">Price</th>
              <th className="p-4 font-semibold text-gray-600">Stock</th>
              <th className="p-4 font-semibold text-gray-600">Category</th>
              <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="p-4 flex items-center gap-3">
                  <img src={p.image} alt={p.name} className="w-10 h-10 rounded object-cover" />
                  <span className="font-medium text-gray-900">{p.name}</span>
                </td>
                <td className="p-4">${p.price.toFixed(2)}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs ${p.stock < 10 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {p.stock}
                  </span>
                </td>
                <td className="p-4 text-gray-600">{p.category}</td>
                <td className="p-4 text-right">
                  <button onClick={() => { setIsEditing(p.id); setEditForm(p); }} className="text-blue-600 p-2 hover:bg-blue-50 rounded"><Edit size={16} /></button>
                  <button onClick={() => handleDelete(p.id)} className="text-red-600 p-2 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminProducts;
