class AdminPortal {
    constructor() {
        this.token = localStorage.getItem('adminToken');
        this.currentPage = 1;
        this.selectedUsers = new Set();
        this.currentUser = null; // Store current user info for permission checks
        this.init();
    }

    init() {
        if (this.token) {
            this.verifyToken();
        } else {
            this.showLogin();
        }

        this.setupEventListeners();
        this.setupBulkActions();
    }

    setupEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        // Logout button
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // Sidebar navigation
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.currentTarget.dataset.section;
                this.showSection(section);
            });
        });

        // User search and filter
        document.getElementById('userSearch').addEventListener('input', () => {
            this.loadUsers();
        });

        document.getElementById('roleFilter').addEventListener('change', () => {
            this.loadUsers();
        });

        document.getElementById('statusFilter').addEventListener('change', () => {
            this.loadUsers();
        });

        // Export users
        document.getElementById('exportUsers').addEventListener('click', () => {
            this.exportUsers();
        });

        // Add User modal controls
        document.getElementById('addUserBtn').addEventListener('click', () => {
            this.showAddUserModal();
        });

        document.getElementById('closeAddUserModal').addEventListener('click', () => {
            this.hideAddUserModal();
        });

        document.getElementById('cancelAddUser').addEventListener('click', () => {
            this.hideAddUserModal();
        });

        // Add User form submission
        document.getElementById('addUserForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createUser();
        });

        // Statistics controls
        document.getElementById('refreshStats').addEventListener('click', () => {
            this.loadStatistics();
        });

        document.getElementById('exportStats').addEventListener('click', () => {
            this.exportStatistics();
        });

        // Pagination
        document.getElementById('prevPage').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadUsers();
            }
        });

        document.getElementById('nextPage').addEventListener('click', () => {
            this.currentPage++;
            this.loadUsers();
        });

        // Super Admin event listeners
        if (document.getElementById('syncSuperAdminBtn')) {
            document.getElementById('syncSuperAdminBtn').addEventListener('click', () => {
                this.syncSuperAdmin();
            });
        }

        if (document.getElementById('forceSyncBtn')) {
            document.getElementById('forceSyncBtn').addEventListener('click', () => {
                this.forceEnvironmentSync();
            });
        }

        if (document.getElementById('cleanupDuplicatesBtn')) {
            document.getElementById('cleanupDuplicatesBtn').addEventListener('click', () => {
                this.cleanupDuplicateEmails();
            });
        }

        if (document.getElementById('forceSyncNowBtn')) {
            document.getElementById('forceSyncNowBtn').addEventListener('click', () => {
                this.forceSyncNow();
            });
        }

        if (document.getElementById('refreshStatusBtn')) {
            document.getElementById('refreshStatusBtn').addEventListener('click', () => {
                this.refreshSuperAdminStatus();
            });
        }

        if (document.getElementById('getSystemSummaryBtn')) {
            document.getElementById('getSystemSummaryBtn').addEventListener('click', () => {
                this.getSystemSummary();
            });
        }

        if (document.getElementById('promoteUserBtn')) {
            document.getElementById('promoteUserBtn').addEventListener('click', () => {
                this.promoteUserToSuperAdmin();
            });
        }
    }

    setupBulkActions() {
        // Select all checkbox
        document.getElementById('selectAll').addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.user-checkbox:not(:disabled)');
            checkboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
                if (e.target.checked) {
                    this.selectedUsers.add(checkbox.value);
                } else {
                    this.selectedUsers.delete(checkbox.value);
                }
            });
            this.updateSelectedCount();
        });

        // Individual checkboxes
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('user-checkbox') && !e.target.disabled) {
                if (e.target.checked) {
                    this.selectedUsers.add(e.target.value);
                } else {
                    this.selectedUsers.delete(e.target.value);
                }
                this.updateSelectedCount();
            }
        });
    }

    updateSelectedCount() {
        const count = this.selectedUsers.size;
        document.getElementById('selectedCount').textContent = `${count} selected`;
        document.getElementById('bulkActions').classList.toggle('hidden', count === 0);
    }

    async login() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const errorDiv = document.getElementById('loginError');

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                localStorage.setItem('adminToken', this.token);
                this.showMainApp(data.user);
            } else {
                errorDiv.textContent = data.error;
                errorDiv.classList.remove('hidden');
            }
        } catch (error) {
            errorDiv.textContent = 'Login failed. Please try again.';
            errorDiv.classList.remove('hidden');
        }
    }

    async verifyToken() {
        try {
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                this.showMainApp(data.user);
            } else {
                this.logout();
            }
        } catch (error) {
            this.logout();
        }
    }

    logout() {
        localStorage.removeItem('adminToken');
        this.token = null;
        this.showLogin();
    }

    showLogin() {
        document.getElementById('loginModal').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
    }

    showMainApp(user) {
        document.getElementById('loginModal').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        document.getElementById('userInfo').textContent = `Welcome, ${user.name}`;
        
        // Store current user for permission checks
        this.currentUser = user;
        
        this.loadDashboard();
    }

    showSection(section) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
        
        // Remove active class from all sidebar items
        document.querySelectorAll('.sidebar-item').forEach(item => 
            item.classList.remove('active'));
        
        // Show selected section
        document.getElementById(`${section}-section`).classList.remove('hidden');
        
        // Add active class to clicked sidebar item
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Load section content
        switch (section) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'users':
                this.loadUsers();
                break;
            case 'statistics':
                this.loadStatistics();
                break;
        }
    }

    async loadDashboard() {
        try {
            const response = await fetch('/api/admin/stats', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                },
            });

            if (response.ok) {
                const stats = await response.json();
                
                // Update overview stats
                document.getElementById('totalUsers').textContent = stats.overview.totalUsers || 0;
                document.getElementById('activeUsers').textContent = stats.overview.activeUsers || 0;
                document.getElementById('totalConversations').textContent = stats.overview.totalConversations || 0;
                document.getElementById('totalMessages').textContent = stats.overview.totalMessages || 0;
                
                // Update growth stats
                document.getElementById('newUsersToday').textContent = stats.userGrowth.today || 0;
                document.getElementById('newUsersWeek').textContent = stats.userGrowth.thisWeek || 0;
                document.getElementById('newUsersMonth').textContent = stats.userGrowth.thisMonth || 0;
            }
        } catch (error) {
            console.error('Failed to load dashboard stats:', error);
        }
    }

    async loadUsers() {
        const search = document.getElementById('userSearch').value;
        const role = document.getElementById('roleFilter').value;
        const status = document.getElementById('statusFilter').value;
        
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                search,
                role,
                status,
            });

            const response = await fetch(`/api/admin/users?${params}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                this.renderUsers(data.users);
                this.renderPagination(data.pagination);
            }
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    }

    renderUsers(users) {
        const tbody = document.getElementById('usersTable');
        tbody.innerHTML = '';

        users.forEach(user => {
            const row = document.createElement('tr');
            // Add special styling for super admin rows
            if (user.role === 'SUPER_ADMIN') {
                row.className = 'super-admin-row';
            }
            
            const lastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never';
            const status = user.banned ? 'Banned' : (!user.emailVerified ? 'Unverified' : 'Active');
            const statusClass = user.banned ? 'bg-red-100 text-red-800' : 
                               (!user.emailVerified ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800');

            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <input type="checkbox" class="user-checkbox rounded" value="${user._id}" 
                           ${user.role === 'SUPER_ADMIN' ? 'disabled title="Super Admin cannot be selected for bulk operations"' : ''}>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">${user.name || 'N/A'}</div>
                            <div class="text-sm text-gray-500">${user.email}</div>
                            ${user.twoFactorEnabled ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"><i class="fas fa-shield-alt mr-1"></i>2FA</span>' : ''}
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === 'SUPER_ADMIN' ? 'super-admin-badge' : 
                        user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                    }">
                        ${user.role === 'SUPER_ADMIN' ? '🔒 SUPER ADMIN' : user.role}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                        ${status}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${lastLogin}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    ${user.role !== 'SUPER_ADMIN' ? `
                        ${this.canManageUser(user) ? `
                            <button onclick="adminPortal.toggleUserRole('${user._id}', '${user.role}')" 
                                    class="text-blue-600 hover:text-blue-900 mr-3">
                                ${user.role === 'ADMIN' ? 'Remove Admin' : 'Make Admin'}
                            </button>
                            <button onclick="adminPortal.toggleUserBan('${user._id}', ${user.banned})" 
                                    class="text-yellow-600 hover:text-yellow-900 mr-3">
                                ${user.banned ? 'Unban' : 'Ban'}
                            </button>
                            <button onclick="adminPortal.deleteUser('${user._id}')" 
                                    class="text-red-600 hover:text-red-900">
                                Delete
                            </button>
                        ` : `
                            <span class="text-sm text-gray-500">
                                <i class="fas fa-lock mr-1"></i>Admin Protected
                            </span>
                        `}
                    ` : `
                        <span class="protected-text text-xs">
                            <i class="fas fa-shield-alt mr-1"></i>Protected
                        </span>
                    `}
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    renderPagination(pagination) {
        document.getElementById('usersInfo').textContent = 
            `Showing ${pagination.totalUsers > 0 ? ((pagination.currentPage - 1) * 10) + 1 : 0} to ${Math.min(pagination.currentPage * 10, pagination.totalUsers)} of ${pagination.totalUsers} users`;
        
        document.getElementById('pageInfo').textContent = 
            `Page ${pagination.currentPage} of ${pagination.totalPages}`;
        
        document.getElementById('prevPage').disabled = !pagination.hasPrev;
        document.getElementById('nextPage').disabled = !pagination.hasNext;
    }

    async toggleUserRole(userId, currentRole) {
        const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
        
        try {
            const response = await fetch(`/api/admin/users/${userId}/role`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ role: newRole }),
            });

            if (response.ok) {
                this.loadUsers();
            } else {
                alert('Failed to update user role');
            }
        } catch (error) {
            alert('Failed to update user role');
        }
    }

    async toggleUserBan(userId, currentlyBanned) {
        try {
            const response = await fetch(`/api/admin/users/${userId}/ban`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                },
            });

            if (response.ok) {
                this.loadUsers();
            } else {
                alert('Failed to update user status');
            }
        } catch (error) {
            alert('Failed to update user status');
        }
    }

    canManageUser(targetUser) {
        // Super admins can manage anyone (except other super admins, which is handled separately)
        if (this.currentUser && this.currentUser.isSuperAdmin) {
            return true;
        }
        
        // Regular admins cannot manage other admins
        if (targetUser.role === 'ADMIN') {
            return false;
        }
        
        // Regular admins can manage regular users
        return true;
    }

    async deleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                },
            });

            if (response.ok) {
                this.loadUsers();
            } else {
                alert('Failed to delete user');
            }
        } catch (error) {
            alert('Failed to delete user');
        }
    }

    // Bulk Operations
    async bulkAction(action, params = {}) {
        if (this.selectedUsers.size === 0) {
            alert('Please select users first');
            return;
        }

        const userIds = Array.from(this.selectedUsers);
        
        // Check if any selected users are admins and current user is not super admin
        if (!this.currentUser?.isSuperAdmin && action !== 'verify') {
            const userRows = document.querySelectorAll('#usersTable tbody tr');
            const hasAdminUsers = Array.from(userRows).some(row => {
                const checkbox = row.querySelector('input[type="checkbox"]');
                const roleSpan = row.querySelector('td:nth-child(4) span');
                return checkbox && 
                       userIds.includes(checkbox.value) && 
                       (roleSpan?.textContent.includes('ADMIN') || roleSpan?.textContent.includes('SUPER ADMIN'));
            });
            
            if (hasAdminUsers) {
                alert('You cannot perform bulk operations on admin users. Only super admins can manage other admins.');
                return;
            }
        }
        
        const confirmMessage = `Are you sure you want to ${action} ${userIds.length} user(s)?`;
        
        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/users/bulk/${action}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userIds, ...params }),
            });

            if (response.ok) {
                this.selectedUsers.clear();
                this.updateSelectedCount();
                document.getElementById('selectAll').checked = false;
                this.loadUsers();
                alert(`Successfully ${action}ed ${userIds.length} user(s)`);
            } else {
                const error = await response.json();
                alert(`Failed to ${action} users: ${error.error}`);
            }
        } catch (error) {
            alert(`Failed to ${action} users`);
        }
    }

    // Export Users
    async exportUsers() {
        try {
            const response = await fetch('/api/admin/users/export', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                },
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                alert('Failed to export users');
            }
        } catch (error) {
            alert('Failed to export users');
        }
    }

    // Add User Modal Methods
    showAddUserModal() {
        document.getElementById('addUserModal').classList.remove('hidden');
        document.getElementById('addUserForm').reset();
        document.getElementById('addUserError').classList.add('hidden');
    }

    hideAddUserModal() {
        document.getElementById('addUserModal').classList.add('hidden');
        document.getElementById('addUserForm').reset();
        document.getElementById('addUserError').classList.add('hidden');
    }

    async createUser() {
        const formData = new FormData(document.getElementById('addUserForm'));
        const userData = {
            name: formData.get('name'),
            email: formData.get('email'),
            password: formData.get('password'),
            role: formData.get('role'),
            emailVerified: formData.get('emailVerified') === 'on'
        };

        const errorDiv = document.getElementById('addUserError');

        try {
            const response = await fetch('/api/admin/users/create', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            const result = await response.json();

            if (response.ok) {
                this.hideAddUserModal();
                this.loadUsers(); // Refresh the user list
                alert(`User "${userData.name}" created successfully!`);
            } else {
                errorDiv.textContent = result.error || 'Failed to create user';
                errorDiv.classList.remove('hidden');
            }
        } catch (error) {
            errorDiv.textContent = 'Failed to create user. Please try again.';
            errorDiv.classList.remove('hidden');
        }
    }

    // Security Dashboard
    async loadSecurityDashboard() {
        try {
            const response = await fetch('/api/admin/security/audit', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                
                // Update security stats
                document.getElementById('bannedUsers').textContent = data.stats.bannedUsers;
                document.getElementById('adminCount').textContent = data.stats.adminUsers;
            }
        } catch (error) {
            console.error('Failed to load security data:', error);
        }
    }

    async loadStatistics() {
        console.log('📊 Loading real statistics from API...');
        
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('❌ No authentication token found');
                this.showPlaceholderStats();
                return;
            }

            console.log('🔑 Making API request with token...');
            const response = await fetch('/api/admin/statistics', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('📡 API Response status:', response.status);

            if (response.ok) {
                const stats = await response.json();
                console.log('✅ Real statistics loaded successfully:', stats);
                
                // Update all statistics with real data
                this.renderRealStatistics(stats);
                
                // Render charts with real data
                this.renderRealCharts(stats);
                
                console.log('🎯 Real statistics and charts rendered');
            } else {
                console.error('❌ Failed to load statistics:', response.status, response.statusText);
                this.showPlaceholderStats();
            }
        } catch (error) {
            console.error('� Error loading statistics:', error);
            this.showPlaceholderStats();
        }
    }

    renderRealStatistics(stats) {
        console.log('📊 Rendering real statistics data:', stats);
        
        try {
            // Update overview metrics with real data
            if (stats.overview) {
                this.updateElement('statsTotalUsers', stats.overview.totalUsers?.toLocaleString() || '0');
                this.updateElement('statsTotalMessages', stats.overview.totalMessages?.toLocaleString() || '0');
                this.updateElement('statsTotalConversations', stats.overview.totalConversations?.toLocaleString() || '0');
                this.updateElement('statsActiveUsers', stats.overview.activeUsers?.toLocaleString() || '0');
            }

            // Update growth percentages with real data
            if (stats.growth) {
                this.updateElement('statsUserGrowth', `${stats.growth.userGrowth || 0}%`);
                this.updateElement('statsMessageGrowth', `${stats.growth.messageGrowth || 0}%`);
                this.updateElement('statsConversationGrowth', `${stats.growth.conversationGrowth || 0}%`);
                this.updateElement('statsActiveGrowth', `${stats.growth.activeGrowth || 0}%`);
            }

            // Update user statistics with real data
            if (stats.users) {
                this.updateElement('statsRegisteredUsers', stats.users.registered?.toLocaleString() || '0');
                this.updateElement('statsVerifiedUsers', stats.users.verified?.toLocaleString() || '0');
                this.updateElement('statsAdminUsers', (stats.users.admin + stats.users.superAdmin || 0).toLocaleString());
                this.updateElement('statsBannedUsers', stats.users.banned?.toLocaleString() || '0');
                this.updateElement('stats2FAUsers', stats.users.twoFactor?.toLocaleString() || '0');
                this.updateElement('statsRecentLogins', stats.users.recentLogins?.toLocaleString() || '0');
            }

            // Update performance metrics with real data
            if (stats.performance) {
                this.updateElement('statsAvgMessages', stats.performance.avgMessagesPerUser || '0');
                this.updateElement('statsAvgConversations', stats.performance.avgConversationsPerUser || '0');
                this.updateElement('statsPeakHour', stats.performance.peakHour || 'N/A');
                this.updateElement('statsDatabaseSize', stats.performance.databaseSize || 'N/A');
                this.updateElement('statsStorageUsed', stats.performance.storageUsed || 'N/A');
                
                // Format uptime from seconds to readable format
                if (stats.performance.uptime) {
                    const uptime = this.formatUptime(stats.performance.uptime);
                    this.updateElement('statsUptime', uptime);
                }
            }

            // Update last updated timestamp
            if (stats.lastUpdated) {
                const lastUpdated = new Date(stats.lastUpdated).toLocaleString();
                this.updateElement('statsLastUpdated', lastUpdated);
            }

            console.log('✅ Real statistics data rendered successfully');
        } catch (error) {
            console.error('❌ Error rendering real statistics:', error);
        }
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            console.log(`✅ Updated ${id}: ${value}`);
        } else {
            console.warn(`⚠️ Element not found: ${id}`);
        }
    }

    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    showPlaceholderStats() {
        console.log('📋 Showing placeholder statistics as fallback');
        
        // Generate placeholder statistics data
        const placeholderStats = {
            overview: {
                totalUsers: 1247,
                totalMessages: 24873,
                totalConversations: 5892,
                activeUsers: 324
            },
            growth: {
                userGrowth: 12.5,
                messageGrowth: 18.3,
                conversationGrowth: 9.7,
                activeGrowth: 5.2
            },
            users: {
                registered: 1247,
                verified: 1089,
                admin: 2,
                superAdmin: 1,
                banned: 12,
                twoFactor: 234,
                recentLogins: 89
            },
            performance: {
                avgMessagesPerUser: 19.9,
                avgConversationsPerUser: 4.7,
                peakHour: '2:00 PM',
                databaseSize: '2.4 MB',
                storageUsed: '0.002 GB',
                uptime: 432000 // 5 days in seconds
            },
            lastUpdated: new Date().toISOString()
        };

        // Render placeholder statistics
        this.renderRealStatistics(placeholderStats);
        
        // Show placeholder charts
        this.showPlaceholderCharts();
    }

    generatePlaceholderChartData() {
        const today = new Date();
        const userGrowthData = [];
        const messageActivityData = [];

        // Generate 7 days of data
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            
            userGrowthData.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                count: Math.floor(Math.random() * 15) + 5 // 5-20 new users per day
            });
            
            messageActivityData.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                count: Math.floor(Math.random() * 50) + 20 // 20-70 messages per day
            });
        }

        return {
            userGrowth: userGrowthData,
            messageActivity: messageActivityData
        };
    }

    loadTestCharts() {
        console.log('📊 Loading test charts...');
        
        // Simple test data
        const testData = {
            userGrowth: [
                { date: 'Sep 8', count: 5 },
                { date: 'Sep 9', count: 8 },
                { date: 'Sep 10', count: 12 },
                { date: 'Sep 11', count: 15 },
                { date: 'Sep 12', count: 10 },
                { date: 'Sep 13', count: 18 },
                { date: 'Sep 14', count: 22 }
            ],
            messageActivity: [
                { date: 'Sep 8', count: 25 },
                { date: 'Sep 9', count: 32 },
                { date: 'Sep 10', count: 45 },
                { date: 'Sep 11', count: 38 },
                { date: 'Sep 12', count: 52 },
                { date: 'Sep 13', count: 41 },
                { date: 'Sep 14', count: 65 }
            ]
        };

        try {
            this.renderCharts(testData);
            console.log('✅ Test charts rendered successfully');
        } catch (error) {
            console.error('❌ Error rendering test charts:', error);
        }
    }

    renderRealStatistics(stats) {
        // Update overview metrics using correct element IDs
        document.getElementById('statsTotalUsers').textContent = stats.overview?.totalUsers?.toLocaleString() || '0';
        document.getElementById('statsTotalMessages').textContent = stats.overview?.totalMessages?.toLocaleString() || '0';
        document.getElementById('statsTotalConversations').textContent = stats.overview?.totalConversations?.toLocaleString() || '0';
        document.getElementById('statsActiveUsers').textContent = stats.overview?.activeUsers?.toLocaleString() || '0';

        // Update growth percentages (calculate from data if available)
        document.getElementById('statsUserGrowth').textContent = stats.growth?.userGrowth || '0';
        document.getElementById('statsMessageGrowth').textContent = stats.growth?.messageGrowth || '0';
        document.getElementById('statsConversationGrowth').textContent = stats.growth?.conversationGrowth || '0';
        document.getElementById('statsActiveGrowth').textContent = stats.growth?.activeGrowth || '0';

        // Update user statistics
        document.getElementById('statsRegisteredUsers').textContent = stats.users?.registered?.toLocaleString() || '0';
        document.getElementById('statsVerifiedUsers').textContent = stats.users?.verified?.toLocaleString() || '0';
        document.getElementById('statsAdminUsers').textContent = stats.users?.admin?.toLocaleString() || '0';
        document.getElementById('statsBannedUsers').textContent = stats.users?.banned?.toLocaleString() || '0';
        document.getElementById('stats2FAUsers').textContent = stats.users?.twoFactor?.toLocaleString() || '0';
        document.getElementById('statsRecentLogins').textContent = stats.users?.recentLogins?.toLocaleString() || '0';

        // Update performance metrics
        document.getElementById('statsAvgMessages').textContent = stats.performance?.avgMessagesPerUser || '0';
        document.getElementById('statsAvgConversations').textContent = stats.performance?.avgConversationsPerUser || '0';
        document.getElementById('statsPeakHour').textContent = stats.performance?.peakHour || 'N/A';
        document.getElementById('statsDatabaseSize').textContent = stats.performance?.databaseSize || 'N/A';
        document.getElementById('statsStorageUsed').textContent = stats.performance?.storageUsed || 'N/A';
        
        // Format uptime
        if (stats.performance?.uptime) {
            const uptime = stats.performance.uptime;
            const days = Math.floor(uptime / 86400);
            const hours = Math.floor((uptime % 86400) / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            document.getElementById('statsUptime').textContent = `${days}d ${hours}h ${minutes}m`;
        } else {
            document.getElementById('statsUptime').textContent = 'N/A';
        }

        // Update last updated time
        document.getElementById('statsLastUpdated').textContent = new Date(stats.lastUpdated || Date.now()).toLocaleString();
    }

    renderRealCharts(stats) {
        console.log('📈 Rendering real charts with data:', stats.charts);
        
        try {
            // Destroy existing charts if they exist
            if (window.userGrowthChart) {
                window.userGrowthChart.destroy();
            }
            if (window.messageActivityChart) {
                window.messageActivityChart.destroy();
            }

            // User Growth Chart with real data
            const userCtx = document.getElementById('userGrowthChart');
            if (userCtx && stats.charts && stats.charts.userGrowth) {
                const userGrowthData = stats.charts.userGrowth;
                const labels = userGrowthData.map(item => {
                    const date = new Date(item.date);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                });
                const data = userGrowthData.map(item => item.count);
                
                console.log('📊 User Growth Chart - Labels:', labels);
                console.log('📊 User Growth Chart - Data:', data);

                window.userGrowthChart = new Chart(userCtx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'New Users',
                            data: data,
                            borderColor: '#3B82F6',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: '#3B82F6',
                            pointBorderColor: '#ffffff',
                            pointBorderWidth: 2,
                            pointRadius: 5
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: true,
                                position: 'top'
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                grid: {
                                    color: 'rgba(0, 0, 0, 0.1)'
                                }
                            },
                            x: {
                                grid: {
                                    color: 'rgba(0, 0, 0, 0.1)'
                                }
                            }
                        }
                    }
                });
                console.log('✅ Real user growth chart created');
            }

            // Message Activity Chart with real data
            const messageCtx = document.getElementById('messageActivityChart');
            if (messageCtx && stats.charts && stats.charts.messageActivity) {
                const messageActivityData = stats.charts.messageActivity;
                const labels = messageActivityData.map(item => item.date);
                const data = messageActivityData.map(item => item.count);
                
                console.log('📊 Message Activity Chart - Labels:', labels);
                console.log('📊 Message Activity Chart - Data:', data);

                window.messageActivityChart = new Chart(messageCtx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Messages',
                            data: data,
                            backgroundColor: 'rgba(16, 185, 129, 0.8)',
                            borderColor: '#10B981',
                            borderWidth: 2,
                            borderRadius: 4,
                            borderSkipped: false,
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: true,
                                position: 'top'
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                grid: {
                                    color: 'rgba(0, 0, 0, 0.1)'
                                }
                            },
                            x: {
                                grid: {
                                    color: 'rgba(0, 0, 0, 0.1)'
                                }
                            }
                        }
                    }
                });
                console.log('✅ Real message activity chart created');
            }

            console.log('🎯 All real charts rendered successfully');
        } catch (error) {
            console.error('❌ Error rendering real charts:', error);
            // Fallback to placeholder charts
            this.showPlaceholderCharts();
        }
    }

    showPlaceholderCharts() {
        console.log('📋 Showing placeholder charts as fallback');
        
        // Generate placeholder data
        const placeholderUserGrowth = [
            { date: 'Dec 7', count: 2 },
            { date: 'Dec 8', count: 5 },
            { date: 'Dec 9', count: 3 },
            { date: 'Dec 10', count: 8 },
            { date: 'Dec 11', count: 4 },
            { date: 'Dec 12', count: 7 },
            { date: 'Dec 13', count: 6 }
        ];

        const placeholderMessageActivity = [
            { date: 'Mon', count: 12 },
            { date: 'Tue', count: 25 },
            { date: 'Wed', count: 18 },
            { date: 'Thu', count: 32 },
            { date: 'Fri', count: 28 },
            { date: 'Sat', count: 15 },
            { date: 'Sun', count: 22 }
        ];

        // Render placeholder charts
        this.renderRealCharts({
            charts: {
                userGrowth: placeholderUserGrowth,
                messageActivity: placeholderMessageActivity
            }
        });
    }

    renderStatistics(stats) {
        // Handle both old and new data structure formats
        const overview = stats.overview || stats;
        const growth = stats.growth || {};
        const users = stats.users || {};
        const performance = stats.performance || {};

        // Update overview metrics
        document.getElementById('statsTotalUsers').textContent = (overview.totalUsers || users.total || 0).toLocaleString();
        document.getElementById('statsTotalMessages').textContent = (overview.totalMessages || stats.messages?.total || 0).toLocaleString();
        document.getElementById('statsTotalConversations').textContent = (overview.totalConversations || stats.conversations?.total || 0).toLocaleString();
        document.getElementById('statsActiveUsers').textContent = (overview.activeUsers || users.active || 0).toLocaleString();

        // Update growth percentages
        document.getElementById('statsUserGrowth').textContent = growth.userGrowth || '0';
        document.getElementById('statsMessageGrowth').textContent = growth.messageGrowth || '0';
        document.getElementById('statsConversationGrowth').textContent = growth.conversationGrowth || '0';
        document.getElementById('statsActiveGrowth').textContent = growth.activeGrowth || '0';

        // Update user statistics
        document.getElementById('statsRegisteredUsers').textContent = (users.registered || users.total || 0).toLocaleString();
        document.getElementById('statsVerifiedUsers').textContent = (users.verified || 0).toLocaleString();
        document.getElementById('statsAdminUsers').textContent = (users.admin || 0).toLocaleString();
        document.getElementById('statsBannedUsers').textContent = (users.banned || 0).toLocaleString();
        document.getElementById('stats2FAUsers').textContent = (users.twoFactor || 0).toLocaleString();
        document.getElementById('statsRecentLogins').textContent = (users.recentLogins || stats.activity?.recentLogins || 0).toLocaleString();

        // Update performance metrics
        document.getElementById('statsAvgMessages').textContent = performance.avgMessagesPerUser || '0';
        document.getElementById('statsAvgConversations').textContent = performance.avgConversationsPerUser || '0';
        document.getElementById('statsPeakHour').textContent = performance.peakHour || 'N/A';
        document.getElementById('statsDatabaseSize').textContent = performance.databaseSize || stats.system?.databaseSize || 'N/A';
        document.getElementById('statsStorageUsed').textContent = performance.storageUsed || stats.system?.storageUsed || 'N/A';
        
        // Format uptime
        const uptime = performance.uptime || stats.system?.uptime;
        if (uptime) {
            const days = Math.floor(uptime / 86400);
            const hours = Math.floor((uptime % 86400) / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            document.getElementById('statsUptime').textContent = `${days}d ${hours}h ${minutes}m`;
        } else {
            document.getElementById('statsUptime').textContent = 'N/A';
        }

        // Update last updated time
        document.getElementById('statsLastUpdated').textContent = new Date(stats.lastUpdated || Date.now()).toLocaleString();
    }

    renderCharts(chartData) {
        console.log('📈 Starting chart rendering with data:', chartData);
        
        // User Growth Chart
        const userGrowthCanvas = document.getElementById('userGrowthChart');
        if (!userGrowthCanvas) {
            console.error('❌ userGrowthChart canvas not found');
            return;
        }
        
        const userGrowthCtx = userGrowthCanvas.getContext('2d');
        console.log('🎨 Got user growth chart context');
        
        // Destroy existing chart if it exists
        if (this.userGrowthChart) {
            this.userGrowthChart.destroy();
            console.log('🗑️ Destroyed existing user growth chart');
        }

        try {
            this.userGrowthChart = new Chart(userGrowthCtx, {
                type: 'line',
                data: {
                    labels: chartData.userGrowth.map(item => item.date),
                    datasets: [{
                        label: 'New Users',
                        data: chartData.userGrowth.map(item => item.count),
                        borderColor: '#3B82F6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#3B82F6',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                color: '#374151',
                                font: {
                                    size: 14,
                                    weight: '500'
                                },
                                padding: 20
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            titleColor: '#374151',
                            bodyColor: '#6B7280',
                            borderColor: '#E5E7EB',
                            borderWidth: 1,
                            cornerRadius: 8,
                            displayColors: false
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: true,
                                color: 'rgba(229, 231, 235, 0.5)'
                            },
                            ticks: {
                                color: '#6B7280',
                                font: {
                                    size: 12
                                }
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                display: true,
                                color: 'rgba(229, 231, 235, 0.5)'
                            },
                            ticks: {
                                maxTicksLimit: 6,
                                precision: 0,
                                color: '#6B7280',
                                font: {
                                    size: 12
                                }
                            }
                        }
                    }
                }
            });
            console.log('✅ User growth chart created successfully');
        } catch (error) {
            console.error('❌ Error creating user growth chart:', error);
        }

        // Message Activity Chart
        const messageActivityCanvas = document.getElementById('messageActivityChart');
        if (!messageActivityCanvas) {
            console.error('❌ messageActivityChart canvas not found');
            return;
        }
        
        const messageActivityCtx = messageActivityCanvas.getContext('2d');
        console.log('🎨 Got message activity chart context');
        
        // Destroy existing chart if it exists
        if (this.messageActivityChart) {
            this.messageActivityChart.destroy();
            console.log('🗑️ Destroyed existing message activity chart');
        }

        try {
            this.messageActivityChart = new Chart(messageActivityCtx, {
                type: 'bar',
                data: {
                    labels: chartData.messageActivity.map(item => item.date),
                    datasets: [{
                        label: 'Messages',
                        data: chartData.messageActivity.map(item => item.count),
                        backgroundColor: 'rgba(16, 185, 129, 0.8)',
                        borderColor: '#10B981',
                        borderWidth: 0,
                        borderRadius: 6,
                        borderSkipped: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                color: '#374151',
                                font: {
                                    size: 14,
                                    weight: '500'
                                },
                                padding: 20
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            titleColor: '#374151',
                            bodyColor: '#6B7280',
                            borderColor: '#E5E7EB',
                            borderWidth: 1,
                            cornerRadius: 8,
                            displayColors: false
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#6B7280',
                                font: {
                                    size: 12
                                }
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                display: true,
                                color: 'rgba(229, 231, 235, 0.5)'
                            },
                            ticks: {
                                maxTicksLimit: 6,
                                precision: 0,
                                color: '#6B7280',
                                font: {
                                    size: 12
                                }
                            }
                        }
                    }
                }
            });
            console.log('✅ Message activity chart created successfully');
        } catch (error) {
            console.error('❌ Error creating message activity chart:', error);
        }
    }

    async exportStatistics() {
        try {
            const response = await fetch('/api/admin/statistics/export', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                },
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `statistics_report_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                alert('Failed to export statistics');
            }
        } catch (error) {
            alert('Failed to export statistics');
        }
    }

    loadStatistics() {
        this.loadDetailedStatistics();
    }

    async loadDetailedStatistics() {
        try {
            const response = await fetch('/api/admin/statistics', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                },
            });

            if (response.ok) {
                const stats = await response.json();
                this.renderStatistics(stats);
                this.renderCharts(stats.charts);
            } else {
                console.error('Failed to load statistics');
            }
        } catch (error) {
            console.error('Failed to load statistics:', error);
        }
    }

    renderStatistics(stats) {
        // Update total stats
        document.getElementById('statsTotalUsers').textContent = stats.totalUsers;
        document.getElementById('statsTotalMessages').textContent = stats.totalMessages;
        document.getElementById('statsTotalConversations').textContent = stats.totalConversations;
        document.getElementById('statsActiveUsers').textContent = stats.activeUsers;
        
        // Update growth percentages
        document.getElementById('statsUserGrowth').textContent = stats.userGrowth;
        document.getElementById('statsMessageGrowth').textContent = stats.messageGrowth;
        document.getElementById('statsConversationGrowth').textContent = stats.conversationGrowth;
        document.getElementById('statsActiveGrowth').textContent = stats.activeGrowth;
        
        // Update detailed statistics
        document.getElementById('statsRegisteredUsers').textContent = stats.registeredUsers;
        document.getElementById('statsVerifiedUsers').textContent = stats.verifiedUsers;
        document.getElementById('statsAdminUsers').textContent = stats.adminUsers;
        document.getElementById('statsBannedUsers').textContent = stats.bannedUsers;
        document.getElementById('stats2FAUsers').textContent = stats.twoFAUsers;
        document.getElementById('statsRecentLogins').textContent = stats.recentLogins;
        
        // Update performance metrics
        document.getElementById('statsAvgMessages').textContent = stats.avgMessages;
        document.getElementById('statsAvgConversations').textContent = stats.avgConversations;
        document.getElementById('statsPeakHour').textContent = stats.peakHour;
        document.getElementById('statsDatabaseSize').textContent = stats.databaseSize;
        document.getElementById('statsStorageUsed').textContent = stats.storageUsed;
        document.getElementById('statsUptime').textContent = stats.uptime;
    }

    renderCharts(chartData) {
        // Render user growth chart
        if (chartData.userGrowth) {
            this.renderUserGrowthChart(chartData.userGrowth);
        }
        
        // Render message activity chart
        if (chartData.messageActivity) {
            this.renderMessageActivityChart(chartData.messageActivity);
        }
    }

    renderUserGrowthChart(data) {
        const ctx = document.getElementById('userGrowthChart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.userGrowthChart) {
            this.userGrowthChart.destroy();
        }

        this.userGrowthChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'New Users',
                    data: data.data,
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.1,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            maxTicksLimit: 6,
                            precision: 0
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    renderMessageActivityChart(data) {
        const ctx = document.getElementById('messageActivityChart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.messageActivityChart) {
            this.messageActivityChart.destroy();
        }

        this.messageActivityChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Messages',
                    data: data.data,
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: 'rgb(16, 185, 129)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            maxTicksLimit: 6,
                            precision: 0
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    async exportStatistics() {
        try {
            const response = await fetch('/api/admin/export/statistics', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                },
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `statistics_report_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                alert('Failed to export statistics');
            }
        } catch (error) {
            alert('Failed to export statistics');
        }
    }
}

// Initialize the admin portal
const adminPortal = new AdminPortal();
