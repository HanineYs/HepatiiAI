from flask import Blueprint, render_template, request, redirect, url_for, jsonify, session
from db import (  
    get_all_predictions, 
    get_patient_predictions, 
    get_patients,
    save_comment,
    get_all_comments  
)
import couchdb
from datetime import datetime
import random

# Création d'un Blueprint pour l'admin
admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

# Configuration CouchDB
COUCHDB_URL = "http://admin:123456@localhost:5984/"
DB_NAME_PATIENT = "patient"
DB_NAME_PREDICTION = "prediction"

# Identifiants admin
ADMIN_EMAIL = "admin@gmail.com"
ADMIN_PASSWORD = "123456"

def calculate_mean(predictions, feature, sick=True):
    """
    Calcule la moyenne d'une caractéristique pour les patients malades ou sains
    """
    values = [
        float(p['form_data'].get(feature, 0))
        for p in predictions 
        if ("détecté" in p.get("result", "")) == sick
        and feature in p['form_data']
    ]
    return sum(values) / len(values) if values else 0

def calculate_confusion_matrix(predictions):
    """
    Calcule la matrice de confusion à partir des prédictions
    Retourne un dictionnaire avec les comptes et la matrice au format scikit-learn
    """
    # Initialisation des compteurs
    true_pos = 0
    false_pos = 0
    true_neg = 0
    false_neg = 0

    for p in predictions:
        pred = 1 if "détecté" in p.get("result", "") else 0
        true = p.get("true_diagnosis", 0)  # Doit être 0 ou 1
        
        if true == 1 and pred == 1:
            true_pos += 1
        elif true == 0 and pred == 1:
            false_pos += 1
        elif true == 0 and pred == 0:
            true_neg += 1
        elif true == 1 and pred == 0:
            false_neg += 1

    return {
        "true_pos": true_pos,
        "false_pos": false_pos,
        "true_neg": true_neg,
        "false_neg": false_neg,
        "matrix": [[true_pos, false_neg], [false_pos, true_neg]]  # Format scikit-learn
    }

def calculate_metrics(conf_matrix):
    """
    Calcule les métriques de performance à partir de la matrice de confusion
    """
    tp = conf_matrix["true_pos"]
    fp = conf_matrix["false_pos"]
    tn = conf_matrix["true_neg"]
    fn = conf_matrix["false_neg"]
    
    total = tp + fp + tn + fn
    if total == 0:
        return {
            "accuracy": 0,
            "precision": 0,
            "recall": 0,
            "f1_score": 0,
            "auc": 0.5
        }
    
    accuracy = (tp + tn) / total
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    
    # Calcul simplifié de l'AUC (dans un vrai système, utiliser les probabilités du modèle)
    auc = 0.5 + (recall - (fp / (fp + tn if (fp + tn) > 0 else 1))) / 2
    
    return {
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "f1_score": f1_score,
        "auc": max(0.5, min(1.0, auc))  # AUC entre 0.5 et 1
    }

def generate_roc_curve(auc_score):
    """
    Génère une courbe ROC simulée basée sur le score AUC
    """
    num_points = 11
    fpr = [i/(num_points-1) for i in range(num_points)]
    
    # Génération de la TPR basée sur l'AUC
    if auc_score <= 0.5:
        tpr = [x * (auc_score/0.5) for x in fpr]
    else:
        tpr = [x**((1-auc_score)/0.5) for x in fpr]
    
    return {
        "fpr": fpr,
        "tpr": tpr
    }

