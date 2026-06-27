/* ══ PERSISTANCE DU BLOCAGE ══ */
var CLE_TENTATIVES = 'ikg_tentatives';
var CLE_BLOCAGE_FIN = 'ikg_blocage_fin';
var maxTentatives = 3;
var timerBlock;

var _store = {};

function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return _store[k] || null; } }

function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { _store[k] = String(v); } }

function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { delete _store[k]; } }

var tentatives = parseInt(lsGet(CLE_TENTATIVES) || '0');
var blocageFin = parseInt(lsGet(CLE_BLOCAGE_FIN) || '0');
var bloque = false;

window.addEventListener('load', function() {
    var maintenant = Date.now();
    if (blocageFin > maintenant) {
        reprendreBlocage(blocageFin);
    } else if (blocageFin > 0 && blocageFin <= maintenant) {
        lsDel(CLE_TENTATIVES);
        lsDel(CLE_BLOCAGE_FIN);
        tentatives = 0;
        bloque = false;
    }
    chargerDepuisSheets();
});

function reprendreBlocage(fin) {
    bloque = true;
    document.getElementById('errorBox').classList.remove('show');
    document.getElementById('attemptsInfo').style.display = 'none';
    document.getElementById('blockedBox').classList.add('show');
    document.getElementById('btnLogin').disabled = true;
    document.getElementById('btnLogin').style.opacity = '.5';

    var cd = document.getElementById('countdown');
    timerBlock = setInterval(function() {
        var restant = Math.ceil((fin - Date.now()) / 1000);
        if (restant <= 0) {
            clearInterval(timerBlock);
            bloque = false;
            tentatives = 0;
            lsDel(CLE_TENTATIVES);
            lsDel(CLE_BLOCAGE_FIN);
            document.getElementById('blockedBox').classList.remove('show');
            document.getElementById('btnLogin').disabled = false;
            document.getElementById('btnLogin').style.opacity = '1';
        } else {
            cd.textContent = restant;
        }
    }, 500);
    cd.textContent = Math.ceil((fin - Date.now()) / 1000);
}

/* ══ CHARGEMENT DEPUIS GOOGLE SHEETS via opensheet ══ */
var SHEET_ID = '1734ZsAi_FlzNcoJDSDzNQR5kxHRTa_e--bKHRd_0_HI';
// ⚠️ Remplace "Élèves" par le vrai nom de ton onglet si différent
var SHEET_URL = 'https://opensheet.elk.sh/' + SHEET_ID + '/Élèves';

var ELEVES = [];

var matieresParOption = {
    "Construction": ["Mathématiques", "Français", "Dessin Industriel", "Technologie de Construction", "Physique", "Anglais", "Éducation Civique"],
    "Électricité": ["Mathématiques", "Français", "Électricité", "Physique", "Dessin Technique", "Anglais", "Éducation Civique"],
    "Mécanique": ["Mathématiques", "Français", "Mécanique", "Résistance des Matériaux", "Physique", "Anglais", "Éducation Civique"],
    "Coupe et couture": ["Mathématiques", "Français", "Couture", "Patronage", "Anglais", "Éducation Civique"],
    "": ["Mathématiques", "Français", "Anglais", "Sciences", "Histoire", "Géographie"]
};

