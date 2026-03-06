"""
BHARAT WARGAME ML ENGINE v2
========================
Multi-model machine learning system for Global strategic conflict simulation.

Models trained:
1. Conflict Outcome Classifier (Random Forest) — Win/Stalemate/Loss
2. Optimal Base Selector (Gradient Boosting) — which bases to activate (Dynamic Global Bases)
3. Casualty/Attrition Regressor (Neural Network MLP) — force attrition %
4. Escalation Risk Classifier (Gradient Boosting) — probability of nuclear escalation
5. Coalition Behavior Predictor (Random Forest) — how third parties respond
6. Duration Estimator (Gradient Boosting Regressor) — conflict days
"""

import numpy as np
import pandas as pd
import json
import pickle
import os
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.neural_network import MLPRegressor, MLPClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, mean_absolute_error, classification_report
import warnings
warnings.filterwarnings('ignore')

np.random.seed(42)

# ============================================================
# FEATURE DEFINITIONS
# ============================================================

SCENARIOS = ['china_taiwan', 'iran_israel', 'india_pakistan', 'russia_nato', 'china_india', 'two_front', 'maritime_ior', 'nuclear_threshold']
SCENARIO_IDX = {s: i for i, s in enumerate(SCENARIOS)}

# Load dynamic bases exported from TypeScript
try:
    with open(os.path.join(os.path.dirname(__file__), 'bases.json'), 'r') as f:
        BASES = json.load(f)
except Exception as e:
    print(f"Warning: Could not load bases.json, using fallback. {e}")
    BASES = ['us_7th_fleet_yokosuka', 'andersen_afb', 'PLA_fuzhou']

FEATURE_NAMES = [
    'scenario_id',
    'air_force_readiness', 'army_readiness', 'navy_readiness', 'missile_readiness',
    'intel_grade', 'cyber_capability', 'logistics_score',
    'adversary_air_power', 'adversary_ground_power', 'adversary_naval_power', 
    'adversary_missile_power', 'adversary_nuclear_posture',
    'terrain_advantage', 'distance_to_objectives', 'supply_line_security',
    'us_support_level', 'russia_support_level', 'china_involvement', 'un_pressure',
    'escalation_posture', 'surprise_factor', 'time_of_year', 'international_crisis_index', 'doctrine_id',
]

DOCTRINE_MAP = {
    'cold_start': 0, 'surgical': 1, 'air_land': 2, 'maritime': 3, 'deterrence': 4, 'hybrid': 5
}

# ============================================================
# SYNTHETIC DATA GENERATION
# ============================================================

