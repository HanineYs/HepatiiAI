// Global variables
let healthChart, metricsChart, rocChart;

// Show section and hide others
function showSection(sectionId) {
  document.querySelectorAll('section').forEach(section => {
    section.classList.add('d-none');
  });
  document.getElementById(sectionId).classList.remove('d-none');
}

// Load all data on page load
document.addEventListener('DOMContentLoaded', function() {
  loadDashboardData();
  loadPatients();
  loadPredictions();
  loadModelMetrics();
});

// Dashboard data
async function loadDashboardData() {
  try {
    const response = await fetch('/admin/get_stats');
    const data = await response.json();
    
    // Update KPI cards
    ocument.getElementById('total-patients').textContent = data.total_patients;
    document.getElementById('total-predictions').textContent = data.total_predictions;
    document.getElementById('sick-patients').textContent = data.malades;
    document.getElementById('healthy-patients').textContent = data.sains;
    
    // Create health chart
    const healthCtx = document.getElementById('healthChart').getContext('2d');
    healthChart = new Chart(healthCtx, {
      type: 'doughnut',
      data: {
        labels: ['Malades', 'Sains'],
        datasets: [{
          data: [data.sick_patients, data.healthy_patients],
          backgroundColor: ['#ff6384', '#36a2eb']
        }]
      }
    });
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

// Load patients
// Version consolidée de loadPatients
async function loadPatients() {
  try {
      const response = await fetch('/get_patients');
      const data = await response.json();
      const tableBody = document.querySelector('#patients-table tbody');
      
      if (!data.patients || data.patients.length === 0) {
          tableBody.innerHTML = `
              <tr>
                  <td colspan="6" class="text-center">Aucun patient trouvé</td>
              </tr>
          `;
          return;
      }
      
      tableBody.innerHTML = data.patients.map(patient => `
          <tr>
              <td>${patient._id.substring(0, 8)}...</td>
              <td>${patient.firstname}</td>
              <td>${patient.lastname}</td>
              <td>${patient.email}</td>
              <td>${formatDate(patient.created_at)}</td>
              <td>
                  <button class="btn btn-sm btn-warning" onclick="editPatient('${patient._id}')">
                      <i class='bx bx-edit'></i>
                  </button>
                  <button class="btn btn-sm btn-danger" onclick="deletePatient('${patient._id}')">
                      <i class='bx bx-trash'></i>
                  </button>
              </td>
          </tr>
      `).join('');
  } catch (error) {
      console.error('Error loading patients:', error);
      document.querySelector('#patients-table tbody').innerHTML = `
          <tr>
              <td colspan="6" class="text-center text-danger">Erreur de chargement</td>
          </tr>
      `;
  }
}

// Version consolidée de loadPredictions
async function loadPredictions() {
  try {
      const response = await fetch('/get_predictions');
      const data = await response.json();
      const tableBody = document.querySelector('#predictions-table tbody');
      
      if (!data.predictions || data.predictions.length === 0) {
          tableBody.innerHTML = `
              <tr>
                  <td colspan="5" class="text-center">Aucune prédiction trouvée</td>
              </tr>
          `;
          return;
      }
      
      tableBody.innerHTML = data.predictions.map(pred => `
          <tr>
              <td>${pred.username}</td>
              <td>${pred.email || 'N/A'}</td>
              <td>
                  ${pred.result.includes('maladie hépatique détectée') ? 
                      '<span class="badge bg-danger">' + pred.result + '</span>' : 
                      pred.result.includes('Aucun signe') ? 
                      '<span class="badge bg-success">' + pred.result + '</span>' : 
                      '<span class="badge bg-secondary">' + pred.result + '</span>'}
              </td>
              <td>${formatDate(pred.timestamp)}</td>
              <td>
                  <button class="btn btn-sm btn-info" onclick="showPredictionDetails('${pred._id}')">
                      <i class="fas fa-eye"></i>
                  </button>
              </td>
          </tr>
      `).join('');
  } catch (error) {
      console.error('Error loading predictions:', error);
      document.querySelector('#predictions-table tbody').innerHTML = `
          <tr>
              <td colspan="5" class="text-center text-danger">Erreur de chargement</td>
          </tr>
      `;
  }
}

// Fonction de formatage de date (si elle n'existe pas déjà)
function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
          return 'N/A';
      }
      return date.toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
      });
  } catch (e) {
      console.error("Erreur format date:", e);
      return 'N/A';
  }
}
// Load model metrics
async function loadModelMetrics() {
  try {
    const response = await fetch('/admin/model_metrics');
    const data = await response.json();
    
    // Update confusion matrix
    document.getElementById('true-positive').textContent = data.confusion_matrix.tp;
    document.getElementById('false-positive').textContent = data.confusion_matrix.fp;
    document.getElementById('false-negative').textContent = data.confusion_matrix.fn;
    document.getElementById('true-negative').textContent = data.confusion_matrix.tn;
    
    // Update AUC
    document.getElementById('auc-value').textContent = data.auc.toFixed(2);
    
    // Create ROC curve
    const rocCtx = document.getElementById('rocCurveChart').getContext('2d');
    rocChart = new Chart(rocCtx, {
      type: 'line',
      data: {
        labels: data.roc_curve.fpr.map((_, i) => (i/data.roc_curve.fpr.length).toFixed(1)),
        datasets: [{
          label: 'Courbe ROC',
          data: data.roc_curve.tpr,
          borderColor: '#4bc0c0',
          fill: false
        }, {
          label: 'Aléatoire',
          data: data.roc_curve.fpr,
          borderColor: '#ff6384',
          borderDash: [5, 5],
          fill: false
        }]
      },
      options: {
        scales: {
          x: {
            title: { display: true, text: 'Taux de Faux Positifs' }
          },
          y: {
            title: { display: true, text: 'Taux de Vrais Positifs' }
          }
        }
      }
    });
    
    // Load form data averages
    const formDataTable = document.getElementById('form-data-table').querySelector('tbody');
    formDataTable.innerHTML = Object.entries(data.feature_means).map(([feature, values]) => `
      <tr>
        <td>${feature}</td>
        <td>${values.sick.toFixed(2)}</td>
        <td>${values.healthy.toFixed(2)}</td>
      </tr>
    `).join('');
    
    // Create metrics chart
    const metricsCtx = document.getElementById('modelMetricsChart').getContext('2d');
    metricsChart = new Chart(metricsCtx, {
      type: 'bar',
      data: {
        labels: ['Précision', 'Rappel', 'F1-Score', 'Exactitude'],
        datasets: [{
          label: 'Performance',
          data: [data.precision, data.recall, data.f1, data.accuracy],
          backgroundColor: ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0']
        }]
      },
      options: {
        scales: {
          y: {
            max: 1
          }
        }
      }
    });
  } catch (error) {
    console.error('Error loading model metrics:', error);
  }
}

