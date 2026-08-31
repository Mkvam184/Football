import { db, ref, get, update } from "../../data/Firebase.js";

// Mock Data Bài viết bóng đá (Sau này bạn có thể thay bằng fetch Realtime Database từ Firebase)
let mockNewsData = [];

const currentUserId = sessionStorage.getItem('currentUserId');

if (!currentUserId) {
    alert("Vui lòng đăng nhập tài khoản!");
    sessionStorage.clear();
    window.location.href = new URL('../../index.html', import.meta.url).href;
}

document.addEventListener('DOMContentLoaded', async () => {
    const newsContainer = document.getElementById('news-container');
    const emptyMsg = document.getElementById('empty-news-msg');
    const searchInput = document.getElementById('search-news-input');
    const favTeamLabel = document.getElementById('user-fav-team-label');
    const savedCountEl = document.getElementById('saved-count');

    let userFavTeam = "";
    let savedNewsIds = [];
    let currentCategory = "all";
    let searchQuery = "";


    // 1. Lấy thông tin Đội bóng yêu thích của User từ Firebase
    if (currentUserId) {
        try {
            const profileSnap = await get(ref(db, `account_inform/${currentUserId}`));
            if (profileSnap.exists()) {
                const userData = profileSnap.val();
                userFavTeam = profileSnap.val().Football_club || "";
                if (userFavTeam) {
                    favTeamLabel.textContent = userFavTeam;
                }

                // Lấy mảng tin đã lưu từ Firebase (nếu chưa có thì gán mảng rỗng)
                savedNewsIds = userData.saved_news || [];
            }
        } catch (err) {
            console.error("Lỗi lấy thông tin CLB yêu thích:", err);
        }
    }

    // 2. Cập nhật số lượng tin đã lưu
    function updateSavedCount() {
        if (savedCountEl) savedCountEl.textContent = savedNewsIds.length;
    }

    async function fetchNewsFromFirebase() {
        try {
            const newsSnap = await get(ref(db, 'blogs'));
            mockNewsData = [];

            if (newsSnap.exists()) {
                const data = newsSnap.val();
                const tempArray = [];
                for (let key in data) {
                    tempArray.push({
                        id: key,
                        ...data[key]
                    });
                }
                // Đưa các bài đăng mới nhất lên đầu danh sách
                mockNewsData = tempArray.reverse();
            }
            renderNews();
        } catch (err) {
            console.error("Lỗi nạp bài viết từ Firebase:", err);
            if (emptyMsg) emptyMsg.classList.remove('hidden');
        }
    }

    // 3. Hàm Render danh sách Card tin tức
    function renderNews() {
        let filtered = mockNewsData.filter(item => {
            // Lọc theo Tab
            if (currentCategory === 'my-team') {
                if (!userFavTeam) return false; // Nếu chưa chọn đội bóng yêu thích thì không hiển thị

                const favTeamLower = userFavTeam.toLowerCase();
                const titleMatch = (item.title || '').toLowerCase().includes(favTeamLower);
                const descMatch = (item.description || item.content || '').toLowerCase().includes(favTeamLower);
                const categoryMatch = (item.category || '').toLowerCase().includes(favTeamLower);
                const teamMatch = (item.team || '').toLowerCase().includes(favTeamLower);

                // Nếu bài viết KHÔNG chứa tên đội bóng yêu thích ở bất kỳ đâu -> Bỏ qua
                if (!titleMatch && !descMatch && !categoryMatch && !teamMatch) {
                    return false;
                }
            }
            if (currentCategory === 'saved') {
                if (!savedNewsIds.includes(item.id)) return false;
            }

            // Lọc theo Từ khóa Tìm kiếm
            if (searchQuery) {
                const title = (item.title || '').toLowerCase();
                const category = (item.category || '').toLowerCase();
                const description = (item.description || item.content || '').toLowerCase();
                const team = (item.team || '').toLowerCase();

                const matchTitle = title.includes(searchQuery);
                const matchCategory = category.includes(searchQuery);
                const matchDesc = description.includes(searchQuery);
                const matchTeam = team.includes(searchQuery);

                return matchTitle || matchCategory || matchDesc || matchTeam;
            }

            return true;
        });

        if (filtered.length === 0) {
            newsContainer.innerHTML = '';
            emptyMsg.classList.remove('hidden');
            return;
        }

        emptyMsg.classList.add('hidden');
        newsContainer.innerHTML = filtered.map(item => {
            const isSaved = savedNewsIds.includes(item.id);
            return `
            <article data-id="${item.id}" class="card-news bg-[#0D3B1B] border border-[#166534] rounded-2xl overflow-hidden shadow-lg hover:border-[#FF4500]/60 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
                <div>
                    <!-- Ảnh bài viết -->
                    <div class="relative h-48 w-full overflow-hidden">
                        <img src="${item.image}" alt="${item.title}" class="w-full h-full object-cover transition-transform duration-500 hover:scale-105">
                        <span class="absolute top-3 left-3 bg-[#071F0E]/80 backdrop-blur-md text-[#FF4500] text-[10px] font-bold px-2.5 py-1 rounded-full border border-[#FF4500]/30">
                            ${item.category}
                        </span>
                        
                        <!-- Nút Bookmark Lưu Tin -->
                        <button 
                          data-id="${item.id}" 
                          class="bookmark-btn absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-[#FF4500] text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm">
                            ${isSaved ? '🔖' : '📑'}
                        </button>
                    </div>

                    <!-- Nội dung bài viết -->
                    <div class="p-5">
                        <div class="flex items-center gap-2 text-[11px] text-emerald-400 font-medium mb-2">
                            <span>⏱️ ${item.date}</span>
                        </div>
                        <h3 class="text-base font-bold text-white leading-snug line-clamp-2 hover:text-[#FF4500] transition-colors cursor-pointer">
                            ${item.title}
                        </h3>
                        <p class="text-xs text-gray-300 mt-2 line-clamp-2 leading-relaxed">
                            ${item.description}
                        </p>
                    </div>
                </div>

                <!-- Footer Card -->
                <div class="px-5 pb-5 pt-2 border-t border-[#166534]/40 flex items-center justify-between">
                    <span class="text-[11px] text-gray-400">Đọc trong 3 phút</span>
                    <button class="text-xs font-bold text-[#FF4500] hover:underline flex items-center gap-1 cursor-pointer">
                        Đọc tiếp ➔
                    </button>
                </div>
            </article>
            `;
        }).join('');
    }
    // 4. Lắng nghe sự kiện Lưu / Bỏ lưu tin tức (ĐỒNG BỘ ĐẾN FIREBASE)
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('.bookmark-btn');
        if (!btn) return;

        const newsId = btn.dataset.id;

        // Thêm hoặc Xóa ID bài viết trong mảng
        if (savedNewsIds.includes(newsId)) {
            savedNewsIds = savedNewsIds.filter(id => id !== newsId);
        } else {
            savedNewsIds.push(newsId);
        }

        // Cập nhật giao diện tạm thời trước để tạo trải nghiệm mượt mà
        updateSavedCount();
        renderNews();

        // Cập nhật trực tiếp mảng saved_news vào account_inform của User trên Firebase
        try {
            await update(ref(db, `account_inform/${currentUserId}`), {
                saved_news: savedNewsIds
            });
        } catch (err) {
            console.error("Lỗi khi lưu bài viết lên Firebase:", err);
            alert("Không thể cập nhật bài viết đã lưu. Vui lòng kiểm tra lại kết nối mạng!");
        }
    });

    // 5. Chuyển Tab danh mục
    document.querySelectorAll('.news-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.news-tab').forEach(t => {
                t.classList.remove('bg-[#FF4500]', 'text-white');
                t.classList.add('bg-[#0D3B1B]', 'text-gray-300', 'border', 'border-[#166534]');
            });

            const currentTab = e.currentTarget;
            currentTab.classList.remove('bg-[#0D3B1B]', 'text-gray-300', 'border', 'border-[#166534]');
            currentTab.classList.add('bg-[#FF4500]', 'text-white');

            currentCategory = currentTab.dataset.category;
            renderNews();
        });
    });

    // 6. Tìm kiếm realtime
    searchInput?.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        renderNews();
    });

    // Khởi tạo chạy ban đầu
    updateSavedCount();
    // Tải lại dữ liệu mới từ Firebase mà không cần reload trang
    await fetchNewsFromFirebase();
});

window.addEventListener('update', (event) => {
    // Code xử lý khi nhận được tín hiệu
    window.location.reload();
});

// Bắt sự kiện click chung cho toàn trang bài báo
document.addEventListener('click', (e) => {
    // 1. Nếu click vào nút Lưu tin (Bookmark) thì bỏ qua
    if (e.target.closest('.bookmark-btn')) return;

    // 2. Kiểm tra xem người dùng có click vào Card bài báo hay không
    const articleCard = e.target.closest('.card-news');
    if (articleCard) {
        const newsId = articleCard.getAttribute('data-id');
        if (newsId) {
            // Chuyển hướng sang trang chi tiết bài viết kèm ID trên URL[cite: 6, 7]
            window.location.href = `${new URL('../../pages/Artical.html', import.meta.url).href}?id=${newsId}&from=user`;
        }
    }
});