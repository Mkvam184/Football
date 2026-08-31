import { db, ref, get, set, update, remove, push } from "../../data/Firebase.js";

let recordsData = {};
let currentCategoryFilter = "all";
let currentSearchKeyword = "";


const tableBody = document.getElementById("admin-records-table-body");
const recordModal = document.getElementById("record-modal");
const recordModalContent = document.getElementById("record-modal-content");
const recordForm = document.getElementById("record-form");
const modalTitle = document.getElementById("record-modal-title");

// Inputs
const inputId = document.getElementById("record-id");
const inputTitle = document.getElementById("record-title");
const inputCategory = document.getElementById("record-category");
const inputValue = document.getElementById("record-value");
const inputHolder = document.getElementById("record-holder");
const inputClub = document.getElementById("record-club");
const inputSeason = document.getElementById("record-season");

const statNational = document.getElementById("stat-national-records");

// Buttons & Counters
const btnOpenCreate = document.getElementById("btn-open-create-modal");
const btnCloseModal = document.getElementById("close-record-modal");
const btnCancelModal = document.getElementById("btn-cancel-record-modal");
const statTotal = document.getElementById("stat-total-records");
const statPlayer = document.getElementById("stat-player-records");
const statClub = document.getElementById("stat-club-records");

// --- HÀM GHI NHẬT KÝ LỊCH SỬ LÊN FIREBASE (SYSTEM_HISTORY) ---
async function logActivity(action, target, details) {
    try {
        const historyRef = ref(db, 'system_history');
        const now = new Date();
        const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} - ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getFullYear()}`;
        
        // Lấy tên Admin đang làm việc (mặc định 'Admin' nếu không tìm thấy)
        const currentAdminName = document.getElementById('admin-name-display')?.textContent || "Admin";

        await push(historyRef, {
            admin: currentAdminName,
            action: action,     // Ví dụ: "Thêm Kỷ Lục", "Chỉnh Sửa Kỷ Lục", "Xóa Kỷ Lục"
            target: target,     // Tên kỷ lục
            details: details,   // Chi tiết thêm
            timestamp: timeString,
            createdAt: Date.now()
        });
    } catch (err) {
        console.error("Lỗi khi ghi nhận nhật ký lịch sử:", err);
    }
}

// --- 1. TẢI DỮ LIỆU TỪ FIREBASE (NODE 'records') ---
async function loadRecordsFromFirebase() {
    try {
        const recordsRef = ref(db, 'records');
        const snapshot = await get(recordsRef);

        if (snapshot.exists()) {
            recordsData = snapshot.val();
        } else {
            recordsData = {};
        }
        renderRecordsTable();
    } catch (err) {
        console.error("Lỗi khi tải dữ liệu từ Firebase node 'records':", err);
    }
}

// --- 2. XỬ LÝ SUBMIT FORM (TẠO / SỬA LÊN FIREBASE) ---
recordForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = inputId.value;
    const payload = {
        title: inputTitle.value.trim(),
        category: inputCategory.value,
        value: inputValue.value.trim(),
        holder: inputHolder.value.trim(),
        club: inputClub.value.trim(),
        season: inputSeason.value.trim(),
        createdAt: Date.now()
    };

    try {
        if (id) {
            // SỬA: Cập nhật kỷ lục đã có trên node records/ID
            await update(ref(db, `records/${id}`), payload);
            recordsData[id] = { ...payload, isNew: false };

            // Ghi nhật ký lịch sử
            await logActivity(
                "Chỉnh Sửa Kỷ Lục", 
                payload.title, 
                `Cập nhật kỷ lục "${payload.title}" của ${payload.holder} (${payload.value})`
            );

        } else {
            // TẠO MỚI: Thêm 1 nhánh tự động sinh ID trong node 'records'
            const newRecordRef = push(ref(db, 'records'));
            const newKey = newRecordRef.key;
            
            await set(newRecordRef, payload);
            
            // Đánh dấu isNew = true để tô màu nổi bật hàng mới thêm
            recordsData[newKey] = { ...payload, isNew: true };

            // Ghi nhật ký lịch sử
            await logActivity(
                "Thêm Kỷ Lục", 
                payload.title, 
                `Thêm kỷ lục mới: "${payload.title}" - ${payload.holder} (${payload.value})`
            );
        }

        renderRecordsTable();
        closeModal();
    } catch (err) {
        console.error("Lỗi khi lưu dữ liệu lên node 'records':", err);
        alert("Lỗi khi lưu kỷ lục: " + err.message);
    }
});

// --- 3. RENDER BẢNG KỶ LỤC DỮ LIỆU ---
function renderRecordsTable() {
    tableBody.innerHTML = "";
    
    let totalCount = 0;
    let playerCount = 0;
    let clubCount = 0;
    let nationalCount = 0;

    const keys = Object.keys(recordsData).reverse();;

    if (keys.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-8 text-gray-400">
                    Chưa có kỷ lục nào trong node <strong>records</strong>. Hãy bấm <strong>Thêm Kỷ Lục Mới</strong>!
                </td>
            </tr>`;
        updateStats(0, 0, 0, 0);
        return;
    }

    keys.forEach(id => {
        const item = recordsData[id];

        // Đếm thống kê
        totalCount++;
        if (item.category === "player") playerCount++;
        if (item.category === "club") clubCount++;
        if (item.category === "national") nationalCount++;

        // Bộ lọc danh mục
        if (currentCategoryFilter !== "all" && item.category !== currentCategoryFilter) return;

        // Bộ lọc tìm kiếm
        const searchStr = `${item.title} ${item.holder} ${item.club}`.toLowerCase();
        if (currentSearchKeyword && !searchStr.includes(currentSearchKeyword.toLowerCase())) return;

        // Highlight màu cam nhẹ nổi bật nếu vừa mới tạo
        const rowBgClass = item.isNew 
            ? "bg-[#FF4500]/20 border-l-4 border-l-[#FF4500] transition-all" 
            : "hover:bg-[#166534]/20 transition-all";

        // Huy hiệu danh mục
        let categoryBadge = "";
        if (item.category === "player") {
            categoryBadge = `<span class="px-2 py-0.5 text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full font-bold">👤 Cầu thủ</span>`;
        } else if (item.category === "club") {
            categoryBadge = `<span class="px-2 py-0.5 text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full font-bold">🛡️ CLB</span>`;
        } else if (item.category === "national") {
            categoryBadge = `<span class="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full font-bold">🌍 ĐTQG</span>`;
        }

        const tr = document.createElement("tr");
        tr.className = `border-b border-[#166534]/30 ${rowBgClass}`;
        tr.innerHTML = `
            <td class="py-4 px-4 font-bold text-white flex flex-col gap-1">
                <span>${item.title}</span>
                <div>${categoryBadge}</div>
            </td>
            <td class="py-4 px-4 text-gray-200 font-semibold">${item.holder}</td>
            <td class="py-4 px-4 text-gray-400">${item.club}</td>
            <td class="py-4 px-3 text-center">
                <span class="px-2.5 py-1 bg-[#FF4500]/20 text-[#FF4500] font-black rounded-lg border border-[#FF4500]/30">
                    ${item.value}
                </span>
            </td>
            <td class="py-4 px-3 text-center text-gray-300">${item.season}</td>
            <td class="py-4 px-4 text-center">
                <div class="flex items-center justify-center gap-2">
                    <button data-id="${id}" class="btn-edit-record px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 rounded-lg font-bold text-[11px] transition-all cursor-pointer">
                        ✏️ Sửa
                    </button>
                    <button data-id="${id}" class="btn-delete-record px-2.5 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 rounded-lg font-bold text-[11px] transition-all cursor-pointer">
                        🗑️ Xóa
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    updateStats(totalCount, playerCount, clubCount, nationalCount);
    attachTableEvents();
}

// Cập nhật thẻ thống kê
function updateStats(total, player, club, national) {
    if (statTotal) statTotal.textContent = total;
    if (statPlayer) statPlayer.textContent = player;
    if (statClub) statClub.textContent = club;
    if (statNational) statNational.textContent = national;
}

// --- 4. BẮT SỰ KIỆN SỬA & XÓA KỶ LỤC TRÊN FIREBASE ---
function attachTableEvents() {
    // Sửa
    document.querySelectorAll(".btn-edit-record").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = btn.getAttribute("data-id");
            openModal(true, id);
        });
    });

    // Xóa khỏi Firebase
    document.querySelectorAll(".btn-delete-record").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = btn.getAttribute("data-id");
            const item = recordsData[id];

            if (confirm(`⚠️ Bạn có chắc chắn muốn xóa kỷ lục: "${item?.title}"?`)) {
                try {
                    await remove(ref(db, `records/${id}`));
                    delete recordsData[id];

                    await logActivity(
                        "Xóa Kỷ Lục", 
                        item?.title || id, 
                        `Đã xóa kỷ lục: "${item?.title}" (Chủ nhân: ${item?.holder})`
                    );
                
                    renderRecordsTable();
                } catch (err) {
                    alert("Lỗi khi xóa kỷ lục: " + err.message);
                }
            }
        });
    });
}

// --- 5. ĐIỀU KHIỂN MODAL POPUP ---
function openModal(isEdit = false, id = null) {
    recordModal.classList.remove("hidden");
    setTimeout(() => {
        recordModal.classList.remove("opacity-0");
        recordModalContent.classList.remove("scale-95");
        recordModalContent.classList.add("scale-100");
    }, 10);

    if (isEdit && id && recordsData[id]) {
        modalTitle.innerHTML = "✏️ Chỉnh Sửa Kỷ Lục";
        const item = recordsData[id];
        inputId.value = id;
        inputTitle.value = item.title;
        inputCategory.value = item.category;
        inputValue.value = item.value;
        inputHolder.value = item.holder;
        inputClub.value = item.club;
        inputSeason.value = item.season;
    } else {
        modalTitle.innerHTML = "➕ Thêm Kỷ Lục Mới";
        recordForm.reset();
        inputId.value = "";
    }
}

function closeModal() {
    recordModal.classList.add("opacity-0");
    recordModalContent.classList.remove("scale-100");
    recordModalContent.classList.add("scale-95");
    setTimeout(() => {
        recordModal.classList.add("hidden");
        recordForm.reset();
    }, 300);
}

// --- KHỞI TẠO EVENT LISTENERS ---
function initEvents() {
    btnOpenCreate?.addEventListener("click", () => openModal(false));
    btnCloseModal?.addEventListener("click", closeModal);
    btnCancelModal?.addEventListener("click", closeModal);

    // Lọc theo nút bấm Danh Mục
    document.querySelectorAll(".record-filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".record-filter-btn").forEach(b => {
                b.classList.remove("active", "bg-[#FF4500]", "text-white");
                b.classList.add("bg-[#071F0E]", "text-gray-300");
            });
            btn.classList.add("active", "bg-[#FF4500]", "text-white");
            btn.classList.remove("bg-[#071F0E]", "text-gray-300");

            currentCategoryFilter = btn.getAttribute("data-category");
            renderRecordsTable();
        });
    });

    // Ô Tìm kiếm
    document.getElementById("search-record-input")?.addEventListener("input", (e) => {
        currentSearchKeyword = e.target.value.trim();
        renderRecordsTable();
    });
}

// --- XÁC THỰC QUYỀN ADMIN BẰNG SESSIONSTORAGE ---
function checkAdminAuth() {
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
checkAdminAuth();

// Khởi tạo trang
document.addEventListener("DOMContentLoaded", () => {
    // Nếu chưa đăng nhập thì dừng toàn bộ việc tải dữ liệu từ Firebase
    if (!checkAdminAuth()) return;

    initEvents();
    loadRecordsFromFirebase();
});
