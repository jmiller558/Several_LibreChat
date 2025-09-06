// Global state
let currentUser = null;
let currentPage = 1;
let usersData = [];
let filteredUsers = [];
const PAGE_SIZE = 20;
const API_BASE_URL = 'http://localhost:4000';

// Handle login button click
async function handleLoginClick() {
    alert('handleLoginClick called!');
    console.log('handleLoginClick called');
    
    const loginBtn = document.getElementById('loginBtn');
    const loginBtnText = document.getElementById('loginBtnText');
    const loginBtnSpinner = document.getElementById('loginBtnSpinner');
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    console.log('Login attempt:', { email, password: password ? '***' : 'empty' });
    
    // Hide error
    const loginError = document.getElementById('loginError');
    if (loginError) {
        loginError.classList.add('hidden');
    }
    
    // Show loading state
    loginBtn.disabled = true;
    loginBtnText.classList.add('hidden');
    loginBtnSpinner.classList.remove('hidden');
    
    try {
        await login(email, password);
    } catch (error) {
        console.error('handleLoginClick error:', error);
        showError('Login failed: ' + error.message);
    } finally {
        // Reset button state
        loginBtn.disabled = false;
        loginBtnText.classList.remove('hidden');
        loginBtnSpinner.classList.add('hidden');
    }
}

// Make function globally accessible
window.handleLoginClick = handleLoginClick;

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    console.log('handleLogin called');
    
    const loginBtn = document.getElementById('loginBtn');
    const loginBtnText = document.getElementById('loginBtnText');
    const loginBtnSpinner = document.getElementById('loginBtnSpinner');
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    console.log('Login attempt:', { email, password: password ? '***' : 'empty' });
    
    // Hide error
    document.getElementById('loginError').classList.add('hidden');
    
    // Show loading state
    loginBtn.disabled = true;
    loginBtnText.classList.add('hidden');
    loginBtnSpinner.classList.remove('hidden');
    
    try {
        await login(email, password);
    } catch (error) {
        console.error('handleLogin error:', error);
        showError('Login failed: ' + error.message);
    } finally {
        // Reset button state
        loginBtn.disabled = false;
        loginBtnText.classList.remove('hidden');
        loginBtnSpinner.classList.add('hidden');
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, setting up event listeners');
    checkAuth();
    updateTime();
    setInterval(updateTime, 1000);
    
    // Close user menu when clicking outside
    document.addEventListener('click', function(e) {
        const userMenu = document.getElementById('userMenu');
        const userMenuBtn = e.target.closest('button[onclick="toggleUserMenu()"]');
        
        if (!userMenuBtn && userMenu && !userMenu.contains(e.target)) {
            userMenu.classList.add('hidden');
        }
    });
});

// Authentication functions
async function checkAuth() {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        showLogin();
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            showDashboard();
            loadDashboardData();
        } else {
            localStorage.removeItem('adminToken');
            showLogin();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('adminToken');
        showLogin();
    } finally {
        showLoading(false);
    }
}