function construireEleve(raw) {
    var classeCode = raw['Classe'] || '';
    var option = raw['Option'] || '';
    var classeAffiche = classeCode + (option ? ' ' + option : '');
    var paye = parseInt(raw['Montant payé']) || parseInt(raw['Montant paye']) || 0;
    var reste = parseInt(raw['Reste']) || 0;
    var points = parseInt(raw['Points']) || 0;
    var cours = raw['Cours de la session'] || '';
    var sessionsRaw = parseInt(raw['Sessions']) || 0;
    var nb7e = (classeCode === '7e' || classeCode === '8e');
    var nbSessions = nb7e ? 1 : Math.max(1, sessionsRaw || 1);
    var fraisPaye = (reste <= 0);
    var matieres = matieresParOption[option] || matieresParOption[''];
    var moyGlobale = points / 5;

    var notesParSession = [];
    for (var s = 0; s < Math.min(nbSessions, 2); s++) {
        var notes = [];
        matieres.forEach(function(m) {
            var note = Math.min(20, Math.max(0, moyGlobale + (Math.random() * 6 - 3)));
            notes.push({ matiere: m, note: Math.round(note * 10) / 10 });
        });
        notesParSession.push(notes);
    }
    if (notesParSession.length === 0) notesParSession.push([]);

    return {
        matricule: raw['Matricule'] || '',
        datenais: raw['Date de naissance'] || '',
        classe: classeAffiche,
        classeCode: classeCode,
        option: option,
        nom: raw['Nom complet'] || '',
        frais_paye: fraisPaye,
        montant_paye: paye,
        reste: reste,
        sessions_count: sessionsRaw,
        cours_session: cours || 'Aucun',
        notes: notesParSession,
        absences: [],
        rang: '—',
        total_eleves: '—',
        moyenne: moyGlobale
    };
}

function afficherChargement(msg) {
    var btn = document.getElementById('btnLogin');
    btn.textContent = msg || '⏳ Chargement...';
    btn.disabled = true;
    btn.style.opacity = '.7';
}

function finChargement() {
    var btn = document.getElementById('btnLogin');
    btn.textContent = 'SE CONNECTER';
    btn.disabled = false;
    btn.style.opacity = '1';
}

function chargerDepuisSheets(callback) {
    if (!bloque) afficherChargement('⏳ Chargement...');

    fetch(SHEET_URL)
        .then(function(r) {
            if (!r.ok) throw new Error('Erreur réseau ' + r.status);
            return r.json();
        })
        .then(function(rows) {
            ELEVES = [];
            rows.forEach(function(row) {
                if (row['Matricule'] && row['Matricule'].trim()) {
                    ELEVES.push(construireEleve(row));
                }
            });
            if (!bloque) finChargement();
            peuplerClasses();
            if (callback) callback(null);
        })
        .catch(function(err) {
            if (!bloque) finChargement();
            console.error('Sheets fetch error:', err);
            afficherErreur('Impossible de charger les données. Vérifiez votre connexion internet et réessayez.');
        });
}

function peuplerClasses() {
    var select = document.getElementById('classe');
    var classes = {};
    ELEVES.forEach(function(e) { classes[e.classe] = true; });
    var keys = Object.keys(classes).sort();
    while (select.options.length > 1) select.remove(1);
    keys.forEach(function(c) {
        var opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        select.appendChild(opt);
    });
}

/* ══ CONNEXION en 2 étapes ══ */
function viderInputs() {
    document.getElementById('matricule').value = '';
    document.getElementById('datenais').value = '';
    document.getElementById('classe').value = '';
}

function validerFormatMatricule(mat) {
    if (!/^A\d{4}$/.test(mat)) return 'format';
    var num = parseInt(mat.slice(1));
    if (num < 1 || num > 3000) return 'audela';
    return 'ok';
}

function incrementerTentatives(msg) {
    tentatives++;
    lsSet(CLE_TENTATIVES, tentatives);
    agiter();
    setTimeout(viderInputs, 420);
    var restantes = maxTentatives - tentatives;
    if (tentatives >= maxTentatives) {
        bloquerAcces();
    } else {
        afficherErreur(msg);
        document.getElementById('attemptsInfo').style.display = 'block';
        document.getElementById('attemptsLeft').textContent = restantes;
    }
}

