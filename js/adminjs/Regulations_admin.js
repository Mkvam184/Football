import { db, ref, get, set, update, remove, push } from "../../data/Firebase.js";

let regulationsData = {};
let currentAdminName = sessionStorage.getItem("userNameShow");

// DOM Elements - Grids
const adminRulesGrid = document.getElementById("admin-rules-grid");
const adminPrivacyGrid = document.getElementById("admin-privacy-grid");
const adminTournamentGrid = document.getElementById("admin-tournament-grid");

// DOM Elements - Stats
const statRulesCount = document.getElementById("stat-rules-count");
const statPrivacyCount = document.getElementById("stat-privacy-count");
const statTournamentCount = document.getElementById("stat-tournament-count");

// Modal Elements
const ruleModal = document.getElementById("rule-modal");
const ruleModalContent = document.getElementById("rule-modal-content");
const ruleForm = document.getElementById("rule-form");
const ruleModalTitle = document.getElementById("rule-modal-title");

const inputRuleId = document.getElementById("rule-id");
const inputRuleType = document.getElementById("rule-type");
const inputRuleTitle = document.getElementById("rule-title");
const inputRuleIcon = document.getElementById("rule-icon");
const inputRuleContent = document.getElementById("rule-content");
const inputRuleBgColor = document.getElementById("rule-bg-color");
const inputRuleBorderColor = document.getElementById("rule-border-color");

const btnOpenCreate = document.getElementById("btn-open-create-rule");
const btnCloseModal = document.getElementById("close-rule-modal");
const btnCancelModal = document.getElementById("btn-cancel-rule-modal");


