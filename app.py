from flask import Flask, request, jsonify, render_template, redirect, url_for, session, flash
from db import ajouter_utilisateur, verifier_utilisateur, save_prediction, get_all_predictions, get_patients, save_comment, get_all_comments 
import pickle
import numpy as np
from werkzeug.security import generate_password_hash, check_password_hash
import datetime
from scipy.signal import find_peaks
from admin import admin_bp
import couchdb
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
import json
import os
from PIL import Image
from io import BytesIO  # Correction ici
import joblib
import time
import stripe
from werkzeug.utils import secure_filename
from flask_cors import CORS
import cv2
import tempfile
import base64
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from imblearn.over_sampling import RandomOverSampler
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.utils import to_categorical
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)



app = Flask(__name__)
app.secret_key = "supersecretkey"
CORS(app)


# Enregistrement du blueprint admin
app.register_blueprint(admin_bp)

# Configuration CouchDB
COUCHDB_URL = "http://admin:123456@localhost:5984/"
DB_NAME = "patient"


# Configuration des uploads
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
app.config['UPLOAD_FOLDER'] = tempfile.gettempdir()
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5MB max

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def validate_liver_image(image_path):
    try:
        img = cv2.imread(image_path)
        if img is None:
            return False, "Impossible de lire l'image"
        
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        hist = cv2.calcHist([gray], [0], None, [256], [0,256])
        peaks, _ = find_peaks(hist.flatten(), height=1000, distance=50)
        
        if len(peaks) < 2:
            return False, "Distribution de couleurs atypique pour une image hépatique"
            
        return True, "Image hépatique valide"
        
    except Exception as e:
        return False, f"Erreur de validation: {str(e)}"

# Chemin vers les modèles
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, 'models')

def load_models():
    models = {
        'main_model': None,
        'liver_model': None,
        'label_encoder': None,
        'label_encoder_improved': None
    }

    try:
        # Modèle principal
        main_model_path = os.path.join(MODELS_DIR, 'best_cnn_model.h5')
        if os.path.exists(main_model_path):
            models['main_model'] = load_model(main_model_path)
            logger.info("✅ Modèle principal chargé")

        # Modèle pour échographies
        liver_model_path = os.path.join(MODELS_DIR, 'liver_model_improved.h5')
        if os.path.exists(liver_model_path):
            models['liver_model'] = load_model(liver_model_path)
            logger.info("✅ Modèle pour échographies chargé")

        # Encodeurs de labels
        label_encoder_path = os.path.join(MODELS_DIR, 'label_encoder.joblib')
        if os.path.exists(label_encoder_path):
            models['label_encoder'] = joblib.load(label_encoder_path)
            logger.info("✅ Label encoder chargé")

        label_encoder_improved_path = os.path.join(MODELS_DIR, 'label_encoder_improved.joblib')
        if os.path.exists(label_encoder_improved_path):
            models['label_encoder_improved'] = joblib.load(label_encoder_improved_path)
            logger.info("✅ Label encoder amélioré chargé")

    except Exception as e:
        logger.error(f"Erreur de chargement : {str(e)}")
        try:
            if models['main_model'] is None and os.path.exists(main_model_path):
                models['main_model'] = load_model(main_model_path, compile=False)
        except Exception as e:
            logger.critical(f"Échec critique : {str(e)}")

    return models

MODELS = load_models()



# Identifiants admin
ADMIN_EMAIL = "admin@gmail.com"
ADMIN_PASSWORD = "123456"


