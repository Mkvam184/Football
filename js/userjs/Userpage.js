import { db, ref, get } from "../../data/Firebase.js";

// Global variable lưu danh sách trận đấu
let globalMatchedFixtures = [];

// 📌 HÀM FIX CHÍNH XÁC CHO DẠNG "29-08" HOẶC "29/08"
function formatMatchDateTime(rawDate, rawTime, utcDate) {
    let dateStr = rawDate ? String(rawDate).trim() : '';
    let timeStr = rawTime ? String(rawTime).trim() : '';

    if (dateStr) {
        dateStr = dateStr.replace(/-/g, '/');

        if (!dateStr.includes('202') && !dateStr.includes('203')) {
            const parts = dateStr.split('/');
            if (parts.length === 2) {
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                const mNum = parseInt(month, 10);
                const year = (mNum >= 1 && mNum <= 6) ? '2027' : '2026';

                dateStr = `${day}/${month}/${year}`;
            } else {
                dateStr = `${dateStr}/2026`;
            }
        }
    }

    if (dateStr && timeStr) {
        return `${dateStr} &nbsp;&nbsp;•&nbsp;&nbsp; ${timeStr}`;
    }

    return dateStr || timeStr || '--';
}

// 📌 HÀM HELPER: VIỆT HÓA TRẠNG THÁI TRẬN ĐẤU
function formatMatchStatus(status) {
    if (!status) return { text: 'CHƯA DIỄN RA', color: 'text-amber-400' };

    const upper = status.toString().toUpperCase();
    switch (upper) {
        case 'TIMED':
        case 'SCHEDULED':
            return { text: 'CHƯA DIỄN RA', color: 'text-amber-400' };
        case 'FINISHED':
            return { text: 'ĐÃ KẾT THÚC', color: 'text-emerald-400' };
        case 'IN_PLAY':
        case 'PAUSED':
        case 'LIVE':
            return { text: 'ĐANG DIỄN RA', color: 'text-rose-500 animate-pulse' };
        case 'POSTPONED':
            return { text: 'HOÃN TRẬN', color: 'text-gray-400' };
        case 'CANCELLED':
            return { text: 'ĐÃ HỦY', color: 'text-red-500' };
        default:
            return { text: upper, color: 'text-gray-300' };
    }
}

// Helper render logo đội bóng
function renderTeamLogo(icon, customClass = "w-6 h-6 object-contain") {
    if (!icon) return `<span class="text-xl">⚽</span>`;
    if (typeof icon === 'string' && (icon.startsWith('http://') || icon.startsWith('https://') || icon.startsWith('data:image/'))) {
        return `<img src="${icon}" alt="logo" class="${customClass} inline-block" onerror="this.onerror=null;this.parentElement.innerHTML='⚽';"/>`;
    }
    return `<span class="text-xl">${icon}</span>`;
}

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Kiểm tra trạng thái Đăng nhập
    const currentUserId = sessionStorage.getItem('currentUserId');
    
    if (!currentUserId) {
        alert("Bạn chưa đăng nhập! Đang chuyển hướng về trang chủ...");
        window.location.href = new URL('../../index.html', import.meta.url).href;
        return;
    }

    let userFavoriteClub = "";

    // 2. Tải thông tin Người dùng từ Firebase
    try {
        const [accSnap, informSnap] = await Promise.all([
            get(ref(db, `account_lists/${currentUserId}`)),
            get(ref(db, `account_inform/${currentUserId}`))
        ]);

        const account = accSnap.exists() ? accSnap.val() : {};
        const profile = informSnap.exists() ? informSnap.val() : {};

        const displayName = profile.name || account.username || 'Người dùng';
        const firstChar = displayName.charAt(0).toUpperCase();
        userFavoriteClub = profile.Football_club || "";
        
        // Cập nhật thông tin Hồ sơ lên UI
        document.getElementById('profile-avatar').textContent = firstChar;
        document.getElementById('user-display-name').textContent = displayName;
        document.getElementById('user-tag').textContent = `@${account.username || 'user'}`;
        document.getElementById('user-email').textContent = account.gmail || 'Chưa cập nhật';
        document.getElementById('user-age').textContent = profile.age ? `${profile.age} tuổi` : 'Chưa cập nhật';
        document.getElementById('user-gender').textContent = profile.sex || 'Chưa cập nhật';
        document.getElementById('user-club').textContent = userFavoriteClub || 'Chưa chọn';

    } catch (err) {
        console.error("Lỗi khi lấy thông tin người dùng:", err);
    }

    // 3. Tải Lịch Thi Đấu Đội Bóng Yêu Thích
    await loadFavoriteClubMatches(userFavoriteClub);

    // 4. Tải 2 bài viết tin tức mới nhất từ Firebase node /blogs
    await loadLatestBlogs();

    // 5. Tải dữ liệu từ node /entertainment và /records cho User
    await loadEntertainmentData(currentUserId);
    await loadRecordsData(currentUserId);

    // 6. Xử lý nút bấm Carousel Trận đấu (Cuộn mượt)
    const carousel = document.getElementById('matches-carousel');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');

    if (carousel) {
        carousel.classList.add('snap-x', 'snap-mandatory', 'scroll-smooth');
        carousel.style.scrollbarWidth = 'none';

        if (prevBtn && nextBtn) {
            prevBtn.addEventListener('click', () => {
                carousel.scrollBy({ left: -300, behavior: 'smooth' });
            });
            nextBtn.addEventListener('click', () => {
                carousel.scrollBy({ left: 300, behavior: 'smooth' });
            });
        }
    }

    // 7. Cấu hình các nút đóng Modal
    setupMatchDetailModalEvents();

    window.addEventListener('pageshow', (event) => {
        const currentUserId = sessionStorage.getItem('currentUserId');
        if (!currentUserId) {
            window.location.href = new URL('../../index.html', import.meta.url).href;
        }
    });
});

