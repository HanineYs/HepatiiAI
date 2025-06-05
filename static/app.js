const shrink_btn = document.querySelector(".shrink-btn");
const search = document.querySelector(".search");
const sidebar_links = document.querySelectorAll(".sidebar-links a");
const active_tab = document.querySelector(".active-tab");
const shortcuts = document.querySelector(".sidebar-links h4");
const tooltip_elements = document.querySelectorAll(".tooltip-element");

let activeIndex;

// ✅ Gestion du menu latéral
shrink_btn.addEventListener("click", () => {
  document.body.classList.toggle("shrink");
  setTimeout(moveActiveTab, 400);
  shrink_btn.classList.add("hovered");
  setTimeout(() => {
    shrink_btn.classList.remove("hovered");
  }, 500);
});

search.addEventListener("click", () => {
  document.body.classList.remove("shrink");
  search.lastElementChild.focus();
});

function moveActiveTab() {
  let topPosition = activeIndex * 58 + 2.5;
  if (activeIndex > 3) {
    topPosition += shortcuts.clientHeight;
  }
  active_tab.style.top = `${topPosition}px`;
}

function changeLink() {
  sidebar_links.forEach((sideLink) => sideLink.classList.remove("active"));
  this.classList.add("active");
  activeIndex = this.dataset.active;
  moveActiveTab();
}

sidebar_links.forEach((link) => link.addEventListener("click", changeLink));

function showTooltip() {
  let tooltip = this.parentNode.lastElementChild;
  let spans = tooltip.children;
  let tooltipIndex = this.dataset.tooltip;
  Array.from(spans).forEach((sp) => sp.classList.remove("show"));
  spans[tooltipIndex].classList.add("show");
  tooltip.style.top = `${(100 / (spans.length * 2)) * (tooltipIndex * 2 + 1)}%`;
}

tooltip_elements.forEach((elem) => {
  elem.addEventListener("mouseover", showTooltip);
});

// ✅ Gestion de l'affichage des sections
const contentSections = document.querySelectorAll(".content-section");

sidebar_links.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();

    console.log("Link clicked:", link.getAttribute("data-active")); // Debug

    // Masquer toutes les sections
    contentSections.forEach((section) => {
      section.style.display = "none";
    });

    // Afficher la bonne section
    const activeSection = link.getAttribute("data-active");
    let sectionToShow = "";

    if (activeSection === "1") {
      sectionToShow = "formulaire";
    } else if (activeSection === "3") {
      sectionToShow = "analytics"; // Afficher la section Analytics
    } else if (activeSection === "2") {
      sectionToShow = "tools"; // Afficher la section Outils
    } else if (activeSection === "4") {
      sectionToShow = "notifications"; // Afficher la section Notifications
    } else if (activeSection === "5") {
      sectionToShow = "help"; 
    } else if (activeSection === "6") {
      sectionToShow = "stage-prediction";// Afficher la section Aide
    } else if (activeSection === "7") {
      sectionToShow = "settings"; // Afficher la section Settings
    } else {
      sectionToShow = "dashboard";
    }
    
    console.log("Showing section:", sectionToShow); // Debug
    document.getElementById(sectionToShow).style.display = "block";
  });
});

