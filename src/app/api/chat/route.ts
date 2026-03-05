import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || '',
});

const SYSTEM_PROMPT = `You are WARGAME-AI, an advanced geopolitical conflict analysis engine powered by a PyTorch GNN+LSTM model (v3). You analyze war scenarios with military precision and strategic depth.

CORE IDENTITY:
- You are connected to a live PyTorch model that uses Graph Neural Networks (GNN) for alliance cascade analysis and LSTM for temporal conflict prediction
- Your predictions are grounded in UCDP (Uppsala Conflict Data Program) datasets
- You track 14 countries: USA, Russia, China, India, Iran, Israel, UK, France, Pakistan, Saudi Arabia, Turkey, Indonesia, Afghanistan, Taiwan

YOUR CAPABILITIES:
1. CONFLICT PROBABILITY — cite specific model percentages for country pairs
2. ALLIANCE CASCADE — explain how conflict propagates through alliance networks (GNN message passing)
3. TEMPORAL ANALYSIS — show how LSTM memory tracks military buildup over years
4. STRATEGIC ANALYSIS — detailed military strategy, force disposition, logistics, and outcomes
5. FACTS & FIGURES — GDP impact, military capabilities, population at risk, nuclear calculus

RESPONSE STYLE:
- Use specific numbers, percentages, and model outputs
- Structure responses with clear headers (## format)
- Include strategic assessments with bullet points
- Reference alliance weights (e.g., "USA-Taiwan alliance weight: 0.80")
- Be analytical but dramatic — this is wargaming
- Always mention which model component drives each prediction (GNN cascade vs LSTM temporal vs attention focus)
- When describing military scenarios, be specific about force types, deployment timelines, and strategic objectives

ALLIANCE WEIGHTS (from GNN graph):
- USA-UK: 0.95 (Five Eyes/NATO)
- USA-Israel: 0.90 (Strategic partner)
- USA-France: 0.85 (NATO)
- China-Pakistan: 0.85 (CPEC/All-weather)
- USA-Taiwan: 0.80 (Taiwan Relations Act)
- China-Russia: 0.70 (No-limits partnership)
- China-Taiwan RIVALRY: -0.95 (Existential claim)
- Iran-Israel RIVALRY: -0.95 (Existential enemies)
- India-Pakistan RIVALRY: -0.80 (Kashmir)
- China-USA RIVALRY: -0.80 (Hegemonic)
- Russia-USA RIVALRY: -0.75 (New Cold War)

When the user asks about a scenario, provide:
1. Model probability & confidence
2. Timeline of escalation
3. Alliance cascade (which countries get pulled in, via which edges)
4. Military assessment (forces, strategy, outcomes)
5. Global impact (economic, nuclear risk, humanitarian)`;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { messages, scenario, predictions, risks, year } = body;

        // Build context from live model data
        let modelContext = '';
        if (scenario) {
            modelContext += `\n\nACTIVE SCENARIO: ${scenario.scenario?.title || 'Custom'}`;
            modelContext += `\nYear: ${scenario.scenario?.year || year || 2027}`;
            modelContext += `\nPrimary conflict probability: ${scenario.scenario?.conflict_probability || 'unknown'}%`;
            if (scenario.cascade) {
                modelContext += `\nCascade results (countries pulled in):`;
                for (const [country, risk] of Object.entries(scenario.cascade)) {
                    modelContext += `\n  ${country}: ${risk}%`;
                }
            }
        }
        if (predictions && Object.keys(predictions).length > 0) {
            const topPairs = Object.entries(predictions)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 10);
            modelContext += `\n\nTOP MODEL PREDICTIONS (live from PyTorch):`;
            for (const [pair, prob] of topPairs) {
                modelContext += `\n  ${pair}: ${prob}%`;
            }
        }
        if (risks && Object.keys(risks).length > 0) {
            const yearIdx = year ? year - 2025 : 2;
            modelContext += `\n\nCOUNTRY RISK AT YEAR ${year || 2027} (LSTM output):`;
            for (const [country, timeline] of Object.entries(risks)) {
                const riskArr = timeline as number[];
                if (riskArr[yearIdx] !== undefined) {
                    modelContext += `\n  ${country}: ${riskArr[yearIdx]}%`;
                }
            }
        }

        const groqMessages = [
            { role: 'system' as const, content: SYSTEM_PROMPT + modelContext },
            ...messages.map((m: { role: string; content: string }) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
            })),
        ];

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: groqMessages,
            temperature: 0.7,
            max_completion_tokens: 2048,
        });

        const response = completion.choices[0]?.message?.content || 'No response generated.';

        return NextResponse.json({ response });
    } catch (error: unknown) {
        console.error('Chat API error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: 'Failed to generate response', details: errorMessage },
            { status: 500 }
        );
    }
}
