import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, KeyRound, Edit2, Trash2, CheckCircle2, 
  XCircle, RefreshCw, AlertTriangle, Shield, Search
} from 'lucide-react';
import { apiRequest } from './api';

export default function UserManagement({ currentUser, showToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal states
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [resetModal, setResetModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);

  // Form states
  const [formData, setFormData] = useState({ username: '', fullName: '', password: '', role: 'user', status: 'active' });
  const [newPassword, setNewPassword] = useState('');

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/users');
      setUsers(data.users || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      showToast(`User account '${formData.username}' created successfully!`, 'success');
      setCreateModal(false);
      setFormData({ username: '', fullName: '', password: '', role: 'user', status: 'active' });
      loadUsers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await apiRequest(`/users/${editModal.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          fullName: editModal.fullName,
          role: editModal.role,
          status: editModal.status
        })
      });
      showToast(`Account '${editModal.username}' updated!`, 'success');
      setEditModal(null);
      loadUsers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await apiRequest(`/users/${resetModal.id}/reset-password`, {
        method: 'PUT',
        body: JSON.stringify({ newPassword })
      });
      showToast(`Password for ${resetModal.username} has been reset.`, 'success');
      setResetModal(null);
      setNewPassword('');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async () => {
    try {
      const res = await apiRequest(`/users/${deleteModal.id}`, {
        method: 'DELETE'
      });
      showToast(res.message, 'success');
      setDeleteModal(null);
      loadUsers();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Action Bar */}
      <div className="card" style={{ padding: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>User & Account Administration</h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Manage superadmin, admin, and warehouse user access privileges</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', width: '100%', maxWidth: '480px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Filter by name, username or role..." 
              className="form-input" 
              style={{ paddingLeft: '2.25rem' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button onClick={() => setCreateModal(true)} className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
            <UserPlus size={16} /> Add Account
          </button>
          <button onClick={loadUsers} className="btn-secondary" title="Refresh list">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="table-container">
          <table className="corp-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Full Name</th>
                <th>Username</th>
                <th>Assigned Role</th>
                <th>Account Status</th>
                <th>Registered Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    Loading user records...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                    No accounts matching your filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', color: '#64748b' }}>#{u.id}</td>
                    <td style={{ fontWeight: '600', color: '#1e293b' }}>
                      {u.fullName} {u.id === currentUser.id && <span style={{ fontSize: '0.75rem', color: '#2563eb' }}>(You)</span>}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{u.username}</td>
                    <td>
                      <span className={`badge badge-${u.role}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${u.status}`}>
                        {u.status === 'active' ? (
                          <><CheckCircle2 size={12} style={{ marginRight: '4px' }} /> Active</>
                        ) : (
                          <><XCircle size={12} style={{ marginRight: '4px' }} /> Inactive</>
                        )}
                      </span>
                    </td>
                    <td style={{ color: '#64748b', fontSize: '0.85rem' }}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                          title="Edit Details / Role"
                          onClick={() => setEditModal(u)}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', color: '#d97706' }}
                          title="Reset Password"
                          onClick={() => setResetModal(u)}
                        >
                          <KeyRound size={14} />
                        </button>
                        {u.id !== currentUser.id && (
                          <button 
                            className="btn-danger" 
                            style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                            title="Deactivate or Delete"
                            onClick={() => setDeleteModal(u)}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {createModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1.25rem' }}>Create New Account</h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.3rem' }}>Full Name</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  placeholder="e.g. Rahul Sharma"
                  value={formData.fullName} 
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.3rem' }}>Username</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  placeholder="e.g. rsharma"
                  value={formData.username} 
                  onChange={e => setFormData({ ...formData, username: e.target.value })} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.3rem' }}>Password</label>
                <input 
                  type="password" 
                  required 
                  className="form-input" 
                  placeholder="Initial secure password"
                  value={formData.password} 
                  onChange={e => setFormData({ ...formData, password: e.target.value })} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.3rem' }}>Role</label>
                  <select 
                    className="form-input"
                    value={formData.role} 
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                  >
                    <option value="user">User (Stock Entry Only)</option>
                    <option value="admin">Admin (Manage Stock & Reports)</option>
                    <option value="superadmin">Superadmin (Full Access)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.3rem' }}>Account Status</label>
                  <select 
                    className="form-input"
                    value={formData.status} 
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="active">Active (Can Login)</option>
                    <option value="inactive">Inactive (Locked)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setCreateModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1.25rem' }}>
              Edit Account: <span style={{ color: '#2563eb' }}>{editModal.username}</span>
            </h3>
            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.3rem' }}>Full Name</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  value={editModal.fullName} 
                  onChange={e => setEditModal({ ...editModal, fullName: e.target.value })} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.3rem' }}>Assigned Role</label>
                <select 
                  className="form-input"
                  value={editModal.role} 
                  onChange={e => setEditModal({ ...editModal, role: e.target.value })}
                >
                  <option value="user">User (Stock Entry Only)</option>
                  <option value="admin">Admin (Manage Stock & Reports)</option>
                  <option value="superadmin">Superadmin (Full Access)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.3rem' }}>Account Status</label>
                <select 
                  className="form-input"
                  value={editModal.status} 
                  onChange={e => setEditModal({ ...editModal, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive (Deactivated)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setEditModal(null)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
              Reset User Password
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.25rem' }}>
              Setting a new password for account: <strong>{resetModal.username} ({resetModal.fullName})</strong>
            </p>
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.3rem' }}>New Temporary or Permanent Password</label>
                <input 
                  type="password" 
                  required 
                  minLength="4"
                  className="form-input" 
                  placeholder="Min 4 characters"
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setResetModal(null)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE / INACTIVATE MODAL */}
      {deleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#b91c1c' }}>
              <AlertTriangle size={24} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Confirm Account Removal</h3>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Are you sure you want to delete or deactivate account <strong>{deleteModal.username}</strong> ({deleteModal.fullName})?
              <br/><br/>
              <span style={{ fontSize: '0.825rem', color: '#64748b' }}>
                Note: If this user has recorded stock entry transactions in the past, their account will be marked <strong>Inactive</strong> to preserve legal inventory audit integrity while blocking future logins.
              </span>
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={() => setDeleteModal(null)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={handleDelete} className="btn-danger" style={{ padding: '0.65rem 1.25rem' }}>
                Confirm Deactivate / Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