// Other functions (delete, view details, etc.)
async function deletePatient(patientId) {
  if (!confirm('Voulez-vous vraiment supprimer ce patient ?')) return;
  
  try {
    const response = await fetch(`/delete_patient/${patientId}`, { method: 'POST' });
    const data = await response.json();
    if (data.success) {
      loadPatients();
      loadDashboardData();
    }
  } catch (error) {
    console.error('Error deleting patient:', error);
  }
}

function viewPatientDetails(patientId) {
  // Implement modal for patient details
}

function viewPredictionDetails(predictionId) {
  // Implement modal for prediction details
}
// Charger les métriques du modèle
async function loadModelMetrics() {
    try {
        const response = await fetch('/admin/model_metrics');
        const data = await response.json();
        
        // Mettre à jour la matrice de confusion
        document.getElementById('true-positive').textContent = data.confusion_matrix.tp;
        document.getElementById('false-positive').textContent = data.confusion_matrix.fp;
        document.getElementById('false-negative').textContent = data.confusion_matrix.fn;
        document.getElementById('true-negative').textContent = data.confusion_matrix.tn;
        
        // Mettre à jour les métriques
        document.getElementById('precision').textContent = data.precision.toFixed(2);
        document.getElementById('recall').textContent = data.recall.toFixed(2);
        document.getElementById('f1').textContent = data.f1.toFixed(2);
        document.getElementById('accuracy').textContent = data.accuracy.toFixed(2);
        document.getElementById('auc').textContent = data.auc.toFixed(2);
        
        // Dessiner la courbe ROC
        drawRocCurve(data.roc_curve.fpr, data.roc_curve.tpr, data.auc);
        
        // Dessiner l'importance des caractéristiques
        drawFeatureImportance(data.feature_names, data.feature_means);
        
    } catch (error) {
        console.error('Error loading model metrics:', error);
    }
}

// Dessiner la courbe ROC
function drawRocCurve(fpr, tpr, auc) {
    const ctx = document.getElementById('rocChart').getContext('2d');
    
    if (window.rocChart) {
        window.rocChart.destroy();
    }
    
    window.rocChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: fpr.map((_, i) => i/(fpr.length-1).toFixed(1)),
            datasets: [{
                label: `Courbe ROC (AUC = ${auc.toFixed(2)})`,
                data: tpr,
                borderColor: '#4bc0c0',
                fill: false
            }, {
                label: 'Aléatoire',
                data: fpr.map((_, i) => i/(fpr.length-1)),
                borderColor: '#ff6384',
                borderDash: [5, 5],
                fill: false
            }]
        },
        options: {
            scales: {
                x: { title: { display: true, text: 'Taux de Faux Positifs' }},
                y: { title: { display: true, text: 'Taux de Vrais Positifs' }}
            }
        }
    });
}

