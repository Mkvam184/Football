import { db, ref, get } from "../data/Firebase.js";

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Kiểm tra trạng thái đăng nhập
    const currentUserId = sessionStorage.getItem('currentUserId');
    const username = sessionStorage.getItem('username') || 'Thành viên';

    let nameShow = null;
    if (currentUserId) {
      try {
          const informSnap = await get(ref(db, `account_inform/${currentUserId}`));
          if (informSnap.exists() && informSnap.val().name) {
              nameShow = informSnap.val().name;
          }
      } catch (err) {
          console.error("Lỗi lấy thông tin name từ Firebase:", err);
      }
    }

    // 2. Tạo giao diện Cột 4 tùy theo trạng thái
    let column4HTML = '';

    if (currentUserId) {
        // --- ĐÃ ĐĂNG NHẬP ---
        column4HTML = `
          <div>
            <h3 class="text-white font-bold text-base mb-4 tracking-wide border-l-4 border-[#FF4500] pl-2">
              Tài Khoản Của Bạn
            </h3>
            <p class="text-sm text-gray-300 mb-3">Xin chào <strong class="text-[#FF4500]">${nameShow || username}</strong>, bạn đã là thành viên của Football Hub!</p>
            <button 
              type="button" 
              id="open-user-profile-btn" 
              class="open-profile-btn inline-block w-full text-center py-2 rounded-lg text-sm font-semibold bg-[#134E22] text-white border border-[#1e7e34] hover:border-[#FF4500] hover:bg-[#1a662e] transition-all duration-200 shadow-md cursor-pointer">
              Xem Trang Cá Nhân ➔
            </button>
          </div>
        `;
    } else {
        // --- CHƯA ĐĂNG NHẬP ---
        column4HTML = `
          <div>
            <h3 class="text-white font-bold text-base mb-4 tracking-wide border-l-4 border-[#FF4500] pl-2">
              Nhận Tin Thể Thao
            </h3>
            <p class="text-sm text-gray-300 mb-3">Đăng ký tài khoản ngay để không bỏ lỡ những tin tức bóng đá nóng hổi nhất mỗi ngày.</p>
            <form onsubmit="event.preventDefault();" class="space-y-2">
              <button 
                type="button" 
                id="footer-register-btn"
                class="w-full py-2 rounded-lg text-sm font-semibold bg-[#FF4500] text-white hover:bg-[#ff5714] active:scale-95 transition-all duration-200 shadow-md cursor-pointer">
                Đăng Ký Ngay
              </button>
            </form>
          </div>
        `;
    }

    // 3. Template Footer chính
    const footerHTML = `
    <footer class="bg-[#0A2E14] text-gray-300 border-t border-[#166534] pt-12 pb-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <!-- Grid chia cột -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          
          <!-- Cột 1: Giới thiệu / Logo -->
          <div class="space-y-4">
            <div class="flex items-center space-x-2">
              <svg class="h-8 w-8 text-[#FF4500]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M14 12a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span class="text-xl font-black tracking-wider text-white">
                FOOT<span class="text-[#FF4500]">BALL</span>
              </span>
            </div>
            <p class="text-sm text-gray-300 leading-relaxed">
              Trang thông tin bóng đá hàng đầu. Cập nhật liên tục tin tức, lịch thi đấu, bảng xếp hạng và những khoảnh khắc kỷ lục đỉnh cao của thế giới túc cầu.
            </p>
          </div>

          <!-- Cột 2: Đường dẫn nhanh -->
          <div>
            <h3 class="text-white font-bold text-base mb-4 tracking-wide border-l-4 border-[#FF4500] pl-2">
              Khám Phá
            </h3>
            <ul class="space-y-2.5 m-0 p-0 list-none text-sm">
              <li><a href="${new URL('../index.html', import.meta.url).href}" class="hover:text-[#FF4500] transition-colors duration-200">Trang Chủ</a></li>
              <li><a href="#" class="hover:text-[#FF4500] transition-colors duration-200">Tin Tức Mới Nhất</a></li>
              <li><a href="#" class="hover:text-[#FF4500] transition-colors duration-200">Lịch Thi Đấu</a></li>
              <li><a href="#" class="hover:text-[#FF4500] transition-colors duration-200">Bảng Xếp Hạng</a></li>
            </ul>
          </div>

          <!-- Cột 3: Danh mục nổi bật -->
          <div>
            <h3 class="text-white font-bold text-base mb-4 tracking-wide border-l-4 border-emerald-500 pl-2">
              Chuyên Mục
            </h3>
            <ul class="space-y-2.5 m-0 p-0 list-none text-sm">
              <li><a href="#" class="hover:text-emerald-400 transition-colors duration-200">Giải Đấu Hàng Đầu</a></li>
              <li><a href="#" class="hover:text-emerald-400 transition-colors duration-200">Kỷ Lục Bóng Đá</a></li>
              <li><a href="#" class="hover:text-emerald-400 transition-colors duration-200">Khoảnh Khắc Nổi Bật</a></li>
              <li><a href="#" class="hover:text-emerald-400 transition-colors duration-200">Bình Luận Chuyên Gia</a></li>
            </ul>
          </div>

          <!-- Cột 4: Đã chuyển đổi động dựa trên trạng thái Đăng nhập -->
          ${column4HTML}

        </div>

        <!-- Đường kẻ ngang phân cách -->
        <div class="border-t border-[#166534] pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-300">
          <p>&copy; 2026 FOOTBALL</p>
          <div class="flex space-x-6 mt-4 sm:mt-0">
            <a href="#" class="hover:text-white transition-colors">Chính sách bảo mật</a>
            <a href="#" class="hover:text-white transition-colors">Điều khoản sử dụng</a>
            <a href="#" class="hover:text-white transition-colors">Liên hệ</a>
          </div>
        </div>

      </div>
    </footer>
    `;

    // Bơm Footer vào div#footer
    const footerContainer = document.getElementById('footer');
    if (footerContainer) {
      footerContainer.innerHTML = footerHTML;

      const footerRegisterBtn = document.getElementById('footer-register-btn');
        if (footerRegisterBtn) {
          footerRegisterBtn.addEventListener('click', () => {
              // Gọi nút mở Đăng ký ở Navbar Desktop
              const navRegisterBtn = document.getElementById('open-register-desktop');
              if (navRegisterBtn) {
                  navRegisterBtn.click();
              } else {
                  // Mở trực tiếp Modal nếu không có nút Navbar
                  const registerModal = document.getElementById('register-modal');
                  const registerBox = document.getElementById('register-modal-box');
                  if (registerModal && registerBox) {
                      registerModal.classList.remove('opacity-0', 'pointer-events-none');
                      registerBox.classList.remove('scale-90', 'translate-y-4');
                      registerBox.classList.add('scale-100', 'translate-y-0');
                  }
              }
          });
      }
    }

    
});