// ✅ Initialisation de la section "Analytics" au chargement de la page
document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector("form");
  const notification = document.getElementById("notification");
  const notifText = document.getElementById("notif-text");
  const notifBtn = document.getElementById("notif-btn");

  // Afficher la section "Analytics" par défaut
  const analyticsSection = document.getElementById("analytics");
  analyticsSection.style.display = "block"; // Afficher la section Analytics par défaut

  // Initialiser le tableau des indicateurs
  const indicatorsTable = document.getElementById("indicators-table");
  indicatorsTable.innerHTML = `
    <tr>
      <th>Indicateur</th>
      <th>Valeur</th>
    </tr>
    <tr>
      <td>Bilirubine totale</td>
      <td id="bilirubin">-</td>
    </tr>
    <tr>
      <td>Phosphatase alcaline</td>
      <td id="alkaline-phosphatase">-</td>
    </tr>
    <tr>
      <td>Transaminases (ALT)</td>
      <td id="alt">-</td>
    </tr>
    <tr>
      <td>Transaminases (AST)</td>
      <td id="ast">-</td>
    </tr>
    <tr>
      <td>Albumine</td>
      <td id="albumin">-</td>
    </tr>
  `;

  // Initialiser le graphique en 3D vide
  const ctx = document.getElementById("chart").getContext("2d");
  const chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Bilirubine", "Phosphatase", "ALT", "AST", "Albumine"], // Labels des indicateurs
      datasets: [
        {
          label: "Valeurs du patient",
          data: [0, 0, 0, 0, 0], // Valeurs par défaut
          backgroundColor: "blue",
        },
      ],
    },
    options: {
      plugins: {
        "3d": {
          enabled: true, // Activer l'effet 3D
          depth: 20, // Profondeur des barres
          viewDistance: 25, // Distance de la vue
        },
      },
      scales: {
        y: {
          beginAtZero: true,
        },
      },
      responsive: true,
      maintainAspectRatio: false, // Permet de personnaliser la taille du graphique
    },
  });

  // ✅ Gestion des notifications après soumission du formulaire
  if (!form || !notification) return; // ✅ Sécurité : éviter les erreurs si les éléments ne sont pas trouvés

  form.addEventListener("submit", function (event) {
    event.preventDefault(); // 🚀 Empêche le rechargement de la page

    const formData = new FormData(form);

    fetch("/patient/predict", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Réponse du serveur :", data); // Debug
        if (data.error) {
          notifText.innerText = "❌ " + data.error;
        } else {
          notifText.innerText = data.result_message; // Affiche le message de résultat
          // Mettre à jour les indicateurs et le graphique
          document.getElementById("bilirubin").textContent =
            data.patient_data["Total Bilirubin"];
          document.getElementById("alkaline-phosphatase").textContent =
            data.patient_data["Alkaline Phosphotase"];
          document.getElementById("alt").textContent =
            data.patient_data["Alamine Aminotransferase"];
          document.getElementById("ast").textContent =
            data.patient_data["Aspartate Aminotransferase"];
          document.getElementById("albumin").textContent =
            data.patient_data["Albumine"];

          // Mettre à jour le graphique en 3D
          chart.data.datasets[0].data = [
            data.patient_data["Total Bilirubin"],
            data.patient_data["Alkaline Phosphotase"],
            data.patient_data["Alamine Aminotransferase"],
            data.patient_data["Aspartate Aminotransferase"],
            data.patient_data["Albumine"],
          ];
          chart.update();
        }
        notification.style.display = "block"; // Afficher la notification
      })
      .catch((error) => {
        notifText.innerText = "❌ Une erreur est survenue !";
        notification.style.display = "block";
        console.error("Erreur :", error);
      });
  });

  // ✅ Fermer la notification sans rediriger
  notifBtn.addEventListener("click", function () {
    notification.style.display = "none"; // Masquer la notification
  });
});

// 🔹 Fonction pour exporter les résultats
function exportData() {
  // Récupérer les données du tableau
  const table = document.getElementById("indicators-table");
  const rows = table.querySelectorAll("tr");
  let csvContent = "data:text/csv;charset=utf-8,";

  // Parcourir les lignes du tableau
  rows.forEach((row) => {
    const cells = row.querySelectorAll("td, th");
    const rowData = Array.from(cells)
      .map((cell) => cell.textContent)
      .join(",");
    csvContent += rowData + "\n";
  });

  // Créer un lien de téléchargement
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "resultats.csv");
  document.body.appendChild(link);
  link.click(); // Déclencher le téléchargement
  document.body.removeChild(link); // Supprimer le lien après le téléchargement
}

// 🔹 Mode sombre
function toggleDarkMode() {
  const body = document.body;
  body.classList.toggle("dark-mode");

  // Sauvegarder le mode dans le localStorage
  if (body.classList.contains("dark-mode")) {
    localStorage.setItem("theme", "dark");
  } else {
    localStorage.setItem("theme", "light");
  }
}

// Appliquer le mode sombre au chargement de la page
document.addEventListener("DOMContentLoaded", function () {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
  }
});

// 🔹 Calculateur d'IMC
function calculateBMI(event) {
  event.preventDefault();
  const weight = parseFloat(document.getElementById("bmi-weight").value);
  const height = parseFloat(document.getElementById("bmi-height").value);

  if (weight && height) {
    const bmi = (weight / (height * height)).toFixed(2);
    document.getElementById("bmi-result").textContent = `Votre IMC est : ${bmi}`;
  } else {
    alert("Veuillez entrer des valeurs valides.");
  }
}