// Dessiner l'importance des caractéristiques
function drawFeatureImportance(features, means) {
    const ctx = document.getElementById('featureChart').getContext('2d');
    
    if (window.featureChart) {
        window.featureChart.destroy();
    }
    
    const sickData = features.map(f => means[f].sick);
    const healthyData = features.map(f => means[f].healthy);
    
    window.featureChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: features,
            datasets: [
                {
                    label: 'Malade',
                    data: sickData,
                    backgroundColor: '#ff6384'
                },
                {
                    label: 'Sain',
                    data: healthyData,
                    backgroundColor: '#36a2eb'
                }
            ]
        },
        options: {
            scales: {
                x: { title: { display: true, text: 'Caractéristiques' }},
                y: { title: { display: true, text: 'Valeur Moyenne' }}
            }
        }
    });
}

// Charger les métriques au démarrage
document.addEventListener('DOMContentLoaded', function() {
    loadModelMetrics();
    // ... autres initialisations ...
});


// Chargement des patients au démarrage
document.addEventListener('DOMContentLoaded', function() {
    loadPatients();
});

function loadPatients() {
    fetch('/get_patients')
        .then(response => response.json())
        .then(data => {
            if (data.patients && data.patients.length > 0) {
                updatePatientsTable(data.patients);
            }
        });
}

function updatePatientsTable(patients) {
    const tbody = document.querySelector('#patients-table tbody');
    tbody.innerHTML = '';
    
    patients.forEach(patient => {
        const row = `
            <tr>
                <td>${patient._id.substring(0, 8)}...</td>
                <td>${patient.firstname}</td>
                <td>${patient.lastname}</td>
                <td>${patient.email}</td>
                <td>${formatDate(patient.created_at)}</td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="editPatient('${patient._id}')">
                        <i class='bx bx-edit'></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deletePatient('${patient._id}')">
                        <i class='bx bx-trash'></i>
                    </button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('fr-FR');
}

function showPredictionDetails(predictionId) {
    fetch(`/api/prediction/${predictionId}`)
        .then(response => response.json())
        .then(data => {
            // Afficher les détails dans un modal
            const modal = new bootstrap.Modal(document.getElementById('predictionDetailsModal'));
            document.getElementById('predictionDetailsContent').innerHTML = `
                <h4>Détails de la prédiction</h4>
                <p><strong>Patient:</strong> ${data.username}</p>
                <p><strong>Date:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
                <p><strong>Résultat:</strong> ${data.result}</p>
                <h5 class="mt-3">Données du formulaire:</h5>
                <pre>${JSON.stringify(data.form_data, null, 2)}</pre>
            `;
            modal.show();
        });
}

document.addEventListener('DOMContentLoaded', function() {
        // Formatage de la date amélioré
        function formatDate(timestamp) {
            if (!timestamp) return 'N/A';
            try {
                const date = new Date(timestamp);
                if (isNaN(date.getTime())) {
                    return 'N/A';
                }
                return date.toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } catch (e) {
                console.error("Erreur format date:", e);
                return 'N/A';
            }
        }
    
        // Fonction pour charger les prédictions
        function loadPredictions() {
            fetch('/get_predictions')
                .then(response => {
                    if (!response.ok) throw new Error('Network response was not ok');
                    return response.json();
                })
                .then(data => {
                    const tableBody = document.getElementById('predictions-table-body');
                    tableBody.innerHTML = '';
                    
                    if (data.predictions.length === 0) {
                        tableBody.innerHTML = `
                            <tr>
                                <td colspan="6" class="text-center">Aucune prédiction trouvée</td>
                            </tr>
                        `;
                        return;
                    }
    
                    data.predictions.forEach(pred => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${pred._id.substring(0, 6)}...</td>
                            <td>${pred.username}</td>
                            <td>${formatDate(pred.timestamp)}</td>
                            <td>${pred.result || 'N/A'}</td>
                            <td>N/A</td>
                            <td>
                                <button class="btn btn-sm btn-info">Détails</button>
                            </td>
                        `;
                        tableBody.appendChild(row);
                    });
                })
                .catch(error => {
                    console.error("Erreur chargement prédictions:", error);
                    document.getElementById('predictions-table-body').innerHTML = `
                        <tr>
                            <td colspan="6" class="text-center text-danger">Erreur de chargement</td>
                        </tr>
                    `;
                });
        }
    
        // Afficher la section avec rechargement
        window.showSection = function(sectionId) {
            document.querySelectorAll('.main-content section').forEach(section => {
                section.classList.add('d-none');
            });
            document.getElementById(sectionId).classList.remove('d-none');
            
            if (sectionId === 'predictions-section') {
                loadPredictions();
            }
        };
    
        // Chargement initial
        loadPredictions();
    });

    
    async function loadDashboardData() {
      try {
        const response = await fetch('/admin/get_stats');
        const data = await response.json();
        
        // Mettre à jour les KPI
        document.getElementById('total-patients').textContent = data.total_patients;
        document.getElementById('total-predictions').textContent = data.total_predictions;
        document.getElementById('sick-patients').textContent = data.malades;
        document.getElementById('healthy-patients').textContent = data.sains;
        
        // Créer le graphique de santé
        createHealthCycleChart(data);
        
      } catch (error) {
        console.error('Erreur lors du chargement des données du tableau de bord:', error);
      }
    }
        

