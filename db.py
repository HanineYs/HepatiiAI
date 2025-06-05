import couchdb
import datetime
from werkzeug.security import generate_password_hash, check_password_hash
import re  # Module pour les expressions régulières
import uuid
import time  # Ajoutez cette ligne avec les autres imports
# Configuration de CouchDB
COUCHDB_USER = "admin"
COUCHDB_PASSWORD = "123456"
COUCHDB_URL = f"http://{COUCHDB_USER}:{COUCHDB_PASSWORD}@127.0.0.1:5984/"

# Connexion à la base principale `patient`
def connect_main_db():
    try:
        server = couchdb.Server(COUCHDB_URL)
        DB_NAME = "patient"

        if DB_NAME not in server:
            db = server.create(DB_NAME)
            print(f"🆕 Base de données créée : {DB_NAME}")
        else:
            db = server[DB_NAME]
            print(f"✅ Connexion réussie à CouchDB : {DB_NAME}")

        return db
    except Exception as e:
        print(f"❌ Erreur de connexion à CouchDB : {e}")
        return None

# Fonction pour valider la complexité du mot de passe
def valider_mot_de_passe(password):
    """
    Valide que le mot de passe respecte les règles de complexité :
    - Au moins 8 caractères
    - Au moins une majuscule
    - Au moins une minuscule
    - Au moins un chiffre
    - Au moins un symbole
    """
    if len(password) < 8:
        return "Le mot de passe doit contenir au moins 8 caractères."
    if not re.search("[A-Z]", password):
        return "Le mot de passe doit contenir au moins une majuscule."
    if not re.search("[a-z]", password):
        return "Le mot de passe doit contenir au moins une minuscule."
    if not re.search("[0-9]", password):
        return "Le mot de passe doit contenir au moins un chiffre."
    if not re.search("[!@#$%^&*]", password):
        return "Le mot de passe doit contenir au moins un symbole (!@#$%^&*)."
    return None  # Aucune erreur, le mot de passe est valide

# Ajouter un utilisateur
def ajouter_utilisateur(firstname, lastname, email, password):
    db = connect_main_db()
    if db is None:
        return {"status": "error", "message": "Impossible de se connecter à la base"}

    # Vérifier si l'utilisateur existe déjà
    for row in db.view('_all_docs', include_docs=True):
        if 'doc' in row and row['doc'].get("email") == email:
            return {"status": "error", "message": "Cet email est déjà utilisé"}

    # Valider la complexité du mot de passe
    erreur_mot_de_passe = valider_mot_de_passe(password)
    if erreur_mot_de_passe:
        return {"status": "error", "message": erreur_mot_de_passe}

    # Hacher le mot de passe avant de l'enregistrer
    hashed_password = generate_password_hash(password)

    user_data = {
        "type": "user",
        "firstname": firstname,
        "lastname": lastname,
        "email": email,
        "password": hashed_password
    }
    
    user_id, rev = db.save(user_data)
    print(f"✅ Utilisateur ajouté : {user_id}")
    
    return {"status": "success", "message": "Utilisateur inscrit avec succès"}

# Vérifier les informations d'identification de l'utilisateur
def verifier_utilisateur(email, password):
    db = connect_main_db()
    if db is None:
        return None

    # Rechercher l'utilisateur par email
    for row in db.view('_all_docs', include_docs=True):
        if 'doc' in row and row['doc'].get("email") == email:
            user = row['doc']
            # Vérifier le mot de passe haché
            if check_password_hash(user.get("password"), password):
                return user
    return None

# Connexion à la base de données `prediction`
def connect_prediction_db():
    try:
        server = couchdb.Server(COUCHDB_URL)
        DB_NAME = "prediction"

        if DB_NAME not in server:
            db = server.create(DB_NAME)
            print(f"🆕 Base de données créée : {DB_NAME}")
        else:
            db = server[DB_NAME]
            print(f"✅ Connexion réussie à CouchDB : {DB_NAME}")

        return db
    except Exception as e:
        print(f"❌ Erreur de connexion à CouchDB : {e}")
        return None

# Enregistrer une prédiction
# Dans db.py, modifier save_prediction pour générer aléatoirement un diagnostic
def save_prediction(user_id, username, email, result, form_data=None, true_diagnosis=None):
    try:
        db = connect_prediction_db()
        if not db:
            return False

        # Estimation du diagnostic réel si non fourni
        if true_diagnosis is None:
            true_diagnosis = estimate_true_diagnosis(form_data)

        doc = {
            'type': 'prediction',
            'user_id': user_id,
            'username': username,
            'email': email,
            'result': str(result).strip(),
            'prediction_value': 1 if "détecté" in result.lower() else 0,
            'timestamp': datetime.datetime.now().isoformat(),
            'form_data': form_data,
            'true_diagnosis': true_diagnosis,  # Orthographe corrigée
            'model_used': form_data.get('model_type', 'rf')
        }

        db.save(doc)
        return True
    except Exception as e:
        print(f"Erreur save_prediction: {str(e)}")
        return False

