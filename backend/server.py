"""
Geopolitical Conflict Model v3 — FastAPI Server
Loads the full PyTorch GNN+LSTM model and serves predictions via REST API.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from sklearn.preprocessing import StandardScaler
from itertools import combinations
import json
import uvicorn

# ============================================================
# DEVICE SETUP
# ============================================================
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# ============================================================
# CONFIGURATION (from your model)
# ============================================================
OUR_COUNTRIES = [
    'USA', 'Russia', 'China', 'India', 'Iran', 'Israel',
    'UK', 'France', 'Pakistan', 'Saudi Arabia', 'Turkey',
    'Indonesia', 'Afghanistan', 'Taiwan'
]
COUNTRY_IDX = {c: i for i, c in enumerate(OUR_COUNTRIES)}
N_COUNTRIES = len(OUR_COUNTRIES)
YEARS = list(range(2025, 2041))
N_YEARS = len(YEARS)

NUCLEAR_STATES = {'USA', 'Russia', 'China', 'India', 'Pakistan', 'Israel', 'UK', 'France'}

COUNTRY_COORDS = {
    'USA': [39.8283, -98.5795], 'Russia': [61.524, 105.3188],
    'China': [35.8617, 104.1954], 'India': [20.5937, 78.9629],
    'Iran': [32.4279, 53.688], 'Israel': [31.0461, 34.8516],
    'UK': [55.3781, -3.436], 'France': [46.6034, 1.8883],
    'Pakistan': [30.3753, 69.3451], 'Saudi Arabia': [23.8859, 45.0792],
    'Turkey': [38.9637, 35.2433], 'Indonesia': [-0.7893, 113.9213],
    'Afghanistan': [33.9391, 67.71], 'Taiwan': [23.6978, 120.9605],
}

COUNTRY_BLOCS = {
    'USA': 'western', 'UK': 'western', 'France': 'western',
    'Israel': 'western', 'Taiwan': 'western',
    'Russia': 'eastern', 'China': 'eastern', 'Iran': 'eastern',
    'Afghanistan': 'eastern', 'Pakistan': 'eastern',
    'India': 'non-aligned', 'Saudi Arabia': 'non-aligned',
    'Turkey': 'non-aligned', 'Indonesia': 'non-aligned',
}

ALLIANCE_EDGES = [
    ('USA', 'UK', 0.95, 'Five Eyes / NATO'),
    ('USA', 'France', 0.85, 'NATO'),
    ('USA', 'Israel', 0.90, 'Strategic partner / defense aid'),
    ('USA', 'Taiwan', 0.80, 'Taiwan Relations Act'),
    ('USA', 'Saudi Arabia', 0.60, 'Security umbrella / oil'),
    ('USA', 'India', 0.40, 'Quad partnership'),
    ('USA', 'Indonesia', 0.35, 'Strategic partnership'),
    ('UK', 'France', 0.85, 'NATO'),
    ('UK', 'Israel', 0.70, 'Strategic partner'),
    ('France', 'Israel', 0.50, 'Historical ties'),
    ('China', 'Russia', 0.70, 'No-limits partnership 2022'),
    ('China', 'Pakistan', 0.85, 'CPEC / all-weather friend'),
    ('China', 'Iran', 0.55, '25yr cooperation agreement'),
    ('China', 'Afghanistan', 0.30, 'Taliban recognition'),
    ('Russia', 'Iran', 0.60, 'Weapons / oil cooperation'),
    ('India', 'Russia', 0.45, 'Historical Soviet ties / S400'),
    ('Saudi Arabia', 'Pakistan', 0.55, 'Islamic bloc / financial'),
    ('Turkey', 'Pakistan', 0.50, 'OIC / Islamic solidarity'),
    ('China', 'India', -0.60, 'Border rivalry / Galwan'),
    ('China', 'USA', -0.80, 'Hegemonic rivalry'),
    ('China', 'Taiwan', -0.95, 'Existential claim'),
    ('Iran', 'Israel', -0.95, 'Existential enemies'),
    ('Iran', 'Saudi Arabia', -0.70, 'Sunni-Shia rivalry'),
    ('India', 'Pakistan', -0.80, 'Kashmir / nuclear standoff'),
    ('Russia', 'USA', -0.75, 'New Cold War'),
]

CASCADE_RULES = {
    ('China', 'Taiwan'): [
        ('USA', 0.85, 'Taiwan Relations Act'),
        ('UK', 0.50, 'Five Eyes, AUKUS'),
        ('France', 0.40, 'NATO solidarity'),
        ('India', 0.35, 'Quad'),
    ],
    ('Iran', 'Israel'): [
        ('USA', 0.80, 'Defense cooperation'),
        ('UK', 0.55, 'NATO'),
        ('France', 0.45, 'Western bloc'),
        ('Saudi Arabia', 0.40, 'Anti-Iran'),
        ('Russia', -0.30, 'Supports Iran'),
    ],
    ('India', 'Pakistan'): [
        ('USA', 0.30, 'De-escalation'),
        ('China', 0.65, 'Pakistan ally'),
        ('UK', 0.25, 'Commonwealth'),
    ],
    ('China', 'India'): [
        ('USA', 0.55, 'Quad partner'),
        ('Pakistan', 0.70, 'Two-front pressure'),
        ('Russia', 0.20, 'Arms supplier'),
    ],
}

FEATURES = [
    'gdp_growth', 'military_spend', 'military_spend_delta',
    'working_age_pop', 'gdp_per_capita_growth', 'inflation',
    'unemployment', 'conflict_last_year', 'conflict_3yr_avg',
    'buildup_indicator', 'scs_tension'
]
N_FEATURES = len(FEATURES)

# ============================================================
# COUNTRY DATA (from your model)
# ============================================================
COUNTRY_DATA = {
    'USA': {
        'gdp_growth': [2.8,2.5,2.3,2.0,2.2,2.5,2.8,3.0,3.0,2.8,2.8,2.5,2.5,2.3,2.3,2.0],
        'military_spend': [3.5,3.6,3.7,3.8,3.8,3.7,3.5,3.5,3.3,3.3,3.2,3.2,3.0,3.0,3.0,3.0],
        'military_spend_delta': [0.1,0.1,0.1,0.1,0.0,-0.1,-0.2,0.0,-0.2,0.0,-0.1,0.0,-0.2,0.0,0.0,0.0],
        'working_age_pop': [65.0,65.0,64.8,64.5,64.3,64.0,63.8,63.5,63.3,63.0,62.8,62.5,62.3,62.0,61.8,61.5],
        'gdp_per_capita_growth': [2.0,1.8,1.5,1.3,1.5,1.8,2.0,2.2,2.2,2.0,2.0,1.8,1.8,1.5,1.5,1.3],
        'inflation': [3.0,2.8,2.5,2.5,2.5,2.3,2.2,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0],
        'unemployment': [4.2,4.5,4.8,5.0,4.8,4.5,4.2,4.0,4.0,3.8,3.8,3.8,4.0,4.0,4.2,4.2],
        'conflict_last_year': [0.1]*8 + [0.0]*8,
        'conflict_3yr_avg': [0.1]*7 + [0.0]*9,
        'buildup_indicator': [0.0]*16,
        'scs_tension': [0.3,0.4,0.5,0.5,0.5,0.4,0.4,0.3,0.3,0.3,0.2,0.2,0.2,0.2,0.2,0.2],
    },
    'Russia': {
        'gdp_growth': [-3.0,-2.0,-1.0,0.0,0.5,1.0,1.5,1.5,1.0,1.0,1.5,1.5,2.0,2.0,2.0,2.0],
        'military_spend': [5.9,6.0,6.0,5.5,5.0,4.5,4.0,3.8,3.5,3.5,3.2,3.2,3.0,3.0,2.8,2.8],
        'military_spend_delta': [0.1,0.0,0.0,-0.5,-0.5,-0.5,-0.5,-0.2,-0.3,0.0,-0.3,0.0,-0.2,0.0,-0.2,0.0],
        'working_age_pop': [63.0,62.8,62.5,62.2,62.0,61.8,61.5,61.2,61.0,60.8,60.5,60.2,60.0,59.8,59.5,59.2],
        'gdp_per_capita_growth': [-3.5,-2.5,-1.5,-0.5,0.2,0.8,1.2,1.2,0.8,0.8,1.2,1.2,1.5,1.5,1.5,1.5],
        'inflation': [7.0,7.5,8.0,7.5,7.0,6.5,6.0,5.5,5.0,5.0,4.5,4.5,4.0,4.0,4.0,3.8],
        'unemployment': [4.0,4.5,5.0,5.5,5.5,5.0,4.8,4.5,4.5,4.2,4.2,4.0,4.0,3.8,3.8,3.5],
        'conflict_last_year': [1.0,1.0,1.0,0.8,0.5,0.3,0.2,0.2,0.1,0.1,0.1,0.1,0.0,0.0,0.0,0.0],
        'conflict_3yr_avg': [1.0,1.0,1.0,0.9,0.8,0.5,0.3,0.2,0.2,0.1,0.1,0.1,0.1,0.0,0.0,0.0],
        'buildup_indicator': [0.0]*16, 'scs_tension': [0.0]*16,
    },
    'China': {
        'gdp_growth': [4.5,4.0,3.8,3.5,3.5,3.8,4.0,4.2,4.2,4.0,4.0,3.8,3.8,3.5,3.5,3.5],
        'military_spend': [1.7,1.9,2.1,2.3,2.5,2.5,2.6,2.6,2.5,2.5,2.4,2.4,2.3,2.3,2.2,2.2],
        'military_spend_delta': [0.2,0.2,0.2,0.2,0.2,0.0,0.1,0.0,-0.1,0.0,-0.1,0.0,-0.1,0.0,-0.1,0.0],
        'working_age_pop': [68.0,67.8,67.5,67.2,67.0,66.8,66.5,66.2,66.0,65.8,65.5,65.2,65.0,64.8,64.5,64.2],
        'gdp_per_capita_growth': [4.0,3.5,3.3,3.0,3.0,3.3,3.5,3.8,3.8,3.5,3.5,3.3,3.3,3.0,3.0,3.0],
        'inflation': [2.0,2.2,2.5,2.5,2.8,2.8,3.0,3.0,3.2,3.2,3.5,3.5,3.5,3.8,3.8,4.0],
        'unemployment': [5.5,5.8,6.0,6.0,6.2,6.2,6.5,6.5,6.8,6.8,7.0,7.0,7.2,7.2,7.5,7.5],
        'conflict_last_year': [0.1,0.2,0.3,0.4,0.4,0.3,0.3,0.2,0.2,0.2,0.1,0.1,0.1,0.1,0.1,0.1],
        'conflict_3yr_avg': [0.1,0.1,0.2,0.3,0.4,0.3,0.3,0.3,0.2,0.2,0.2,0.1,0.1,0.1,0.1,0.1],
        'buildup_indicator': [1.0,1.0,1.0,1.0,1.0,1.0,1.0,0.8,0.5,0.3,0.2,0.1,0.1,0.0,0.0,0.0],
        'scs_tension': [0.7,0.8,0.9,1.0,1.0,0.9,0.8,0.6,0.5,0.4,0.3,0.3,0.2,0.2,0.2,0.1],
    },
    'Taiwan': {
        'gdp_growth': [2.5,2.8,2.5,2.0,1.5,2.0,2.5,2.8,3.0,3.0,2.8,2.8,2.5,2.5,2.3,2.3],
        'military_spend': [2.5,2.7,3.0,3.2,3.0,2.8,2.5,2.5,2.3,2.3,2.2,2.2,2.0,2.0,2.0,2.0],
        'military_spend_delta': [0.2,0.2,0.3,0.2,-0.2,-0.2,-0.3,0.0,-0.2,0.0,-0.1,0.0,-0.2,0.0,0.0,0.0],
        'working_age_pop': [71.0,70.8,70.5,70.2,70.0,69.8,69.5,69.2,69.0,68.8,68.5,68.2,68.0,67.8,67.5,67.2],
        'gdp_per_capita_growth': [2.0,2.3,2.0,1.5,1.0,1.5,2.0,2.3,2.5,2.5,2.3,2.3,2.0,2.0,1.8,1.8],
        'inflation': [2.5,2.3,2.5,2.8,3.0,2.8,2.5,2.3,2.2,2.0,2.0,2.0,2.0,2.0,2.0,2.0],
        'unemployment': [3.8,4.0,4.2,4.5,5.0,4.8,4.5,4.2,4.0,3.8,3.8,3.5,3.5,3.5,3.3,3.3],
        'conflict_last_year': [0.6,0.7,0.8,0.9,0.9,0.7,0.6,0.4,0.3,0.2,0.2,0.2,0.1,0.1,0.1,0.1],
        'conflict_3yr_avg': [0.5,0.6,0.7,0.8,0.9,0.8,0.7,0.6,0.4,0.3,0.2,0.2,0.2,0.1,0.1,0.1],
        'buildup_indicator': [0.5,0.6,0.7,0.7,0.6,0.5,0.4,0.3,0.2,0.2,0.1,0.1,0.1,0.0,0.0,0.0],
        'scs_tension': [0.7,0.8,0.9,1.0,1.0,0.9,0.8,0.6,0.5,0.4,0.3,0.3,0.2,0.2,0.2,0.1],
    },
    'India': {
        'gdp_growth': [6.5,6.8,7.0,7.2,7.0,6.8,6.5,6.5,6.2,6.2,6.0,6.0,5.8,5.8,5.5,5.5],
        'military_spend': [2.4,2.5,2.5,2.6,2.6,2.7,2.7,2.8,2.8,2.9,2.9,3.0,3.0,3.0,3.0,3.0],
        'military_spend_delta': [0.1]*16,
        'working_age_pop': [67.0,67.3,67.5,67.8,68.0,68.2,68.5,68.7,69.0,69.2,69.5,69.7,70.0,70.2,70.5,70.7],
        'gdp_per_capita_growth': [5.5,5.8,6.0,6.2,6.0,5.8,5.5,5.5,5.2,5.2,5.0,5.0,4.8,4.8,4.5,4.5],
        'inflation': [5.0,4.8,4.5,4.2,4.0,4.0,3.8,3.8,3.5,3.5,3.5,3.2,3.2,3.0,3.0,3.0],
        'unemployment': [8.0,7.8,7.5,7.2,7.0,6.8,6.5,6.2,6.0,5.8,5.5,5.2,5.0,4.8,4.5,4.2],
        'conflict_last_year': [0.3,0.3,0.2,0.2,0.2,0.1,0.1,0.1,0.1,0.0,0.0,0.0,0.0,0.0,0.0,0.0],
        'conflict_3yr_avg': [0.3,0.3,0.3,0.2,0.2,0.2,0.1,0.1,0.1,0.1,0.0,0.0,0.0,0.0,0.0,0.0],
        'buildup_indicator': [0.2]*8 + [0.0]*8,
        'scs_tension': [0.1,0.1,0.2,0.2,0.2,0.2,0.1,0.1,0.1,0.1,0.1,0.1,0.0,0.0,0.0,0.0],
    },
    'Iran': {
        'gdp_growth': [-1.5,-2.0,-1.0,0.5,1.0,1.5,2.0,2.0,1.5,1.0,1.0,1.5,1.5,2.0,2.0,2.0],
        'military_spend': [2.5,2.8,3.0,3.2,3.0,2.8,2.5,2.5,2.3,2.3,2.2,2.2,2.0,2.0,2.0,2.0],
        'military_spend_delta': [0.3,0.3,0.2,0.2,-0.2,-0.2,-0.3,0.0,-0.2,0.0,-0.1,0.0,-0.2,0.0,0.0,0.0],
        'working_age_pop': [65.0,65.2,65.4,65.5,65.6,65.7,65.8,65.9,66.0,66.0,66.1,66.1,66.2,66.2,66.3,66.3],
        'gdp_per_capita_growth': [-2.0,-2.5,-1.5,0.2,0.8,1.2,1.8,1.8,1.2,0.8,0.8,1.2,1.2,1.5,1.5,1.5],
        'inflation': [40.0,38.0,35.0,30.0,25.0,20.0,18.0,15.0,12.0,10.0,10.0,9.0,9.0,8.0,8.0,7.0],
        'unemployment': [11.0,11.5,11.0,10.5,10.0,9.5,9.0,8.5,8.0,8.0,7.5,7.5,7.0,7.0,6.5,6.5],
        'conflict_last_year': [1.0,1.0,1.0,1.0,0.5,0.5,0.3,0.3,0.2,0.2,0.2,0.1,0.1,0.1,0.1,0.1],
        'conflict_3yr_avg': [0.8,0.9,1.0,0.9,0.8,0.6,0.4,0.3,0.2,0.2,0.2,0.2,0.1,0.1,0.1,0.1],
        'buildup_indicator': [0.3,0.3,0.2,0.2,0.1,0.1]+[0.0]*10,
        'scs_tension': [0.0]*16,
    },
    'Israel': {
        'gdp_growth': [1.5,2.0,2.5,3.0,3.5,3.5,3.8,4.0,4.0,3.8,3.8,3.5,3.5,3.2,3.2,3.0],
        'military_spend': [5.5,5.8,5.5,5.0,4.8,4.5,4.2,4.0,3.8,3.8,3.5,3.5,3.2,3.2,3.0,3.0],
        'military_spend_delta': [0.3,-0.3,-0.5,-0.2,-0.3,-0.3,-0.2,-0.2,0.0,-0.3,0.0,-0.3,0.0,-0.2,0.0,0.0],
        'working_age_pop': [60.0,60.2,60.5,60.8,61.0,61.2,61.5,61.8,62.0,62.2,62.5,62.8,63.0,63.2,63.5,63.8],
        'gdp_per_capita_growth': [0.5,1.0,1.5,2.0,2.5,2.8,3.0,3.2,3.2,3.0,3.0,2.8,2.8,2.5,2.5,2.3],
        'inflation': [4.5,4.0,3.5,3.0,2.8,2.5,2.5,2.3,2.3,2.2,2.2,2.0,2.0,2.0,2.0,2.0],
        'unemployment': [5.0,4.8,4.5,4.2,4.0,3.8,3.8,3.5,3.5,3.5,3.2,3.2,3.0,3.0,3.0,3.0],
        'conflict_last_year': [1.0,1.0,0.8,0.5,0.3,0.3,0.2,0.2,0.1,0.1,0.1,0.1,0.1,0.0,0.0,0.0],
        'conflict_3yr_avg': [1.0,1.0,0.9,0.7,0.5,0.4,0.3,0.2,0.2,0.1,0.1,0.1,0.1,0.1,0.0,0.0],
        'buildup_indicator': [0.0]*16, 'scs_tension': [0.0]*16,
    },
    'UK': {
        'gdp_growth': [1.2,1.5,1.8,2.0,2.0,2.2,2.2,2.5,2.5,2.3,2.3,2.0,2.0,1.8,1.8,1.5],
        'military_spend': [2.3,2.5,2.5,2.5,2.5,2.3,2.3,2.2,2.2,2.2,2.0,2.0,2.0,2.0,2.0,2.0],
        'military_spend_delta': [0.2,0.0,0.0,0.0,-0.2,0.0,-0.1,-0.2,0.0,-0.2,0.0,0.0,0.0,0.0,0.0,0.0],
        'working_age_pop': [63.5]*16,
        'gdp_per_capita_growth': [1.0]*16,
        'inflation': [3.0,2.8,2.5,2.3,2.2,2.0]*2 + [2.0]*4,
        'unemployment': [4.5,4.8,5.0,5.0,4.8,4.5,4.3,4.2,4.0,4.0,3.8,3.8,3.8,4.0,4.0,4.2],
        'conflict_last_year': [0.0]*16, 'conflict_3yr_avg': [0.0]*16,
        'buildup_indicator': [0.0]*16, 'scs_tension': [0.0]*16,
    },
    'France': {
        'gdp_growth': [1.0,1.2,1.5,1.8,2.0,2.0,2.2,2.2,2.0,2.0,1.8,1.8,1.5,1.5,1.3,1.3],
        'military_spend': [2.1,2.3,2.5,2.5,2.5,2.5,2.3,2.3,2.2,2.2,2.0,2.0,2.0,2.0,2.0,2.0],
        'military_spend_delta': [0.2,0.2,0.0,0.0,0.0,-0.2,0.0,-0.1,0.0,-0.2,0.0,0.0,0.0,0.0,0.0,0.0],
        'working_age_pop': [62.0]*16,
        'gdp_per_capita_growth': [1.0]*16,
        'inflation': [2.5,2.3,2.2,2.0]*4,
        'unemployment': [7.5,7.3,7.0,6.8,6.5,6.3,6.0,5.8,5.5,5.5,5.3,5.3,5.0,5.0,5.0,5.0],
        'conflict_last_year': [0.0]*16, 'conflict_3yr_avg': [0.0]*16,
        'buildup_indicator': [0.0]*16, 'scs_tension': [0.0]*16,
    },
    'Pakistan': {
        'gdp_growth': [2.5,3.0,3.5,4.0,4.5,4.5,5.0,5.0,4.8,4.5,4.5,4.2,4.2,4.0,4.0,3.8],
        'military_spend': [4.0,4.2,4.0,3.8,3.8,3.5,3.5,3.3,3.3,3.2,3.2,3.0,3.0,3.0,3.0,3.0],
        'military_spend_delta': [0.2,-0.2,-0.2,0.0,-0.3,0.0,-0.2,0.0,-0.1,0.0,-0.2,0.0,0.0,0.0,0.0,0.0],
        'working_age_pop': [60.0,60.5,61.0,61.5,62.0,62.5,63.0,63.5,64.0,64.5,65.0,65.5,66.0,66.5,67.0,67.5],
        'gdp_per_capita_growth': [0.5,1.0,1.5,2.0,2.5,2.5,3.0,3.0,2.8,2.5,2.5,2.3,2.3,2.0,2.0,1.8],
        'inflation': [25.0,20.0,15.0,12.0,10.0,9.0,8.0,7.5,7.0,6.5,6.0,6.0,5.5,5.5,5.0,5.0],
        'unemployment': [8.5,8.0,7.5,7.0,6.5,6.2,6.0,5.8,5.5,5.3,5.0,5.0,4.8,4.8,4.5,4.5],
        'conflict_last_year': [0.8,0.8,0.7,0.5,0.5,0.4,0.3,0.3,0.2,0.2,0.2,0.1,0.1,0.1,0.1,0.0],
        'conflict_3yr_avg': [0.8,0.8,0.8,0.7,0.6,0.5,0.4,0.3,0.3,0.2,0.2,0.2,0.1,0.1,0.1,0.1],
        'buildup_indicator': [0.0]*16, 'scs_tension': [0.0]*16,
    },
    'Saudi Arabia': {
        'gdp_growth': [3.0,3.5,4.0,4.5,4.5,5.0,5.0,4.8,4.5,4.5,4.2,4.2,4.0,4.0,3.8,3.8],
        'military_spend': [6.0,5.8,5.5,5.2,5.0,4.8,4.5,4.3,4.0,4.0,3.8,3.8,3.5,3.5,3.3,3.3],
        'military_spend_delta': [-0.2]*16,
        'working_age_pop': [65.0]*16,
        'gdp_per_capita_growth': [3.0]*16,
        'inflation': [2.5]*16,
        'unemployment': [6.0,5.8,5.5,5.2,5.0,4.8,4.5,4.3,4.0,4.0,3.8,3.8,3.5,3.5,3.3,3.3],
        'conflict_last_year': [0.5,0.5,0.4,0.3,0.2,0.2,0.1,0.1,0.1,0.0,0.0,0.0,0.0,0.0,0.0,0.0],
        'conflict_3yr_avg': [0.5,0.5,0.5,0.4,0.3,0.2,0.2,0.1,0.1,0.1,0.0,0.0,0.0,0.0,0.0,0.0],
        'buildup_indicator': [0.0]*16, 'scs_tension': [0.0]*16,
    },
    'Turkey': {
        'gdp_growth': [3.0,3.5,4.0,4.5,4.5,4.8,5.0,5.0,4.8,4.5,4.5,4.2,4.2,4.0,4.0,3.8],
        'military_spend': [2.0,2.2,2.3,2.5,2.5,2.5,2.3,2.3,2.2,2.2,2.0,2.0,2.0,2.0,2.0,2.0],
        'military_spend_delta': [0.2,0.1,0.2,0.0,0.0,-0.2,0.0,-0.1,0.0,-0.2,0.0,0.0,0.0,0.0,0.0,0.0],
        'working_age_pop': [67.0]*16,
        'gdp_per_capita_growth': [3.0]*16,
        'inflation': [65.0,45.0,30.0,20.0,15.0,12.0,10.0,8.0,7.0,6.0,5.5,5.0,5.0,4.5,4.5,4.0],
        'unemployment': [10.0,9.5,9.0,8.5,8.0,7.5,7.0,6.8,6.5,6.3,6.0,6.0,5.8,5.8,5.5,5.5],
        'conflict_last_year': [0.5,0.5,0.4,0.3,0.3,0.2,0.2,0.1,0.1,0.1,0.1,0.0,0.0,0.0,0.0,0.0],
        'conflict_3yr_avg': [0.5,0.5,0.5,0.4,0.3,0.3,0.2,0.2,0.1,0.1,0.1,0.1,0.0,0.0,0.0,0.0],
        'buildup_indicator': [0.0]*16, 'scs_tension': [0.0]*16,
    },
    'Indonesia': {
        'gdp_growth': [5.0,5.2,5.5,5.5,5.8,5.8,6.0,6.0,5.8,5.8,5.5,5.5,5.3,5.3,5.0,5.0],
        'military_spend': [0.8,0.9,1.0,1.0,1.1,1.1,1.2,1.2,1.3,1.3,1.3,1.4,1.4,1.5,1.5,1.5],
        'military_spend_delta': [0.1]*16,
        'working_age_pop': [67.0]*16,
        'gdp_per_capita_growth': [4.5]*16,
        'inflation': [3.0]*16,
        'unemployment': [5.5,5.3,5.0,4.8,4.5,4.3,4.2,4.0,4.0,3.8,3.8,3.5,3.5,3.3,3.3,3.0],
        'conflict_last_year': [0.1,0.1,0.1]+[0.0]*13,
        'conflict_3yr_avg': [0.1,0.1,0.1,0.1]+[0.0]*12,
        'buildup_indicator': [0.1]*8+[0.0]*8,
        'scs_tension': [0.3,0.4,0.4,0.5,0.4,0.4,0.3,0.3,0.2,0.2,0.2,0.1,0.1,0.1,0.1,0.1],
    },
    'Afghanistan': {
        'gdp_growth': [-2.0,-1.5,-1.0,0.0,0.5,1.0,1.5,2.0,2.0,2.0,2.5,2.5,3.0,3.0,3.0,3.0],
        'military_spend': [0.5]*16,
        'military_spend_delta': [0.0]*16,
        'working_age_pop': [55.0,55.5,56.0,56.5,57.0,57.5,58.0,58.5,59.0,59.5,60.0,60.5,61.0,61.5,62.0,62.5],
        'gdp_per_capita_growth': [-2.0]*8+[2.0]*8,
        'inflation': [20.0,18.0,15.0,12.0,10.0,8.0,7.0,6.0,6.0,5.5,5.0,5.0,4.5,4.5,4.0,4.0],
        'unemployment': [14.0,13.5,13.0,12.5,12.0,11.5,11.0,10.5,10.0,9.5,9.0,8.5,8.0,7.5,7.0,6.5],
        'conflict_last_year': [1.0,1.0,0.8,0.8,0.6,0.5,0.4,0.3,0.3,0.2,0.2,0.2,0.1,0.1,0.1,0.1],
        'conflict_3yr_avg': [1.0,1.0,0.9,0.8,0.7,0.6,0.5,0.4,0.3,0.3,0.2,0.2,0.2,0.1,0.1,0.1],
        'buildup_indicator': [0.0]*16, 'scs_tension': [0.0]*16,
    },
}

EVER_FOUGHT_PAIRS = set([
    ('Afghanistan','France'),('Afghanistan','Pakistan'),('Afghanistan','Russia'),
    ('Afghanistan','UK'),('Afghanistan','USA'),('China','India'),
    ('China','Russia'),('China','USA'),('India','Pakistan'),
    ('Iran','Israel'),('Iran','Saudi Arabia'),('Iran','USA'),
    ('Pakistan','USA'),('Russia','UK'),('Russia','USA'),
    ('China','Taiwan'),('USA','Taiwan'),
])
SCS_CLAIMANTS = {'China','Taiwan','USA','Indonesia','India'}

MANUAL_PROBS_2025 = {
    ('Pakistan','Afghanistan'): 0.85, ('Iran','Israel'): 0.78,
    ('Russia','Afghanistan'): 0.58, ('India','Pakistan'): 0.45,
    ('India','Afghanistan'): 0.40, ('China','Taiwan'): 0.40,
    ('China','USA'): 0.25, ('China','India'): 0.20,
}


# ============================================================
# MODEL ARCHITECTURE (your exact model)
# ============================================================

class ConflictLSTM(nn.Module):
    def __init__(self, input_size, hidden_size, num_layers, dropout=0.2):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=input_size, hidden_size=hidden_size,
            num_layers=num_layers, batch_first=True,
            dropout=dropout, bidirectional=False
        )
        self.hidden_size = hidden_size
        self.attention = nn.Linear(hidden_size, 1)
        self.output_layer = nn.Sequential(
            nn.Linear(hidden_size, 32), nn.ReLU(), nn.Dropout(0.2),
            nn.Linear(32, 1), nn.Sigmoid()
        )

    def forward(self, x):
        lstm_out, (h_n, c_n) = self.lstm(x)
        attn_scores = self.attention(lstm_out)
        attn_weights = F.softmax(attn_scores, dim=1)
        context = (attn_weights * lstm_out).sum(dim=1)
        return context


class AllianceGNN(nn.Module):
    def __init__(self, input_dim, hidden_dim, output_dim):
        super().__init__()
        self.layer1 = nn.Linear(input_dim, hidden_dim)
        self.layer2 = nn.Linear(hidden_dim, hidden_dim)
        self.layer3 = nn.Linear(hidden_dim, output_dim)
        self.dropout = nn.Dropout(0.2)

    def forward(self, node_features, adj):
        h = F.relu(self.layer1(node_features))
        h = self.dropout(h)
        messages = torch.mm(adj, h)
        h = F.relu(self.layer2(h + messages))
        h = self.dropout(h)
        messages2 = torch.mm(adj, h)
        h = F.relu(self.layer3(h + messages2))
        return h


class GeopoliticalConflictModel(nn.Module):
    def __init__(self, n_features, lstm_hidden=64, lstm_layers=2,
                 gnn_hidden=64, gnn_out=32, dropout=0.2):
        super().__init__()
        self.country_embedding = nn.Embedding(N_COUNTRIES, 16)
        self.lstm = ConflictLSTM(n_features + 16, lstm_hidden, lstm_layers, dropout)
        self.gnn = AllianceGNN(lstm_hidden, gnn_hidden, gnn_out)
        self.conflict_predictor = nn.Sequential(
            nn.Linear(gnn_out * 2 + 4, 64), nn.ReLU(), nn.Dropout(dropout),
            nn.Linear(64, 32), nn.ReLU(),
            nn.Linear(32, 1), nn.Sigmoid()
        )

    def forward(self, country_features, adj, pair_indices, pair_meta):
        country_ids = torch.arange(N_COUNTRIES).to(device)
        embeddings = self.country_embedding(country_ids)
        embeddings_e = embeddings.unsqueeze(1).expand(-1, N_YEARS, -1)
        x = torch.cat([country_features, embeddings_e], dim=-1)
        lstm_embeddings = self.lstm(x)
        gnn_embeddings = self.gnn(lstm_embeddings, adj)
        probs = []
        for k in range(pair_indices.shape[0]):
            i, j = pair_indices[k]
            emb_a = gnn_embeddings[i]
            emb_b = gnn_embeddings[j]
            meta = pair_meta[k]
            pair_input = torch.cat([emb_a, emb_b, meta])
            prob = self.conflict_predictor(pair_input.unsqueeze(0))
            probs.append(prob)
        return torch.cat(probs, dim=0).squeeze()


# ============================================================
# TRAINING + DATA SETUP
# ============================================================

def build_data():
    """Build feature tensor and adjacency matrix."""
    raw_data = []
    for country in OUR_COUNTRIES:
        country_feats = []
        for i in range(N_YEARS):
            if len(COUNTRY_DATA[country].get('inflation', [])) < N_YEARS:
                COUNTRY_DATA[country]['inflation'] = [2.0] * N_YEARS
            year_feats = [COUNTRY_DATA[country][f][i] for f in FEATURES]
            country_feats.append(year_feats)
        raw_data.append(country_feats)

    X_raw = np.array(raw_data, dtype=np.float32)
    scaler = StandardScaler()
    X_flat = X_raw.reshape(-1, N_FEATURES)
    X_scaled = scaler.fit_transform(X_flat).reshape(N_COUNTRIES, N_YEARS, N_FEATURES)
    X_tensor = torch.FloatTensor(X_scaled).to(device)

    adj_matrix = np.zeros((N_COUNTRIES, N_COUNTRIES), dtype=np.float32)
    for ca, cb, weight, etype in ALLIANCE_EDGES:
        if ca in COUNTRY_IDX and cb in COUNTRY_IDX:
            i, j = COUNTRY_IDX[ca], COUNTRY_IDX[cb]
            adj_matrix[i][j] = weight
            adj_matrix[j][i] = weight
    adj_tensor = torch.FloatTensor(adj_matrix).to(device)

    all_pairs = list(combinations(range(N_COUNTRIES), 2))
    pair_indices = torch.LongTensor(all_pairs).to(device)

    pair_meta_list = []
    for i, j in all_pairs:
        ca, cb = OUR_COUNTRIES[i], OUR_COUNTRIES[j]
        ca_s, cb_s = sorted([ca, cb])
        nuclear = 1.0 if (ca in NUCLEAR_STATES and cb in NUCLEAR_STATES) else 0.0
        one_nuc = 1.0 if (ca in NUCLEAR_STATES or cb in NUCLEAR_STATES) else 0.0
        ef = 1.0 if (ca_s, cb_s) in EVER_FOUGHT_PAIRS else 0.0
        scs = 1.0 if (ca in SCS_CLAIMANTS and cb in SCS_CLAIMANTS) else 0.0
        pair_meta_list.append([nuclear, one_nuc, ef, scs])
    pair_meta = torch.FloatTensor(pair_meta_list).to(device)

    targets = []
    for i, j in all_pairs:
        ca, cb = OUR_COUNTRIES[i], OUR_COUNTRIES[j]
        ca_s, cb_s = sorted([ca, cb])
        prob = MANUAL_PROBS_2025.get((ca_s, cb_s),
               MANUAL_PROBS_2025.get((cb_s, ca_s), 0.05))
        targets.append(prob)
    targets_tensor = torch.FloatTensor(targets).to(device)

    return X_tensor, adj_tensor, adj_matrix, pair_indices, pair_meta, targets_tensor, scaler


def train_model():
    """Train the model from scratch (takes ~30 seconds)."""
    print("🧠 Building data and training model...")
    X_tensor, adj_tensor, adj_matrix, pair_indices, pair_meta, targets_tensor, scaler = build_data()

    model = GeopoliticalConflictModel(
        n_features=N_FEATURES, lstm_hidden=64, lstm_layers=2,
        gnn_hidden=64, gnn_out=32, dropout=0.2
    ).to(device)

    optimizer = torch.optim.Adam(model.parameters(), lr=0.001, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=50, factor=0.5)
    loss_fn = nn.BCELoss()

    model.train()
    for epoch in range(500):
        optimizer.zero_grad()
        predictions = model(X_tensor, adj_tensor, pair_indices, pair_meta)
        loss = loss_fn(predictions, targets_tensor)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()
        scheduler.step(loss)
        if (epoch+1) % 100 == 0:
            print(f"   Epoch {epoch+1:4d} | Loss: {loss.item():.4f}")

    print(f"✅ Training complete — Final loss: {loss.item():.4f}")
    return model, X_tensor, adj_tensor, adj_matrix, pair_indices, pair_meta, scaler


def get_predictions(model, X_tensor, adj_tensor, pair_indices, pair_meta):
    """Get all pair predictions."""
    model.eval()
    with torch.no_grad():
        preds = model(X_tensor, adj_tensor, pair_indices, pair_meta).cpu().numpy()

    all_pairs = list(combinations(range(N_COUNTRIES), 2))
    results = {}
    for k, (i, j) in enumerate(all_pairs):
        ca, cb = OUR_COUNTRIES[i], OUR_COUNTRIES[j]
        results[f"{ca}-{cb}"] = round(float(preds[k]) * 100, 1)
    return results


def simulate_cascade(adj_matrix, primary_pair, initial_prob, n_hops=3):
    """Simulate alliance cascade from a primary conflict."""
    ca, cb = primary_pair
    affected = {ca: initial_prob, cb: initial_prob}

    for hop in range(n_hops):
        new_affected = dict(affected)
        for country, risk in affected.items():
            if country not in COUNTRY_IDX:
                continue
            idx = COUNTRY_IDX[country]
            for other_country in OUR_COUNTRIES:
                other_idx = COUNTRY_IDX[other_country]
                edge_w = adj_matrix[idx][other_idx]
                if abs(edge_w) > 0.1:
                    cascade_prob = risk * abs(edge_w) * (0.7 ** hop)
                    if edge_w > 0:
                        new_affected[other_country] = max(
                            new_affected.get(other_country, 0), cascade_prob
                        )
        affected = new_affected

    return {k: round(v * 100, 1)
            for k, v in sorted(affected.items(), key=lambda x: -x[1])}


def get_country_risks(model, X_tensor):
    """Get per-country risk timeline using LSTM."""
    model.eval()
    risks = {}
    with torch.no_grad():
        for country in OUR_COUNTRIES:
            cidx = COUNTRY_IDX[country]
            country_id = torch.LongTensor([cidx]).to(device)
            embedding = model.country_embedding(country_id)
            yearly = []
            for t in range(1, N_YEARS + 1):
                feat_slice = X_tensor[cidx, :t, :]
                emb_expand = embedding.unsqueeze(1).expand(-1, t, -1)
                x_in = torch.cat([feat_slice.unsqueeze(0), emb_expand], dim=-1)
                lstm_out, _ = model.lstm.lstm(x_in)
                attn_scores = model.lstm.attention(lstm_out)
                attn_weights = F.softmax(attn_scores, dim=1)
                context = (attn_weights * lstm_out).sum(dim=1)
                risk = model.lstm.output_layer(context)
                yearly.append(round(float(risk.item()) * 100, 1))
            risks[country] = yearly
    return risks


# ============================================================
# GLOBAL STATE — train once on startup
# ============================================================
print("=" * 60)
print("GEOPOLITICAL CONFLICT MODEL v3 — FastAPI SERVER")
print("=" * 60)

model, X_tensor, adj_tensor, adj_matrix, pair_indices, pair_meta, scaler = train_model()
all_predictions = get_predictions(model, X_tensor, adj_tensor, pair_indices, pair_meta)
all_country_risks = get_country_risks(model, X_tensor)

print(f"✅ Server ready — {len(all_predictions)} pair predictions loaded")
print(f"   Top 5 conflict pairs:")
sorted_preds = sorted(all_predictions.items(), key=lambda x: -x[1])[:5]
for pair, prob in sorted_preds:
    print(f"   {pair}: {prob}%")

# ============================================================
# FASTAPI APP
# ============================================================
app = FastAPI(title="Geopolitical Conflict Model API", version="3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CascadeRequest(BaseModel):
    country_a: str
    country_b: str
    initial_prob: Optional[float] = None
    n_hops: Optional[int] = 3


class ScenarioRequest(BaseModel):
    scenario_id: str
    year: Optional[int] = 2027


@app.get("/")
def root():
    return {"status": "ok", "model": "GeopoliticalConflictModel v3 (GNN+LSTM+Attention)"}


@app.get("/predictions")
def get_all_predictions():
    """Return all 91 country-pair conflict probabilities."""
    return {"predictions": all_predictions}


@app.get("/risks")
def get_all_risks():
    """Return per-country risk timeline 2025-2040 from LSTM."""
    return {
        "years": YEARS,
        "risks": all_country_risks
    }


@app.get("/graph")
def get_graph():
    """Return the full alliance graph data."""
    edges = []
    for ca, cb, w, etype in ALLIANCE_EDGES:
        edges.append({
            "source": ca, "target": cb,
            "weight": w, "type": etype,
            "is_alliance": w > 0
        })
    countries = []
    for c in OUR_COUNTRIES:
        countries.append({
            "name": c,
            "coords": COUNTRY_COORDS[c],
            "nuclear": c in NUCLEAR_STATES,
            "bloc": COUNTRY_BLOCS[c],
            "risk_2025": all_country_risks[c][0],
            "features": {f: COUNTRY_DATA[c][f] for f in FEATURES}
        })
    return {"countries": countries, "edges": edges}


@app.post("/cascade")
def run_cascade(req: CascadeRequest):
    """Run alliance cascade simulation for a conflict pair."""
    if req.initial_prob is None:
        key = f"{req.country_a}-{req.country_b}"
        rev_key = f"{req.country_b}-{req.country_a}"
        prob = all_predictions.get(key, all_predictions.get(rev_key, 30.0))
        req.initial_prob = prob / 100.0

    cascade = simulate_cascade(
        adj_matrix, (req.country_a, req.country_b),
        req.initial_prob, req.n_hops
    )

    rules = CASCADE_RULES.get(
        (req.country_a, req.country_b),
        CASCADE_RULES.get((req.country_b, req.country_a), [])
    )

    return {
        "primary": {"country_a": req.country_a, "country_b": req.country_b},
        "initial_prob": round(req.initial_prob * 100, 1),
        "cascade": cascade,
        "rules": [{"country": r[0], "pull_factor": r[1], "reason": r[2]} for r in rules]
    }


@app.post("/scenario")
def run_scenario(req: ScenarioRequest):
    """Run a full scenario with predictions, cascade, and country details."""
    scenarios_config = {
        "china_taiwan": {"a": "China", "b": "Taiwan", "year": 2027,
                         "title": "China Invades Taiwan",
                         "desc": "PLA amphibious assault on Taiwan during the 2027 readiness window"},
        "iran_israel": {"a": "Iran", "b": "Israel", "year": 2025,
                        "title": "Iran-Israel Direct Strike Exchange",
                        "desc": "Full-scale military conflict between Iran and Israel"},
        "india_pakistan": {"a": "India", "b": "Pakistan", "year": 2026,
                          "title": "India-Pakistan Kashmir Escalation",
                          "desc": "LoC escalation spiraling into full conflict"},
        "russia_nato": {"a": "Russia", "b": "USA", "year": 2028,
                        "title": "Russia-NATO Confrontation",
                        "desc": "Direct military confrontation between Russia and NATO"},
        "china_india": {"a": "China", "b": "India", "year": 2027,
                        "title": "China-India Border War",
                        "desc": "LAC conflict escalating to full-scale war"},
    }

    config = scenarios_config.get(req.scenario_id, scenarios_config["china_taiwan"])

    key_a = f"{config['a']}-{config['b']}"
    key_b = f"{config['b']}-{config['a']}"
    prob = all_predictions.get(key_a, all_predictions.get(key_b, 30.0))

    cascade = simulate_cascade(adj_matrix, (config['a'], config['b']), prob / 100.0)

    year_idx = min(max(req.year - 2025, 0), N_YEARS - 1) if req.year else config['year'] - 2025
    country_details = {}
    for c in OUR_COUNTRIES:
        country_details[c] = {
            "risk": all_country_risks[c][year_idx],
            "cascade_risk": cascade.get(c, 0),
            "coords": COUNTRY_COORDS[c],
            "nuclear": c in NUCLEAR_STATES,
            "bloc": COUNTRY_BLOCS[c],
            "features_at_year": {f: COUNTRY_DATA[c][f][year_idx] for f in FEATURES}
        }

    return {
        "scenario": {
            "id": req.scenario_id,
            "title": config["title"],
            "description": config["desc"],
            "year": req.year or config["year"],
            "primary": {"country_a": config["a"], "country_b": config["b"]},
            "conflict_probability": prob,
        },
        "cascade": cascade,
        "countries": country_details,
        "predictions": all_predictions,
    }


@app.get("/country/{country_name}")
def get_country_detail(country_name: str):
    """Get detailed info for a specific country."""
    if country_name not in COUNTRY_IDX:
        return {"error": f"Country {country_name} not found"}

    return {
        "name": country_name,
        "coords": COUNTRY_COORDS[country_name],
        "nuclear": country_name in NUCLEAR_STATES,
        "bloc": COUNTRY_BLOCS[country_name],
        "risk_timeline": {
            "years": YEARS,
            "risks": all_country_risks[country_name]
        },
        "features": {f: COUNTRY_DATA[country_name][f] for f in FEATURES},
        "alliances": [
            {"partner": cb if ca == country_name else ca,
             "weight": w, "type": etype}
            for ca, cb, w, etype in ALLIANCE_EDGES
            if ca == country_name or cb == country_name
        ],
        "conflict_pairs": {
            k: v for k, v in all_predictions.items()
            if country_name in k
        }
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