// Load model metrics
async function loadModelMetrics() {
  try {
      const response = await fetch('/admin/model_metrics');
      const data = await response.json();
      
      // Update confusion matrix
      document.getElementById('true-positive').textContent = data.confusion_matrix.true_pos;
      document.getElementById('false-positive').textContent = data.confusion_matrix.false_pos;
      document.getElementById('false-negative').textContent = data.confusion_matrix.false_neg;
      document.getElementById('true-negative').textContent = data.confusion_matrix.true_neg;
      
      // Update performance metrics
      document.getElementById('accuracy-value').textContent = (data.model_metrics.accuracy * 100).toFixed(2) + '%';
      document.getElementById('precision-value').textContent = (data.model_metrics.precision * 100).toFixed(2) + '%';
      document.getElementById('recall-value').textContent = (data.model_metrics.recall * 100).toFixed(2) + '%';
      document.getElementById('f1-value').textContent = (data.model_metrics.f1_score * 100).toFixed(2) + '%';
      document.getElementById('auc-value').textContent = (data.model_metrics.auc * 100).toFixed(2) + '%';
      
  } catch (error) {
      console.error('Error loading model metrics:', error);
  }
}    

// Dans admin.js
function loadModelMetrics() {
  try {
      // ... (votre code existant pour charger les données) ...

      // Initialisation du graphique ROC
      const rocCtx = document.getElementById('rocCurveChart').getContext('2d');
      
      // Détruire le graphique existant s'il y en a un
      if (window.rocChart) {
          window.rocChart.destroy();
      }

      // Créer le nouveau graphique
      window.rocChart = new Chart(rocCtx, {
          type: 'line',
          data: {
              labels: data.roc_curve.fpr.map((_, i) => (i/10).toFixed(1)), // [0.0, 0.1, ..., 1.0]
              datasets: [{
                  label: 'Courbe ROC',
                  data: data.roc_curve.tpr,
                  borderColor: '#4bc0c0',
                  backgroundColor: 'rgba(75, 192, 192, 0.2)',
                  fill: false,
                  tension: 0.1
              }, {
                  label: 'Aléatoire',
                  data: data.roc_curve.fpr,
                  borderColor: '#ff6384',
                  borderDash: [5, 5],
                  fill: false
              }]
          },
          options: {
              responsive: true,
              scales: {
                  x: {
                      title: {
                          display: true,
                          text: 'Taux de Faux Positifs'
                      },
                      min: 0,
                      max: 1
                  },
                  y: {
                      title: {
                          display: true,
                          text: 'Taux de Vrais Positifs'
                      },
                      min: 0,
                      max: 1
                  }
              }
          }
      });

  } catch (error) {
      console.error('Erreur lors du chargement des métriques:', error);
  }
}
    