def estimate_true_diagnosis(form_data):
    """Estime le diagnostic réel basé sur les valeurs médicales"""
    if not form_data:
        return 0
        
    # Seuils médicaux pour estimation
    thresholds = {
        'Total_Bilirubin': 1.2,
        'Alamine_Aminotransferase': 56,
        'Aspartate_Aminotransferase': 40,
        'Albumin': 3.5
    }
    
    abnormal_count = 0
    for param, threshold in thresholds.items():
        if float(form_data.get(param, 0)) > threshold:
            abnormal_count += 1
    
    return 1 if abnormal_count >= 2 else 0  # Si au moins 2 paramètres anormaux

def get_all_predictions():
    """Récupère toutes les prédictions avec les détails complets"""
    db = connect_prediction_db()
    if not db:
        return []
    
    predictions = []
    for row in db.view('_all_docs', include_docs=True):
        doc = row.get('doc', {})
        if doc.get('type') == 'prediction':
            # Récupérer l'email depuis la prédiction ou depuis la table patient si manquant
            email = doc.get('email')  # <-- Définition de la variable email
            
            if not email:
                # Si l'email n'est pas dans la prédiction, le chercher dans la table patient
                user_id = doc.get('user_id')
                patient_db = connect_main_db()
                if patient_db and user_id:
                    try:
                        patient = patient_db.get(user_id)
                        email = patient.get('email', 'Email non trouvé')
                    except:
                        email = 'Email non disponible'
            
            # Assurez-vous que le timestamp n'est pas None
            timestamp = doc.get('timestamp')
            if timestamp is None:
                timestamp = datetime.datetime.now().isoformat()
            
            prediction = {
                '_id': doc.get('_id'),
                'user_id': doc.get('user_id'),
                'username': doc.get('username', 'Inconnu'),
                'email': email or 'Non spécifié',  # <-- Utilisation sécurisée
                'result': doc.get('result', 'N/A'),
                'timestamp': timestamp,
                'form_data': doc.get('form_data', {})
            }
            predictions.append(prediction)
    
    # Tri sécurisé avec gestion des None
    return sorted(
        predictions,
        key=lambda x: x.get('timestamp') or '',
        reverse=True
    )

def get_patient_predictions(user_id):
    """Récupère les prédictions d'un patient spécifique"""
    db = connect_prediction_db()
    if not db:
        return []
    
    return [row['doc'] for row in db.view('_all_docs', include_docs=True)
           if row.get('doc', {}).get('user_id') == user_id]

def get_patients():
    """Récupère tous les patients depuis la base 'patient'"""
    try:
        server = couchdb.Server(COUCHDB_URL)
        if 'patient' not in server:
            return []
        
        db = server['patient']
        patients = []
        
        for doc_id in db:
            doc = db[doc_id]
            if doc.get('type') == 'user':
                patients.append({
                    '_id': doc_id,
                    'firstname': doc.get('firstname', ''),
                    'lastname': doc.get('lastname', ''),
                    'email': doc.get('email', ''),
                    'created_at': doc.get('created_at', '')
                })
        return patients
    
    except Exception as e:
        print(f"Erreur lors de la récupération des patients: {str(e)}")
        return []


def get_all_predictions():
    """Récupère toutes les prédictions avec jointure des données patient"""
    pred_db = connect_prediction_db()
    patient_db = connect_main_db()
    if not pred_db:
        return []
    
    predictions = []
    for doc_id in pred_db:
        pred = pred_db.get(doc_id)
        if pred.get('type') == 'prediction':
            # Récupération infos patient
            user_info = {'username': 'Inconnu', 'email': 'Non spécifié'}
            if 'user_id' in pred and patient_db:
                patient = patient_db.get(pred['user_id'], {})
                user_info = {
                    'username': f"{patient.get('firstname', '')} {patient.get('lastname', '')}",
                    'email': patient.get('email', '')
                }
            
            predictions.append({
                '_id': doc_id,
                'user_id': pred.get('user_id'),
                'username': pred.get('username') or user_info['username'],
                'email': pred.get('email') or user_info['email'],
                'result': pred.get('result', 'N/A'),
                'timestamp': pred.get('timestamp', ''),
                'form_data': pred.get('form_data', {})
            })
    
    # Tri par timestamp (ignore les entrées sans timestamp)
    return sorted(
        [p for p in predictions if p['timestamp']],
        key=lambda x: x['timestamp'],
        reverse=True
    )           
