import { db, ref, get, push, set, remove, update } from "../../data/Firebase.js";

let uploadedImageBase64 = '';
let savedNewsIds = [];
let allNewsData = {};
let currentCategory = 'all';
let userFavTeam = '';

let searchQuery = '';

document.addEventListener('DOMContentLoaded', async () => {
    // Nếu chưa đăng nhập thì dừng toàn bộ việc tải dữ liệu từ Firebase
    if (!checkAdminAuth()) return;
    
    // 1. CHÈN NGUYÊN BỘ MODAL (THÊM/SỬA & XEM CHI TIẾT) VÀO DOM
    injectModalsToDOM();

    // 2. CHÈN NÚT "THÊM BÀI VIẾT" VÀO HEADER
    const adminArea = document.getElementById('admin-create-news-area');
    if (adminArea) {
        adminArea.innerHTML = `
            <button id="btn-open-add-modal" class="px-4 py-2.5 bg-[#FF4500] hover:bg-[#ff5714] text-white text-xs font-bold rounded-full shadow-lg hover:scale-105 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer">
                <span>➕</span> Thêm Bài Viết
            </button>
        `;
        document.getElementById('btn-open-add-modal').addEventListener('click', () => {
            openNewsModal();
        });
    }

    // 3. TẢI VÀ RENDER DỮ LIỆU
    await loadAdminSavedNews();
    await loadNewsData();

    const searchInput = document.getElementById('search-news-input'); // Đảm bảo ID này trùng với ID ô input bên file Blog_admin.html
    searchInput?.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        renderFilteredNews(); // Render lại mỗi khi gõ
    });
    // 4. BẮT SỰ KIỆN FORM LƯU BÀI VIẾT & SỰ KIỆN ĐÓNG MODAL CHI TIẾT
    setupModalEvents();
});

