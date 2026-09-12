/* ══ PERSISTANCE DU BLOCAGE ══ */
var CLE_TENTATIVES = "ikg_tentatives";
var CLE_BLOCAGE_FIN = "ikg_blocage_fin";
var maxTentatives = 3;
var timerBlock;

var _store = {};

function lsGet(k) {
  try {
    return localStorage.getItem(k);
  } catch (e) {
    return _store[k] || null;
  }
}

function lsSet(k, v) {
  try {
    localStorage.setItem(k, v);
  } catch (e) {
    _store[k] = String(v);
  }
}

function lsDel(k) {
  try {
    localStorage.removeItem(k);
  } catch (e) {
    delete _store[k];
  }
}

var tentatives = parseInt(lsGet(CLE_TENTATIVES) || "0");
var blocageFin = parseInt(lsGet(CLE_BLOCAGE_FIN) || "0");
var bloque = false;

window.addEventListener("load", function () {
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
  document.getElementById("errorBox").classList.remove("show");
  document.getElementById("attemptsInfo").style.display = "none";
  document.getElementById("blockedBox").classList.add("show");
  document.getElementById("btnLogin").disabled = true;
  document.getElementById("btnLogin").style.opacity = ".5";

  var cd = document.getElementById("countdown");
  timerBlock = setInterval(function () {
    var restant = Math.ceil((fin - Date.now()) / 1000);
    if (restant <= 0) {
      clearInterval(timerBlock);
      bloque = false;
      tentatives = 0;
      lsDel(CLE_TENTATIVES);
      lsDel(CLE_BLOCAGE_FIN);
      document.getElementById("blockedBox").classList.remove("show");
      document.getElementById("btnLogin").disabled = false;
      document.getElementById("btnLogin").style.opacity = "1";
    } else {
      cd.textContent = restant;
    }
  }, 500);
  cd.textContent = Math.ceil((fin - Date.now()) / 1000);
}

/* ══ CHARGEMENT DEPUIS GOOGLE SHEETS via opensheet ══ */
var SHEET_ID = "16ScX4bXyd5aIla9VP37AGcPMYie1-bETXnYQWw-gU0k";
// ⚠️ Nom exact de l'onglet dans le tableur — à adapter s'il est renommé
var SHEET_NAME = "Élèves 2026-2027";
var SHEET_URL =
  "https://opensheet.elk.sh/" + SHEET_ID + "/" + encodeURIComponent(SHEET_NAME);

var ELEVES = [];

/* Date de naissance du tableur au format JJ/MM/AAAA → converti en
   AAAA-MM-JJ pour correspondre à la valeur d'un <input type="date">. */
function convertirDateNaissance(str) {
  if (!str) return "";
  var p = str.trim().split("/");
  if (p.length !== 3) return str;
  var j = p[0].padStart(2, "0");
  var m = p[1].padStart(2, "0");
  var a = p[2];
  return a + "-" + m + "-" + j;
}

function construireEleve(raw) {
  var matricule = (raw["Matricule"] || "").trim().toUpperCase();
  var niveau = raw["Niveau"] || "";
  var classeCode = raw["Classe"] || niveau;
  var section = raw["Section"] || "";
  var classeAffiche = classeCode + (section ? " " + section : "");

  var fraisAnnuels = parseInt(raw["Frais annuels (FC)"]) || 0;
  var paye = parseInt(raw["Montant payé (FC)"]) || 0;
  var reste =
    raw["Reste (FC)"] !== undefined
      ? parseInt(raw["Reste (FC)"]) || 0
      : Math.max(0, fraisAnnuels - paye);
  var fraisPaye = reste <= 0;

  var nom = [raw["Nom"], raw["Postnom"], raw["Prénom"]]
    .filter(function (v) { return v && v.trim(); })
    .join(" ");

  return {
    matricule: matricule,
    datenais: convertirDateNaissance(raw["Date de naissance"] || ""),
    sexe: raw["Sexe"] || "",
    niveau: niveau,
    classe: classeAffiche,
    classeCode: classeCode,
    section: section,
    nom: nom,
    telephone_parent: raw["Téléphone Parent"] || "",
    frais_annuels: fraisAnnuels,
    frais_paye: fraisPaye,
    montant_paye: paye,
    reste: reste,
    dernier_paiement: raw["Dernier paiement"] || "",
    statut: raw["Statut"] || "",
    absences: [],
  };
}

function afficherChargement(msg) {
  var btn = document.getElementById("btnLogin");
  btn.innerHTML =
    '<span class="btn-spinner"></span>' + (msg || "Chargement...");
  btn.disabled = true;
  btn.style.opacity = ".85";
}

function finChargement() {
  var btn = document.getElementById("btnLogin");
  btn.innerHTML = "SE CONNECTER";
  btn.disabled = false;
  btn.style.opacity = "1";
}

function chargerDepuisSheets(callback) {
  if (!bloque) afficherChargement("Chargement...");

  fetch(SHEET_URL)
    .then(function (r) {
      if (!r.ok) throw new Error("Erreur réseau " + r.status);
      return r.json();
    })
    .then(function (rows) {
      ELEVES = [];
      rows.forEach(function (row) {
        if (row["Matricule"] && row["Matricule"].trim()) {
          ELEVES.push(construireEleve(row));
        }
      });
      if (!bloque) finChargement();
      peuplerClasses();
      if (callback) callback(null);
    })
    .catch(function (err) {
      if (!bloque) finChargement();
      console.error("Sheets fetch error:", err);
      afficherErreur(
        "Impossible de charger les données. Vérifiez votre connexion internet et réessayez.",
      );
    });
}

function peuplerClasses() {
  var select = document.getElementById("classe");
  var classes = {};
  ELEVES.forEach(function (e) {
    classes[e.classe] = true;
  });
  var keys = Object.keys(classes).sort();
  while (select.options.length > 1) select.remove(1);
  keys.forEach(function (c) {
    var opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });
}

/* ══ ONGLETS ÉLÈVE / PARENT ══ */
function basculerOnglet(onglet) {
  if (bloque) return;

  var estEleve = onglet === "eleve";
  document.getElementById("tabEleve").classList.toggle("active", estEleve);
  document.getElementById("tabParent").classList.toggle("active", !estEleve);
  document.getElementById("formEleve").style.display = estEleve
    ? "block"
    : "none";
  document.getElementById("formParent").style.display = estEleve
    ? "none"
    : "block";

  cacherErreur();
  cacherInfo();
  cacherSucces();
  document.getElementById("verifAnim").classList.remove("show");
}

/* ══ CONNEXION en 2 étapes ══ */
function viderInputs() {
  document.getElementById("matricule").value = "";
  document.getElementById("datenais").value = "";
  document.getElementById("classe").value = "";
}

function validerFormatMatricule(mat) {
  if (!/^E\d{4}$/.test(mat)) return "format";
  var num = parseInt(mat.slice(1));
  if (num < 1 || num > 3000) return "audela";
  return "ok";
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
    document.getElementById("attemptsInfo").style.display = "block";
    document.getElementById("attemptsLeft").textContent = restantes;
  }
}

