/* ──────────────── HERO SLIDER ──────────────── */
    var hSlides = document.querySelectorAll('.hslide');
    var hDots = document.getElementById('heroDots');
    var hCur = 0, hTimer;

    (function initDots() {
      hSlides.forEach(function (_, i) {
        var d = document.createElement('div');
        d.className = 'hdot' + (i === 0 ? ' active' : '');
        d.onclick = function () { heroGo(i) };
        hDots.appendChild(d);
      });
    })();

    function heroGo(n) {
      hSlides[hCur].classList.remove('active');
      hDots.children[hCur].classList.remove('active');
      hCur = (n + hSlides.length) % hSlides.length;
      hSlides[hCur].classList.add('active');
      hDots.children[hCur].classList.add('active');
    }
    function heroSlide(d) { heroGo(hCur + d); resetHeroTimer() }
    function resetHeroTimer() { clearInterval(hTimer); hTimer = setInterval(function () { heroSlide(1) }, 6000) }
    hTimer = setInterval(function () { heroSlide(1) }, 6000);

    /* ──────────────── TÉMOIGNAGES ──────────────── */
    var testiIdx = 0;
    var testiCards;

    function initTesti() {
      testiCards = document.querySelectorAll('.testi-card');
    }
    function testiMove(d) {
      if (!testiCards) initTesti();
      var visible = window.innerWidth < 900 ? 1 : 3;
      var max = testiCards.length - visible;
      testiIdx = Math.max(0, Math.min(testiIdx + d, max));
      var cardW = testiCards[0].offsetWidth + 24;
      document.getElementById('testiTrack').style.transform = 'translateX(-' + testiIdx * cardW + 'px)';
    }

    /* ──────────────── NAVIGATION ──────────────── */
    var currentView = 'home';
    var views = ['home', 'actualites', 'galerie', 'apropos', 'sections', 'contact'];

    function goTo(id) {
      // toggle pages
      var isEspace = (id === 'espace' || id === 'inscriptions');

      document.getElementById('page-main').style.display = isEspace ? 'none' : 'block';
      document.getElementById('page-espace').style.display = isEspace ? 'block' : 'none';
      document.getElementById('main-footer').style.display = isEspace ? 'none' : 'block';

      if (!isEspace) {
        views.forEach(function (v) {
          var el = document.getElementById('view-' + v);
          if (el) el.style.display = (v === id) ? 'block' : 'none';
        });
        // If id is 'inscriptions' map to 'contact'
        if (id === 'inscriptions') {
          document.getElementById('view-contact').style.display = 'block';
        }
        currentView = id;
        // update nav
        document.querySelectorAll('.nav-links a').forEach(function (a) { a.classList.remove('active') });
        var nl = document.getElementById('nl-' + id);
        if (nl) nl.classList.add('active');
        // mobile bar
        document.querySelectorAll('.mbar-item').forEach(function (m) { m.classList.remove('active') });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      initReveal();
    }

    /* ──────────────── MOBILE NAV ──────────────── */
    function openMobileNav() { document.getElementById('mobileNav').classList.add('open') }
    function closeMobileNav() { document.getElementById('mobileNav').classList.remove('open') }

    /* ──────────────── ESPACE LOGIN ──────────────── */
    function switchTab(t) {
      ['eleve', 'parent', 'admin'].forEach(function (tab) {
        document.getElementById('tab-' + tab).classList.toggle('active', tab === t);
        document.getElementById('form-' + tab).style.display = (tab === t) ? 'block' : 'none';
      });
    }
    function clearErr() {
      document.querySelectorAll('.err-box').forEach(function (e) { e.classList.remove('show') });
    }
    function doLogin(type) {
      var err = document.getElementById('err-' + type);
      err.classList.add('show');
    }

    /* ──────────────── SCROLL REVEAL ──────────────── */
    function initReveal() {
      var els = document.querySelectorAll('.reveal');
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) e.target.classList.add('visible');
        });
      }, { threshold: .12 });
      els.forEach(function (el) { obs.observe(el) });
    }
    initReveal();

    /* ──────────────── SCROLL PROGRESS ──────────────── */
    window.addEventListener('scroll', function () {
      var prog = document.getElementById('progress');
      var s = window.scrollY;
      var h = document.documentElement.scrollHeight - window.innerHeight;
      prog.style.width = (h > 0 ? (s / h * 100) : 0) + '%';

      // sticky nav shadow
      var nav = document.getElementById('navbar');
      nav.classList.toggle('scrolled', s > 60);
    });

    /* ──────────────── COUNT UP ──────────────── */
    function countUp() {
      document.querySelectorAll('.count-up').forEach(function (el) {
        var target = parseInt(el.getAttribute('data-target'));
        var dur = 1800;
        var start = null;
        function step(ts) {
          if (!start) start = ts;
          var progress = Math.min((ts - start) / dur, 1);
          var val = Math.floor(progress * target);
          el.textContent = val.toLocaleString('fr-FR');
          if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      });
    }

    /* trigger countUp when stats band visible */
    var statsBandObserved = false;
    var sbObs = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !statsBandObserved) {
        statsBandObserved = true;
        countUp();
      }
    }, { threshold: .3 });
    var sb = document.querySelector('.stats-band');
    if (sb) sbObs.observe(sb);

    /* ──────────────── ANNONCE TRACK DUPLICATE ──────────────── */
    // already duplicated in HTML for seamless loop

    /* init */
    initTesti();