// --- HÀM GHI LỊCH SỬ THAO TÁC NGẦM LÊN FIREBASE ---
async function logActivity(action, target, details) {
    try {
        const historyRef = ref(db, 'system_history');
        const now = new Date();
        const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} - ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getFullYear()}`;
        
        await push(historyRef, {
            admin: currentAdminName, // Đổi từ adminName -> admin
            action: action,          // Ví dụ: "Xóa Điều Luật", "Sửa Điều Luật"
            target: target,          // Tên bài/điều luật tác động
            details: details,        // Chi tiết hành động (Đổi từ detail -> details)
            timestamp: timeString,   // Định dạng hh:mm - dd/mm/yyyy
            createdAt: Date.now()
        });
    } catch (err) {
        console.error("Lỗi ghi lịch sử:", err);
    }
}

function getAdminNameFromStorage() {
    return sessionStorage.getItem("userNameShow") || 
           sessionStorage.getItem("username") || 
           sessionStorage.getItem("currentUserName") || 
           "Admin";
}

// --- 1. XÁC THỰC ADMIN ---
async function checkAdminAuth() {
    const currentUserId = sessionStorage.getItem("currentUserId");
    if (!currentUserId) {
        alert("⚠️ Bạn chưa đăng nhập!");
        window.location.href = new URL('../../index.html', import.meta.url).href;
        return false;
    }
    try {
        const [userSnap, listSnap] = await Promise.all([
            get(ref(db, `account_inform/${currentUserId}`)),
            get(ref(db, `account_lists/${currentUserId}`))
        ]);

        const listData = listSnap.exists() ? listSnap.val() : {};
        const role = listData.role || listData.Role || "user";

        if (role.toLowerCase() !== "admin") {
            alert("⚠️ Bạn không có quyền Admin!");
            window.location.href = new URL('../../index.html', import.meta.url).href;
            return false;
        }

        const storageName = getAdminNameFromStorage();
        if (storageName !== "Admin") {
            currentAdminName = storageName;
        } else if (userSnap.exists()) {
            currentAdminName = userSnap.val().name || userSnap.val().Username || "Admin";
        }

        return true;
    } catch (err) {
        console.error("Lỗi xác thực Admin:", err);
        return false;
    }
}

// --- 2. TẢI TỪ FIREBASE NODE 'regulations' ---
async function loadRegulationsFromFirebase() {
    try {
        const snapshot = await get(ref(db, 'regulations'));
        regulationsData = snapshot.exists() ? snapshot.val() : {};
        renderRegulations();
    } catch (err) {
        console.error("Lỗi khi tải dữ liệu node 'regulations':", err);
    }
}

// --- 3. RENDER BÀI BẤM HỖ TRỢ 2 BÀI / 1 DÒNG TRÊN MÁY TÍNH ---
function renderRegulations() {
    if (!adminRulesGrid || !adminPrivacyGrid || !adminTournamentGrid) return;

    adminRulesGrid.innerHTML = "";
    adminPrivacyGrid.innerHTML = "";
    adminTournamentGrid.innerHTML = "";

    let rulesCount = 0;
    let privacyCount = 0;
    let tournamentCount = 0;

    const keys = Object.keys(regulationsData).reverse();

    keys.forEach(id => {
        const item = regulationsData[id];
        const icon = item.icon || (item.type === "rules" ? "⚽" : item.type === "privacy" ? "🏟️" : "🏆");
        
        const bgColor = item.bgColor || "bg-gradient-to-r from-[#241402] via-[#382104] to-[#140A01]";
        const borderColor = item.borderColor || "border-amber-500/40";

        // Thẻ thiết kế gọn gàng - ĐÃ LOẠI BỎ DÒNG HIỂN THỊ ID
        const card = document.createElement("div");
        card.className = `${bgColor} border ${borderColor} rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col justify-between hover:border-white/50 transition-all duration-300 w-full min-h-[200px]`;
        
        card.innerHTML = `
            <div class="space-y-3">
                <div class="flex items-start justify-between gap-3">
                    <div class="flex items-center gap-3">
                        <span class="text-2xl sm:text-3xl p-2 bg-black/40 rounded-xl border border-white/10 shrink-0">${icon}</span>
                        <div>
                            <h3 class="text-base sm:text-lg font-black text-white leading-snug">${item.title}</h3>
                        </div>
                    </div>
                </div>
                <!-- Giới hạn tối đa 2 dòng, tự động cắt bằng dấu ... -->
                <p class="text-xs sm:text-sm text-gray-200 leading-relaxed font-normal line-clamp-2 overflow-hidden text-ellipsis">
                    ${item.content}
                </p>
            </div>

            <div class="flex items-center justify-end gap-2 pt-4 border-t border-white/10 mt-4">
                <button data-id="${id}" class="btn-edit-rule px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1">
                    ✏️ Sửa
                </button>
                <button data-id="${id}" class="btn-delete-rule px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1">
                    🗑️ Xóa
                </button>
            </div>
        `;

        if (item.type === "rules") {
            rulesCount++;
            adminRulesGrid.appendChild(card);
        } else if (item.type === "privacy") {
            privacyCount++;
            adminPrivacyGrid.appendChild(card);
        } else {
            tournamentCount++;
            adminTournamentGrid.appendChild(card);
        }
    });

    if (rulesCount === 0) adminRulesGrid.innerHTML = `<p class="col-span-full text-center py-6 text-xs text-amber-200/50">Chưa có điều luật thi đấu nào.</p>`;
    if (privacyCount === 0) adminPrivacyGrid.innerHTML = `<p class="col-span-full text-center py-6 text-xs text-blue-200/50">Chưa có quy định sân bãi nào.</p>`;
    if (tournamentCount === 0) adminTournamentGrid.innerHTML = `<p class="col-span-full text-center py-6 text-xs text-purple-200/50">Chưa có điều lệ giải đấu nào.</p>`;

    if (statRulesCount) statRulesCount.textContent = rulesCount;
    if (statPrivacyCount) statPrivacyCount.textContent = privacyCount;
    if (statTournamentCount) statTournamentCount.textContent = tournamentCount;

    attachCardEvents();
}

// --- 4. SỰ KIỆN SỬA / XÓA ---
function attachCardEvents() {
    document.querySelectorAll(".btn-edit-rule").forEach(btn => {
        btn.addEventListener("click", () => openModal(true, btn.getAttribute("data-id")));
    });

    document.querySelectorAll(".btn-delete-rule").forEach(btn => {
        btn.addEventListener("click", async () => {
            const id = btn.getAttribute("data-id");
            if (confirm(`⚠️ Bạn chắc chắn muốn xóa điều luật này?`)) {
                // 1. Khai báo biến deletedTitle TRƯỚC KHI xóa hoặc dùng
                const deletedTitle = regulationsData[id]?.title || id;

                // 2. Thực hiện xóa trên Firebase và local state
                await remove(ref(db, `regulations/${id}`));
                delete regulationsData[id];

                // 3. Ghi log ngầm lên Firebase
                await logActivity("Xóa Điều Luật", deletedTitle, `Đã xóa điều luật: "${deletedTitle}"`);

                // 4. Render lại giao diện
                renderRegulations();
            }
        });
    });
}

// --- 5. CHỌN MÀU NỀN ---
document.querySelectorAll(".btn-color-pick").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".btn-color-pick").forEach(b => b.classList.remove("ring-4", "ring-white"));
        btn.classList.add("ring-4", "ring-white");

        inputRuleBgColor.value = btn.getAttribute("data-bg");
        inputRuleBorderColor.value = btn.getAttribute("data-border");
    });
});

// --- 6. LƯU LÊN FIREBASE ---
ruleForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = inputRuleId.value;
    const payload = {
        type: inputRuleType.value,
        title: inputRuleTitle.value.trim(),
        icon: inputRuleIcon.value.trim(),
        content: inputRuleContent.value.trim(),
        bgColor: inputRuleBgColor.value,
        borderColor: inputRuleBorderColor.value,
        updatedAt: Date.now()
    };

    if (!payload.title || !payload.content) {
        alert("Vui lòng nhập đầy đủ tên điều luật và nội dung!");
        return;
    }

    try {
        if (id) {
            await update(ref(db, `regulations/${id}`), payload);
            regulationsData[id] = payload;

            await logActivity("Sửa Điều Luật", payload.title, `Đã cập nhật điều luật: "${payload.title}"`);

        } else {
            payload.createdAt = Date.now();
            const newRef = push(ref(db, 'regulations'));
            await set(newRef, payload);
            regulationsData[newRef.key] = payload;

            await logActivity("Thêm Điều Luật", payload.title, `Đã tạo mới điều luật: "${payload.title}"`);
        }

        renderRegulations();
        closeModal();
    } catch (err) {
        alert("Lỗi khi lưu dữ liệu lên Firebase: " + err.message);
    }
});

function openModal(isEdit = false, id = null) {
    ruleModal.classList.remove("pointer-events-none", "opacity-0");
    ruleModalContent.classList.remove("scale-95");
    ruleModalContent.classList.add("scale-100");

    if (isEdit && id && regulationsData[id]) {
        ruleModalTitle.innerHTML = "✏️ Chỉnh Sửa Điều Luật";
        const item = regulationsData[id];
        inputRuleId.value = id;
        inputRuleType.value = item.type || "rules";
        inputRuleTitle.value = item.title;
        inputRuleIcon.value = item.icon || "";
        inputRuleContent.value = item.content;
        inputRuleBgColor.value = item.bgColor || "bg-gradient-to-r from-[#241402] via-[#382104] to-[#140A01]";
        inputRuleBorderColor.value = item.borderColor || "border-amber-500/40";
    } else {
        ruleModalTitle.innerHTML = "⚽ Thêm Điều Luật Mới";
        ruleForm.reset();
        inputRuleId.value = "";
    }
}

function closeModal() {
    ruleModal.classList.add("opacity-0", "pointer-events-none");
    ruleModalContent.classList.remove("scale-100");
    ruleModalContent.classList.add("scale-95");
}

document.addEventListener("DOMContentLoaded", async () => {
    if (await checkAdminAuth()) {
        btnOpenCreate?.addEventListener("click", () => openModal(false));
        btnCloseModal?.addEventListener("click", closeModal);
        btnCancelModal?.addEventListener("click", closeModal);
        await loadRegulationsFromFirebase();
    }
});