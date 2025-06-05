// Gestion des paramètres
function toggleSetting(settingId) {
    const content = document.getElementById(`${settingId}-content`);
    const arrow = document.getElementById(`${settingId}-arrow`);
    
    if (content.style.display === 'none') {
      content.style.display = 'block';
      arrow.classList.remove('bx-chevron-down');
      arrow.classList.add('bx-chevron-up');
    } else {
      content.style.display = 'none';
      arrow.classList.remove('bx-chevron-up');
      arrow.classList.add('bx-chevron-down');
    }
  }
  
  // Envoi des modifications du compte
  document.getElementById('account-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const firstname = document.getElementById('firstname').value.trim();
    const lastname = document.getElementById('lastname').value.trim();
    const email = document.getElementById('email').value.trim();

    // Validation simple
    if (!firstname || !lastname || !email) {
        alert('Tous les champs sont obligatoires');
        return;
    }

    // Validation email basique
    if (!email.includes('@') || !email.includes('.')) {
        alert('Veuillez entrer un email valide');
        return;
    }

    const data = {
        firstname: firstname,
        lastname: lastname,
        email: email
    };

    try {
        const response = await fetch('/update_account', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        if (result.success) {
            alert('Compte mis à jour avec succès');
            // Mise à jour immédiate de l'affichage
            document.getElementById('patient-name').textContent = `${data.firstname} ${data.lastname}`;
            // Forcer le rechargement pour s'assurer que tout est synchronisé
            location.reload();
        } else {
            alert(result.error || 'Erreur lors de la mise à jour');
        }
    } catch (error) {
        alert('Erreur réseau: ' + error.message);
    }
});
  // Envoi du nouveau mot de passe
  document.getElementById('password-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const oldPassword = document.getElementById('old-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (newPassword !== confirmPassword) {
      alert('Les mots de passe ne correspondent pas');
      return;
    }
  
    try {
      const response = await fetch('/update_password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      
      const result = await response.json();
      if (result.success) {
        alert('Mot de passe mis à jour avec succès');
        document.getElementById('password-form').reset();
      } else {
        alert(result.error || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      alert('Erreur réseau');
    }
  });

// Gestion de l'affichage des sections
sidebar_links.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const activeSection = link.getAttribute("data-active");
      
      // Masquer toutes les sections
      contentSections.forEach((section) => {
        section.style.display = "none";
      });
  
      // Afficher la section correspondante
      let sectionToShow = "";
      switch(activeSection) {
        case "1": sectionToShow = "formulaire"; break;
case "2": sectionToShow = "tools"; break;
case "3": sectionToShow = "analytics"; break;
case "4": sectionToShow = "notifications"; break;
case "5": sectionToShow = "help"; break;
case "6": sectionToShow = "settings"; break;
case "7": sectionToShow = "stage-prediction"; break;  // Nouvelle section
default: sectionToShow = "dashboard";
      }
  
      document.getElementById(sectionToShow).style.display = "block";
    });
  });  

  document.getElementById('account-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
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
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        if (result.success) {
            alert('Compte mis à jour avec succès');
            // Mettre à jour l'affichage du nom
            document.getElementById('patient-name').textContent = `${data.firstname} ${data.lastname}`;
        } else {
            alert(result.error || 'Erreur lors de la mise à jour');
        }
    } catch (error) {
        alert('Erreur réseau');
    }
});

// Gestion des paramètres
function toggleSetting(settingId) {
    const content = document.getElementById(`${settingId}-content`);
    const arrow = document.getElementById(`${settingId}-arrow`);
    const header = content.parentNode.querySelector('.setting-header');
    
    // Basculer l'affichage
    content.classList.toggle('active');
    header.classList.toggle('active');
    
    // Basculer l'icône
    arrow.classList.toggle('bx-chevron-down');
    arrow.classList.toggle('bx-chevron-up');
}

// Gestion de la soumission des préférences
document.querySelectorAll('.setting-content button').forEach(button => {
    button.addEventListener('click', function(e) {
        e.preventDefault();
        alert('Préférences enregistrées avec succès');
    });
});

// Gestion de la suppression de compte
document.querySelector('#delete-account-content button')?.addEventListener('click', function(e) {
    e.preventDefault();
    const password = document.querySelector('#delete-account-content input[type="password"]').value;
    if (!password) {
        alert('Veuillez entrer votre mot de passe');
        return;
    }
    if (confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.')) {
        alert('Demande de suppression envoyée');
    }
});

// Gestion du mode sombre
document.getElementById('dark-mode-toggle')?.addEventListener('change', function() {
    document.body.classList.toggle('dark-mode', this.checked);
    localStorage.setItem('darkMode', this.checked);
});

// Gestion de la taille du texte
document.getElementById('text-size')?.addEventListener('change', function() {
    document.body.className = '';
    document.body.classList.add(this.value + '-text');
    localStorage.setItem('textSize', this.value);
});

