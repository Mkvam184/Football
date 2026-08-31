import { db, ref, get, remove, update, push } from "../../data/Firebase.js";

// Khai báo biến toàn cục
let allUsers = {};
let allBlogs = {};
let totalMatchesCount = 0;
let totalReportsCount = 0;
let currentAdminName = "Admin";

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Tải hồ sơ Admin đang đăng nhập
    await loadAdminProfile();

    // 2. Tải toàn bộ dữ liệu từ Firebase
    await loadDashboardData();

    // 3. Lắng nghe ô tìm kiếm người dùng
    setupSearchUser();

    // 4. Khởi tạo chức năng đổi mật khẩu Admin
    initChangePasswordFeature();
});

// 1. TẢI HỒ SƠ ADMIN ĐANG ĐĂNG NHẬP
async function loadAdminProfile() {
    const currentUserId = sessionStorage.getItem('currentUserId');
    
    if (!currentUserId) {
        alert("Vui lòng đăng nhập tài khoản Admin!");
        sessionStorage.clear();
        window.location.href = new URL('../../index.html', import.meta.url).href;
        return;
    }

    try {
        const [userSnap, listSnap] = await Promise.all([
            get(ref(db, `account_inform/${currentUserId}`)),
            get(ref(db, `account_lists/${currentUserId}`))
        ]);

        const listData = listSnap.exists() ? listSnap.val() : {};
        const currentRole = listData.role || listData.Role || 'user';

        if (currentRole.toLowerCase() !== 'admin') {
            alert("Tài khoản của bạn đã bị hủy quyền Admin! Đang chuyển hướng...");
            sessionStorage.clear();
            window.location.href = new URL('../../index.html', import.meta.url).href;
            return;
        }

        if (userSnap.exists()) {
            const userData = userSnap.val();
            currentAdminName = userData.name || userData.Username || 'Admin';
            const username = userData.name || userData.Username || 'Admin';
            
            const displayNameEl = document.getElementById('admin-display-name');
            const adminTagEl = document.getElementById('admin-tag');
            const avatarEl = document.getElementById('admin-avatar');

            if (displayNameEl) displayNameEl.textContent = username;
            if (adminTagEl) adminTagEl.textContent = `@${username.toLowerCase()}`;
            if (avatarEl) avatarEl.textContent = username.charAt(0).toUpperCase();
        }
    } catch (err) {
        console.error("Lỗi tải thông tin Admin:", err);
    }
}