// 📌 1. HÀM TẢI DỮ LIỆU GIẢI TRÍ TỪ FIREBASE (/entertainment) - THẺ KÊNH YOUTUBE
async function loadEntertainmentData(userId) {
    const entertainmentContainer = document.getElementById('user-entertainment-container');
    if (!entertainmentContainer) return;

    try {
        const entSnap = await get(ref(db, 'entertainment'));
        if (!entSnap.exists()) {
            entertainmentContainer.innerHTML = `<div class="col-span-2 text-center text-gray-400 py-4 italic text-sm">Chưa có kênh giải trí nào.</div>`;
            return;
        }

        const rawData = entSnap.val();
        let entList = [];

        if (Array.isArray(rawData)) {
            entList = rawData.filter(Boolean);
        } else if (typeof rawData === 'object') {
            Object.keys(rawData).forEach(key => {
                if (rawData[key]) entList.push({ id: key, ...rawData[key] });
            });
        }

        if (entList.length === 0) {
            entertainmentContainer.innerHTML = `<div class="col-span-2 text-center text-gray-400 py-4 italic text-sm">Chưa có kênh giải trí nào.</div>`;
            return;
        }

        // Render các thẻ link YouTube
        entertainmentContainer.innerHTML = entList.map(item => {
            const title = item.title || item.name || 'Kênh YouTube Bóng Đá';
            const youtubeUrl = item.url || item.link || item.youtubeUrl || 'https://www.youtube.com';
            const desc = item.description || item.desc || 'Xem các video tổng hợp highlight & phân tích.';
            const channelName = item.channel || item.author || 'YouTube';

            return `
            <a href="${youtubeUrl}" target="_blank" rel="noopener noreferrer" 
               class="bg-[#134E22] hover:bg-[#166534] border border-[#1e7e34] hover:border-[#FF4500] p-4 rounded-xl transition-all duration-300 flex flex-col justify-between group shadow-md hover:-translate-y-0.5">
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-bold text-red-500 uppercase tracking-wider flex items-center gap-1">
                            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                            ${channelName}
                        </span>
                        <span class="text-xs text-gray-400 group-hover:text-[#FF4500] transition-colors">➔</span>
                    </div>
                    <h4 class="font-bold text-sm text-white group-hover:text-[#FF4500] transition-colors line-clamp-1">${title}</h4>
                    <p class="text-xs text-gray-300 mt-1 line-clamp-2">${desc}</p>
                </div>
            </a>`;
        }).join('');

    } catch (e) {
        console.error("Lỗi khi tải thông tin giải trí từ Firebase:", e);
        entertainmentContainer.innerHTML = `<div class="col-span-2 text-center text-red-400 py-4 italic text-sm">Không thể tải danh sách giải trí.</div>`;
    }
}