// Gestion de la couleur de thème
document.getElementById('theme-color')?.addEventListener('change', function() {
    document.documentElement.style.setProperty('--main-color', this.value);
    localStorage.setItem('themeColor', this.value);
});

// Charger les préférences au démarrage
document.addEventListener('DOMContentLoaded', function() {
    // Mode sombre
    const darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) {
        document.getElementById('dark-mode-toggle').checked = true;
        document.body.classList.add('dark-mode');
    }
    
    // Taille du texte
    const textSize = localStorage.getItem('textSize') || 'medium';
    document.getElementById('text-size').value = textSize;
    document.body.classList.add(textSize + '-text');
    
    // Couleur de thème
    const themeColor = localStorage.getItem('themeColor') || '#3d5af1';
    document.getElementById('theme-color').value = themeColor;
    document.documentElement.style.setProperty('--main-color', themeColor);
});

// Gestion des paramètres
function toggleSetting(settingId) {
    const content = document.getElementById(`${settingId}-content`);
    const arrow = document.getElementById(`${settingId}-arrow`);
    
    content.classList.toggle('active');
    arrow.classList.toggle('bx-chevron-down');
    arrow.classList.toggle('bx-chevron-up');
  }
  
  // Sauvegarde des préférences
  function savePreferences() {
    // Mode sombre
    const darkMode = document.getElementById('dark-mode-toggle').checked;
    localStorage.setItem('darkMode', darkMode);
    document.body.classList.toggle('dark-mode', darkMode);
  
    // Taille du texte
    const textSize = document.getElementById('text-size').value;
    localStorage.setItem('textSize', textSize);
    document.body.className = textSize + '-text';
  
    // Couleur de thème
    const themeColor = document.getElementById('theme-color').value;
    localStorage.setItem('themeColor', themeColor);
    document.documentElement.style.setProperty('--main-color', themeColor);
  
    // Notifications
    const notificationPrefs = {
      medicalReminder: document.getElementById('medical-reminder').checked,
      criticalNotifications: document.getElementById('critical-notifications').checked,
      emailResults: document.getElementById('email-results').checked,
      frequency: document.getElementById('notification-frequency').value
    };
    localStorage.setItem('notificationPrefs', JSON.stringify(notificationPrefs));
  
    // Langue
    const languagePrefs = {
      language: document.getElementById('app-language').value,
      unitFormat: document.getElementById('unit-format').value
    };
    localStorage.setItem('languagePrefs', JSON.stringify(languagePrefs));
  
    alert('Préférences enregistrées avec succès');
  }
  
  // Chargement des préférences
  function loadPreferences() {
    // Mode sombre
    const darkMode = localStorage.getItem('darkMode') === 'true';
    if (darkMode) {
      document.getElementById('dark-mode-toggle').checked = true;
      document.body.classList.add('dark-mode');
    }
  
    // Taille du texte
    const textSize = localStorage.getItem('textSize') || 'medium';
    document.getElementById('text-size').value = textSize;
    document.body.classList.add(textSize + '-text');
  
    // Couleur de thème
    const themeColor = localStorage.getItem('themeColor') || '#3d5af1';
    document.getElementById('theme-color').value = themeColor;
    document.documentElement.style.setProperty('--main-color', themeColor);
  
    // Notifications
    const notificationPrefs = JSON.parse(localStorage.getItem('notificationPrefs') || '{}');
    if (notificationPrefs) {
      document.getElementById('medical-reminder').checked = notificationPrefs.medicalReminder || false;
      document.getElementById('critical-notifications').checked = notificationPrefs.criticalNotifications || false;
      document.getElementById('email-results').checked = notificationPrefs.emailResults || false;
      document.getElementById('notification-frequency').value = notificationPrefs.frequency || 'daily';
    }
  
    // Langue
    const languagePrefs = JSON.parse(localStorage.getItem('languagePrefs') || '{}');
    if (languagePrefs) {
      document.getElementById('app-language').value = languagePrefs.language || 'fr';
      document.getElementById('unit-format').value = languagePrefs.unitFormat || 'mg';
    }
  }
  
  // Suppression de compte
  function deleteAccount() {
    const password = document.getElementById('confirm-password-delete').value;
    if (!password) {
      alert('Veuillez entrer votre mot de passe');
      return;
    }
    
    if (confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.')) {
      // Ici vous ajouteriez la logique de suppression réelle
      alert('Demande de suppression envoyée');
      document.getElementById('confirm-password-delete').value = '';
    }
  }
  
  // Événements
  document.addEventListener('DOMContentLoaded', function() {
    loadPreferences();
  
    // Boutons de sauvegarde
    document.getElementById('save-appearance')?.addEventListener('click', savePreferences);
    document.getElementById('save-notifications')?.addEventListener('click', savePreferences);
    document.getElementById('save-language')?.addEventListener('click', savePreferences);
    document.getElementById('delete-account-btn')?.addEventListener('click', deleteAccount);
  
    // Mode sombre instantané
    document.getElementById('dark-mode-toggle')?.addEventListener('change', function() {
      document.body.classList.toggle('dark-mode', this.checked);
      localStorage.setItem('darkMode', this.checked);
    });
  
    // Taille du texte instantanée
    document.getElementById('text-size')?.addEventListener('change', function() {
      document.body.className = this.value + '-text';
      localStorage.setItem('textSize', this.value);
    });
  
    // Couleur de thème instantanée
    document.getElementById('theme-color')?.addEventListener('change', function() {
      document.documentElement.style.setProperty('--main-color', this.value);
      localStorage.setItem('themeColor', this.value);
    });
  });



  function confirmAccountDeletion() {
  const password = document.getElementById('confirm-password-delete').value;
  const messageEl = document.getElementById('delete-message');
  
  if (!password) {
    showDeleteMessage(messageEl, "Veuillez entrer votre mot de passe", "error");
    return;
  }

  // Confirmation finale
  if (!confirm("⚠️ DERNIÈRE CHANCE ! Cette action va :\n\n• Supprimer définitivement votre compte\n• Effacer toutes vos données\n• Être irréversible\n\nConfirmez-vous la suppression définitive ?")) {
    showDeleteMessage(messageEl, "Suppression annulée", "info");
    return;
  }

  // Afficher le chargement
  showDeleteMessage(messageEl, "Traitement en cours...", "loading");

  fetch('/delete_account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password: password })
  })
  .then(response => response.json())
  .then(data => {
    if (!data.success) {
      throw new Error(data.error || "Échec de la suppression");
    }
    showDeleteMessage(messageEl, "Compte supprimé. Redirection...", "success");
    setTimeout(() => {
      window.location.href = data.redirect || "/logout?account_deleted=true";
    }, 2000);
  })
  .catch(error => {
    console.error("Erreur:", error);
    showDeleteMessage(messageEl, `Erreur: ${error.message}`, "error");
  });
}