// HÀM GHI NHẬT KÝ LỊCH SỬ LÊN FIREBASE
async function logActivity(action, target, details) {
    try {
        const historyRef = ref(db, 'system_history');
        const now = new Date();
        const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} - ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getFullYear()}`;
        
        await push(historyRef, {
            admin: currentAdminName,
            action: action,     
            target: target,     
            details: details,   
            timestamp: timeString,
            createdAt: Date.now()
        });
    } catch (err) {
        console.error("Lỗi lưu history:", err);
    }
}

// 2. TẢI VÀ RENDER TẤT CẢ DỮ LIỆU
async function loadDashboardData() {
    try {
        // Tải danh sách Users, Lists, Blogs, Tournaments (để đếm trận đấu), Reports và History
        const [usersSnap, listsSnap, blogsSnap, tournamentsSnap, reportsSnap, historySnap] = await Promise.all([
            get(ref(db, 'account_inform')),
            get(ref(db, 'account_lists')),
            get(ref(db, 'blogs')),
            get(ref(db, 'tournaments')),
            get(ref(db, 'reports')),
            get(ref(db, 'system_history'))
        ]);

        const rawUsers = usersSnap.exists() ? usersSnap.val() : {};
        const accountLists = listsSnap.exists() ? listsSnap.val() : {};
        const historyLogs = historySnap.exists() ? historySnap.val() : {};

        allBlogs = blogsSnap.exists() ? blogsSnap.val() : {};

        // 📌 1. Đếm tổng số trận đấu trong tất cả các giải đấu (/tournaments)
        totalMatchesCount = 0;
        if (tournamentsSnap.exists()) {
            const tournamentsData = tournamentsSnap.val();
            Object.keys(tournamentsData).forEach(tourKey => {
                const tour = tournamentsData[tourKey];
                const fixtures = tour.fixtures || tour.matches || [];
                const fixtureList = Array.isArray(fixtures) ? fixtures : Object.values(fixtures);
                totalMatchesCount += fixtureList.length;
            });
        }

        // 📌 2. Đếm tổng số báo cáo vi phạm (/reports)
        totalReportsCount = 0;
        if (reportsSnap.exists()) {
            const reportsData = reportsSnap.val();
            totalReportsCount = Array.isArray(reportsData) 
                ? reportsData.filter(Boolean).length 
                : Object.keys(reportsData).length;
        }

        // 📌 3. Ghép Role vào User Data
        allUsers = {};
        for (let key in rawUsers) {
            allUsers[key] = {
                ...rawUsers[key],
                role: accountLists[key]?.role || accountLists[key]?.Role || rawUsers[key]?.role || 'user'
            };
        }

        // Cập nhật các ô số liệu thống kê
        updateStatCards();

        // Render danh sách tài khoản, bài viết & nhật ký
        renderUserTable(allUsers);
        renderNewsList(allBlogs);
        renderHistoryList(historyLogs);

    } catch (err) {
        console.error("Lỗi khi tải dữ liệu hệ thống:", err);
    }
}

// 3. CẬP NHẬT CARDS THỐNG KÊ (4 Ô SỐ LIỆU)
function updateStatCards() {
    const totalUsers = Object.keys(allUsers).length;
    const totalPosts = Object.keys(allBlogs).length;

    const userStat = document.getElementById('stat-total-users');
    const postStat = document.getElementById('stat-total-posts');
    const matchStat = document.getElementById('stat-total-matches');
    const reportStat = document.getElementById('stat-total-reports');

    if (userStat) userStat.textContent = totalUsers;
    if (postStat) postStat.textContent = totalPosts;
    if (matchStat) matchStat.textContent = totalMatchesCount;
    if (reportStat) reportStat.textContent = totalReportsCount;
}

// HÀM HIỂN THỊ DANH SÁCH LỊCH SỬ
function renderHistoryList(historyObj) {
    const historyContainer = document.getElementById('admin-history-list');
    if (!historyContainer) return;

    const keys = Object.keys(historyObj).sort((a, b) => (historyObj[b].createdAt || 0) - (historyObj[a].createdAt || 0));
    
    if (keys.length === 0) {
        historyContainer.innerHTML = `<p class="text-xs text-gray-400 text-center py-4">Chưa có hoạt động nào được ghi nhận.</p>`;
        return;
    }

    historyContainer.innerHTML = keys.map(key => {
        const log = historyObj[key];
        
        let badgeColor = "bg-blue-900/50 text-blue-400 border-blue-700/50";
        if (log.action.includes("Xóa")) badgeColor = "bg-red-900/50 text-red-400 border-red-700/50";
        if (log.action.includes("Đổi") || log.action.includes("Mật khẩu")) badgeColor = "bg-yellow-900/50 text-yellow-400 border-yellow-700/50";

        return `
            <div class="bg-[#134E22]/60 p-3 rounded-xl border border-[#1e7e34] flex justify-between items-center text-xs">
                <div>
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-white">${log.admin}</span>
                        <span class="text-[10px] px-2 py-0.5 rounded border ${badgeColor} font-bold">${log.action}</span>
                    </div>
                    <p class="text-gray-300 text-[11px] mt-1">${log.details}</p>
                </div>
                <span class="text-[10px] text-gray-400 whitespace-nowrap ml-2">${log.timestamp}</span>
            </div>
        `;
    }).join('');
}

// 4. RENDER BẢNG QUẢN LÝ TÀI KHOẢN
function renderUserTable(usersObj) {
    const tbody = document.getElementById('user-table-body');
    if (!tbody) return;

    const userKeys = Object.keys(usersObj);
    if (userKeys.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-gray-400">Chưa có người dùng nào.</td></tr>`;
        return;
    }

    tbody.innerHTML = userKeys.map(key => {
        const user = usersObj[key];
        const username = user.name || user.username || 'N/A';
        const role = user.role || 'user';
        const initial = username.charAt(0).toUpperCase();

        const roleBadge = role.toLowerCase() === 'admin' 
            ? `<span class="bg-yellow-900/50 text-yellow-400 text-xs px-2 py-0.5 rounded border border-yellow-700/50 font-bold">Admin</span>`
            : `<span class="bg-green-900/50 text-green-400 text-xs px-2 py-0.5 rounded border border-green-700/50 font-medium">User</span>`;

        return `
            <tr>
                <td class="py-3 px-2 flex items-center gap-2">
                    <div class="w-7 h-7 rounded-full bg-[#FF4500] flex items-center justify-center font-black text-xs text-white">
                        ${initial}
                    </div>
                    <div>
                        <div class="font-bold text-white">${username}</div>
                        <div class="text-[10px] text-gray-400">ID: ${key}</div>
                    </div>
                </td>
                <td class="py-3 px-2">
                    ${roleBadge}
                </td>
                <td class="py-3 px-2 text-center">
                    <button data-id="${key}" data-role="${role}" class="btn-toggle-role text-xs bg-yellow-600 hover:bg-yellow-500 text-white px-2 py-1 rounded mr-1 transition-colors cursor-pointer">
                        Đổi Role
                    </button>
                    <button data-id="${key}" class="btn-delete-user text-xs bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded transition-colors cursor-pointer">
                        Xóa
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    attachUserTableEvents();
}

// Bắt sự kiện Xóa / Đổi quyền cho User
function attachUserTableEvents() {
    document.querySelectorAll('.btn-delete-user').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const userId = e.target.getAttribute('data-id');
            const targetUserName = allUsers[userId]?.name || allUsers[userId]?.username || userId;

            if (userId.toLowerCase().includes('admin')) {
                alert("Tài khoản này là Super Admin, không thể xóa!");
                return;
            }
            else if (confirm(`⚠️ Bạn có chắc muốn xóa người dùng này (ID: ${userId})?`)) {
                try {
                    await Promise.all([
                        remove(ref(db, `account_inform/${userId}`)),
                        remove(ref(db, `account_lists/${userId}`))
                    ]);

                    await logActivity("Xóa User", targetUserName, `Đã xóa tài khoản: ${targetUserName} (ID: ${userId})`);

                    alert("Đã xóa người dùng thành công!");
                    loadDashboardData();
                } catch (err) {
                    alert("Lỗi khi xóa: " + err.message);
                }
            }
        });
    });

    document.querySelectorAll('.btn-toggle-role').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const userId = e.target.getAttribute('data-id');
            const currentRole = e.target.getAttribute('data-role');
            
            const targetUserName = allUsers[userId]?.name || allUsers[userId]?.username || userId;
            const newRole = (currentRole.toLowerCase() === 'admin') ? 'user' : 'admin';

            if (userId.toLowerCase().includes('admin')) {
                alert("Tài khoản này là Super Admin, không thể thay đổi!");
                return;
            }
            else if (confirm(`Chuyển quyền tài khoản thành [${newRole.toUpperCase()}]?`)) {
                try {
                    await update(ref(db, `account_lists/${userId}`), { role: newRole });
                    
                    await logActivity("Đổi Quyền", targetUserName, `Đổi vai trò của ${targetUserName} thành [${newRole.toUpperCase()}]`);

                    alert("Cập nhật quyền thành công!");
                    loadDashboardData();
                } catch (err) {
                    alert("Lỗi khi cập nhật quyền: " + err.message);
                }
            }
        });
    });
}

// 5. RENDER BẢNG BÀI VIẾT QUẢN LÝ
function renderNewsList(blogsObj) {
    const newsContainer = document.getElementById('admin-news-list');
    if (!newsContainer) return;

    const newsKeys = Object.keys(blogsObj).reverse();
    if (newsKeys.length === 0) {
        newsContainer.innerHTML = `<p class="text-xs text-gray-400">Chưa có bài viết nào.</p>`;
        return;
    }

    newsContainer.innerHTML = newsKeys.map(key => {
        const item = blogsObj[key];
        return `
            <div class="bg-[#134E22] p-4 rounded-xl border border-[#1e7e34] flex justify-between items-center hover:border-[#FF4500] transition-all">
                <div>
                    <span class="text-[10px] font-bold text-[#FF4500] uppercase">${item.category || 'Tin tức'}</span>
                    <h4 class="font-bold text-sm text-white line-clamp-1">${item.title}</h4>
                    <span class="text-[10px] text-gray-400">Đăng ngày: ${item.date || 'Mới đây'}</span>
                </div>
                <div class="flex gap-2">
                    <button data-id="${key}" data-title="${item.title || key}" class="btn-delete-blog p-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs transition-colors cursor-pointer">
                        🗑️ Xóa
                    </button>
                </div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.btn-delete-blog').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const blogId = e.target.getAttribute('data-id');
            const blogTitle = e.target.getAttribute('data-title') || blogId; 

            if (confirm('⚠️ Bạn có muốn xóa bài viết này không?')) {
                try {
                    await remove(ref(db, `blogs/${blogId}`));
                    
                    await logActivity("Xóa Bài Viết", blogTitle, `Đã xóa bài viết: "${blogTitle}"`);
                    
                    alert("Xóa bài viết thành công!");
                    loadDashboardData();
                } catch (err) {
                    alert("Lỗi xóa bài viết: " + err.message);
                }
            }
        });
    });
}