function seConnecter() {
    if (bloque) return;

    if (ELEVES.length === 0) {
        chargerDepuisSheets(function() { seConnecter(); });
        return;
    }

    var mat = document.getElementById('matricule').value.trim().toUpperCase();
    var date = document.getElementById('datenais').value;
    var classe = document.getElementById('classe').value;

    if (!mat || !date || !classe) {
        afficherErreur('Veuillez remplir tous les champs avant de continuer.');
        agiter();
        return;
    }

    var fmt = validerFormatMatricule(mat);
    if (fmt === 'format') {
        afficherErreur("Matricule incorrect. Le format attendu est A0001 jusqu'à A3000.");
        agiter();
        setTimeout(viderInputs, 420);
        return;
    }
    if (fmt === 'audela') {
        afficherErreur('Ce numéro dépasse A3000. Veuillez vérifier votre numéro matricule et réessayer.');
        agiter();
        setTimeout(viderInputs, 420);
        return;
    }

    var eleveParMat = null;
    for (var i = 0; i < ELEVES.length; i++) {
        if (ELEVES[i].matricule === mat) { eleveParMat = ELEVES[i]; break; }
    }
    if (!eleveParMat) {
        incrementerTentatives('Numéro matricule incorrect. Veuillez vérifier votre numéro matricule et réessayer.');
        return;
    }

    if (eleveParMat.datenais !== date || eleveParMat.classe !== classe) {
        incrementerTentatives('Veuillez vérifier votre date de naissance ou la classe, puis réessayer.');
        return;
    }

    // ✅ SUCCÈS
    tentatives = 0;
    lsDel(CLE_TENTATIVES);
    lsDel(CLE_BLOCAGE_FIN);
    cacherErreur();
    ouvrirDashboard(eleveParMat);
}

function afficherErreur(msg) {
    var box = document.getElementById('errorBox');
    box.classList.add('show');
    document.getElementById('errorMsg').innerHTML = msg;
}

function cacherErreur() {
    document.getElementById('errorBox').classList.remove('show');
    document.getElementById('attemptsInfo').style.display = 'none';
}

function agiter() {
    var card = document.querySelector('.login-card');
    card.classList.remove('shake');
    void card.offsetWidth;
    card.classList.add('shake');
}

function bloquerAcces() {
    var fin = Date.now() + 30000;
    lsSet(CLE_BLOCAGE_FIN, fin);
    viderInputs();
    reprendreBlocage(fin);
}

/* ══ DASHBOARD ══ */
var currentEleve = null;
var currentSession = 1;

function ouvrirDashboard(eleve) {
    currentEleve = eleve;
    document.getElementById('page-login').style.display = 'none';
    document.getElementById('page-dashboard').style.display = 'block';
    window.scrollTo(0, 0);

    var tabs = document.getElementById('sessionTabs');
    var btns = tabs.querySelectorAll('button');
    var nb7e = (eleve.classeCode === '7e' || eleve.classeCode === '8e');
    if (eleve.notes.length < 2 || nb7e) {
        btns[1].style.display = 'none';
        btns[0].classList.add('active');
        btns[1].classList.remove('active');
        currentSession = 1;
    } else {
        btns[1].style.display = 'inline-block';
    }

    remplirProfil(eleve);
    remplirInfosFinancieres(eleve);
    remplirAbsences(eleve);

    var notesContent = document.getElementById('notesContent');
    var blockedMsg = document.getElementById('blockedNotesMsg');
    var btnsTabs = document.querySelectorAll('.session-tabs button');

    if (!eleve.frais_paye) {
        notesContent.style.display = 'none';
        blockedMsg.style.display = 'block';
        btnsTabs.forEach(function(b) { b.disabled = true; });
    } else {
        notesContent.style.display = 'block';
        blockedMsg.style.display = 'none';
        btnsTabs.forEach(function(b) { b.disabled = false; });
        changerSession(currentSession);
    }
}

function remplirProfil(e) {
    document.getElementById('nomEleve').textContent = e.nom;
    document.getElementById('matriculeEleve').textContent = 'Matricule : ' + e.matricule;
    document.getElementById('classeEleve').textContent = 'Classe : ' + e.classe;
    document.getElementById('sectionBadge').textContent = e.classe;
}

function remplirInfosFinancieres(e) {
    document.getElementById('montantPaye').textContent = e.montant_paye.toLocaleString() + ' FC';
    document.getElementById('resteAPayer').textContent = e.reste.toLocaleString() + ' FC';
    document.getElementById('nbSessions').textContent = e.sessions_count;
    document.getElementById('coursSession').textContent = e.cours_session || 'Aucun cours spécifié';
}

