import React, { useEffect, useMemo, useState } from 'react';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserFromFirestore, updateUser } from '../services/firestoreService';
import { User as TUser } from '../types';
import { useNavigate, Link } from 'react-router-dom';
import './ProfilePage.css';

const ProfilePage: React.FC<{ onRequireAuth?: (redirectTo: string) => void }> = ({ onRequireAuth }) => {
  const [user, setUser] = useState<TUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Editable form state (must be declared unconditionally to obey React hook rules)
  const initialForm = useMemo(() => {
    const u = user;
    return {
      gender: (u?.gender as 'Male' | 'Female' | 'Other') || undefined,
      firstName: u?.firstName || '',
      lastName: u?.lastName || '',
      email: u?.email || '',
      phoneNumber: u?.phoneNumber || '',
      dateOfBirth: u?.dateOfBirth || '',
    };
  }, [user]);

  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep form in sync when user loads/refreshes.
  useEffect(() => {
    setForm(initialForm);
    setSavedMsg(null);
    setError(null);
    // Auto-expand "More details" if user already has optional info saved.
    setShowMore(Boolean(initialForm.dateOfBirth));
  }, [initialForm]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const u = await getUserFromFirestore(fbUser.uid);
        setUser(u);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      try { unsubAuth(); } catch {}
    };
  }, []);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-gray-600 text-center">Loading your profile…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-2xl font-semibold mb-2 text-center">Profile</h1>
        <p className="text-gray-600 mb-6 text-center">You need to sign in to view your profile.</p>
        <div className="flex items-center justify-center gap-3">
          <button
            className="px-5 py-2.5 rounded-xl bg-black text-white font-medium"
            onClick={() => {
              if (onRequireAuth) onRequireAuth('/profile');
              else navigate('/');
            }}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const onChange = (field: keyof typeof initialForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [field]: e.target.value });
  };

  const parseDobToISO = (input: string) => {
    const v = input.trim();
    // accept YYYY-MM-DD directly
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    // accept DD/MM/YYYY
    const m = v.match(/^([0-3]?\d)\/([0-1]?\d)\/(\d{4})$/);
    if (m) {
      const dd = m[1].padStart(2, '0');
      const mm = m[2].padStart(2, '0');
      const yyyy = m[3];
      return `${yyyy}-${mm}-${dd}`;
    }
    return v; // fallback store raw
  };

  const save = async () => {
    if (!user) return;
    setError(null);
    if (!form.gender) {
      setError('Please select gender.');
      return;
    }
    setSaving(true);
    try {
      const name = [form.firstName, form.lastName].filter(Boolean).join(' ').trim();
      await updateUser(user.id, {
        name: name || user.name,
        firstName: form.firstName,
        lastName: form.lastName,
        gender: (form.gender as any) || 'Other',
        phoneNumber: form.phoneNumber,
        dateOfBirth: parseDobToISO(form.dateOfBirth),
      });
      setSavedMsg('Profile updated successfully! Redirecting…');
      // refresh local user object
      const refreshed = await getUserFromFirestore(user.id);
      if (refreshed) setUser(refreshed);
      // Navigate to Orders with a success toast shortly after success
      window.setTimeout(() => {
        try {
          navigate('/orders', { state: { toast: { message: 'Profile updated successfully', type: 'success' } } });
        } catch {}
      }, 900);
    } catch (e) {
      setSavedMsg('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6 text-center">Profile</h1>

      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="mb-5">
          <div className="text-sm text-gray-600 mb-2">Gender (required)</div>
          <div className="flex gap-3 flex-wrap">
            {(['Male', 'Female', 'Other'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setForm({ ...form, gender: g })}
                className={`px-4 py-2 rounded-full border text-sm font-medium transition ${
                  form.gender === g
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-gray-900 border-gray-200 hover:border-black'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="profile-field">
            <label>First name</label>
            <input value={form.firstName} onChange={onChange('firstName')} placeholder="First name" />
          </div>
          <div className="profile-field">
            <label>Last name</label>
            <input value={form.lastName} onChange={onChange('lastName')} placeholder="Last name" />
          </div>
          <div className="profile-field md:col-span-2">
            <label>Email</label>
            <input value={form.email} readOnly />
          </div>
          <div className="profile-field md:col-span-2">
            <label>Mobile number</label>
            <input value={form.phoneNumber} onChange={onChange('phoneNumber')} placeholder="Enter phone number" />
          </div>
        </div>

        <button
          type="button"
          className="mt-4 text-sm text-gray-600 hover:text-black"
          onClick={() => setShowMore((v) => !v)}
        >
          {showMore ? 'Hide details' : 'More details'}
        </button>

        {showMore && (
          <div className="mt-4">
            <div className="profile-field">
              <label>Date of birth (YYYY-MM-DD or DD/MM/YYYY)</label>
              <input value={form.dateOfBirth} onChange={onChange('dateOfBirth')} placeholder="YYYY-MM-DD" />
            </div>
          </div>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="mt-6 w-full bg-black text-white py-3.5 rounded-xl font-bold uppercase tracking-wide hover:opacity-90 disabled:opacity-60"
        >
          {saving ? 'Updating…' : 'Update'}
        </button>

        {error && (<div className="mt-3 text-sm text-red-600">{error}</div>)}
        {savedMsg && (
          <div className={`mt-3 text-sm ${savedMsg.includes('successfully') ? 'text-emerald-600' : 'text-red-600'}`}>
            {savedMsg}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