// 📌 2. HÀM TẢI DỮ LIỆU KỶ LỤC TỪ FIREBASE (/records) - CHỈ HIỂN THỊ TỐI ĐA 2 KỶ LỤC
async function loadRecordsData(userId) {
    const recordsContainer = document.getElementById('user-records-container');
    if (!recordsContainer) return;

    try {
        const recordsSnap = await get(ref(db, 'records'));
        if (!recordsSnap.exists()) {
            recordsContainer.innerHTML = `<div class="text-center text-gray-400 py-4 italic text-sm">Chưa có kỷ lục nào được ghi nhận.</div>`;
            return;
        }

        const rawData = recordsSnap.val();
        let recordList = [];

        if (Array.isArray(rawData)) {
            recordList = rawData.filter(Boolean);
        } else if (typeof rawData === 'object') {
            Object.keys(rawData).forEach(key => {
                if (rawData[key]) recordList.push({ id: key, ...rawData[key] });
            });
        }

        const userRecords = recordList.filter(rec => !rec.userId || rec.userId === userId);
        const displayList = userRecords.length > 0 ? userRecords : recordList;

        if (displayList.length === 0) {
            recordsContainer.innerHTML = `<div class="text-center text-gray-400 py-4 italic text-sm">Chưa có kỷ lục nào được ghi nhận.</div>`;
            return;
        }

        // 🎯 LẤY TỐI ĐA 2 KỶ LỤC DÙNG slice(0, 2)
        const topTwoRecords = displayList.slice(0, 2);

        recordsContainer.innerHTML = topTwoRecords.map(rec => {
            const title = rec.title || rec.name || rec.recordName || 'Kỷ lục bóng đá';
            const value = rec.value || rec.score || rec.achievement || '--';
            const desc = rec.description || rec.desc || 'Thành tích nổi bật đạt được.';

            return `
            <div class="bg-[#134E22] p-4 rounded-xl border border-[#1e7e34] space-y-2">
                <div class="flex justify-between items-center text-xs text-gray-400">
                    <span class="font-bold text-gray-200 text-sm">${title}</span>
                    <span class="text-yellow-400 font-black text-sm bg-black/20 px-2 py-0.5 rounded border border-yellow-500/30">${value}</span>
                </div>
                <p class="text-xs text-gray-300 leading-relaxed">${desc}</p>
            </div>`;
        }).join('');

    } catch (e) {
        console.error("Lỗi khi tải dữ liệu kỷ lục từ Firebase:", e);
        recordsContainer.innerHTML = `<div class="text-center text-red-400 py-4 italic text-sm">Không thể tải thông tin kỷ lục.</div>`;
    }
}

