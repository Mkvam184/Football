import { db, ref, get, set, remove, push } from "../../data/Firebase.js";

let currentAdminName = sessionStorage.getItem('userNameShow') || "Admin";
const currentUserId = sessionStorage.getItem('currentUserId');

if (!currentUserId) {
    alert("Vui lòng đăng nhập tài khoản admin!");
    sessionStorage.clear();
    window.location.href = new URL('../../index.html', import.meta.url).href;
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. SELECTORS - CÁC PHẦN TỬ TRÊN TRANG
    const channelsGrid = document.getElementById('admin-channels-grid');
    const musicGrid = document.getElementById('admin-music-grid');
    const gamingGrid = document.getElementById('admin-gaming-grid');

    // Modal & Form
    const modal = document.getElementById('entertainment-modal');
    const modalCard = document.getElementById('modal-card');
    const form = document.getElementById('entertainment-form');
    const btnOpenCreate = document.getElementById('btn-open-create');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnCancel = document.getElementById('btn-cancel');
    const modalFormTitle = document.getElementById('modal-form-title');

    // Form Inputs
    const itemIdInput = document.getElementById('item-id');
    const itemTypeInput = document.getElementById('item-type');
    const itemTitleInput = document.getElementById('item-title');
    const itemSubtitleInput = document.getElementById('item-subtitle');
    const itemTagInput = document.getElementById('item-tag');
    const itemDescInput = document.getElementById('item-desc');
    const itemLinkInput = document.getElementById('item-link');

    // Upload Image Elements
    const tabModeFile = document.getElementById('tab-mode-file');
    const tabModeUrl = document.getElementById('tab-mode-url');
    const inputFileContainer = document.getElementById('input-file-container');
    const inputUrlContainer = document.getElementById('input-url-container');
    const itemImageFile = document.getElementById('item-image-file');
    const itemImageUrl = document.getElementById('item-image-url');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');

    // MÁY PHIÊN DỊCH TÊN PHÂN KHU (CHO LOG RÕ RÀNG)
    const categoryNames = {
        channel: "🔴 Dãy Đỏ (Kênh YouTube)",
        music: "🎵 Dãy Tím (Âm Nhạc World Cup)",
        gaming: "🕹️ Dãy Xanh (Games Bóng Đá)"
    };

    // LƯU LỊCH SỬ HOẠT ĐỘNG
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

    // Biến trạng thái lưu trữ ảnh
    let currentImageBase64 = ""; 
    let currentUploadMode = "file";

    loadEntertainmentData();

    // 2. CHUYỂN ĐỔI TAB TẢI ẢNH
    if (tabModeFile && tabModeUrl) {
        tabModeFile.addEventListener('click', () => {
            currentUploadMode = "file";
            tabModeFile.className = "flex-1 py-1.5 text-[11px] font-bold rounded-lg bg-[#FF4500] text-white transition-all cursor-pointer";
            tabModeUrl.className = "flex-1 py-1.5 text-[11px] font-bold rounded-lg text-gray-400 hover:text-white transition-all cursor-pointer";
            inputFileContainer.classList.remove('hidden');
            inputUrlContainer.classList.add('hidden');
        });

        tabModeUrl.addEventListener('click', () => {
            currentUploadMode = "url";
            tabModeUrl.className = "flex-1 py-1.5 text-[11px] font-bold rounded-lg bg-[#FF4500] text-white transition-all cursor-pointer";
            tabModeFile.className = "flex-1 py-1.5 text-[11px] font-bold rounded-lg text-gray-400 hover:text-white transition-all cursor-pointer";
            inputUrlContainer.classList.remove('hidden');
            inputFileContainer.classList.add('hidden');
            
            if (!itemImageUrl.value.trim() && !currentImageBase64) {
                imagePreviewContainer.classList.add('hidden');
            }
        });
    }

    // 3. XỬ LÝ ĐỌC ẢNH FILE
    if (itemImageFile) {
        itemImageFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 3 * 1024 * 1024) {
                    alert("Vui lòng chọn tệp ảnh nhỏ hơn 3MB!");
                    itemImageFile.value = "";
                    return;
                }

                const reader = new FileReader();
                reader.onload = (event) => {
                    currentImageBase64 = event.target.result;
                    imagePreview.src = currentImageBase64;
                    imagePreviewContainer.classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (itemImageUrl) {
        itemImageUrl.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            if (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('data:image')) {
                imagePreview.src = val;
                imagePreviewContainer.classList.remove('hidden');
            } else if (currentUploadMode === 'url' && !currentImageBase64) {
                imagePreviewContainer.classList.add('hidden');
            }
        });
    }

    // 4. LOAD VÀ RENDER NỘI DUNG TỪ FIREBASE
    async function loadEntertainmentData() {
        try {
            const snapshot = await get(ref(db, 'entertainment'));
            if (snapshot.exists()) {
                renderUI(snapshot.val());
            } else {
                renderEmpty();
            }
        } catch (error) {
            console.error("Lỗi khi tải dữ liệu giải trí:", error);
        }
    }

    function renderUI(data) {
        let channelsHTML = "", musicHTML = "", gamingHTML = "";

        Object.keys(data).forEach(id => {
            const item = data[id];
            
            const isImageSource = item.image && (item.image.startsWith('http://') || item.image.startsWith('https://') || item.image.startsWith('data:image'));
            const imageContent = isImageSource
                ? `<img src="${item.image}" class="w-full h-full object-cover rounded-xl" alt="${item.title}">`
                : `<span class="text-2xl">${item.image || '⚽'}</span>`;

            let cardBg = "bg-[#180507] border-red-900/50 hover:border-red-500/50";
            let avatarBg = "bg-red-950/80 border-red-800/50";
            let tagBg = "bg-red-950/60 text-red-200 border-red-800/40";
            let btnColor = "bg-[#E50914] hover:bg-red-600 text-white";
            let btnText = "🔴 Xem Kênh";

            if (item.type === "music") {
                cardBg = "bg-[#120524] border-purple-900/50 hover:border-purple-500/50";
                avatarBg = "bg-purple-950/80 border-purple-800/50";
                tagBg = "bg-purple-950/60 text-purple-200 border-purple-800/40";
                btnColor = "bg-purple-600 hover:bg-purple-500 text-white";
                btnText = "🎵 Nghe Nhạc";
            } else if (item.type === "gaming") {
                cardBg = "bg-[#031810] border-emerald-900/50 hover:border-emerald-500/50";
                avatarBg = "bg-emerald-950/80 border-emerald-800/50";
                tagBg = "bg-emerald-950/60 text-emerald-200 border-emerald-800/40";
                btnColor = "bg-emerald-500 hover:bg-emerald-400 text-black";
                btnText = "🕹️ Trang Chủ Game";
            }

            const card = `
                <div class="border rounded-3xl p-6 shadow-xl relative flex flex-col justify-between transition-all duration-300 group ${cardBg}">
                    <div class="absolute top-4 right-4 flex gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity z-10">
                        <button data-id="${id}" class="btn-edit px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black rounded-lg shadow cursor-pointer">Sửa</button>
                        <button data-id="${id}" class="btn-delete px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black rounded-lg shadow cursor-pointer">Xóa</button>
                    </div>

                    <div>
                        <div class="flex items-center gap-3.5 mb-4 pr-16">
                            <div class="w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 overflow-hidden shadow-inner ${avatarBg}">
                                ${imageContent}
                            </div>
                            <div class="overflow-hidden">
                                <h3 class="text-base sm:text-lg font-black text-white leading-tight truncate">${item.title || 'Chưa có tên'}</h3>
                                <p class="text-xs text-gray-400 font-medium truncate mt-0.5">${item.subtitle || ''}</p>
                            </div>
                        </div>

                        ${item.tag ? `
                            <div class="mb-4">
                                <span class="inline-block px-3 py-1 text-[11px] font-extrabold rounded-full border ${tagBg}">
                                    ${item.tag}
                                </span>
                            </div>
                        ` : ''}

                        <p class="text-xs text-gray-300 leading-relaxed font-normal line-clamp-3 mb-6">
                            ${item.desc || 'Chưa có mô tả.'}
                        </p>
                    </div>

                    <a href="${item.link || '#'}" target="_blank" class="w-full py-3 ${btnColor} font-black text-xs rounded-2xl text-center transition-all shadow-md flex items-center justify-center gap-2">
                        <span>${btnText}</span>
                    </a>
                </div>
            `;

            if (item.type === "channel") channelsHTML += card;
            else if (item.type === "music") musicHTML += card;
            else if (item.type === "gaming") gamingHTML += card;
        });

        if (channelsGrid) channelsGrid.innerHTML = channelsHTML || `<p class="col-span-full text-center py-6 text-xs text-red-300/50">Chưa có kênh nào.</p>`;
        if (musicGrid) musicGrid.innerHTML = musicHTML || `<p class="col-span-full text-center py-6 text-xs text-purple-300/50">Chưa có bài hát nào.</p>`;
        if (gamingGrid) gamingGrid.innerHTML = gamingHTML || `<p class="col-span-full text-center py-6 text-xs text-emerald-300/50">Chưa có game nào.</p>`;

        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => openEditModal(btn.dataset.id, data[btn.dataset.id]));
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => deleteItem(btn.dataset.id, data[btn.dataset.id]));
        });
    }

    function renderEmpty() {
        if (channelsGrid) channelsGrid.innerHTML = `<p class="col-span-full text-center py-6 text-xs text-red-300/50">Chưa có dữ liệu.</p>`;
        if (musicGrid) musicGrid.innerHTML = `<p class="col-span-full text-center py-6 text-xs text-purple-300/50">Chưa có dữ liệu.</p>`;
        if (gamingGrid) gamingGrid.innerHTML = `<p class="col-span-full text-center py-6 text-xs text-emerald-300/50">Chưa có dữ liệu.</p>`;
    }

    // 5. MODAL CONTROL
    function openModal() {
        modal.classList.remove('pointer-events-none', 'opacity-0');
        modalCard.classList.remove('scale-95', 'opacity-0');
        modalCard.classList.add('scale-100', 'opacity-100');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.classList.add('opacity-0');
        modalCard.classList.remove('scale-100', 'opacity-100');
        modalCard.classList.add('scale-95', 'opacity-0');
        document.body.style.overflow = '';
        
        setTimeout(() => {
            modal.classList.add('pointer-events-none');
        }, 300);
    }

    if (btnOpenCreate) {
        btnOpenCreate.addEventListener('click', () => {
            itemIdInput.value = "";
            form.reset();
            currentImageBase64 = "";
            imagePreviewContainer.classList.add('hidden');
            tabModeFile.click();
            modalFormTitle.innerHTML = "<span>➕</span> Thêm Mục Giải Trí Mới";
            openModal();
        });
    }

    function openEditModal(id, item) {
        itemIdInput.value = id;
        itemTypeInput.value = item.type || "channel";
        itemTitleInput.value = item.title || "";
        itemSubtitleInput.value = item.subtitle || "";
        itemTagInput.value = item.tag || "";
        itemDescInput.value = item.desc || "";
        itemLinkInput.value = item.link || "";

        currentImageBase64 = item.image || "";

        if (item.image && (item.image.startsWith('data:image') || item.image.startsWith('http'))) {
            imagePreview.src = item.image;
            imagePreviewContainer.classList.remove('hidden');
            itemImageUrl.value = item.image;
        } else {
            imagePreviewContainer.classList.add('hidden');
            itemImageUrl.value = item.image || "";
        }

        modalFormTitle.innerHTML = "<span>✏️</span> Chỉnh Sửa Mục Giải Trí";
        openModal();
    }

    if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
    if (btnCancel) btnCancel.addEventListener('click', closeModal);

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    // 6. LƯU DỮ LIỆU & GHI LOG HISTORY RÕ RÀNG (CREATE / UPDATE)
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            let finalImage = "";
            if (currentUploadMode === "file") {
                finalImage = currentImageBase64 || itemImageUrl.value;
            } else {
                finalImage = itemImageUrl.value;
            }

            const isEdit = Boolean(itemIdInput.value);
            const id = itemIdInput.value || `ent_${Date.now()}`;
            const title = itemTitleInput.value.trim() || "Mục Giải Trí";
            const subtitle = itemSubtitleInput.value.trim();
            const categoryText = categoryNames[itemTypeInput.value] || itemTypeInput.value;

            const newItem = {
                type: itemTypeInput.value,
                title: title,
                subtitle: subtitle,
                image: finalImage,
                tag: itemTagInput.value,
                desc: itemDescInput.value,
                link: itemLinkInput.value
            };

            try {
                await set(ref(db, `entertainment/${id}`), newItem);

                // Ghi nhận Lịch sử hoạt động rõ thông tin
                if (isEdit) {
                    await logActivity(
                        "Sửa Mục Giải Trí", 
                        title, 
                        `Đã cập nhật mục "${title}" (${subtitle || 'Không có phụ đề'}) thuộc ${categoryText}`
                    );
                } else {
                    await logActivity(
                        "Thêm Mục Giải Trí", 
                        title, 
                        `Đã thêm mục mới "${title}" (${subtitle || 'Không có phụ đề'}) vào ${categoryText}`
                    );
                }

                alert("Lưu dữ liệu thành công!");
                closeModal();
                loadEntertainmentData();
            } catch (error) {
                console.error("Lỗi khi lưu dữ liệu:", error);
                alert("Có lỗi xảy ra khi lưu dữ liệu!");
            }
        });
    }

    // 7. XÓA MỤC & GHI LOG HISTORY CHI TIẾT
    async function deleteItem(id, item) {
        const itemTitle = item?.title || "Mục Giải Trí";
        const itemSubtitle = item?.subtitle ? ` (${item.subtitle})` : "";
        const categoryText = categoryNames[item?.type] || "Phân khu giải trí";

        if (confirm(`Bạn có chắc chắn muốn xóa mục "${itemTitle}" không?`)) {
            try {
                await remove(ref(db, `entertainment/${id}`));
                
                // Ghi nhận Log chi tiết đối tượng đã xóa
                await logActivity(
                    "Xóa Mục Giải Trí", 
                    itemTitle, 
                    `Đã xóa thành công mục "${itemTitle}"${itemSubtitle} khỏi ${categoryText}`
                );

                alert("Xóa thành công!");
                loadEntertainmentData();
            } catch (error) {
                console.error("Lỗi khi xóa:", error);
                alert("Không thể xóa mục này!");
            }
        }
    }
});