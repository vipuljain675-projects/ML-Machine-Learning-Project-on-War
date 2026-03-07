# 🛡️ WARGAME: Geopolitical Conflict Simulator

![Wargame Header](https://raw.githubusercontent.com/username/project/main/public/header.png) <!-- Note: User can replace with actual image later -->

**WARGAME** is a high-fidelity geopolitical simulation platform that leverages advanced Machine Learning and Large Language Models to model, visualize, and predict global conflict escalations. 

Built with **Next.js**, **PyTorch**, and **Groq**, it allows users to step into the role of a national leader, analyze strategic vulnerabilities, and simulate "what-if" scenarios across a unified global database of 2,500+ military bases.

---

## 🚀 Key Features

- **🌐 Universal Global Map**: Real-time visualization of 2,500+ military facilities, including all US Carrier Strike Groups (1st - 7th Fleets).
- **🕵️ Fog of War**: Dynamic visibility system where tactical data is only revealed based on your national alliance and intelligence uplink.
- **🧠 Strategic Advisor AI**: A persistence Groq-powered advisor that provides real-time tactical analysis based on your current map targets and asset availability.
- **📉 Conflict Prediction Engine**: A deep learning backend that calculates the probability of war and risk cascades using historic and economic indicators.
- **🎯 Tactical Strike Interface**: Command multi-asset strikes (Rafales, Tejas, S-400s) with automated Battle Damage Assessment (BDA).

---

## 🧪 Machine Learning Architecture

The core "brain" of the simulator is a hybrid neural network designed to handle both temporal economic shifts and spatial geopolitical relationships.

### 1. GNN + LSTM Hybrid Model (`PyTorch`)
The prediction engine uses a custom **Graph Neural Network (GNN)** merged with a **Long Short-Term Memory (LSTM)** network to analyze the world state.

- **Temporal Processing (LSTM + Attention)**: For each country, the model processes 15+ years of socioeconomic data (GDP growth, military spend, inflation, etc.). An attention mechanism focuses on critical "buildup" periods preceding known historic conflicts.
- **Spatial Relational Processing (GNN)**: Geopolitical alliances are modeled as a weighted graph. The GNN propagates "tension" markers across the graph—for example, a buildup in the South China Sea propagates risk differently to Taiwan vs. a non-aligned state like Indonesia.
- **Pairwise Conflict Predictor**: The final layer takes the latent embeddings from the GNN and predicts the likelihood of kinetic conflict between any two nations in a given year (2025–2040).

### 2. Strategic Intelligence (`Groq LLM`)
We use **Groq LPU™ Inference Engine** to power the Strategic Advisor. Unlike generic chatbots, this AI is:
- **Context-Injected**: Receives real-time state from the map (active bases, selected targets, country firepower).
- **Command-Aware**: Capable of interpreting natural language commands (e.g., *"Analyze a strike on PAF Sargodha"*) and translating them into map-actions.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, Leaflet.js (Topographic Mapping).
- **Backend**: FastAPI (Python), PyTorch (Deep Learning).
- **AI/LLM**: Groq (Llama-3 70B / Mixtral for tactical logic).
- **State Management**: React Context API with persistent local storage.

---

## 📦 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+
- Groq API Key

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/wargame-simulator.git
   cd wargame-simulator
   ```

2. **Frontend Setup**:
   ```bash
   npm install
   cp .env.example .env.local # Add your GROQ_API_KEY
   npm run dev
   ```

3. **Backend Setup**:
   ```bash
   cd backend
   pip install -r requirements.txt
   python server.py
   ```

---

## ⚖️ Disclaimer
*This application is a mathematical simulation intended for educational and research purposes. It uses open-source IISS and SIPRI data to model conflict probabilities and does not reflect actual classified military positioning.*
