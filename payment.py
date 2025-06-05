from flask import Flask, render_template, request, jsonify, redirect, url_for, session
import stripe
import os
from datetime import datetime, timedelta
import secrets
import hashlib
import re
from functools import wraps
from db import db_manager  # Importez le gestionnaire CouchDB

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)

# Configuration Stripe
stripe.api_key = "sk_test_XXXXXXXXXXXXXXXXXXXXXXXX"
STRIPE_PUBLISHABLE_KEY = "pk_test_XXXXXXXXXXXXXXXXXXXX"

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

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def index():
    return render_template('payment.html')

@app.route('/subscription')
@login_required
def subscription_page():
    user_id = session.get('user_id')
    current_subscription = db_manager.get_user_subscription(user_id)
    
    return render_template('payment.html',
                         current_subscription=current_subscription,
                         plans=SUBSCRIPTION_PLANS,
                         stripe_key=STRIPE_PUBLISHABLE_KEY)

@app.route('/create-payment-intent', methods=['POST'])
@login_required
def create_payment_intent():
    try:
        data = request.get_json()
        plan_id = data.get('plan_id')
        
        if plan_id not in SUBSCRIPTION_PLANS:
            return jsonify({'error': 'Plan invalide'}), 400
        
        plan = SUBSCRIPTION_PLANS[plan_id]
        user_id = session.get('user_id')
        
        # Convertir le prix en centimes pour Stripe (1 DZD = 100 centimes)
        amount = plan['price'] * 100
        
        intent = stripe.PaymentIntent.create(
            amount=amount,
            currency='dzd',
            automatic_payment_methods={
                'enabled': True,
            },
            metadata={
                'user_id': user_id,
                'plan_id': plan_id,
                'plan_name': plan['name']
            }
        )
        
        return jsonify({
            'client_secret': intent.client_secret,
            'amount': plan['price'],
            'plan_name': plan['name']
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/process-payment', methods=['POST'])
@login_required
def process_payment():
    try:
        data = request.get_json()
        plan_id = data.get('plan_id')
        payment_method_id = data.get('payment_method_id')
        email = data.get('email')
        name = data.get('name')
        
        if not all([plan_id, payment_method_id, email, name]):
            return jsonify({'error': 'Données manquantes'}), 400
        
        if plan_id not in SUBSCRIPTION_PLANS:
            return jsonify({'error': 'Plan invalide'}), 400
        
        plan = SUBSCRIPTION_PLANS[plan_id]
        user_id = session.get('user_id')
        
        # Créer ou récupérer le client Stripe
        customer = stripe.Customer.create(
            email=email,
            name=name,
            metadata={'user_id': user_id}
        )
        
        # Attacher le moyen de paiement
        stripe.PaymentMethod.attach(
            payment_method_id,
            customer=customer.id,
        )
        
        # Créer l'abonnement Stripe
        subscription = stripe.Subscription.create(
            customer=customer.id,
            items=[{
                'price': plan['stripe_price_id'],
            }],
            default_payment_method=payment_method_id,
            metadata={
                'user_id': user_id,
                'plan_id': plan_id
            }
        )
        
        # Enregistrer dans CouchDB
        subscription_data = {
            'user_id': user_id,
            'stripe_subscription_id': subscription.id,
            'stripe_customer_id': customer.id,
            'plan_id': plan_id,
            'plan_name': plan['name'],
            'amount': plan['price'],
            'currency': 'DZD',
            'start_date': datetime.now().isoformat(),
            'end_date': (datetime.now() + timedelta(days=plan['duration_days'])).isoformat(),
            'status': 'active',
            'payment_method_id': payment_method_id
        }
        
        db_manager.save_subscription(subscription_data)
        
        return jsonify({
            'success': True,
            'subscription_id': subscription.id,
            'message': f'Abonnement {plan["name"]} activé avec succès!'
        })
        
    except stripe.error.CardError as e:
        return jsonify({'error': f'Erreur de carte: {e.user_message}'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/process-ccp-payment', methods=['POST'])
@login_required
def process_ccp_payment():
    try:
        data = request.get_json()
        plan_id = data.get('plan_id')
        ccp_number = data.get('ccp_number')
        ccp_key = data.get('ccp_key')
        ccp_holder = data.get('ccp_holder')
        
        if not all([plan_id, ccp_number, ccp_key, ccp_holder]):
            return jsonify({'error': 'Tous les champs CCP sont requis'}), 400
            
        plan = SUBSCRIPTION_PLANS.get(plan_id)
        if not plan:
            return jsonify({'error': 'Plan invalide'}), 400
            
        user_id = session.get('user_id')
        
        # Enregistrement dans la base de données
        payment_data = {
            'user_id': user_id,
            'plan_id': plan_id,
            'amount': plan['price'],
            'currency': 'DZD',
            'payment_method': 'CCP',
            'ccp_number': ccp_number,
            'ccp_key': ccp_key,
            'ccp_holder': ccp_holder,
            'status': 'pending',  # En attente de confirmation
            'created_at': datetime.now().isoformat()
        }
        
        # Sauvegarde dans CouchDB
        doc_id = f"ccp_payment_{datetime.now().timestamp()}"
        db_manager.db.save({'_id': doc_id, **payment_data})
        
        return jsonify({
            'success': True,
            'message': 'Paiement par CCP enregistré. Un agent vous contactera pour confirmation.',
            'payment_id': doc_id
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/subscription-status')
@login_required
def subscription_status():
    user_id = session.get('user_id')
    subscription = db_manager.get_user_subscription(user_id)
    
    if subscription:
        return jsonify({
            'active': subscription.get('status') == 'active',
            'plan': subscription.get('plan_name'),
            'end_date': subscription.get('end_date'),
            'status': subscription.get('status')
        })
    else:
        return jsonify({'active': False})

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        if email and password:
            user_id = hashlib.sha256(email.encode()).hexdigest()[:16]
            session['user_id'] = user_id
            return redirect(url_for('subscription_page'))
    
    return '''
    <form method="post">
        <input type="email" name="email" placeholder="Email" required><br>
        <input type="password" name="password" placeholder="Mot de passe" required><br>
        <button type="submit">Se connecter</button>
    </form>
    '''
@app.route('/check-auth')
def check_auth():
    return jsonify({'authenticated': 'user_id' in session})
@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)