//admin-commenait
// Fonction pour charger les commentaires
async function loadComments() {
  try {
    const response = await fetch('/admin/get_comments');
    const data = await response.json();
    
    const table = document.getElementById('comments-table');
    table.innerHTML = data.comments.map(comment => `
      <tr class="${comment.status === 'unread' ? 'table-warning' : ''}">
        <td>${comment.patient}</td>
        <td>${comment.message}</td>
        <td>${new Date(comment.date).toLocaleString()}</td>
        <td>${comment.status === 'unread' ? 'Non lu' : 'Lu'}</td>
        <td>
          <button class="btn btn-sm btn-success" onclick="markAsRead('${comment.id}')">
            Marquer comme lu
          </button>
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading comments:', error);
  }
}

// Fonction pour marquer un commentaire comme lu
async function markAsRead(commentId) {
  try {
    const response = await fetch(`/admin/mark_comment_read/${commentId}`, {
      method: 'POST'
    });
    
    if (response.ok) {
      loadComments(); // Recharger la liste
    }
  } catch (error) {
    console.error('Error marking comment as read:', error);
  }
}

// Ajouter au chargement initial
document.addEventListener('DOMContentLoaded', function() {
  loadComments();
  // ... autres initialisations ...
});
function showSection(sectionId) {
  document.querySelectorAll('section').forEach(section => {
    section.classList.add('d-none');
  });
  document.getElementById(sectionId).classList.remove('d-none');
  
  if (sectionId === 'predictions-section') {
    loadPredictions();
  } else if (sectionId === 'commentaire-section') {  // Ajoutez ceci
    loadComments();
  }
}

function createHealthCycleChart(data) {
  const ctx = document.getElementById('healthCycleChart').getContext('2d');
  
  // Détruire le graphique existant s'il y en a un
  if (window.healthCycleChart) {
    window.healthCycleChart.destroy();
  }
  
  window.healthCycleChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Malades', 'Sains'],
      datasets: [{
        data: [data.malades, data.sains],
        backgroundColor: ['#ff6384', '#36a2eb'],
        borderColor: '#fff',
        borderWidth: 2,
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true
        }
      }
    }
  });
}

async function loadDashboardData() {
  try {
      const response = await fetch('/admin/get_stats');
      const data = await response.json();
      
      // Vérifiez les données
      console.log('Données du tableau de bord:', data);
      
      // Créer le graphique de santé
      createHealthCycleChart(data);
      
  } catch (error) {
      console.error('Erreur lors du chargement des données du tableau de bord:', error);
  }
}


// Dans admin.js, modifiez la fonction loadDashboardData:

async function loadDashboardData() {
  try {
    const response = await fetch('/admin/get_stats');
    const data = await response.json();
    
    // Mettre à jour les KPI cards
    document.getElementById('total-patients').textContent = data.total_patients;
    document.getElementById('total-predictions').textContent = data.total_predictions;
    document.getElementById('sick-patients').textContent = data.malades;
    document.getElementById('healthy-patients').textContent = data.sains;
    
    // Créer le graphique de santé
    createHealthChart(data.health_data);
    
  } catch (error) {
    console.error('Erreur lors du chargement des données du tableau de bord:', error);
  }
}

// Dans la fonction loadDashboardData
async function loadDashboardData() {
  try {
    const response = await fetch('/admin/get_stats');
    const data = await response.json();
    
    // Créer le graphique de répartition
    createHealthDistributionChart(data.stats.malades, data.stats.sains);
    
  } catch (error) {
    console.error('Erreur lors du chargement des données du tableau de bord:', error);
  }
}

function createHealthDistributionChart(malades, sains) {
  const ctx = document.getElementById('healthDistributionChart').getContext('2d');
  
  // Détruire l'ancien graphique s'il existe
  if (window.healthDistributionChart) {
    window.healthDistributionChart.destroy();
  }
  
  window.healthDistributionChart = new Chart(ctx, {
    type: 'bar', // Changé de 'doughnut' à 'bar'
    data: {
      labels: ['Malades', 'Sains'],
      datasets: [{
        label: 'Nombre de patients',
        data: [malades, sains],
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)', // Rouge pour malades
          'rgba(54, 162, 235, 0.7)'  // Bleu pour sains
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Nombre de patients'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Statut de santé'
          }
        }
      },
      plugins: {
        legend: {
          display: false // On utilise notre propre légende
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const value = context.raw;
              const percentage = Math.round((value / total) * 100);
              return `${context.label}: ${value} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}


function loadConfusionMatrices() {
  fetch('/admin/get_stats')
      .then(response => response.json())
      .then(data => {
          // Les matrices sont déjà affichées via le templating
          // Vous pouvez ajouter ici du code pour des graphiques supplémentaires si besoin
          console.log("Matrices de confusion chargées", data.model_matrices);
      })
      .catch(error => {
          console.error("Erreur chargement matrices:", error);
      });
}

// Modifiez showSection pour charger les matrices quand la section est affichée
window.showSection = function(sectionId) {
  document.querySelectorAll('section').forEach(section => {
      section.classList.add('d-none');
  });
  document.getElementById(sectionId).classList.remove('d-none');
  
  if (sectionId === 'predictions-section') {
      loadPredictions();
  } else if (sectionId === 'confusion-matrix-section') {
      loadConfusionMatrices();
  } else if (sectionId === 'commentaire-section') {
      loadComments();
  }
};

function loadMatrices() {
  fetch('/admin/confusion_matrices')
      .then(response => response.json())
      .then(data => {
          let html = '';
          for (const [key, model] of Object.entries(data)) {
              const cm = model.matrix;
              html += `
              <div class="col-md-4 mb-4">
                  <div class="card">
                      <div class="card-header bg-dark text-white">
                          ${model.name} (n=${model.total})
                      </div>
                      <div class="card-body">
                          <table class="table table-bordered">
                              <tr>
                                  <th></th>
                                  <th>Prédit 0</th>
                                  <th>Prédit 1</th>
                              </tr>
                              <tr>
                                  <th>Réel 0</th>
                                  <td class="bg-success">${cm[0][0]}</td>
                                  <td class="bg-danger">${cm[0][1]}</td>
                              </tr>
                              <tr>
                                  <th>Réel 1</th>
                                  <td class="bg-danger">${cm[1][0]}</td>
                                  <td class="bg-success">${cm[1][1]}</td>
                              </tr>
                          </table>
                      </div>
                  </div>
              </div>
              `;
          }
          document.getElementById('matrices-container').innerHTML = html;
      });
}

// Chargement initial
loadMatrices();

async function loadConfusionMatrices() {
  try {
    const response = await fetch('/admin/confusion_matrices');
    const data = await response.json();
    
    const container = document.getElementById('matrices-container');
    container.innerHTML = '';
    
    // Couleurs pour chaque modèle
    const colors = {
      'rf': 'bg-primary text-white',
      'xgb': 'bg-warning text-dark',
      'knn': 'bg-info text-white'
    };
    
    // Créer une carte pour chaque modèle
    for (const [key, model] of Object.entries(data.matrices)) {
      const card = `
        <div class="col-md-4 mb-4">
          <div class="card">
            <div class="card-header ${colors[key] || ''}">
              ${data[key].name}
            </div>
            <div class="card-body">
              <table class="table table-bordered">
                <thead>
                  <tr>
                    <th></th>
                    <th>Prédit Malade</th>
                    <th>Prédit Sain</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Réel Malade</strong></td>
                    <td class="bg-success text-white">${model.tp}</td>
                    <td class="bg-danger text-white">${model.fn}</td>
                  </tr>
                  <tr>
                    <td><strong>Réel Sain</strong></td>
                    <td class="bg-danger text-white">${model.fp}</td>
                    <td class="bg-success text-white">${model.tn}</td>
                  </tr>
                </tbody>
              </table>
              <div class="mt-2">
                <small class="text-muted">
                  Données réelles calculées depuis ${model.tp + model.fp + model.tn + model.fn} prédictions
                </small>
              </div>
            </div>
          </div>
        </div>
      `;
      container.innerHTML += card;
    }
    
  } catch (error) {
    console.error('Error loading confusion matrices:', error);
    document.getElementById('matrices-container').innerHTML = `
      <div class="col-12">
        <div class="alert alert-danger">
          Erreur lors du chargement des matrices de confusion
        </div>
      </div>
    `;
  }
}

window.showSection = function(sectionId) {
  document.querySelectorAll('section').forEach(section => {
    section.classList.add('d-none');
  });
  document.getElementById(sectionId).classList.remove('d-none');
  
  if (sectionId === 'predictions-section') {
    loadPredictions();
  } else if (sectionId === 'confusion-matrix-section') {
    loadConfusionMatrices();
  } else if (sectionId === 'commentaire-section') {
    loadComments();
  }
};



// Fonction pour charger les commentaires
async function loadComments() {
  try {
    const response = await fetch('/admin/api/comments');
    const data = await response.json();
    
    const tableBody = document.getElementById('comments-table-body');
    tableBody.innerHTML = '';
    
    if (data.comments.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center">Aucun commentaire trouvé</td>
        </tr>
      `;
      return;
    }
    
    data.comments.forEach(comment => {
      const row = document.createElement('tr');
      if (comment.status === 'unread') {
        row.classList.add('table-warning');
      }
      
      row.innerHTML = `
        <td>${comment.patient_name || 'Anonyme'}</td>
        <td>${comment.message || ''}</td>
        <td>${formatDate(comment.timestamp)}</td>
        <td>
          <span class="badge ${comment.status === 'unread' ? 'bg-warning' : 'bg-success'}">
            ${comment.status === 'unread' ? 'Non lu' : 'Lu'}
          </span>
        </td>
        <td>
          <button class="btn btn-sm btn-success" 
                  onclick="markAsRead('${comment._id}')"
                  ${comment.status === 'read' ? 'disabled' : ''}>
            <i class='bx bx-check'></i> Marquer lu
          </button>
        </td>
      `;
      tableBody.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading comments:', error);
    document.getElementById('comments-table-body').innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-danger">Erreur de chargement</td>
      </tr>
    `;
  }
}

// Fonction pour marquer un commentaire comme lu
async function markAsRead(commentId) {
  if (!confirm('Marquer ce commentaire comme lu ?')) return;
  
  try {
    const response = await fetch(`/admin/mark_comment_read/${commentId}`, {
      method: 'POST'
    });
    
    if (response.ok) {
      loadComments(); // Recharger la liste
    }
  } catch (error) {
    console.error('Error marking comment as read:', error);
    alert('Erreur lors de la mise à jour');
  }
}

// Modifiez showSection pour charger les commentaires
window.showSection = function(sectionId) {
  document.querySelectorAll('section').forEach(section => {
    section.classList.add('d-none');
  });
  document.getElementById(sectionId).classList.remove('d-none');
  
  if (sectionId === 'predictions-section') {
    loadPredictions();
  } else if (sectionId === 'commentaire-section') {
    loadComments();
  }
};
function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return 'N/A';
    }
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    console.error("Erreur format date:", e);
    return 'N/A';
  }
}

