import { db, ref, get } from "../data/Firebase.js";

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Lấy ID bài viết từ tham số trên đường dẫn (URL Parameter)
    const urlParams = new URLSearchParams(window.location.search);
    const newsId = urlParams.get('id');
    const fromPage = urlParams.get('from');

    // Xử lý logic nút Quay lại
    const backBtn = document.getElementById('btn-back');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (fromPage === 'admin') {
                // Nếu đến từ Admin -> Quay lại trang quản trị Admin
                window.location.href = new URL('../pages/adminpages/Blog_admin.html', import.meta.url).href;
            } else if (history.length > 1) {
                // Nếu duyệt thông thường -> Dùng lịch sử trình duyệt để back lại
                window.history.back();
            } else {
                // Mặc định trả về trang User
                window.location.href = new URL('../pages/userpages/Blog_User.html', import.meta.url).href;
            }
        });
    }

    if (!newsId) {
        showError("Không tìm thấy bài viết này!");
        return;
    }

    // 2. Tải thông tin bài viết từ Firebase dựa vào ID
    try {
        const newsSnap = await get(ref(db, `blogs/${newsId}`));
        
        if (!newsSnap.exists()) {
            showError("Bài viết không tồn tại hoặc đã bị xóa!");
            return;
        }

        const data = newsSnap.val();
        renderArticle(data);

    } catch (err) {
        console.error("Lỗi tải bài viết:", err);
        showError("Có lỗi xảy ra khi tải dữ liệu bài viết.");
    }

    // Nút Chia sẻ link bài báo
    document.getElementById('btn-share')?.addEventListener('click', () => {
        navigator.clipboard.writeText(window.location.href);
        alert("Đã sao chép đường dẫn bài báo vào bộ nhớ tạm!");
    });
});


// 1. Hàm biến Link thành Ảnh VÀ giữ nguyên các đoạn văn bản xuống dòng
function formatContentWithImages(content) {
    if (!content) return '';

    // Biểu thức chính quy tìm các link ảnh
    const imgRegex = /(https?:\/\/[^\s]+?\.(?:png|jpg|jpeg|gif|webp|svg)(\?[^\s]*)?)/gi;

    // Thay link ảnh bằng thẻ <img>
    let formatted = content.replace(imgRegex, (match) => {
        return `<div class="my-4 flex justify-center">
            <img src="${match}" alt="Ảnh bài viết" class="max-w-full h-auto rounded-xl border border-emerald-500/20 shadow-md object-cover max-h-[450px]" loading="lazy">
        </div>`;
    });

    // Chuyển các dấu xuống dòng (\n) thành thẻ xuống dòng <br> để giữ nguyên đoạn văn
    return formatted.replace(/\n/g, '<br>');
}

// 2. Hàm render nội dung bài viết
function renderArticle(item) {
    document.title = `${item.title || 'Tin tức'} - Football News`;

    document.getElementById('news-title').textContent = item.title || 'Bài viết bóng đá';
    document.getElementById('news-category').textContent = item.category || 'Tin tức';
    document.getElementById('news-date').textContent = `⏱️ Đăng ngày: ${item.date || 'Vừa xong'}`;
    
    const imgElem = document.getElementById('news-image');
    if (imgElem) {
        imgElem.src = item.image || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80';
        imgElem.alt = item.title || 'Ảnh bài viết';
    }
    
    const captionElem = document.getElementById('news-image-caption');
    if (captionElem) captionElem.textContent = `Hình ảnh: ${item.title}`;

    // 👉 THAY ID DƯỚI ĐÂY BẰNG ID THẬT TRÊN FILE ARTICAL.HTML CỦA BẠN (Ví dụ: 'news-content')
    const contentContainer = document.getElementById('news-content') || document.getElementById('article-content');

    if (contentContainer) {
        const rawContent = item.description || item.content || 'Chưa có nội dung chi tiết.';
        // Đẩy toàn bộ văn bản + hình ảnh vào giao diện
        contentContainer.innerHTML = formatContentWithImages(rawContent);
    }
}

function showError(msg) {
    document.getElementById('news-title').textContent = msg;
    document.getElementById('news-content').innerHTML = `
        <div class="text-center py-12">
            <a href="${new URL('../index.html', import.meta.url).href}" class="px-6 py-3 bg-[#FF4500] text-white font-bold rounded-xl hover:bg-[#ff5714] transition-all">
                 Quay lại trang chủ
            </a>
        </div>
    `;
}