def generate_training_data(n_samples=15000):
    records = []
    
    for _ in range(n_samples):
        scenario = np.random.choice(SCENARIOS)
        s_id = SCENARIO_IDX[scenario]
        
        # Own forces
        air_rd   = np.random.beta(7, 2) * 100
        army_rd  = np.random.beta(8, 2) * 100
        navy_rd  = np.random.beta(5, 2) * 100
        msl_rd   = np.random.beta(6, 2) * 100
        intel    = np.random.beta(5, 3) * 100
        cyber    = np.random.beta(4, 3) * 100
        logistics = np.random.beta(6, 2) * 100
        
        adv_air   = np.random.beta(5, 4) * 100
        adv_gnd   = np.random.beta(6, 3) * 100
        adv_nav   = np.random.beta(5, 5) * 100
        adv_msl   = np.random.beta(5, 3) * 100
        adv_nuke  = np.random.beta(5, 2) * 100
        
        terrain_adv = np.random.uniform(-0.3, 0.8)
        dist_obj = np.random.beta(3, 4)
        supply   = np.random.beta(6, 2) * 100
        
        us_sup  = np.random.beta(5, 3) * 100
        ru_sup  = np.random.beta(5, 3) * 100
        cn_inv  = np.random.beta(4, 4) * 100
        un_pres = np.random.beta(4, 3) * 100
        
        esc_posture = np.random.choice([0, 1, 2], p=[0.3, 0.4, 0.3])
        surprise    = np.random.beta(4, 3) * 100
        month       = np.random.randint(0, 12)
        crisis_idx  = np.random.beta(5, 3) * 100
        doctrine    = np.random.randint(0, 6)
        
        # ═══ COMPUTE OUTCOMES ═══
        own_strength = (air_rd * 0.25 + army_rd * 0.30 + navy_rd * 0.15 + msl_rd * 0.20 + intel * 0.10)
        adv_strength = (adv_air * 0.25 + adv_gnd * 0.30 + adv_nav * 0.15 + adv_msl * 0.20 + adv_nuke * 0.10)
        force_ratio = own_strength / (adv_strength + 1e-9)
        
        terrain_mod  = 1 + terrain_adv * 0.3
        surprise_mod = 1 + (surprise / 100) * 0.2
        coalition_mod = 1 + (us_sup + ru_sup) / 400 - cn_inv / 200
        esc_mod  = [1.1, 1.0, 0.85][esc_posture]
        
        effective_ratio = force_ratio * terrain_mod * surprise_mod * coalition_mod * esc_mod
        
        # --- OUTCOME CLASSIFICATION ---
        if effective_ratio > 1.4:
            outcome_probs = {'WIN': 0.75, 'STALEMATE': 0.20, 'LOSS': 0.05}
        elif effective_ratio > 1.1:
            outcome_probs = {'WIN': 0.55, 'STALEMATE': 0.35, 'LOSS': 0.10}
        elif effective_ratio > 0.9:
            outcome_probs = {'WIN': 0.30, 'STALEMATE': 0.50, 'LOSS': 0.20}
        else:
            outcome_probs = {'WIN': 0.15, 'STALEMATE': 0.40, 'LOSS': 0.45}
        
        outcomes = list(outcome_probs.keys())
        probs = list(outcome_probs.values())
        outcome = np.random.choice(outcomes, p=probs)
        
        # --- ATTRITION % ---
        own_attrition = (adv_strength**1.5) / (own_strength**1.5 + 1e-9) * 30
        own_attrition = np.clip(own_attrition + np.random.normal(0, 3), 2, 60)
        
        # --- ESCALATION RISK ---
        nuke_risk_score = (adv_nuke * 0.35 + (100 - own_strength) * 0.20 + cn_inv * 0.15 + esc_posture * 15 + (100 - un_pres) * 0.10 + np.random.normal(0, 5))
        nuke_risk_score = np.clip(nuke_risk_score, 0, 100)
        
        if nuke_risk_score < 25:
            escalation_risk = 'LOW'
        elif nuke_risk_score < 55:
            escalation_risk = 'MODERATE'
        elif nuke_risk_score < 75:
            escalation_risk = 'HIGH'
        else:
            escalation_risk = 'CRITICAL'
        
        # --- DURATION (days) ---
        base_duration = 30
        duration_noise = np.random.exponential(base_duration * 0.5)
        duration = max(1, base_duration + duration_noise - (surprise / 100) * base_duration * 0.3)
        
        # --- COALITION RESPONSE ---
        if cn_inv > 70 and us_sup > 60:
            coalition = 'US_INTERVENES'
        elif nuke_risk_score > 70:
            coalition = 'UNSC_CEASEFIRE'
        elif cn_inv > 50 and us_sup < 40:
            coalition = 'ADVERSARY_ESCALATES'
        elif un_pres > 70 and duration > 14:
            coalition = 'DIPLOMATIC_PRESSURE'
        else:
            coalition = 'NO_INTERVENTION'
        
        # --- BASE RECOMMENDATIONS (top priorities) ---
        base_scores = np.zeros(len(BASES))
        
        # Give random high scores to ~20 bases to simulate distributed recommendations 
        num_active_bases = min(len(BASES), np.random.randint(5, max(6, min(25, len(BASES)))))
        active_indices = np.random.choice(len(BASES), num_active_bases, replace=False)
        for idx in active_indices:
            base_scores[idx] = np.random.uniform(0.6, 1.0)
            
        base_scores += np.random.normal(0, 0.05, len(BASES))
        base_scores = np.clip(base_scores, 0, 1)
        
        feature_row = [
            s_id, air_rd, army_rd, navy_rd, msl_rd, intel, cyber, logistics,
            adv_air, adv_gnd, adv_nav, adv_msl, adv_nuke,
            terrain_adv, dist_obj, supply,
            us_sup, ru_sup, cn_inv, un_pres,
            esc_posture, surprise, month, crisis_idx, doctrine
        ]
        
        records.append({
            'features': feature_row,
            'outcome': outcome,
            'attrition': own_attrition,
            'escalation_risk': escalation_risk,
            'duration_days': duration,
            'coalition_response': coalition,
            'base_scores': base_scores.tolist(),
            'nuke_risk_score': nuke_risk_score,
        })
    
    return records