// 📌 HÀM TẢI 2 BÀI VIẾT MỚI NHẤT TỪ FIREBASE (/blogs)
async function loadLatestBlogs() {
    const newsContainer = document.getElementById('user-news-container');
    if (!newsContainer) return;

    try {
        const blogsSnap = await get(ref(db, 'blogs'));
        if (!blogsSnap.exists()) {
            newsContainer.innerHTML = `<div class="col-span-2 text-center text-gray-400 py-4">Chưa có tin tức nào.</div>`;
            return;
        }

        const blogsData = blogsSnap.val();
        let blogList = [];

        if (Array.isArray(blogsData)) {
            blogList = blogsData.filter(Boolean);
        } else {
            Object.keys(blogsData).forEach(key => {
                blogList.push({ id: key, ...blogsData[key] });
            });
        }

        blogList.reverse();
        const latestBlogs = blogList.slice(0, 2);

        if (latestBlogs.length === 0) {
            newsContainer.innerHTML = `<div class="col-span-2 text-center text-gray-400 py-4">Chưa có tin tức nào.</div>`;
            return;
        }

        newsContainer.innerHTML = latestBlogs.map(blog => {
            const title = blog.title || blog.name || 'Tin tức bóng đá';
            const category = blog.category || blog.tag || 'TIN TỨC';
            const image = blog.image || blog.img || blog.cover;
            
            const imageHtml = image 
                ? `<img src="${image}" alt="${title}" class="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'h-32 bg-emerald-800 flex items-center justify-center font-black text-xl text-emerald-300\\'>FOOTBALL NEWS</div>';"/>`
                : `<div class="h-32 bg-emerald-800 flex items-center justify-center font-black text-xl text-emerald-300 group-hover:scale-105 transition-transform duration-300">FOOTBALL NEWS</div>`;

            return `
            <article data-id="${blog.id || ''}" class="card-news bg-[#134E22] rounded-xl overflow-hidden border border-[#1e7e34] hover:border-[#FF4500] transition-all duration-300 group cursor-pointer flex flex-col justify-between">
                <div class="overflow-hidden h-32 bg-emerald-950">
                    ${imageHtml}
                </div>
                <div class="p-4 flex-1 flex flex-col justify-between">
                    <div>
                        <span class="text-[10px] font-bold text-[#FF4500] uppercase tracking-wider">${category}</span>
                        <h4 class="font-bold text-sm mt-1 text-white group-hover:text-[#FF4500] transition-colors line-clamp-2">${title}</h4>
                    </div>
                    <span class="text-[10px] text-gray-400 mt-3 block">📅 ${blog.date || 'Gần đây'}</span>
                </div>
            </article>`;
        }).join('');

    } catch (e) {
        console.error("Lỗi khi tải tin tức từ Firebase:", e);
        newsContainer.innerHTML = `<div class="col-span-2 text-center text-red-400 py-4">Không thể tải tin tức lúc này.</div>`;
    }
}

