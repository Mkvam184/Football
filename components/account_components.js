import { db, ref, set, get } from "../data/Firebase.js";

document.addEventListener('DOMContentLoaded', () => {
    // Danh sách các đội bóng tương tự form đăng ký
    let footballTeams = []

    // Tải tự động danh sách tất cả CLB hiện có trên Firebase
    async function fetchClubsFromFirebase() {
        try {
            const tournamentsSnap = await get(ref(db, 'tournaments'));
            if (tournamentsSnap.exists()) {
                const allLeagues = tournamentsSnap.val();
                const fetchedTeams = new Set();

                Object.keys(allLeagues).forEach(leagueKey => {
                    const league = allLeagues[leagueKey];
                    if (!league) return;

                    // 1. Lấy danh sách teams (Xử lý linh hoạt cho cả Array lẫn Object)
                    if (league.teams) {
                        const teamsList = Array.isArray(league.teams) ? league.teams : Object.values(league.teams);
                        teamsList.forEach(t => {
                            if (t) {
                                // Kiểm tra các thuộc tính phổ biến lưu tên đội bóng
                                const teamName = t.team || t.name || t.teamName || (typeof t === 'string' ? t : '');
                                if (teamName && typeof teamName === 'string') {
                                    fetchedTeams.add(teamName.trim());
                                }
                            }
                        });
                    }

                    // 2. Lấy danh sách từ fixtures / matches (Xử lý linh hoạt cho cả Array lẫn Object)
                    const rawFixtures = league.fixtures || league.matches;
                    if (rawFixtures) {
                        const fixturesList = Array.isArray(rawFixtures) ? rawFixtures : Object.values(rawFixtures);
                        fixturesList.forEach(f => {
                            if (f) {
                                const home = f.teamHome || f.homeTeam;
                                const away = f.teamAway || f.awayTeam;
                                if (home && typeof home === 'string') fetchedTeams.add(home.trim());
                                if (away && typeof away === 'string') fetchedTeams.add(away.trim());
                            }
                        });
                    }
                });

                if (fetchedTeams.size > 0) {
                    footballTeams = Array.from(fetchedTeams).sort((a, b) => a.localeCompare(b));
                } else {
                    console.warn("Không tìm thấy tên CLB nào trong cấu trúc tournaments.");
                }
            }
        } catch (err) {
            console.warn("Dùng danh sách CLB mặc định do không lấy được từ Firebase:", err);
        }
    }

    // Gọi tải dữ liệu CLB
    fetchClubsFromFirebase();

    // HTML Modal Hồ sơ
    const profileModalHTML = `
    <!-- ================= MODAL XEM & CHỈNH SỬA HỒ SƠ TÀI KHOẢN ================= -->
    <div id="user-profile-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm opacity-0 pointer-events-none transition-all duration-300">
      <div id="user-profile-modal-box" class="bg-[#0D3B1B] border border-[#166534] rounded-2xl p-6 sm:p-8 shadow-2xl w-full max-w-md mx-4 relative transform scale-90 translate-y-4 transition-all duration-300 max-h-[90vh] overflow-y-auto">
        
        <!-- Nút đóng X -->
        <button id="close-user-profile-modal" type="button" class="absolute top-4 right-4 text-gray-400 hover:text-white text-xl font-bold cursor-pointer">✕</button>
        
        <!-- Avatar & Tên chính -->
        <div class="text-center mb-6">
            <div class="w-20 h-20 mx-auto mb-3 rounded-full bg-[#134E22] border-2 border-[#FF4500] flex items-center justify-center text-3xl shadow-md">
                ⚽
            </div>
            <h2 id="modal-display-name" class="text-2xl font-black text-white">---</h2>
            <p id="modal-display-username" class="text-xs text-emerald-400 font-semibold mt-0.5">@username</p>
        </div>

        <!-- Trạng thái Loading khi fetch dữ liệu Firebase -->
        <div id="user-profile-loading" class="flex flex-col items-center justify-center py-8 space-y-2">
            <div class="animate-spin rounded-full h-8 w-8 border-3 border-[#FF4500] border-t-transparent"></div>
            <p class="text-gray-400 text-xs">Đang tải thông tin...</p>
        </div>

        <!-- 1. KHỐI HIỂN THỊ CHẾ ĐỘ XEM (VIEW MODE) -->
        <div id="user-profile-data" class="hidden space-y-4">
            <div class="grid grid-cols-2 gap-3 text-sm">
                
                <div class="bg-[#134E22]/60 border border-[#1e7e34] p-3 rounded-xl">
                    <span class="text-[11px] text-gray-400 block">Tên hiển thị</span>
                    <strong id="modal-info-fullname" class="text-white text-sm">---</strong>
                </div>

                <div class="bg-[#134E22]/60 border border-[#1e7e34] p-3 rounded-xl">
                    <span class="text-[11px] text-gray-400 block">Email</span>
                    <strong id="modal-info-email" class="text-white text-xs break-all">---</strong>
                </div>

                <div class="bg-[#134E22]/60 border border-[#1e7e34] p-3 rounded-xl">
                    <span class="text-[11px] text-gray-400 block">Tuổi</span>
                    <strong id="modal-info-age" class="text-white text-sm">---</strong>
                </div>

                <div class="bg-[#134E22]/60 border border-[#1e7e34] p-3 rounded-xl">
                    <span class="text-[11px] text-gray-400 block">Giới tính</span>
                    <strong id="modal-info-gender" class="text-white text-sm">---</strong>
                </div>

                <div class="bg-[#134E22]/60 border border-[#1e7e34] p-3 rounded-xl col-span-2">
                    <span class="text-[11px] text-gray-400 block">Đội bóng yêu thích</span>
                    <strong id="modal-info-team" class="text-[#FF4500] text-base font-bold">---</strong>
                </div>

            </div>

            <!-- NÚT CHUYỂN SANG CHẾ ĐỘ SỬA -->
            <button id="modal-edit-btn" type="button" class="w-full py-2.5 rounded-full bg-[#FF4500] hover:bg-[#ff5714] text-white font-bold text-xs transition-all shadow-md cursor-pointer mt-2 flex items-center justify-center gap-2">
                <span>✏️</span> Chỉnh Sửa Thông Tin
            </button>

            <!-- NÚT ĐĂNG XUẤT TÀI KHOẢN -->
            <button id="modal-logout-btn" type="button" class="w-full py-2.5 rounded-full bg-red-600/20 hover:bg-red-600 border border-red-500/40 hover:border-red-500 text-red-300 hover:text-white font-semibold text-xs transition-all shadow-md cursor-pointer mt-2 flex items-center justify-center gap-2">
                <span>🚪</span> Đăng Xuất Tài Khoản
            </button>
        </div>

        <!-- 2. KHỐI CHỈNH SỬA THÔNG TIN (EDIT MODE - FORM GIỐNG BƯỚC ĐĂNG KÝ 2) -->
        <form id="user-profile-edit-form" class="hidden space-y-4" autocomplete="off" novalidate>
            <div>
                <label class="block text-sm font-medium mb-1 text-gray-300">Tên người dùng (Tên hiển thị)</label>
                <input type="text" id="edit-fullname" class="w-full px-4 py-2.5 bg-[#134E22] border border-[#1e7e34] rounded-lg text-white text-xs focus:outline-none focus:border-[#FF4500] transition-all" placeholder="Ví dụ: Nguyễn Văn A">
                <p id="edit-fullname-error" class="text-red-400 text-xs mt-1 hidden"></p>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-1 text-gray-300">Tuổi</label>
                    <input type="number" id="edit-age" min="1" max="120" class="w-full px-4 py-2.5 bg-[#134E22] border border-[#1e7e34] rounded-lg text-white text-xs focus:outline-none focus:border-[#FF4500] transition-all" placeholder="Ví dụ: 20">
                    <p id="edit-age-error" class="text-red-400 text-xs mt-1 hidden"></p>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1 text-gray-300">Giới tính</label>
                    <select id="edit-gender" class="w-full px-4 py-2.5 bg-[#134E22] border border-[#1e7e34] rounded-lg text-white text-xs focus:outline-none focus:border-[#FF4500] transition-all cursor-pointer">
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                    </select>
                </div>
            </div>

            <div class="relative">
                <label class="block text-sm font-medium mb-1 text-gray-300">Đội bóng yêu thích</label>
                <div class="relative">
                    <input type="text" id="edit-team-search-input" readonly placeholder="Bấm để chọn đội bóng" class="w-full px-4 py-2.5 bg-[#134E22] border border-[#1e7e34] rounded-lg text-white text-xs focus:outline-none focus:border-[#FF4500] transition-all cursor-pointer pr-10">
                    <span class="absolute right-3 top-3 text-gray-400 pointer-events-none text-xs">▼</span>
                </div>

                <div id="edit-team-dropdown-menu" class="hidden absolute left-0 right-0 top-full mt-1 bg-[#071F0E] border border-[#166534] rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
                    <div class="p-2 border-b border-[#166534] sticky top-0 bg-[#071F0E]">
                        <input type="text" id="edit-team-filter-text" placeholder="Gõ tên hoặc chữ cái (VD: M, Real...)" class="w-full px-3 py-1.5 bg-[#134E22] border border-[#1e7e34] rounded-md text-xs text-white focus:outline-none focus:border-[#FF4500]">
                    </div>
                    <ul id="edit-team-list" class="py-1 m-0 p-0 list-none text-xs"></ul>
                </div>
                <p id="edit-team-error" class="text-red-400 text-xs mt-1 hidden"></p>
            </div>

            <div class="flex gap-2 pt-2">
                <button id="cancel-edit-btn" type="button" class="w-1/2 py-2.5 rounded-full bg-gray-700 hover:bg-gray-600 text-white font-semibold text-xs transition-all">Hủy</button>
                <button id="save-edit-btn" type="submit" class="w-1/2 py-2.5 rounded-full bg-[#FF4500] hover:bg-[#ff5714] text-white font-bold text-xs transition-all shadow-md">Lưu Thay Đổi</button>
            </div>
        </form>

      </div>
    </div>
    `;

    // Chèn HTML
    const modalContainer = document.getElementById('modal-container') || document.body;
    modalContainer.insertAdjacentHTML('beforeend', profileModalHTML);

    // Khai báo Element
    const modal = document.getElementById('user-profile-modal');
    const box = document.getElementById('user-profile-modal-box');
    const closeBtn = document.getElementById('close-user-profile-modal');
    const logoutBtn = document.getElementById('modal-logout-btn');
    const loadingEl = document.getElementById('user-profile-loading');
    const dataEl = document.getElementById('user-profile-data');
    const editForm = document.getElementById('user-profile-edit-form');
    const editBtn = document.getElementById('modal-edit-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');

    // Dropdown chọn đội bóng trong Form Chỉnh sửa
    const editTeamSearchInput = document.getElementById('edit-team-search-input');
    const editTeamDropdownMenu = document.getElementById('edit-team-dropdown-menu');
    const editTeamFilterText = document.getElementById('edit-team-filter-text');
    const editTeamList = document.getElementById('edit-team-list');
    let selectedEditTeamValue = "";

    function renderEditTeamList(filterQuery = "") {
        editTeamList.innerHTML = "";
        const filtered = footballTeams.filter(team => team.toLowerCase().includes(filterQuery.toLowerCase()));

        if (filtered.length === 0) {
            editTeamList.innerHTML = `<li class="px-4 py-2 text-xs text-gray-400 italic">Không tìm thấy đội bóng thích hợp</li>`;
            return;
        }

        filtered.forEach(team => {
            const li = document.createElement('li');
            li.className = "px-4 py-2 hover:bg-[#FF4500] hover:text-white cursor-pointer transition-colors";
            li.textContent = team;
            li.addEventListener('click', () => {
                selectedEditTeamValue = team;
                editTeamSearchInput.value = team;
                clearError(editTeamSearchInput, document.getElementById('edit-team-error'));
                editTeamDropdownMenu.classList.add('hidden');
            });
            editTeamList.appendChild(li);
        });
    }

    editTeamSearchInput?.addEventListener('click', () => {
        editTeamDropdownMenu.classList.toggle('hidden');
        if (!editTeamDropdownMenu.classList.contains('hidden')) {
            renderEditTeamList();
            editTeamFilterText.value = "";
            editTeamFilterText.focus();
        }
    });

    editTeamFilterText?.addEventListener('input', (e) => {
        renderEditTeamList(e.target.value.trim());
    });

    document.addEventListener('click', (e) => {
        if (!editTeamSearchInput?.contains(e.target) && !editTeamDropdownMenu?.contains(e.target)) {
            editTeamDropdownMenu?.classList.add('hidden');
        }
    });

    // Helper kiểm tra lỗi
    function showError(inputEl, errorEl, message) {
        inputEl.classList.add('border-red-500');
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    }

    function clearError(inputEl, errorEl) {
        inputEl.classList.remove('border-red-500');
        errorEl.textContent = '';
        errorEl.classList.add('hidden');
    }

    function openModal() {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        box.classList.remove('scale-90', 'translate-y-4');
        box.classList.add('scale-100', 'translate-y-0');
    }

    function closeModal() {
        modal.classList.add('opacity-0', 'pointer-events-none');
        box.classList.remove('scale-100', 'translate-y-0');
        box.classList.add('scale-90', 'translate-y-4');
        setTimeout(() => {
            editForm?.classList.add('hidden');
            dataEl?.classList.remove('hidden');
        }, 300);
    }

    let currentProfileData = {};

    // Load thông tin tài khoản
    async function loadUserProfile() {
        const currentUserId = sessionStorage.getItem('currentUserId');
        if (!currentUserId) {
            alert("Bạn chưa đăng nhập!");
            return;
        }

        openModal();
        loadingEl?.classList.remove('hidden');
        dataEl?.classList.add('hidden');
        editForm?.classList.add('hidden');

        try {
            const [accountSnap, profileSnap] = await Promise.all([
                get(ref(db, `account_lists/${currentUserId}`)),
                get(ref(db, `account_inform/${currentUserId}`))
            ]);

            const accountData = accountSnap.exists() ? accountSnap.val() : {};
            currentProfileData = profileSnap.exists() ? profileSnap.val() : {};

            document.getElementById('modal-display-name').textContent = currentProfileData.name || accountData.username || 'Thành viên';
            document.getElementById('modal-display-username').textContent = `@${accountData.username || 'user'}`;
            document.getElementById('modal-info-fullname').textContent = currentProfileData.name || 'Chưa cập nhật';
            document.getElementById('modal-info-email').textContent = accountData.gmail || 'Chưa cập nhật';
            document.getElementById('modal-info-age').textContent = currentProfileData.age ? `${currentProfileData.age}` : 'Chưa cập nhật';
            document.getElementById('modal-info-gender').textContent = currentProfileData.sex || 'Chưa cập nhật';
            document.getElementById('modal-info-team').textContent = currentProfileData.Football_club || 'Chưa cập nhật';

            loadingEl?.classList.add('hidden');
            dataEl?.classList.remove('hidden');

        } catch (error) {
            console.error("Lỗi tải thông tin hồ sơ:", error);
            alert("Không thể tải thông tin tài khoản.");
            closeModal();
        }
    }

    // Chuyển sang chế độ Chỉnh sửa
    editBtn?.addEventListener('click', () => {
        const fullnameInput = document.getElementById('edit-fullname');
        const ageInput = document.getElementById('edit-age');

        fullnameInput.value = currentProfileData.name || '';
        ageInput.value = currentProfileData.age || '';
        document.getElementById('edit-gender').value = currentProfileData.sex || 'Nam';

        selectedEditTeamValue = currentProfileData.Football_club || '';
        editTeamSearchInput.value = selectedEditTeamValue;

        clearError(fullnameInput, document.getElementById('edit-fullname-error'));
        clearError(ageInput, document.getElementById('edit-age-error'));
        clearError(editTeamSearchInput, document.getElementById('edit-team-error'));

        dataEl?.classList.add('hidden');
        editForm?.classList.remove('hidden');
    });

    cancelEditBtn?.addEventListener('click', () => {
        editForm?.classList.add('hidden');
        dataEl?.classList.remove('hidden');
    });

    // Xử lý gửi Form Chỉnh sửa
    editForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const currentUserId = sessionStorage.getItem('currentUserId');
        if (!currentUserId) return;

        const fullnameInput = document.getElementById('edit-fullname');
        const ageInput = document.getElementById('edit-age');
        const fullnameError = document.getElementById('edit-fullname-error');
        const ageError = document.getElementById('edit-age-error');
        const teamError = document.getElementById('edit-team-error');

        const fullname = fullnameInput.value.trim();
        const age = ageInput.value.trim();
        const gender = document.getElementById('edit-gender').value;

        let isValid = true;
        if (!fullname) { showError(fullnameInput, fullnameError, 'Vui lòng nhập tên người dùng.'); isValid = false; }
        if (!age || isNaN(age) || Number(age) <= 0) { showError(ageInput, ageError, 'Vui lòng nhập tuổi hợp lệ.'); isValid = false; }
        if (!selectedEditTeamValue) { showError(editTeamSearchInput, teamError, 'Vui lòng chọn đội bóng yêu thích.'); isValid = false; }

        if (!isValid) return;

        const saveBtn = document.getElementById('save-edit-btn');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Đang lưu...';

        try {
            await set(ref(db, `account_inform/${currentUserId}`), {
                id: currentUserId,
                name: fullname,
                age: Number(age),
                sex: gender,
                Football_club: selectedEditTeamValue
            });

            // Phát tín hiệu để cập nhật trang
            window.dispatchEvent(new Event('update'));

            alert("Cập nhật thông tin thành công!");
            await loadUserProfile();

        } catch (err) {
            console.error("Lỗi lưu thông tin:", err);
            alert("Đã xảy ra lỗi khi lưu thông tin. Vui lòng thử lại!");
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Lưu Thay Đổi';
        }
    });

    closeBtn?.addEventListener('click', closeModal);

    logoutBtn?.addEventListener('click', () => {
        if (confirm("Bạn có chắc chắn muốn đăng xuất tài khoản?")) {
            sessionStorage.removeItem('currentUserId');
            sessionStorage.removeItem('username');
            closeModal();
            window.location.href = new URL('../index.html', import.meta.url).href;
        }
    });

    document.addEventListener('click', (e) => {
        const triggerBtn = e.target.closest('#open-user-profile-btn, .open-profile-btn');
        if (triggerBtn) {
            e.preventDefault();
            loadUserProfile();
        }
    });
});