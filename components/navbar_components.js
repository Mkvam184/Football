import { db, ref, get } from "../data/Firebase.js";

const siteRoot = new URL('../', import.meta.url);


document.addEventListener('DOMContentLoaded', () => {
    // 1. Kiểm tra trạng thái đăng nhập
    const currentUserId = sessionStorage.getItem('currentUserId');
    const username = sessionStorage.getItem('userNameShow') || 'Tài khoản';
    const firstChar = username.charAt(0).toUpperCase();

    
    // 2. Tạo template nút Đăng Nhập / Đăng Ký HOẶC Icon User tùy theo trạng thái
    let desktopAuthHTML = '';
    let mobileAuthHTML = '';

    if (currentUserId) {
        // --- ĐÃ ĐĂNG NHẬP ---
        desktopAuthHTML = `
          <div class="flex items-center space-x-3">
            <button 
              type="button" 
              id="open-user-profile-btn" 
              class="flex items-center gap-2 py-2 px-4 rounded-full bg-[#134E22] border border-[#1e7e34] hover:border-[#FF4500] hover:bg-[#1a662e] text-white font-bold text-sm transition-all duration-200 shadow-md cursor-pointer">
              <div class="w-6 h-6 rounded-full bg-[#FF4500] flex items-center justify-center font-black text-xs text-white">
                ${firstChar}
              </div>
              <span>(${username})</span>
            </button>
          </div>
        `;

        mobileAuthHTML = `
          <div class="mt-4 pt-4 border-t border-[#166534] flex flex-col space-y-3">
            <button type="button" id="open-user-profile-btn" class="flex items-center justify-center gap-3 py-2.5 px-4 rounded-full bg-[#134E22] border border-[#1e7e34] text-white font-bold hover:border-[#FF4500] hover:bg-[#1a662e] transition-all cursor-pointer">
              <div class="w-7 h-7 rounded-full bg-[#FF4500] flex items-center justify-center font-black text-xs text-white">
                ${firstChar}
              </div>
              <span>Trang Cá Nhân (${username})</span>
            </button>
          </div>
        `;
    } else {
        // --- CHƯA ĐĂNG NHẬP ---
        desktopAuthHTML = `
          <button id="open-login-desktop" class="ml-5 px-6 py-2.5 rounded-full text-sm font-semibold bg-[#FF4500] text-white shadow-md hover:bg-[#ff5714] hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer">
            Đăng Nhập
          </button>
          <button id="open-register-desktop" class="ml-5 px-6 py-2.5 rounded-full text-sm font-semibold bg-gradient-to-r from-emerald-600 to-green-500 text-white shadow-md shadow-green-900/30 hover:from-emerald-500 hover:to-green-400 hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer">
            Đăng Ký
          </button>
        `;

        mobileAuthHTML = `
          <div class="mt-4 pt-4 border-t border-[#166534] flex flex-col space-y-3">
            <button id="open-login-mobile" class="w-full text-center py-2.5 rounded-full text-sm font-semibold bg-[#FF4500] text-white shadow-md hover:bg-[#ff5714] active:scale-95 transition-all duration-200 cursor-pointer">
              Đăng Nhập
            </button>
            <button id="open-register-mobile" class="w-full text-center py-2.5 rounded-full text-sm font-semibold bg-gradient-to-r from-emerald-600 to-green-500 text-white shadow-md shadow-green-900/30 hover:from-emerald-500 hover:to-green-400 active:scale-95 transition-all duration-300 cursor-pointer">
              Đăng Ký
            </button>
          </div>
        `;
    }

    // 3. Render khung Navbar
    const navbarHTML = `
    <nav class="sticky top-0 z-50 bg-[#0A2E14] shadow-lg border-b border-[#166534] transition-all duration-300" id="main-navbar">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16 sm:h-20 transition-all duration-300" id="navbar-container">

          <!-- Logo -->
          <div class="flex-shrink-0 flex items-center">
            <a href="#" class="flex items-center space-x-2 group">
              <svg class="h-8 w-8 text-[#FF4500] transform group-hover:rotate-45 transition-transform duration-500 ease-out" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M14 12a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span class="text-xl font-black tracking-wider text-white">
                FOOT<span class="text-[#FF4500] group-hover:text-green-400 transition-colors duration-300">BALL</span>
              </span>
            </a>
          </div>

          <!-- Thanh tìm kiếm (Desktop) -->
          <div class="flex-1 max-w-md mx-8 hidden md:block">
            <form action="#" method="GET" class="relative group">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="h-5 w-5 text-gray-300 group-focus-within:text-[#FF4500] transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input 
                type="text" 
                placeholder="Tìm kiếm tin tức, cầu thủ, đội bóng..." 
                class="w-full pl-10 pr-4 py-2 bg-[#134E22] border border-[#1e7e34] rounded-full text-sm text-gray-100 placeholder-gray-300 focus:placeholder-black focus:outline-none focus:bg-white focus:text-[#0A2E14] focus:border-[#FF4500] focus:ring-2 focus:ring-[#FF4500]/25 transition-all duration-300 shadow-inner"
              >
            </form>
          </div>

          <!-- Menu Desktop -->
          <div class="hidden lg:flex items-center">
            <ul class="flex items-center space-x-1 m-0 p-0 list-none">
              <li><a href="${new URL('index.html', siteRoot).href}" class="nav-link active">Trang Chủ</a></li>
              <li><a href="#" class="nav-link">Tin Tức</a></li>
              <li><a href="#" class="nav-link">Giải đấu</a></li>
              <li><a href="#" class="nav-link">Kỷ lục</a></li>
              <li><a href="#" class="nav-link">Quy định</a></li>
              <li><a href="#" class="nav-link">Giải trí</a></li>
            </ul>
            
            ${desktopAuthHTML}
          </div>

          <!-- Nút Mobile & Hamburger -->
          <div class="flex lg:hidden items-center space-x-2">
            <button id="search-mobile-btn" class="p-2 text-gray-300 hover:text-white focus:outline-none transition-colors md:hidden">
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button id="mobile-menu-btn" class="p-2 text-gray-300 hover:text-white focus:outline-none rounded-md hover:bg-[#134E22] transition-all">
              <svg class="h-6 w-6" id="menu-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

        </div>
      </div>

      <!-- Thanh tìm kiếm Mobile -->
      <div id="search-mobile-bar" class="hidden px-4 py-3 border-t border-[#166534] bg-[#0A2E14]">
        <div class="relative">
          <input 
            type="text" 
            id="mobile-search-input"
            placeholder="Tìm kiếm..." 
            class="w-full pl-10 pr-4 py-2 bg-white text-[#0A2E14] border border-[#1e7e34] rounded-md text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF4500]"
          >
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg class="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Menu Mobile Thả Xuống -->
      <div class="hidden bg-[#0D3B1B] border-t border-[#166534] px-4 py-4" id="mobile-menu">
        <ul class="flex flex-col space-y-2 m-0 p-0 list-none">
          <li><a href="${new URL('index.html', siteRoot).href}" class="block py-2 px-3 rounded-md text-base font-medium nav-link active">Trang Chủ</a></li>
          <li><a href="#" class="block py-2 px-3 rounded-md text-base font-medium nav-link">Tin Tức</a></li>
          <li><a href="#" class="block py-2 px-3 rounded-md text-base font-medium nav-link">Giải đấu</a></li>
          <li><a href="#" class="block py-2 px-3 rounded-md text-base font-medium nav-link">Kỷ lục</a></li>
          <li><a href="#" class="block py-2 px-3 rounded-md text-base font-medium nav-link">Quy định</a></li>
          <li><a href="#" class="block py-2 px-3 rounded-md text-base font-medium nav-link">Giải trí</a></li>
        </ul>
        
        ${mobileAuthHTML}
      </div>
    </nav>
    `;

    //Lấy thông tin nếu đã đăng nhập
    if (currentUserId) {
        fetchAndUpdateUserData(currentUserId);
    }

    // 4. Chèn HTML vào container
    const navbarContainer = document.getElementById('navbar');
    if (navbarContainer) {
        navbarContainer.innerHTML = navbarHTML;
    }

    // 5. Gán sự kiện cho các liên kết trong Navbar
    const navLinks = document.querySelectorAll('.nav-link');
    const currentPath = window.location.pathname;

    let role = sessionStorage.getItem('userRole');

    navLinks.forEach(link => {
        link.classList.remove('active');

        const text = link.textContent.trim();
        let targetHref = '#';

        // Riêng 'Trang Chủ' thì chưa đăng nhập vẫn cho bấm về trang chủ
        if (text === 'Trang Chủ') {
            link.href = new URL('index.html', siteRoot).href;
            targetHref = 'index.html';
        }

        if (currentUserId) {
          if (role === 'user') {
            // ĐÃ ĐĂNG NHẬP: Gán link đường dẫn thực tế
            switch (text) {
                case 'Trang Chủ':
                    link.href = new URL('pages/userpages/Userpage.html', siteRoot).href;
                    targetHref = 'pages/userpages/Userpage.html';
                    break;
                case 'Tin Tức':
                    link.href = new URL('pages/userpages/Blog_user.html', siteRoot).href;
                    targetHref = 'pages/userpages/Blog_user.html';
                    break;
                case 'Giải đấu':
                    link.href = new URL('pages/userpages/Tournament.html', siteRoot).href;
                    targetHref = 'pages/userpages/Tournament.html';
                    break;
                case 'Kỷ lục':
                    link.href = new URL('pages/userpages/Records_user.html', siteRoot).href;
                    targetHref = 'pages/userpages/Records_user.html';
                    break;
                case 'Quy định':
                    link.href = new URL('pages/userpages/Regulations_user.html', siteRoot).href;
                    targetHref = 'pages/userpages/Regulations_user.html';
                    break;
                case 'Giải trí':
                    link.href = new URL('pages/userpages/Entertainment_user.html', siteRoot).href;
                    targetHref = 'pages/userpages/Entertainment_user.html';
                    break;
            }
          }
          else if (role === 'admin') {
            switch (text) {
              case 'Trang Chủ':
                  link.href = new URL('pages/adminpages/Admin_page.html', siteRoot).href;
                  targetHref = 'pages/adminpages/Admin_page.html';
                  break;
              case 'Tin Tức':
                  link.href = new URL('pages/adminpages/Blog_admin.html', siteRoot).href;
                  targetHref = 'pages/adminpages/Blog_admin.html';
                  break;
              case 'Giải đấu':
                  link.href = new URL('pages/adminpages/Tournament_admin.html', siteRoot).href;
                  targetHref = 'pages/adminpages/Tournament_admin.html';
                  break;
              case 'Kỷ lục':
                  link.href = new URL('pages/adminpages/Records_admin.html', siteRoot).href;
                  targetHref = 'pages/adminpages/Records_admin.html';
                  break;
              case 'Quy định':
                  link.href = new URL('pages/adminpages/Regulations_admin.html', siteRoot).href;
                  targetHref = 'pages/adminpages/Regulations_admin.html';
                  break;
              case 'Giải trí':
                  link.href = new URL('pages/adminpages/Entertainment_admin.html', siteRoot).href;
                  targetHref = 'pages/adminpages/Entertainment_admin.html';
                  break;
            }
          }
        }
        else {
            // CHƯA ĐĂNG NHẬP: Bỏ link đường dẫn & chặn click
            link.href = 'javascript:void(0)';
            
            link.addEventListener('click', (e) => {
                e.preventDefault();
                alert('Vui lòng đăng nhập để truy cập tính năng này!');
            });
        }
      

        // 4. KIỂM TRA VÀ GÁN CLASS ACTIVE CHO TRANG HIỆN TẠI
        if (
            (currentPath === targetHref) || 
            (currentPath.endsWith(targetHref) && targetHref !== '#')
        ) {
            link.classList.add('active');
        }
    });



    document.getElementById('logout-btn-desktop')?.addEventListener('click', handleLogout);
    document.getElementById('logout-btn-mobile')?.addEventListener('click', handleLogout);

    // 6. Xử lý UI Mobile (Menu & Search)
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const menuIcon = document.getElementById('menu-icon');
    const searchMobileBtn = document.getElementById('search-mobile-btn');
    const searchMobileBar = document.getElementById('search-mobile-bar');

    if (mobileMenuBtn && mobileMenu && menuIcon) {
      mobileMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        mobileMenu.classList.toggle('hidden');
        if (searchMobileBar && !searchMobileBar.classList.contains('hidden')) {
          searchMobileBar.classList.add('hidden');
        }
        const isOpen = !mobileMenu.classList.contains('hidden');
        menuIcon.innerHTML = isOpen 
          ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />` 
          : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />`;
      });
    }

    if (searchMobileBtn && searchMobileBar) {
      searchMobileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
          mobileMenu.classList.add('hidden');
          if (menuIcon) {
            menuIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />`;
          }
        }
        searchMobileBar.classList.toggle('hidden');
      });
    }

    window.addEventListener('click', (e) => {
      if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
        if (!mobileMenu.contains(e.target) && mobileMenuBtn && !mobileMenuBtn.contains(e.target)) {
          mobileMenu.classList.add('hidden');
          if (menuIcon) {
            menuIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />`;
          }
        }
      }
    });

        window.addEventListener('pageshow', (event) => {
        // event.persisted = true nghĩa là trang được tải lại từ BFCache (khi bấm Back/Forward)
        if (event.persisted) {
            // Tải lại trang để đồng bộ lại trạng thái từ sessionStorage
            window.location.reload();
        }
    });

});

async function fetchAndUpdateUserData(currentUserId) {
  try {
      const informSnap = await get(ref(db, `account_inform/${currentUserId}`));
      if (informSnap.exists()) {
          const userData = informSnap.val();
          const nameShow = userData.name || sessionStorage.getItem('username') || 'Tài khoản';

          // Lưu vào Cache để lần chuyển trang sau dùng ngay không cần gọi lại Firebase
          sessionStorage.setItem('userNameShow', nameShow);

      }
  } catch (err) {
      console.error("Lỗi lấy thông tin :", err);
  }
}