function showDeleteMessage(element, message, type) {
  element.textContent = message;
  element.className = `message ${type}`;
  element.style.display = 'block';
  
  // Reset du formulaire si erreur
  if (type === 'error') {
    document.getElementById('confirm-password-delete').value = '';
  }
  
  // Masquer après 5s sauf pour loading/success
  if (!['loading', 'success'].includes(type)) {
    setTimeout(() => {
      element.style.display = 'none';
    }, 5000);
  }
}

// Fonction pour basculer l'affichage des paramètres
function toggleSetting(settingId) {
  const content = document.getElementById(`${settingId}-content`);
  const arrow = document.getElementById(`${settingId}-arrow`);
  
  if (content.style.display === 'none' || !content.style.display) {
    content.style.display = 'block';
    arrow.classList.remove('bx-chevron-down');
    arrow.classList.add('bx-chevron-up');
  } else {
    content.style.display = 'none';
    arrow.classList.remove('bx-chevron-up');
    arrow.classList.add('bx-chevron-down');
  }
}

// Fonction de confirmation de suppression
function confirmAccountDeletion() {
  const password = document.getElementById('confirm-password-delete').value;
  const messageEl = document.getElementById('delete-message');
  
  if (!password) {
    showMessage(messageEl, "Veuillez entrer votre mot de passe", "error");
    return;
  }

  if (!confirm("⚠️ ATTENTION ! Cette action est irréversible.\n\nConfirmez-vous la suppression définitive de votre compte ?")) {
    showMessage(messageEl, "Suppression annulée", "info");
    return;
  }

  showMessage(messageEl, "Traitement en cours...", "loading");

  fetch('/delete_account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      showMessage(messageEl, "Compte supprimé. Redirection...", "success");
      setTimeout(() => {
        window.location.href = data.redirect || "/logout";
      }, 2000);
    } else {
      throw new Error(data.error || "Échec de la suppression");
    }
  })
  .catch(error => {
    showMessage(messageEl, `Erreur: ${error.message}`, "error");
    console.error("Erreur:", error);
  });
}

// Fonction utilitaire pour afficher les messages
function showMessage(element, text, type) {
  element.textContent = text;
  element.className = `message ${type}`;
  element.style.display = 'block';
  
  // Masquer après 5s sauf pour les messages de chargement/succès
  if (!['loading', 'success'].includes(type)) {
    setTimeout(() => {
      element.style.display = 'none';
    }, 5000);
  }
}
 


