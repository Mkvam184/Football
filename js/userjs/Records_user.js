import { db, ref, get } from "../../data/Firebase.js";

let recordsData = {};

document.addEventListener('DOMContentLoaded', async () => {

    if (!checkUserAuth()) return;

    const tableBody = document.getElementById('records-table-body');
    const searchInput = document.getElementById('search-record-input');
    const favTeamDisplay = document.getElementById('fav-team-display');

    let userFavTeam = "";
    let currentCategory = "all";
    let searchKeyword = "";

    // 1. Lấy thông tin CLB yêu thích từ Firebase
    const currentUserId = sessionStorage.getItem('currentUserId');
    if (currentUserId) {
        try {
            const profileSnap = await get(ref(db, `account_inform/${currentUserId}`));
            if (profileSnap.exists()) {
                userFavTeam = profileSnap.val().Football_club || "";
            }
        } catch (err) {
            console.error("Lỗi lấy thông tin CLB:", err);
        }
    }

    favTeamDisplay.textContent = userFavTeam || "Chưa chọn CLB";

    // 2. Lấy dữ liệu danh sách kỷ lục từ Firebase (node 'records')
    async function loadRecordsFromFirebase() {
        try {
            const recordsRef = ref(db, 'records');
            const snapshot = await get(recordsRef);

            if (snapshot.exists()) {
                recordsData = snapshot.val();
            } else {
                recordsData = {};
            }
            renderRecordsList();
        } catch (err) {
            console.error("Lỗi khi tải danh sách kỷ lục từ Firebase:", err);
        }
    }

    // 3. Render danh sách kỷ lục
    function renderRecordsList() {
        const keys = Object.keys(recordsData).reverse(); // Đưa bài mới nhất lên đầu

        // --- ĐẾM SỐ LƯỢNG CHO CÁC THẺ THỐNG KÊ ---
        let playerCount = 0;
        let clubCount = 0;
        let nationalCount = 0;

        keys.forEach(id => {
            const cat = recordsData[id].category;
            if (cat === "player") playerCount++;
            if (cat === "club") clubCount++;
            if (cat === "national") nationalCount++;
        });

        // Ghi số liệu lên thẻ UI
        const statTotal = document.getElementById("stat-total-user");
        const statPlayer = document.getElementById("stat-player-user");
        const statClub = document.getElementById("stat-club-user");
        const statNational = document.getElementById("stat-national-user");

        if (statTotal) statTotal.textContent = keys.length;
        if (statPlayer) statPlayer.textContent = playerCount;
        if (statClub) statClub.textContent = clubCount;
        if (statNational) statNational.textContent = nationalCount;

        const filteredKeys = keys.filter(id => {
            const item = recordsData[id];
            const matchesCategory = currentCategory === "all" ? true : item.category === currentCategory;
            
            const searchStr = `${item.title || ''} ${item.holder || ''} ${item.club || ''}`.toLowerCase();
            const matchesSearch = searchStr.includes(searchKeyword);

            return matchesCategory && matchesSearch;
        });

        if (filteredKeys.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-10 text-gray-400 italic">
                        Không tìm thấy kỷ lục nào phù hợp.
                    </td>
                </tr>`;
            return;
        }

        tableBody.innerHTML = filteredKeys.map(id => {
            const item = recordsData[id];
            const clubName = item.club || item.team || "";
            const isFav = userFavTeam && clubName.toLowerCase().includes(userFavTeam.toLowerCase());

            // Badge danh mục
            let categoryLabel = '👤 Cầu thủ';
            if (item.category === 'club') categoryLabel = '🛡️ Câu lạc bộ';
            if (item.category === 'national') categoryLabel = '🌍 Đội tuyển Quốc gia';

            return `
            <tr class="transition-colors ${isFav ? 'bg-[#FF4500]/15 border-l-4 border-l-[#FF4500] font-medium' : 'hover:bg-[#134E22]/40'}">
                
                <!-- Tên kỷ lục -->
                <td class="py-4 px-4">
                    <strong class="text-white block font-bold text-xs">${item.title}</strong>
                    <span class="text-[10px] text-gray-400 uppercase tracking-wide">
                        ${categoryLabel}
                    </span>
                </td>

                <!-- Chủ nhân -->
                <td class="py-4 px-4 font-bold text-gray-200">
                    ${item.holder}
                </td>

                <!-- Câu lạc bộ -->
                <td class="py-4 px-4 font-semibold ${isFav ? 'text-[#FF4500]' : 'text-gray-300'}">
                    ${clubName}
                    ${isFav ? '<span class="ml-1 text-[9px] bg-[#FF4500] text-white px-1.5 py-0.5 rounded font-black">CLB BẠN</span>' : ''}
                </td>

                <!-- Thông số -->
                <td class="py-4 px-3 text-center font-black text-sm text-[#FF4500]">
                    ${item.value || item.stat || ''}
                </td>

                <!-- Thời gian -->
                <td class="py-4 px-3 text-center text-gray-400 text-xs">
                    ${item.season || item.time || ''}
                </td>

            </tr>
            `;
        }).join('');
    }

    // 4. Sự kiện Filter & Tìm kiếm
    document.querySelectorAll('.record-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.record-filter-btn').forEach(b => {
                b.classList.remove('active', 'bg-[#FF4500]', 'text-white');
                b.classList.add('bg-[#071F0E]', 'text-gray-300', 'border', 'border-[#166534]');
            });

            const currentBtn = e.currentTarget;
            currentBtn.classList.remove('bg-[#071F0E]', 'text-gray-300', 'border', 'border-[#166534]');
            currentBtn.classList.add('active', 'bg-[#FF4500]', 'text-white');

            currentCategory = currentBtn.dataset.category;
            renderRecordsList();
        });
    });

    searchInput?.addEventListener('input', (e) => {
        searchKeyword = e.target.value.trim().toLowerCase();
        renderRecordsList();
    });

    // Tải dữ liệu Firebase khi trang khởi chạy
    loadRecordsFromFirebase();
});

// --- XÁC THỰC QUYỀN ADMIN BẰNG SESSIONSTORAGE ---
function checkUserAuth() {
    const currentUserId = sessionStorage.getItem("currentUserId");

    if (!currentUserId) {
        alert("⚠️ Bạn chưa đăng nhập hoặc không có quyền truy cập trang này!");
        // Chuyển hướng người dùng về trang đăng nhập (thay đường dẫn theo file của bạn)
        window.location.href = new URL('../../index.html', import.meta.url).href;
        return false;
    }
    return true;
}

// Chạy kiểm tra ngay lập tức khi file JS vừa tải xong
checkUserAuth();


window.addEventListener('update', () => {
    window.location.reload();
});