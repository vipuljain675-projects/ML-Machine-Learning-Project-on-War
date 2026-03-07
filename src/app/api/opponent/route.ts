import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

const ALLIANCE_WEIGHTS: Record<string, Record<string, number>> = {
    Pakistan: { China: 0.85, USA: -0.3, Turkey: 0.6 },
    China: { Pakistan: 0.85, Russia: 0.70, Iran: 0.5 },
    Russia: { China: 0.70, Iran: 0.60, Belarus: 0.8 },
    Iran: { Russia: 0.60, Hezbollah: 0.95, Houthis: 0.88 },
    USA: { Israel: 0.90, UK: 0.95, Taiwan: 0.80 },
};

export async function POST(req: NextRequest) {
    try {
        const { playerCountry, opponentCountry, playerAction, scenarioPhase, year, nuclearAlertLevel, destroyedBases } = await req.json();

        const allies = Object.entries(ALLIANCE_WEIGHTS[opponentCountry] || {})
            .filter(([, w]) => w > 0.5)
            .map(([c, w]) => `${c} (alliance weight: ${w})`)
            .join(', ');

        const destroyedStr = destroyedBases?.length > 0 ? `Player has destroyed: ${destroyedBases.join(', ')}` : 'No bases destroyed yet';

        const systemPrompt = `You are the AUTONOMOUS COMMANDER of ${opponentCountry} in a wargame simulation. The player (${playerCountry}) just took this action: "${playerAction}".

Current scenario: ${opponentCountry} vs ${playerCountry} in ${year}
Phase: ${scenarioPhase} | Nuclear Alert Level: ${nuclearAlertLevel}/5
${destroyedStr}

Your allies: ${allies || 'None with high alliance weight'}

You MUST respond with 1-3 actions from your arsenal. Format STRICTLY as JSON:
{
  "actions": [
    {
      "id": "unique_id",
      "timestamp": ${Date.now()},
      "type": "strike|alliance|nuclear|diplomatic|economic|mobilize",
      "country": "${opponentCountry} or ally country name",
      "message": "RED ALERT: [SPECIFIC military action with real unit names, base names, weapon systems]",
      "targetBase": "base name if applicable or null",
      "severity": "low|medium|high|critical"
    }
  ],
  "newNuclearLevel": ${nuclearAlertLevel} (increase if escalating, max 5),
  "phase": "${scenarioPhase}" (can escalate to: active -> escalated -> nuclear -> ceasefire)
}

RULES:
1. Be SPECIFIC: name real military units, real bases, real weapon systems
2. For Pakistan vs India: always consider dragging China in (85% alliance), USA pressure (UN Security Council)
3. For Iran vs Israel: activate Hezbollah, Houthis immediately
4. For Russia vs NATO: threaten Kaliningrad Iskander missiles, invoke Article 5 concerns
5. If player destroyed a key base, retaliate against equivalent player base
6. Nuclear alert should rise if conventional losses are catastrophic
7. Messages should feel like real war intelligence intercepts: "INTERCEPTED: Pakistan 1st Armoured Corps mobilizing at Gujranwala..."
8. Respond ONLY with the JSON object, no other text.`;

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: systemPrompt }],
            temperature: 0.8,
            max_completion_tokens: 800,
            response_format: { type: 'json_object' },
        });

        const raw = completion.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(raw);
        return NextResponse.json(parsed);
    } catch (err) {
        console.error('Opponent AI error:', err);
        // Fallback opponent action
        const fallback = {
            actions: [{
                id: `fallback_${Date.now()}`,
                timestamp: Date.now(),
                type: 'mobilize',
                country: 'Unknown',
                message: '🔴 ENEMY COMMAND: Forces on high alert. Awaiting further intelligence.',
                severity: 'medium'
            }],
            newNuclearLevel: 0,
            phase: 'active'
        };
        return NextResponse.json(fallback);
    }
}