// 🔹 Calculateur de dose de médicament
function calculateDosage(event) {
  event.preventDefault();
  const weight = parseFloat(document.getElementById("dosage-weight").value);
  const dosagePerKg = parseFloat(document.getElementById("dosage-per-kg").value);

  if (weight && dosagePerKg) {
    const totalDosage = (weight * dosagePerKg).toFixed(2);
    document.getElementById("dosage-result").textContent = `La dose recommandée est : ${totalDosage} mg`;
  } else {
    alert("Veuillez entrer des valeurs valides.");
  }
}

// 🔹 Sauvegarder les données de santé
function saveHealthData(event) {
  event.preventDefault();
  const weight = document.getElementById("weight").value;
  const bloodPressure = document.getElementById("blood-pressure").value;
  if (weight && bloodPressure) {
    localStorage.setItem("healthData", JSON.stringify({ weight, bloodPressure }));
    alert("Données enregistrées avec succès !");
  } else {
    alert("Veuillez remplir tous les champs.");
  }
}

// 🔹 Afficher l'historique des diagnostics
function loadDiagnosisHistory() {
  const history = JSON.parse(localStorage.getItem("diagnosisHistory")) || [];
  const table = document.getElementById("diagnosis-history");
  table.innerHTML = `
    <tr>
      <th>Date</th>
      <th>Résultat</th>
    </tr>
  `;
  history.forEach((entry) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${entry.date}</td>
      <td>${entry.result}</td>
    `;
    table.appendChild(row);
  });
}

// Charger l'historique au démarrage
document.addEventListener("DOMContentLoaded", loadDiagnosisHistory);

// 🔹 Définir un rappel
function setReminder(type) {
  const time = prompt(`Entrez l'heure pour le rappel (format HH:MM) :`);
  if (time) {
    alert(`Rappel pour ${type} défini à ${time}.`);
  }
}

// 🔹 Gérer les alertes d'urgence
function checkForEmergency() {
  const emergency = localStorage.getItem("emergency");
  if (emergency) {
    document.getElementById("emergency-alert").textContent = emergency;
  }
}

// Charger les alertes au démarrage
document.addEventListener("DOMContentLoaded", checkForEmergency);

// 🔹 Envoyer un commentaire
function sendComment() {
  const comment = document.getElementById("comment-message").value;
  const confirmation = document.getElementById("comment-confirmation");

  if (comment) {
    // Simuler l'envoi du commentaire (à remplacer par une requête API si nécessaire)
    console.log("Commentaire envoyé :", comment);
    confirmation.style.display = "block";
    setTimeout(() => {
      confirmation.style.display = "none";
    }, 3000); // Masquer la confirmation après 3 secondes
  } else {
    alert("Veuillez entrer un commentaire avant d'envoyer.");
  }
}

// 🔹 Fonction pour basculer l'affichage des cadres
function toggleTool(toolId) {
  const content = document.getElementById(`${toolId}-content`);
  const arrow = document.getElementById(`${toolId}-arrow`);

  if (content.style.display === "none" || content.style.display === "") {
    content.style.display = "block";
    arrow.classList.remove("bx-chevron-down");
    arrow.classList.add("bx-chevron-up");
  } else {
    content.style.display = "none";
    arrow.classList.remove("bx-chevron-up");
    arrow.classList.add("bx-chevron-down");
  }
}

// 🔹 Gérer les alertes critiques
function showCriticalAlert(message) {
  const criticalAlert = document.getElementById("critical-result");
  const criticalMessage = document.getElementById("critical-message");

  if (message) {
    criticalMessage.textContent = message;
    criticalAlert.style.display = "block";
    saveAlert(message); // Sauvegarder l'alerte dans l'historique
  }
}

// 🔹 Sauvegarder une alerte dans l'historique
function saveAlert(alertMessage) {
  let alertHistory = JSON.parse(localStorage.getItem("alertHistory")) || [];
  alertHistory.push({ message: alertMessage, date: new Date().toLocaleString() });
  localStorage.setItem("alertHistory", JSON.stringify(alertHistory));
  updateAlertHistory(alertHistory);
}

// 🔹 Mettre à jour l'historique des alertes
function updateAlertHistory(alertHistory) {
  const historyList = document.getElementById("alert-history");
  historyList.innerHTML = "";

  if (alertHistory.length === 0) {
    historyList.innerHTML = "<li>Aucune alerte enregistrée.</li>";
  } else {
    alertHistory.forEach((alert) => {
      const listItem = document.createElement("li");
      listItem.textContent = `${alert.date} - ${alert.message}`;
      historyList.appendChild(listItem);
    });
  }
}


function showRecommendations(recommendations) {
  const recommendationsList = document.getElementById("recommendations-list");
  recommendationsList.innerHTML = "";
  
  recommendations.forEach((recommendation) => {
    const li = document.createElement("li");
    li.textContent = recommendation;
    recommendationsList.appendChild(li);
  });
  
  document.getElementById("recommendations").style.display = "block";
}


//commentaire 
async function sendComment() {
  const message = document.getElementById('comment-message').value.trim();
  const confirmation = document.getElementById('comment-confirmation');
  
  if (!message) {
      alert("Veuillez entrer un commentaire avant d'envoyer.");
      return;
  }
  
  try {
      const response = await fetch('/save_comment', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({
              message: message
          })
      });
      
      const data = await response.json();
      
      if (data.success) {
          confirmation.textContent = "Commentaire envoyé avec succès !";
          confirmation.style.display = "block";
          document.getElementById('comment-message').value = '';
          
          setTimeout(() => {
              confirmation.style.display = "none";
          }, 3000);
      } else {
          throw new Error(data.error || "Erreur lors de l'envoi");
      }
  } catch (error) {
      alert("Erreur: " + error.message);
  }
}