def calculate_mean(predictions, feature, sick=True):
    """
    Calcule la moyenne d'une caractéristique pour les patients malades ou sains
    
    Args:
        predictions: Liste des prédictions
        feature: Nom de la caractéristique à calculer (ex: 'Total_Bilirubin')
        sick: Si True, calcule pour les malades, sinon pour les sains
    
    Returns:
        float: La moyenne de la caractéristique
    """
    # Récupère les valeurs de la caractéristique pour les prédictions correspondantes
    values = [
        float(p['form_data'].get(feature, 0))  # Convertit en float pour être sûr
        for p in predictions 
        if ("détecté" in p.get("result", "")) == sick
        and feature in p['form_data']  # Vérifie que la caractéristique existe
    ]
    
    # Calcule la moyenne si on a des valeurs, sinon retourne 0
    return sum(values) / len(values) if values else 0


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/register', methods=['POST'])
def register():
    firstname = request.form.get("firstname")
    lastname = request.form.get("lastname")
    email = request.form.get("email")
    password = request.form.get("password")

    if not all([firstname, lastname, email, password]):
        flash("Tous les champs sont requis", "error")
        return redirect(url_for('index'))

    result = ajouter_utilisateur(firstname, lastname, email, password)
    
    if result["status"] == "success":
        flash("Inscription réussie! Veuillez vous connecter", "success")
        return redirect(url_for('index'))
    else:
        flash(result.get("message", "Erreur lors de l'inscription"), "error")
        return redirect(url_for('index'))


@app.route('/login', methods=['POST'])
def login():
    email = request.form.get("username")
    password = request.form.get("password")

    if email == ADMIN_EMAIL and password == ADMIN_PASSWORD:
        session["admin"] = True
        session.pop("patient", None)
        return redirect(url_for('admin.admin_dashboard'))

    user = verifier_utilisateur(email, password)
    if user:
        session["patient"] = user["_id"]
        session["patient_name"] = f"{user['firstname']} {user['lastname']}"
        session["patient_email"] = user["email"]
        session.pop("admin", None)
        return redirect(url_for('payment'))  # Rediriger vers payment au lieu de patient
    
    return render_template("index.html", error="Email ou mot de passe incorrect.")


@app.route("/admin")
def admin_dashboard():
    if "admin" not in session:
        return redirect(url_for("index"))
    
    try:
        patients = get_patients()
        predictions = get_all_predictions()
        
        # Calcul des métriques avancées
        true_pos = sum(1 for p in predictions if "détecté" in p.get("result", "") and p.get("form_data", {}).get("Diagnosis") == 1)
        false_pos = sum(1 for p in predictions if "détecté" in p.get("result", "") and p.get("form_data", {}).get("Diagnosis") == 0)
        true_neg = sum(1 for p in predictions if "santé" in p.get("result", "") and p.get("form_data", {}).get("Diagnosis") == 0)
        false_neg = sum(1 for p in predictions if "santé" in p.get("result", "") and p.get("form_data", {}).get("Diagnosis") == 1)
        
        # Calcul des moyennes des caractéristiques
        features = [
            'Total_Bilirubin', 'Alkaline_Phosphotase', 
            'Alamine_Aminotransferase', 'Aspartate_Aminotransferase',
            'Albumin'
        ]
        
        feature_means = {}
        for feature in features:
            feature_means[feature] = {
                'sick': calculate_mean(predictions, feature, sick=True),
                'healthy': calculate_mean(predictions, feature, sick=False)
            }
        
        # Calcul des métriques de performance
        accuracy = (true_pos + true_neg) / len(predictions) if predictions else 0
        precision = true_pos / (true_pos + false_pos) if (true_pos + false_pos) > 0 else 0
        recall = true_pos / (true_pos + false_neg) if (true_pos + false_neg) > 0 else 0
        f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        
        stats = {
            "total_patients": len(patients),
            "total_predictions": len(predictions),
            "malades": sum(1 for p in predictions if "détecté" in p.get("result", "")),
            "sains": sum(1 for p in predictions if "santé" in p.get("result", "")),
            "confusion_matrix": {
                "true_pos": true_pos,
                "false_pos": false_pos,
                "true_neg": true_neg,
                "false_neg": false_neg
            },
            "model_metrics": {
                "accuracy": accuracy,
                "precision": precision,
                "recall": recall,
                "f1_score": f1_score,
                "auc": 0.85  # Valeur à calculer ou récupérer de votre modèle
            },
            "feature_means": feature_means  # Ajout des moyennes des caractéristiques
        }
        
        return render_template("admin.html",
                            patients=patients,
                            predictions=predictions,
                            stats=stats)
    
    except Exception as e:
        print(f"Erreur dans admin_dashboard: {str(e)}")
        return render_template("admin.html",
                            patients=[],
                            predictions=[],
                            stats={})
                            
