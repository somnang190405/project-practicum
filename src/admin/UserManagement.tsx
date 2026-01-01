import React, { useState, useEffect } from "react";
import { getAllUsers, deleteUser } from "../services/firestoreService";
import { User, UserRole } from "../types";
import './UserManagement.css';
import { Trash2 } from 'lucide-react';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const fetchedUsers = await getAllUsers();
      setUsers(fetchedUsers);
    };
    fetchUsers();
  }, []);

  const handleDeleteUser = async (id: string) => {
    await deleteUser(id);
    setUsers(users.filter((u) => u.id !== id));
  };

  return (
    <div className="user-management-container">
      <h2 className="um-title">User Management</h2>
      <div className="um-table card">
        <div className="um-row um-header">
          <span>User</span>
          <span>Email</span>
          <span>Role</span>
          <span>Actions</span>
        </div>
        {users.map((user) => (
          <div className="um-row" key={user.id}>
            <span className="um-cell user">
              <img className="avatar" src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=111827&color=fff`} alt={user.name} />
              <span className="name">{user.name}</span>
            </span>
            <span className="um-cell email">{user.email}</span>
            <span className="um-cell role">
              <span className={`role-badge ${user.role === UserRole.ADMIN ? 'admin' : 'customer'}`}>{user.role}</span>
            </span>
            <span className="um-cell actions">
              {user.role !== UserRole.ADMIN ? (
                <button className="icon-btn danger" title="Delete" onClick={() => handleDeleteUser(user.id)}>
                  <Trash2 size={16} />
                </button>
              ) : (
                <span className="um-muted">Protected</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserManagement;
