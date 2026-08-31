let currentSlide = 0;
const totalSlides = 3;
const track = document.getElementById('carouselTrack');
const dots = document.getElementById('dotsContainer').children;

function updateCarousel() {
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
    for (let i = 0; i < dots.length; i++) {
        if (i === currentSlide) {
            dots[i].className = 'w-2 h-2 md:w-3 md:h-3 rounded-full bg-[#FF4500] transition-all cursor-pointer';
        } else {
            dots[i].className = 'w-2 h-2 md:w-3 md:h-3 rounded-full bg-white/40 hover:bg-white transition-all cursor-pointer';
        }
    }
}

function goToSlide(index) {
    currentSlide = index;
    updateCarousel();
}

document.getElementById('nextBtn').addEventListener('click', () => {
    currentSlide = (currentSlide + 1) % totalSlides;
    updateCarousel();
});

document.getElementById('prevBtn').addEventListener('click', () => {
    currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
    updateCarousel();
});

// Tự động chuyển slide sau mỗi 5 giây
setInterval(() => {
    currentSlide = (currentSlide + 1) % totalSlides;
    updateCarousel();
}, 5000);


window.addEventListener('pageshow', (event) => {
    // event.persisted = true nghĩa là trang được tải lại từ BFCache (khi bấm Back/Forward)
    if (event.persisted) {
        // Tải lại trang để đồng bộ lại trạng thái từ sessionStorage
        sessionStorage.removeItem('currentUserId');
        sessionStorage.removeItem('username');
        window.location.reload();
    }
});