// Ajoutez ces fonctions en haut du fichier admin.js, après les autres fonctions similaires

// Fonction pour rafraîchir les patients
function refreshPatients() {
    // Afficher un indicateur de chargement
    const refreshBtn = document.querySelector('#patients-section .btn-primary');
    const originalHtml = refreshBtn.innerHTML;
    refreshBtn.innerHTML = '<i class="bx bx-loader bx-spin"></i> Chargement...';
    refreshBtn.disabled = true;
    
    // Recharger les patients
    loadPatients().finally(() => {
        // Restaurer le bouton après le chargement
        refreshBtn.innerHTML = originalHtml;
        refreshBtn.disabled = false;
        
        // Optionnel: afficher une notification
        showToast('Liste des patients mise à jour', 'success');
    });
}

// Fonction pour rafraîchir les prédictions
function refreshPredictions() {
    // Afficher un indicateur de chargement
    const refreshBtn = document.querySelector('#predictions-section .btn-primary');
    const originalHtml = refreshBtn.innerHTML;
    refreshBtn.innerHTML = '<i class="bx bx-loader bx-spin"></i> Chargement...';
    refreshBtn.disabled = true;
    
    // Recharger les prédictions
    loadPredictions().finally(() => {
        // Restaurer le bouton après le chargement
        refreshBtn.innerHTML = originalHtml;
        refreshBtn.disabled = false;
        
        // Optionnel: afficher une notification
        showToast('Liste des prédictions mise à jour', 'success');
    });
}