async function sendComment() {
  const message = document.getElementById('comment-message').value.trim();
  const confirmation = document.getElementById('comment-confirmation');
  
  if (!message) {
      alert("Veuillez écrire un commentaire avant d'envoyer.");
      return;
  }
  
  try {
      const response = await fetch('/save_comment', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({
              message: message
          })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
          throw new Error(data.error || "Erreur serveur");
      }
      
      confirmation.textContent = "Commentaire envoyé avec succès!";
      confirmation.style.display = "block";
      document.getElementById('comment-message').value = '';
      
      setTimeout(() => {
          confirmation.style.display = "none";
      }, 3000);
  } catch (error) {
      alert("Erreur: " + error.message);
  }
}

// Mise à jour du compte
async function updateAccount() {
  const messageEl = document.getElementById('account-message');
  messageEl.style.display = 'none';

  const data = {
    firstname: document.getElementById('firstname').value,
    lastname: document.getElementById('lastname').value,
    email: document.getElementById('email').value
  };

  try {
    const response = await fetch('/update_account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Échec de la mise à jour');
    }

    // Afficher le message de succès
    showMessage(messageEl, 'Modifications enregistrées avec succès!', 'success');
    
    // Mettre à jour le nom dans la sidebar immédiatement
    document.getElementById('patient-name').textContent = `${data.firstname} ${data.lastname}`;
    
    // Rafraîchir les données après 2 secondes
    setTimeout(() => {
      window.location.reload();
    }, 2000);

  } catch (error) {
    showMessage(messageEl, error.message, 'error');
    console.error("Erreur:", error);
  }
}

function showMessage(element, text, type) {
  element.textContent = text;
  element.className = `message ${type}`;
  element.style.display = 'block';
}

