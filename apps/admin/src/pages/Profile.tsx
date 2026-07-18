import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setUser, showToast } from '@raj-enterprises/shared-redux';
import { api } from '../../../web/src/utils/api';
import type { RootState } from '../store';

function Profile() {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [uploading, setUploading] = useState(false);

  if (!user) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await api.users.uploadProfileImage(file);
      dispatch(setUser({ ...user, profile_image_url: res.profile_image_url }));
      dispatch(showToast({ message: 'Profile picture updated successfully!', type: 'success' }));
    } catch (err: any) {
      dispatch(showToast({ message: err.detail || 'Failed to upload image.', type: 'error' }));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ padding: 'var(--space-6)', maxWidth: '600px', margin: '0 auto' }}>
      <h1 className="page-title text-gradient" style={{ marginBottom: 'var(--space-6)' }}>Your Profile</h1>
      
      <div className="card card-glass flex flex-col gap-6" style={{ padding: 'var(--space-8)' }}>
        {/* Profile Picture Section */}
        <div className="flex flex-col items-center gap-4" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-6)' }}>
          <div style={{ position: 'relative', width: '120px', height: '120px' }}>
            <img
              src={user.profile_image_url || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'}
              alt="Admin Profile"
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--border-subtle)' }}
            />
            {uploading && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 'var(--text-xs)' }}>
                Uploading...
              </div>
            )}
          </div>
          
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
            📷 {uploading ? 'Uploading...' : 'Change Profile Picture'}
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} disabled={uploading} />
          </label>
        </div>

        {/* Read-Only Details */}
        <div className="flex flex-col gap-4">
          <div className="input-group">
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Full Name</label>
            <input type="text" className="input" value={user.name} disabled style={{ background: 'var(--bg-secondary)', cursor: 'not-allowed' }} />
          </div>
          
          <div className="input-group">
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Email Address</label>
            <input type="email" className="input" value={user.email || 'N/A'} disabled style={{ background: 'var(--bg-secondary)', cursor: 'not-allowed' }} />
          </div>

          <div className="input-group">
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Mobile Phone</label>
            <input type="text" className="input" value={user.mobile || 'N/A'} disabled style={{ background: 'var(--bg-secondary)', cursor: 'not-allowed' }} />
          </div>

          <div className="input-group">
            <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>System Role</label>
            <input
              type="text"
              className="input"
              value={user.role.toUpperCase().replace('_', ' ')}
              disabled
              style={{ background: 'var(--bg-secondary)', cursor: 'not-allowed', textTransform: 'uppercase', fontWeight: 600, color: 'var(--text-accent)' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