// Fonction utilitaire pour afficher des notifications (à ajouter si elle n'existe pas)
function showToast(message, type = 'info') {
    const toastContainer = document.createElement('div');
    toastContainer.style.position = 'fixed';
    toastContainer.style.top = '20px';
    toastContainer.style.right = '20px';
    toastContainer.style.zIndex = '9999';
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0 show`;
    toast.role = 'alert';
    toast.ariaLive = 'assertive';
    toast.ariaAtomic = 'true';
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    document.body.appendChild(toastContainer);
    
    // Supprimer automatiquement après 3 secondes
    setTimeout(() => {
        toastContainer.remove();
    }, 3000);
}

// Vérification du chargement
console.log("Admin JS chargé");


// Fonctions globales
window.showSection = function(sectionId) {
    document.querySelectorAll('section').forEach(section => {
        section.classList.add('d-none');
    });
    document.getElementById(sectionId).classList.remove('d-none');
};

// Fonction de timeout générique
function createTimeoutPromise(ms) {
    return new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error(`Timeout dépassé (${ms}ms)`));
        }, ms);
    });
}

window.refreshPatients = async function() {
    const btn = document.querySelector('#patients-section .btn-primary');
    if (!btn) {
        console.error("Bouton patients non trouvé");
        return;
    }

    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="bx bx-loader bx-spin"></i>';
    btn.disabled = true;

    try {
        await Promise.race([
            loadPatients(),
            createTimeoutPromise(10000) // 10 secondes timeout
        ]);
        showToast('Patients mis à jour', 'success');
    } catch (error) {
        console.error("Erreur rafraîchissement patients:", error);
        showToast(
            error.message.includes('Timeout') 
                ? 'Le chargement a pris trop de temps' 
                : 'Erreur de chargement',
            'danger'
        );
    } finally {
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }
};

window.refreshPredictions = async function() {
    const btn = document.querySelector('#predictions-section .btn-primary');
    if (!btn) {
        console.error("Bouton prédictions non trouvé");
        return;
    }

    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="bx bx-loader bx-spin"></i>';
    btn.disabled = true;

    try {
        await Promise.race([
            loadPredictions(),
            createTimeoutPromise(10000) // 10 secondes timeout
        ]);
        showToast('Prédictions mises à jour', 'success');
    } catch (error) {
        console.error("Erreur rafraîchissement prédictions:", error);
        showToast(
            error.message.includes('Timeout') 
                ? 'Le chargement a pris trop de temps' 
                : 'Erreur de chargement',
            'danger'
        );
    } finally {
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }
};

// Fonctions de chargement optimisées
async function loadPatients() {
    const startTime = Date.now();
    try {
        const response = await fetch(`/get_patients?cache=${Date.now()}`); // Cache busting
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        console.log(`Chargement patients (${Date.now() - startTime}ms)`);
        
        const tableBody = document.querySelector('#patients-table tbody');
        if (!tableBody) throw new Error("Table patients non trouvée");

        tableBody.innerHTML = data.patients?.length 
            ? data.patients.map(patient => `
                <tr>
                    <td>${patient._id?.substring(0, 8) || 'N/A'}</td>
                    <td>${patient.firstname || 'N/A'}</td>
                    <td>${patient.lastname || 'N/A'}</td>
                    <td>${patient.email || 'N/A'}</td>
                    <td>${formatDate(patient.created_at)}</td>
                    <td>
                        <button class="btn btn-sm btn-warning" onclick="editPatient('${patient._id}')">
                            <i class='bx bx-edit'></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deletePatient('${patient._id}')">
                            <i class='bx bx-trash'></i>
                        </button>
                    </td>
                </tr>
            `).join('')
            : `<tr><td colspan="6" class="text-center">Aucun patient trouvé</td></tr>`;
            
    } catch (error) {
        console.error("Erreur chargement patients:", error);
        const tableBody = document.querySelector('#patients-table tbody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-danger">
                        Erreur de chargement: ${error.message}
                    </td>
                </tr>
            `;
        }
        throw error;
    }
}