async function login(email, password) {
    try {
        console.log('login function called with:', { email, password: password ? '***' : 'empty' });
        showLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        console.log('Login response status:', response.status);
        const data = await response.json();
        console.log('Login response data:', data);
        
        if (data.success) {
            localStorage.setItem('adminToken', data.token);
            if (data.refreshToken) {
                localStorage.setItem('adminRefreshToken', data.refreshToken);
            }
            currentUser = data.user;
            showDashboard();
            loadDashboardData();
            showToast('Login successful', 'success');
        } else {
            showError(data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Network error. Please try again.');
    } finally {
        showLoading(false);
    }
}

async function logout() {
    try {
        const token = localStorage.getItem('adminToken');
        if (token) {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminRefreshToken');
        currentUser = null;
        showLogin();
        showToast('Logged out successfully', 'info');
    }
}

// UI Display functions
function showLogin() {
    document.getElementById('loginModal').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
}

function showDashboard() {
    document.getElementById('loginModal').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('adminName').textContent = currentUser.name;
    showSection('overview');
}

function showLoading(show) {
    const loader = document.getElementById('loading');
    if (show) {
        loader.classList.remove('hidden');
    } else {
        loader.classList.add('hidden');
    }
}

function showError(message) {
    const errorDiv = document.getElementById('loginError');
    const errorMsg = errorDiv.querySelector('p');
    errorMsg.textContent = message;
    errorDiv.classList.remove('hidden');
    setTimeout(() => {
        errorDiv.classList.add('hidden');
    }, 5000);
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const icon = document.getElementById('toastIcon');
    const msgEl = document.getElementById('toastMessage');
    
    msgEl.textContent = message;
    
    // Set icon based on type
    icon.innerHTML = '';
    if (type === 'success') {
        icon.innerHTML = '<i class="fas fa-check-circle text-green-500"></i>';
    } else if (type === 'error') {
        icon.innerHTML = '<i class="fas fa-exclamation-circle text-red-500"></i>';
    } else if (type === 'warning') {
        icon.innerHTML = '<i class="fas fa-exclamation-triangle text-yellow-500"></i>';
    } else {
        icon.innerHTML = '<i class="fas fa-info-circle text-blue-500"></i>';
    }
    
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 5000);
}

function hideToast() {
    document.getElementById('toast').classList.add('hidden');
}

// Navigation functions
function showSection(section) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(el => {
        el.classList.add('hidden');
    });
    
    // Show selected section
    document.getElementById(`${section}-section`).classList.remove('hidden');
    
    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-primary-600', 'border-b-2', 'border-primary-600');
        btn.classList.add('text-gray-500', 'hover:text-gray-700');
    });
    
    const activeBtn = document.getElementById(`nav-${section}`);
    activeBtn.classList.remove('text-gray-500', 'hover:text-gray-700');
    activeBtn.classList.add('text-primary-600', 'border-b-2', 'border-primary-600');
    
    // Load section data
    if (section === 'users') {
        loadUsers();
    } else if (section === 'stats') {
        loadStatistics();
    }
}

function toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    menu.classList.toggle('hidden');
}

// Dashboard data loading
async function loadDashboardData() {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch('/api/dashboard/stats', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (data.success) {
            updateDashboardStats(data.data);
        }
    } catch (error) {
        console.error('Dashboard load error:', error);
    }
    
    // Load additional data
    loadRecentActivity();
    loadSystemHealth();
}

function updateDashboardStats(stats) {
    document.getElementById('totalUsers').textContent = stats.users.total.toLocaleString();
    document.getElementById('totalConversations').textContent = stats.conversations.total.toLocaleString();
    document.getElementById('totalMessages').textContent = stats.messages.total.toLocaleString();
    document.getElementById('totalAdmins').textContent = stats.users.admins.toLocaleString();
}

async function loadRecentActivity() {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch('/api/dashboard/recent-activity?limit=5', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (data.success) {
            updateRecentUsers(data.data.recentUsers);
        }
    } catch (error) {
        console.error('Recent activity load error:', error);
        document.getElementById('recentUsers').innerHTML = '<div class="text-center text-red-500 py-4">Failed to load recent users</div>';
    }
}

function updateRecentUsers(users) {
    const container = document.getElementById('recentUsers');
    
    if (users.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-500 py-4">No recent users</div>';
        return;
    }
    
    container.innerHTML = users.map(user => `
        <div class="flex items-center justify-between">
            <div class="flex items-center">
                <div class="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <i class="fas fa-user text-primary-600 text-sm"></i>
                </div>
                <div class="ml-3">
                    <p class="text-sm font-medium text-gray-900">${escapeHtml(user.name)}</p>
                    <p class="text-xs text-gray-500">${escapeHtml(user.email)}</p>
                </div>
            </div>
            <div class="text-right">
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}">
                    ${user.role}
                </span>
                <p class="text-xs text-gray-500 mt-1">${formatDate(user.createdAt)}</p>
            </div>
        </div>
    `).join('');
}