// 6. CHỨC NĂNG TÌM KIẾM NGƯỜI DÙNG
function setupSearchUser() {
    const searchInput = document.getElementById('search-user');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const keyword = e.target.value.trim().toLowerCase();
        
        const filteredUsers = {};
        for (let key in allUsers) {
            const user = allUsers[key];
            const username = (user.name || user.username || '').toLowerCase();
            if (username.includes(keyword) || key.toLowerCase().includes(keyword)) {
                filteredUsers[key] = user;
            }
        }

        renderUserTable(filteredUsers);
    });
}

// 7. ĐỔI MẬT KHẨU ADMIN
function initChangePasswordFeature() {
    const btnOpen = document.getElementById('btn-change-password');
    if (!btnOpen) return;

    if (!document.getElementById('password-modal')) {
        const modalHTML = `
            <div id="password-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md opacity-0 pointer-events-none transition-all duration-300 ease-out">
                <div id="password-modal-card" class="bg-[#0D3B1B] border border-[#166534] w-full max-w-md rounded-2xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.8)] relative transform scale-95 opacity-0 transition-all duration-300 ease-out">
                    
                    <div class="flex justify-between items-center mb-5 border-b border-[#166534]/60 pb-3">
                        <h3 class="text-lg font-black text-white flex items-center gap-2 tracking-wide uppercase">
                            <span class="p-1.5 bg-[#FF4500]/20 rounded-lg text-[#FF4500]">🔒</span> Đổi Mật Khẩu Admin
                        </h3>
                        <button id="btn-close-pass-modal" type="button" class="w-8 h-8 rounded-full bg-[#134E22] hover:bg-red-600 text-gray-300 hover:text-white flex items-center justify-center font-bold text-lg transition-all cursor-pointer">
                            &times;
                        </button>
                    </div>

                    <form id="form-change-password" class="space-y-4" novalidate>
                        <div>
                            <label class="block text-xs text-gray-300 font-semibold mb-1">Mật khẩu hiện tại</label>
                            <div class="relative">
                                <input type="password" id="old-pass" placeholder="••••••••" 
                                    class="w-full bg-[#051C0C] border border-[#166534] focus:border-[#FF4500] text-sm text-white pl-3.5 pr-10 py-2.5 rounded-xl outline-none transition-all shadow-inner">
                                <button type="button" class="btn-toggle-eye absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer text-xs select-none" data-target="old-pass">
                                    👁️
                                </button>
                            </div>
                            <span id="error-old-pass" class="hidden text-[11px] text-red-400 font-medium mt-1 block"></span>
                        </div>

                        <div>
                            <label class="block text-xs text-gray-300 font-semibold mb-1">Mật khẩu mới</label>
                            <div class="relative">
                                <input type="password" id="new-pass" placeholder="••••••••" 
                                    class="w-full bg-[#051C0C] border border-[#166534] focus:border-[#FF4500] text-sm text-white pl-3.5 pr-10 py-2.5 rounded-xl outline-none transition-all shadow-inner">
                                <button type="button" class="btn-toggle-eye absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer text-xs select-none" data-target="new-pass">
                                    👁️
                                </button>
                            </div>
                            <span id="error-new-pass" class="hidden text-[11px] text-red-400 font-medium mt-1 block"></span>
                        </div>

                        <div>
                            <label class="block text-xs text-gray-300 font-semibold mb-1">Xác nhận mật khẩu mới</label>
                            <div class="relative">
                                <input type="password" id="confirm-pass" placeholder="••••••••" 
                                    class="w-full bg-[#051C0C] border border-[#166534] focus:border-[#FF4500] text-sm text-white pl-3.5 pr-10 py-2.5 rounded-xl outline-none transition-all shadow-inner">
                                <button type="button" class="btn-toggle-eye absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer text-xs select-none" data-target="confirm-pass">
                                    👁️
                                </button>
                            </div>
                            <span id="error-confirm-pass" class="hidden text-[11px] text-red-400 font-medium mt-1 block"></span>
                        </div>

                        <div class="flex gap-3 pt-3">
                            <button type="button" id="btn-cancel-pass" 
                                class="w-1/2 py-2.5 bg-[#134E22] hover:bg-gray-700 text-gray-200 rounded-xl text-xs font-bold transition-all border border-[#1e7e34] cursor-pointer active:scale-95">
                                Hủy Bỏ
                            </button>
                            <button type="submit" 
                                class="w-1/2 py-2.5 bg-gradient-to-r from-[#FF4500] to-[#ff5714] hover:brightness-110 text-white rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer active:scale-95">
                                Cập Nhật
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    const modal = document.getElementById('password-modal');
    const modalCard = document.getElementById('password-modal-card');
    const form = document.getElementById('form-change-password');
    const btnClose = document.getElementById('btn-close-pass-modal');
    const btnCancel = document.getElementById('btn-cancel-pass');

    const clearErrors = () => {
        ['old-pass', 'new-pass', 'confirm-pass'].forEach(id => {
            const errEl = document.getElementById(`error-${id}`);
            const inputEl = document.getElementById(id);
            if (errEl) {
                errEl.textContent = '';
                errEl.classList.add('hidden');
            }
            if (inputEl) {
                inputEl.classList.remove('border-red-500');
            }
        });
    };

    const showError = (inputId, message) => {
        const errEl = document.getElementById(`error-${inputId}`);
        const inputEl = document.getElementById(inputId);
        if (errEl && inputEl) {
            errEl.textContent = message;
            errEl.classList.remove('hidden');
            inputEl.classList.add('border-red-500');
            inputEl.focus();
        }
    };

    document.querySelectorAll('.btn-toggle-eye').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const targetInput = document.getElementById(targetId);
            if (!targetInput) return;

            if (targetInput.type === 'password') {
                targetInput.type = 'text';
                btn.textContent = '🔒';
            } else {
                targetInput.type = 'password';
                btn.textContent = '👁️';
            }
        });
    });

    const openModal = () => {
        form.reset();
        clearErrors();
        ['old-pass', 'new-pass', 'confirm-pass'].forEach(id => {
            const input = document.getElementById(id);
            if (input) input.type = 'password';
        });
        document.querySelectorAll('.btn-toggle-eye').forEach(btn => btn.textContent = '👁️');

        modal.classList.remove('opacity-0', 'pointer-events-none');
        modalCard.classList.remove('scale-95', 'opacity-0');
        modalCard.classList.add('scale-100', 'opacity-100');
    };

    const closeModal = () => {
        modalCard.classList.remove('scale-100', 'opacity-100');
        modalCard.classList.add('scale-95', 'opacity-0');
        modal.classList.add('opacity-0', 'pointer-events-none');
    };

    btnOpen.addEventListener('click', openModal);
    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnCancel) btnCancel.addEventListener('click', closeModal);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearErrors();

        const currentUserId = sessionStorage.getItem('currentUserId');
        const oldPass = document.getElementById('old-pass').value.trim();
        const newPass = document.getElementById('new-pass').value.trim();
        const confirmPass = document.getElementById('confirm-pass').value.trim();

        let isValid = true;

        if (!oldPass) {
            showError('old-pass', 'Vui lòng nhập mật khẩu hiện tại!');
            isValid = false;
        }

        if (!newPass) {
            showError('new-pass', 'Vui lòng nhập mật khẩu mới!');
            isValid = false;
        } else if (newPass.length < 6) {
            showError('new-pass', 'Mật khẩu mới phải có ít nhất 6 ký tự!');
            isValid = false;
        }

        if (!confirmPass) {
            showError('confirm-pass', 'Vui lòng xác nhận mật khẩu mới!');
            isValid = false;
        } else if (newPass !== confirmPass) {
            showError('confirm-pass', 'Mật khẩu xác nhận không trùng khớp!');
            isValid = false;
        }

        let password_old = null;
        const snapshot = await get(ref(db, `account_lists/${currentUserId}`));

        if (snapshot.exists()) {
            const data = snapshot.val();
            password_old = data.password;
        }

        if (oldPass !== password_old) {
            showError('old-pass', 'Mật khẩu không trùng với mật khẩu cũ!');
            isValid = false;
        }

        if (!isValid) return;

        try {
            await update(ref(db, `account_lists/${currentUserId}`), {
                password: newPass,
            });

            alert("🎉 Đổi mật khẩu thành công!");
            closeModal();

        } catch (err) {
            console.error("Lỗi đổi mật khẩu:", err);
            showError('confirm-pass', "Lỗi hệ thống: " + err.message);
        }
    });
}