/*  FABULOUS IMAGE SHOW – Programmer's Picnic Edition
 *  Now with AUTO START after 15 seconds!
 */

(function () {

    // Collect all images
    const imgs = Array.from(document.querySelectorAll("img"));
    console.log(imgs);

    if (imgs.length === 0) return;

    // Create overlay container
    const overlay = document.createElement("div");
    overlay.id = "pp-gallery-overlay";
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background-color:lightblue;
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 999999;
        /* backdrop-filter: blur(8px);*/
          box-shadow: 0 40px 100px rgba(27, 80, 8, 0.38);;
    `;

    // Create image display box
    const slideImg = document.createElement("img");
    slideImg.id = "pp-slide-img";
    slideImg.style.cssText = `
    box-shadow: 10px 20px 350px red;
        max-width: 90%;
        max-height: 80%;
        border-radius: 16px;
        box-shadow: 0 40px 100px rgba(27, 80, 8, 0.38);;
        opacity: 0;
        transition: opacity 0.6s ease-in-out;
    `;

    // Navigation buttons
    const btnStyle = `
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        font-size: 42px;
        color: white;
        cursor: pointer;
        padding: 20px;
        user-select: none;
        transition: 0.3s;
    `;

    const prevBtn = document.createElement("div");
    prevBtn.innerHTML = "&#10094;";
    prevBtn.style.cssText = btnStyle + "left: 30px;";

    const nextBtn = document.createElement("div");
    nextBtn.innerHTML = "&#10095;";
    nextBtn.style.cssText = btnStyle + "right: 30px;";

    const closeBtn = document.createElement("div");
    closeBtn.innerHTML = "&times;";
    closeBtn.style.cssText = `
        position: absolute;
        top: 20px;
        right: 30px;
        font-size: 50px;
        color: white;
        cursor: pointer;
        user-select: none;
    `;

    overlay.appendChild(slideImg);
    overlay.appendChild(prevBtn);
    overlay.appendChild(nextBtn);
    overlay.appendChild(closeBtn);
    document.body.appendChild(overlay);

    let currentIndex = 0;
    let autoPlayInterval = null;

    function showSlide(index) {
        // imgs.forEach(myFunction)

        // function myFunction(item, index, arr) {
        //     imgs[index].classList.remove("slideFabulous");
        // }
        if (index < 0) index = imgs.length - 1;
        if (index >= imgs.length) index = 0;
        currentIndex = index;
        slideImg.classList.remove("animX");
        slideImg.classList.remove("animY");
        // slideImg.style.opacity = 0;

        setTimeout(() => {
            slideImg.src = imgs[currentIndex].src;
            slideImg.style.opacity = 1;
            console.log(Math.random());
            // slideImg.classList.add("img");
            if (Math.random() < 0.5)
                slideImg.classList.add("animX");
            else
                slideImg.classList.add("animY");
        }, 20);
    }

    function openGallery(index) {
        overlay.style.display = "flex";
        showSlide(index);
        startAutoPlay();
    }

    function closeGallery() {
        overlay.style.display = "none";
        stopAutoPlay();
    }

    function nextSlide() {
        showSlide(currentIndex + 1);
    }

    function prevSlide() {
        showSlide(currentIndex - 1);
    }

    // Auto-play every 4 seconds
    function startAutoPlay() {
        stopAutoPlay();
        autoPlayInterval = setInterval(nextSlide, 5000);
    }

    function stopAutoPlay() {
        if (autoPlayInterval) clearInterval(autoPlayInterval);
    }

    // Click any image to open gallery
    imgs.forEach((img, idx) => {
        img.style.cursor = "zoom-in";
        img.addEventListener("click", () => openGallery(idx));
    });

    // Button events
    nextBtn.onclick = nextSlide;
    prevBtn.onclick = prevSlide;
    closeBtn.onclick = closeGallery;

    // Keyboard controls
    document.addEventListener("keydown", (e) => {
        if (overlay.style.display === "flex") {
            if (e.key === "ArrowRight") nextSlide();
            if (e.key === "ArrowLeft") prevSlide();
            if (e.key === "Escape") closeGallery();
        }
    });

    // ⭐ AUTO START SLIDESHOW AFTER 15 SECONDS
    setTimeout(() => {
        if (overlay.style.display === "none") {
            openGallery(0);  // Start from first image
        }
    }, 3000);

})();