// HÀM CHÈN HTML CÁC MODAL VÀO DOM
function injectModalsToDOM() {
    if (document.getElementById('news-modal')) return;

    const scrollbarStyle = `
    <style>
        /* Tùy chỉnh thanh cuộn cho Modal Chi Tiết */
        #article-modal-content::-webkit-scrollbar {
            width: 6px;
        }
        #article-modal-content::-webkit-scrollbar-track {
            background: #020D06;
            border-radius: 9999px;
        }
        #article-modal-content::-webkit-scrollbar-thumb {
            background: #166534;
            border-radius: 9999px;
        }
        #article-modal-content::-webkit-scrollbar-thumb:hover {
            background: #FF4500;
        }

        /* Áp dụng cho toàn bộ trang web (nếu muốn) */
        ::-webkit-scrollbar {
            width: 8px;
        }
        ::-webkit-scrollbar-track {
            background: #04170A;
        }
        ::-webkit-scrollbar-thumb {
            background: #166534;
            border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #FF4500;
        }
    </style>
    `;

    const modalHTML = scrollbarStyle + `
    <!-- 1. MODAL THÊM / SỬA BÀI VIẾT -->
    <div id="news-modal" class="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center hidden p-4 transition-opacity duration-300 opacity-0">
        <div id="modal-content" class="bg-gradient-to-b from-[#0A2E14] to-[#04170A] border border-[#22c55e]/30 rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative transform scale-95 transition-transform duration-300">
            <button id="close-news-modal" type="button" class="absolute top-5 right-5 w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-all cursor-pointer border border-white/10">✕</button>

            <div class="mb-6">
                <h2 id="modal-title" class="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-[#FF4500]">
                    ➕ Thêm Bài Viết Mới
                </h2>
                <p class="text-[11px] text-emerald-400/80 mt-1">Điền thông tin bên dưới để quản lý bài viết tin tức</p>
            </div>
            
            <form id="news-form" class="space-y-4">
                <input type="hidden" id="news-id">
                <div>
                    <label class="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">Tiêu Đề Bài Viết</label>
                    <input type="text" id="news-title" required placeholder="Nhập tiêu đề tin tức..." class="w-full px-4 py-3 bg-[#020D06] border border-[#166534] focus:border-[#FF4500] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#FF4500] transition-all">
                </div>

                <div>
                    <label class="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">Danh Mục</label>
                    <select id="news-category" class="w-full px-4 py-3 bg-[#020D06] border border-[#166534] focus:border-[#FF4500] rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#FF4500] transition-all cursor-pointer">
                        <option value="Chuyển nhượng">🔥 Chuyển Nhượng</option>
                        <option value="Trận đấu">⚽ Trận Đấu</option>
                        <option value="Góc nhìn">🧠 Góc Nhìn</option>
                        <option value="Ngoại Hạng Anh">🏆 Ngoại Hạng Anh</option>
                    </select>
                </div>

                <div>
                    <div class="flex items-center justify-between mb-1.5">
                        <label class="text-[11px] font-bold text-gray-300 uppercase tracking-wider">Hình Ảnh Banner</label>
                        <div class="flex gap-1 bg-[#020D06] p-1 rounded-lg border border-[#166534]">
                            <button type="button" id="tab-img-link" class="px-2.5 py-1 text-[10px] font-bold rounded-md bg-[#FF4500] text-white transition-all">Dán Link</button>
                            <button type="button" id="tab-img-file" class="px-2.5 py-1 text-[10px] font-bold rounded-md text-gray-400 hover:text-white transition-all">Tải Tệp Lên</button>
                        </div>
                    </div>
                    <div id="img-link-container">
                        <input type="url" id="news-image-url" placeholder="Dán đường dẫn ảnh (https://...)" class="w-full px-4 py-3 bg-[#020D06] border border-[#166534] focus:border-[#FF4500] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#FF4500] transition-all">
                    </div>
                    <div id="img-file-container" class="hidden">
                        <input type="file" id="news-image-file" accept="image/*" class="w-full text-xs text-gray-400 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#166534] file:text-white hover:file:bg-[#22c55e] file:cursor-pointer cursor-pointer bg-[#020D06] border border-[#166534] rounded-xl p-1">
                    </div>
                </div>

                <div>
                    <label class="block text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-1.5">Nội Dung Bài Viết</label>
                    <textarea id="news-desc" rows="4" required placeholder="Nhập nội dung chi tiết bài viết..." class="w-full px-4 py-3 bg-[#020D06] border border-[#166534] focus:border-[#FF4500] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#FF4500] transition-all resize-y min-h-[120px] max-h-[350px]"></textarea>
                </div>

                <div class="flex justify-end items-center gap-3 pt-4 border-t border-white/5">
                    <button type="button" id="btn-cancel-modal" class="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer border border-white/10">Hủy Bỏ</button>
                    <button type="submit" id="btn-save-news" class="px-6 py-2.5 bg-gradient-to-r from-[#FF4500] to-[#ff6a00] hover:from-[#ff5714] text-xs font-bold text-white rounded-xl shadow-lg transition-all cursor-pointer">Lưu Bài Viết</button>
                </div>
            </form>
        </div>
    </div>

    <!-- 2. MODAL XEM CHI TIẾT BÀI VIẾT (MỚI BỔ SUNG) -->
    <div id="article-modal" class="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center hidden p-4 sm:p-6 transition-opacity duration-300 opacity-0">
        <div id="article-modal-content" class="bg-[#051C0C] border border-[#166534] rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative transform scale-95 transition-transform duration-300 text-white">
            
            <button id="close-article-modal" type="button" class="absolute top-4 right-4 z-20 w-9 h-9 flex items-center justify-center bg-black/60 hover:bg-black/90 rounded-full text-white font-bold transition-all border border-white/20 cursor-pointer">✕</button>

            <!-- Banner Ảnh & Badge -->
            <div class="relative h-56 sm:h-72 -mx-6 sm:-mx-8 -mt-6 sm:-mt-8 mb-6 overflow-hidden rounded-t-3xl bg-black">
                <img id="view-article-img" src="" alt="Banner" class="w-full h-full object-cover">
                <div class="absolute inset-0 bg-gradient-to-t from-[#051C0C] via-transparent to-black/30"></div>
                <span id="view-article-category" class="absolute bottom-4 left-6 bg-[#FF4500] text-white text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                    Tin tức
                </span>
            </div>

            <!-- Ngày tháng -->
            <div class="flex items-center gap-2 text-xs text-gray-400 mb-3">
                <span>⏱️ Ngày đăng:</span>
                <span id="view-article-date" class="font-bold text-emerald-400">Vừa xong</span>
            </div>

            <!-- Tiêu đề -->
            <h1 id="view-article-title" class="text-xl sm:text-2xl font-black leading-snug mb-4 text-white">
                Tiêu đề bài viết
            </h1>

            <div class="h-px bg-emerald-500/20 w-full mb-5"></div>

            <!-- Nội dung chi tiết -->
            <div id="view-article-content" class="text-xs sm:text-sm text-gray-200 leading-relaxed whitespace-pre-wrap break-words font-normal">
                Nội dung bài viết...
            </div>
            
            <div class="mt-8 pt-4 border-t border-white/10 flex justify-between items-center">
                <button type="button" id="btn-close-article-bottom" class="px-5 py-2 bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-300 border border-emerald-500/30 text-xs font-bold rounded-xl transition-all cursor-pointer">
                    ← Quay lại danh sách
                </button>
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// HÀM LOAD & RENDER BÀI VIẾT
async function loadNewsData() {
    const emptyMsg = document.getElementById('empty-news-msg');

    try {
        const newsSnap = await get(ref(db, 'blogs'));
        
        if (!newsSnap.exists()) {
            allNewsData = {};
            renderFilteredNews(); // Gọi hàm render khi trống
            return;
        }

        allNewsData = newsSnap.val(); // ➕ Lưu dữ liệu vào biến toàn cục
        renderFilteredNews(); // ➕ Gọi hàm hiển thị bài viết theo danh mục

    } catch (err) {
        console.error("Lỗi khi tải bài viết:", err);
    }
}

// HÀM LỌC VÀ HIỂN THỊ BÀI VIẾT THEO DANH MỤC + CẬP NHẬT SỐ LƯỢNG TIN ĐÃ LƯU
function renderFilteredNews() {
    const container = document.getElementById('news-container');
    const emptyMsg = document.getElementById('empty-news-msg');
    const savedCountEl = document.getElementById('saved-count');

    if (savedCountEl) {
        savedCountEl.textContent = savedNewsIds.length;
    }

    if (!allNewsData || Object.keys(allNewsData).length === 0) {
        container.innerHTML = '';
        if (emptyMsg) emptyMsg.classList.remove('hidden');
        return;
    }

    // 🚀 BƯỚC MỚI: Chuyển Object thành Array và ĐẢO NGUỢC mảng để bài mới tạo hiển thị lên ĐẦU
    const newsArray = Object.keys(allNewsData).map(id => ({
        id: id,
        ...allNewsData[id]
    })).reverse(); // .reverse() đưa bài mới đẩy lên đầu

    let html = '';
    let visibleCount = 0;

    // 🚀 Đổi vòng lặp for..in thành for..of duyệt qua mảng đã đảo ngược
    for (let item of newsArray) {
        const id = item.id;
        const isSaved = savedNewsIds.includes(id);

        const rawContent = item.description || item.content || '';
        const previewText = rawContent.replace(/(https?:\/\/[^\s]+?\.(?:png|jpg|jpeg|gif|webp|svg)(\?[^\s]*)?)/gi, '[Hình ảnh]');

        // Lọc theo tab danh mục
        if (currentCategory === 'my-team') {
            if (!userFavTeam) continue;

            const favTeamLower = userFavTeam.toLowerCase();
            const titleMatch = (item.title || '').toLowerCase().includes(favTeamLower);
            const descMatch = (item.description || item.content || '').toLowerCase().includes(favTeamLower);
            const categoryMatch = (item.category || '').toLowerCase().includes(favTeamLower);
            const teamMatch = (item.team || '').toLowerCase().includes(favTeamLower);

            // Nếu không chứa tên đội bóng yêu thích -> Bỏ qua
            if (!titleMatch && !descMatch && !categoryMatch && !teamMatch) continue;
        } 
        else if (currentCategory === 'saved') {
            if (!isSaved) continue;
        } 
        else if (currentCategory !== 'all' && item.category !== currentCategory) {
            continue;
        }

        if (searchQuery) {
            const titleMatch = (item.title || '').toLowerCase().includes(searchQuery);
            const categoryMatch = (item.category || '').toLowerCase().includes(searchQuery);
            const descMatch = (item.description || item.content || '').toLowerCase().includes(searchQuery);

            // Nếu không khớp với bất kỳ trường nào thì bỏ qua bài viết này
            if (!titleMatch && !categoryMatch && !descMatch) continue;
        }

        visibleCount++;

        const adminBtnsHTML = `
            <div class="absolute top-3 right-3 flex gap-1.5 z-10 bg-black/80 backdrop-blur-md p-1.5 rounded-xl border border-white/20 shadow-lg">
                <button data-id="${id}" class="btn-edit-news text-[11px] bg-yellow-500 hover:bg-yellow-400 text-black px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer shadow">
                    ✏️ Sửa
                </button>
                <button data-id="${id}" class="btn-delete-news text-[11px] bg-red-600 hover:bg-red-500 text-white px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer shadow">
                    🗑️ Xóa
                </button>
            </div>
        `;

        html += `
            <div data-id="${id}" class="card-article bg-[#0D3B1B] border border-[#166534] hover:border-[#FF4500] rounded-2xl overflow-hidden shadow-xl transition-all duration-300 relative group flex flex-col cursor-pointer hover:-translate-y-1">
                ${adminBtnsHTML}
                
                <div class="h-44 bg-[#051C0C] relative overflow-hidden">
                    <img src="${item.image || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80'}" alt="${item.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                    <span class="absolute bottom-3 left-3 bg-[#FF4500] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                        ${item.category || 'Tin tức'}
                    </span>
                </div>

                <div class="p-5 flex-1 flex flex-col justify-between">
                    <div>
                        <h3 class="font-black text-base text-white group-hover:text-[#FF4500] transition-colors line-clamp-2">
                            ${item.title}
                        </h3>
                        <p class="text-xs text-gray-300 mt-2 line-clamp-3">
                            ${previewText}
                        </p>
                    </div>
                    <div class="mt-4 pt-3 border-t border-[#166534]/50 flex justify-between items-center text-[11px] text-gray-400">
                        <span>⏱️ ${item.date || 'Vừa xong'}</span>
                        <button data-id="${id}" class="btn-save-bookmark hover:text-[#FF4500] transition-colors cursor-pointer flex items-center gap-1 font-bold ${isSaved ? 'text-[#FF4500]' : ''}">
                            ${isSaved ? '🔖 Đã lưu' : '📑 Lưu tin'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    if (visibleCount === 0) {
        container.innerHTML = '';
        if (emptyMsg) emptyMsg.classList.remove('hidden');
    } else {
        if (emptyMsg) emptyMsg.classList.add('hidden');
        container.innerHTML = html;
        attachCardEvents(allNewsData);
    }
}

async function loadAdminSavedNews() {
    const currentUserId = sessionStorage.getItem('currentUserId');
    if (!currentUserId) return;

    try {
        const snap = await get(ref(db, `account_inform/${currentUserId}`));
        if (snap.exists()) {
            const userData = snap.val();
            userFavTeam = userData.Football_club || "";
            savedNewsIds = userData.saved_news || [];
        }
    } catch (err) {
        console.error("Lỗi khi tải danh sách tin đã lưu:", err);
    }
}


// 💡 Hàm kiểm tra: Nếu đoạn văn có chứa URL dạng ảnh thì đổi thành thẻ <img>
function formatContentWithImages(content) {
    if (!content) return '';

    // Tìm các đường dẫn có đuôi png, jpg, jpeg, gif, webp
    const imgRegex = /(https?:\/\/[^\s]+?\.(?:png|jpg|jpeg|gif|webp|svg)(\?[^\s]*)?)/gi;

    // Thay thế đường dẫn tìm được thành thẻ <img ... />
    let formatted = content.replace(imgRegex, (match) => {
        return `<div class="my-4 flex justify-center">
            <img src="${match}" alt="Ảnh bài viết" class="max-w-full h-auto rounded-xl border border-emerald-500/20 shadow-md object-cover max-h-[450px]" loading="lazy">
        </div>`;
    });

    // Chuyển dấu xuống dòng (\n) thành thẻ <br> để văn bản xuống dòng đúng
    return formatted.replace(/\n/g, '<br>');
}


// 🛠️ HÀM BẮT SỰ KIỆN NÚT VÀ CLICK CARD BÀI VIẾT

function attachCardEvents(newsData) {
    // 1. Click vào Card -> Chuyển trang (nhưng bỏ qua nếu bấm các nút chức năng)
    document.querySelectorAll('.card-article').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.btn-edit-news') || 
                e.target.closest('.btn-delete-news') || 
                e.target.closest('.btn-save-bookmark')) {
                return; // Ngăn chuyển trang khi bấm nút Sửa/Xóa/Lưu
            }

            const newsId = card.getAttribute('data-id');
            if (newsId) {
                window.location.href = `${new URL('../../pages/Artical.html', import.meta.url).href}?id=${newsId}&from=admin`;
            }
        });
    });

    // 2. Click Nút Lưu Tin -> Cập nhật mảng & Đẩy lên Firebase
    document.querySelectorAll('.btn-save-bookmark').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation(); // Chặn lan truyền sự kiện
            const newsId = btn.getAttribute('data-id');
            const loggedInUserId = sessionStorage.getItem('currentUserId');

            if (!loggedInUserId) {
                alert("Vui lòng đăng nhập để lưu bài viết!");
                return;
            }

            if (!newsId) return;

            // Thêm hoặc Xóa ID bài viết trong mảng local
            if (savedNewsIds.includes(newsId)) {
                savedNewsIds = savedNewsIds.filter(id => id !== newsId);
            } else {
                savedNewsIds.push(newsId);
            }

            // Render lại giao diện ngay để hiển thị nút "Đã lưu" / "Lưu tin"
            await loadNewsData();

            // Cập nhật lên Firebase
            try {
                await update(ref(db, `account_inform/${loggedInUserId}`), {
                    saved_news: savedNewsIds
                });
            } catch (err) {
                console.error("Lỗi đồng bộ Firebase:", err);
                alert("Không thể lưu bài viết. Vui lòng kiểm tra lại!");
            }
        });
    });

    // 3. Sự kiện Click Nút Sửa
    document.querySelectorAll('.btn-edit-news').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const newsId = e.target.getAttribute('data-id');
            const item = newsData[newsId];
            if (item) openNewsModal(newsId, item);
        });
    });

    // 4. Sự kiện Click Nút Xóa
    document.querySelectorAll('.btn-delete-news').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const newsId = e.target.getAttribute('data-id');

            const item = newsData[newsId];
            const blogTitle = item?.title || newsId;

            if (confirm('⚠️ Bạn có chắc chắn muốn xóa bài viết này không?')) {
                try {
                    await remove(ref(db, `blogs/${newsId}`));
                    await logActivity("Xóa Bài Viết", blogTitle, `Đã xóa bài viết: "${blogTitle}"`);
                    alert('Đã xóa bài viết thành công!');
                    loadNewsData();
                } catch (err) {
                    alert('Lỗi xóa bài viết: ' + err.message);
                }
            }
        });
    });
}

