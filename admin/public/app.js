class AdminPortal {
    constructor() {
        this.token = localStorage.getItem('adminToken');
        this.currentPage = 1;
        this.selectedUsers = new Set();
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
            case 'security':
                this.loadSecurityDashboard();
                break;
            case 'statistics':
                this.loadStatistics();
                break;
            case 'database':
                this.loadDatabase();
                break;
            case 'super-admin':
                this.loadSuperAdminSection();
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
                document.getElementById('unverifiedUsers').textContent = data.stats.unverifiedUsers;
                document.getElementById('twoFactorUsers').textContent = data.stats.twoFactorUsers;
                document.getElementById('verificationRate').textContent = `${data.stats.verificationRate}%`;
                document.getElementById('adminCount').textContent = data.stats.adminUsers;
                document.getElementById('activeSessions').textContent = data.stats.activeSessions;

                // Render security events
                this.renderSecurityEvents(data.recentEvents);
            }
        } catch (error) {
            console.error('Failed to load security data:', error);
        }
    }

    renderSecurityEvents(events) {
        const container = document.getElementById('securityEvents');
        
        if (!events || events.length === 0) {
            container.innerHTML = '<p class="text-gray-500">No recent security events</p>';
            return;
        }

        container.innerHTML = events.map(event => `
            <div class="flex items-center space-x-3 p-3 bg-gray-50 rounded">
                <div class="flex-shrink-0">
                    <div class="w-2 h-2 rounded-full ${
                        event.type === 'ban' ? 'bg-red-500' :
                        event.type === 'login_attempt' ? 'bg-yellow-500' :
                        event.type === 'role_change' ? 'bg-blue-500' : 'bg-gray-500'
                    }"></div>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900">${event.description}</p>
                    <p class="text-xs text-gray-500">${new Date(event.timestamp).toLocaleString()}</p>
                </div>
            </div>
        `).join('');
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
            console.error('Error loading statistics:', error);
        }
    }

    renderStatistics(stats) {
        // Update overview metrics
        document.getElementById('statsTotalUsers').textContent = stats.overview.totalUsers.toLocaleString();
        document.getElementById('statsTotalMessages').textContent = stats.overview.totalMessages.toLocaleString();
        document.getElementById('statsTotalConversations').textContent = stats.overview.totalConversations.toLocaleString();
        document.getElementById('statsActiveUsers').textContent = stats.overview.activeUsers.toLocaleString();

        // Update growth percentages
        document.getElementById('statsUserGrowth').textContent = stats.growth.userGrowth;
        document.getElementById('statsMessageGrowth').textContent = stats.growth.messageGrowth;
        document.getElementById('statsConversationGrowth').textContent = stats.growth.conversationGrowth;
        document.getElementById('statsActiveGrowth').textContent = stats.growth.activeGrowth;

        // Update user statistics
        document.getElementById('statsRegisteredUsers').textContent = stats.users.registered.toLocaleString();
        document.getElementById('statsVerifiedUsers').textContent = stats.users.verified.toLocaleString();
        document.getElementById('statsAdminUsers').textContent = stats.users.admin.toLocaleString();
        document.getElementById('statsBannedUsers').textContent = stats.users.banned.toLocaleString();
        document.getElementById('stats2FAUsers').textContent = stats.users.twoFactor.toLocaleString();
        document.getElementById('statsRecentLogins').textContent = stats.users.recentLogins.toLocaleString();

        // Update performance metrics
        document.getElementById('statsAvgMessages').textContent = stats.performance.avgMessagesPerUser;
        document.getElementById('statsAvgConversations').textContent = stats.performance.avgConversationsPerUser;
        document.getElementById('statsPeakHour').textContent = stats.performance.peakHour;
        document.getElementById('statsDatabaseSize').textContent = stats.performance.databaseSize;
        document.getElementById('statsStorageUsed').textContent = stats.performance.storageUsed;
        
        // Format uptime
        const uptime = stats.performance.uptime;
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        document.getElementById('statsUptime').textContent = `${days}d ${hours}h ${minutes}m`;

        // Update last updated time
        document.getElementById('statsLastUpdated').textContent = new Date(stats.lastUpdated).toLocaleString();
    }

    renderCharts(chartData) {
        // User Growth Chart
        const userGrowthCtx = document.getElementById('userGrowthChart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.userGrowthChart) {
            this.userGrowthChart.destroy();
        }

        this.userGrowthChart = new Chart(userGrowthCtx, {
            type: 'line',
            data: {
                labels: chartData.userGrowth.map(item => item.date),
                datasets: [{
                    label: 'New Users',
                    data: chartData.userGrowth.map(item => item.count),
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
                            stepSize: 1
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

        // Message Activity Chart
        const messageActivityCtx = document.getElementById('messageActivityChart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.messageActivityChart) {
            this.messageActivityChart.destroy();
        }

        this.messageActivityChart = new Chart(messageActivityCtx, {
            type: 'bar',
            data: {
                labels: chartData.messageActivity.map(item => item.date),
                datasets: [{
                    label: 'Messages',
                    data: chartData.messageActivity.map(item => item.count),
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
                            stepSize: 1
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

    async loadDatabase() {
        try {
            const response = await fetch('/api/admin/database/info', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                document.getElementById('databaseInfo').innerHTML = `
                    <h3 class="text-lg font-semibold mb-4">Database Information</h3>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <h4 class="font-medium">Database Stats</h4>
                            <p>Data Size: ${(data.database.dataSize / 1024 / 1024).toFixed(2)} MB</p>
                            <p>Index Size: ${(data.database.indexSize / 1024 / 1024).toFixed(2)} MB</p>
                            <p>Objects: ${data.database.objects}</p>
                        </div>
                        <div>
                            <h4 class="font-medium">Collections</h4>
                            <ul class="list-disc list-inside">
                                ${data.collections.map(col => `<li>${col}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Failed to load database info:', error);
        }
    }

    // Super Admin Management Functions
    async loadSuperAdminSection() {
        this.refreshSuperAdminStatus();
    }

    async refreshSuperAdminStatus() {
        try {
            // Update status indicators
            document.getElementById('syncStatus').textContent = 'Checking...';
            
            const response = await fetch('/api/health/super-admin-status', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Update super admin status
                const statusElement = document.getElementById('superAdminStatus');
                if (data.superAdminExists) {
                    statusElement.textContent = '✅ Active';
                    statusElement.className = 'text-sm text-green-600';
                } else {
                    statusElement.textContent = '❌ Not Found';
                    statusElement.className = 'text-sm text-red-600';
                }
                
                // Update sync status
                document.getElementById('syncStatus').textContent = data.syncEnabled ? '🟢 Enabled' : '🔴 Disabled';
                
                // Update last sync time
                const lastSyncElement = document.getElementById('lastSyncTime');
                if (data.lastSync) {
                    lastSyncElement.textContent = new Date(data.lastSync).toLocaleString();
                } else {
                    lastSyncElement.textContent = 'Never';
                }
                
            } else {
                document.getElementById('superAdminStatus').textContent = 'Error checking status';
                document.getElementById('syncStatus').textContent = 'Error';
            }
        } catch (error) {
            console.error('Failed to check super admin status:', error);
            document.getElementById('superAdminStatus').textContent = 'Error';
            document.getElementById('syncStatus').textContent = 'Error';
        }
    }

    async syncSuperAdmin() {
        try {
            document.getElementById('syncStatus').textContent = 'Syncing...';
            
            const response = await fetch('/api/health/sync-super-admin-instant', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.showMessage('Super Admin sync completed successfully!', 'success');
                
                // Refresh status after sync
                setTimeout(() => {
                    this.refreshSuperAdminStatus();
                }, 1000);
                
            } else {
                const error = await response.json();
                this.showMessage(`Sync failed: ${error.error || 'Unknown error'}`, 'error');
                document.getElementById('syncStatus').textContent = 'Sync Failed';
            }
        } catch (error) {
            console.error('Failed to sync super admin:', error);
            this.showMessage('Sync failed: Network error', 'error');
            document.getElementById('syncStatus').textContent = 'Sync Failed';
        }
    }

    async forceEnvironmentSync() {
        if (!confirm('This will force synchronization with Railway environment variables. Continue?')) {
            return;
        }
        
        try {
            document.getElementById('syncStatus').textContent = 'Force syncing...';
            
            const response = await fetch('/api/health/force-env-sync', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.showMessage('Environment sync completed successfully!', 'success');
                
                // Refresh status after sync
                setTimeout(() => {
                    this.refreshSuperAdminStatus();
                }, 1000);
                
            } else {
                const error = await response.json();
                this.showMessage(`Force sync failed: ${error.error || 'Unknown error'}`, 'error');
                document.getElementById('syncStatus').textContent = 'Force Sync Failed';
            }
        } catch (error) {
            console.error('Failed to force sync:', error);
            this.showMessage('Force sync failed: Network error', 'error');
            document.getElementById('syncStatus').textContent = 'Force Sync Failed';
        }
    }

    async cleanupDuplicateEmails() {
        if (!confirm('This will clean up all duplicate email addresses in the database. This action cannot be undone. Continue?')) {
            return;
        }
        
        try {
            this.showMessage('Cleaning up duplicate emails...', 'info');
            
            const response = await fetch('/api/health/cleanup-duplicates', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.showMessage('Duplicate emails cleaned up successfully!', 'success');
                
                // Refresh status after cleanup
                setTimeout(() => {
                    this.refreshSuperAdminStatus();
                    this.loadUsers(); // Refresh user list
                }, 1000);
                
            } else {
                const error = await response.json();
                this.showMessage(`Cleanup failed: ${error.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('Failed to cleanup duplicates:', error);
            this.showMessage('Cleanup failed: Network error', 'error');
        }
    }

    async forceSyncNow() {
        try {
            this.showMessage('Forcing immediate sync...', 'info');
            
            const response = await fetch('/api/health/force-sync', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.showMessage('Immediate sync completed successfully!', 'success');
                
                // Show sync status if available
                if (data.status && data.status.retryQueueSize > 0) {
                    this.showMessage(`Sync completed. ${data.status.retryQueueSize} items in retry queue.`, 'warning');
                }
                
                // Refresh status after sync
                setTimeout(() => {
                    this.refreshSuperAdminStatus();
                }, 1000);
                
            } else {
                const error = await response.json();
                this.showMessage(`Force sync failed: ${error.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('Failed to force sync:', error);
            this.showMessage('Force sync failed: Network error', 'error');
        }
    }

    async getSystemSummary() {
        try {
            this.showMessage('Getting system summary...', 'info');
            
            const response = await fetch('/api/health/super-admin-summary', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            const summary = await response.json();
            
            if (response.ok) {
                this.displaySystemSummary(summary);
                this.showMessage('✅ System summary loaded', 'success');
            } else {
                this.showMessage(summary.error || 'Failed to get summary', 'error');
            }
        } catch (error) {
            this.showMessage('Error getting system summary', 'error');
            console.error('Error:', error);
        }
    }

    displaySystemSummary(summary) {
        // Update UI with comprehensive system information
        if (document.getElementById('currentSuperAdminEmail')) {
            document.getElementById('currentSuperAdminEmail').textContent = 
                summary.currentSuperAdmins[0]?.email || 'None';
        }
        if (document.getElementById('environmentTargetEmail')) {
            document.getElementById('environmentTargetEmail').textContent = 
                summary.environmentEmail || 'Not Set';
        }
        if (document.getElementById('syncStatus')) {
            document.getElementById('syncStatus').textContent = 
                summary.isInSync ? 'Synchronized' : 'Needs Sync';
        }
        if (document.getElementById('systemStatus')) {
            document.getElementById('systemStatus').textContent = 
                this.getStatusDescription(summary.systemStatus);
        }
        
        // Show additional details
        if (summary.currentSuperAdmins.length > 1) {
            this.showMessage(`⚠️ Found ${summary.currentSuperAdmins.length} super admins. System will consolidate automatically.`, 'warning');
        }

        // Show what action will be taken
        if (summary.systemStatus !== 'SYNCHRONIZED') {
            const actionMessage = this.getActionMessage(summary.systemStatus, summary.environmentEmail);
            this.showMessage(actionMessage, 'info');
        }
    }

    getStatusDescription(status) {
        const descriptions = {
            'SYNCHRONIZED': '✅ Perfect',
            'EMAIL_MISMATCH': '🔄 Will Promote User',
            'NO_SUPER_ADMIN': '🆕 Will Create/Promote',
            'MULTIPLE_SUPER_ADMINS': '🧹 Will Cleanup',
            'ENV_VARS_NOT_SET': '❌ Env Vars Missing'
        };
        return descriptions[status] || status;
    }

    getActionMessage(status, envEmail) {
        switch (status) {
            case 'EMAIL_MISMATCH': 
                return `Will promote existing user "${envEmail}" to super admin`;
            case 'NO_SUPER_ADMIN': 
                return `Will create or promote "${envEmail}" as super admin`;
            case 'MULTIPLE_SUPER_ADMINS': 
                return 'Will consolidate multiple super admins into one';
            case 'ENV_VARS_NOT_SET':
                return 'Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD environment variables';
            default: 
                return 'System will be updated on next sync';
        }
    }

    async promoteUserToSuperAdmin() {
        const email = prompt('Enter email of user to promote to super admin:');
        
        if (!email) {
            this.showMessage('Email is required', 'error');
            return;
        }

        if (!confirm(`Are you sure you want to promote "${email}" to super admin? This will demote the current super admin.`)) {
            return;
        }

        try {
            this.showMessage('Promoting user to super admin...', 'info');
            
            const response = await fetch('/api/health/promote-user-to-super-admin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ email })
            });

            const result = await response.json();
            
            if (response.ok) {
                this.showMessage(`✅ Successfully promoted ${email} to super admin!`, 'success');
                await this.getSystemSummary();
                await this.loadUsers(); // Refresh user list
            } else {
                this.showMessage(result.error || 'Failed to promote user', 'error');
            }
        } catch (error) {
            this.showMessage('Error promoting user to super admin', 'error');
            console.error('Error:', error);
        }
    }

    showMessage(message, type = 'info') {
        // Create or update message element
        let messageElement = document.getElementById('adminMessage');
        if (!messageElement) {
            messageElement = document.createElement('div');
            messageElement.id = 'adminMessage';
            messageElement.className = 'fixed top-4 right-4 px-4 py-2 rounded-md shadow-lg z-50';
            document.body.appendChild(messageElement);
        }
        
        // Set message content and styling
        messageElement.textContent = message;
        messageElement.className = 'fixed top-4 right-4 px-4 py-2 rounded-md shadow-lg z-50';
        
        switch (type) {
            case 'success':
                messageElement.className += ' bg-green-500 text-white';
                break;
            case 'error':
                messageElement.className += ' bg-red-500 text-white';
                break;
            case 'warning':
                messageElement.className += ' bg-yellow-500 text-white';
                break;
            default:
                messageElement.className += ' bg-blue-500 text-white';
        }
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            if (messageElement && messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 3000);
    }
}

// Initialize the admin portal
const adminPortal = new AdminPortal();
