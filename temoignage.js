// ══ CONFIG ══
const CLOUDINARY_CLOUD = 'dqtu9carq';
const CLOUDINARY_PRESET = 'temoignages_ikyeshero';

// ══ EMAILJS INIT ══
emailjs.init("AGXhkUZPEkhm_AIZ6");

// ══ NAV SCROLL ══
window.addEventListener('scroll', () => {
    document.getElementById('navbar').classList.toggle('scrolled', scrollY > 40);
    const el = document.getElementById('progress');
    if (el) {
        const pct = (scrollY / (document.body.scrollHeight - innerHeight)) * 100;
        el.style.width = pct + '%';
    }
});

// ══ MOBILE NAV ══
function openMobileNav() {
    document.getElementById('mobileNav').classList.add('open');
}

function closeMobileNav() {
    document.getElementById('mobileNav').classList.remove('open');
}

// ══ SCROLL REVEAL ══
const revealObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('visible');
    });
}, {
    threshold: .15
});
document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

// ══ ÉTOILES ══
let selectedNote = 0;
const starBtns = document.querySelectorAll('.star-btn');
const starsHint = document.getElementById('starsHint');
const hintTexts = ['', '😕 Passable - nous allons nous améliorer', '😐 Acceptable - merci pour votre honnêteté', '🙂 Bien - nous continuons à progresser', '😊 Très bien - merci du fond du cœur !', '🤩 Excellent - vous êtes formidable !'];

function litStars(n) {
    starBtns.forEach((btn, i) => btn.classList.toggle('lit', i < n));
}

starBtns.forEach(btn => {
    btn.addEventListener('mouseenter', () => litStars(+btn.dataset.val));
    btn.addEventListener('mouseleave', () => litStars(selectedNote));
    btn.addEventListener('click', () => {
        selectedNote = +btn.dataset.val;
        litStars(selectedNote);
        starsHint.textContent = hintTexts[selectedNote];
    });
});

// ══ PHOTO ══
const photoFile = document.getElementById('photoFile');
const photoPreview = document.getElementById('photoPreview');
const photoPreviewWrap = document.getElementById('photoPreviewWrap');
const photoName = document.getElementById('photoName');
const photoDrop = document.getElementById('photoDrop');
let selectedFile = null; // on garde le File brut pour l'upload Cloudinary

photoFile.addEventListener('change', () => handlePhotoFile(photoFile.files[0]));

photoDrop.addEventListener('dragover', e => {
    e.preventDefault();
    photoDrop.classList.add('dragover');
});
photoDrop.addEventListener('dragleave', () => photoDrop.classList.remove('dragover'));
photoDrop.addEventListener('drop', e => {
    e.preventDefault();
    photoDrop.classList.remove('dragover');
    handlePhotoFile(e.dataTransfer.files[0]);
});

function handlePhotoFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 8 * 1024 * 1024) {
        showToast('error', '📁 Fichier trop lourd', 'La photo dépasse 8 Mo. Choisissez-en une plus légère — merci !', 'Choisir une autre photo');
        return;
    }
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = e => {
        photoPreview.src = e.target.result;
        photoName.textContent = file.name;
        photoDrop.style.display = 'none';
        photoPreviewWrap.style.display = 'flex';
    };
    reader.readAsDataURL(file);
}

function removePhoto() {
    selectedFile = null;
    photoFile.value = '';
    photoPreview.src = '';
    photoPreviewWrap.style.display = 'none';
    photoDrop.style.display = 'block';
}

// ══ UPLOAD CLOUDINARY → retourne l'URL publique ══
async function uploadToCloudinary(file) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', CLOUDINARY_PRESET);
    fd.append('folder', 'temoignages');

    const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
            method: 'POST',
            body: fd
        }
    );
    if (!res.ok) throw new Error('Cloudinary upload failed: ' + res.status);
    const data = await res.json();
    return data.secure_url; // ex: https://res.cloudinary.com/dqtu9carq/image/upload/...
}

