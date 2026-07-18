import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setUser, showToast } from '@raj-enterprises/shared-redux';
import { api } from '../utils/api';
import type { RootState } from '../store/store';
import type { Address } from '@raj-enterprises/shared-types';
import './ProfilePage.css';

export function ProfilePage() {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  // Profile Form State
  const [name, setName] = useState(user?.name || '');
  const [shopName, setShopName] = useState(user?.shop_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [mobile, setMobile] = useState(user?.mobile || '');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Address Form State
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressIndex, setEditingAddressIndex] = useState<number | null>(null);
  const [addressLabel, setAddressLabel] = useState('Home');
  const [addrFullName, setAddrFullName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrLine1, setAddrLine1] = useState('');
  const [addrLine2, setAddrLine2] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrState, setAddrState] = useState('');
  const [addrPincode, setAddrPincode] = useState('');
  const [addrLandmark, setAddrLandmark] = useState('');
  const [addrIsDefault, setAddrIsDefault] = useState(false);
  const [submittingAddress, setSubmittingAddress] = useState(false);

  if (!user) return null;

  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const res = await api.users.uploadProfileImage(file);
      dispatch(setUser({ ...user, profile_image_url: res.profile_image_url }));
      dispatch(showToast({ message: 'Profile picture updated!', type: 'success' }));
    } catch (err: any) {
      dispatch(showToast({ message: err.detail || 'Failed to upload image.', type: 'error' }));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      const updatedUser = await api.users.updateProfile({
        name,
        shop_name: shopName || undefined,
        email: email || undefined,
        mobile: mobile || undefined,
      });
      dispatch(setUser(updatedUser));
      dispatch(showToast({ message: 'Profile updated successfully!', type: 'success' }));
    } catch (err: any) {
      dispatch(showToast({ message: err.detail || 'Failed to update profile.', type: 'error' }));
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleOpenAddAddress = () => {
    setEditingAddressIndex(null);
    setAddressLabel('Home');
    setAddrFullName(user.name);
    setAddrPhone(user.mobile || '');
    setAddrLine1('');
    setAddrLine2('');
    setAddrCity('');
    setAddrState('');
    setAddrPincode('');
    setAddrLandmark('');
    setAddrIsDefault(user.addresses.length === 0);
    setShowAddressForm(true);
  };

  const handleOpenEditAddress = (addr: Address, index: number) => {
    setEditingAddressIndex(index);
    setAddressLabel(addr.label);
    setAddrFullName(addr.full_name);
    setAddrPhone(addr.phone);
    setAddrLine1(addr.address_line_1);
    setAddrLine2(addr.address_line_2 || '');
    setAddrCity(addr.city);
    setAddrState(addr.state);
    setAddrPincode(addr.pincode);
    setAddrLandmark(addr.landmark || '');
    setAddrIsDefault(addr.is_default);
    setShowAddressForm(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAddress(true);
    const addressData = {
      label: addressLabel,
      full_name: addrFullName,
      phone: addrPhone,
      address_line_1: addrLine1,
      address_line_2: addrLine2 || undefined,
      city: addrCity,
      state: addrState,
      pincode: addrPincode,
      landmark: addrLandmark || undefined,
      is_default: addrIsDefault,
    };

    try {
      if (editingAddressIndex !== null) {
        await api.users.updateAddress(editingAddressIndex, addressData);
        dispatch(showToast({ message: 'Address updated successfully!', type: 'success' }));
      } else {
        await api.users.addAddress(addressData);
        dispatch(showToast({ message: 'Address added successfully!', type: 'success' }));
      }

      // Refresh profile to pull fresh addresses list
      const freshUser = await api.auth.getMe();
      dispatch(setUser(freshUser));
      setShowAddressForm(false);
    } catch (err: any) {
      dispatch(showToast({ message: err.detail || 'Failed to save address.', type: 'error' }));
    } finally {
      setSubmittingAddress(false);
    }
  };

  const handleDeleteAddress = async (index: number) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    try {
      await api.users.deleteAddress(index);
      dispatch(showToast({ message: 'Address deleted successfully!', type: 'success' }));
      
      const freshUser = await api.auth.getMe();
      dispatch(setUser(freshUser));
    } catch (err: any) {
      dispatch(showToast({ message: err.detail || 'Failed to delete address.', type: 'error' }));
    }
  };

  return (
    <div className="container profile-page" id="profile-page">
      <h1 className="page-title text-gradient">Your Profile</h1>

      <div className="profile-grid">
        {/* Profile Card */}
        <div className="card profile-info-card">
          <h2>Account Information</h2>
          <div className="flex flex-col items-center gap-4" style={{ marginBottom: 'var(--space-6)', marginTop: 'var(--space-4)' }}>
            <div className="profile-pic-container" style={{ position: 'relative', width: '100px', height: '100px' }}>
              <img
                src={user.profile_image_url || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'}
                alt="Profile"
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-subtle)' }}
              />
              {uploadingImage && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 'var(--text-xs)' }}>
                  Loading...
                </div>
              )}
            </div>
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
              📷 {uploadingImage ? 'Uploading...' : 'Change Picture'}
              <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} disabled={uploadingImage} />
            </label>
          </div>
          <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4">
            <div className="input-group">
              <label htmlFor="p-name">Full Name</label>
              <input
                type="text"
                id="p-name"
                className="input"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label htmlFor="p-shop">Shop Name (Optional)</label>
              <input
                type="text"
                id="p-shop"
                className="input"
                placeholder="Raj Paints Store"
                value={shopName}
                onChange={e => setShopName(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label htmlFor="p-email">Email Address</label>
              <input
                type="email"
                id="p-email"
                className="input"
                placeholder="customer@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label htmlFor="p-mobile">Mobile Phone Number</label>
              <input
                type="tel"
                id="p-mobile"
                className="input"
                placeholder="+919999999999"
                value={mobile}
                onChange={e => setMobile(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={updatingProfile} style={{ marginTop: 'var(--space-2)' }}>
              {updatingProfile ? 'Saving Changes...' : 'Save Profile Details'}
            </button>
          </form>
        </div>

        {/* Address Book Card */}
        <div className="card profile-addresses-card">
          <div className="addresses-header flex justify-between items-center">
            <h2>Address Book</h2>
            {!showAddressForm && (
              <button className="btn btn-secondary btn-sm" onClick={handleOpenAddAddress}>
                + Add Address
              </button>
            )}
          </div>

          {showAddressForm ? (
            <form onSubmit={handleSaveAddress} className="address-form flex flex-col gap-4 animate-fade-in" style={{ marginTop: 'var(--space-6)' }}>
              <h3>{editingAddressIndex !== null ? 'Edit Address' : 'New Address'}</h3>
              
              <div className="grid address-form-grid" style={{ gap: 'var(--space-4)', gridTemplateColumns: '1fr 1fr' }}>
                <div className="input-group">
                  <label htmlFor="addr-label">Address Label</label>
                  <select
                    id="addr-label"
                    className="input"
                    value={addressLabel}
                    onChange={e => setAddressLabel(e.target.value)}
                    style={{ background: 'var(--bg-secondary)' }}
                  >
                    <option value="Home">Home</option>
                    <option value="Office">Office</option>
                    <option value="Shop">Shop</option>
                    <option value="Warehouse">Warehouse</option>
                  </select>
                </div>
                <div className="input-group">
                  <label htmlFor="addr-name">Recipient Name</label>
                  <input
                    type="text"
                    id="addr-name"
                    className="input"
                    value={addrFullName}
                    onChange={e => setAddrFullName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="addr-phone">Phone Number</label>
                <input
                  type="tel"
                  id="addr-phone"
                  className="input"
                  value={addrPhone}
                  onChange={e => setAddrPhone(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label htmlFor="addr-line1">Address Line 1</label>
                <input
                  type="text"
                  id="addr-line1"
                  className="input"
                  placeholder="Street address, P.O. box, company name"
                  value={addrLine1}
                  onChange={e => setAddrLine1(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label htmlFor="addr-line2">Address Line 2 (Optional)</label>
                <input
                  type="text"
                  id="addr-line2"
                  className="input"
                  placeholder="Apartment, suite, unit, building, floor"
                  value={addrLine2}
                  onChange={e => setAddrLine2(e.target.value)}
                />
              </div>

              <div className="grid address-form-grid-3" style={{ gap: 'var(--space-4)', gridTemplateColumns: '1fr 1fr 1fr' }}>
                <div className="input-group">
                  <label htmlFor="addr-city">City</label>
                  <input
                    type="text"
                    id="addr-city"
                    className="input"
                    value={addrCity}
                    onChange={e => setAddrCity(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="addr-state">State</label>
                  <input
                    type="text"
                    id="addr-state"
                    className="input"
                    value={addrState}
                    onChange={e => setAddrState(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="addr-pin">Pincode</label>
                  <input
                    type="text"
                    id="addr-pin"
                    className="input"
                    value={addrPincode}
                    onChange={e => setAddrPincode(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="addr-landmark">Landmark (Optional)</label>
                <input
                  type="text"
                  id="addr-landmark"
                  className="input"
                  value={addrLandmark}
                  onChange={e => setAddrLandmark(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2" style={{ marginTop: 'var(--space-2)' }}>
                <input
                  type="checkbox"
                  id="addr-default"
                  checked={addrIsDefault}
                  onChange={e => setAddrIsDefault(e.target.checked)}
                  disabled={user.addresses.length === 0 || (editingAddressIndex !== null && addrIsDefault)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }}
                />
                <label htmlFor="addr-default" style={{ fontSize: 'var(--text-sm)', userSelect: 'none' }}>
                  Set as default shipping address
                </label>
              </div>

              <div className="flex gap-4" style={{ marginTop: 'var(--space-4)' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={submittingAddress}>
                  {submittingAddress ? 'Saving...' : 'Save Address'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddressForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="addresses-list" style={{ marginTop: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {user.addresses.length === 0 ? (
                <p className="text-secondary" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                  No saved addresses. Add a shipping address to facilitate checkout.
                </p>
              ) : (
                user.addresses.map((addr, index) => (
                  <div key={index} className="address-item flex justify-between items-start card-glass" style={{ padding: 'var(--space-4)' }}>
                    <div className="address-item-details">
                      <div className="flex items-center gap-2">
                        <span className="badge badge-primary" style={{ fontSize: '10px' }}>{addr.label}</span>
                        {addr.is_default && <span className="badge badge-success" style={{ fontSize: '10px' }}>Default</span>}
                      </div>
                      <p className="addr-recipient" style={{ fontWeight: 600, marginTop: 'var(--space-2)' }}>{addr.full_name}</p>
                      <p className="addr-lines text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
                        {addr.address_line_1}
                        {addr.address_line_2 ? `, ${addr.address_line_2}` : ''}
                      </p>
                      <p className="addr-location text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
                        {addr.city}, {addr.state} - {addr.pincode}
                      </p>
                      {addr.landmark && <p className="addr-landmark text-tertiary" style={{ fontSize: 'var(--text-xs)' }}>Landmark: {addr.landmark}</p>}
                      <p className="addr-phone text-secondary" style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>📞 {addr.phone}</p>
                    </div>
                    <div className="address-item-actions flex gap-2">
                      <button className="btn btn-secondary btn-icon btn-sm" onClick={() => handleOpenEditAddress(addr, index)} title="Edit">
                        ✏️
                      </button>
                      <button className="btn btn-secondary btn-icon btn-sm" onClick={() => handleDeleteAddress(index)} title="Delete">
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default ProfilePage;