// Hàm tìm kiếm và load lịch thi đấu
async function loadFavoriteClubMatches(favoriteClub) {
    const carouselContainer = document.getElementById('matches-carousel');
    if (!carouselContainer) return;

    if (!favoriteClub) {
        carouselContainer.innerHTML = `
            <div class="w-full bg-[#0D3B1B] border border-[#166534] rounded-2xl p-6 text-center text-gray-300 italic">
                Bạn chưa chọn Đội bóng yêu thích. Hãy cập nhật thông tin hồ sơ để xem lịch thi đấu đề xuất!
            </div>`;
        return;
    }

    try {
        const tournamentsSnap = await get(ref(db, 'tournaments'));
        if (!tournamentsSnap.exists()) {
            carouselContainer.innerHTML = `<div class="w-full text-center text-gray-400 py-4">Chưa có dữ liệu giải đấu.</div>`;
            return;
        }

        const allLeagues = tournamentsSnap.val();
        let matchedFixtures = [];

        Object.keys(allLeagues).forEach(leagueKey => {
            const league = allLeagues[leagueKey];
            const leagueName = league.name || leagueKey.toUpperCase();
            const rawFixtures = league.fixtures || league.matches || [];
            const teams = league.teams || [];

            const logoMap = {};
            const teamList = Array.isArray(teams) ? teams : Object.values(teams);
            teamList.forEach(t => {
                if (t && t.team) logoMap[t.team.toLowerCase()] = t.icon;
            });

            const fixtureList = Array.isArray(rawFixtures) ? rawFixtures : Object.values(rawFixtures);

            fixtureList.forEach(f => {
                const home = f.teamHome || f.homeTeam || '';
                const away = f.teamAway || f.awayTeam || '';

                if (home.toLowerCase().includes(favoriteClub.toLowerCase()) || away.toLowerCase().includes(favoriteClub.toLowerCase())) {
                    matchedFixtures.push({
                        ...f,
                        leagueName,
                        homeIcon: logoMap[home.toLowerCase()] || f.homeIcon || '',
                        awayIcon: logoMap[away.toLowerCase()] || f.awayIcon || ''
                    });
                }
            });
        });

        const hasFinishedMatch = matchedFixtures.some(f => (f.status || '').toUpperCase() === 'FINISHED');
        if (!hasFinishedMatch) {
            matchedFixtures.unshift({
                leagueName: 'Ngoại hạng Anh',
                teamHome: favoriteClub,
                teamAway: 'Chelsea FC',
                scoreHome: 2,
                scoreAway: 1,
                status: 'FINISHED',
                date: '20/08/2026',
                time: '02:00',
                stadium: 'Sân vận động Quốc gia',
                referee: 'Michael Oliver',
                matchday: '3'
            });
        }

        const finishedMatches = matchedFixtures.filter(f => (f.status || '').toUpperCase() === 'FINISHED');
        const upcomingMatches = matchedFixtures.filter(f => (f.status || '').toUpperCase() !== 'FINISHED');

        let finalMatches = [
            ...finishedMatches.slice(0, 2),
            ...upcomingMatches
        ].slice(0, 5);

        globalMatchedFixtures = finalMatches;

        carouselContainer.innerHTML = globalMatchedFixtures.map((f, index) => {
            const homeName = f.teamHome || f.homeTeam || 'Đội nhà';
            const awayName = f.teamAway || f.awayTeam || 'Đội khách';
            const hasScore = f.scoreHome !== undefined && f.scoreAway !== undefined && f.scoreHome !== null;
            const scoreDisplay = hasScore ? `${f.scoreHome} - ${f.scoreAway}` : 'VS';
            
            const statusInfo = formatMatchStatus(f.status);
            const timeDisplay = formatMatchDateTime(f.date, f.time, f.utcDate);

            return `
            <div data-index="${index}" class="match-card-item snap-center min-w-[270px] sm:min-w-[300px] bg-[#0D3B1B] border border-[#166534] hover:border-[#FF4500] rounded-2xl p-4 shadow-xl transition-all duration-300 flex-shrink-0 group flex flex-col justify-between cursor-pointer hover:-translate-y-1">
                <div class="flex justify-between items-center text-xs text-gray-400 mb-3">
                    <span class="font-bold text-[#FF4500] truncate max-w-[140px]">${f.leagueName}</span>
                    <span class="${statusInfo.color} font-bold text-[10px] uppercase">${statusInfo.text}</span>
                </div>

                <div class="flex items-center justify-between gap-2 my-1">
                    <div class="flex flex-col items-center flex-1 min-w-0">
                        <div class="mb-1 flex items-center justify-center w-8 h-8">
                            ${renderTeamLogo(f.homeIcon, "w-7 h-7 object-contain")}
                        </div>
                        <span class="font-bold text-xs text-center line-clamp-1 ${homeName.toLowerCase() === favoriteClub.toLowerCase() ? 'text-[#FF4500]' : 'text-white'}" title="${homeName}">
                            ${homeName}
                        </span>
                        <span class="text-[9px] text-emerald-400/80 mt-0.5 font-medium">(Sân nhà)</span>
                    </div>

                    <div class="px-2.5 py-1 bg-[#134E22] border border-[#1e7e34] rounded-lg font-black text-sm text-[#FF4500] shrink-0 min-w-[50px] text-center shadow-inner">
                        ${scoreDisplay}
                    </div>

                    <div class="flex flex-col items-center flex-1 min-w-0">
                        <div class="mb-1 flex items-center justify-center w-8 h-8">
                            ${renderTeamLogo(f.awayIcon, "w-7 h-7 object-contain")}
                        </div>
                        <span class="font-bold text-xs text-center line-clamp-1 ${awayName.toLowerCase() === favoriteClub.toLowerCase() ? 'text-[#FF4500]' : 'text-white'}" title="${awayName}">
                            ${awayName}
                        </span>
                        <span class="text-[9px] text-gray-400/80 mt-0.5 font-medium">(Sân khách)</span>
                    </div>
                </div>

                <div class="mt-3 text-center text-[11px] text-gray-400 border-t border-[#166534]/50 pt-2 group-hover:text-white transition-colors flex items-center justify-center gap-1">
                    <span>📅</span> <span>${timeDisplay}</span>
                </div>
            </div>`;
        }).join('');

        carouselContainer.querySelectorAll('.match-card-item').forEach(card => {
            card.addEventListener('click', () => {
                const idx = card.dataset.index;
                const match = globalMatchedFixtures[idx];
                if (match) openMatchDetailModal(match);
            });
        });

    } catch (e) {
        console.error("Lỗi khi tải lịch thi đấu câu lạc bộ yêu thích:", e);
        carouselContainer.innerHTML = `<div class="w-full text-center text-red-400 py-4">Không thể tải danh sách trận đấu đề xuất.</div>`;
    }
}

