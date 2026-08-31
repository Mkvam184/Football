import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, set } from "firebase/database";

// 1. Cấu hình Firebase Database
const firebaseConfig = {
    databaseURL: "https://footballweb-bf80b-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const LEAGUES = [
    { code: "PL", key: "epl", name: "Premier League" },
    { code: "BL1", key: "bl1", name: "Bundesliga" },
    { code: "PD", key: "laliga", name: "La Liga" },
    { code: "SA", key: "seriea", name: "Serie A" },
    { code: "CL", key: "cl", name: "Champions League" },
    { code: "WC", key: "wc", name: "World Cup" },
];

let allLeagues = {};
const API_KEY = process.env.FOOTBALL_API_KEY;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

if (!API_KEY) {
    console.error("Thiếu FOOTBALL_API_KEY. Hãy đặt biến môi trường trước khi chạy script: export FOOTBALL_API_KEY='...';");
    process.exit(1);
}

async function initFirebaseData() {
    try {
        const snapshot = await get(ref(db, 'tournaments'));
        if (snapshot.exists()) {
            allLeagues = snapshot.val();
        }
    } catch (e) {
        console.error("Lỗi lấy dữ liệu từ Firebase:", e);
    }
}

async function syncFootballData() {
    console.log(`[${new Date().toLocaleTimeString('vi-VN')}] 🔄 Bắt đầu đồng bộ...`);
    await initFirebaseData();

    for (const league of LEAGUES) {
        try {
            console.log(`⏳ Đang tải Lịch thi đấu ${league.name}...`);

            const matchesUrl = `https://api.football-data.org/v4/competitions/${league.code}/matches`;
            const resMatches = await fetch(matchesUrl, {
                headers: { 'X-Auth-Token': API_KEY }
            });

            if (resMatches.status === 429) {
                console.error(`🚨 Quá giới hạn API (429) tại giải ${league.name}. Tạm dừng lượt này!`);
                break;
            }

            if (!resMatches.ok) {
                console.error(`⚠️ Không tải được ${league.name}: ${resMatches.status} ${resMatches.statusText}`);
                continue;
            }

            let newFixtures = allLeagues[league.key]?.fixtures || [];
            const dataMatches = await resMatches.json();
            if (dataMatches.matches) {
                newFixtures = dataMatches.matches.map(m => {
                    const dateObj = new Date(m.utcDate);
                    return {
                        teamHome: m.homeTeam?.name || "TBD",
                        teamAway: m.awayTeam?.name || "TBD",
                        time: dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                        date: dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
                        status: m.status,
                        scoreHome: m.score?.fullTime?.home ?? "-",
                        scoreAway: m.score?.fullTime?.away ?? "-",
                        matchday: m.matchday || m.stage || ""
                    };
                });
            }

            let currentTeams = allLeagues[league.key]?.teams || [];
            if (currentTeams.length < 8) {
                console.log(`🔍 Phát hiện ${league.name} thiếu danh sách đội. Đang tải Bảng Xếp Hạng...`);
                await sleep(6500);

                const standingsUrl = `https://api.football-data.org/v4/competitions/${league.code}/standings`;
                const resStandings = await fetch(standingsUrl, {
                    headers: { 'X-Auth-Token': API_KEY }
                });

                if (resStandings.ok) {
                    const dataStandings = await resStandings.json();
                    let combinedTable = [];
                    if (Array.isArray(dataStandings.standings)) {
                        dataStandings.standings.forEach(s => {
                            if (Array.isArray(s.table)) {
                                combinedTable = combinedTable.concat(s.table);
                            }
                        });
                    }

                    if (combinedTable.length > 0) {
                        currentTeams = combinedTable.map(item => ({
                            rank: item.position,
                            team: item.team.name,
                            icon: item.team.crest || "",
                            p: item.playedGames,
                            w: item.won,
                            d: item.draw,
                            l: item.lost,
                            gd: item.goalDifference > 0 ? `+${item.goalDifference}` : `${item.goalDifference}`,
                            pts: item.points,
                            group: item.group || ""
                        }));
                    }
                }
            }

            allLeagues[league.key] = {
                name: league.name,
                teams: currentTeams,
                fixtures: newFixtures
            };

            console.log(`✅ Hoàn thành: ${league.name} (${currentTeams.length} đội)`);
            await sleep(6500);
        } catch (err) {
            console.error(`❌ Lỗi đồng bộ giải ${league.name}:`, err);
        }
    }

    try {
        await set(ref(db, 'tournaments'), allLeagues);
        console.log(`[${new Date().toLocaleTimeString('vi-VN')}] 🎉 Đã đồng bộ dữ liệu lên Firebase!`);
    } catch (e) {
        console.error("Lỗi khi lưu Firebase:", e);
    }
}

(async () => {
    await syncFootballData();
    console.log("✅ Hoàn tất một lần đồng bộ dữ liệu. GitHub Actions sẽ chạy lại theo lịch 15 phút.");
})();