function updateResultsUI(data) {
  // 1. Afficher le résultat principal
  const resultDiv = document.getElementById("result-message");
  resultDiv.textContent = data.result_message;
  resultDiv.className = data.prediction ? "alert alert-danger" : "alert alert-success";

  // 2. Remplir le tableau d'analyse
  const tableBody = document.getElementById("analysis-results");
  tableBody.innerHTML = data.detailed_analysis.map(item => `
    <tr>
      <td>${formatIndicatorName(item.indicator)}</td>
      <td>${item.value.toFixed(2)} ${item.unit}</td>
      <td>${item.normal_range}</td>
      <td class="${getStatusClass(item.status)}">
        ${getStatusText(item.status)}
        ${item.status !== 'normal' ? '⚠️' : '✅'}
      </td>
    </tr>
  `).join('');

  // 3. Afficher l'interprétation
  document.getElementById("interpretation").textContent = get_medical_interpretation(data.prediction, data.detailed_analysis);

  // 4. Mettre à jour les graphiques
  updateMainChart(data.patient_data);
  if (data.detailed_analysis) {
    updateAnalysisChart(data.detailed_analysis);
  }

  // 5. Afficher les recommandations si disponibles
  if (data.recommendations && data.recommendations.length > 0) {
    const recommendationsList = document.getElementById("recommendations-list");
    recommendationsList.innerHTML = data.recommendations.map(rec => `<li>${rec}</li>`).join('');
    document.getElementById("recommendations").style.display = "block";
  }
}

// Fonctions utilitaires
function formatIndicatorName(name) {
  const names = {
    'Total Bilirubin': 'Bilirubine totale',
    'Alkaline Phosphotase': 'Phosphatase alcaline',
    'Alamine Aminotransferase': 'ALT (GPT)',
    'Aspartate Aminotransferase': 'AST (GOT)',
    'Total Protiens': 'Protéines totales',
    'Albumin': 'Albumine',
    'Albumin and Globulin Ratio': 'Ratio A/G'
  };
  return names[name] || name;
}

function getStatusClass(status) {
  return {
    'normal': 'status-normal',
    'low': 'status-low',
    'high': 'status-high'
  }[status] || '';
}




function getStatusText(status) {
  const texts = {
      'normal': 'Normal',
      'low': 'Trop bas',
      'high': 'Trop élevé'
  };
  return texts[status] || status;
}

function updateChart(analysis) {
  const ctx = document.getElementById('chart').getContext('2d');
  
  // Détruire l'ancien graphique si existant
  if (window.myChart) {
      window.myChart.destroy();
  }

  const labels = analysis.map(item => formatIndicatorName(item.indicator));
  const values = analysis.map(item => item.value);

  window.myChart = new Chart(ctx, {
      type: 'bar',
      data: {
          labels: labels,
          datasets: [{
              label: 'Vos résultats',
              data: values,
              backgroundColor: analysis.map(item => 
                  item.status === 'high' ? 'rgba(220, 53, 69, 0.7)' :
                  item.status === 'low' ? 'rgba(255, 193, 7, 0.7)' :
                  'rgba(40, 167, 69, 0.7)'),
              borderColor: analysis.map(item => 
                  item.status === 'high' ? 'rgba(220, 53, 69, 1)' :
                  item.status === 'low' ? 'rgba(255, 193, 7, 1)' :
                  'rgba(40, 167, 69, 1)'),
              borderWidth: 1
          }]
      },
      options: {
          responsive: true,
          scales: {
              y: {
                  beginAtZero: true
              }
          },
          plugins: {
              legend: {
                  display: false
              },
              tooltip: {
                  callbacks: {
                      afterLabel: function(context) {
                          const item = analysis[context.dataIndex];
                          return `Plage normale: ${item.normal_range}\nStatut: ${getStatusText(item.status)}`;
                      }
                  }
              }
          }
      }
  });
}

function showNotification(message, type) {
  const notification = document.getElementById("notification");
  notification.textContent = message;
  notification.className = `alert alert-${type}`;
  notification.style.display = "block";
  setTimeout(() => notification.style.display = "none", 5000);
}

// Variables globales pour stocker les instances de graphiques
// Déclaration globale pour stocker les instances de graphiques
let mainChartInstance = null;
let analysisChartInstance = null;

function updateMainChart(patientData) {
    const ctx = document.getElementById('chart').getContext('2d');
    
    // Détruire l'ancien graphique s'il existe
    if (mainChartInstance) {
        mainChartInstance.destroy();
    }
    
    // Créer le nouveau graphique
    mainChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Bilirubine', 'Phosphatase', 'ALT', 'AST', 'Albumine'],
            datasets: [{
                label: 'Vos résultats',
                data: [
                    patientData["Total Bilirubin"],
                    patientData["Alkaline Phosphotase"],
                    patientData["Alamine Aminotransferase"],
                    patientData["Aspartate Aminotransferase"],
                    patientData["Albumin"]
                ],
                backgroundColor: 'rgba(54, 162, 235, 0.5)'
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true } },
            plugins: {
                legend: { display: true },
                title: {
                    display: true,
                    text: 'Analyse des marqueurs hépatiques'
                }
            }
        }
    });
}

