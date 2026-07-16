import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createApiClient } from '@raj-enterprises/api-client';
import { auth } from '../../../../apps/web/src/firebase';
import { showToast } from '@raj-enterprises/shared-redux';
import type { RootState } from '../store';
import './UserManagement.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const api = createApiClient({
  baseURL: API_BASE_URL,
  getAuthToken: async () => {
    const user = auth.currentUser;
    return user ? user.getIdToken(true) : localStorage.getItem('dev_mock_token');
  },
});

interface CustomerUser {
  id: string;
  name: string;
  mobile?: string;
  email?: string;
  shop_name?: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_active_at?: string;
}

interface AdminUser {
  id: string;
  name: string;
  mobile?: string;
  email?: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface UserOrder {
  id: string;
  order_number: string;
  amount_total: number;
  amount_received: number;
  amount_due: number;
  order_status: string;
  payment_status: string;
  created_at: string;
}

export function UserManagement() {
  const dispatch = useDispatch();
  const currentAdmin = useSelector((state: RootState) => state.auth.user);

  // Tabs: 'customers' | 'admins'
  const [tab, setTab] = useState<'customers' | 'admins'>('customers');

  // Customer List State
  const [customers, setCustomers] = useState<CustomerUser[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Admin List State
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  // Create Admin Form
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [adminUid, setAdminUid] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminMobile, setAdminMobile] = useState('');
  const [submittingAdmin, setSubmittingAdmin] = useState(false);

  // User detail overlay (drawer)
  const [selectedUser, setSelectedUser] = useState<CustomerUser | AdminUser | null>(null);
  const [userOrders, setUserOrders] = useState<UserOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDateRange, setExportDateRange] = useState('all');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportColumns, setExportColumns] = useState<string[]>([
    'id', 'name', 'mobile', 'email', 'shop_name', 'role', 'status', 'created_at'
  ]);

  const handleExportExcel = async () => {
    try {
      let dataToExport: any[] = [];
      if (tab === 'customers') {
        const res = await api.admin.listCustomers({ page: 1, page_size: 1000, search: search || undefined });
        dataToExport = res.users;
      } else {
        dataToExport = admins;
      }

      const now = new Date();
      dataToExport = dataToExport.filter((u: any) => {
        if (!u.created_at) return true;
        const createdDate = new Date(u.created_at);
        if (exportDateRange === 'week') {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(now.getDate() - 7);
          return createdDate >= oneWeekAgo;
        } else if (exportDateRange === 'month') {
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(now.getMonth() - 1);
          return createdDate >= oneMonthAgo;
        } else if (exportDateRange === 'year') {
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(now.getFullYear() - 1);
          return createdDate >= oneYearAgo;
        } else if (exportDateRange === 'custom') {
          const start = exportStartDate ? new Date(exportStartDate) : null;
          const end = exportEndDate ? new Date(exportEndDate) : null;
          if (start && createdDate < start) return false;
          if (end && createdDate > end) return false;
        }
        return true;
      });

      if (dataToExport.length === 0) {
        dispatch(showToast({ message: 'No records found for the selected date range.', type: 'warning' }));
        return;
      }

      const headersMap: Record<string, string> = {
        id: 'User ID',
        name: 'Name',
        mobile: 'Mobile',
        email: 'Email',
        shop_name: 'Shop Name',
        role: 'Role',
        status: 'Status',
        created_at: 'Joined Date',
      };

      const selectedHeaders = exportColumns.map(col => headersMap[col]);
      const rows = dataToExport.map((u: any) => {
        return exportColumns.map(col => {
          if (col === 'status') return u.is_active ? 'Active' : 'Inactive';
          if (col === 'created_at') return new Date(u.created_at).toLocaleDateString();
          return u[col] || '';
        });
      });

      const csvContent = "\uFEFF" + [
        selectedHeaders.join(","),
        ...rows.map((row: string[]) => row.map((val: string) => {
          const cell = val === null || val === undefined ? '' : String(val);
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n') || cell.includes('\r')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        }).join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const filename = `${tab === 'customers' ? 'customers' : 'admins'}_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      dispatch(showToast({ message: 'Export completed successfully!', type: 'success' }));
      setShowExportModal(false);
    } catch (err: any) {
      dispatch(showToast({ message: err.message || 'Failed to export data.', type: 'error' }));
    }
  };

  // Fetch Customers
  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const res = await api.admin.listCustomers({
        page,
        page_size: 10,
        search: search || undefined,
      });
      setCustomers(res.users);
      setTotalCustomers(res.total);
    } catch (err: any) {
      dispatch(showToast({ message: err.detail || 'Failed to load customers', type: 'error' }));
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Fetch Admins
  const fetchAdmins = async () => {
    setLoadingAdmins(true);
    try {
      const res = await api.admin.listAdmins();
      setAdmins(res.admins);
    } catch (err: any) {
      dispatch(showToast({ message: err.detail || 'Failed to load admins', type: 'error' }));
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    if (tab === 'customers') {
      fetchCustomers();
    } else {
      fetchAdmins();
    }
  }, [tab, page, search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  // Toggle user status (Activate/Deactivate)
  const toggleUserStatus = async (user: CustomerUser | AdminUser) => {
    const action = user.is_active ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} user ${user.name}?`)) return;

    try {
      if (user.is_active) {
        await api.admin.deactivateUser(user.id);
        dispatch(showToast({ message: 'User deactivated successfully (soft deleted)', type: 'success' }));
      } else {
        await api.admin.activateUser(user.id);
        dispatch(showToast({ message: 'User reactivated successfully', type: 'success' }));
      }
      
      // Refresh list
      if (tab === 'customers') {
        fetchCustomers();
      } else {
        fetchAdmins();
      }

      if (selectedUser && selectedUser.id === user.id) {
        setSelectedUser({ ...selectedUser, is_active: !user.is_active });
      }
    } catch (err: any) {
      dispatch(showToast({ message: err.detail || `Failed to ${action} user`, type: 'error' }));
    }
  };

  // Create Admin Form handler
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAdmin(true);
    try {
      await api.admin.createAdmin({
        firebase_uid: adminUid,
        name: adminName,
        email: adminEmail || undefined,
        mobile: adminMobile || undefined,
      });
      dispatch(showToast({ message: 'Admin account added successfully!', type: 'success' }));
      setAdminUid('');
      setAdminName('');
      setAdminEmail('');
      setAdminMobile('');
      setShowAddAdmin(false);
      fetchAdmins();
    } catch (err: any) {
      dispatch(showToast({ message: err.detail || 'Failed to create admin account.', type: 'error' }));
    } finally {
      setSubmittingAdmin(false);
    }
  };

  // Drill down user orders
  const handleViewDetails = async (user: CustomerUser | AdminUser) => {
    setSelectedUser(user);
    setLoadingOrders(true);
    try {
      const res = await api.admin.getUserOrders(user.id, { page: 1, page_size: 50 });
      setUserOrders(res.orders);
    } catch (err: any) {
      dispatch(showToast({ message: err.detail || 'Failed to load user orders', type: 'error' }));
    } finally {
      setLoadingOrders(false);
    }
  };

  return (
    <div className="user-management-page container animate-fade-in" id="admin-user-management">
      <div className="flex justify-between items-center header-section">
        <h1 className="text-gradient">User Management</h1>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => setShowExportModal(true)}>
            📥 Export Excel
          </button>
          {tab === 'admins' && currentAdmin?.role === 'super_admin' && (
            <button className="btn btn-primary" onClick={() => setShowAddAdmin(!showAddAdmin)}>
              {showAddAdmin ? 'Cancel' : '+ Add Admin'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex tab-container" style={{ margin: 'var(--space-6) 0' }}>
        <button className={`tab-btn ${tab === 'customers' ? 'active' : ''}`} onClick={() => { setTab('customers'); setPage(1); }}>
          Customers
        </button>
        <button className={`tab-btn ${tab === 'admins' ? 'active' : ''}`} onClick={() => setTab('admins')}>
          Admins ({admins.length})
        </button>
      </div>

      {/* Add Admin Form Block */}
      {showAddAdmin && tab === 'admins' && (
        <div className="card add-admin-card animate-fade-in" style={{ marginBottom: 'var(--space-6)' }}>
          <h2>Add New Admin User</h2>
          <p className="text-secondary" style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--space-4)' }}>
            Note: Maximum 5 admin accounts allowed. Only Super Admins can register new admins.
          </p>
          <form onSubmit={handleCreateAdmin} className="grid form-grid flex flex-col gap-4">
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="input-group">
                <label htmlFor="ad-uid">Firebase UID</label>
                <input
                  type="text"
                  id="ad-uid"
                  className="input"
                  placeholder="Paste Firebase authentication UID"
                  value={adminUid}
                  onChange={e => setAdminUid(e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <label htmlFor="ad-name">Admin Name</label>
                <input
                  type="text"
                  id="ad-name"
                  className="input"
                  placeholder="John Doe"
                  value={adminName}
                  onChange={e => setAdminName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div className="input-group">
                <label htmlFor="ad-email">Email (Optional)</label>
                <input
                  type="email"
                  id="ad-email"
                  className="input"
                  placeholder="admin@example.com"
                  value={adminEmail}
                  onChange={e => setAdminEmail(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label htmlFor="ad-phone">Phone Number (Optional)</label>
                <input
                  type="tel"
                  id="ad-phone"
                  className="input"
                  placeholder="+919999999999"
                  value={adminMobile}
                  onChange={e => setAdminMobile(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={submittingAdmin} style={{ alignSelf: 'flex-start' }}>
              {submittingAdmin ? 'Adding Admin...' : 'Create Admin Profile'}
            </button>
          </form>
        </div>
      )}

      {/* Tab Contents */}
      {tab === 'customers' ? (
        <div className="customers-list-section">
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex gap-4 search-form" style={{ marginBottom: 'var(--space-6)' }}>
            <input
              type="text"
              className="input"
              placeholder="Search by name, mobile, email or shop name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-secondary">Search</button>
          </form>

          {/* Table */}
          <div className="card table-card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Shop Name</th>
                  <th>Contact Details</th>
                  <th>Registered</th>
                  <th>Last Active</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingCustomers ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>Loading customers list...</td></tr>
                ) : customers.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>No customers found.</td></tr>
                ) : (
                  customers.map(c => (
                    <tr key={c.id}>
                      <td className="clickable-name" onClick={() => handleViewDetails(c)}>
                        <strong>{c.name}</strong>
                      </td>
                      <td className="text-secondary">{c.shop_name || '—'}</td>
                      <td>
                        <div style={{ fontSize: 'var(--text-xs)' }}>
                          {c.email && <div>📧 {c.email}</div>}
                          {c.mobile && <div>📞 {c.mobile}</div>}
                        </div>
                      </td>
                      <td className="text-secondary">{new Date(c.created_at).toLocaleDateString()}</td>
                      <td className="text-secondary">{c.last_active_at ? new Date(c.last_active_at).toLocaleDateString() : '—'}</td>
                      <td>
                        <span className={`badge ${c.is_active ? 'badge-success' : 'badge-danger'}`}>
                          {c.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-secondary btn-sm" onClick={() => handleViewDetails(c)}>View History</button>
                          <button
                            className={`btn ${c.is_active ? 'btn-danger' : 'btn-primary'} btn-sm`}
                            onClick={() => toggleUserStatus(c)}
                          >
                            {c.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center pagination-row" style={{ marginTop: 'var(--space-6)' }}>
            <span className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
              Showing {customers.length} of {totalCustomers} customers
            </span>
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                Previous
              </button>
              <button className="btn btn-secondary btn-sm" disabled={page * 10 >= totalCustomers} onClick={() => setPage(page + 1)}>
                Next
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="admins-list-section card" style={{ padding: 0 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Admin Name</th>
                <th>Contact Details</th>
                <th>Role</th>
                <th>Joined Date</th>
                <th>Status</th>
                {currentAdmin?.role === 'super_admin' && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loadingAdmins ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>Loading admins list...</td></tr>
              ) : (
                admins.map(a => (
                  <tr key={a.id}>
                    <td><strong>{a.name}</strong></td>
                    <td>
                      <div style={{ fontSize: 'var(--text-xs)' }}>
                        {a.email && <div>📧 {a.email}</div>}
                        {a.mobile && <div>📞 {a.mobile}</div>}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${a.role === 'super_admin' ? 'badge-primary' : 'badge-info'}`}>
                        {a.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="text-secondary">{new Date(a.created_at).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${a.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {a.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    {currentAdmin?.role === 'super_admin' && (
                      <td>
                        {a.role !== 'super_admin' && (
                          <button
                            className={`btn ${a.is_active ? 'btn-danger' : 'btn-primary'} btn-sm`}
                            onClick={() => toggleUserStatus(a)}
                          >
                            {a.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* User Details Drawer Overlay */}
      {selectedUser && (
        <div className="drawer-overlay" onClick={() => setSelectedUser(null)}>
          <div className="drawer-content card animate-slide-in" onClick={e => e.stopPropagation()}>
            <button className="drawer-close" onClick={() => setSelectedUser(null)}>&times;</button>
            
            <div className="drawer-header">
              <h2>User Details</h2>
              <span className={`badge ${selectedUser.is_active ? 'badge-success' : 'badge-danger'}`} style={{ marginTop: 'var(--space-2)' }}>
                {selectedUser.is_active ? 'Active Account' : 'Deactivated Account'}
              </span>
            </div>

            <div className="drawer-body flex flex-col gap-6" style={{ marginTop: 'var(--space-6)' }}>
              {/* Profile details */}
              <div className="drawer-section">
                <h3>General Profile</h3>
                <div className="details-list grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
                  <div>
                    <label>Name</label>
                    <p>{selectedUser.name}</p>
                  </div>
                  <div>
                    <label>Role</label>
                    <p style={{ textTransform: 'capitalize' }}>{selectedUser.role.replace('_', ' ')}</p>
                  </div>
                  {selectedUser.email && (
                    <div>
                      <label>Email</label>
                      <p>{selectedUser.email}</p>
                    </div>
                  )}
                  {selectedUser.mobile && (
                    <div>
                      <label>Mobile</label>
                      <p>{selectedUser.mobile}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Order History */}
              <div className="drawer-section">
                <h3>Order History ({userOrders.length})</h3>
                <div className="orders-summary-list flex flex-col gap-3" style={{ marginTop: 'var(--space-2)' }}>
                  {loadingOrders ? (
                    <p className="text-secondary">Loading history...</p>
                  ) : userOrders.length === 0 ? (
                    <p className="text-secondary">No previous orders placed by this user.</p>
                  ) : (
                    userOrders.map(order => (
                      <div key={order.id} className="order-summary-item flex justify-between items-center card-glass" style={{ padding: 'var(--space-3)' }}>
                        <div>
                          <p style={{ fontWeight: 600 }}>{order.order_number}</p>
                          <p className="text-tertiary" style={{ fontSize: 'var(--text-xs)' }}>
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontWeight: 600 }}>₹{order.amount_total.toFixed(2)}</p>
                          <span className={`badge ${order.order_status === 'delivered' ? 'badge-success' : order.order_status === 'cancelled' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '9px', padding: '1px 6px' }}>
                            {order.order_status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Excel Modal */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal-content card animate-scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', width: '100%' }}>
            <button className="modal-close" onClick={() => setShowExportModal(false)}>&times;</button>
            <h2>Export to Excel (CSV)</h2>
            <p className="text-secondary" style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--space-4)' }}>
              Configure columns and date filters to generate your spreadsheet.
            </p>

            <div className="flex flex-col gap-5">
              {/* Date Filter Group */}
              <div className="input-group">
                <label>Date Filter Range</label>
                <select
                  className="input"
                  value={exportDateRange}
                  onChange={e => setExportDateRange(e.target.value)}
                  style={{ background: 'var(--bg-secondary)' }}
                >
                  <option value="all">All Time</option>
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                  <option value="year">Last Year</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>

              {exportDateRange === 'custom' && (
                <div className="grid animate-fade-in" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  <div className="input-group">
                    <label>Start Date</label>
                    <input
                      type="date"
                      className="input"
                      value={exportStartDate}
                      onChange={e => setExportStartDate(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label>End Date</label>
                    <input
                      type="date"
                      className="input"
                      value={exportEndDate}
                      onChange={e => setExportEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Columns Selector Checklist */}
              <div className="input-group">
                <label>Select Columns to Include</label>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                  {[
                    { id: 'id', label: 'User ID' },
                    { id: 'name', label: 'Name' },
                    { id: 'mobile', label: 'Mobile' },
                    { id: 'email', label: 'Email' },
                    { id: 'shop_name', label: 'Shop Name' },
                    { id: 'role', label: 'Role' },
                    { id: 'status', label: 'Status' },
                    { id: 'created_at', label: 'Joined Date' },
                  ].map(col => (
                    <label key={col.id} className="flex items-center gap-2" style={{ fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={exportColumns.includes(col.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setExportColumns([...exportColumns, col.id]);
                          } else {
                            setExportColumns(exportColumns.filter(c => c !== col.id));
                          }
                        }}
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4" style={{ marginTop: 'var(--space-4)' }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleExportExcel} disabled={exportColumns.length === 0}>
                  📥 Download Report
                </button>
                <button className="btn btn-secondary" onClick={() => setShowExportModal(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default UserManagement;
