/* ===========================================================
   INSTITUT KYESHERO — index.js
   =========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initNavbarScroll();
  initMobileNav();
  initHeroSlideshow();
  initScrollProgress();
  initRevealOnScroll();
  initCountUp();
});

/* ---------- Navbar : ombre au scroll ---------- */
function initNavbarScroll() {
  const navbar = document.getElementById("navbar");
  if (!navbar) return;
  window.addEventListener(
    "scroll",
    () => {
      navbar.classList.toggle("scrolled", window.scrollY > 10);
    },
    { passive: true },
  );
}

/* ---------- Menu mobile ---------- */
function initMobileNav() {
  // Overlay créé dynamiquement pour fermer le menu au clic à l'extérieur
  const overlay = document.createElement("div");
  overlay.className = "nav-overlay";
  overlay.id = "navOverlay";
  document.body.appendChild(overlay);
  overlay.addEventListener("click", closeMobileNav);
}

function openMobileNav() {
  document.getElementById("mobileNav")?.classList.add("open");
  document.getElementById("navOverlay")?.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeMobileNav() {
  document.getElementById("mobileNav")?.classList.remove("open");
  document.getElementById("navOverlay")?.classList.remove("open");
  document.body.style.overflow = "";
}

// Ferme le menu mobile si on clique un lien à l'intérieur
document.addEventListener("click", (e) => {
  if (e.target.closest(".mobile-nav a")) closeMobileNav();
});

/* ---------- Navigation interne (logo, boutons hero) ----------
   Fait défiler vers une section de la page si son id existe,
   sinon redirige vers la page correspondante (ex: 'sections' -> sections.html) */
function goTo(target) {
  if (target === "home") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const byId =
    document.getElementById(target) || document.getElementById("sec-" + target);
  if (byId) {
    byId.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  // Pas d'ancre correspondante sur cette page : va vers la page dédiée
  window.location.href = target + ".html";
}

/* ---------- Hero : slideshow + points de navigation ---------- */
function initHeroSlideshow() {
  const slides = document.querySelectorAll(".hslide");
  const dotsWrap = document.getElementById("heroDots");
  if (!slides.length || !dotsWrap) return;

  let current = 0;
  let timer = null;

  // Génère les points
  slides.forEach((_, i) => {
    const dot = document.createElement("span");
    if (i === 0) dot.classList.add("active");
    dot.addEventListener("click", () => goToSlide(i));
    dotsWrap.appendChild(dot);
  });
  const dots = dotsWrap.querySelectorAll("span");

  function goToSlide(index) {
    slides[current].classList.remove("active");
    dots[current].classList.remove("active");
    current = (index + slides.length) % slides.length;
    slides[current].classList.add("active");
    dots[current].classList.add("active");
  }

  function nextSlide() {
    goToSlide(current + 1);
  }

  function startAutoplay() {
    stopAutoplay();
    timer = setInterval(nextSlide, 4000);
  }
  function stopAutoplay() {
    if (timer) clearInterval(timer);
  }

  startAutoplay();

  // Pause au survol pour laisser le temps de lire
  const heroEl = document.querySelector(".hero");
  if (heroEl) {
    heroEl.addEventListener("mouseenter", stopAutoplay);
    heroEl.addEventListener("mouseleave", startAutoplay);
  }

  // Expose pour d'éventuels boutons flèches réactivés plus tard
  window.heroSlide = (dir) => goToSlide(current + dir);
}

/* ---------- Barre de progression de lecture ---------- */
function initScrollProgress() {
  const bar = document.getElementById("progress");
  if (!bar) return;
  window.addEventListener(
    "scroll",
    () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      bar.style.width = pct + "%";
    },
    { passive: true },
  );
}

/* ---------- Apparition des sections au scroll ---------- */
function initRevealOnScroll() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length) return;

  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("in-view"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -60px 0px" },
  );

  items.forEach((el) => observer.observe(el));
}

/* ---------- Compteurs animés (bande statistiques) ---------- */
function initCountUp() {
  const counters = document.querySelectorAll(".count-up");
  if (!counters.length) return;

  const animate = (el) => {
    const target = parseInt(el.dataset.target, 10) || 0;
    const duration = 1400;
    const start = performance.now();

    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target;
    }
    requestAnimationFrame(step);
  };

  if (!("IntersectionObserver" in window)) {
    counters.forEach(animate);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.4 },
  );

  counters.forEach((el) => observer.observe(el));
}