function closeArticleModal() {
    const modal = document.getElementById('article-modal');
    const modalContent = document.getElementById('article-modal-content');

    modal.classList.add('opacity-0');
    modalContent.classList.remove('scale-100');
    modalContent.classList.add('scale-95');

    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

// 🛠️ HÀM MỞ/ĐÓNG MODAL THÊM SỬA
function openNewsModal(newsId = null, data = null) {
    const modal = document.getElementById('news-modal');
    const modalContent = document.getElementById('modal-content');
    const modalTitle = document.getElementById('modal-title');
    
    document.getElementById('news-form').reset();
    document.getElementById('news-id').value = '';
    uploadedImageBase64 = '';

    switchImageTab('link');

    if (newsId && data) {
        modalTitle.textContent = '✏️ Chỉnh Sửa Bài Viết';
        document.getElementById('news-id').value = newsId;
        document.getElementById('news-title').value = data.title || '';
        document.getElementById('news-category').value = data.category || 'Chuyển nhượng';
        document.getElementById('news-image-url').value = data.image || '';
        document.getElementById('news-desc').value = data.description || data.content || '';
    } else {
        modalTitle.textContent = '➕ Thêm Bài Viết Mới';
    }

    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modalContent.classList.remove('scale-95');
        modalContent.classList.add('scale-100');
    }, 10);
}