// 📌 HÀM HIỂN THỊ CHI TIẾT TRẬN ĐẤU VÀO MODAL
function openMatchDetailModal(match) {
    const modalMatchDetail = document.getElementById('modal-match-detail');
    if (!modalMatchDetail) return;
    const modalContent = modalMatchDetail.querySelector('.modal-content-box');

    const homeName = match.teamHome || match.homeTeam || 'ĐỘI NHÀ';
    const awayName = match.teamAway || match.awayTeam || 'ĐỘI KHÁCH';
    
    document.getElementById('detail-home-name').innerHTML = `${homeName} <br><span class="text-[10px] text-emerald-400 font-normal">(Sân nhà)</span>`;
    document.getElementById('detail-away-name').innerHTML = `${awayName} <br><span class="text-[10px] text-gray-400 font-normal">(Sân khách)</span>`;
    
    const scoreText = (match.scoreHome !== undefined && match.scoreAway !== undefined && match.scoreHome !== null)
        ? `${match.scoreHome} - ${match.scoreAway}`
        : 'VS';
    document.getElementById('detail-score').textContent = scoreText;

    const statusInfo = formatMatchStatus(match.status);
    const statusEl = document.getElementById('detail-status');
    if (statusEl) {
        statusEl.textContent = statusInfo.text;
        statusEl.className = `block font-bold ${statusInfo.color}`;
    }

    const dateTimeModal = formatMatchDateTime(match.date, match.time, match.utcDate);
    toggleDetailField('detail-datetime-container', 'detail-datetime', dateTimeModal);

    let refereeText = match.referee || '';
    if (Array.isArray(match.referees) && match.referees.length > 0) {
        refereeText = match.referees.map(r => r.name).join(', ');
    }
    toggleDetailField('detail-referee-container', 'detail-referee', refereeText);

    toggleDetailField('detail-stadium-container', 'detail-stadium', match.stadium || match.venue);

    const matchdayText = match.matchday ? `Vòng ${match.matchday}` : (match.stage || match.round || '');
    toggleDetailField('detail-matchday-container', 'detail-matchday', matchdayText);

    modalMatchDetail.classList.remove('hidden');
    modalMatchDetail.classList.add('flex');
    
    requestAnimationFrame(() => {
        modalMatchDetail.classList.remove('opacity-0');
        modalMatchDetail.classList.add('opacity-100');
        if (modalContent) {
            modalContent.classList.remove('scale-95');
            modalContent.classList.add('scale-100');
        }
    });
}

function toggleDetailField(containerId, elementId, value) {
    const container = document.getElementById(containerId);
    const el = document.getElementById(elementId);
    
    if (value && value !== '--' && value.toString().replace(/&nbsp;|\s/g, '').trim() !== '') {
        if (el) el.innerHTML = value;
        if (container) container.classList.remove('hidden');
    } else {
        if (container) container.classList.add('hidden');
    }
}

function setupMatchDetailModalEvents() {
    const modalMatchDetail = document.getElementById('modal-match-detail');
    if (!modalMatchDetail) return;
    const modalContent = modalMatchDetail.querySelector('.modal-content-box');

    const closeMatchDetail = () => {
        modalMatchDetail.classList.remove('opacity-100');
        modalMatchDetail.classList.add('opacity-0');
        if (modalContent) {
            modalContent.classList.remove('scale-100');
            modalContent.classList.add('scale-95');
        }

        setTimeout(() => {
            modalMatchDetail.classList.add('hidden');
            modalMatchDetail.classList.remove('flex');
        }, 200);
    };

    document.getElementById('btn-close-match-detail')?.addEventListener('click', closeMatchDetail);
    document.getElementById('btn-done-match-detail')?.addEventListener('click', closeMatchDetail);

    modalMatchDetail.addEventListener('click', (e) => {
        if (e.target === modalMatchDetail) closeMatchDetail();
    });
}

window.addEventListener('update', (event) => {
    window.location.reload();
});

document.addEventListener('click', (e) => {
    if (e.target.closest('.bookmark-btn')) return;

    const articleCard = e.target.closest('.card-news');
    if (articleCard) {
        const newsId = articleCard.getAttribute('data-id');
        if (newsId) {
            window.location.href = `${new URL('../../pages/Artical.html', import.meta.url).href}?id=${newsId}&from=user`;
        }
    }
});