async function loadSystemHealth() {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch('/api/dashboard/health', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (data.success) {
            updateSystemHealth(data.data);
        }
    } catch (error) {
        console.error('System health load error:', error);
        document.getElementById('systemHealth').innerHTML = '<div class="text-center text-red-500 py-4">Failed to load system health</div>';
    }
}

function updateSystemHealth(health) {
    const container = document.getElementById('systemHealth');
    
    const statusColor = health.status === 'healthy' ? 'text-green-600' : 
                       health.status === 'warning' ? 'text-yellow-600' : 'text-red-600';
    
    container.innerHTML = `
        <div class="space-y-3">
            <div class="flex justify-between">
                <span class="text-sm text-gray-600">Status</span>
                <span class="text-sm font-medium ${statusColor} capitalize">${health.status}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-sm text-gray-600">Uptime</span>
                <span class="text-sm font-medium text-gray-900">${health.uptime.formatted}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-sm text-gray-600">Memory</span>
                <span class="text-sm font-medium text-gray-900">${health.memory.heapUsed}MB / ${health.memory.heapTotal}MB</span>
            </div>
            <div class="flex justify-between">
                <span class="text-sm text-gray-600">Database</span>
                <span class="text-sm font-medium ${health.database.connected ? 'text-green-600' : 'text-red-600'}">
                    ${health.database.status}
                </span>
            </div>
            <div class="flex justify-between">
                <span class="text-sm text-gray-600">Node.js</span>
                <span class="text-sm font-medium text-gray-900">${health.node.version}</span>
            </div>
        </div>
    `;
}