def get_actual_diagnosis(user_id):
    """Récupère le diagnostic réel depuis les données patient"""
    try:
        server = couchdb.Server(COUCHDB_URL)
        patient = server['patient'].get(user_id)
        return patient.get('diagnosis', 0)  # 0 par défaut si non spécifié
    except:
        return 0

def update_patient_infos_in_predictions(user_id, new_username, new_email):
    try:
        server = couchdb.Server(COUCHDB_URL)
        if 'prediction' not in server:
            return False
            
        pred_db = server['prediction']
        
        updated_count = 0
        for doc_id in pred_db:
            doc = pred_db.get(doc_id)
            if doc and doc.get('user_id') == user_id:
                doc['username'] = new_username
                doc['email'] = new_email
                try:
                    pred_db.save(doc)
                    updated_count += 1
                except Exception as e:
                    print(f"Erreur lors de la sauvegarde du doc {doc_id}: {str(e)}")
                    continue
                
        print(f"Mise à jour de {updated_count} prédictions")
        return updated_count > 0
    except Exception as e:
        print(f"Erreur update_patient_infos: {str(e)}")
        return False

# Connexion à la base de données des commentaires
def connect_comments_db():
    try:
        server = couchdb.Server(COUCHDB_URL)
        DB_NAME = "comments"
        
        if DB_NAME not in server:
            print(f"🆕 Création de la base {DB_NAME}...")
            db = server.create(DB_NAME)
        else:
            db = server[DB_NAME]
            
        print(f"✅ Connexion à {DB_NAME} établie")
        return db
        
    except Exception as e:
        print(f"❌ Erreur de connexion à la base comments: {str(e)}")
        return None


# Sauvegarder un commentaire
def save_comment(patient_id, patient_name, message):
    """Version optimisée et robuste pour enregistrer des commentaires"""
    try:
        # 1. Validation des entrées
        if not all([patient_id, patient_name, message]):
            print("❌ Données manquantes pour enregistrer le commentaire")
            return False

        # 2. Connexion à CouchDB
        server = couchdb.Server(COUCHDB_URL)
        try:
            server.version()  # Test de connexion
        except Exception as e:
            print(f"❌ Échec de connexion à CouchDB: {str(e)}")
            return False

        # 3. Accès à la base 'comments'
        try:
            if 'comments' not in server:
                db = server.create('comments')
                print("🆕 Base 'comments' créée")
            else:
                db = server['comments']
        except Exception as e:
            print(f"❌ Échec d'accès à la base 'comments': {str(e)}")
            return False

        # 4. Création du document
        doc_id = f"comment_{patient_id}_{int(time.time())}"
        doc = {
            '_id': doc_id,
            'type': 'comment',
            'patient_id': str(patient_id),
            'patient_name': str(patient_name),
            'message': str(message),
            'timestamp': datetime.datetime.now().isoformat(),
            'status': 'unread'
        }

        # 5. Sauvegarde
        try:
            db.save(doc)
            print(f"✅ Commentaire enregistré (ID: {doc_id})")
            return True
        except couchdb.http.ResourceConflict:
            print("❌ Conflit de version (document peut-être déjà existant)")
            return False
        except Exception as e:
            print(f"❌ Échec de sauvegarde: {str(e)}")
            return False
            
    except Exception as e:
        print(f"❌ Erreur inattendue dans save_comment: {type(e).__name__}: {str(e)}")
        return False
    
def get_all_comments():
    """Récupère tous les commentaires avec jointure des données patient"""
    try:
        server = couchdb.Server(COUCHDB_URL)
        if 'comments' not in server:
            return []
        
        db = server['comments']
        comments = []
        
        for doc_id in db:
            doc = db.get(doc_id)
            if doc and doc.get('type') == 'comment':
                # Formatage des données pour l'affichage
                comments.append({
                    '_id': doc_id,
                    'patient_id': doc.get('patient_id', ''),
                    'patient_name': doc.get('patient_name', 'Anonyme'),
                    'message': doc.get('message', ''),
                    'timestamp': doc.get('timestamp', ''),
                    'status': doc.get('status', 'unread')
                })
        
        # Tri par date (plus récent en premier)
        return sorted(
            comments,
            key=lambda x: x.get('timestamp', ''),
            reverse=True
        )
    
    except Exception as e:
        print(f"Erreur lors de la récupération des commentaires: {str(e)}")
        return []






