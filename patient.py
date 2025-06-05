from flask import Flask, render_template, request, jsonify, session
import numpy as np
import pickle
from db import connect_prediction_db, save_prediction
app = Flask(__name__)
app.secret_key = "secret_key_for_session"  # 🔹 Clé pour stocker les résultats temporairement

# 🔹 Chargement du modèle
model = pickle.load(open('Liver2.pkl', 'rb'))

@app.route('/patient', methods=['GET', 'POST'])
def patient():
    """Affiche la page principale du patient."""
    return render_template('patient.html')

@app.route('/patient/predict', methods=['POST'])
def predict():
    try:
        Age = int(request.form['Age'])
        Gender = int(request.form['Gender'])
        Total_Bilirubin = float(request.form['Total_Bilirubin'])
        Alkaline_Phosphotase = int(request.form['Alkaline_Phosphotase'])
        Alamine_Aminotransferase = int(request.form['Alamine_Aminotransferase'])
        Aspartate_Aminotransferase = int(request.form['Aspartate_Aminotransferase'])
        Total_Protiens = float(request.form['Total_Protiens'])
        Albumin = float(request.form['Albumin'])
        Albumin_and_Globulin_Ratio = float(request.form['Albumin_and_Globulin_Ratio'])

        # Charger le modèle et faire la prédiction
        with open("Liver2.pkl", "rb") as file:
            model = pickle.load(file)

        values = np.array([[Age, Gender, Total_Bilirubin, Alkaline_Phosphotase,
                            Alamine_Aminotransferase, Aspartate_Aminotransferase,
                            Total_Protiens, Albumin, Albumin_and_Globulin_Ratio]])

        prediction = model.predict(values)[0]  # On récupère la première valeur

        # Définition du message de résultat
        result_message = "✅ Vous êtes en bonne santé !" if prediction == 0 else "⚠️ Risque de maladie détecté ! Consultez un médecin."

        # Enregistrer la prédiction dans CouchDB
        if "patient" in session:
            user_id = session["patient"]
            username = session.get("patient_name", "Nom de l'utilisateur")  # Récupérer le nom de l'utilisateur
            email = session.get("patient_email", "email@example.com")  # Récupérer l'email de l'utilisateur
            print("🔄 Tentative d'enregistrement de la prédiction dans CouchDB...")
            save_prediction(user_id, username, email, result_message)
        else:
            print("❌ Aucun utilisateur connecté. La prédiction ne sera pas enregistrée.")

        # Stocker les résultats pour affichage dans "Analytics"
        patient_data = {
            "Total Bilirubin": Total_Bilirubin,
            "Alkaline Phosphotase": Alkaline_Phosphotase,
            "Alamine Aminotransferase": Alamine_Aminotransferase,
            "Aspartate Aminotransferase": Aspartate_Aminotransferase,
            "Albumine": Albumin
        }

        # Retourner les résultats en JSON
        return jsonify({
            "result_message": result_message,
            "prediction": int(prediction),  # Convertir en int Python natif
            "patient_data": patient_data
        })

    except Exception as e:
        print(f"🚨 Erreur interne : {e}")  # Afficher l'erreur exacte
        return jsonify({"error": f"Erreur : {str(e)}"}), 500


@app.route('/predictions', methods=['GET'])
def get_predictions():
    try:
        db = connect_prediction_db()
        if db is None:
            print("❌ Impossible de se connecter à la base de données 'prediction'")
            return jsonify({"status": "error", "message": "Impossible de se connecter à la base de données"}), 500

        predictions = []
        for row in db.view('_all_docs', include_docs=True):
            if 'doc' in row and row['doc'].get("type") == "prediction":
                predictions.append(row['doc'])

        print(f"✅ {len(predictions)} prédictions récupérées")
        return jsonify(predictions)
    except Exception as e:
        print(f"❌ Erreur lors de la récupération des prédictions : {e}")
        return jsonify({"status": "error", "message": str(e)}), 500




if __name__ == '__main__':
    app.run(debug=True)