function seConnecter() {
  if (bloque) return;

  if (ELEVES.length === 0) {
    chargerDepuisSheets(function () {
      seConnecter();
    });
    return;
  }

  var mat = document.getElementById("matricule").value.trim().toUpperCase();
  var date = document.getElementById("datenais").value;
  var classe = document.getElementById("classe").value;

  if (!mat || !date || !classe) {
    afficherErreur("Veuillez remplir tous les champs avant de continuer.");
    agiter();
    return;
  }

  cacherErreur();
  afficherChargement("Vérification...");

  setTimeout(function () {
    verifierEtConnecter(mat, date, classe);
  }, 700);
}

function verifierEtConnecter(mat, date, classe) {
  var fmt = validerFormatMatricule(mat);
  if (fmt === "format") {
    finChargement();
    afficherErreur(
      "Matricule incorrect. Veuillez vérifier votre numéro matricule et réessayer.",
    );
    agiter();
    setTimeout(viderInputs, 420);
    return;
  }
  if (fmt === "audela") {
    finChargement();
    afficherErreur(
      "Ce numéro dépasse le format attendu. Veuillez vérifier votre numéro matricule et réessayer.",
    );
    agiter();
    setTimeout(viderInputs, 420);
    return;
  }

  var eleveParMat = null;
  for (var i = 0; i < ELEVES.length; i++) {
    if (ELEVES[i].matricule === mat) {
      eleveParMat = ELEVES[i];
      break;
    }
  }
  if (!eleveParMat) {
    finChargement();
    incrementerTentatives(
      "Numéro matricule incorrect. Veuillez vérifier votre numéro matricule et réessayer.",
    );
    return;
  }

  if (eleveParMat.datenais !== date || eleveParMat.classe !== classe) {
    finChargement();
    incrementerTentatives(
      "Veuillez vérifier votre date de naissance ou la classe, puis réessayer.",
    );
    return;
  }

  // ✅ SUCCÈS
  finChargement();
  tentatives = 0;
  lsDel(CLE_TENTATIVES);
  lsDel(CLE_BLOCAGE_FIN);
  cacherErreur();
  ouvrirDashboard(eleveParMat);
}