# ============================================================
# TRAIN ALL MODELS
# ============================================================

def train_all_models():
    print("═" * 60)
    print("GLOBAL WARGAME ML ENGINE — Training Pipeline")
    print("═" * 60)
    
    # We use a smaller dataset here for faster training on server startup
    # For production we would use 15000+
    n_samples = 3000
    print(f"\n[1/7] Generating synthetic training data (n={n_samples})...")
    
    records = generate_training_data(n_samples)
    
    X = np.array([r['features'] for r in records])
    y_outcome    = np.array([r['outcome'] for r in records])
    y_attrition  = np.array([r['attrition'] for r in records])
    y_escalation = np.array([r['escalation_risk'] for r in records])
    y_duration   = np.array([r['duration_days'] for r in records])
    y_coalition  = np.array([r['coalition_response'] for r in records])
    y_bases      = np.array([r['base_scores'] for r in records])
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    le_outcome    = LabelEncoder().fit(y_outcome)
    le_escalation = LabelEncoder().fit(y_escalation)
    le_coalition  = LabelEncoder().fit(y_coalition)
    
    models = {}
    
    # Model 1
    print("[2/7] Training Conflict Outcome Classifier...")
    rf_outcome = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
    rf_outcome.fit(X_scaled, le_outcome.transform(y_outcome))
    models['outcome'] = rf_outcome
    
    # Model 2
    print("[3/7] Training Attrition Regressor...")
    mlp_attrition = MLPRegressor(hidden_layer_sizes=(64, 32), max_iter=200, random_state=42)
    mlp_attrition.fit(X_scaled, y_attrition)
    models['attrition'] = mlp_attrition
    
    # Model 3
    print("[4/7] Training Escalation Risk Classifier...")
    gb_escalation = GradientBoostingClassifier(n_estimators=100, max_depth=4, random_state=42)
    gb_escalation.fit(X_scaled, le_escalation.transform(y_escalation))
    models['escalation'] = gb_escalation
    
    # Model 4
    print("[5/7] Training Duration Estimator...")
    gb_duration = GradientBoostingRegressor(n_estimators=100, max_depth=4, random_state=42)
    gb_duration.fit(X_scaled, y_duration)
    models['duration'] = gb_duration
    
    # Model 5
    print("[6/7] Training Coalition Response Predictor...")
    rf_coalition = RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42, n_jobs=-1)
    rf_coalition.fit(X_scaled, le_coalition.transform(y_coalition))
    models['coalition'] = rf_coalition
    
    # Model 6
    print("[7/7] Training Base Optimizer (1 Regressor per base)...")
    base_models = []
    # Train heavily on subset for performance
    for i, base_name in enumerate(BASES):
        gb = GradientBoostingRegressor(n_estimators=30, max_depth=3, random_state=42)
        gb.fit(X_scaled, y_bases[:, i])
        base_models.append(gb)
    
    models['bases'] = base_models
    
    print("Training Complete!")
    return models, scaler, {'le_outcome': le_outcome, 'le_escalation': le_escalation, 'le_coalition': le_coalition}