async function loadPredictions() {
    const startTime = Date.now();
    try {
        const response = await fetch(`/get_predictions?cache=${Date.now()}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        console.log(`Chargement prédictions (${Date.now() - startTime}ms)`);
        
        const tableBody = document.querySelector('#predictions-table tbody');
        if (!tableBody) throw new Error("Table prédictions non trouvée");

        tableBody.innerHTML = data.predictions?.length 
            ? data.predictions.map(pred => {
                const resultClass = pred.result?.includes('maladie hépatique détectée') 
                    ? 'bg-danger' 
                    : pred.result?.includes('Aucun signe') 
                        ? 'bg-success' 
                        : 'bg-secondary';
                
                return `
                    <tr>
                        <td>${pred.username || 'N/A'}</td>
                        <td>${pred.email || 'N/A'}</td>
                        <td>
                            <span class="badge ${resultClass}">
                                ${pred.result || 'N/A'}
                            </span>
                        </td>
                        <td>${formatDate(pred.timestamp)}</td>
                        <td>
                            <button class="btn btn-sm btn-info" onclick="showPredictionDetails('${pred._id}')">
                                <i class="fas fa-eye"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('')
            : `<tr><td colspan="5" class="text-center">Aucune prédiction trouvée</td></tr>`;
            
    } catch (error) {
        console.error("Erreur chargement prédictions:", error);
        const tableBody = document.querySelector('#predictions-table tbody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-danger">
                        Erreur de chargement: ${error.message}
                    </td>
                </tr>
            `;
        }
        throw error;
    }
}

// Fonctions utilitaires
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    try {
        const date = new Date(timestamp);
        return isNaN(date.getTime()) 
            ? 'N/A' 
            : date.toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
    } catch (e) {
        console.error("Erreur format date:", e);
        return 'N/A';
    }
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container') || document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.position = 'fixed';
    toastContainer.style.top = '20px';
    toastContainer.style.right = '20px';
    toastContainer.style.zIndex = '9999';
    
    const toast = document.createElement('div');
    toast.className = `toast show align-items-center text-white bg-${type} border-0`;
    toast.style.minWidth = '250px';
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    if (!document.getElementById('toast-container')) {
        document.body.appendChild(toastContainer);
    }
    
    setTimeout(() => toast.remove(), 3000);
}

//nouvel section de mobile 
function showSection(sectionId) {
  // Masquer toutes les sections
  document.querySelectorAll('.main-content section').forEach(section => {
    section.classList.add('d-none');
  });
  
  // Afficher la section sélectionnée
  const section = document.getElementById(sectionId);
  if (section) {
    section.classList.remove('d-none');
    
    // Mettre à jour l'état actif dans sidebar ET mobile-footer
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });
    
    // Activer le lien correspondant dans les deux menus
    const activeLinkPC = document.querySelector(`.sidebar .nav-link[onclick*="${sectionId}"]`);
    const activeLinkMobile = document.querySelector(`.mobile-footer .nav-link[onclick*="${sectionId}"]`);
    
    if (activeLinkPC) activeLinkPC.classList.add('active');
    if (activeLinkMobile) activeLinkMobile.classList.add('active');
    
    // Faire défiler vers le haut en mode mobile
    if (window.innerWidth <= 768) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
  
  // Recharger les données si nécessaire
  if (sectionId === 'predictions-section') loadPredictions();
  else if (sectionId === 'patients-section') loadPatients();
  else if (sectionId === 'commentaire-section') loadComments();
}
function showSection(sectionId) {
  // Masquer toutes les sections
  document.querySelectorAll('.main-content section').forEach(section => {
    section.classList.add('d-none');
  });
  
  // Afficher la section sélectionnée
  const section = document.getElementById(sectionId);
  if (section) {
    section.classList.remove('d-none');
    
    // Mettre à jour l'état actif dans sidebar ET mobile-footer
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });
    
    // Activer le lien correspondant dans les deux menus
    const activeLinkPC = document.querySelector(`.sidebar .nav-link[onclick*="${sectionId}"]`);
    const activeLinkMobile = document.querySelector(`.mobile-footer .nav-link[onclick*="${sectionId}"]`);
    
    if (activeLinkPC) activeLinkPC.classList.add('active');
    if (activeLinkMobile) activeLinkMobile.classList.add('active');
    
    // Faire défiler vers le haut en mode mobile
    if (window.innerWidth <= 768) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
  
  // Recharger les données si nécessaire
  if (sectionId === 'predictions-section') loadPredictions();
  else if (sectionId === 'patients-section') loadPatients();
  else if (sectionId === 'commentaire-section') loadComments();
}