function validatePassword(password) {
  const errors = [];
  if (password.length < 8) errors.push("au moins 8 caractères");
  if (!/[A-Z]/.test(password)) errors.push("une majuscule");
  if (!/[0-9]/.test(password)) errors.push("un chiffre");
  if (!/[!@#$%^&*]/.test(password)) errors.push("un caractère spécial");
  return errors;
}

async function updatePassword() {
  const messageEl = document.getElementById('password-message');
  messageEl.style.display = 'none';

  const oldPassword = document.getElementById('old-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  // Validation côté client
  if (newPassword !== confirmPassword) {
    showMessage(messageEl, "Les mots de passe ne correspondent pas", "error");
    return;
  }

  const passwordErrors = validatePassword(newPassword);
  if (passwordErrors.length > 0) {
    showMessage(messageEl, 
      `Le mot de passe doit contenir ${passwordErrors.join(', ')}`, 
      "error");
    return;
  }

  try {
    const response = await fetch('/update_password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        oldPassword: oldPassword,
        newPassword: newPassword
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Échec de la mise à jour du mot de passe");
    }

    showMessage(messageEl, "Mot de passe mis à jour avec succès!", "success");
    document.getElementById('password-form').reset();

  } catch (error) {
    showMessage(messageEl, error.message, "error");
    console.error("Erreur:", error);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  // Initialiser avec des données vides
  updateMainChart({
      "Total Bilirubin": 0,
      "Alkaline Phosphotase": 0,
      "Alamine Aminotransferase": 0,
      "Aspartate Aminotransferase": 0,
      "Albumin": 0
  });
});

// nouvelle 

document.addEventListener("DOMContentLoaded", function() {
  const form = document.querySelector("form");
  const notification = document.getElementById("notification");
  const notifIcon = document.getElementById("notif-icon");
  const notifTitle = document.getElementById("notif-title");
  const notifText = document.getElementById("notif-text");
  const notifBtn = document.getElementById("notif-btn");
  const exportBtn = document.getElementById("export-pdf");

  if (form) {
    form.addEventListener("submit", async function(event) {
      event.preventDefault();
      
      try {
        const formData = new FormData(form);
        const response = await fetch("/patient/predict", {
          method: "POST",
          body: formData
        });
        
        const data = await response.json();
        console.log("Données reçues:", data);
        
        if (!response.ok || data.error) {
          throw new Error(data?.error || "Erreur du serveur");
        }

        // Style selon le résultat
        if (data.prediction === 0) {
          // Cas négatif (sain)
          notification.style.backgroundColor = "#e8f5e9";
          notification.style.border = "3px solid #4caf50";
          notifIcon.textContent = "✅";
          notifIcon.style.color = "#4caf50";
          notifTitle.textContent = "Bonne nouvelle !";
          notifTitle.style.color = "#2e7d32";
          notifText.innerHTML = "Aucun signe de maladie hépatique détecté.";
          notifBtn.style.background = "linear-gradient(135deg, #4caf50, #2e7d32)";
        } else {
          // Cas positif (risque)
          notification.style.backgroundColor = "#ffebee";
          notification.style.border = "3px solid #f44336";
          notifIcon.textContent = "⚠️";
          notifIcon.style.color = "#f44336";
          notifTitle.textContent = "Attention !";
          notifTitle.style.color = "#c62828";
          notifText.innerHTML = "Présence de signes d'une maladie hépatique détectée.";
          notifBtn.style.background = "linear-gradient(135deg, #f44336, #c62828)";
        }

        notification.style.display = "block";

        // Mettre à jour le tableau d'analyse
        if (data.patient_data) {
          updateAnalysisTable(data.patient_data);
          if (exportBtn) exportBtn.disabled = false;
        }
        
      } catch (error) {
        console.error("Erreur:", error);
        // Style d'erreur
        notification.style.backgroundColor = "#fff3e0";
        notification.style.border = "3px solid #ffa000";
        notifIcon.textContent = "❌";
        notifIcon.style.color = "#ffa000";
        notifTitle.textContent = "Erreur";
        notifTitle.style.color = "#ff6f00";
        notifText.textContent = error.message;
        notifBtn.style.background = "linear-gradient(135deg, #ffa000, #ff6f00)";
        notification.style.display = "block";
      }
    });
  }

  // Fermer la notification
  if (notifBtn) {
    notifBtn.addEventListener("click", function() {
      notification.style.display = "none";
    });
  }
//  voila la modification c'est que je veux  
  // Fonction pour mettre à jour le tableau d'analyse (inchangée)
  let currentPatientData = null; // Stocker les données du patient globalement

function updateAnalysisTable(patientData) {
  currentPatientData = patientData; // Stocker pour le PDF
  const analysisResults = document.getElementById("analysis-results");
  if (!analysisResults) return;

  // Plages normales pour chaque indicateur
  const ranges = {
    "Total_Bilirubin": { min: 0.3, max: 1.2, unit: "mg/dL" },
    "Alkaline_Phosphotase": { min: 44, max: 147, unit: "U/L" },
    "Alamine_Aminotransferase": { min: 7, max: 56, unit: "U/L" },
    "Aspartate_Aminotransferase": { min: 10, max: 40, unit: "U/L" },
    "Albumin": { min: 3.5, max: 5.5, unit: "g/dL" }
  };

  analysisResults.innerHTML = "";

  for (const [key, config] of Object.entries(ranges)) {
    const value = patientData[key];
    if (value !== undefined) {
      const isNormal = value >= config.min && value <= config.max;
      const displayName = key.replace(/_/g, " ");

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${displayName}</td>
        <td>${value} ${config.unit}</td>
        <td>${config.min}-${config.max} ${config.unit}</td>
        <td style="color: ${isNormal ? '#4CAF50' : '#F44336'}; font-weight: bold">
          ${isNormal ? 'Normal' : 'Anormal'}
        </td>
      `;
      analysisResults.appendChild(row);
    }
  }
}
  
  // Appeler cette fonction au chargement avec des données nulles
  document.addEventListener("DOMContentLoaded", function() {
    updateAnalysisTable(null);
  });
  

  // Génération du PDF via HTML
  if (exportBtn) {
    exportBtn.addEventListener("click", generatePDF);
  }

  // Stocker les données globalement

let currentDiagnosisResult = null;

// Fonction pour générer le PDF
async function generatePDF() {
  try {
    // Vérifier qu'on a des données
    if (!currentPatientData || !currentDiagnosisResult) {
      alert("Veuillez d'abord soumettre le formulaire pour générer un rapport");
      return;
    }

    const exportBtn = document.getElementById("export-pdf");
    if (exportBtn) {
      exportBtn.disabled = true;
      exportBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Génération en cours...';
    }

    // Plages normales pour chaque indicateur
    const ranges = {
      "Total_Bilirubin": { min: 0.3, max: 1.2, unit: "mg/dL", display: "Bilirubine totale" },
      "Alkaline_Phosphotase": { min: 44, max: 147, unit: "U/L", display: "Phosphatase alcaline" },
      "Alamine_Aminotransferase": { min: 7, max: 56, unit: "U/L", display: "Transaminases (ALT)" },
      "Aspartate_Aminotransferase": { min: 10, max: 40, unit: "U/L", display: "Transaminases (AST)" },
      "Albumin": { min: 3.5, max: 5.5, unit: "g/dL", display: "Albumine" }
    };

    // Construire le tableau HTML
    let tableHTML = `
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr>
            <th style="background-color: #2c3e50; color: white; padding: 10px; text-align: left;">Indicateur</th>
            <th style="background-color: #2c3e50; color: white; padding: 10px; text-align: left;">Valeur</th>
            <th style="background-color: #2c3e50; color: white; padding: 10px; text-align: left;">Plage normale</th>
            <th style="background-color: #2c3e50; color: white; padding: 10px; text-align: left;">Statut</th>
          </tr>
        </thead>
        <tbody>
    `;

    // Remplir le tableau avec les données
    for (const [key, config] of Object.entries(ranges)) {
      const value = currentPatientData[key];
      if (value !== undefined) {
        const isNormal = value >= config.min && value <= config.max;
        
        tableHTML += `
          <tr>
            <td style="padding: 8px 10px; border-bottom: 1px solid #ddd;">${config.display}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #ddd;">${value} ${config.unit}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #ddd;">${config.min}-${config.max} ${config.unit}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #ddd; color: ${isNormal ? '#4CAF50' : '#F44336'}; font-weight: bold;">
              ${isNormal ? 'Normal' : 'Anormal'}
            </td>
          </tr>
        `;
      }
    }

    tableHTML += `</tbody></table>`;

    // Créer le contenu complet du rapport
    const reportContent = `
      <div id="pdf-report" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <header style="background-color: #2c3e50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">HepatoAI - Rapport Médical</h1>
        </header>
        
        <div style="padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <div>
              <p style="margin: 5px 0;"><strong>Patient :</strong> ${document.getElementById("patient-name").textContent || 'Non spécifié'}</p>
              <p style="margin: 5px 0;"><strong>Date :</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 5px 0;"><strong>Référence :</strong> RAPP-${Date.now()}</p>
            </div>
          </div>
          
          <div style="background-color: ${currentDiagnosisResult.isHealthy ? '#e8f5e9' : '#ffebee'}; 
                      border-left: 4px solid ${currentDiagnosisResult.isHealthy ? '#4CAF50' : '#F44336'};
                      padding: 15px; margin-bottom: 25px; border-radius: 4px;">
            <h3 style="margin-top: 0; color: ${currentDiagnosisResult.isHealthy ? '#2e7d32' : '#c62828'};">
              ${currentDiagnosisResult.isHealthy ? '✅ Résultat Normal' : '⚠️ Résultat Anormal'}
            </h3>
            <p style="margin-bottom: 0; font-size: 16px; line-height: 1.5;">
              <strong>${currentDiagnosisResult.title}</strong><br>
              ${currentDiagnosisResult.message}
              ${currentDiagnosisResult.confidence ? `<br><small>Niveau de confiance: ${currentDiagnosisResult.confidence}%</small>` : ''}
            </p>
          </div>
          
          <h3 style="border-bottom: 2px solid #2c3e50; padding-bottom: 5px; margin-top: 0;">Analyse des Indicateurs</h3>
          ${tableHTML}
          
          <div style="margin-top: 30px; padding: 15px; background-color: #f5f5f5; border-radius: 4px;">
            <h4 style="margin-top: 0;">Recommandations :</h4>
            <p>${currentDiagnosisResult.isHealthy ? 
              'Continuez à maintenir de bonnes habitudes de santé. Consultez régulièrement votre médecin pour des bilans de routine.' : 
              'Nous recommandons une consultation médicale dans les plus brefs délais pour un examen plus approfondi.'}
            </p>
          </div>
          
          <footer style="margin-top: 40px; text-align: center; color: #7f8c8d; font-size: 12px; border-top: 1px solid #eee; padding-top: 15px;">
            <p>Rapport généré automatiquement par HepatoAI - ${new Date().toLocaleString()}</p>
          </footer>
        </div>
      </div>
    `;

    // Créer une nouvelle fenêtre pour l'impression
    const printWindow = window.open('', '_blank');
    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Rapport Médical HepatoAI</title>
          <style>
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th { background-color: #2c3e50; color: white; padding: 10px; text-align: left; }
            td { padding: 8px 10px; border-bottom: 1px solid #ddd; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            @media print {
              body { padding: 10mm; font-size: 12pt; }
              #pdf-report { box-shadow: none; border: none; }
              @page { size: A4; margin: 10mm; }
            }
          </style>
        </head>
        <body onload="window.print();">
          ${reportContent}
        </body>
      </html>
    `);
    printWindow.document.close();

    if (exportBtn) {
      exportBtn.disabled = false;
      exportBtn.innerHTML = '<i class="bx bx-download"></i> Exporter le Rapport PDF';
    }

  } catch (error) {
    console.error("Erreur lors de la génération du PDF:", error);
    alert("Une erreur est survenue lors de la génération du PDF");
    const exportBtn = document.getElementById("export-pdf");
    if (exportBtn) {
      exportBtn.disabled = false;
      exportBtn.innerHTML = '<i class="bx bx-download"></i> Exporter le Rapport PDF';
    }
  }
}

// Initialiser l'export PDF
document.addEventListener("DOMContentLoaded", function() {
  const exportBtn = document.getElementById("export-pdf");
  if (exportBtn) {
    exportBtn.addEventListener("click", generatePDF);
  }
});

// Exemple de mise à jour après soumission du formulaire
form.addEventListener("submit", async function(event) {
  event.preventDefault();
  
  try {
    const formData = new FormData(form);
    const response = await fetch("/patient/predict", {
      method: "POST",
      body: formData
    });
    
    const data = await response.json();
    
    if (!response.ok || data.error) {
      throw new Error(data?.error || "Erreur du serveur");
    }

    // Stocker les données pour le PDF
    currentPatientData = data.patient_data;
    currentDiagnosisResult = {
      isHealthy: data.prediction === 0,
      title: data.prediction === 0 ? "Bonne nouvelle !" : "Attention !",
      message: data.result_message,
      confidence: data.confidence_score ? data.confidence_score.toFixed(2) : null
    };

    // Mettre à jour l'interface
    updateAnalysisTable(data.patient_data);
    if (exportBtn) exportBtn.disabled = false;
    
  } catch (error) {
    console.error("Erreur:", error);
    // Gérer l'erreur...
  }
});

// Fonction pour mettre à jour le tableau d'analyse
function updateAnalysisTable(patientData) {
  const analysisResults = document.getElementById("analysis-results");
  if (!analysisResults) return;

  // Plages normales pour chaque indicateur
  const ranges = {
    "Total_Bilirubin": { min: 0.3, max: 1.2, unit: "mg/dL", display: "Bilirubine totale" },
    "Alkaline_Phosphotase": { min: 44, max: 147, unit: "U/L", display: "Phosphatase alcaline" },
    "Alamine_Aminotransferase": { min: 7, max: 56, unit: "U/L", display: "Transaminases (ALT)" },
    "Aspartate_Aminotransferase": { min: 10, max: 40, unit: "U/L", display: "Transaminases (AST)" },
    "Albumin": { min: 3.5, max: 5.5, unit: "g/dL", display: "Albumine" }
  };

  analysisResults.innerHTML = "";

  for (const [key, config] of Object.entries(ranges)) {
    const value = patientData[key];
    if (value !== undefined) {
      const isNormal = value >= config.min && value <= config.max;

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${config.display}</td>
        <td>${value} ${config.unit}</td>
        <td>${config.min}-${config.max} ${config.unit}</td>
        <td style="color: ${isNormal ? '#4CAF50' : '#F44336'}; font-weight: bold">
          ${isNormal ? 'Normal' : 'Anormal'}
        </td>
      `;
      analysisResults.appendChild(row);
    }
  }
}
});
form.addEventListener("submit", async function(event) {
  event.preventDefault();
  
  try {
    const formData = new FormData(form);
    const response = await fetch("/patient/predict", {
      method: "POST",
      body: formData
    });
    
    const data = await response.json();
    
    if (!response.ok || data.error) {
      throw new Error(data?.error || "Erreur du serveur");
    }

    // Mettre à jour l'interface et stocker les données
    updateAnalysisTable(data.patient_data);
    if (exportBtn) exportBtn.disabled = false;
    
  } catch (error) {
    console.error("Erreur:", error);
    // Gérer l'erreur...
  }
});

form.addEventListener("submit", async function(event) {
  event.preventDefault();
  
  try {
      const formData = new FormData(form);
      const response = await fetch("/patient/predict", {
          method: "POST",
          body: formData
      });
      
      const data = await response.json();
      console.log("Données complètes reçues:", data); // Debug complet
      
      if (!response.ok || data.error) {
          throw new Error(data?.error || "Erreur du serveur");
      }

      // Debug: Vérifiez spécifiquement patient_data
      console.log("Données patient reçues:", data.patient_data);
      
      // Afficher la notification
      notifText.innerHTML = `<strong>${data.result_message}</strong><br>
                           <small>Confiance: ${data.confidence_score.toFixed(2)}%</small>`;
      notification.style.display = "block";

      // Mettre à jour le tableau d'analyse SI les données existent
      if (data.patient_data) {
          console.log("Mise à jour de la table avec:", data.patient_data); // Debug
          updateAnalysisTable(data.patient_data);
          if (exportBtn) exportBtn.disabled = false;
      } else {
          console.error("Aucune donnée patient reçue!");
      }
      
  } catch (error) {
      console.error("Erreur:", error);
      notifText.textContent = `❌ ${error.message}`;
      notification.style.display = "block";
  }
});


//comments
async function sendComment() {
  const message = document.getElementById('comment-message').value.trim();
  const statusEl = document.getElementById('comment-status');
  
  if (!message) {
    statusEl.textContent = "Veuillez écrire un message";
    statusEl.style.color = "red";
    statusEl.style.display = "block";
    return;
  }

  try {
    statusEl.textContent = "Envoi en cours...";
    statusEl.style.color = "blue";
    statusEl.style.display = "block";

    const response = await fetch('/save_comment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: message })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Erreur lors de l'envoi");
    }

    statusEl.textContent = "✅ Message envoyé avec succès!";
    statusEl.style.color = "green";
    document.getElementById('comment-message').value = '';
    
    setTimeout(() => {
      statusEl.style.display = "none";
    }, 3000);

  } catch (error) {
    console.error("Erreur:", error);
    statusEl.textContent = `❌ ${error.message}`;
    statusEl.style.color = "red";
  }
}

// Dans votre fichier app.js
function adjustMobileLayout() {
  if (window.innerWidth <= 768) {
    const navHeight = document.querySelector('nav').offsetHeight;
    const copyright = document.querySelector('.copyright');
    
    if (copyright) {
      copyright.style.bottom = `${navHeight}px`;
    }
    
    document.querySelector('main').style.paddingBottom = `${navHeight + 40}px`;
  }
}

window.addEventListener('resize', adjustMobileLayout);
document.addEventListener('DOMContentLoaded', adjustMobileLayout);

async function sendComment() {
    const message = document.getElementById('comment-message').value.trim();
    const statusEl = document.getElementById('comment-status');
    
    if (!message) {
        statusEl.textContent = "Veuillez écrire un message";
        statusEl.style.color = "red";
        statusEl.style.display = "block";
        return;
    }

    try {
        statusEl.textContent = "Envoi en cours...";
        statusEl.style.color = "blue";
        statusEl.style.display = "block";

        const response = await fetch('/save_comment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: message })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Erreur serveur");
        }

        const data = await response.json();
        
        statusEl.textContent = "✅ " + data.message;
        statusEl.style.color = "green";
        document.getElementById('comment-message').value = '';
        
        setTimeout(() => {
            statusEl.style.display = "none";
        }, 3000);

    } catch (error) {
        console.error("Erreur:", error);
        statusEl.textContent = "❌ " + error.message;
        statusEl.style.color = "red";
    }
}