@app.route('/patient')
def patient():
    if "patient" not in session:
        return redirect(url_for("index"))
    
    try:
        server = couchdb.Server(COUCHDB_URL)
        if DB_NAME not in server:
            return "Base de données non trouvée", 500
            
        db = server[DB_NAME]
        patient = db.get(session['patient'])
        
        if not patient:
            return redirect(url_for("logout"))
            
        return render_template('patient.html',
                            patient_name=session.get("patient_name"),
                            patient=patient)
                            
    except Exception as e:
        print(f"Erreur: {str(e)}")
        return redirect(url_for("index"))
                            
    except Exception as e:
        print(f"Erreur: {str(e)}")
        return redirect(url_for("index"))

@app.template_filter('format_date')
def format_date_filter(timestamp):
    if not timestamp:
        return "N/A"
    try:
        dt = datetime.datetime.fromisoformat(timestamp)
        return dt.strftime("%d/%m/%Y %H:%M")
    except:
        return "N/A"



@app.route("/logout")
def logout():
    redirect_url = request.args.get('redirect')
    session.pop("admin", None)
    session.pop("patient", None)
    session.pop("patient_name", None)
    session.pop("patient_email", None)
    return redirect(redirect_url) if redirect_url else redirect(url_for("index"))

@app.route('/patient/predict', methods=['POST'])
def predict():
    logger.debug("Début de la prédiction")
    try:
        if "patient" not in session:
            return jsonify({"error": "Non autorisé"}), 401

        data = request.form
        
        # Validation des données
        try:
            features = [
                float(data['Age']),
                int(data['Gender']),
                float(data['Total_Bilirubin']),
                float(data['Direct_Bilirubin']),
                int(data['Alkaline_Phosphotase']),
                int(data['Alamine_Aminotransferase']),
                int(data['Aspartate_Aminotransferase']),
                float(data['Total_Protiens']),
                float(data['Albumin']),
                float(data['Albumin_and_Globulin_Ratio'])
            ]
        except (KeyError, ValueError) as e:
            return jsonify({"error": f"Données invalides: {str(e)}"}), 400

        # Chargement du modèle
        try:
            with open('Liver4.pkl', 'rb') as file:
                model = pickle.load(file)
        except Exception as e:
            return jsonify({"error": f"Erreur chargement modèle: {str(e)}"}), 500

        # Prédiction
        values = np.array([features])
        prediction = model.predict(values)[0]
        confidence = np.max(model.predict_proba(values)) * 100

                # Résultat
        result_message = "Aucun signe de maladie hépatique détecté." if prediction == 0 else "Présence de signes d'une maladie hépatique détectée."
        
        
        # Préparation des données à sauvegarder
        form_data = {
            'Age': data['Age'],
            'Gender': data['Gender'],
            'Total_Bilirubin': data['Total_Bilirubin'],
            'Direct_Bilirubin': data['Direct_Bilirubin'],
            'Alkaline_Phosphotase': data['Alkaline_Phosphotase'],
            'Alamine_Aminotransferase': data['Alamine_Aminotransferase'],
            'Aspartate_Aminotransferase': data['Aspartate_Aminotransferase'],
            'Total_Protiens': data['Total_Protiens'],
            'Albumin': data['Albumin'],
            'Albumin_and_Globulin_Ratio': data['Albumin_and_Globulin_Ratio'],
            'Model_Used': 'Random Forest'
        }
        
        # Enregistrement avant de retourner la réponse
        save_success = save_prediction(
            user_id=session["patient"],
            username=session.get("patient_name", "Inconnu"),
            email=session.get("patient_email", ""),
            result=result_message,
            form_data=form_data
        )
        
        if not save_success:
            return jsonify({"error": "Erreur lors de la sauvegarde", "status": "error"}), 500

        response_data = {
            "result_message": result_message,
            "prediction": int(prediction),
            "confidence_score": float(confidence),
            "patient_data": {
                "Total_Bilirubin": float(data['Total_Bilirubin']),
                "Direct_Bilirubin": float(data['Direct_Bilirubin']),
                "Alkaline_Phosphotase": int(data['Alkaline_Phosphotase']),
                "Alamine_Aminotransferase": int(data['Alamine_Aminotransferase']),
                "Aspartate_Aminotransferase": int(data['Aspartate_Aminotransferase']),
                "Albumin": float(data['Albumin']),
                "Total_Protiens": float(data['Total_Protiens']),
                "Albumin_and_Globulin_Ratio": float(data['Albumin_and_Globulin_Ratio'])
            },
            "status": "success"
        }
        
        return jsonify(response_data)

    except Exception as e:
        print(f"Erreur prédiction: {str(e)}")
        return jsonify({
            "error": "Erreur lors de la prédiction",
            "details": str(e),
            "status": "error"
        }), 500