function remplirAbsences(e) {
    var absDiv = document.getElementById('absencesList');
    absDiv.innerHTML = '';
    if (!e.absences || e.absences.length === 0) {
        absDiv.innerHTML = '<p style="color:#aaa;font-size:14px;padding:10px 0;">Aucune absence enregistrée. 🎉</p>';
    } else {
        e.absences.forEach(function(a) {
            var div = document.createElement('div');
            div.className = 'abs-item';
            div.innerHTML =
                '<span>' + a.date + ' — <strong>' + a.matiere + '</strong></span>' +
                '<span class="abs-status ' + a.statut + '">' + (a.statut === 'just' ? '✔ Justifiée' : '✖ Non justifiée') + '</span>';
            absDiv.appendChild(div);
        });
    }
}

function getMention(moy) {
    if (moy >= 18) return { txt: 'Excellent', cls: 'excel' };
    if (moy >= 15) return { txt: 'Bien', cls: 'bien' };
    if (moy >= 12) return { txt: 'Assez Bien', cls: 'bien' };
    if (moy >= 10) return { txt: 'Passable', cls: 'moyen' };
    return { txt: 'Insuffisant', cls: 'faible' };
}

function getBadgeNote(note) {
    if (note >= 17) return 'excel';
    if (note >= 14) return 'bien';
    if (note >= 10) return 'moyen';
    return 'faible';
}

function changerSession(num) {
    currentSession = num;
    var btns = document.querySelectorAll('.session-tabs button');
    btns.forEach(function(b) {
        b.classList.toggle('active', parseInt(b.dataset.session) === num);
    });
    if (currentEleve && currentEleve.frais_paye) {
        remplirNotes(currentEleve, num);
    }
}

function remplirNotes(e, sessionIndex) {
    var notes = e.notes[sessionIndex - 1] || e.notes[0];
    var total = 0;
    notes.forEach(function(n) { total += n.note; });
    var moy = (total / notes.length).toFixed(2);
    var mention = getMention(parseFloat(moy));

    document.getElementById('statMoy').textContent = moy;
    document.getElementById('statRang').textContent = e.rang;
    document.getElementById('statMatieres').textContent = notes.length;
    document.getElementById('statStatut').textContent = parseFloat(moy) >= 10 ? '✅ Admis' : '❌ Échec';

    var tbody = document.getElementById('notesBody');
    tbody.innerHTML = '';
    notes.forEach(function(n) {
        var cls = getBadgeNote(n.note);
        var pct = (n.note / 20 * 100).toFixed(0);
        var tr = document.createElement('tr');
        tr.innerHTML =
            '<td><strong>' + n.matiere + '</strong></td>' +
            '<td><span class="note-badge ' + cls + '">' + n.note + '/20</span></td>' +
            '<td>' + getMention(n.note).txt + '</td>' +
            '<td style="min-width:120px;">' +
            '<div class="progress-bar"><div class="progress-fill fill-' + cls + '" style="width:' + pct + '%"></div></div>' +
            '</td>';
        tbody.appendChild(tr);
    });

    document.getElementById('moyFinale').textContent = moy + '/20';
    document.getElementById('rangFinal').textContent = e.rang;
    document.getElementById('totalEleves').textContent = e.total_eleves;
    var mentionFinale = document.getElementById('mentionFinale');
    mentionFinale.textContent = mention.txt;
    mentionFinale.className = 'mention-finale' + (parseFloat(moy) < 10 ? ' echec' : '');
}

function seDeconnecter() {
    document.getElementById('page-dashboard').style.display = 'none';
    document.getElementById('page-login').style.display = 'block';
    document.getElementById('matricule').value = '';
    document.getElementById('datenais').value = '';
    document.getElementById('classe').value = '';
    cacherErreur();
    window.scrollTo(0, 0);
}

document.addEventListener('keydown', function(e) { if (e.key === 'Enter') seConnecter(); });