@admin_bp.route('/')
@admin_bp.route('/dashboard')
def admin_dashboard():
    if "admin" not in session:
        return redirect(url_for('admin.login'))

    try:
        patients = get_patients()
        predictions = get_all_predictions()
        comments = get_all_comments()
        
        # Calcul des métriques
        conf_matrix = calculate_confusion_matrix(predictions)
        metrics = calculate_metrics(conf_matrix)
        roc_curve = generate_roc_curve(metrics["auc"])
        
        # Calcul des moyennes des caractéristiques
        features = [
            'Total_Bilirubin', 'Alkaline_Phosphotase',
            'Alamine_Aminotransferase', 'Aspartate_Aminotransferase',
            'Albumin', 'Albumin_and_Globulin_Ratio'
        ]
        
        feature_means = {}
        for feature in features:
            feature_means[feature] = {
                "sick": calculate_mean(predictions, feature, sick=True),
                "healthy": calculate_mean(predictions, feature, sick=False)
            }
        
        stats = {
            "total_patients": len(patients),
            "total_predictions": len(predictions),
            "malades": sum(1 for p in predictions if "détecté" in p.get("result", "")),
            "sains": sum(1 for p in predictions if "santé" in p.get("result", "")),
            "confusion_matrix": conf_matrix,
            "model_metrics": metrics,
            "feature_means": feature_means,
            "roc_curve": roc_curve
        }
        
        return render_template("admin.html",
                            patients=patients,
                            predictions=predictions,
                            comments=comments,  # Ajouté
                            stats=stats)
    
    except Exception as e:
        print(f"Erreur dans admin_dashboard: {str(e)}")
        return render_template("admin.html",
                            patients=[],
                            predictions=[],
                            comments=[],  # Ajouté
                            stats={})

@admin_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get("email")
        password = request.form.get("password")

        if email == ADMIN_EMAIL and password == ADMIN_PASSWORD:
            session["admin"] = True
            return redirect(url_for('admin.admin_dashboard'))

        return render_template("index.html", error="Email ou mot de passe incorrect.")

    return render_template("index.html")

@admin_bp.route("/api/patients")
def api_patients():
    if "admin" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    patients = get_patients()
    return jsonify({"patients": patients})

@admin_bp.route("/api/predictions")
def api_predictions():
    if "admin" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    predictions = get_all_predictions()
    return jsonify({"predictions": predictions})

@admin_bp.route("/confirm_diagnosis/<prediction_id>", methods=["POST"])
def confirm_diagnosis(prediction_id):
    if "admin" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        confirmed_diagnosis = int(request.json.get("diagnosis", 0))
        if confirmed_diagnosis not in (0, 1):
            return jsonify({"error": "Diagnosis must be 0 or 1"}), 400
        
        # Mettre à jour la prédiction avec le diagnostic confirmé
        server = couchdb.Server(COUCHDB_URL)
        pred_db = server[DB_NAME_PREDICTION]
        pred = pred_db.get(prediction_id)
        
        if not pred:
            return jsonify({"error": "Prediction not found"}), 404
            
        pred["true_diagnosis"] = confirmed_diagnosis
        pred_db.save(pred)
        
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/delete_patient/<patient_id>", methods=["POST"])
def delete_patient(patient_id):
    if "admin" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        server = couchdb.Server(COUCHDB_URL)
        patient_db = server[DB_NAME_PATIENT]
        patient_db.delete(patient_db[patient_id])
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/logout")
def logout():
    session.pop("admin", None)
    return redirect(url_for('admin.login'))

# Filtre Jinja2 pour formater les dates
@admin_bp.app_template_filter('format_date')
def format_date_filter(timestamp):
    if not timestamp:
        return "N/A"
    try:
        dt = datetime.fromisoformat(timestamp)
        return dt.strftime("%d/%m/%Y %H:%M")
    except:
        return "N/A"

@admin_bp.route('/api/comments')
def api_comments():
    if "admin" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        comments = get_all_comments()
        return jsonify({
            "status": "success",
            "comments": comments
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@admin_bp.route('/mark_comment_read/<comment_id>', methods=['POST'])
def mark_comment_read(comment_id):
    if "admin" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        server = couchdb.Server(COUCHDB_URL)
        db = server['comments']
        comment = db.get(comment_id)
        
        if not comment:
            return jsonify({"error": "Comment not found"}), 404
            
        comment['status'] = 'read'
        db.save(comment)
        
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500