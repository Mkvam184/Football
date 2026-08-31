import { db, ref, set, get } from "../data/Firebase.js"; // <-- Đã thêm hàm 'get'

let currentUserId = null;
let tempAccountData = null;

document.addEventListener('DOMContentLoaded', () => {
    let footballTeams = [];

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

    // Chỉ render các HTML Modal
    const modalsHTML = `
    <!-- ================= MODAL ĐĂNG NHẬP ================= -->
    <div id="login-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm opacity-0 pointer-events-none transition-all duration-300">
      <div id="login-modal-box" class="bg-[#0D3B1B] border border-[#166534] rounded-2xl p-8 shadow-2xl w-full max-w-md mx-4 relative transform scale-90 translate-y-4 transition-all duration-300">
        <button id="close-login-modal" class="absolute top-4 right-4 text-gray-400 hover:text-white text-xl font-bold cursor-pointer">✕</button>
        
        <h2 class="text-2xl font-black text-center mb-6 text-white">ĐĂNG NHẬP</h2>
        
        <form id="login-form" class="space-y-4" autocomplete="off" novalidate>
            <div>
                <label class="block text-sm font-medium mb-1 text-gray-300">Tên đăng nhập</label>
                <input type="text" id="login-username" autocomplete="off" class="w-full px-4 py-2.5 bg-[#134E22] border border-[#1e7e34] rounded-lg text-white focus:outline-none focus:border-[#FF4500] transition-all" placeholder="Tên đăng nhập">
                <p id="login-username-error" class="text-red-400 text-xs mt-1 hidden"></p>
            </div>
            <div>
                <label class="block text-sm font-medium mb-1 text-gray-300">Mật khẩu</label>
                <div class="relative">
                    <input type="password" id="login-password" autocomplete="new-password" class="w-full pl-4 pr-10 py-2.5 bg-[#134E22] border border-[#1e7e34] rounded-lg text-white focus:outline-none focus:border-[#FF4500] transition-all" placeholder="Mật khẩu">
                    <button type="button" class="toggle-password absolute right-3 top-2.5 text-gray-300 hover:text-white text-sm focus:outline-none" data-target="login-password">
                        👁️
                    </button>
                </div>
                <p id="login-password-error" class="text-red-400 text-xs mt-1 hidden"></p>
            </div>

            <!-- Thêm Link Quên Mật Khẩu -->
            <div class="flex justify-end">
                <a href="#" id="forgot-password-link" class="text-xs text-gray-300 hover:text-[#FF4500] transition-colors">Quên mật khẩu?</a>
            </div>

            <button id="login-btn" type="submit" class="w-full py-3 rounded-full bg-[#FF4500] text-white font-semibold hover:bg-[#ff5714] active:scale-95 transition-all shadow-md cursor-pointer mt-2 flex items-center justify-center gap-2">
                <span>Đăng Nhập</span>
            </button>

            <p class="text-center text-xs text-gray-300 mt-4">
                Chưa có tài khoản? 
                <button type="button" id="switch-to-register" class="text-[#FF4500] font-semibold hover:underline cursor-pointer bg-transparent border-0 p-0 ml-1">Đăng ký ngay</button>
            </p>
        </form>
      </div>
    </div>

    <!-- ================= MODAL ĐĂNG KÝ ================= -->
    <div id="register-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm opacity-0 pointer-events-none transition-all duration-300">
      <div id="register-modal-box" class="bg-[#0D3B1B] border border-[#166534] rounded-2xl p-8 shadow-2xl w-full max-w-md mx-4 relative transform scale-90 translate-y-4 transition-all duration-300">
        <button id="close-register-modal" class="absolute top-4 right-4 text-gray-400 hover:text-white text-xl font-bold cursor-pointer">✕</button>
        
        <h2 class="text-2xl font-black text-center mb-6 text-white">ĐĂNG KÝ TÀI KHOẢN</h2>
        
        <form id="register-form" class="space-y-4" autocomplete="off" novalidate>
            <div>
                <label class="block text-sm font-medium mb-1 text-gray-300">Tên đăng nhập</label>
                <input type="text" id="register-username" autocomplete="off" class="w-full px-4 py-2.5 bg-[#134E22] border border-[#1e7e34] rounded-lg text-white focus:outline-none focus:border-[#FF4500] transition-all" placeholder="Tên đăng nhập">
                <p id="register-username-error" class="text-red-400 text-xs mt-1 hidden"></p>
            </div>
            <div>
                <label class="block text-sm font-medium mb-1 text-gray-300">Email</label>
                <input type="email" id="register-email" autocomplete="off" class="w-full px-4 py-2.5 bg-[#134E22] border border-[#1e7e34] rounded-lg text-white focus:outline-none focus:border-[#FF4500] transition-all" placeholder="Email">
                <p id="register-email-error" class="text-red-400 text-xs mt-1 hidden"></p>
            </div>
            <div>
                <label class="block text-sm font-medium mb-1 text-gray-300">Mật khẩu</label>
                <div class="relative">
                    <input type="password" id="register-password" autocomplete="new-password" class="w-full pl-4 pr-10 py-2.5 bg-[#134E22] border border-[#1e7e34] rounded-lg text-white focus:outline-none focus:border-[#FF4500] transition-all" placeholder="Mật khẩu">
                    <button type="button" class="toggle-password absolute right-3 top-2.5 text-gray-300 hover:text-white text-sm focus:outline-none" data-target="register-password">
                        👁️
                    </button>
                </div>
                <p id="register-password-error" class="text-red-400 text-xs mt-1 hidden"></p>
            </div>
            <div>
                <label class="block text-sm font-medium mb-1 text-gray-300">Xác nhận mật khẩu</label>
                <div class="relative">
                    <input type="password" id="register-confirm-password" autocomplete="new-password" class="w-full pl-4 pr-10 py-2.5 bg-[#134E22] border border-[#1e7e34] rounded-lg text-white focus:outline-none focus:border-[#FF4500] transition-all" placeholder="Xác nhận mật khẩu">
                    <button type="button" class="toggle-password absolute right-3 top-2.5 text-gray-300 hover:text-white text-sm focus:outline-none" data-target="register-confirm-password">
                        👁️
                    </button>
                </div>
                <p id="register-confirm-password-error" class="text-red-400 text-xs mt-1 hidden"></p>
            </div>
            <button id="register-btn" type="submit" class="w-full py-3 rounded-full bg-gradient-to-r from-emerald-600 to-green-500 text-white font-semibold hover:from-emerald-500 hover:to-green-400 active:scale-95 transition-all shadow-md cursor-pointer mt-2 flex items-center justify-center gap-2">
                <span>Đăng Ký</span>
            </button>

            <!-- Thêm Nút chuyển sang Đăng nhập -->
            <p class="text-center text-xs text-gray-300 mt-4">
                Đã có tài khoản? 
                <button type="button" id="switch-to-login" class="text-[#FF4500] font-semibold hover:underline cursor-pointer bg-transparent border-0 p-0 ml-1">Đăng nhập ngay</button>
            </p>
        </form>
      </div>
    </div>

    <!-- ================= MODAL CẬP NHẬT THÔNG TIN CÁ NHÂN (BƯỚC 2) ================= -->
    <div id="profile-modal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm opacity-0 pointer-events-none transition-all duration-300">
      <div id="profile-modal-box" class="bg-[#0D3B1B] border border-[#166534] rounded-2xl p-6 sm:p-8 shadow-2xl w-full max-w-md mx-4 relative transform scale-90 translate-y-4 transition-all duration-300">
        
        <div class="text-center mb-6">
            <span class="px-3 py-1 text-[11px] font-bold uppercase tracking-wider bg-[#FF4500]/20 text-[#FF4500] border border-[#FF4500]/30 rounded-full">Bước Cuối Cùng</span>
            <h2 class="text-2xl font-black mt-2 text-white">HOÀN TẤT HỒ SƠ</h2>
            <p class="text-xs text-gray-300 mt-1">Giúp chúng tôi cá nhân hóa trải nghiệm bóng đá của bạn!</p>
        </div>
        
        <form id="profile-form" class="space-y-4" autocomplete="off" novalidate>
            <div>
                <label class="block text-sm font-medium mb-1 text-gray-300">Tên người dùng (Tên hiển thị)</label>
                <input type="text" id="profile-fullname" class="w-full px-4 py-2.5 bg-[#134E22] border border-[#1e7e34] rounded-lg text-white focus:outline-none focus:border-[#FF4500] transition-all" placeholder="Ví dụ: Nguyễn Văn A">
                <p id="profile-fullname-error" class="text-red-400 text-xs mt-1 hidden"></p>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-1 text-gray-300">Tuổi</label>
                    <input type="number" id="profile-age" min="1" max="120" class="w-full px-4 py-2.5 bg-[#134E22] border border-[#1e7e34] rounded-lg text-white focus:outline-none focus:border-[#FF4500] transition-all" placeholder="Ví dụ: 20">
                    <p id="profile-age-error" class="text-red-400 text-xs mt-1 hidden"></p>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1 text-gray-300">Giới tính</label>
                    <select id="profile-gender" class="w-full px-4 py-2.5 bg-[#134E22] border border-[#1e7e34] rounded-lg text-white focus:outline-none focus:border-[#FF4500] transition-all cursor-pointer">
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                    </select>
                </div>
            </div>

            <div class="relative">
                <label class="block text-sm font-medium mb-1 text-gray-300">Đội bóng yêu thích</label>
                <div class="relative">
                    <input type="text" id="team-search-input" readonly placeholder="Bấm để chọn đội bóng" class="w-full px-4 py-2.5 bg-[#134E22] border border-[#1e7e34] rounded-lg text-white focus:outline-none focus:border-[#FF4500] transition-all cursor-pointer pr-10">
                    <span class="absolute right-3 top-3 text-gray-400 pointer-events-none text-xs">▼</span>
                </div>

                <div id="team-dropdown-menu" class="hidden absolute left-0 right-0 top-full mt-1 bg-[#071F0E] border border-[#166534] rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
                    <div class="p-2 border-b border-[#166534] sticky top-0 bg-[#071F0E]">
                        <input type="text" id="team-filter-text" placeholder="Gõ tên hoặc chữ cái (VD: M, Real...)" class="w-full px-3 py-1.5 bg-[#134E22] border border-[#1e7e34] rounded-md text-xs text-white focus:outline-none focus:border-[#FF4500]">
                    </div>
                    <ul id="team-list" class="py-1 m-0 p-0 list-none text-sm"></ul>
                </div>
                <p id="profile-team-error" class="text-red-400 text-xs mt-1 hidden"></p>
            </div>

            <button id="profile-btn" type="submit" class="w-full py-3 rounded-full bg-[#FF4500] text-white font-semibold hover:bg-[#ff5714] active:scale-95 transition-all shadow-md cursor-pointer mt-4 flex items-center justify-center gap-2">
                <span>Hoàn Thành & Bắt Đầu</span>
            </button>
        </form>
      </div>
    </div>
    `;

    // Bắt sự kiện Toggle Hiện/Ẩn Mật khẩu
    document.addEventListener('click', (e) => {
        // Kiểm tra xem phần tử được click (hoặc phần tử con của nó) có class .toggle-password không
        const button = e.target.closest('.toggle-password');
        if (!button) return;

        e.preventDefault();
        const targetId = button.getAttribute('data-target');
        const input = document.getElementById(targetId);

        if (input) {
            if (input.type === 'password') {
                input.type = 'text';
                button.textContent = '🔒'; // Biểu tượng khi đang hiện MK
            } else {
                input.type = 'password';
                button.textContent = '👁️'; // Biểu tượng khi đang ẩn MK
            }
        }
    });

    // Chèn HTML Modal vào container riêng hoặc body
    const modalContainer = document.getElementById('modal-container') || document.body;
    modalContainer.insertAdjacentHTML('beforeend', modalsHTML);

    // Bắt các element Modal
    const loginModal = document.getElementById('login-modal');
    const loginBox = document.getElementById('login-modal-box');
    const registerModal = document.getElementById('register-modal');
    const registerBox = document.getElementById('register-modal-box');
    const profileModal = document.getElementById('profile-modal');
    const profileBox = document.getElementById('profile-modal-box');
    const mobileMenu = document.getElementById('mobile-menu');

    function openModal(modal, box) {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        box.classList.remove('scale-90', 'translate-y-4');
        box.classList.add('scale-100', 'translate-y-0');
    }

    function closeModal(modal, box) {
        modal.classList.add('opacity-0', 'pointer-events-none');
        box.classList.remove('scale-100', 'translate-y-0');
        box.classList.add('scale-90', 'translate-y-4');
    }

    function resetFormState() {
        document.querySelectorAll('form').forEach(f => f.reset());
        document.querySelectorAll('p[id$="-error"]').forEach(p => {
            p.classList.add('hidden');
            p.textContent = '';
        });
        document.querySelectorAll('input').forEach(i => {
            i.classList.remove('border-red-500');
        });
    }

    // Hàm chuyển trạng thái Loading trên Nút bấm
    function setButtonLoading(buttonEl, isLoading, textWaiting = "Đang xử lý...") {
        if (!buttonEl) return;
        if (isLoading) {
            buttonEl.disabled = true;
            buttonEl.classList.add('opacity-70', 'cursor-not-allowed');
            buttonEl.dataset.originalText = buttonEl.querySelector('span')?.textContent || buttonEl.textContent;
            buttonEl.innerHTML = `
                <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>${textWaiting}</span>
            `;
        } else {
            buttonEl.disabled = false;
            buttonEl.classList.remove('opacity-70', 'cursor-not-allowed');
            const originalText = buttonEl.dataset.originalText || "Gửi";
            buttonEl.innerHTML = `<span>${originalText}</span>`;
        }
    }

    // Gắn sự kiện kích hoạt mở Modal từ Navbar (Desktop & Mobile)
    document.getElementById('open-login-desktop')?.addEventListener('click', () => { resetFormState(); openModal(loginModal, loginBox); });
    document.getElementById('open-login-mobile')?.addEventListener('click', () => { mobileMenu?.classList.add('hidden'); resetFormState(); openModal(loginModal, loginBox); });

    document.getElementById('open-register-desktop')?.addEventListener('click', () => { resetFormState(); openModal(registerModal, registerBox); });
    document.getElementById('open-register-mobile')?.addEventListener('click', () => { mobileMenu?.classList.add('hidden'); resetFormState(); openModal(registerModal, registerBox); });

    // Gắn sự kiện đóng nút X
    document.getElementById('close-login-modal')?.addEventListener('click', () => closeModal(loginModal, loginBox));
    document.getElementById('close-register-modal')?.addEventListener('click', () => closeModal(registerModal, registerBox));

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

    // Dropdown chọn đội bóng
    const teamSearchInput = document.getElementById('team-search-input');
    const teamDropdownMenu = document.getElementById('team-dropdown-menu');
    const teamFilterText = document.getElementById('team-filter-text');
    const teamList = document.getElementById('team-list');
    let selectedTeamValue = "";

    function renderTeamList(filterQuery = "") {
        teamList.innerHTML = "";
        const filtered = footballTeams.filter(team => team.toLowerCase().includes(filterQuery.toLowerCase()));

        if (filtered.length === 0) {
            teamList.innerHTML = `<li class="px-4 py-2 text-xs text-gray-400 italic">Không tìm thấy đội bóng thích hợp</li>`;
            return;
        }

        filtered.forEach(team => {
            const li = document.createElement('li');
            li.className = "px-4 py-2 hover:bg-[#FF4500] hover:text-white cursor-pointer transition-colors";
            li.textContent = team;
            li.addEventListener('click', () => {
                selectedTeamValue = team;
                teamSearchInput.value = team;
                clearError(teamSearchInput, document.getElementById('profile-team-error'));
                teamDropdownMenu.classList.add('hidden');
            });
            teamList.appendChild(li);
        });
    }

    teamSearchInput?.addEventListener('click', () => {
        teamDropdownMenu.classList.toggle('hidden');
        if (!teamDropdownMenu.classList.contains('hidden')) {
            renderTeamList();
            teamFilterText.value = "";
            teamFilterText.focus();
        }
    });

    teamFilterText?.addEventListener('input', (e) => {
        renderTeamList(e.target.value.trim());
    });

    document.addEventListener('click', (e) => {
        if (!teamSearchInput.contains(e.target) && !teamDropdownMenu.contains(e.target)) {
            teamDropdownMenu.classList.add('hidden');
        }
    });

    // Form Register Submit -> Mở Profile (Kiểm tra trùng Tên đăng nhập)
    const registerForm = document.getElementById('register-form');
    const registerBtn = document.getElementById('register-btn');

    if (registerForm) {
        const regUsernameInput = document.getElementById('register-username');
        const regUsernameError = document.getElementById('register-username-error');
        const regEmailInput = document.getElementById('register-email');
        const regEmailError = document.getElementById('register-email-error');
        const regPasswordInput = document.getElementById('register-password');
        const regPasswordError = document.getElementById('register-password-error');
        const regConfirmInput = document.getElementById('register-confirm-password');
        const regConfirmError = document.getElementById('register-confirm-password-error');

        regUsernameInput.addEventListener('input', () => clearError(regUsernameInput, regUsernameError));
        regEmailInput.addEventListener('input', () => clearError(regEmailInput, regEmailError));
        regPasswordInput.addEventListener('input', () => clearError(regPasswordInput, regPasswordError));
        regConfirmInput.addEventListener('input', () => clearError(regConfirmInput, regConfirmError));

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            let isValid = true;

            const username = regUsernameInput.value.trim();
            const email = regEmailInput.value.trim();
            const password = regPasswordInput.value.trim();
            const confirmPassword = regConfirmInput.value.trim();

            if (!username) { showError(regUsernameInput, regUsernameError, 'Vui lòng nhập tên tài khoản.'); isValid = false; }
            if (!email) { showError(regEmailInput, regEmailError, 'Vui lòng nhập địa chỉ email.'); isValid = false; }
            if (!password) { showError(regPasswordInput, regPasswordError, 'Vui lòng nhập mật khẩu.'); isValid = false; }
            else if (password.length < 6) { showError(regPasswordInput, regPasswordError, 'Mật khẩu phải có ít nhất 6 ký tự.'); isValid = false; }
            if (!confirmPassword) { showError(regConfirmInput, regConfirmError, 'Vui lòng xác nhận lại mật khẩu.'); isValid = false; }
            else if (password !== confirmPassword) { showError(regConfirmInput, regConfirmError, 'Mật khẩu nhập lại không khớp.'); isValid = false; }

            if (!isValid) return;

            setButtonLoading(registerBtn, true, "Đang kiểm tra...");

            try {
                // KIỂM TRA TÊN ĐĂNG NHẬP TRONG ACCOUNT_LISTS
                const snapshot = await get(ref(db, 'account_lists'));
                let isExist = false;

                if (snapshot.exists()) {
                    const accounts = snapshot.val();
                    for (let key in accounts) {
                        if (accounts[key].username && accounts[key].username.toLowerCase() === username.toLowerCase()) {
                            isExist = true;
                            break;
                        }
                    }
                }

                if (isExist) {
                    showError(regUsernameInput, regUsernameError, 'Tên đăng nhập này đã tồn tại, vui lòng chọn tên khác.');
                    setButtonLoading(registerBtn, false);
                    return;
                }

                // Lưu tạm thông tin khi tên đăng nhập hợp lệ
                tempAccountData = {
                    username: username,
                    gmail: email,
                    password: password
                };

                setButtonLoading(registerBtn, false);
                closeModal(registerModal, registerBox);
                setTimeout(() => {
                    openModal(profileModal, profileBox);
                    document.getElementById('profile-fullname').value = username;
                }, 300);

            } catch (err) {
                console.error("Lỗi khi kết nối Firebase kiểm tra username:", err);
                showError(regUsernameInput, regUsernameError, 'Không thể kết nối máy chủ. Vui lòng thử lại!');
                setButtonLoading(registerBtn, false);
            }
        });
    }

    // Form Profile Submit (Có hiệu ứng Loading khi lưu)
    const profileForm = document.getElementById('profile-form');
    const profileBtn = document.getElementById('profile-btn');

    if (profileForm) {
        const fullnameInput = document.getElementById('profile-fullname');
        const fullnameError = document.getElementById('profile-fullname-error');
        const ageInput = document.getElementById('profile-age');
        const ageError = document.getElementById('profile-age-error');
        const teamError = document.getElementById('profile-team-error');

        fullnameInput.addEventListener('input', () => clearError(fullnameInput, fullnameError));
        ageInput.addEventListener('input', () => clearError(ageInput, ageError));

        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            let isValid = true;

            const fullname = fullnameInput.value.trim();
            const age = ageInput.value.trim();
            const gender = document.getElementById('profile-gender').value;

            if (!fullname) { showError(fullnameInput, fullnameError, 'Vui lòng nhập tên người dùng.'); isValid = false; }
            if (!age || isNaN(age) || Number(age) <= 0) { showError(ageInput, ageError, 'Vui lòng nhập tuổi hợp lệ.'); isValid = false; }
            if (!selectedTeamValue) { showError(teamSearchInput, teamError, 'Vui lòng chọn đội bóng yêu thích.'); isValid = false; }

            if (!tempAccountData) {
                alert("Thiếu thông tin đăng ký! Vui lòng thực hiện lại từ bước đăng ký.");
                closeModal(profileModal, profileBox);
                openModal(registerModal, registerBox);
                return;
            }

            if (!isValid) return;

            // BẬT HIỆU ỨNG LOADING TRÊN NÚT BẤM
            setButtonLoading(profileBtn, true, "Đang khởi tạo hồ sơ...");

            const currentUserId = "user_" + Date.now();

            const accountData = {
                id: currentUserId,
                username: tempAccountData.username,
                gmail: tempAccountData.gmail,
                password: tempAccountData.password,
                role: "user"
            };

            const profileData = {
                id: currentUserId,
                name: fullname,
                age: Number(age),
                sex: gender,
                Football_club: selectedTeamValue,
                saved_news: []
            };

            try {
                // Lưu đồng thời 2 node lên Firebase
                await Promise.all([
                    set(ref(db, 'account_lists/' + currentUserId), accountData),
                    set(ref(db, 'account_inform/' + currentUserId), profileData)
                ]);

                tempAccountData = null; 

                // TẮT LOADING TRƯỚC KHIN THÔNG BÁO
                setButtonLoading(profileBtn, false);

                alert(`Chúc mừng ${fullname}! Đăng ký tài khoản và khởi tạo hồ sơ thành công.`);
                closeModal(profileModal, profileBox);

            } catch (error) {
                console.error("Lỗi khi lưu dữ liệu lên Firebase:", error);
                setButtonLoading(profileBtn, false);
                alert("Đã xảy ra lỗi trong quá trình lưu dữ liệu. Vui lòng thử lại!");
            }
        });
    }
    
    // Form Login Submit -> Kiểm tra account_lists & Chuyển trang
    const loginForm = document.getElementById('login-form');
    const loginBtn = document.getElementById('login-btn');

    if (loginForm) {
        const loginUsernameInput = document.getElementById('login-username');
        const loginUsernameError = document.getElementById('login-username-error');
        const loginPasswordInput = document.getElementById('login-password');
        const loginPasswordError = document.getElementById('login-password-error');

        loginUsernameInput.addEventListener('input', () => clearError(loginUsernameInput, loginUsernameError));
        loginPasswordInput.addEventListener('input', () => clearError(loginPasswordInput, loginPasswordError));

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            let isValid = true;

            const username = loginUsernameInput.value.trim();
            const password = loginPasswordInput.value.trim();

            if (!username) { showError(loginUsernameInput, loginUsernameError, 'Vui lòng nhập tên đăng nhập.'); isValid = false; }
            if (!password) { showError(loginPasswordInput, loginPasswordError, 'Vui lòng nhập mật khẩu.'); isValid = false; }

            if (!isValid) return;

            setButtonLoading(loginBtn, true, "Đang kiểm tra...");

            try {
                // Quét dữ liệu từ node account_lists trên Firebase
                const snapshot = await get(ref(db, 'account_lists'));
                
                if (!snapshot.exists()) {
                    showError(loginUsernameInput, loginUsernameError, 'Tài khoản hoặc mật khẩu không chính xác.');
                    setButtonLoading(loginBtn, false);
                    return;
                }

                const accounts = snapshot.val();
                let matchedUser = null;

                // Dò tìm tài khoản trùng tên và đúng mật khẩu
                for (let key in accounts) {
                    const acc = accounts[key];
                    if (acc.username && acc.username === username && acc.password === password) {
                        matchedUser = acc;
                        break;
                    }
                }

                if (matchedUser) {
                    // Lưu ID tài khoản đăng nhập vào Session / LocalStorage
                    sessionStorage.setItem('currentUserId', matchedUser.id);
                    sessionStorage.setItem('username', matchedUser.username);

                    try {
                        const informSnap = await get(ref(db, `account_inform/${matchedUser.id}`));
                        if (informSnap.exists() && informSnap.val().name) {
                            sessionStorage.setItem('userNameShow', informSnap.val().name);
                        }
                    } catch (informErr) {
                        console.error("Lỗi lấy thông tin account_inform:", informErr);
                        sessionStorage.setItem('userNameShow', matchedUser.username);
                    }

                    setButtonLoading(loginBtn, false);
                    closeModal(loginModal, loginBox);

                    // Chuyển hướng sang trang userpage
                    if (matchedUser.role === 'user') {
                        sessionStorage.setItem('userRole', matchedUser.role);
                        window.location.href = new URL('../pages/userpages/Userpage.html', import.meta.url).href;
                    }
                    else if (matchedUser.role === 'admin') {
                        sessionStorage.setItem('userRole', matchedUser.role);
                        window.location.href = new URL('../pages/adminpages/Admin_page.html', import.meta.url).href;
                    }
                } else {
                    showError(loginUsernameInput, loginUsernameError, 'Tên đăng nhập hoặc mật khẩu không chính xác.');
                    setButtonLoading(loginBtn, false);
                }

            } catch (err) {
                console.error("Lỗi khi đăng nhập:", err);
                showError(loginUsernameInput, loginUsernameError, 'Không thể kết nối máy chủ. Vui lòng thử lại!');
                setButtonLoading(loginBtn, false);
            }
        });
    }

    // Chuyển qua lại giữa các Modal
    document.getElementById('switch-to-register')?.addEventListener('click', () => {
        closeModal(loginModal, loginBox);
        setTimeout(() => {
            resetFormState();
            openModal(registerModal, registerBox);
        }, 200);
    });

    document.getElementById('switch-to-login')?.addEventListener('click', () => {
        closeModal(registerModal, registerBox);
        setTimeout(() => {
            resetFormState();
            openModal(loginModal, loginBox);
        }, 200);
    });
});