function closeNewsModal() {
    const modal = document.getElementById('news-modal');
    const modalContent = document.getElementById('modal-content');

    modal.classList.add('opacity-0');
    modalContent.classList.remove('scale-100');
    modalContent.classList.add('scale-95');

    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

// ==========================================
// 🛠️ HÀM CHUYỂN TAB ẢNH
// ==========================================
function switchImageTab(mode) {
    const tabLink = document.getElementById('tab-img-link');
    const tabFile = document.getElementById('tab-img-file');
    const containerLink = document.getElementById('img-link-container');
    const containerFile = document.getElementById('img-file-container');

    if (mode === 'link') {
        tabLink.className = "px-2.5 py-1 text-[10px] font-bold rounded-md bg-[#FF4500] text-white transition-all";
        tabFile.className = "px-2.5 py-1 text-[10px] font-bold rounded-md text-gray-400 hover:text-white transition-all";
        containerLink.classList.remove('hidden');
        containerFile.classList.add('hidden');
    } else {
        tabFile.className = "px-2.5 py-1 text-[10px] font-bold rounded-md bg-[#FF4500] text-white transition-all";
        tabLink.className = "px-2.5 py-1 text-[10px] font-bold rounded-md text-gray-400 hover:text-white transition-all";
        containerFile.classList.remove('hidden');
        containerLink.classList.add('hidden');
    }
}

// ==========================================
// 🛠️ HÀM BẮT SỰ KIỆN FORM VÀ ĐÓNG MODAL
// ==========================================
function setupModalEvents() {
    const closeBtn = document.getElementById('close-news-modal');
    const cancelBtn = document.getElementById('btn-cancel-modal');
    const form = document.getElementById('news-form');
    const tabLink = document.getElementById('tab-img-link');
    const tabFile = document.getElementById('tab-img-file');
    const fileInput = document.getElementById('news-image-file');

    // Nút đóng modal Xem bài viết
    const closeArticleBtn = document.getElementById('close-article-modal');
    const closeArticleBottomBtn = document.getElementById('btn-close-article-bottom');

    if (closeArticleBtn) closeArticleBtn.addEventListener('click', closeArticleModal);
    if (closeArticleBottomBtn) closeArticleBottomBtn.addEventListener('click', closeArticleModal);

    if (closeBtn) closeBtn.addEventListener('click', closeNewsModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeNewsModal);

    if (tabLink) tabLink.addEventListener('click', () => switchImageTab('link'));
    if (tabFile) tabFile.addEventListener('click', () => switchImageTab('file'));

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    uploadedImageBase64 = reader.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const newsId = document.getElementById('news-id').value;
            const title = document.getElementById('news-title').value.trim();
            const category = document.getElementById('news-category').value;
            const imageUrl = document.getElementById('news-image-url').value.trim();
            const description = document.getElementById('news-desc').value.trim();

            let finalImage = uploadedImageBase64 || imageUrl;
            if (!finalImage) {
                finalImage = 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80';
            }

            const postData = {
                title,
                category,
                image: finalImage,
                description,
                date: new Date().toLocaleDateString('vi-VN')
            };

            try {
                if (newsId) {
                    await update(ref(db, `blogs/${newsId}`), postData);
                    await logActivity("Sửa Bài Viết", title, `Cập nhật bài viết: "${title}"`);
                    alert('Cập nhật bài viết thành công!');
                } else {
                    const newRef = push(ref(db, 'blogs'));
                    await set(newRef, postData);
                    await logActivity("Thêm Bài Viết", title, `Tạo bài viết mới: "${title}" (Danh mục: ${category})`);
                    alert('Thêm bài viết mới thành công!');
                }

                closeNewsModal();
                loadNewsData();
            } catch (err) {
                alert('Có lỗi xảy ra: ' + err.message);
            }
        });
    }
}

// HÀM GHI NHẬT KÝ LỊCH SỬ LÊN FIREBASE
async function logActivity(action, target, details) {
    try {
        const historyRef = ref(db, 'system_history');
        const now = new Date();
        const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} - ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getFullYear()}`;
        
        // Lấy tên admin đang làm việc từ sessionStorage (nếu chưa có thì để mặc định 'Admin')
        const currentAdminName = sessionStorage.getItem('userNameShow') || 'Admin';

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


// Bắt sự kiện click vào các nút Tabs danh mục
document.querySelectorAll('.news-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
        document.querySelectorAll('.news-tab').forEach(t => {
            t.classList.remove('bg-[#FF4500]', 'text-white', 'shadow-md');
            t.classList.add('bg-[#0D3B1B]', 'text-gray-300');
        });
        
        tab.classList.remove('bg-[#0D3B1B]', 'text-gray-300');
        tab.classList.add('bg-[#FF4500]', 'text-white', 'shadow-md');

        // Gán chính xác danh mục (kể cả 'my-team', 'saved', 'all', hay các danh mục khác)
        currentCategory = tab.getAttribute('data-category') || 'all';

        // Render lại giao diện
        renderFilteredNews();
    });
});