// ══ TOAST ══
function showToast(type, title, msg, btnLabel) {
    const overlay = document.getElementById('toastOverlay');
    const icon = document.getElementById('toastIcon');
    const titleEl = document.getElementById('toastTitle');
    const msgEl = document.getElementById('toastMsg');
    const closeBtn = document.getElementById('toastClose');

    icon.className = 'toast-icon ' + type;
    icon.textContent = type === 'success' ? '🎉' : '😔';
    titleEl.textContent = title;
    msgEl.innerHTML = msg; // innerHTML pour le lien cliquable
    closeBtn.textContent = btnLabel;
    closeBtn.className = 'toast-close ' + (type === 'success' ? 'success-btn' : 'error-btn');
    overlay.classList.add('show');
}

function closeToast() {
    document.getElementById('toastOverlay').classList.remove('show');
}

// ══ ENVOI PRINCIPAL ══
async function sendTemoignage() {
    const nom = document.getElementById('t-nom').value.trim();
    const email = document.getElementById('t-email').value.trim();
    const temoignage = document.getElementById('t-msg').value.trim();
    const note = selectedNote;

    // — Validation —
    if (!nom) {
        document.getElementById('t-nom').focus();
        return alert('Veuillez indiquer votre nom.');
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        document.getElementById('t-email').focus();
        return alert('Veuillez entrer une adresse e-mail valide.');
    }
    if (!note) {
        showToast('error', '⭐ Note manquante', 'Vous n\'avez pas encore choisi votre note. Cliquez sur le nombre d\'étoiles que vous souhaitez donner — de 1 à 5.', 'Revenir au formulaire');
        return;
    }
    if (!temoignage || temoignage.length < 20) {
        document.getElementById('t-msg').focus();
        return alert('Votre témoignage est trop court. Dites-nous en un peu plus !');
    }

    const btn = document.getElementById('submitBtn');
    btn.classList.add('loading');
    btn.disabled = true;

    try {
        // — Étape 1 : Upload photo sur Cloudinary si une photo est choisie —
        let photoUrl = '(aucune photo fournie)';
        if (selectedFile) {
            try {
                photoUrl = await uploadToCloudinary(selectedFile);
            } catch (uploadErr) {
                console.warn('Upload photo échoué, on continue sans :', uploadErr);
                photoUrl = '(photo non disponible — erreur upload)';
            }
        }

        // — Étape 2 : Envoi EmailJS avec l'URL Cloudinary —
        const params = {
            nom,
            email,
            note: '⭐'.repeat(note) + ' (' + note + '/5)',
            temoignage,
            photo_url: photoUrl
        };

        await emailjs.send("service_yg1i99u", "template_ub1vmel", params);

        // — Succès —
        btn.classList.remove('loading');
        btn.disabled = false;
        showToast(
            'success',
            'Merci, ' + nom.split(' ')[0] + ' ! ',
            'Votre témoignage a bien été reçu et nous touche profondément. Nous allons l\'examiner avec soin avant de le partager avec notre communauté. Que Dieu vous bénisse !',
            '✓ Fermer et revenir'
        );

        // Reset
        document.getElementById('t-nom').value = '';
        document.getElementById('t-email').value = '';
        document.getElementById('t-msg').value = '';
        selectedNote = 0;
        litStars(0);
        starsHint.textContent = 'Cliquez sur une étoile pour noter';
        removePhoto();

    } catch (err) {
        btn.classList.remove('loading');
        btn.disabled = false;
        console.error('Erreur envoi :', err);
        showToast(
            'error',
            'Oups, quelque chose a bloqué…',
            'Votre message ne nous est pas parvenu cette fois-ci. Vérifiez votre connexion internet et réessayez. Si le problème persiste, écrivez-nous directement à <a href="mailto:contact@ikyeshero-goma.cd" style="color:#c0392b;font-weight:700;">contact@ikyeshero-goma.cd</a>',
            'Réessayer maintenant'
        );
    }
}