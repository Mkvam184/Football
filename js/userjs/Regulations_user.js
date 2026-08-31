import { db, ref, get } from "../../data/Firebase.js";

const currentUserId = sessionStorage.getItem('currentUserId');
if (!currentUserId) {
    alert("Vui lòng đăng nhập tài khoản!");
    sessionStorage.clear();
    window.location.href = new URL('../../index.html', import.meta.url).href;
}

document.addEventListener('DOMContentLoaded', async () => {
    const rulesGrid = document.getElementById('rules-grid');
    const privacyGrid = document.getElementById('privacy-grid');
    const tournamentGrid = document.getElementById('tournament-grid');
    const userStatusDisplay = document.getElementById('user-status-display');
    const btnExportData = document.getElementById('btn-export-data');

    // 1. Kiểm tra trạng thái tài khoản
    if (currentUserId) {
        try {
            const profileSnap = await get(ref(db, `account_inform/${currentUserId}`));
            if (profileSnap.exists()) {
                userStatusDisplay.textContent = "Đã Xác Minh (Hoạt Động)";
                userStatusDisplay.className = "text-xs text-emerald-400 font-extrabold";
            } else {
                userStatusDisplay.textContent = "Khách (Chưa Đăng Nhập)";
                userStatusDisplay.className = "text-xs text-amber-400 font-extrabold";
            }
        } catch (e) {
            console.error("Lỗi Firebase:", e);
            userStatusDisplay.textContent = "Lỗi Kết Nối";
            userStatusDisplay.className = "text-xs text-red-400 font-extrabold";
        }
    } else {
        userStatusDisplay.textContent = "Khách (Chưa Đăng Nhập)";
        userStatusDisplay.className = "text-xs text-amber-400 font-extrabold";
    }

    // 2. Load dữ liệu các quy định từ Firebase
    async function loadRegulationsFromFirebase() {
        try {
            const regulationsSnap = await get(ref(db, 'regulations'));
            
            if (!regulationsSnap.exists()) {
                renderEmptyState();
                return;
            }

            const data = regulationsSnap.val();
            const keys = Object.keys(data).reverse();

            let rulesHTML = "";
            let privacyHTML = "";
            let tournamentHTML = "";

            let rulesCount = 0;
            let privacyCount = 0;
            let tournamentCount = 0;

            keys.forEach(id => {
                const item = data[id];
                const icon = item.icon || (item.type === "rules" ? "⚽" : item.type === "privacy" ? "🏟️" : "🏆");
                const bgColor = item.bgColor || "bg-gradient-to-r from-[#241402] via-[#382104] to-[#140A01]";
                const borderColor = item.borderColor || "border-amber-500/40";

                const cardHTML = `
                    <div class="${bgColor} border ${borderColor} rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col justify-between hover:border-white/50 transition-all duration-300 w-full min-h-[160px]">
                        <div class="space-y-3">
                            <div class="flex items-start justify-between gap-3">
                                <div class="flex items-center gap-3">
                                    <span class="text-2xl sm:text-3xl p-2 bg-black/40 rounded-xl border border-white/10 shrink-0">${icon}</span>
                                    <div>
                                        <h3 class="text-base sm:text-lg font-black text-white leading-snug">${item.title}</h3>
                                    </div>
                                </div>
                            </div>
                            <p class="text-xs sm:text-sm text-gray-200 leading-relaxed font-normal line-clamp-2 overflow-hidden text-ellipsis">
                                ${item.content}
                            </p>
                        </div>
                    </div>
                `;

                if (item.type === "rules") {
                    rulesHTML += cardHTML;
                    rulesCount++;
                } else if (item.type === "privacy") {
                    privacyHTML += cardHTML;
                    privacyCount++;
                } else {
                    tournamentHTML += cardHTML;
                    tournamentCount++;
                }
            });

            if (rulesGrid) rulesGrid.innerHTML = rulesCount > 0 ? rulesHTML : `<p class="col-span-full text-center py-6 text-xs text-amber-200/50">Chưa có điều luật thi đấu nào.</p>`;
            if (privacyGrid) privacyGrid.innerHTML = privacyCount > 0 ? privacyHTML : `<p class="col-span-full text-center py-6 text-xs text-blue-200/50">Chưa có quy định sân bãi nào.</p>`;
            if (tournamentGrid) tournamentGrid.innerHTML = tournamentCount > 0 ? tournamentHTML : `<p class="col-span-full text-center py-6 text-xs text-purple-200/50">Chưa có điều lệ giải đấu nào.</p>`;

        } catch (error) {
            console.error("Lỗi khi tải dữ liệu quy định:", error);
        }
    }

    function renderEmptyState() {
        if (rulesGrid) rulesGrid.innerHTML = `<p class="col-span-full text-center py-6 text-xs text-amber-200/50">Chưa có dữ liệu.</p>`;
        if (privacyGrid) privacyGrid.innerHTML = `<p class="col-span-full text-center py-6 text-xs text-blue-200/50">Chưa có dữ liệu.</p>`;
        if (tournamentGrid) tournamentGrid.innerHTML = `<p class="col-span-full text-center py-6 text-xs text-purple-200/50">Chưa có dữ liệu.</p>`;
    }

    await loadRegulationsFromFirebase();

    // 3. TẢI DỮ LIỆU TÀI KHOẢN VỀ MÁY (ACCOUNT_LISTS + ACCOUNT_INFORM)
    if (btnExportData) {    
        const name = sessionStorage.getItem('userNameShow') || "Người Dùng";
        btnExportData.addEventListener('click', async () => {
            if (!currentUserId) {
                alert("Vui lòng đăng nhập để sử dụng tính năng xuất dữ liệu!");
                return;
            }

            try {
                // Đổi trạng thái nút bấm tạm thời
                const originalText = btnExportData.innerHTML;
                btnExportData.disabled = true;
                btnExportData.innerHTML = `<span>⏳</span> Đang Trích Xuất Dữ Liệu...`;

                // Lấy dữ liệu song song từ 2 nhánh Firebase
                const [accountListSnap, accountInformSnap] = await Promise.all([
                    get(ref(db, `account_lists/${currentUserId}`)),
                    get(ref(db, `account_inform/${currentUserId}`))
                ]);

                const listData = accountListSnap.exists() ? accountListSnap.val() : {};
                const informData = accountInformSnap.exists() ? accountInformSnap.val() : {};

                // Định dạng nội dung file TEXT (.txt)
                let textContent = `==================================================\n`;
                textContent += `         THÔNG TIN TÀI KHOẢN NGƯỜI DÙNG          \n`;
                textContent += `==================================================\n`;
                textContent += `Mã người dùng (ID) : ${currentUserId}\n`;
                textContent += `Thời gian xuất file: ${new Date().toLocaleString("vi-VN")}\n`;
                textContent += `==================================================\n\n`;

                textContent += `1. THÔNG TIN HỆ THỐNG (account_lists):\n`;
                textContent += `--------------------------------------------------\n`;
                if (Object.keys(listData).length > 0) {
                    for (const [key, value] of Object.entries(listData)) {
                        textContent += `- ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}\n`;
                    }
                } else {
                    textContent += `(Không có dữ liệu)\n`;
                }

                textContent += `\n2. THÔNG TIN CÁ NHÂN (account_inform):\n`;
                textContent += `--------------------------------------------------\n`;
                if (Object.keys(informData).length > 0) {
                    for (const [key, value] of Object.entries(informData)) {
                        textContent += `- ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}\n`;
                    }
                } else {
                    textContent += `(Không có dữ liệu)\n`;
                }

                textContent += `\n==================================================\n`;
                textContent += `Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi!\n`;

                // Tạo file .txt và kích hoạt tải về
                const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
                const downloadAnchor = document.createElement('a');
                downloadAnchor.href = URL.createObjectURL(blob);
                downloadAnchor.download = `thong_tin_tai_khoan_${name}.txt`;
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                
                // Dọn dẹp memory
                downloadAnchor.remove();
                URL.revokeObjectURL(downloadAnchor.href);

                // Khôi phục nút bấm
                btnExportData.disabled = false;
                btnExportData.innerHTML = originalText;

            } catch (err) {
                console.error("Lỗi khi tải dữ liệu người dùng:", err);
                alert("Đã xảy ra lỗi khi trích xuất dữ liệu. Vui lòng thử lại sau!");
                btnExportData.disabled = false;
                btnExportData.innerHTML = `<span>📥</span> Yêu Cầu Tải Dữ Liệu Cá Nhân`;
            }
        });
    }
});