function updateAnalysisChart(analysisData) {
    const ctx = document.getElementById('analysisChart').getContext('2d');
    
    // Détruire l'ancien graphique s'il existe
    if (analysisChartInstance) {
        analysisChartInstance.destroy();
    }
    
    // Préparer les données pour le graphique radar
    const labels = analysisData.map(item => item.indicator);
    const data = analysisData.map(item => item.value);
    const backgroundColors = analysisData.map(item => 
        item.status === 'high' ? 'rgba(255, 99, 132, 0.2)' :
        item.status === 'low' ? 'rgba(255, 206, 86, 0.2)' :
        'rgba(75, 192, 192, 0.2)');
    
    const borderColors = analysisData.map(item => 
        item.status === 'high' ? 'rgba(255, 99, 132, 1)' :
        item.status === 'low' ? 'rgba(255, 206, 86, 1)' :
        'rgba(75, 192, 192, 1)');
    
    // Créer le nouveau graphique
    analysisChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Valeurs',
                data: data,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                r: {
                    angleLines: { display: true },
                    suggestedMin: 0
                }
            },
            plugins: {
                legend: { display: true },
                title: {
                    display: true,
                    text: 'Analyse détaillée des paramètres'
                }
            }
        }
    });
}

// Fonction pour initialiser les graphiques avec des données vides
function initializeCharts() {
    const emptyData = {
        "Total Bilirubin": 0,
        "Alkaline Phosphotase": 0,
        "Alamine Aminotransferase": 0,
        "Aspartate Aminotransferase": 0,
        "Albumin": 0
    };
    
    updateMainChart(emptyData);
    
    const emptyAnalysis = [
        { indicator: "Total Bilirubin", value: 0, status: "normal" },
        { indicator: "Alkaline Phosphotase", value: 0, status: "normal" },
        { indicator: "Alamine Aminotransferase", value: 0, status: "normal" },
        { indicator: "Aspartate Aminotransferase", value: 0, status: "normal" },
        { indicator: "Albumin", value: 0, status: "normal" }
    ];
    
    updateAnalysisChart(emptyAnalysis);
}


    

function showNotification(message, type) {
    const notification = document.getElementById("notification");
    const notifText = document.getElementById("notif-text");
    
    notifText.textContent = message;
    notification.className = `alert alert-${type}`;
    notification.style.display = "block";
    
    setTimeout(() => {
        notification.style.display = "none";
    }, 5000);
}

// Gestion de la prédiction de stade
document.getElementById('stage-form')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const formData = new FormData(this);
  const submitBtn = document.getElementById('predict-stage');
  submitBtn.disabled = true;
  submitBtn.textContent = "Analyse en cours...";
  
  try {
    const response = await fetch('/predict_stage', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || "Erreur lors de la prédiction");
    }
    
    displayStageResults(data);
    document.getElementById('stage-results').style.display = 'block';
    
  } catch (error) {
    alert("Erreur: " + error.message);
    console.error(error);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Prédire le stade";
  }
});

function displayStageResults(data) {
  // Afficher le résultat principal
  const stageResult = document.getElementById('stage-prediction-result');
  stageResult.innerHTML = `
    <p class="result-message ${data.prediction > 0 ? 'warning' : 'success'}">
      ${data.result_message}
    </p>
    <div class="stage-indicator">
      ${[1, 2, 3, 4].map(stage => `
        <div class="stage-step ${data.prediction === stage ? 'active' : ''}">
          <div class="stage-connector"></div>
          <div class="step-number">${stage}</div>
          <div class="step-label">Stade ${stage}</div>
        </div>
      `).join('')}
    </div>
    <p>Modèle utilisé: <strong>${data.model_used}</strong></p>
    ${data.confidence_score ? `<p>Confiance: <strong>${data.confidence_score.toFixed(2)}%</strong></p>` : ''}
  `;
  
  // Afficher l'analyse détaillée
  const analysisDiv = document.getElementById('stage-analysis');
  analysisDiv.innerHTML = `
    <table class="medical-analysis">
      <thead>
        <tr>
          <th>Paramètre</th>
          <th>Valeur</th>
          <th>Plage normale</th>
        </tr>
      </thead>
      <tbody>
        ${data.detailed_analysis.map(item => `
          <tr>
            <td>${item.indicator}</td>
            <td>${item.value} ${item.unit}</td>
            <td>${item.normal_range}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  // Afficher les recommandations
  const recDiv = document.getElementById('stage-recommendations');
  recDiv.innerHTML = `
    <ul>
      ${data.recommendations.map(rec => `<li>${rec}</li>`).join('')}
    </ul>
  `;
  
  // Faire défiler jusqu'aux résultats
  document.getElementById('stage-results').scrollIntoView({ behavior: 'smooth' });
}