function afficherErreur(msg) {
  cacherInfo();
  var box = document.getElementById("errorBox");
  box.classList.add("show");
  document.getElementById("errorMsg").innerHTML = msg;
}

function cacherErreur() {
  document.getElementById("errorBox").classList.remove("show");
  document.getElementById("attemptsInfo").style.display = "none";
}

function afficherInfo(msg) {
  cacherErreur();
  var box = document.getElementById("infoBox");
  box.classList.add("show");
  document.getElementById("infoMsg").innerHTML = msg;
}

function cacherInfo() {
  document.getElementById("infoBox").classList.remove("show");
}

function afficherSucces(msg) {
  cacherErreur();
  cacherInfo();
  var box = document.getElementById("successBox");
  box.classList.add("show");
  document.getElementById("successMsg").innerHTML = msg;
}

function cacherSucces() {
  document.getElementById("successBox").classList.remove("show");
}

/* ══ CHAMPS DYNAMIQUES SELON LE NOMBRE D'ENFANTS ══ */
function genererChampsEnfants() {
  var n = parseInt(document.getElementById("nbEnfants").value) || 0;
  var container = document.getElementById("champsEnfants");
  container.innerHTML = "";

  for (var i = 1; i <= n; i++) {
    var div = document.createElement("div");
    div.className = "field champ-enfant";
    div.innerHTML =
      "<label>Matricule enfant " +
      i +
      "</label>" +
      '<input type="text" class="matricule-enfant" id="matriculeEnfant' +
      i +
      '" placeholder="Ex : E2026" maxlength="10" oninput="this.value=this.value.toUpperCase()" />';
    container.appendChild(div);
  }

  cacherErreur();
  cacherInfo();
  cacherSucces();
}

/* ══ CONNEXION PARENT ══
   ⚠️ La vérification finale (email ↔ matricules) est pour l'instant simulée
   côté client à partir des données déjà chargées (ELEVES). Elle sera remplacée
   par un appel à la Cloud Function loginParent, qui interrogera
   parents/{email}.matricules dans Firestore, dès le backend en place. */
function seConnecterParent() {
  if (bloque) return;

  cacherSucces();

  var email = document.getElementById("emailParent").value.trim();
  var n = parseInt(document.getElementById("nbEnfants").value) || 0;

  if (!email) {
    afficherErreur("Veuillez saisir votre adresse email.");
    agiter();
    return;
  }

  var emailValide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailValide) {
    afficherErreur("Adresse email invalide. Veuillez vérifier votre saisie.");
    agiter();
    return;
  }

  if (!n) {
    afficherErreur("Veuillez sélectionner le nombre d'enfants.");
    agiter();
    return;
  }

  var matricules = [];
  for (var i = 1; i <= n; i++) {
    var champ = document.getElementById("matriculeEnfant" + i);
    var val = champ.value.trim().toUpperCase();
    if (!val) {
      afficherErreur("Veuillez renseigner le matricule de chaque enfant.");
      agiter();
      return;
    }
    var fmt = validerFormatMatricule(val);
    if (fmt !== "ok") {
      afficherErreur(
        "Matricule enfant " +
        i +
        " incorrect. Veuillez vérifier le numéro matricule et réessayer. ",
      );
      agiter();
      return;
    }
    matricules.push(val);
  }

  lancerVerificationParent(email, matricules);
}

function lancerVerificationParent(email, matricules) {
  if (ELEVES.length === 0) {
    chargerDepuisSheets(function () {
      lancerVerificationParent(email, matricules);
    });
    return;
  }

  cacherErreur();
  cacherInfo();

  var btn = document.getElementById("btnLoginParent");
  btn.disabled = true;
  btn.style.opacity = ".5";

  var anim = document.getElementById("verifAnim");
  var list = document.getElementById("verifList");
  list.innerHTML = "";
  anim.classList.add("show");

  matricules.forEach(function (mat) {
    var item = document.createElement("div");
    item.className = "verif-item";
    item.id = "verifItem-" + mat;
    item.innerHTML =
      '<span class="verif-dot"></span>' +
      '<span class="verif-label">Matricule ' +
      mat +
      "</span>" +
      '<span class="verif-check">✓</span>';
    list.appendChild(item);
  });

  var i = 0;
  function etapeSuivante() {
    if (i >= matricules.length) {
      setTimeout(function () {
        terminerVerificationParent(email, matricules);
      }, 450);
      return;
    }
    var item = document.getElementById("verifItem-" + matricules[i]);
    item.classList.add("checked");
    i++;
    setTimeout(etapeSuivante, 550);
  }
  setTimeout(etapeSuivante, 550);
}