@app.route('/api/predictions', methods=['GET'])
def api_predictions():
    """Endpoint API pour récupérer les prédictions"""
    try:
        predictions = get_all_predictions()
        return jsonify({
            "status": "success",
            "predictions": predictions
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/api/prediction/<prediction_id>', methods=['GET'])
def get_prediction_details(prediction_id):
    if "admin" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    try:
        server = couchdb.Server(COUCHDB_URL)
        pred = server['prediction'].get(prediction_id)
        if pred:
            return jsonify({
                "_id": prediction_id,
                "username": pred.get("username", "Inconnu"),
                "email": pred.get("email", ""),
                "result": pred.get("result", ""),
                "timestamp": pred.get("timestamp", ""),
                "form_data": pred.get("form_data", {})
            })
        return jsonify({"error": "Prediction not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/save_comment', methods=['POST'])
def save_comment_route():
    if "patient" not in session:
        return jsonify({"status": "error", "message": "Non autorisé"}), 401
    
    try:
        data = request.get_json()
        message = data.get('message', '').strip()
        
        if not message:
            return jsonify({"status": "error", "message": "Message vide"}), 400
            
        success = save_comment(
            session["patient"],
            session.get("patient_name", "Anonyme"),
            message
        )
        
        if success:
            return jsonify({"status": "success", "message": "Commentaire enregistré"})
        else:
            return jsonify({"status": "error", "message": "Erreur lors de l'enregistrement"}), 500
            
    except Exception as e:
        print(f"Error in save_comment_route: {str(e)}")
        return jsonify({"status": "error", "message": "Erreur serveur"}), 500
    

@app.route('/get_comments')
def get_comments():
    if 'admin' not in session:
        return jsonify({"status": "error", "message": "Non autorisé"}), 401
    
    try:
        server = couchdb.Server(COUCHDB_URL)
        db = server['comments']
        comments = [dict(doc) for doc in db.view('_all_docs', include_docs=True)['rows']]
        return jsonify({"status": "success", "comments": comments})
    except Exception as e:
        print(f"Erreur: {str(e)}")
        return jsonify({"status": "error", "message": "Erreur serveur"}), 500

@app.route('/update_account', methods=['POST'])
def update_account():
    if 'patient' not in session:
        return jsonify({"error": "Non autorisé"}), 401
    
    try:
        data = request.get_json()
        
        # Validation minimale
        if not all(key in data for key in ['firstname', 'lastname', 'email']):
            return jsonify({"error": "Données manquantes"}), 400

        # Connexion à CouchDB
        server = couchdb.Server(COUCHDB_URL)
        db = server[DB_NAME]
        
        # Récupération ET vérification du document
        patient = db.get(session['patient'])
        if not patient:
            return jsonify({"error": "Patient non trouvé"}), 404

        # Mise à jour des champs
        patient['firstname'] = data['firstname']
        patient['lastname'] = data['lastname']
        patient['email'] = data['email']
        
        # Sauvegarde avec vérification
        db.save(patient)
        
        # Mise à jour de la session
        session['patient_name'] = f"{data['firstname']} {data['lastname']}"
        session['patient_email'] = data['email']
        
        return jsonify({
            "success": True,
            "message": "Compte mis à jour",
            "updated_data": data
        })
        
    except Exception as e:
        print(f"Erreur update_account: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/update_password', methods=['POST'])
def update_password():
    if 'patient' not in session:
        return jsonify({"error": "Non autorisé"}), 401
    
    try:
        data = request.get_json()
        
        # Vérification des champs requis
        if not all(key in data for key in ['oldPassword', 'newPassword']):
            return jsonify({"error": "Données manquantes"}), 400
            
        # Connexion à la base de données
        server = couchdb.Server(COUCHDB_URL)
        db = server[DB_NAME]
        patient = db.get(session['patient'])
        
        if not patient:
            return jsonify({"error": "Patient non trouvé"}), 404
            
        # Vérification de l'ancien mot de passe
        if not check_password_hash(patient['password'], data['oldPassword']):
            return jsonify({"error": "Mot de passe actuel incorrect"}), 400
            
        # Validation du nouveau mot de passe
        if len(data['newPassword']) < 8:
            return jsonify({"error": "Le mot de passe doit contenir au moins 8 caractères"}), 400
            
        # Vérification de la complexité
        if not any(c.isupper() for c in data['newPassword']):
            return jsonify({"error": "Le mot de passe doit contenir au moins une majuscule"}), 400
            
        if not any(c.isdigit() for c in data['newPassword']):
            return jsonify({"error": "Le mot de passe doit contenir au moins un chiffre"}), 400
            
        # Hachage et mise à jour du mot de passe
        patient['password'] = generate_password_hash(data['newPassword'])
        
        # Sauvegarde avec vérification de la révision
        db.save(patient)
        
        return jsonify({
            "success": True,
            "message": "Mot de passe mis à jour avec succès"
        })
        
    except couchdb.http.ResourceConflict:
        return jsonify({"error": "Conflit de version, veuillez réessayer"}), 409
    except Exception as e:
        print(f"Erreur lors de la mise à jour du mot de passe: {str(e)}")
        return jsonify({"error": "Erreur serveur"}), 500

@app.route('/delete_account', methods=['POST'])
def delete_account():
    if 'patient' not in session:
        return jsonify({"error": "Non autorisé"}), 401
    
    try:
        data = request.get_json()
        if not data or 'password' not in data:
            return jsonify({"error": "Mot de passe requis"}), 400

        server = couchdb.Server(COUCHDB_URL)
        patient_db = server['patient']
        prediction_db = server['prediction']

        # Vérifier le mot de passe
        patient = patient_db.get(session['patient'])
        if not patient:
            return jsonify({"error": "Compte non trouvé"}), 404
            
        if not check_password_hash(patient['password'], data['password']):
            return jsonify({"error": "Mot de passe incorrect"}), 401

        # Suppression en cascade
        # 1. Supprimer les prédictions
        for pred in prediction_db.find({'selector': {'user_id': session['patient']}}):
            prediction_db.delete(pred)
            
        # 2. Supprimer le compte
        patient_db.delete(patient)
        
        return jsonify({
            "success": True,
            "message": "Compte supprimé avec succès",
            "redirect": url_for('logout')
        })
        
    except Exception as e:
        print(f"ERREUR SUPPRESSION: {str(e)}")
        return jsonify({"error": str(e)}), 500


# Exemple d'utilisation dans une route Flask
@app.route('/analyze', methods=['POST'])
def analyze():
    if MODELS['main_model'] is None:
        return jsonify({"error": "Modèle non disponible"}), 503
    
    try:
        # Votre logique de prédiction ici
        prediction = MODELS['main_model'].predict(...)
        return jsonify({"prediction": prediction.tolist()})
    except Exception as e:
        logger.error(f"Erreur de prédiction : {str(e)}")
        return jsonify({"error": "Erreur de traitement"}), 500


RESULTS_MAP = {
    "Malignant": {
        "diagnosis": "Anomalie maligne détectée",
        "icon": "⚠️",
        "color": "red",
        "recommendation": "Consultez un hépatologue rapidement.",
        "severity": "high"
    },
    "Benign": {
        "diagnosis": "Anomalie bénigne détectée", 
        "icon": "🔍",
        "color": "orange",
        "recommendation": "Surveillance recommandée.",
        "severity": "medium"
    },
    "Normal": {
        "diagnosis": "Aucune anomalie détectée",
        "icon": "✅",
        "color": "green",
        "recommendation": "Contrôles réguliers conseillés.",
        "severity": "none"
    }
}

def generate_technical_explanation(pred_mask, pred_class, class_name):
    """Génère une explication technique basée sur les caractéristiques de l'image"""
    mask_array = (pred_mask.squeeze() * 255).astype(np.uint8)
    _, mask_binary = cv2.threshold(mask_array, 127, 255, cv2.THRESH_BINARY)
    
    # Analyse des contours
    contours, _ = cv2.findContours(mask_binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contour_area = cv2.contourArea(contours[0]) if contours else 0
    
    explanation = {
        "Normal": {
            "texture": "Texture homogène typique d'un parenchyme hépatique sain",
            "contours": "Contours nets et réguliers",
            "vascularisation": "Motif vasculaire normal",
            "findings": "Aucune anomalie focale détectée",
            "area": "N/A"
        },
        "Benign": {
            "texture": "Texture légèrement hétérogène avec zones hypoéchogènes",
            "contours": f"Contours partiellement irréguliers (zone: {contour_area/100:.2f} cm²)",
            "vascularisation": "Vascularisation périphérique accrue",
            "findings": "Lésion bénigne probable (kyste, hémangiome)",
            "area": f"{contour_area/100:.2f} cm²"
        },
        "Malignant": {
            "texture": "Texture très hétérogène avec zones nécrotiques",
            "contours": f"Contours spiculés ou mal définis (zone: {contour_area/100:.2f} cm²)",
            "vascularisation": "Vascularisation anarchique centrale",
            "findings": "Lésion suspecte de malignité",
            "area": f"{contour_area/100:.2f} cm²"
        }
    }
    
    return explanation.get(class_name, explanation["Normal"])

@app.route('/analyze_image', methods=['POST'])
def analyze_image():
    response = {"status": "error", "message": "Erreur inconnue"}
    temp_path = None

    try:
        if 'image' not in request.files:
            return jsonify({"status": "error", "message": "Aucun fichier envoyé"}), 400
            
        file = request.files['image']
        if file.filename == '':
            return jsonify({"status": "error", "message": "Aucun fichier sélectionné"}), 400

        if not allowed_file(file.filename):
            return jsonify({"status": "error", "message": "Type de fichier non supporté"}), 400

        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(file.filename))
        file.save(temp_path)

        try:
            img = Image.open(temp_path)
            img.verify()
            img = Image.open(temp_path)
        except Exception as e:
            return jsonify({"status": "error", "message": "Fichier image invalide"}), 400

        img_cv = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
        mean_intensity = np.mean(gray)
        std_dev = np.std(gray)

        target_size = (256, 256)
        img_processed = img.convert('RGB').resize(target_size)
        img_array = np.array(img_processed) / 255.0
        input_data = np.expand_dims(img_array, axis=0)

        if MODELS.get('liver_model') is None:
            return jsonify({"status": "error", "message": "Modèle non disponible"}), 503

        pred_mask, pred_class = MODELS['liver_model'].predict(input_data)
        confidence = float(np.max(pred_class)) * 100
        class_idx = np.argmax(pred_class[0])

        try:
            class_name = str(MODELS['label_encoder_improved'].inverse_transform([class_idx])[0])
        except:
            class_name = f"Unknown_{class_idx}"

        result_info = RESULTS_MAP.get(class_name, {
            "diagnosis": f"Résultat inconnu ({class_name})",
            "icon": "❓",
            "color": "gray",
            "recommendation": "Consultation spécialisée nécessaire.",
            "severity": "unknown"
        })

        # Générer l'explication technique
        tech_details = generate_technical_explanation(pred_mask[0], pred_class[0], class_name)

        response = {
            "status": "success",
            "diagnosis": result_info["diagnosis"],
            "prediction": class_name,
            "confidence": round(confidence, 1),
            "icon": result_info["icon"],
            "color": result_info["color"],
            "recommendation": result_info["recommendation"],
            "severity": result_info["severity"],
            "technical_details": tech_details,
            "image_metrics": {
                "mean_intensity": round(float(mean_intensity), 1),
                "std_dev": round(float(std_dev), 1)
            }
        }

        mask_8bit = (pred_mask[0].squeeze() * 255).astype(np.uint8)
        _, mask_binary = cv2.threshold(mask_8bit, 127, 255, cv2.THRESH_BINARY)
        overlay = cv2.addWeighted(
            cv2.cvtColor(np.array(img_processed), cv2.COLOR_RGB2BGR),
            0.7,
            cv2.cvtColor(mask_binary, cv2.COLOR_GRAY2BGR),
            0.3,
            0
        )
        _, buffer = cv2.imencode('.png', overlay)
        response["overlay_image"] = f"data:image/png;base64,{base64.b64encode(buffer).decode('utf-8')}"

        return jsonify(response), 200

    except Exception as e:
        logger.error(f"Erreur: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass
# Configuration Stripe
STRIPE_PUBLISHABLE_KEY = "pk_test_XXXXXXXXXXXXXXXXXXXX"
stripe.api_key = "sk_test_XXXXXXXXXXXXXXXXXXXXXXXX"

# Configuration des plans d'abonnement (en DZD)
SUBSCRIPTION_PLANS = {
    'monthly': {
        'name': '1 Mois',
        'price': 5000,
        'duration_days': 30,
        'stripe_price_id': 'price_monthly_id'
    },
    'quarterly': {
        'name': '3 Mois',
        'price': 9000,
        'duration_days': 90,
        'stripe_price_id': 'price_quarterly_id'
    },
    'biannual': {
        'name': '6 Mois',
        'price': 13900,
        'duration_days': 180,
        'stripe_price_id': 'price_biannual_id'
    },
    'annual': {
        'name': '1 Année',
        'price': 18000,
        'duration_days': 365,
        'stripe_price_id': 'price_annual_id'
    }
}

@app.route('/payment')
def payment():
    if "patient" not in session:
        return redirect(url_for("index"))
    
    # Vérifier si l'utilisateur a déjà payé
    server = couchdb.Server(COUCHDB_URL)
    if 'subscriptions' not in server:
        db = server.create('subscriptions')
    else:
        db = server['subscriptions']
    
    # Vérifier si l'utilisateur a un abonnement actif
    subscription = None
    for doc in db.view('_all_docs', include_docs=True):
        if doc['doc'].get('user_id') == session['patient'] and doc['doc'].get('status') == 'active':
            subscription = doc['doc']
            break
    
    if subscription:
        return redirect(url_for('patient'))
    
    return render_template('payment.html', plans=SUBSCRIPTION_PLANS, stripe_key=STRIPE_PUBLISHABLE_KEY)

@app.route('/process-payment', methods=['POST'])
def process_payment():
    if "patient" not in session:
        return jsonify({"error": "Non autorisé"}), 401
    
    try:
        data = request.get_json()
        plan_id = data.get('plan_id')
        
        if plan_id not in SUBSCRIPTION_PLANS:
            return jsonify({'error': 'Plan invalide'}), 400
        
        plan = SUBSCRIPTION_PLANS[plan_id]
        user_id = session['patient']
        
        # Enregistrer l'abonnement dans CouchDB
        server = couchdb.Server(COUCHDB_URL)
        if 'subscriptions' not in server:
            db = server.create('subscriptions')
        else:
            db = server['subscriptions']
        
        subscription_data = {
            'type': 'subscription',
            'user_id': user_id,
            'plan_id': plan_id,
            'plan_name': plan['name'],
            'amount': plan['price'],
            'currency': 'DZD',
            'start_date': datetime.datetime.now().isoformat(),
            'end_date': (datetime.datetime.now() + datetime.timedelta(days=plan['duration_days'])).isoformat(),
            'status': 'active'
        }
        
        db.save(subscription_data)
        
        return jsonify({
            'success': True,
            'message': f'Abonnement {plan["name"]} activé avec succès!',
            'redirect': url_for('patient')
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/check-subscription')
def check_subscription():
    if "patient" not in session:
        return jsonify({"error": "Non autorisé"}), 401
    
    server = couchdb.Server(COUCHDB_URL)
    if 'subscriptions' not in server:
        return jsonify({'active': False})
    
    db = server['subscriptions']
    for doc in db.view('_all_docs', include_docs=True):
        if doc['doc'].get('user_id') == session['patient'] and doc['doc'].get('status') == 'active':
            return jsonify({'active': True})
    
    return jsonify({'active': False})

if __name__ == '__main__':
    app.run(debug=True)     

