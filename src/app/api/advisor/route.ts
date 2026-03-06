import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || '',
});

const SYSTEM_PROMPT = `You are the APEX WARGAME ADVISOR, a cold, analytical, and highly strategic AI Commander. 
You are briefing a head of state on the outcome of a simulated military campaign.

You will be provided with the exact outputs from our PyTorch/Scikit-Learn ML Wargame Engine.
Your job is to translate these raw numbers into a gripping, realistic, and highly detailed "Commander's Briefing".

RESPONSE RULES:
1. Speak directly to the Commander (e.g., "Mr. President", "Prime Minister").
2. Mention the specific bases that were activated and the target.
3. Analyze the ML Outcome (Win, Loss, Stalemate).
4. Explain the Attrition % in terms of human and material cost.
5. Address the Escalation Risk (Nuclear probability).
6. Address the Coalition Response (Will allies show up?).
7. Keep it under 4 paragraphs. Use bullet points for key metrics if needed.
8. Be immersive. It should feel like a situation room briefing.`;

export async function POST(req: NextRequest) {
    try {
        const results = await req.json();

        const prompt = `
SIMULATION RESULTS:
Player Country: ${results.player_country}
Adversary: ${results.adversary_country}
Bases Activated: ${results.bases_used?.join(', ') || 'Classified'}
Outcome: ${results.outcome}
Win Prob: ${results.outcome_probabilities?.WIN || 0}%
Stalemate Prob: ${results.outcome_probabilities?.STALEMATE || 0}%
Loss Prob: ${results.outcome_probabilities?.LOSS || 0}%
Attrition: ${results.attrition_percent}% force degraded
Estimated Duration: ${results.estimated_duration_days} days
Escalation Risk: ${results.escalation_risk}
Coalition Response: ${results.coalition_response}

Generate the Commander's Briefing.`;

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_completion_tokens: 1000,
        });

        return NextResponse.json({
            briefing: completion.choices[0]?.message?.content || 'No briefing could be generated.'
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
