import { useState, useEffect } from 'react';
import api from '../services/api';

function Dashboard({ user, onLogout }) {
    const [tickets, setTickets] = useState([]);
    const [myTickets, setMyTickets] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [newTicket, setNewTicket] = useState({
        title: '', description: '', category: 'Hardware', priority: 'Medium'
    });
    const [alert, setAlert] = useState({ message: '', type: '' });
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignTicketId, setAssignTicketId] = useState(null);
    const [showCreateUserModal, setShowCreateUserModal] = useState(false);
    const [newUser, setNewUser] = useState({
        username: '', password: '', email: '', fullName: '', role: 'EMPLOYEE'
    });
    const [userError, setUserError] = useState('');
    const [showEditUserModal, setShowEditUserModal] = useState(false);
    const [editUser, setEditUser] = useState({
        id: null, username: '', password: '', email: '', fullName: '', role: ''
    });

    // Force delete modal state
    const [showForceDeleteModal, setShowForceDeleteModal] = useState(false);
    const [deleteUserId, setDeleteUserId] = useState(null);
    const [deleteUserName, setDeleteUserName] = useState('');
    const [activeTicketCount, setActiveTicketCount] = useState(0);

    // Ticket detail modal
    const [showTicketDetail, setShowTicketDetail] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);

    useEffect(() => { fetchData(); }, []);

    const showAlert = (message, type) => {
        setAlert({ message, type });
        setTimeout(() => setAlert({ message: '', type: '' }), 4000);
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            if (user.role === 'ADMIN') {
                const ticketsRes = await api.get('/tickets');
                setTickets(ticketsRes.data);
                const usersRes = await api.get('/users');
                setUsers(usersRes.data);
            } else if (user.role === 'EMPLOYEE') {
                const myRes = await api.get(`/tickets/my?userId=${user.id}`);
                setMyTickets(myRes.data);
            } else if (user.role === 'ENGINEER') {
                const assignedRes = await api.get(`/tickets/assigned?engineerId=${user.id}`);
                setMyTickets(assignedRes.data);
            }
        } catch (err) { console.error('Failed to fetch data:', err); }
        finally { setLoading(false); }
    };

    const handleCreateTicket = async (e) => {
        e.preventDefault();
        try {
            await api.post('/tickets', { ...newTicket, userId: user.id });
            showAlert('✅ Ticket created successfully!', 'success');
            setNewTicket({ title: '', description: '', category: 'Hardware', priority: 'Medium' });
            fetchData();
            setActiveTab('my-tickets');
        } catch (err) { showAlert('❌ ' + (err.response?.data || 'Failed to create ticket'), 'error'); }
    };

    const handleUpdateStatus = async (ticketId, status) => {
        try {
            await api.put(`/tickets/${ticketId}/status`, { status });
            fetchData();
            showAlert(`✅ Status updated to ${status}`, 'success');
        } catch (err) { showAlert('❌ Failed to update status', 'error'); }
    };

    const handleAssignTicket = async (ticketId, engineerId) => {
        try {
            await api.put(`/tickets/${ticketId}/assign`, { engineerId });
            fetchData();
            showAlert('✅ Ticket assigned successfully!', 'success');
            setShowAssignModal(false);
        } catch (err) { showAlert('❌ Failed to assign ticket', 'error'); }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setUserError('');
        try {
            await api.post('/users/register', newUser);
            showAlert('✅ User created successfully!', 'success');
            setNewUser({ username: '', password: '', email: '', fullName: '', role: 'EMPLOYEE' });
            setShowCreateUserModal(false);
            fetchData();
        } catch (err) { setUserError(err.response?.data || 'Failed to create user'); }
    };

    const handleEditUser = async (e) => {
        e.preventDefault();
        setUserError('');
        try {
            const updateData = { fullName: editUser.fullName, email: editUser.email, role: editUser.role };
            if (editUser.password && editUser.password.trim() !== '') {
                updateData.password = editUser.password;
            }
            await api.put(`/users/${editUser.id}`, updateData);
            showAlert('✅ User updated successfully!', 'success');
            setShowEditUserModal(false);
            fetchData();
        } catch (err) { setUserError(err.response?.data || 'Failed to update user'); }
    };

    const openEditModal = (u) => {
        setEditUser({ id: u.id, username: u.username, password: '', email: u.email, fullName: u.fullName, role: u.role });
        setUserError('');
        setShowEditUserModal(true);
    };

    // ===== FORCE DELETE LOGIC =====
    const handleDeleteClick = async (userId, userName, userRole) => {
        // BLOCK: Admin users cannot be deleted
        if (userRole === 'ADMIN') {
            showAlert('❌ Admin users cannot be deleted.', 'error');
            return;
        }

        setDeleteUserId(userId);
        setDeleteUserName(userName);
        setUserError('');

        try {
            const res = await api.get(`/users/${userId}/active-tickets`);
            const count = res.data.count;
            setActiveTicketCount(count);

            if (count > 0) {
                setShowForceDeleteModal(true);
            } else {
                if (window.confirm(`Are you sure you want to delete ${userName}?`)) {
                    await api.delete(`/users/${userId}`);
                    showAlert(`✅ ${userName} deleted successfully!`, 'success');
                    fetchData();
                }
            }
        } catch (err) {
            showAlert('❌ ' + (err.response?.data || 'Failed to check user tickets'), 'error');
        }
    };

    const handleForceDelete = async () => {
        try {
            await api.delete(`/users/${deleteUserId}?force=true`);
            showAlert(`✅ ${deleteUserName} deleted! ${activeTicketCount} ticket(s) reassigned to admin.`, 'success');
            setShowForceDeleteModal(false);
            setDeleteUserId(null);
            setActiveTicketCount(0);
            fetchData();
        } catch (err) {
            setUserError(err.response?.data || 'Failed to delete user');
        }
    };

    // ===== TICKET DETAIL (NO COMMENTS) =====
    const openTicketDetail = (ticket) => {
        setSelectedTicket(ticket);
        setShowTicketDetail(true);
    };

    const getStatusClass = (status) => {
        const map = { 'OPEN': 'status-open', 'ASSIGNED': 'status-assigned', 'IN_PROGRESS': 'status-progress', 'RESOLVED': 'status-resolved', 'CLOSED': 'status-closed', 'REOPENED': 'status-reopened' };
        return map[status] || 'status-open';
    };

    const getPriorityClass = (priority) => {
        const map = { 'Low': 'priority-low', 'Medium': 'priority-medium', 'High': 'priority-high', 'Critical': 'priority-critical' };
        return map[priority] || 'priority-medium';
    };

    const stats = {
        total: tickets.length, open: tickets.filter(t => t.status === 'OPEN').length,
        assigned: tickets.filter(t => t.status === 'ASSIGNED').length,
        inProgress: tickets.filter(t => t.status === 'IN_PROGRESS').length,
        resolved: tickets.filter(t => t.status === 'RESOLVED').length,
        closed: tickets.filter(t => t.status === 'CLOSED').length
    };

    const getNavItems = () => {
        const items = [{ key: 'dashboard', label: 'Dashboard' }];
        if (user.role === 'EMPLOYEE') { items.push({ key: 'new-ticket', label: 'Create Ticket' }, { key: 'my-tickets', label: 'My Tickets' }); }
        if (user.role === 'ENGINEER') { items.push({ key: 'assigned', label: 'My Work' }); }
        if (user.role === 'ADMIN') { items.push({ key: 'all-tickets', label: 'All Tickets' }, { key: 'users', label: 'Users' }); }
        return items;
    };

    const renderStats = () => {
        const statItems = [
            { label: 'Total Tickets', value: stats.total, color: 'stat-blue' },
            { label: 'Open', value: stats.open, color: 'stat-orange' },
            { label: 'Assigned', value: stats.assigned, color: 'stat-teal' },
            { label: 'In Progress', value: stats.inProgress, color: 'stat-purple' },
            { label: 'Resolved', value: stats.resolved, color: 'stat-green' },
            { label: 'Closed', value: stats.closed, color: 'stat-gray' }
        ];
        return (
            <div className="stats-row">
                {statItems.map((item, idx) => (
                    <div key={idx} className={`stat-pill ${item.color}`}>
                        <span className="stat-value">{item.value}</span>
                        <span className="stat-label">{item.label}</span>
                    </div>
                ))}
            </div>
        );
    };

    const renderTicketTable = (ticketList, showActions = false, isAdmin = false) => {
        const displayList = isAdmin ? tickets : ticketList;
        return (
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th className="col-ticket">Ticket ID</th>
                            <th className="col-title">Title</th>
                            <th className="col-category">Category</th>
                            <th className="col-priority">Priority</th>
                            <th className="col-status">Status</th>
                            <th className="col-created">Created By</th>
                            <th className="col-assigned">Assigned To</th>
                            <th className="col-date">Date</th>
                            {showActions && <th className="col-actions">Actions</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {displayList.length === 0 ? (
                            <tr><td colSpan={showActions ? 9 : 8} className="empty-row">No tickets found</td></tr>
                        ) : (
                            displayList.map(ticket => (
                                <tr key={ticket.id} onClick={() => openTicketDetail(ticket)} style={{cursor: 'pointer'}}>
                                    <td className="col-ticket"><span className="ticket-id-badge">{ticket.ticketId}</span></td>
                                    <td className="col-title"><div className="ticket-title">{ticket.title}</div><div className="ticket-desc">{ticket.description}</div></td>
                                    <td className="col-category">{ticket.category}</td>
                                    <td className="col-priority"><span className={`badge ${getPriorityClass(ticket.priority)}`}>{ticket.priority}</span></td>
                                    <td className="col-status"><span className={`badge ${getStatusClass(ticket.status)}`}>{ticket.status}</span></td>
                                    <td className="col-created"><div className="user-cell"><div className="user-avatar-small">{ticket.createdBy?.fullName?.charAt(0) || '?'}</div><span>{ticket.createdBy?.fullName || 'Unknown'}</span></div></td>
                                    <td className="col-assigned">{ticket.assignedTo ? (<div className="user-cell"><div className="user-avatar-small engineer">{ticket.assignedTo.fullName.charAt(0)}</div><span>{ticket.assignedTo.fullName}</span></div>) : (<span className="unassigned">Unassigned</span>)}</td>
                                    <td className="col-date">{new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                                    {showActions && (
                                        <td className="col-actions" onClick={(e) => e.stopPropagation()}>
                                            {isAdmin && ticket.status === 'OPEN' && (
                                                <button className="btn-sm btn-primary" onClick={() => { setAssignTicketId(ticket.id); setShowAssignModal(true); }}>Assign</button>
                                            )}
                                            {isAdmin && ticket.status === 'ASSIGNED' && (
                                                <button className="btn-sm btn-warning" onClick={() => { setAssignTicketId(ticket.id); setShowAssignModal(true); }}>Reassign</button>
                                            )}
                                            {isAdmin && (ticket.status === 'IN_PROGRESS' || ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' || ticket.status === 'REOPENED') && (
                                                <span className="action-text">{ticket.assignedTo ? `With ${ticket.assignedTo.fullName.split(' ')[0]}` : '—'}</span>
                                            )}
                                            {user.role === 'ENGINEER' && ticket.status === 'ASSIGNED' && (
                                                <button className="btn-sm btn-primary" onClick={() => handleUpdateStatus(ticket.id, 'IN_PROGRESS')}>Start</button>
                                            )}
                                            {user.role === 'ENGINEER' && ticket.status === 'IN_PROGRESS' && (
                                                <button className="btn-sm btn-success" onClick={() => handleUpdateStatus(ticket.id, 'RESOLVED')}>Resolve</button>
                                            )}
                                            {user.role === 'ENGINEER' && (ticket.status === 'OPEN' || ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' || ticket.status === 'REOPENED') && (
                                                <span className="action-text">
                                                    {ticket.status === 'OPEN' ? 'Waiting for assignment' : 
                                                     ticket.status === 'RESOLVED' ? 'Waiting for closure' : 
                                                     ticket.status === 'CLOSED' ? 'Completed' : 'Reopened'}
                                                </span>
                                            )}
                                            {user.role === 'EMPLOYEE' && ticket.status === 'RESOLVED' && (
                                                <div className="action-group">
                                                    <button className="btn-sm btn-success" onClick={() => handleUpdateStatus(ticket.id, 'CLOSED')}>Close</button>
                                                    <button className="btn-sm btn-warning" onClick={() => handleUpdateStatus(ticket.id, 'REOPENED')}>Reopen</button>
                                                </div>
                                            )}
                                            {user.role === 'EMPLOYEE' && (ticket.status === 'OPEN' || ticket.status === 'ASSIGNED' || ticket.status === 'IN_PROGRESS' || ticket.status === 'CLOSED' || ticket.status === 'REOPENED') && (
                                                <span className="action-text">
                                                    {ticket.status === 'OPEN' ? 'Waiting for engineer' : 
                                                     ticket.status === 'ASSIGNED' ? 'Engineer assigned' : 
                                                     ticket.status === 'IN_PROGRESS' ? 'In progress' : 
                                                     ticket.status === 'CLOSED' ? 'Completed' : 'Reopened'}
                                                </span>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderDashboard = () => (
        <div className="page-content">
            <div className="page-header"><div><h1>Dashboard</h1><p>Overview of all support tickets</p></div></div>
            {alert.message && (
                <div className={`alert ${alert.type}`}>
                    <span className="alert-icon">{alert.type === 'success' ? '✅' : '❌'}</span>
                    {alert.message}
                    <button className="alert-close" onClick={() => setAlert({ message: '', type: '' })}>×</button>
                </div>
            )}
            {user.role === 'ADMIN' && renderStats()}
            <div className="section-header"><h2>{user.role === 'ADMIN' ? 'Recent Tickets' : 'My Tickets'}</h2></div>
            {user.role === 'ADMIN' ? renderTicketTable(tickets.slice(0, 5)) : renderTicketTable(myTickets.slice(0, 5))}
        </div>
    );

    const renderNewTicket = () => (
        <div className="page-content">
            <div className="page-header"><h1>Create New Ticket</h1><p>Submit a new support request</p></div>
            {alert.message && (
                <div className={`alert ${alert.type}`}>
                    <span className="alert-icon">{alert.type === 'success' ? '✅' : '❌'}</span>
                    {alert.message}
                    <button className="alert-close" onClick={() => setAlert({ message: '', type: '' })}>×</button>
                </div>
            )}
            <form className="ticket-form" onSubmit={handleCreateTicket}>
                <div className="form-row"><div className="form-field"><label>Title</label><input type="text" value={newTicket.title} onChange={(e) => setNewTicket({...newTicket, title: e.target.value})} placeholder="Brief description of the issue" required /></div></div>
                <div className="form-row"><div className="form-field"><label>Description</label><textarea value={newTicket.description} onChange={(e) => setNewTicket({...newTicket, description: e.target.value})} placeholder="Detailed description of the problem..." rows="4" required /></div></div>
                <div className="form-row two-col">
                    <div className="form-field"><label>Category</label><select value={newTicket.category} onChange={(e) => setNewTicket({...newTicket, category: e.target.value})}><option>Hardware</option><option>Software</option><option>Network</option><option>Account Access</option><option>Printer</option><option>Email</option><option>Other</option></select></div>
                    <div className="form-field"><label>Priority</label><select value={newTicket.priority} onChange={(e) => setNewTicket({...newTicket, priority: e.target.value})}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></div>
                </div>
                <button type="submit" className="btn-primary">Create Ticket</button>
            </form>
        </div>
    );

    const renderUserTable = (userList, sectionTitle) => {
        if (userList.length === 0) return null;
        return (
            <div className="user-section">
                <div className="section-header"><h2>{sectionTitle} <span className="user-count">({userList.length})</span></h2></div>
                <div className="table-container">
                    <table className="data-table">
                        <thead><tr><th>ID</th><th>Name</th><th>Username</th><th>Email</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
                        <tbody>
                            {userList.map(u => (
                                <tr key={u.id}>
                                    <td>{u.id}</td>
                                    <td><div className="user-cell"><div className="user-avatar-small">{u.fullName.charAt(0)}</div><span>{u.fullName}</span></div></td>
                                    <td>{u.username}</td>
                                    <td>{u.email}</td>
                                    <td><span className={`badge role-${u.role.toLowerCase()}`}>{u.role}</span></td>
                                    <td><span className={`badge ${u.active ? 'status-resolved' : 'status-closed'}`}>{u.active ? 'Active' : 'Inactive'}</span></td>
                                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <div className="action-group">
                                            <button className="btn-sm btn-primary" onClick={() => openEditModal(u)}>Edit</button>
                                            {u.role !== 'ADMIN' && (
                                                <button className="btn-sm btn-danger" onClick={() => handleDeleteClick(u.id, u.fullName, u.role)}>Delete</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderUsers = () => {
        const admins = users.filter(u => u.role === 'ADMIN');
        const employees = users.filter(u => u.role === 'EMPLOYEE');
        const engineers = users.filter(u => u.role === 'ENGINEER');
        return (
            <div className="page-content">
                <div className="page-header"><div><h1>User Management</h1><p>Manage all system users by role</p></div><button className="btn-primary btn-lg" onClick={() => { setShowCreateUserModal(true); setUserError(''); setNewUser({ username: '', password: '', email: '', fullName: '', role: 'EMPLOYEE' }); }}>+ Create User</button></div>
                {alert.message && (
                    <div className={`alert ${alert.type}`}>
                        <span className="alert-icon">{alert.type === 'success' ? '✅' : '❌'}</span>
                        {alert.message}
                        <button className="alert-close" onClick={() => setAlert({ message: '', type: '' })}>×</button>
                    </div>
                )}
                <div className="users-container">
                    {renderUserTable(admins, 'Admins')}
                    {renderUserTable(engineers, 'Engineers')}
                    {renderUserTable(employees, 'Employees')}
                </div>
            </div>
        );
    };

    const renderAssignModal = () => {
        if (!showAssignModal) return null;
        const engineers = users.filter(u => u.role === 'ENGINEER');
        return (
            <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header"><h3>Assign Ticket to Engineer</h3><button className="modal-close" onClick={() => setShowAssignModal(false)}>×</button></div>
                    <div className="modal-body">
                        <p>Select an engineer:</p>
                        <div className="engineer-list">
                            {engineers.length === 0 ? <p>No engineers available. Create an engineer first.</p> : engineers.map(eng => (
                                <div key={eng.id} className="engineer-card" onClick={() => handleAssignTicket(assignTicketId, eng.id)}><div className="user-avatar">{eng.fullName.charAt(0)}</div><div className="engineer-info"><div className="engineer-name">{eng.fullName}</div><div className="engineer-email">{eng.email}</div></div></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderCreateUserModal = () => {
        if (!showCreateUserModal) return null;
        return (
            <div className="modal-overlay" onClick={() => setShowCreateUserModal(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header"><h3>Create New User</h3><button className="modal-close" onClick={() => setShowCreateUserModal(false)}>×</button></div>
                    <div className="modal-body">
                        {userError && <div className="login-error" style={{marginBottom: '16px'}}>{userError}</div>}
                        <form onSubmit={handleCreateUser} className="login-form">
                            <div className="form-field"><label>Full Name</label><input type="text" value={newUser.fullName} onChange={(e) => setNewUser({...newUser, fullName: e.target.value})} placeholder="Enter full name" required /></div>
                            <div className="form-field"><label>Username</label><input type="text" value={newUser.username} onChange={(e) => setNewUser({...newUser, username: e.target.value})} placeholder="Enter username" required /></div>
                            <div className="form-field"><label>Email</label><input type="email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} placeholder="Enter email" required /></div>
                            <div className="form-field"><label>Password</label><input type="text" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} placeholder="Enter password" required /></div>
                            <div className="form-field"><label>Role</label><select value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value})}><option value="EMPLOYEE">Employee</option><option value="ENGINEER">Engineer</option><option value="ADMIN">Admin</option></select></div>
                            <button type="submit" className="login-btn">Create User</button>
                        </form>
                    </div>
                </div>
            </div>
        );
    };

    const renderEditUserModal = () => {
        if (!showEditUserModal) return null;
        return (
            <div className="modal-overlay" onClick={() => setShowEditUserModal(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header"><h3>Edit User: {editUser.username}</h3><button className="modal-close" onClick={() => setShowEditUserModal(false)}>×</button></div>
                    <div className="modal-body">
                        {userError && <div className="login-error" style={{marginBottom: '16px'}}>{userError}</div>}
                        <form onSubmit={handleEditUser} className="login-form">
                            <div className="form-field"><label>Full Name</label><input type="text" value={editUser.fullName} onChange={(e) => setEditUser({...editUser, fullName: e.target.value})} required /></div>
                            <div className="form-field"><label>Email</label><input type="email" value={editUser.email} onChange={(e) => setEditUser({...editUser, email: e.target.value})} required /></div>
                            <div className="form-field"><label>Role</label><select value={editUser.role} onChange={(e) => setEditUser({...editUser, role: e.target.value})}><option value="EMPLOYEE">Employee</option><option value="ENGINEER">Engineer</option><option value="ADMIN">Admin</option></select></div>
                            <div className="form-field"><label>New Password (leave blank to keep current)</label><input type="text" value={editUser.password} onChange={(e) => setEditUser({...editUser, password: e.target.value})} placeholder="Enter new password or leave blank" /></div>
                            <button type="submit" className="login-btn">Update User</button>
                        </form>
                    </div>
                </div>
            </div>
        );
    };

    const renderForceDeleteModal = () => {
        if (!showForceDeleteModal) return null;
        return (
            <div className="modal-overlay" onClick={() => setShowForceDeleteModal(false)}>
                <div className="modal-content force-delete-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header" style={{borderBottom: '2px solid #fecaca'}}>
                        <h3 style={{color: '#dc2626'}}>⚠️ Warning: Active Tickets Found</h3>
                        <button className="modal-close" onClick={() => setShowForceDeleteModal(false)}>×</button>
                    </div>
                    <div className="modal-body">
                        <div className="force-delete-warning">
                            <p><strong>{deleteUserName}</strong> has <strong>{activeTicketCount}</strong> active ticket(s) assigned.</p>
                            <p>If you delete this user, all their active tickets will be automatically reassigned to you (Admin).</p>
                            <p style={{color: '#6b7280', fontSize: '13px', marginTop: '12px'}}>
                                You can reassign these tickets to other engineers from the "All Tickets" page.
                            </p>
                        </div>
                        {userError && <div className="login-error" style={{marginTop: '16px'}}>{userError}</div>}
                        <div className="force-delete-actions">
                            <button className="btn-secondary" onClick={() => setShowForceDeleteModal(false)}>Cancel</button>
                            <button className="btn-danger btn-lg" onClick={handleForceDelete}>
                                🗑️ Force Delete & Reassign Tickets
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // ===== TICKET DETAIL (NO COMMENTS) =====
    const renderTicketDetail = () => {
        if (!showTicketDetail || !selectedTicket) return null;
        return (
            <div className="modal-overlay" onClick={() => setShowTicketDetail(false)}>
                <div className="modal-content ticket-detail-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <div>
                            <h3>Ticket {selectedTicket.ticketId}</h3>
                            <span className={`badge ${getStatusClass(selectedTicket.status)}`} style={{marginTop: '6px', display: 'inline-block'}}>{selectedTicket.status}</span>
                        </div>
                        <button className="modal-close" onClick={() => setShowTicketDetail(false)}>×</button>
                    </div>
                    <div className="modal-body">
                        <div className="ticket-detail-info">
                            <div className="detail-row"><span className="detail-label">Title:</span><span>{selectedTicket.title}</span></div>
                            <div className="detail-row"><span className="detail-label">Category:</span><span>{selectedTicket.category}</span></div>
                            <div className="detail-row"><span className="detail-label">Priority:</span><span className={`badge ${getPriorityClass(selectedTicket.priority)}`}>{selectedTicket.priority}</span></div>
                            <div className="detail-row"><span className="detail-label">Created:</span><span>{new Date(selectedTicket.createdAt).toLocaleString()}</span></div>
                            <div className="detail-row"><span className="detail-label">Created By:</span><span>{selectedTicket.createdBy?.fullName || 'Unknown'}</span></div>
                            <div className="detail-row"><span className="detail-label">Assigned To:</span><span>{selectedTicket.assignedTo?.fullName || 'Unassigned'}</span></div>
                        </div>
                        <div className="ticket-detail-description">
                            <h4>Description</h4>
                            <p>{selectedTicket.description}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) return (<div className="loading-screen"><div className="spinner"></div><p>Loading...</p></div>);

    return (
        <div className="dashboard-app">
            <div className="mobile-header">
                <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}><span></span><span></span><span></span></button>
                <div className="mobile-brand">HelpDesk Pro</div>
                <div className="mobile-avatar">{user.fullName.charAt(0)}</div>
            </div>
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-brand"><div className="brand-logo">HD</div><div className="brand-text"><span className="brand-name">HelpDesk</span><span className="brand-tag">Pro</span></div></div>
                <nav className="sidebar-nav">
                    {getNavItems().map(item => (
                        <button key={item.key} className={activeTab === item.key ? 'nav-item active' : 'nav-item'} onClick={() => { setActiveTab(item.key); setSidebarOpen(false); setAlert({ message: '', type: '' }); }}>{item.label}</button>
                    ))}
                </nav>
                <div className="sidebar-footer">
                    <div className="user-card"><div className="user-avatar">{user.fullName.charAt(0)}</div><div className="user-info"><span className="user-name">{user.fullName}</span><span className="user-role">{user.role}</span></div></div>
                    <button className="logout-btn" onClick={onLogout}>Logout</button>
                </div>
            </aside>
            {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}
            <main className="main-area">
                {activeTab === 'dashboard' && renderDashboard()}
                {activeTab === 'new-ticket' && renderNewTicket()}
                {activeTab === 'my-tickets' && (<div className="page-content"><div className="page-header"><h1>My Tickets</h1><p>All tickets created by you</p></div>{alert.message && <div className={`alert ${alert.type}`}><span className="alert-icon">{alert.type === 'success' ? '✅' : '❌'}</span>{alert.message}<button className="alert-close" onClick={() => setAlert({ message: '', type: '' })}>×</button></div>}{renderTicketTable(myTickets, true)}</div>)}
                {activeTab === 'assigned' && (<div className="page-content"><div className="page-header"><h1>My Work</h1><p>Tickets assigned to you</p></div>{alert.message && <div className={`alert ${alert.type}`}><span className="alert-icon">{alert.type === 'success' ? '✅' : '❌'}</span>{alert.message}<button className="alert-close" onClick={() => setAlert({ message: '', type: '' })}>×</button></div>}{renderTicketTable(myTickets, true)}</div>)}
                {activeTab === 'all-tickets' && (<div className="page-content"><div className="page-header"><h1>All Tickets</h1><p>Manage all support tickets</p></div>{alert.message && <div className={`alert ${alert.type}`}><span className="alert-icon">{alert.type === 'success' ? '✅' : '❌'}</span>{alert.message}<button className="alert-close" onClick={() => setAlert({ message: '', type: '' })}>×</button></div>}{renderTicketTable(tickets, true, true)}</div>)}
                {activeTab === 'users' && renderUsers()}
            </main>
            {renderAssignModal()}
            {renderCreateUserModal()}
            {renderEditUserModal()}
            {renderForceDeleteModal()}
            {renderTicketDetail()}
        </div>
    );
}

export default Dashboard;