// User management functions
async function loadUsers() {
    try {
        showLoading(true);
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`/api/users?page=${currentPage}&limit=${PAGE_SIZE}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (data.success) {
            usersData = data.data.users;
            filteredUsers = [...usersData];
            updateUsersTable();
            updatePagination(data.data.pagination);
        } else {
            showToast('Failed to load users', 'error');
        }
    } catch (error) {
        console.error('Load users error:', error);
        showToast('Network error loading users', 'error');
    } finally {
        showLoading(false);
    }
}

function updateUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    
    if (filteredUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredUsers.map(user => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-user text-primary-600"></i>
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">${escapeHtml(user.name)}</div>
                        <div class="text-sm text-gray-500">${escapeHtml(user.email)}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}">
                    ${user.role}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    ${user.banned ? 
                        '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Banned</span>' :
                        '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>'
                    }
                    ${user.emailVerified ? 
                        '<i class="fas fa-check-circle text-green-500 ml-2" title="Email Verified"></i>' :
                        '<i class="fas fa-exclamation-circle text-yellow-500 ml-2" title="Email Not Verified"></i>'
                    }
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div>
                    <div>${user.conversationCount || 0} conversations</div>
                    <div>${user.messageCount || 0} messages</div>
                    <div class="text-xs">Last login: ${user.lastLogin ? formatDate(user.lastLogin) : 'Never'}</div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex space-x-2">
                    ${user.role !== 'ADMIN' ? 
                        `<button onclick="makeAdmin('${user._id}')" class="text-purple-600 hover:text-purple-900" title="Make Admin">
                            <i class="fas fa-user-shield"></i>
                        </button>` : 
                        `<button onclick="removeAdmin('${user._id}')" class="text-gray-400 hover:text-gray-600" title="Remove Admin" ${user._id === currentUser.id ? 'disabled' : ''}>
                            <i class="fas fa-user-minus"></i>
                        </button>`
                    }
                    ${!user.banned ? 
                        `<button onclick="banUser('${user._id}')" class="text-red-600 hover:text-red-900" title="Ban User" ${user._id === currentUser.id ? 'disabled' : ''}>
                            <i class="fas fa-ban"></i>
                        </button>` : 
                        `<button onclick="unbanUser('${user._id}')" class="text-green-600 hover:text-green-900" title="Unban User">
                            <i class="fas fa-check-circle"></i>
                        </button>`
                    }
                    <button onclick="deleteUser('${user._id}')" class="text-red-600 hover:text-red-900" title="Delete User" ${user._id === currentUser.id ? 'disabled' : ''}>
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function updatePagination(pagination) {
    document.getElementById('usersStart').textContent = pagination.currentPage === 1 ? 1 : ((pagination.currentPage - 1) * PAGE_SIZE) + 1;
    document.getElementById('usersEnd').textContent = Math.min(pagination.currentPage * PAGE_SIZE, pagination.totalUsers);
    document.getElementById('usersTotal').textContent = pagination.totalUsers;
    
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (pagination.hasPrev) {
        prevBtn.disabled = false;
        prevBtn.classList.remove('cursor-not-allowed', 'bg-gray-100', 'text-gray-500');
        prevBtn.classList.add('bg-white', 'text-gray-700', 'hover:bg-gray-50');
    } else {
        prevBtn.disabled = true;
        prevBtn.classList.add('cursor-not-allowed', 'bg-gray-100', 'text-gray-500');
        prevBtn.classList.remove('bg-white', 'text-gray-700', 'hover:bg-gray-50');
    }
    
    if (pagination.hasNext) {
        nextBtn.disabled = false;
        nextBtn.classList.remove('cursor-not-allowed', 'bg-gray-100', 'text-gray-500');
        nextBtn.classList.add('bg-white', 'text-gray-700', 'hover:bg-gray-50');
    } else {
        nextBtn.disabled = true;
        nextBtn.classList.add('cursor-not-allowed', 'bg-gray-100', 'text-gray-500');
        nextBtn.classList.remove('bg-white', 'text-gray-700', 'hover:bg-gray-50');
    }
}

// User actions
async function makeAdmin(userId) {
    if (!confirm('Are you sure you want to make this user an admin?')) return;
    
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`/api/users/${userId}/make-admin`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (data.success) {
            showToast(data.message, 'success');
            loadUsers();
        } else {
            showToast(data.message || 'Failed to make user admin', 'error');
        }
    } catch (error) {
        console.error('Make admin error:', error);
        showToast('Network error', 'error');
    }
}

async function removeAdmin(userId) {
    if (!confirm('Are you sure you want to remove admin privileges from this user?')) return;
    
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`/api/users/${userId}/remove-admin`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (data.success) {
            showToast(data.message, 'success');
            loadUsers();
        } else {
            showToast(data.message || 'Failed to remove admin privileges', 'error');
        }
    } catch (error) {
        console.error('Remove admin error:', error);
        showToast('Network error', 'error');
    }
}

async function banUser(userId) {
    if (!confirm('Are you sure you want to ban this user?')) return;
    
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`/api/users/${userId}/ban`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (data.success) {
            showToast(data.message, 'success');
            loadUsers();
        } else {
            showToast(data.message || 'Failed to ban user', 'error');
        }
    } catch (error) {
        console.error('Ban user error:', error);
        showToast('Network error', 'error');
    }
}

async function unbanUser(userId) {
    if (!confirm('Are you sure you want to unban this user?')) return;
    
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`/api/users/${userId}/unban`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (data.success) {
            showToast(data.message, 'success');
            loadUsers();
        } else {
            showToast(data.message || 'Failed to unban user', 'error');
        }
    } catch (error) {
        console.error('Unban user error:', error);
        showToast('Network error', 'error');
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone and will delete all their conversations and messages.')) return;
    
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (data.success) {
            showToast(data.message, 'success');
            loadUsers();
        } else {
            showToast(data.message || 'Failed to delete user', 'error');
        }
    } catch (error) {
        console.error('Delete user error:', error);
        showToast('Network error', 'error');
    }
}

// Filtering and pagination
function filterUsers() {
    const search = document.getElementById('userSearch').value.toLowerCase();
    const role = document.getElementById('roleFilter').value;
    const status = document.getElementById('statusFilter').value;
    
    filteredUsers = usersData.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(search) || 
                             user.email.toLowerCase().includes(search);
        const matchesRole = role === 'all' || user.role === role;
        
        let matchesStatus = true;
        if (status === 'banned') {
            matchesStatus = user.banned === true;
        } else if (status === 'active') {
            matchesStatus = user.banned === false;
        } else if (status === 'verified') {
            matchesStatus = user.emailVerified === true;
        } else if (status === 'unverified') {
            matchesStatus = user.emailVerified === false;
        }
        
        return matchesSearch && matchesRole && matchesStatus;
    });
    
    updateUsersTable();
}

function clearFilters() {
    document.getElementById('userSearch').value = '';
    document.getElementById('roleFilter').value = 'all';
    document.getElementById('statusFilter').value = 'all';
    filteredUsers = [...usersData];
    updateUsersTable();
}

function refreshUsers() {
    loadUsers();
}

function previousPage() {
    if (currentPage > 1) {
        currentPage--;
        loadUsers();
    }
}

function nextPage() {
    currentPage++;
    loadUsers();
}

// Statistics loading
async function loadStatistics() {
    try {
        const token = localStorage.getItem('adminToken');
        const [statsResponse, modelsResponse] = await Promise.all([
            fetch('/api/dashboard/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch('/api/dashboard/popular-models', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);

        const [statsData, modelsData] = await Promise.all([
            statsResponse.json(),
            modelsResponse.json()
        ]);
        
        if (statsData.success) {
            updateUserStatistics(statsData.data.users);
            updateMessageStatistics(statsData.data.messages);
        }
    } catch (error) {
        console.error('Statistics load error:', error);
    }
}

function updateUserStatistics(stats) {
    const container = document.getElementById('userStats');
    container.innerHTML = `
        <div class="space-y-3">
            <div class="flex justify-between">
                <span class="text-sm text-gray-600">Total Users</span>
                <span class="text-sm font-medium text-gray-900">${stats.total.toLocaleString()}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-sm text-gray-600">Admins</span>
                <span class="text-sm font-medium text-gray-900">${stats.admins.toLocaleString()}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-sm text-gray-600">Banned</span>
                <span class="text-sm font-medium text-gray-900">${stats.banned.toLocaleString()}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-sm text-gray-600">Verified</span>
                <span class="text-sm font-medium text-gray-900">${stats.verified.toLocaleString()} (${stats.verificationRate}%)</span>
            </div>
            <div class="flex justify-between">
                <span class="text-sm text-gray-600">New Today</span>
                <span class="text-sm font-medium text-gray-900">${stats.newToday.toLocaleString()}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-sm text-gray-600">New This Week</span>
                <span class="text-sm font-medium text-gray-900">${stats.newThisWeek.toLocaleString()}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-sm text-gray-600">Active This Week</span>
                <span class="text-sm font-medium text-gray-900">${stats.activeLastWeek.toLocaleString()}</span>
            </div>
        </div>
    `;
}

function updateMessageStatistics(stats) {
    const container = document.getElementById('messageStats');
    container.innerHTML = `
        <div class="space-y-3">
            <div class="flex justify-between">
                <span class="text-sm text-gray-600">Total Messages</span>
                <span class="text-sm font-medium text-gray-900">${stats.total.toLocaleString()}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-sm text-gray-600">User Messages</span>
                <span class="text-sm font-medium text-gray-900">${stats.userMessages.toLocaleString()}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-sm text-gray-600">Assistant Messages</span>
                <span class="text-sm font-medium text-gray-900">${stats.assistantMessages.toLocaleString()}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-sm text-gray-600">Error Messages</span>
                <span class="text-sm font-medium text-gray-900">${stats.errorMessages.toLocaleString()} (${stats.errorRate}%)</span>
            </div>
            <div class="flex justify-between">
                <span class="text-sm text-gray-600">New Today</span>
                <span class="text-sm font-medium text-gray-900">${stats.newToday.toLocaleString()}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-sm text-gray-600">New This Week</span>
                <span class="text-sm font-medium text-gray-900">${stats.newThisWeek.toLocaleString()}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-sm text-gray-600">Total Tokens</span>
                <span class="text-sm font-medium text-gray-900">${stats.tokens.total.toLocaleString()}</span>
            </div>
        </div>
    `;
}

// Utility functions
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
    });
    const currentTimeEl = document.getElementById('currentTime');
    if (currentTimeEl) {
        currentTimeEl.textContent = timeString;
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