def predict_scenario(models, scaler, encoders, scenario_config):
    """
    Run full ML inference for a given scenario configuration.
    """
    x = np.array([[
        SCENARIO_IDX.get(scenario_config.get('scenario', 'two_front'), 0),
        scenario_config.get('air_force_readiness', 75),
        scenario_config.get('army_readiness', 85),
        scenario_config.get('navy_readiness', 60),
        scenario_config.get('missile_readiness', 70),
        scenario_config.get('intel_grade', 65),
        scenario_config.get('cyber_capability', 55),
        scenario_config.get('logistics_score', 80),
        scenario_config.get('adversary_air_power', 65),
        scenario_config.get('adversary_ground_power', 70),
        scenario_config.get('adversary_naval_power', 45),
        scenario_config.get('adversary_missile_power', 60),
        scenario_config.get('adversary_nuclear_posture', 55),
        scenario_config.get('terrain_advantage', 0.3),
        scenario_config.get('distance_to_objectives', 0.4),
        scenario_config.get('supply_line_security', 75),
        scenario_config.get('us_support_level', 60),
        scenario_config.get('russia_support_level', 55),
        scenario_config.get('china_involvement', 20),
        scenario_config.get('un_pressure', 50),
        scenario_config.get('escalation_posture', 1),
        scenario_config.get('surprise_factor', 60),
        scenario_config.get('time_of_year', 5),
        scenario_config.get('international_crisis_index', 60),
        scenario_config.get('doctrine_id', 0),
    ]])
    
    x_scaled = scaler.transform(x)
    
    outcome_encoded = models['outcome'].predict(x_scaled)[0]
    outcome_proba   = models['outcome'].predict_proba(x_scaled)[0]
    outcome = encoders['le_outcome'].inverse_transform([outcome_encoded])[0]
    
    attrition = float(np.clip(models['attrition'].predict(x_scaled)[0], 2, 80))
    esc_encoded = models['escalation'].predict(x_scaled)[0]
    esc_proba   = models['escalation'].predict_proba(x_scaled)[0]
    escalation  = encoders['le_escalation'].inverse_transform([esc_encoded])[0]
    duration = float(np.clip(models['duration'].predict(x_scaled)[0], 0.5, 180))
    coal_encoded = models['coalition'].predict(x_scaled)[0]
    coalition    = encoders['le_coalition'].inverse_transform([coal_encoded])[0]
    
    base_priorities = []
    for i, (gb, name) in enumerate(zip(models['bases'], BASES)):
        score = float(np.clip(gb.predict(x_scaled)[0], 0, 1))
        # Add tiny bit of noise so it's not identical every time
        score = np.clip(score + np.random.normal(0, 0.05), 0, 1)
        base_priorities.append({'base': name, 'priority_score': round(score, 3)})
        
    base_priorities.sort(key=lambda x: -x['priority_score'])
    
    outcome_classes = encoders['le_outcome'].classes_
    
    return {
        'outcome': outcome,
        'outcome_probabilities': {c: round(float(p)*100, 1) for c, p in zip(outcome_classes, outcome_proba)},
        'attrition_percent': round(attrition, 1),
        'escalation_risk': escalation,
        'escalation_probabilities': {c: round(float(p)*100, 1) for c, p in zip(encoders['le_escalation'].classes_, esc_proba)},
        'estimated_duration_days': round(duration, 1),
        'coalition_response': coalition,
        'top_bases': base_priorities[:8]
    }


if __name__ == '__main__':
    models, scaler, encoders = train_all_models()
    
    save_path = os.path.join(os.path.dirname(__file__), 'wargame_models')
    os.makedirs(save_path, exist_ok=True)
    
    with open(f'{save_path}/models.pkl', 'wb') as f:
        pickle.dump(models, f)
    with open(f'{save_path}/scaler.pkl', 'wb') as f:
        pickle.dump(scaler, f)
    with open(f'{save_path}/encoders.pkl', 'wb') as f:
        pickle.dump(encoders, f)
        
    print(f"Models saved to {save_path}/")
