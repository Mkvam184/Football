import { db, ref, get, set } from "../../data/Firebase.js";

let allLeagues = {};
let currentLeagueKey = "epl";
let selectedTeamName = "";
let searchKeyword = "";

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

document.addEventListener('DOMContentLoaded', async () => {
    // 1. KIỂM TRA QUYỀN ADMIN
    const role = sessionStorage.getItem('userRole');
    if (role !== 'admin') {
        alert("Bạn không có quyền truy cập trang quản trị này!");
        window.location.href = new URL('../../index.html', import.meta.url).href;
        return;
    }

    // DOM Elements
    const leagueNameLabel = document.getElementById('current-league-name');
    const teamCardsGrid = document.getElementById('team-cards-grid');
    const standingsTableBody = document.getElementById('standings-table-body');
    const teamFixturesContainer = document.getElementById('team-fixtures-container');
    const selectedTeamInfo = document.getElementById('selected-team-info');
    const searchInput = document.getElementById('search-team-input');

    // Modals & Form
    const modalTeam = document.getElementById('modal-team');
    const modalFixture = document.getElementById('modal-fixture');
    const modalMatchDetail = document.getElementById('modal-match-detail');
    const formTeam = document.getElementById('form-team');
    const formFixture = document.getElementById('form-fixture');

    // 2. LOAD VÀ SAVE FIREBASE
    async function loadDataFromFirebase() {
        try {
            const dbRef = ref(db, 'tournaments');
            const snapshot = await get(dbRef);

            if (snapshot.exists()) {
                allLeagues = snapshot.val();
            } else {
                allLeagues = typeof defaultLeagueData !== 'undefined' ? defaultLeagueData : {};
                await set(ref(db, 'tournaments'), allLeagues);
            }
            renderAll();
        } catch (e) {
            console.error("Lỗi khi tải dữ liệu từ Firebase:", e);
            allLeagues = typeof defaultLeagueData !== 'undefined' ? defaultLeagueData : {};
            renderAll();
        }
    }

    async function saveToFirebase() {
        try {
            await set(ref(db, 'tournaments'), allLeagues);
            renderAll();
            alert("Lưu dữ liệu lên Firebase thành công!");
        } catch (e) {
            console.error("Lỗi khi lưu Firebase:", e);
            alert("Lỗi khi lưu dữ liệu lên hệ thống!");
        }
    }

    function renderAll() {
        renderTeamCards();
        renderStandings();
        renderFixtures();
    }

    window.renderAll = renderAll;

    // 3. RENDER THẺ ĐỘI BÓNG
    function renderTeamCards() {
        const currentLeague = allLeagues[currentLeagueKey] || { name: '', teams: [] };
        if (leagueNameLabel) {
            leagueNameLabel.textContent = `(${currentLeague.name || currentLeagueKey.toUpperCase()})`;
        }

        const filteredTeams = (currentLeague.teams || []).filter(t => 
            t.team.toLowerCase().includes(searchKeyword)
        );

        if (filteredTeams.length === 0) {
            teamCardsGrid.innerHTML = `<p class="col-span-full text-xs text-gray-400 italic">Chưa có đội bóng nào.</p>`;
            return;
        }

        teamCardsGrid.innerHTML = filteredTeams.map(t => {
            const isSelected = selectedTeamName.toLowerCase() === t.team.toLowerCase();
            return `
            <button data-team="${t.team}" class="team-card p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 shadow-md ${
                isSelected 
                ? 'bg-[#FF4500] border-[#FF4500] text-white font-bold scale-105' 
                : 'bg-[#0D3B1B] border-[#166534] text-gray-200 hover:border-[#FF4500]'
            }">
                <span class="text-xl">${renderTeamLogo(t.icon, "w-6 h-6 object-contain mb-1")}</span>
                <span class="text-xs truncate w-full">${t.team}</span>
            </button>`;
        }).join('');
    }

    // 4. RENDER BẢNG XẾP HẠNG
    function renderStandings() {
        const currentLeague = allLeagues[currentLeagueKey] || { teams: [] };
        const teams = currentLeague.teams || [];

        teams.sort((a, b) => Number(b.pts) - Number(a.pts) || Number(b.gd) - Number(a.gd));
        const totalTeams = teams.length;

        standingsTableBody.innerHTML = teams.map((t, index) => {
            const isSelected = selectedTeamName.toLowerCase() === t.team.toLowerCase();
            const currentRank = index + 1;

            let borderStyle = "border-left: 4px solid transparent;";
            let rankColorClass = "text-gray-400";

            if (currentRank >= 1 && currentRank <= 4) {
                borderStyle = "border-left: 4px solid #3b82f6 !important;";
                rankColorClass = "text-blue-400 font-bold";
            } else if (currentRank === 5) {
                borderStyle = "border-left: 4px solid #f59e0b !important;";
                rankColorClass = "text-amber-400 font-bold";
            } else if (totalTeams > 0 && currentRank > totalTeams - 3) {
                borderStyle = "border-left: 4px solid #ef4444 !important;";
                rankColorClass = "text-red-500 font-bold";
            }

            return `
            <tr data-team="${t.team}" class="standing-row cursor-pointer transition-all ${isSelected ? 'bg-[#FF4500]/30 font-bold text-white' : 'hover:bg-[#134E22]/40 text-gray-200'}">
                <td style="${borderStyle}" class="py-3 px-2 align-middle text-center font-bold ${rankColorClass}">${currentRank}</td>
                <td class="py-3 px-3 flex items-center gap-2 align-middle">
                    <span>${renderTeamLogo(t.icon, "w-4 h-4 object-contain")}</span>
                    <span class="${isSelected ? 'text-[#FF4500] font-black' : 'text-white'} truncate max-w-[100px] sm:max-w-none">${t.team}</span>
                </td>
                <td class="py-3 px-1.5 text-center text-gray-300">${t.p}</td>
                <td class="py-3 px-1.5 text-center text-gray-300">${t.w}</td>
                <td class="py-3 px-1.5 text-center text-gray-300">${t.d}</td>
                <td class="py-3 px-1.5 text-center text-gray-300">${t.l}</td>
                <td class="py-3 px-1.5 text-center text-gray-400 hidden sm:table-cell">${t.gd}</td>
                <td class="py-3 px-2 text-center font-black text-[#FF4500] text-sm">${t.pts}</td>
            </tr>`;
        }).join('');
    }

    // 5. RENDER LỊCH THI ĐẤU
    function renderFixtures() {
        const container = document.getElementById('team-fixtures-container');
        if (!container) return;

        const currentLeague = allLeagues[currentLeagueKey] || { teams: [], fixtures: [], matches: [] };
        const rawFixtures = currentLeague.fixtures || currentLeague.matches || [];
        const teams = currentLeague.teams || [];

        const teamLogoMap = {};
        teams.forEach(t => {
            if (t && t.team) {
                teamLogoMap[t.team.toLowerCase()] = t.icon;
            }
        });

        if (selectedTeamInfo) {
            selectedTeamInfo.textContent = selectedTeamName 
                ? `Lọc theo: ${selectedTeamName}` 
                : "Hiển thị tất cả trận đấu";
        }

        const filteredFixtures = rawFixtures.filter(f => {
            if (!selectedTeamName) return true;
            const home = (f.teamHome || f.homeTeam || '').toLowerCase();
            const away = (f.teamAway || f.awayTeam || '').toLowerCase();
            return home.includes(selectedTeamName.toLowerCase()) || away.includes(selectedTeamName.toLowerCase());
        });

        if (filteredFixtures.length === 0) {
            container.innerHTML = `<div class="col-span-full bg-[#0D3B1B] border border-[#166534] rounded-xl p-4 text-center text-xs text-gray-400 italic">Không có lịch thi đấu.</div>`;
            return;
        }

        container.innerHTML = filteredFixtures.map((f) => {
            const homeName = f.teamHome || f.homeTeam || 'Đội nhà';
            const awayName = f.teamAway || f.awayTeam || 'Đội khách';
            const rawIndex = rawFixtures.indexOf(f);

            const homeIcon = teamLogoMap[homeName.toLowerCase()] || f.homeIcon || '';
            const awayIcon = teamLogoMap[awayName.toLowerCase()] || f.awayIcon || '';

            const hasScore = f.scoreHome !== undefined && f.scoreAway !== undefined && f.scoreHome !== null;
            const scoreDisplay = hasScore ? `${f.scoreHome} - ${f.scoreAway}` : 'VS';

            const statusInfo = formatMatchStatus(f.status);
            const dateTimeFormatted = formatMatchDateTime(f.date, f.time, f.utcDate);

            return `
            <div data-index="${rawIndex}" class="fixture-card bg-[#0D3B1B] border border-[#166534] hover:border-[#FF4500] rounded-xl p-3 shadow-md relative group flex flex-col justify-between cursor-pointer transition-all hover:-translate-y-0.5">
                <div class="flex items-center justify-between text-[10px] text-gray-400 mb-2 border-b border-[#166534]/50 pb-1">
                    <span class="text-[#FF4500] font-semibold flex items-center">${dateTimeFormatted}</span>
                    <span class="text-[9px] bg-[#166534]/40 px-1.5 py-0.5 rounded ${statusInfo.color} font-bold">${statusInfo.text}</span>
                </div>
                
                <div class="flex items-center justify-between gap-1.5">
                    <div class="flex items-center gap-1.5 flex-1 justify-end min-w-0">
                        <span class="font-bold text-xs text-white truncate text-right">${homeName}</span>
                        ${renderTeamLogo(homeIcon, "w-4 h-4 object-contain flex-shrink-0")}
                    </div>

                    <div class="px-2 py-0.5 bg-[#071F0E] rounded text-[10px] font-black text-[#FF4500] border border-[#166534] whitespace-nowrap min-w-[50px] text-center">
                        ${scoreDisplay}
                    </div>

                    <div class="flex items-center gap-1.5 flex-1 justify-start min-w-0">
                        ${renderTeamLogo(awayIcon, "w-4 h-4 object-contain flex-shrink-0")}
                        <span class="font-bold text-xs text-white truncate text-left">${awayName}</span>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    // 6. EVENT LISTENERS

    // ==========================================
    // LOGIC CHUYỂN ĐỔI CẤP GIẢI ĐẤU (CLUB VS NATIONAL)
    // ==========================================
    const filterClubBtn = document.getElementById('filter-club');
    const filterNationalBtn = document.getElementById('filter-national');
    const containerClub = document.getElementById('container-club-leagues');
    const containerNational = document.getElementById('container-national-leagues');

    function switchLeagueType(type) {
        if (type === 'club') {
            filterClubBtn?.classList.add('bg-[#FF4500]', 'text-white');
            filterClubBtn?.classList.remove('text-gray-400');
            filterNationalBtn?.classList.remove('bg-[#FF4500]', 'text-white');
            filterNationalBtn?.classList.add('text-gray-400');

            containerClub?.classList.remove('hidden');
            containerNational?.classList.add('hidden');

            const firstCard = containerClub?.querySelector('.league-card');
            if (firstCard) firstCard.click();
        } else {
            filterNationalBtn?.classList.add('bg-[#FF4500]', 'text-white');
            filterNationalBtn?.classList.remove('text-gray-400');
            filterClubBtn?.classList.remove('bg-[#FF4500]', 'text-white');
            filterClubBtn?.classList.add('text-gray-400');

            containerNational?.classList.remove('hidden');
            containerClub?.classList.add('hidden');

            const firstCard = containerNational?.querySelector('.league-card');
            if (firstCard) firstCard.click();
        }
    }

    filterClubBtn?.addEventListener('click', () => switchLeagueType('club'));
    filterNationalBtn?.addEventListener('click', () => switchLeagueType('national'));

    // Lắng nghe sự kiện chọn giải đấu bất kỳ (hỗ trợ cả 2 container)
    document.querySelectorAll('.league-group-container, #league-cards-container').forEach(container => {
        container.addEventListener('click', (e) => {
            const card = e.target.closest('.league-card');
            if (!card) return;

            document.querySelectorAll('.league-card').forEach(c => {
                c.classList.remove('active', 'border-[#FF4500]');
                c.classList.add('border-[#166534]');
            });

            card.classList.add('active', 'border-[#FF4500]');
            card.classList.remove('border-[#166534]');

            currentLeagueKey = card.dataset.league;
            selectedTeamName = "";
            renderAll();
        });
    });

    // Lọc Đội bóng khi bấm thẻ đội bóng
    teamCardsGrid?.addEventListener('click', (e) => {
        const card = e.target.closest('.team-card');
        if (!card) return;
        const teamName = card.dataset.team;
        selectedTeamName = (selectedTeamName === teamName) ? "" : teamName;
        renderAll();
    });

    // Lọc Đội bóng khi bấm dòng Bảng Xếp Hạng
    standingsTableBody?.addEventListener('click', (e) => {
        const row = e.target.closest('.standing-row');
        if (!row) return;
        const teamName = row.dataset.team;
        selectedTeamName = (selectedTeamName === teamName) ? "" : teamName;
        renderAll();
    });

    // Tìm kiếm Đội bóng
    searchInput?.addEventListener('input', (e) => {
        searchKeyword = e.target.value.trim().toLowerCase();
        renderTeamCards();
    });

    // Modal Đội bóng
    document.getElementById('btn-open-add-team')?.addEventListener('click', () => {
        formTeam.reset();
        document.getElementById('team-edit-index').value = "-1";
        document.getElementById('modal-team-title').textContent = "Thêm Đội Bóng Mới";
        modalTeam.classList.remove('hidden');
        modalTeam.classList.add('flex');
    });

    document.getElementById('btn-close-team-modal')?.addEventListener('click', () => {
        modalTeam.classList.add('hidden');
        modalTeam.classList.remove('flex');
    });

    // Sửa Đội Bóng
    standingsTableBody?.addEventListener('click', (e) => {
        const btnEdit = e.target.closest('.btn-edit-team');
        if (btnEdit) {
            const idx = btnEdit.dataset.index;
            const t = allLeagues[currentLeagueKey].teams[idx];

            document.getElementById('team-edit-index').value = idx;
            document.getElementById('input-team-name').value = t.team;
            document.getElementById('input-team-icon').value = t.icon || "";
            document.getElementById('input-team-file').value = "";
            document.getElementById('input-team-rank').value = t.rank;
            document.getElementById('input-team-p').value = t.p;
            document.getElementById('input-team-w').value = t.w;
            document.getElementById('input-team-d').value = t.d;
            document.getElementById('input-team-l').value = t.l;
            document.getElementById('input-team-gd').value = t.gd;
            document.getElementById('input-team-pts').value = t.pts;

            document.getElementById('modal-team-title').textContent = `Sửa Đội Bóng: ${t.team}`;
            modalTeam.classList.remove('hidden');
            modalTeam.classList.add('flex');
        }
    });

    formTeam?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const idx = Number(document.getElementById('team-edit-index').value);
        
        const fileInput = document.getElementById('input-team-file');
        let iconValue = document.getElementById('input-team-icon').value.trim();
        if (fileInput.files && fileInput.files[0]) {
            try {
                iconValue = await convertFileToBase64(fileInput.files[0]);
            } catch (err) {
                console.error("Lỗi đọc file:", err);
                alert("Không thể tải ảnh lên, vui lòng thử lại!");
                return;
            }
        }

        const newTeamData = {
            team: document.getElementById('input-team-name').value.trim(),
            icon: iconValue,
            rank: Number(document.getElementById('input-team-rank').value),
            p: Number(document.getElementById('input-team-p').value),
            w: Number(document.getElementById('input-team-w').value),
            d: Number(document.getElementById('input-team-d').value),
            l: Number(document.getElementById('input-team-l').value),
            gd: document.getElementById('input-team-gd').value.trim(),
            pts: Number(document.getElementById('input-team-pts').value)
        };

        if (!allLeagues[currentLeagueKey]) {
            allLeagues[currentLeagueKey] = { name: currentLeagueKey.toUpperCase(), teams: [], fixtures: [] };
        }
        if (!allLeagues[currentLeagueKey].teams) {
            allLeagues[currentLeagueKey].teams = [];
        }

        if (idx === -1) {
            allLeagues[currentLeagueKey].teams.push(newTeamData);
        } else {
            allLeagues[currentLeagueKey].teams[idx] = newTeamData;
        }

        modalTeam.classList.add('hidden');
        modalTeam.classList.remove('flex');
        await saveToFirebase();
    });

    // Modal Trận Đấu
    document.getElementById('btn-open-add-fixture')?.addEventListener('click', () => {
        formFixture.reset();
        modalFixture.classList.remove('hidden');
        modalFixture.classList.add('flex');
    });

    document.getElementById('btn-close-fixture-modal')?.addEventListener('click', () => {
        modalFixture.classList.add('hidden');
        modalFixture.classList.remove('flex');
    });

    formFixture?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const newFixture = {
            teamHome: document.getElementById('input-fixture-home').value.trim(),
            teamAway: document.getElementById('input-fixture-away').value.trim(),
            date: document.getElementById('input-fixture-date').value.trim(),
            time: document.getElementById('input-fixture-time').value.trim(),
            status: 'SCHEDULED'
        };

        if (!allLeagues[currentLeagueKey]) {
            allLeagues[currentLeagueKey] = { name: currentLeagueKey.toUpperCase(), teams: [], fixtures: [] };
        }
        if (!allLeagues[currentLeagueKey].fixtures) {
            allLeagues[currentLeagueKey].fixtures = [];
        }

        allLeagues[currentLeagueKey].fixtures.push(newFixture);
        modalFixture.classList.add('hidden');
        modalFixture.classList.remove('flex');
        await saveToFirebase();
    });

    // 7. CLICK MỞ MODAL CHI TIẾT TRẬN ĐẤU
    const modalContent = modalMatchDetail?.querySelector('.modal-content-box');

    teamFixturesContainer?.addEventListener('click', (e) => {
        const card = e.target.closest('.fixture-card');
        if (!card) return;

        const idx = card.dataset.index;
        const currentFixtures = (allLeagues[currentLeagueKey] || {}).fixtures || [];
        const match = currentFixtures[idx];
        if (!match || !modalMatchDetail) return;

        document.getElementById('detail-home-name').textContent = match.teamHome || 'ĐỘI NHÀ';
        document.getElementById('detail-away-name').textContent = match.teamAway || 'ĐỘI KHÁCH';
        
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

        const matchdayText = match.matchday ? `Vòng ${match.matchday}` : (match.stage || '');
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
    });

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

    const closeMatchDetail = () => {
        if (!modalMatchDetail) return;
        
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

    // Load App
    await loadDataFromFirebase();
});

// Helper logo & convert file
function renderTeamLogo(icon, customClass = "w-5 h-5 object-contain") {
    if (!icon) return `<span class="${customClass}">⚽</span>`;
    
    if (icon.startsWith('http://') || icon.startsWith('https://') || icon.startsWith('data:image/')) {
        return `<img src="${icon}" alt="logo" class="${customClass} inline-block" onerror="this.onerror=null;this.src='https://via.placeholder.com/20?text=⚽';"/>`;
    }
    
    return `<span class="text-sm leading-none">${icon}</span>`;
}

function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });
}