function terminerVerificationParent(email, matricules) {
  var tousExistent = matricules.every(function (mat) {
    return ELEVES.some(function (e) {
      return e.matricule === mat;
    });
  });

  document.getElementById("verifAnim").classList.remove("show");
  var btn = document.getElementById("btnLoginParent");
  btn.disabled = false;
  btn.style.opacity = "1";

  if (tousExistent) {
    afficherSucces(
      "<strong>Vérification réussie</strong>Adresse reconnue pour " +
      matricules.length +
      (matricules.length > 1 ? " enfants." : " enfant.") +
      " Le tableau de bord parent complet arrive très bientôt.",
    );
  } else {
    afficherErreur(
      "Un ou plusieurs matricules ne correspondent à aucun élève enregistré. Veuillez vérifier vos informations.",
    );
    agiter();
  }
}

function agiter() {
  var card = document.querySelector(".login-card");
  card.classList.remove("shake");
  void card.offsetWidth;
  card.classList.add("shake");
}

function bloquerAcces() {
  var fin = Date.now() + 30000;
  lsSet(CLE_BLOCAGE_FIN, fin);
  viderInputs();
  reprendreBlocage(fin);
}

/* ══ DASHBOARD ══ */
var currentEleve = null;

function ouvrirDashboard(eleve) {
  currentEleve = eleve;
  document.getElementById("page-login").style.display = "none";
  document.getElementById("page-dashboard").style.display = "block";
  window.scrollTo(0, 0);

  remplirProfil(eleve);
  remplirInfosFinancieres(eleve);
  remplirAbsences(eleve);
}

function remplirProfil(e) {
  document.getElementById("nomEleve").textContent = e.nom;
  document.getElementById("matriculeEleve").textContent =
    "Matricule : " + e.matricule;
  document.getElementById("classeEleve").textContent = "Classe : " + e.classe;
  document.getElementById("telParentEleve").textContent =
    "Contact parent : " + (e.telephone_parent || "—");
  document.getElementById("sectionBadge").textContent = e.classe;
  document.getElementById("avatarEleve").textContent =
    e.sexe === "M" ? "👦" : e.sexe === "F" ? "👧" : "👤";

  var statutBadge = document.getElementById("statutBadge");
  statutBadge.textContent = e.statut || "—";
  statutBadge.className =
    "badge-pill" +
    (e.statut === "Payé"
      ? " statut-paye"
      : e.statut === "Impayé"
        ? " statut-impaye"
        : " statut-partiel");
}

function remplirInfosFinancieres(e) {
  document.getElementById("fraisAnnuels").textContent =
    e.frais_annuels.toLocaleString() + " FC";
  document.getElementById("montantPaye").textContent =
    e.montant_paye.toLocaleString() + " FC";
  document.getElementById("resteAPayer").textContent =
    e.reste.toLocaleString() + " FC";
  document.getElementById("dernierVersement").textContent =
    e.dernier_paiement || "—";
}

function remplirAbsences(e) {
  var absDiv = document.getElementById("absencesList");
  absDiv.innerHTML = "";
  if (!e.absences || e.absences.length === 0) {
    absDiv.innerHTML =
      '<div class="empty-state"><span class="empty-ico">🗓️</span>Aucune absence enregistrée.</div>';
  } else {
    e.absences.forEach(function (a) {
      var div = document.createElement("div");
      div.className = "abs-item";
      div.innerHTML =
        "<span>" +
        a.date +
        " — <strong>" +
        a.matiere +
        "</strong></span>" +
        '<span class="abs-status ' +
        a.statut +
        '">' +
        (a.statut === "just" ? "✔ Justifiée" : "✖ Non justifiée") +
        "</span>";
      absDiv.appendChild(div);
    });
  }
}

function seDeconnecter() {
  document.getElementById("page-dashboard").style.display = "none";
  document.getElementById("page-login").style.display = "block";
  document.getElementById("matricule").value = "";
  document.getElementById("datenais").value = "";
  document.getElementById("classe").value = "";
  cacherErreur();
  window.scrollTo(0, 0);
}

document.addEventListener("keydown", function (e) {
  if (e.key === "Enter") seConnecter();
});