//image_outil 

// Fonction pour basculer l'affichage des outils
function toggleTool(toolId) {
  const content = document.getElementById(`${toolId}-content`);
  const arrow = document.getElementById(`${toolId}-arrow`);
  
  if (content.style.display === 'none') {
    content.style.display = 'block';
    arrow.classList.remove('bx-chevron-down');
    arrow.classList.add('bx-chevron-up');
  } else {
    content.style.display = 'none';
    arrow.classList.remove('bx-chevron-up');
    arrow.classList.add('bx-chevron-down');
  }
}

// Fonction pour basculer l'affichage des outils
function toggleTool(toolId) {
  const content = document.getElementById(`${toolId}-content`);
  const arrow = document.getElementById(`${toolId}-arrow`);
  
  if (content.style.display === 'none') {
    content.style.display = 'block';
    arrow.classList.remove('bx-chevron-down');
    arrow.classList.add('bx-chevron-up');
  } else {
    content.style.display = 'none';
    arrow.classList.remove('bx-chevron-up');
    arrow.classList.add('bx-chevron-down');
  }
}

        // Prévisualisation de l'image
        document.getElementById('image-upload').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const preview = document.getElementById('preview-image');
                    preview.src = event.target.result;
                    document.getElementById('image-preview-container').style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });

        // Soumission du formulaire
    document.getElementById('image-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const submitBtn = this.querySelector('button[type="submit"]');
            const resultDiv = document.getElementById('image-result');
            const resultContent = document.getElementById('result-content');

            resultContent.innerHTML = '';
            resultDiv.style.display = 'none';

            try {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="bx bx-loader bx-spin"></i> Analyse en cours...';

                const response = await fetch('/analyze_image', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.message || 'Erreur lors de l\'analyse');
                }

                resultContent.innerHTML = `
                    <div class="result-card ${data.prediction === 'Normal' ? 'healthy' : 'unhealthy'}">
                        <h3>${data.diagnosis} ${data.icon}</h3>
                        <p><strong>Confiance:</strong> ${data.confidence}%</p>
                        <p><strong>Recommandation:</strong> ${data.recommendation}</p>
                    </div>
                `;
                
                resultDiv.style.display = 'block';
                
            } catch (error) {
                resultContent.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="bx bx-error"></i>
                        <h4>Erreur</h4>
                        <p>${error.message}</p>
                    </div>
                `;
                resultDiv.style.display = 'block';
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="bx bx-analyse"></i> Analyser l\'image';
            }
        }); 

        function showAnalysisDetails() {
    // Récupérer les résultats de l'analyse
    const resultCard = document.querySelector('.result-card');
    const diagnosis = resultCard.querySelector('h3').textContent;
    const confidence = resultCard.querySelector('p:nth-of-type(1)').textContent.split(': ')[1];
    const recommendation = resultCard.querySelector('p:nth-of-type(2)').textContent.split(': ')[1];
    const isHealthy = resultCard.classList.contains('healthy');
    const imageSrc = document.getElementById('preview-image').src;

    // Créer la modale
    const modal = document.createElement('div');
    modal.id = 'analysis-details-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.9);
        z-index: 10000;
        display: flex;
        justify-content: center;
        align-items: center;
        color: white;
    `;

    // Contenu amélioré avec explications techniques
    const explanationContent = `
    <div style="max-width: 900px; max-height: 90vh; overflow-y: auto; background: #1a1a2e; border-radius: 16px; padding: 30px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); font-family: 'Segoe UI', sans-serif;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 1px solid #2d2d42; padding-bottom: 15px;">
            <h2 style="margin: 0; color: ${isHealthy ? '#4CAF50' : '#F44336'};">
                <i class='bx bx-analyse'></i> Détails Techniques de l'Analyse
            </h2>
            <button id="close-modal" style="background: #ff4757; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 16px;">
                Fermer
            </button>
        </div>

        <!-- Section Image Originale -->
        <div style="text-align: center; margin-bottom: 25px;">
            <h3 style="color: #3498db; margin-top: 0; border-left: 4px solid #3498db; padding-left: 10px;">
                <i class='bx bx-image'></i> Image Originale
            </h3>
            <img src="${imageSrc}" style="max-width: 100%; max-height: 300px; border: 1px solid #ddd; border-radius: 4px;">
        </div>

        <!-- Section Analyse de Confiance -->
        <div style="margin-bottom: 25px; background: #0f3460; padding: 15px; border-radius: 10px;">
            <h3 style="color: #64b5f6; margin-top: 0;">
                <i class='bx bx-line-chart'></i> Analyse de la Confiance
            </h3>
            <div style="display: flex; align-items: center; gap: 15px; margin-top: 10px;">
                <div style="flex-grow: 1;">
                    <div style="height: 10px; background: #2d2d42; border-radius: 5px; margin-bottom: 5px;">
                        <div style="height: 100%; width: ${confidence}; background: ${isHealthy ? '#4CAF50' : '#F44336'}; border-radius: 5px;"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px; color: #bdc3c7;">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                    </div>
                </div>
                <div style="font-size: 18px; font-weight: bold; color: ${isHealthy ? '#4CAF50' : '#F44336'};">${confidence}</div>
            </div>
            <p style="margin-top: 10px; font-size: 14px; color: #bdc3c7;">
                La confiance représente la certitude du modèle dans sa prédiction, calculée à partir de la sortie softmax de notre réseau de neurones.
            </p>
        </div>

        <!-- Section Processus Technique -->
        <div style="margin-bottom: 25px;">
            <h3 style="color: #3498db; margin-top: 0; border-left: 4px solid #3498db; padding-left: 10px;">
                <i class='bx bx-cog'></i> Processus Technique d'Analyse
            </h3>
            
            <div style="background: #16213e; padding: 20px; border-radius: 10px; margin-top: 15px;">
                <!-- Étape 1 - Préparation des données -->
                <div style="display: grid; grid-template-columns: 120px 1fr; gap: 20px; align-items: center; margin-bottom: 15px;">
                    <div style="text-align: center;">
                        <div style="background: #0f3460; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px;">
                            <i class='bx bx-data' style="font-size: 30px; color: #64b5f6;"></i>
                        </div>
                        <div style="font-size: 12px;">Étape 1</div>
                    </div>
                    <div>
                        <h4 style="margin-top: 0; color: #64b5f6;">Préparation des Données</h4>
                        <p>L'image est redimensionnée à 256x256 pixels et normalisée. Nous appliquons un prétraitement avancé incluant:</p>
                        <ul style="margin-top: 5px; padding-left: 20px;">
                            <li>Égalisation d'histogramme pour améliorer le contraste</li>
                            <li>Filtrage pour réduire le bruit</li>
                            <li>Normalisation des valeurs de pixels entre 0 et 1</li>
                        </ul>
                    </div>
                </div>
                
                <!-- Étape 2 - Architecture du Modèle -->
                <div style="display: grid; grid-template-columns: 120px 1fr; gap: 20px; align-items: center; margin-bottom: 15px;">
                    <div style="text-align: center;">
                        <div style="background: #0f3460; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px;">
                            <i class='bx bx-network-chart' style="font-size: 30px; color: #64b5f6;"></i>
                        </div>
                        <div style="font-size: 12px;">Étape 2</div>
                    </div>
                    <div>
                        <h4 style="margin-top: 0; color: #64b5f6;">Architecture UNet++</h4>
                        <p>Notre modèle utilise  Réseau de Neurones Convolutifs (une architecture UNet++ ,ResNet) améliorée avec:</p>
                        <ul style="margin-top: 5px; padding-left: 20px;">
                            <li>Blocs résiduels pour un apprentissage profond</li>
                            <li>Connexions denses entre les couches</li>
                            <li>Mécanismes d'attention spatiale</li>
                            <li>Dropout (50%) pour éviter le surapprentissage</li>
                        </ul>
                    </div>
                </div>
                
                <!-- Étape 3 - Gestion du Déséquilibre -->
                <div style="display: grid; grid-template-columns: 120px 1fr; gap: 20px; align-items: center; margin-bottom: 15px;">
                    <div style="text-align: center;">
                        <div style="background: #0f3460; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px;">
                            <i class='bx bx-balance' style="font-size: 30px; color: #64b5f6;"></i>
                        </div>
                        <div style="font-size: 12px;">Étape 3</div>
                    </div>
                    <div>
                        <h4 style="margin-top: 0; color: #64b5f6;">Gestion du Déséquilibre</h4>
                        <p>Pour traiter le déséquilibre des classes, nous utilisons:</p>
                        <ul style="margin-top: 5px; padding-left: 20px;">
                            <li>SMOTE pour la génération d'échantillons synthétiques</li>
                            <li>Pondération des classes dans la fonction de perte</li>
                            <li>Augmentation de données en temps réel</li>
                        </ul>
                    </div>
                </div>
                
                
            </div>
        </div>

        <!-- Section Résultats -->
        <div style="background: ${isHealthy ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)'}; 
                border-left: 4px solid ${isHealthy ? '#4CAF50' : '#F44336'};
                padding: 20px; border-radius: 10px;">
            <h3 style="margin-top: 0; color: ${isHealthy ? '#4CAF50' : '#F44336'};">
                <i class='bx bx-clinic'></i> Résultat Final
            </h3>
            <p><strong>Diagnostic:</strong> ${diagnosis}</p>
            <p><strong>Niveau de confiance:</strong> ${confidence}</p>
            <p><strong>Recommandation:</strong> ${recommendation}</p>
            <p style="font-size: 14px; color: #bdc3c7; margin-bottom: 0;">
                <strong>Note médicale :</strong> Ce résultat est une analyse automatisée et ne remplace pas un diagnostic médical professionnel.
            </p>
        </div>

        <div style="margin-top: 20px; text-align: center; font-size: 12px; color: #7f8c8d; border-top: 1px solid #2d2d42; padding-top: 15px;">
            <p>Analyse effectuée le ${new Date().toLocaleDateString()} à ${new Date().toLocaleTimeString()}</p>
            <p>© 2025 HepatoAI - Système Expert d'Analyse Hépatique</p>
        </div>
    </div>
    `;

    modal.innerHTML = explanationContent;
    document.body.appendChild(modal);

    // Gestion du bouton fermer
    document.getElementById('close-modal').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
}
        // Bouton "Savoir plus"
        document.getElementById('more-info-btn').addEventListener('click', showAnalysisDetails);

        // Bouton "Export PDF" (à implémenter)
        document.getElementById('export-pdf-btn').addEventListener('click', generateImagePDF);

        // Initialisation
        document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('image-preview-container').style.display = 'none';
            document.getElementById('image-result').style.display = 'none';
        });

        // Fonction pour générer le PDF pour les résultats d'images
