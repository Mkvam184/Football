import { db, ref, get } from "../../data/Firebase.js";

const currentUserId = sessionStorage.getItem('currentUserId');
    
if (!currentUserId) {
    alert("Vui lòng đăng nhập tài khoản!");
    sessionStorage.clear();
    window.location.href = new URL('../../index.html', import.meta.url).href;
}

document.addEventListener('DOMContentLoaded', async () => {
    const channelsGrid = document.getElementById('channels-grid');
    const musicGrid = document.getElementById('music-grid');
    const gamingGrid = document.querySelector('main section:nth-child(3) .grid'); // Lấy container của Games
    const favTeamDisplay = document.getElementById('fav-team-display');

    // 1. LẤY THÔNG TIN ĐỘI BÓNG YÊU THÍCH CỦA USER
    if (currentUserId) {
        try {
            const profileSnap = await get(ref(db, `account_inform/${currentUserId}`));
            if (profileSnap.exists()) {
                favTeamDisplay.textContent = profileSnap.val().Football_club || "Chưa chọn CLB";
            }
        } catch (e) {
            console.error("Lỗi lấy thông tin cá nhân:", e);
            favTeamDisplay.textContent = "Chưa chọn CLB";
        }
    } else {
        favTeamDisplay.textContent = "Chưa chọn CLB";
    }

    // 2. TẢI DỮ LIỆU GIẢI TRÍ TỪ FIREBASE
    try {
        const snapshot = await get(ref(db, 'entertainment'));
        if (snapshot.exists()) {
            renderEntertainmentUI(snapshot.val());
        } else {
            renderEmptyData();
        }
    } catch (error) {
        console.error("Lỗi khi nạp dữ liệu giải trí:", error);
        renderEmptyData();
    }

    // 3. RENDER UI THEO PHÂN KHU NỘI DUNG
    function renderEntertainmentUI(data) {
        let channelsHTML = "";
        let musicHTML = "";
        let gamingHTML = "";

        Object.keys(data).forEach(id => {
            const item = data[id];

            // Kiểm tra nguồn ảnh (Base64 / URL hay Emoji)
            const isImageSource = item.image && (item.image.startsWith('http://') || item.image.startsWith('https://') || item.image.startsWith('data:image'));
            const avatarContent = isImageSource
                ? `<img src="${item.image}" class="w-full h-full object-cover rounded-xl" alt="${item.title}">`
                : `<span class="text-xl sm:text-2xl">${item.image || '⚽'}</span>`;

            // ----- A. DÃY 1: KÊNH YOUTUBE (RED ZONE) -----
            if (item.type === "channel") {
                channelsHTML += `
                    <div class="bg-black/40 border border-red-500/30 hover:border-red-400 rounded-2xl p-5 backdrop-blur-md transition-all duration-300 flex flex-col justify-between group shadow-xl">
                        <div>
                            <div class="flex items-center gap-3 mb-3">
                                <div class="w-11 h-11 rounded-xl bg-red-900/40 border border-red-600/50 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                                    ${avatarContent}
                                </div>
                                <div class="overflow-hidden">
                                    <strong class="text-sm font-bold text-white block group-hover:text-red-400 transition-colors truncate">${item.title || 'Chưa có tên'}</strong>
                                    <span class="text-[10px] text-red-300/80 block truncate">${item.subtitle || ''}</span>
                                </div>
                            </div>
                            ${item.tag ? `
                                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-500/25 text-red-200 border border-red-500/40 inline-block mb-2">
                                    ${item.tag}
                                </span>
                            ` : ''}
                            <p class="text-xs text-gray-300 line-clamp-2 leading-relaxed mb-4">
                                ${item.desc || 'Chưa có mô tả.'}
                            </p>
                        </div>

                        <a href="${item.link || '#'}" target="_blank" rel="noopener noreferrer" 
                           class="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl text-center transition-all flex items-center justify-center gap-1.5 shadow-md">
                            <span>🔴</span> Xem Kênh
                        </a>
                    </div>
                `;
            } 
            
            // ----- B. DÃY 2: ÂM NHẠC (PURPLE ZONE) -----
            else if (item.type === "music") {
                musicHTML += `
                    <div class="bg-black/40 border border-purple-500/30 hover:border-purple-300 rounded-2xl p-5 backdrop-blur-md transition-all duration-300 flex flex-col justify-between group shadow-xl">
                        <div>
                            <div class="flex items-center justify-between mb-3 gap-2">
                                <div class="w-10 h-10 rounded-xl bg-purple-900/40 border border-purple-600/50 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                                    ${avatarContent}
                                </div>
                                ${item.tag ? `
                                    <span class="text-[10px] font-black uppercase text-purple-200 bg-purple-900/60 px-2.5 py-1 rounded-full border border-purple-500/40 truncate">
                                        ${item.tag}
                                    </span>
                                ` : ''}
                            </div>
                            <strong class="text-sm font-bold text-white block group-hover:text-purple-300 transition-colors mb-1 truncate">
                                ${item.title || 'Bài hát'}
                            </strong>
                            <p class="text-xs text-purple-200/80 mb-2 truncate">
                                ${item.subtitle || 'Chưa rõ nghệ sĩ'}
                            </p>
                            <p class="text-xs text-gray-300 line-clamp-2 leading-relaxed mb-4">
                                ${item.desc || ''}
                            </p>
                        </div>

                        <a href="${item.link || '#'}" target="_blank" rel="noopener noreferrer" 
                           class="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl text-center transition-all flex items-center justify-center gap-1.5 shadow-md">
                            <span>🎧</span> Nghe Nhạc
                        </a>
                    </div>
                `;
            } 

            // ----- C. DÃY 3: GAMING CENTER (GREEN ZONE) -----
            else if (item.type === "gaming") {
                gamingHTML += `
                    <div class="bg-[#0D4230]/70 border border-emerald-500/40 rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between hover:border-emerald-400 transition-all duration-300 group backdrop-blur-md">
                        <div>
                            <div class="flex items-center justify-between mb-4">
                                ${item.tag ? `
                                    <span class="px-3 py-1 text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                                        ${item.tag}
                                    </span>
                                ` : '<span></span>'}
                                <span class="text-xs font-bold text-yellow-400 bg-black/60 px-3 py-1 rounded-full border border-yellow-500/30">
                                    ⭐ ${item.subtitle || 'Mới'}
                                </span>
                            </div>

                            <div class="flex items-center gap-4 mb-4">
                                <div class="w-14 h-14 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center shrink-0 overflow-hidden shadow-md">
                                    ${avatarContent}
                                </div>
                                <h3 class="text-2xl sm:text-3xl font-black text-white group-hover:text-emerald-400 transition-colors truncate">
                                    ${item.title || 'Tựa Game Bóng Đá'}
                                </h3>
                            </div>

                            <p class="text-xs text-emerald-100/80 leading-relaxed mb-6 line-clamp-3">
                                ${item.desc || 'Mô tả game đang được cập nhật.'}
                            </p>
                        </div>

                        <a href="${item.link || '#'}" target="_blank" rel="noopener noreferrer" 
                           class="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-2xl text-center transition-all shadow-lg flex items-center justify-center gap-2">
                            <span>🕹️</span> Truy Cập Trang Chủ Game
                        </a>
                    </div>
                `;
            }
        });

        // Cập nhật DOM
        if (channelsGrid) {
            channelsGrid.innerHTML = channelsHTML || `<p class="col-span-full text-center py-8 text-xs text-red-300/60">Chưa có kênh YouTube nào được chia sẻ.</p>`;
        }
        if (musicGrid) {
            musicGrid.innerHTML = musicHTML || `<p class="col-span-full text-center py-8 text-xs text-purple-300/60">Chưa có bài hát nào được chia sẻ.</p>`;
        }
        if (gamingGrid) {
            gamingGrid.innerHTML = gamingHTML || `<p class="col-span-full text-center py-8 text-xs text-emerald-300/60">Chưa có tựa game nào được đăng tải.</p>`;
        }
    }

    function renderEmptyData() {
        if (channelsGrid) channelsGrid.innerHTML = `<p class="col-span-full text-center py-8 text-xs text-red-300/60">Chưa có nội dung giải trí.</p>`;
        if (musicGrid) musicGrid.innerHTML = `<p class="col-span-full text-center py-8 text-xs text-purple-300/60">Chưa có nội dung giải trí.</p>`;
        if (gamingGrid) gamingGrid.innerHTML = `<p class="col-span-full text-center py-8 text-xs text-emerald-300/60">Chưa có nội dung giải trí.</p>`;
    }
});

// Lắng nghe sự kiện cập nhật cấu hình nếu có
window.addEventListener('update', () => {
    window.location.reload();
});