async function generateImagePDF() {
  try {
    const resultContent = document.getElementById('result-content');
    if (!resultContent || resultContent.innerHTML.trim() === '') {
      alert("Veuillez d'abord analyser une image pour générer un rapport");
      return;
    }

    const exportBtn = document.getElementById('export-pdf-btn');
    if (exportBtn) {
      exportBtn.disabled = true;
      exportBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Génération en cours...';
    }

    // Récupérer les informations du résultat
    const resultCard = resultContent.querySelector('.result-card');
    const diagnosis = resultCard.querySelector('h3').textContent;
    const confidence = resultCard.querySelector('p:nth-of-type(1)').textContent.split(': ')[1];
    const recommendation = resultCard.querySelector('p:nth-of-type(2)').textContent.split(': ')[1];
    
    // Récupérer l'image analysée
    const imageSrc = document.getElementById('preview-image').src;
    
    // Déterminer le type de résultat (normal/anormal)
    const isHealthy = resultCard.classList.contains('healthy');
    
    // Créer le contenu du PDF
    const reportContent = `
      <div id="pdf-report" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <header style="background-color: #2c3e50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">HepatoAI - Rapport d'Analyse d'Image</h1>
        </header>
        
        <div style="padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <div>
              <p style="margin: 5px 0;"><strong>Patient :</strong> ${document.getElementById("patient-name").textContent || 'Non spécifié'}</p>
              <p style="margin: 5px 0;"><strong>Date :</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 5px 0;"><strong>Référence :</strong> IMG-${Date.now()}</p>
            </div>
          </div>
          
          <div style="background-color: ${isHealthy ? '#e8f5e9' : '#ffebee'}; 
                      border-left: 4px solid ${isHealthy ? '#4CAF50' : '#F44336'};
                      padding: 15px; margin-bottom: 25px; border-radius: 4px;">
            <h3 style="margin-top: 0; color: ${isHealthy ? '#2e7d32' : '#c62828'};">
              ${isHealthy ? '✅ Résultat Normal' : '⚠️ Résultat Anormal'}
            </h3>
            <p style="margin-bottom: 0; font-size: 16px; line-height: 1.5;">
              <strong>${diagnosis}</strong><br>
              Confiance: ${confidence}
            </p>
          </div>
          
          <h3 style="border-bottom: 2px solid #2c3e50; padding-bottom: 5px; margin-top: 0;">Image Analysée</h3>
          <div style="text-align: center; margin: 20px 0;">
            <img src="${imageSrc}" style="max-width: 100%; max-height: 300px; border: 1px solid #ddd; border-radius: 4px;">
          </div>
          
          <div style="margin-top: 30px; padding: 15px; background-color: #f5f5f5; border-radius: 4px;">
            <h4 style="margin-top: 0;">Recommandations :</h4>
            <p>${recommendation}</p>
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
          <title>Rapport d'Analyse d'Image HepatoAI</title>
          <style>
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
            @media print {
              body { padding: 10mm; font-size: 12pt; }
              #pdf-report { box-shadow: none; border: none; }
              @page { size: A4; margin: 10mm; }
            }
            img { max-width: 100%; height: auto; }
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
      exportBtn.innerHTML = '<i class="bx bx-download"></i> Rapport PDF';
    }

  } catch (error) {
    console.error("Erreur lors de la génération du PDF:", error);
    alert("Une erreur est survenue lors de la génération du PDF");
    const exportBtn = document.getElementById('export-pdf-btn');
    if (exportBtn) {
      exportBtn.disabled = false;
      exportBtn.innerHTML = '<i class="bx bx-download"></i> Rapport PDF';
    }
  }
}